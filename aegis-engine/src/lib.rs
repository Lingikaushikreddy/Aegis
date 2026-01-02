pub mod crypto;
pub mod sdk;
pub mod fl_core;
pub mod network;
pub mod mobile;
pub mod dp;

// Re-export common types
pub use crypto::AegisCrypto;
pub use sdk::{Vault, SdkError};
pub use fl_core::{FlClientCore, ModelWeights};
pub use network::SecureChannel;
pub use mobile::MobileVault;

uniffi::setup_scaffolding!("aegis_engine");
