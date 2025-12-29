# 🛡️ AEGIS
> **The Fortress for Your Data.**
> *Next-Generation Privacy-Preserving Infrastructure for the AI Era.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust: 1.75+](https://img.shields.io/badge/rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Security: AES-256-GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-green.svg)](docs/ENCRYPTION.md)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](actions)

**Aegis** is an enterprise-grade, zero-trust infrastructure designed to enable **Federated Learning (FL)** and secure data storage on untrusted devices. It bridges the gap between high-level AI research (Python/PyTorch) and military-grade verified security (Rust).

---

## 🚀 Why Aegis?

Traditional crypto-systems are slow or hard to integrate. Pure Python implementations leak memory and are vulnerable to inspection. **Aegis** solves this with a **Hybrid Core Architecture**:

| Feature | Traditional Solutions | 🛡️ Aegis |
| :--- | :--- | :--- |
| **Encryption** | File-level (slow) | **Stream-based Chunks (Instant)** |
| **Memory Safety** | Vulnerable (GC) | **Zeroize™ (RAM Scrubbing)** |
| **Path Security** | Traversal Risks | **UUID-based Physical Storage** |
| **Compliance** | Manual Checks | **Automated Policy Engine** |
| **Performance** | Interpreter Speed | **Native Rust Speed** |

---

## 🌟 Key Features

### 🔒 Secure Vault Engine (`aegis-engine`)
Built in **Rust** for maximum safety and speed.
*   **Streaming Encryption**: Encrypts multi-gigabyte datasets with constant RAM usage.
*   **Crypto-Shredding**: Delete the key, and the data is mathematically gone forever.
*   **Sanitized Storage**: Physical files use UUIDs to prevent directory traversal attacks; original filenames are encrypted in the header.
*   **In-Memory Operations**: Load encrypted data directly into RAM for training without ever touching the disk as plaintext.

### 🧠 Federated Intelligence (`aegis-core`)
Orchestrated in **Python** for ecosystem compatibility.
*   **Local Training**: Run PyTorch/TensorFlow jobs inside the secure enclave.
*   **Differential Privacy**: Inject noise into model updates before they leave the device.
*   **Compliance-First**: The `ComplianceEngine` checks every data access request against active GDPR/CCPA policies.

---

## 🏗 Architecture

Aegis uses a "Sandwiched" architecture where the secure Rust core wraps the sensitive data, offering a safe API to the Python AI layer.

```mermaid
graph LR
    subgraph "Secure Enclave (User Device)"
        User[External Data] -->|Ingest Stream| RustCore
        RustCore{Aegis Engine (Rust)}
        RustCore <-->|Encrypted Chunks| Disk[(Local Vault)]
        
        PythonOrch[Aegis Core (Python)] -->|Request Access| RustCore
        RustCore -->|Mem-Only Stream| PythonOrch
        
        PythonOrch -->|Train| Model[PyTorch Model]
    end
    
    Model -.->|Diff-Private Weights| Cloud[Aggregation Server]
```

---

## ⚡ Getting Started

### Prerequisites
*   **Rust**: 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
*   **Python**: 3.10+

### Installation

1.  **Clone & Setup**
    ```bash
    git clone https://github.com/Lingikaushikreddy/Aegis.git
    cd Aegis
    ```

2.  **Build the High-Performance Core**
    ```bash
    cd aegis-engine
    cargo build --release
    # Verify system integrity tests
    cargo test
    ```

3.  **Install Python Dependencies**
    ```bash
    cd ..
    pip install -r requirements.txt
    ```

### Usage Example: Secure Ingestion

```python
import sys
# Add core to path (or install via pip in future)
sys.path.append("aegis-engine/bindings") 

# Pseudocode for upcoming Python Bindings
from aegis import Vault

# 1. Initialize Vault
vault = Vault.new("./my_secure_vault", key=b"SUPER_SECRET_32_BYTE_KEY_1234567")

# 2. Securely Ingest a Large Financial Dataset
# This streams the file, encrypting in 1MB chunks, never loading the full file to RAM.
encrypted_file_id = vault.store_file("finance_data.csv")

print(f"Secured as: {encrypted_file_id}")
# Physical file on disk: ./my_secure_vault/550e8400-e29b-41d4-a716-446655440000.enc
```

---

## 🗺️ Roadmap

- [x] **Phase 1: Foundation** - Rust Core, AES-GCM, Basic Vault.
- [x] **Phase 2: Hardening** - Streaming I/O, Path Sanitization, Memory Zeroing.
- [ ] **Phase 3: Python Bindings** - `PyO3` integration for seamless `pip install aegis`.
- [ ] **Phase 4: TEE Integration** - Intel SGX / AMD SEV support for remote attestation.
- [ ] **Phase 5: Network Layer** - Libp2p implementation for decentralized storage.

---

## 🤝 Contributing

Security is our top priority.
*   **Report Vulnerabilities**: Please create a draft security advisory on GitHub.
*   **Code Style**: 
    *   Rust: `cargo fmt` & `cargo clippy`
    *   Python: `black` & `mypy`

## 📄 License

Licensed under MIT. See [LICENSE](LICENSE) for details.

---
*Built with ❤️ by the Aegis Team.*
