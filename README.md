# AEGIS

> **The Privacy-First Federated Learning Ecosystem.**
> *Compute-to-Data Infrastructure for the AI Era.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust: 1.70+](https://img.shields.io/badge/rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-green.svg)](docs/ENCRYPTION.md)

**Aegis** is a high-performance, privacy-preserving infrastructure that enables **Federated Learning (FL)** on personal data without that data ever leaving the user's device. We implement a **Zero Trust** architecture where model training occurs locally within a secure enclave, and only differential-private updates are shared.

## 🌟 Key Features

### 🛡️ Iron-Clad Security
*   **Hybrid Core**: High-performance encryption engine written in **Rust** (`aegis-engine`), orchestrated by Python.
*   **Encryption at Rest**: All local data is encrypted using **AES-256-GCM** with keys managed via the OS Keychain (macOS/Windows/Linux).
*   **Right-to-Forget**: Built-in "Crypto-Shredding" allows users to instantly revoke access data by destroying encryption keys.
*   **Audit Trails**: Immutable SQLite ledger records every single data access or training request.

### ⚖️ Regulatory Compliance
*   **Automated Compliance Engine**: Enforces **GDPR**, **CCPA**, and **HIPAA** rules before data access.
*   **Consent Policies**: Granular permissions (e.g., "Allow `HealthCorp` to `TRAIN` on `Medical` data until `2026`").
*   **Data Minimization**: Automatically filters and minimizes datasets based on the job specification.

### 🧠 Federated Intelligence
*   **Local Training**: PyTorch models train directly on the user's device.
*   **Secure Aggregation**: Supports Differential Privacy (DP) noise injection to prevent model inversion attacks.
*   **Enterprise Gateway**: A secure API for analysts to submit jobs without seeing raw data.

---

## 🏗 System Architecture

The system uses a **Hybrid Python/Rust Architecture** to balance performance and ecosystem compatibility.

```mermaid
graph TD
    subgraph "Aegis Client (User Device)"
        A[App / CLI] -->|Control| B(Aegis Core - Python)
        B -->|High Perf Tasks| C{Aegis Engine - Rust}
        C -->|Encrypt/Decrypt| D[Local Storage (AES-256)]
        B -->|Train| E[PyTorch Trainer]
        C -->|Secure Comms| F[gRPC / TLS 1.3]
    end

    subgraph "Cloud Infrastructure"
        F <--> G[Aegis Server (Federated Orchestrator)]
        G <--> H[Enterprise Gateway]
    end
```

### Components
1.  **Aegis Engine (`aegis-engine`)**: The **Rust** power-plant. Handles crypto primitives, secure file I/O, and low-level networking.
2.  **Aegis Core (`aegis-core`)**: The **Python** orchestrator. Manages logical flow, PyTorch training loops, and database interactions.
3.  **Aegis Server (`aegis-server`)**: The centralized Federated Learning aggregator (based on Flower).

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.10+
- **Rust**: 1.70+ (install via [rustup.rs](https://rustup.rs/))
- **OS**: macOS, Linux, or Windows (WSL2 recommended)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Lingikaushikreddy/Aegis.git
    cd Aegis
    ```

2.  **Build the Rust Core**
    ```bash
    cd aegis-engine
    cargo build --release
    # Run tests to verify system integrity
    cargo test
    cd ..
    ```

3.  **Setup Python Environment**
    ```bash
    pip install -r requirements.txt
    ```

---

## 💻 Usage

### 1. Initialize & Secure Data
Simulate the "User" side by ingesting and encrypting data.

```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/aegis-core

# Integrated test script that creates a vault, encrypts data, and stores metadata
python test_ingestion.py
```

### 2. Run Compliance Check
Verify that your data and policies meet GDPR/CCPA standards.

```bash
./run_compliance_check.sh
# Output: "COMPLIANCE_DASHBOARD.md" generated with active policies and audit logs.
```

### 3. Check System Integrity
Run the Rust integration tests to verify the Vault SDK.

```bash
cd aegis-engine && cargo test
```

---

## 📚 Documentation

- [**System Architecture**](docs/systems_architecture.md) - Deep dive into the Rust/Python design.
- [**Security Specification**](docs/security_spec.md) - Threat models and cryptographic standards.
- [**Compliance Mapping**](docs/GDPR_MAPPING.md) - How we implement legal requirements in code.

## 🤝 Contributing

We welcome contributions! Please see the issue tracker for standard tasks.
**Security Note**: All code changes to `aegis-engine` must pass the `cargo audit` security scan.

## 📄 License

MIT License. See `LICENSE` for details.
