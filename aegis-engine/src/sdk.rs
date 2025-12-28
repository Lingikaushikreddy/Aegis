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
