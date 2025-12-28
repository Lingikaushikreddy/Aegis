# Aegis Systems Architecture (Rust Core)

**Role**: Senior Systems Engineer
**Date**: 2025-12-28
**Status**: DRAFT

## 1. Objective
Replace the Python-based cryptographic and storage layer with a **High-Performance, Memory-Safe Rust Core (`aegis-rs`)**.
This core will be exposed to:
- **Python**: Via `PyO3` bindings (for the FL Client/Server).
- **Mobile/Web**: Via `uniffi` (Kotlin/Swift) and `wasm-bindgen` (Web).

## 2. Architecture: The "Vault Engine"

```mermaid
graph TD
    A[FL Client (Python/PyTorch)] -->|call| B(Aegis SDK - PyO3)
    B -->|manage| C{Rust Core}
    C -->|Encrypt/Decrypt| D[Crypto Layer (Ring/AES-GCM)]
    C -->|Store/Query| E[Storage Engine (SQLite/Sled)]
    C -->|Network| F[gRPC Client (Tonic)]
```

## 3. Technology Stack (Rust)

*   **Crypto**: `aes-gcm` (AES-256-GCM) or `ring` (BoringSSL bindings). *Decision: `aes-gcm` pure Rust crate for portability.*
*   **Async Runtime**: `tokio` (Industry standard).
*   **RPC**: `tonic` (gRPC implementation).
*   **Database**: `rusqlite` (bundled SQLite) or `sqlx`.
*   **Bindings**: `pyo3` + `maturin` to build the Python wheel.

## 4. Deliverables Roadmap

### Phase 1: The Vault Engine (Current)
*   `crate::crypto`: AES-256-GCM encryption/decryption.
*   `crate::storage`: Secure file I/O.
*   `crate::ffi`: Python bindings.

### Phase 2: Secure Networking
*   `crate::network`: gRPC client with mTLS (using `rustls`).

### Phase 3: FL Runtime
*   Native Rust implementation of the Federated Learning aggregator/client logic (replacing Flower eventually, or integrating with it via SDK).

## 5. Security Invariants (Rust Enforced)
*   **Zeroize**: All key material must implement the `Zeroize` trait to clear memory on drop.
*   **Type Safety**: Distinct types for `EncryptedData` vs `PlaintextData` to prevent accidental leakage.
*   **Error Handling**: No `unwrap()`. Robust `Result<T, AegisError>` handling.
