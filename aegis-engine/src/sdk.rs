use std::path::{Path, PathBuf};
use std::fs::{self, File};
use std::io::{self, Read, Write, BufReader, BufWriter};
use crate::crypto::{AegisCrypto, CryptoError};
use thiserror::Error;
use serde::{Serialize, Deserialize};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum SdkError {
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Crypto Error: {0}")]
    Crypto(#[from] CryptoError),
    #[error("Serialization Error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Vault invalid state")]
    InvalidState,
    #[error("File integrity check failed")]
    IntegrityError,
    #[error("Data truncation detected")]
    TruncationError,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VaultHeader {
    pub original_filename: String,
    pub timestamp: u64,
    pub version: u8,
    // total_size is optional because we might stream unknown length data
    pub total_size: Option<u64>,
}

pub struct Vault {
    root_path: PathBuf,
    crypto: AegisCrypto,
}

const CHUNK_SIZE: usize = 1024 * 1024; // 1 MB

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
}
