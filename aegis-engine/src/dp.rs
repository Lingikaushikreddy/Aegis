use rand::thread_rng;
use rand_distr::{Distribution, Normal};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DpError {
    #[error("Invalid noise parameters")]
    InvalidParameters,
    #[error("Noise generation failed")]
    GenerationError,
}

pub struct GaussianMechanism {
    sigma: f64,
    clipping_threshold: f64,
}

impl GaussianMechanism {
    pub fn new(sigma: f64, clipping_threshold: f64) -> Result<Self, DpError> {
        if sigma < 0.0 || clipping_threshold <= 0.0 {
            return Err(DpError::InvalidParameters);
        }
        Ok(Self { sigma, clipping_threshold })
    }

    /// Clip the global norm of the vector to the threshold
    pub fn clip(&self, data: &[f32]) -> Vec<f32> {
        let norm: f32 = data.iter().map(|x| x * x).sum::<f32>().sqrt();
        let scale = if norm > self.clipping_threshold as f32 {
            self.clipping_threshold as f32 / norm
        } else {
            1.0
        };

        data.iter().map(|x| x * scale).collect()
    }

    /// Add Gaussian noise to the vector
    pub fn add_noise(&self, data: &[f32]) -> Result<Vec<f32>, DpError> {
        let mut rng = thread_rng();
        let normal = Normal::new(0.0, self.sigma).map_err(|_| DpError::GenerationError)?;

        Ok(data.iter()
            .map(|x| x + normal.sample(&mut rng) as f32)
            .collect())
    }

    /// Apply both clipping and noise (DP-SGD step)
    pub fn apply(&self, data: &[f32]) -> Result<Vec<f32>, DpError> {
        let clipped = self.clip(data);
        self.add_noise(&clipped)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clipping() {
        let mech = GaussianMechanism::new(1.0, 5.0).unwrap();
        // Vector with norm 10.0 (sqrt(6^2 + 8^2) = 10)
        let data = vec![6.0, 8.0]; 
        let clipped = mech.clip(&data);
        
        // Should scale down by 0.5 to reach norm 5.0
        assert!((clipped[0] - 3.0).abs() < 1e-6);
        assert!((clipped[1] - 4.0).abs() < 1e-6);
    }

    #[test]
    fn test_noise_addition() {
        let mech = GaussianMechanism::new(0.1, 10.0).unwrap();
        let data = vec![1.0; 1000];
        let noisy = mech.add_noise(&data).unwrap();
        
        // Check that we actually added something
        assert_ne!(data, noisy);
    }
}
