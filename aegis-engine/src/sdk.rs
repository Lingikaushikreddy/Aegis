use std::path::{Path, PathBuf};
use std::fs;
use crate::crypto::{AegisCrypto, CryptoError};
use thiserror::Error;
use zeroize::Zeroize;

#[derive(Error, Debug)]
pub enum SdkError {
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Crypto Error: {0}")]
    Crypto(#[from] CryptoError),
    #[error("Vault invalid")]
    InvalidState,
}

pub struct Vault {
    root_path: PathBuf,
    crypto: AegisCrypto,
}

impl Vault {
    /// Initialize a new Vault or load existing one
    pub fn new<P: AsRef<Path>>(path: P, key: &[u8]) -> Result<Self, SdkError> {
        let root_path = path.as_ref().to_path_buf();
        if !root_path.exists() {
            fs::create_dir_all(&root_path)?;
        }
        
        let crypto = AegisCrypto::new_from_key(key)?;
        Ok(Self { root_path, crypto })
    }

    /// Store a file securely in the vault
    /// Returns the relative path to the stored encrypted file
    pub fn store_file(&self, filename: &str, data: &[u8]) -> Result<String, SdkError> {
        let encrypted = self.crypto.encrypt(data)?;
        
        // Use a safe filename (hash or controlled name)
        // For MVP, we just append .enc
        let safe_name = format!("{}.enc", filename);
        let dest = self.root_path.join(&safe_name);
        
        fs::write(&dest, encrypted)?;
        Ok(safe_name)
    }

    /// Retrieve a file from the vault
    pub fn load_file(&self, encrypted_filename: &str) -> Result<Vec<u8>, SdkError> {
        let src = self.root_path.join(encrypted_filename);
        let encrypted_data = fs::read(src)?;
        
        let plaintext = self.crypto.decrypt(&encrypted_data)?;
        Ok(plaintext)
    }

    /// Destroy the vault (Crypto Shredding simulation)
    pub fn nuke(&self) -> Result<(), SdkError> {
        fs::remove_dir_all(&self.root_path)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_vault_store_load() {
        let dir = tempdir().unwrap();
        let (crypto, key) = AegisCrypto::new_random();
        
        // Init Vault
        let vault = Vault::new(dir.path(), &key).unwrap();
        
        // Store
        let secret = b"Nuclear Codes";
        let stored_path = vault.store_file("codes.txt", secret).unwrap();
        assert_eq!(stored_path, "codes.txt.enc");
        
        // Load
        let loaded = vault.load_file("codes.txt.enc").unwrap();
        assert_eq!(loaded, secret);
    }
}
