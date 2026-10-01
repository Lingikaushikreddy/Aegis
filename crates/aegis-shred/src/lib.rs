//! # aegis-shred
//!
//! Crypto-shredding for application data: every data subject gets their own encryption key, so
//! erasing a person means destroying one key.

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod error;
mod keys;

pub use error::{Error, Result};
pub use keys::MasterKey;
