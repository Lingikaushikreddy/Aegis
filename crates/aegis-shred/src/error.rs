//! Error type shared by every public operation.

/// Everything that can go wrong in aegis-shred.
///
/// Messages never contain plaintext, key material, or raw subject ids.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The data key for this object was deliberately destroyed by `shred`.
    #[error("the data key for this object was shredded at unix time {shredded_at}")]
    Shredded {
        /// Unix time (seconds) when the key was shredded.
        shredded_at: i64,
    },
    /// The object was sealed with a key that this keystore has never held.
    #[error("this object was sealed with a key that is not in this keystore")]
    UnknownKey,
    /// The master key (or its kind) does not match the keystore.
    #[error("wrong master key: {0}")]
    WrongMasterKey(&'static str),
    /// The object is corrupt, truncated, reordered, tampered with, or the context does not match.
    #[error(
        "integrity check failed: the data is corrupt, truncated, tampered with, or the context does not match"
    )]
    Integrity,
    /// The bytes are not a sealed object this version understands.
    #[error("unsupported format: {0}")]
    UnsupportedFormat(&'static str),
    /// The keystore database failed or is corrupt.
    #[error("keystore error: {0}")]
    Keystore(String),
    /// A file could not be read or written.
    #[error(transparent)]
    Io(#[from] std::io::Error),
    /// A caller-supplied argument is invalid.
    #[error("invalid argument: {0}")]
    InvalidArgument(String),
}

impl From<rusqlite::Error> for Error {
    fn from(err: rusqlite::Error) -> Self {
        Error::Keystore(err.to_string())
    }
}

/// Result alias used throughout the crate.
pub type Result<T> = std::result::Result<T, Error>;
