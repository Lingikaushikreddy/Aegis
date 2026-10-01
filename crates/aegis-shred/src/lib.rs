//! # aegis-shred
//!
//! Crypto-shredding for application data: every data subject (a user, a customer) gets their
//! own encryption key. Erasing a person means destroying one key, which makes every copy of
//! their data unreadable, including copies in backups you cannot edit.
//!
//! ```no_run
//! use aegis_shred::{MasterKey, Vault, Error};
//!
//! # fn main() -> aegis_shred::Result<()> {
//! let vault = Vault::open_or_create("keys.db", &MasterKey::from_env("AEGIS_MASTER_KEY")?)?;
//! let sealed = vault.seal("user-42", b"alice@example.com", b"users.email")?;
//! assert_eq!(vault.unseal(&sealed, b"users.email")?, b"alice@example.com");
//!
//! vault.shred("user-42")?;
//! assert!(matches!(vault.unseal(&sealed, b"users.email"), Err(Error::Shredded { .. })));
//! # Ok(())
//! # }
//! ```
//!
//! See `docs/FORMAT.md`, `docs/THREAT_MODEL.md`, and `docs/OPERATIONS.md` in the repository.

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod audit;
mod error;
mod format;
mod keys;
mod keystore;
mod vault;

pub use audit::{AuditEntry, AuditReport};
pub use error::{Error, Result};
pub use format::{HEADER_LEN, Header, inspect_header};
pub use keys::MasterKey;
pub use keystore::{KeyStatus, key_status};
pub use vault::{ShredReceipt, Vault};
