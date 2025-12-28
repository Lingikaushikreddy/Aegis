pub mod crypto;
pub mod sdk;
pub mod fl_core;
pub mod network;

// Re-export common types
pub use crypto::AegisCrypto;
pub use sdk::Vault;
pub use fl_core::{FlClientCore, ModelWeights};
pub use network::SecureChannel;
