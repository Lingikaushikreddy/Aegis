# Aegis v0 platform (archived)

> **Archived.** This branch preserves the experimental Aegis v0 platform. It is not maintained
> and should not be deployed. Active work continues as
> [**aegis-shred**](https://github.com/Lingikaushikreddy/Aegis) on `main`, a crypto-shredding
> library that grew out of the encrypted-vault component below.

Aegis v0 explored privacy-preserving machine learning: encrypted local storage plus federated
learning with differential-privacy noise. This README describes what the archived code actually
does.

## What is here

| Path | What it does | State |
|---|---|---|
| `aegis-engine/` (Rust) | AES-256-GCM file vault that encrypts in 1 MB chunks; Gaussian noise + norm clipping for model updates; UniFFI bindings for Swift, Kotlin and Python | Vault and noise functions work (8 unit tests). `FlClientCore::fit` is a placeholder that adds 0.1 to every weight; `network.rs` only prints. |
| `aegis-server/` (Python) | Flower server with a FedAvg strategy that drops NaN/Inf updates and checkpoints each round | Prototype; written against the 2025 Flower API and not verified against current releases. |
| `aegis-core/` (Python) | Flower client and trainer (PyTorch) on randomly generated data; consent-policy engine with an audit table (SQLAlchemy); TXT/CSV/PDF ingestion; key shredding helper | Prototype. |
| `aegis-gateway/` (Python) | FastAPI service with one placeholder endpoint | Stub. |
| `android/`, `ios/` | App shells that call the Rust vault through UniFFI | Shells only. |
| `docs/` | Design notes: architecture, threat model, GDPR/HIPAA control mapping, TEE ideas | Design intent, not audit results. |

## Known limitations

- There is no differential-privacy accounting: noise is added, but no privacy budget (ε) is
  computed or enforced.
- Vault chunks are encrypted independently and are not bound to their position or file, so
  chunks can be reordered or swapped between files without detection. `restore_file` does not
  validate the stored file name it is given. aegis-shred's format fixes both.
- No component has had a security review. No compliance certification of any kind exists.

## What was removed when archiving

- The Next.js marketing site and dashboards. They ran on mock data and presented real
  organisations as customers, partners or prospects, and claimed certifications (SOC 2,
  FedRAMP, NHS approval) that do not exist. That content was not true and has been removed.
- `certs/key.pem`, a development TLS private key that had been committed publicly. Treat it as
  compromised.

## Running the Rust tests

```bash
cd aegis-engine && cargo test
```

Licensed under MIT, as stated by the original project.
