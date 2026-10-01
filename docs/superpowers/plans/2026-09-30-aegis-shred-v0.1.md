# aegis-shred v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Aegis repo into **aegis-shred**: an installable crypto-shredding vault (Rust library, `aegis` CLI, Python package) published as v0.1.0 on PyPI and crates.io, with the old platform archived honestly.

**Architecture:** A Rust core (`crates/aegis-shred`) holds keys, the sealed-object format, a SQLite keystore and a hash-chained audit log behind one `Vault` type. The CLI (`crates/aegis-shred-cli`) exposes `run(args) -> i32`, used by both the Rust binary and the Python console script. PyO3 bindings (`crates/aegis-shred-py`, packaged from `python/`) are built with maturin into abi3 wheels.

**Tech Stack:** Rust 2024 edition (MSRV 1.85), RustCrypto (`aes-gcm` 0.11, `aead-stream` 0.6, `hkdf` 0.13, `hmac` 0.13, `sha2` 0.11, `argon2` 0.6), `rusqlite` 0.40 (bundled SQLite), `clap` 4, PyO3 0.29, maturin 1.x, pytest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-30-aegis-shred-design.md` (read it first; this plan argues from it).

**Provenance of the code below:** every Rust, Python, YAML and Markdown block in this plan was built and run in a scratch workspace on 2026-09-30 (macOS, Apple M3 Pro, Rust 1.94, Python 3.12). At that point: 60 Rust tests and 22 Python tests passed, `cargo clippy --workspace --all-targets -- -D warnings` reported nothing, `cargo fmt --check` was clean, `cargo +1.85 check --workspace --lib --bins` passed, `cargo deny check` passed, and an sdist built and installed in a clean Python 3.11 venv. Copy blocks exactly; if something fails, investigate before changing the design.

## Global Constraints

- Work in `~/Desktop/Projects/Aegis` (a fresh clone of github.com/Lingikaushikreddy/Aegis), branch `refocus/aegis-shred`, except Task 1, which works on `legacy/platform`.
- Names: crates `aegis-shred` and `aegis-shred-cli` (crates.io), PyPI project `aegis-shred`, Python import `aegis_shred`, native module `aegis_shred._native`, CLI command `aegis`. The PyO3 crate `aegis-shred-py` has `publish = false`.
- Rust edition 2024, `rust-version = "1.85"`. The MSRV check covers shipped code only (`--lib --bins`); dev-dependencies such as `criterion` (needs 1.86) are exempt.
- License `MIT OR Apache-2.0` (files `LICENSE-MIT`, `LICENSE-APACHE`).
- Python ≥ 3.10, abi3 wheels (`pyo3/abi3-py310`).
- Commits are authored as Lingikaushikreddy with **no** `Co-Authored-By` or "Generated with" lines (Kaushik's standing rule).
- Error messages never contain plaintext, key material, or raw subject ids. The keystore and audit log never store raw subject ids.
- Before any `maturin` command run `unset CONDA_PREFIX CONDA_DEFAULT_ENV CONDA_SHLVL` and use the repo's `.venv`; otherwise maturin installs into `/opt/anaconda3` (this happened during planning).
- `clippy -D warnings` is enforced from Task 7 on; Tasks 3–6 may show `dead_code` warnings in non-test builds because the vault that uses those functions lands in Task 7.
- Outward actions are gated: pushing, opening or merging PRs, changing GitHub settings, Vercel changes, and publishing to PyPI/crates.io each need Kaushik's explicit go-ahead at that step, even though the spec was approved.

## Review Focus

Inputs the spec implies but its feature list does not spell out, most likely to bite first. Each one has a test in the task named.

1. **Forking after opening the vault** (gunicorn `--preload`, Celery prefork): the child must use its own SQLite connection, never the parent's (SQLite forbids sharing across `fork()`). Pinned by `tests/fork.rs` (Task 7; fails with exit code 3 if the child reuses the parent's connection) and `test_vault_keeps_working_across_fork` (Task 9).
2. **Keystore path in a directory that does not exist** (`Vault.open("data/keys.db", create=True)` before `data/` exists): expect a clear `NotFound` / `FileNotFoundError`, not a vague SQLite error. Pinned by `missing_keystore_directory_is_a_clear_not_found` (Task 7).
3. **Non-ASCII or differently-normalized subject ids** ("José" in NFC vs NFD): ids are compared byte for byte, the 256 limit counts bytes, and the README tells users to use stable internal ids. Pinned by `subject_ids_are_compared_byte_for_byte` (Task 7) and the README note (Task 12).
4. **Sealing or unsealing a file in place** (same source and destination path): must work and stay atomic. Pinned by `files_can_be_sealed_and_unsealed_in_place` (Task 7).
5. **Python callers passing `str` where bytes are expected** (`vault.seal("u", "alice@…")`): expect `TypeError`, never silent encoding. Pinned by `test_text_instead_of_bytes_is_a_type_error` (Task 9).

## File map (end state of `main`)

| File | Responsibility | Task |
|---|---|---|
| `Cargo.toml`, `Cargo.lock` | workspace, shared package metadata, test profile | 2, 8, 9 |
| `crates/aegis-shred/src/error.rs` | `Error` enum, `Result` alias | 2 |
| `crates/aegis-shred/src/keys.rs` | `MasterKey`, KDF, wrap/unwrap, HKDF object key, subject HMAC | 3 |
| `crates/aegis-shred/src/format.rs` | 56-byte header, STREAM seal/unseal, `inspect_header` | 4 |
| `crates/aegis-shred/tests/vectors/format-v1.json` | known-answer vectors (generated) | 4 |
| `crates/aegis-shred/src/audit.rs` | audit entry hash, chain verification | 5 |
| `crates/aegis-shred/src/keystore.rs` | SQLite schema and queries, `key_status` | 6 |
| `crates/aegis-shred/src/vault.rs` | `Vault` public API | 7 |
| `crates/aegis-shred/src/lib.rs` | crate docs, module wiring, re-exports | 2→7 |
| `crates/aegis-shred/tests/{vault,fork}.rs` | integration tests | 7 |
| `crates/aegis-shred/benches/throughput.rs` | criterion benchmarks | 11 |
| `crates/aegis-shred-cli/src/{lib,main}.rs`, `tests/cli.rs` | `aegis` CLI | 8 |
| `crates/aegis-shred-py/src/lib.rs` | PyO3 bindings | 9 |
| `pyproject.toml`, `python/aegis_shred/*`, `python/tests/*` | Python package and tests | 9 |
| `examples/fastapi_users/*` | example app | 10 |
| `fuzz/*` | cargo-fuzz target | 11 |
| `docs/FORMAT.md` | normative format spec | 4 |
| `README.md`, `docs/THREAT_MODEL.md`, `docs/OPERATIONS.md`, `CHANGELOG.md`, `site/index.html` | documentation | 12 |
| `SECURITY.md`, `LICENSE-*`, `.gitignore`, crate READMEs | repo hygiene | 2, 8 |
| `deny.toml`, `.github/workflows/ci.yml` | CI | 13 |
| `.github/workflows/release.yml` | wheels, sdist, publishing | 14 |

---

### Task 1: Archive the v0 platform on `legacy/platform`

**Files (branch `legacy/platform`):**
- Delete: `app/`, `components/`, `public/`, `lib/`, `components.json`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `package-lock.json`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `PRD_AEGIS_FRONTEND.md`, `FRONTEND_DEVELOPMENT_COMPLETE.md`, `certs/`, `.vscode/`
- Modify: `aegis-server/aegis_server/strategy.py` (add the missing numpy import)
- Replace: `README.md`
- Create: `LICENSE`

**Interfaces:** none (archive only).

- [ ] **Step 1: Create the branch from the current GitHub `main`**

```bash
cd ~/Desktop/Projects/Aegis
git fetch origin
git switch -c legacy/platform origin/main
```

- [ ] **Step 2: Confirm the problems this task fixes are present (the "failing test")**

```bash
git grep -c -iE "mayo clinic|jpmorgan|hdfc bank|fedramp authorized" -- app components | head
grep -n "^import numpy as np" aegis-server/aegis_server/strategy.py || echo "numpy import missing"
ls certs/key.pem
```

Expected: matches in `app/admin/poc/page.tsx`, `components/sections/social-proof.tsx`, `app/partners/page.tsx`; `numpy import missing`; `certs/key.pem` listed.

- [ ] **Step 3: Remove the frontend, the leaked key, and editor settings**

```bash
git rm -r -q app components public lib components.json eslint.config.mjs next.config.ts \
  package.json package-lock.json postcss.config.mjs tailwind.config.ts tsconfig.json \
  PRD_AEGIS_FRONTEND.md FRONTEND_DEVELOPMENT_COMPLETE.md certs .vscode
```

- [ ] **Step 4: Fix the crash in `strategy.py`**

Insert `import numpy as np` on the line after `import time` (line 19) in `aegis-server/aegis_server/strategy.py`, so the import block ends:

```python
from prometheus_client import Summary, Gauge, Counter
import time
import numpy as np
```

- [ ] **Step 5: Replace `README.md` with the archive notice**

````markdown
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
````

- [ ] **Step 6: Add the MIT license the old README promised**

```bash
cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2025-2026 Lingikaushikreddy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

- [ ] **Step 7: Verify**

```bash
git grep -n -iE "mayo|jpmorgan|barclays|hdfc|emirates nbd|reliance jio|fedramp|soc ?2 (certified|compliant)|testimonial" -- . ':!README.md' || echo "no false claims left"
python3 -m py_compile aegis-server/aegis_server/strategy.py && echo "strategy.py compiles"
(cd aegis-engine && cargo test 2>&1 | grep "test result")
```

Expected: `no false claims left`; `strategy.py compiles`; first test result line `ok. 8 passed`.

- [ ] **Step 8: Commit and tag**

```bash
git add -A
git commit -m "Archive the Aegis v0 platform

Remove the Next.js marketing frontend, which presented real organisations as
customers and claimed certifications that do not exist; remove the publicly
committed dev TLS key; fix the missing numpy import in the Flower strategy;
replace the README with an honest archive notice; add the MIT license."
git tag -a v0-platform -m "Aegis v0 platform (archived)"
```

- [ ] **Step 9: Push (ask Kaushik first)**

```bash
git push -u origin legacy/platform
git push origin v0-platform
```

---

### Task 2: Refocus the branch: workspace skeleton, licenses, errors

**Files (branch `refocus/aegis-shred`):**
- Delete: every v0 file (list in Step 2) and the old `docs/*.md`
- Create: `.gitignore`, `Cargo.toml`, `crates/aegis-shred/Cargo.toml`, `crates/aegis-shred/README.md`, `crates/aegis-shred/src/lib.rs`, `crates/aegis-shred/src/error.rs`, `README.md` (interim), `LICENSE-MIT`, `LICENSE-APACHE`, `SECURITY.md`

**Interfaces:**
- Produces: `aegis_shred::Error` (variants `Shredded { shredded_at: i64 }`, `UnknownKey`, `WrongMasterKey(&'static str)`, `Integrity`, `UnsupportedFormat(&'static str)`, `Keystore(String)`, `Io(std::io::Error)`, `InvalidArgument(String)`), `aegis_shred::Result<T>`, `impl From<rusqlite::Error> for Error`.

- [ ] **Step 1: Switch to the branch** (it already holds the spec and this plan)

```bash
cd ~/Desktop/Projects/Aegis && git switch refocus/aegis-shred && git status --short
```

Expected: clean working tree.

- [ ] **Step 2: Remove the v0 platform from this branch**

```bash
git rm -r -q .vscode FRONTEND_DEVELOPMENT_COMPLETE.md Makefile PRD_AEGIS_FRONTEND.md \
  aegis-core aegis-engine aegis-gateway aegis-server android app certs components.json \
  components eslint.config.mjs ios lib next.config.ts package-lock.json package.json \
  postcss.config.mjs public requirements.txt run_compliance_check.sh scripts \
  tailwind.config.ts test_aegis_core.py test_compliance.py test_data_ingestion \
  test_ingestion.py tsconfig.json README.md .gitignore \
  docs/COMPLIANCE_REPORT.md docs/ENCRYPTION.md docs/GDPR_MAPPING.md docs/README.md \
  docs/RUNBOOK.md docs/TEE_INTEGRATION.md docs/THREAT_MODEL.md docs/architecture.md \
  docs/security_spec.md docs/systems_architecture.md
git ls-files
```

Expected: only `docs/superpowers/plans/…` and `docs/superpowers/specs/…` remain.

- [ ] **Step 3: Write `.gitignore`**

```
# Rust
/target/
/fuzz/target/
/fuzz/corpus/
/fuzz/artifacts/

# Python
__pycache__/
*.py[cod]
.venv/
.pytest_cache/
/dist/
*.so
*.pyd
*.dylib

# Local data and secrets: never commit keystores, sealed files, keys or certificates
*.db
*.aegis
*.key
*.pem
certs/
.env
.env.*

# Editors and OS
.DS_Store
.vscode/
.idea/

# Vercel
.vercel
```

- [ ] **Step 4: Write the workspace `Cargo.toml`** (members grow in Tasks 8 and 9)

```toml
[workspace]
resolver = "3"
members = ["crates/aegis-shred"]
default-members = ["crates/aegis-shred"]

[workspace.package]
version = "0.1.0"
edition = "2024"
rust-version = "1.85"
license = "MIT OR Apache-2.0"
repository = "https://github.com/Lingikaushikreddy/Aegis"
homepage = "https://github.com/Lingikaushikreddy/Aegis"

[workspace.dependencies]
aegis-shred = { path = "crates/aegis-shred", version = "0.1.0" }

[profile.release]
lto = "thin"
codegen-units = 1

# Crypto and Argon2 are painfully slow unoptimized; keep test runs fast.
[profile.dev.package."*"]
opt-level = 3
```

- [ ] **Step 5: Write `crates/aegis-shred/Cargo.toml`** (criterion and the bench target are added in Task 11)

```toml
[package]
name = "aegis-shred"
description = "Crypto-shredding vault: one key per data subject, so erasing a person makes their data unreadable everywhere, backups included."
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
homepage.workspace = true
readme = "README.md"
keywords = ["encryption", "crypto-shredding", "gdpr", "privacy", "erasure"]
categories = ["cryptography"]

[dependencies]
aead-stream = { version = "0.6", features = ["alloc"] }
aes-gcm = { version = "0.11", features = ["zeroize"] }
argon2 = "0.6"
base64 = "0.23"
getrandom = "0.4"
hex = "0.4"
hkdf = "0.13"
hmac = "0.13"
rusqlite = { version = "0.40", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sha2 = "0.11"
tempfile = "3"
thiserror = "2"
zeroize = "1"

[dev-dependencies]
proptest = "1"

[target.'cfg(unix)'.dev-dependencies]
libc = "0.2"
```

- [ ] **Step 6: Write `crates/aegis-shred/src/error.rs`**

```rust
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
```

- [ ] **Step 7: Write the first `crates/aegis-shred/src/lib.rs`** (replaced by the final version in Task 7)

```rust
//! # aegis-shred
//!
//! Crypto-shredding for application data: every data subject gets their own encryption key, so
//! erasing a person means destroying one key.

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod error;

pub use error::{Error, Result};
```

- [ ] **Step 8: Write `crates/aegis-shred/README.md`** (shown on crates.io)

````markdown
# aegis-shred

Crypto-shredding for application data: every data subject gets their own encryption key, so
erasing a person means destroying one key, and every copy of their data (including copies in
backups) becomes unreadable.

```rust
use aegis_shred::{Error, MasterKey, Vault};

let vault = Vault::open_or_create("keys.db", &MasterKey::from_env("AEGIS_MASTER_KEY")?)?;
let sealed = vault.seal("user-42", b"alice@example.com", b"users.email")?;
assert_eq!(vault.unseal(&sealed, b"users.email")?, b"alice@example.com");

vault.shred("user-42")?;
assert!(matches!(vault.unseal(&sealed, b"users.email"), Err(Error::Shredded { .. })));
```

Documentation, the format specification, the threat model and the Python package live in the
[repository](https://github.com/Lingikaushikreddy/Aegis).

Licensed under MIT or Apache-2.0, at your option.
````

- [ ] **Step 9: Interim root `README.md`** (maturin needs it in Task 9; Task 12 replaces it)

```markdown
# aegis-shred

Crypto-shredding for application data: one encryption key per data subject, so erasing a person
makes every copy of their data unreadable. Work in progress on this branch; see
`docs/superpowers/specs/2026-09-30-aegis-shred-design.md`.
```

- [ ] **Step 10: Licenses and security policy**

```bash
curl -sSf https://www.apache.org/licenses/LICENSE-2.0.txt -o LICENSE-APACHE
head -3 LICENSE-APACHE   # expect "Apache License" / "Version 2.0, January 2004"
cat > LICENSE-MIT <<'EOF'
MIT License

Copyright (c) 2025-2026 Lingikaushikreddy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

`SECURITY.md`:

```markdown
# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on
[github.com/Lingikaushikreddy/Aegis](https://github.com/Lingikaushikreddy/Aegis/security/advisories/new).
Do not open a public issue. You should get a reply within 7 days.

Useful reports include the version, a description of the impact, and steps or code to
reproduce. Reports about the cryptographic format, key handling, or anything that weakens the
guarantees in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) are especially welcome.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | yes |
| Aegis v0 platform (`legacy/platform` branch) | no; archived |

## Known compromised material

Before 2026-09-30 this repository contained `certs/key.pem`, a self-signed TLS private key
(CN=localhost, O=Vaulted) used by the archived v0 platform's development servers. It is public
and must be treated as compromised. Never use it. aegis-shred itself does not use TLS
certificates.

## Status

aegis-shred has not had an independent security audit.
```

- [ ] **Step 11: Verify the skeleton builds**

```bash
cargo build 2>&1 | tail -1
cargo test 2>&1 | grep "test result" | head -1
```

Expected: `Finished`; `ok. 0 passed`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Refocus the repository on aegis-shred

Remove the v0 platform from this branch (archived on legacy/platform), add the
Rust workspace skeleton with the error type, dual MIT/Apache-2.0 licensing, and a
security policy that declares the previously committed dev TLS key compromised."
```

---

### Task 3: `keys` module (master keys, wrapping, derivations)

**Files:**
- Create: `crates/aegis-shred/src/keys.rs`
- Modify: `crates/aegis-shred/src/lib.rs`

**Interfaces:**
- Consumes: `crate::error::{Error, Result}`.
- Produces:
  - `pub enum MasterKey { Raw(Zeroizing<[u8; 32]>), Passphrase(Zeroizing<String>) }` with `generate()`, `from_bytes(&[u8])`, `from_base64(&str)`, `from_env(&str)`, `from_file(impl AsRef<Path>)`, `from_passphrase(impl Into<String>)` (all `-> Result<Self>` except `generate`), `to_base64(&self) -> Result<String>`, `kind(&self) -> &'static str` (`"raw"`/`"passphrase"`); `Debug` redacts.
  - `pub(crate) type Key32 = Zeroizing<[u8; 32]>`; `random_bytes::<N>() -> [u8; N]`; `random_key() -> Key32`.
  - `pub(crate) struct KdfParams { m_kib, t, p }` with `DEFAULT`, `to_bytes() -> [u8; 12]`, `from_bytes(&[u8]) -> Result<Self>`.
  - `derive_kek(&MasterKey, salt: &[u8], KdfParams) -> Result<Key32>`.
  - `wrap(kek: &[u8; 32], plaintext, aad) -> Vec<u8>`; `unwrap(kek, wrapped, aad) -> Option<Zeroizing<Vec<u8>>>`; `unwrap_key32(...) -> Option<Key32>`.
  - `dek_aad(&[u8; 16], &[u8; 32]) -> Vec<u8>`; `object_key(dek: &[u8; 32], salt: &[u8; 32], key_id: &[u8; 16]) -> Key32`; `subject_hash(index_key: &[u8; 32], subject: &str) -> [u8; 32]`; `validate_subject(&str) -> Result<()>`.
  - Constants `AAD_DEK`, `AAD_INDEX_KEY`, `AAD_KEK_CHECK`, `KEK_CHECK_PLAINTEXT`.

- [ ] **Step 1: Write the failing tests** at the bottom of a new `crates/aegis-shred/src/keys.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const FAST: KdfParams = KdfParams {
        m_kib: 1024,
        t: 1,
        p: 1,
    };

    #[test]
    fn base64_round_trip() {
        let key = MasterKey::generate();
        let encoded = key.to_base64().unwrap();
        let decoded = MasterKey::from_base64(&format!("  {encoded}\n")).unwrap();
        assert_eq!(decoded.to_base64().unwrap(), encoded);
    }

    #[test]
    fn rejects_wrong_length_and_garbage() {
        assert!(matches!(
            MasterKey::from_bytes(&[0u8; 31]),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_base64("not base64!"),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_base64("AAAA"),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_passphrase(""),
            Err(Error::InvalidArgument(_))
        ));
    }

    #[test]
    fn debug_never_shows_key_material() {
        let key = MasterKey::from_bytes(&[0x41; 32]).unwrap();
        assert_eq!(format!("{key:?}"), "MasterKey::Raw(<redacted>)");
        let pass = MasterKey::from_passphrase("hunter2").unwrap();
        assert!(!format!("{pass:?}").contains("hunter2"));
        assert!(pass.to_base64().is_err());
    }

    #[test]
    fn wrap_round_trip_and_rejections() {
        let kek = [7u8; 32];
        let wrapped = wrap(&kek, b"secret", b"aad");
        assert_eq!(
            unwrap(&kek, &wrapped, b"aad").unwrap().as_slice(),
            b"secret"
        );
        assert!(unwrap(&kek, &wrapped, b"other").is_none());
        assert!(unwrap(&[8u8; 32], &wrapped, b"aad").is_none());
        assert!(unwrap(&kek, &wrapped[..20], b"aad").is_none());
    }

    #[test]
    fn passphrase_kdf_depends_on_salt() {
        let pass = MasterKey::from_passphrase("correct horse").unwrap();
        let a = derive_kek(&pass, b"salt-one-16bytes", FAST).unwrap();
        let b = derive_kek(&pass, b"salt-one-16bytes", FAST).unwrap();
        let c = derive_kek(&pass, b"salt-two-16bytes", FAST).unwrap();
        assert_eq!(*a, *b);
        assert_ne!(*a, *c);
    }

    #[test]
    fn kdf_params_round_trip() {
        assert_eq!(
            KdfParams::from_bytes(&KdfParams::DEFAULT.to_bytes()).unwrap(),
            KdfParams::DEFAULT
        );
        assert!(KdfParams::from_bytes(&[0u8; 5]).is_err());
    }

    #[test]
    fn derivations_are_domain_separated() {
        let index = [1u8; 32];
        assert_eq!(
            subject_hash(&index, "user-42"),
            subject_hash(&index, "user-42")
        );
        assert_ne!(
            subject_hash(&index, "user-42"),
            subject_hash(&index, "user-43")
        );
        assert_ne!(
            subject_hash(&index, "user-42"),
            subject_hash(&[2u8; 32], "user-42")
        );
        let dek = [3u8; 32];
        assert_ne!(
            *object_key(&dek, &[4u8; 32], &[5u8; 16]),
            *object_key(&dek, &[6u8; 32], &[5u8; 16])
        );
        assert_ne!(
            *object_key(&dek, &[4u8; 32], &[5u8; 16]),
            *object_key(&dek, &[4u8; 32], &[9u8; 16])
        );
    }

    #[test]
    fn subject_length_limits() {
        assert!(validate_subject("").is_err());
        assert!(validate_subject(&"x".repeat(257)).is_err());
        assert!(validate_subject(&"x".repeat(256)).is_ok());
    }
}
```

- [ ] **Step 2: Wire the module.** In `lib.rs` add `mod keys;` after `mod error;` and `pub use keys::MasterKey;` after the `error` re-export.

- [ ] **Step 3: Run the tests to see them fail**

Run: `cargo test -p aegis-shred keys::`
Expected: compile errors such as `cannot find type MasterKey in this scope`.

- [ ] **Step 4: Add the implementation** above the `#[cfg(test)]` line in `keys.rs`:

```rust
//! Key material: master keys, key wrapping, and key derivation.

use std::fmt;
use std::path::Path;

use aes_gcm::Aes256Gcm;
use aes_gcm::aead::{Aead, KeyInit, Payload};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as B64;
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use zeroize::Zeroizing;

use crate::error::{Error, Result};

/// A 32-byte secret that is wiped from memory when dropped.
pub(crate) type Key32 = Zeroizing<[u8; 32]>;

pub(crate) const AAD_DEK: &[u8] = b"aegis-shred/v1/dek";
pub(crate) const AAD_INDEX_KEY: &[u8] = b"aegis-shred/v1/index-key";
pub(crate) const AAD_KEK_CHECK: &[u8] = b"aegis-shred/v1/kek-check";
pub(crate) const KEK_CHECK_PLAINTEXT: &[u8] = b"aegis-shred kek check";
const OBJECT_KEY_INFO: &[u8] = b"aegis-shred/v1/object";
const MAX_SUBJECT_LEN: usize = 256;
const NONCE_LEN: usize = 12;
const TAG_LEN: usize = 16;

pub(crate) fn random_bytes<const N: usize>() -> [u8; N] {
    let mut buf = [0u8; N];
    getrandom::fill(&mut buf).expect("operating system random number generator failed");
    buf
}

pub(crate) fn random_key() -> Key32 {
    Zeroizing::new(random_bytes::<32>())
}

/// The master key (key-encryption key) that protects every data key in a keystore.
#[derive(Clone)]
pub enum MasterKey {
    /// 32 random bytes, usually stored base64-encoded in a secret manager.
    Raw(Zeroizing<[u8; 32]>),
    /// A passphrase, stretched with Argon2id when the keystore is opened.
    Passphrase(Zeroizing<String>),
}

impl fmt::Debug for MasterKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MasterKey::Raw(_) => f.write_str("MasterKey::Raw(<redacted>)"),
            MasterKey::Passphrase(_) => f.write_str("MasterKey::Passphrase(<redacted>)"),
        }
    }
}

impl MasterKey {
    /// Generates a new random 32-byte master key.
    pub fn generate() -> Self {
        MasterKey::Raw(random_key())
    }

    /// Uses exactly 32 raw bytes as the master key.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        let arr: [u8; 32] = bytes.try_into().map_err(|_| {
            Error::InvalidArgument("a raw master key must be exactly 32 bytes".into())
        })?;
        Ok(MasterKey::Raw(Zeroizing::new(arr)))
    }

    /// Decodes a base64 (standard alphabet, padded) master key. Surrounding whitespace is ignored.
    pub fn from_base64(encoded: &str) -> Result<Self> {
        let bytes = Zeroizing::new(
            B64.decode(encoded.trim())
                .map_err(|_| Error::InvalidArgument("master key is not valid base64".into()))?,
        );
        Self::from_bytes(&bytes)
    }

    /// Reads a base64 master key from an environment variable.
    pub fn from_env(var: &str) -> Result<Self> {
        let value = Zeroizing::new(std::env::var(var).map_err(|_| {
            Error::InvalidArgument(format!(
                "environment variable {var} is not set or is not valid UTF-8"
            ))
        })?);
        Self::from_base64(&value)
    }

    /// Reads a base64 master key from a file.
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self> {
        let text = Zeroizing::new(std::fs::read_to_string(path)?);
        Self::from_base64(&text)
    }

    /// Uses a passphrase as the master key.
    pub fn from_passphrase(passphrase: impl Into<String>) -> Result<Self> {
        let passphrase = Zeroizing::new(passphrase.into());
        if passphrase.is_empty() {
            return Err(Error::InvalidArgument(
                "passphrase must not be empty".into(),
            ));
        }
        Ok(MasterKey::Passphrase(passphrase))
    }

    /// Encodes a raw master key as base64. Passphrase keys cannot be exported.
    pub fn to_base64(&self) -> Result<String> {
        match self {
            MasterKey::Raw(key) => Ok(B64.encode(key.as_slice())),
            MasterKey::Passphrase(_) => Err(Error::InvalidArgument(
                "a passphrase master key has no raw bytes to export".into(),
            )),
        }
    }

    /// `"raw"` or `"passphrase"`.
    pub fn kind(&self) -> &'static str {
        match self {
            MasterKey::Raw(_) => "raw",
            MasterKey::Passphrase(_) => "passphrase",
        }
    }
}

/// Argon2id cost parameters, stored in the keystore so they can change later.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct KdfParams {
    pub m_kib: u32,
    pub t: u32,
    pub p: u32,
}

impl KdfParams {
    /// RFC 9106 second recommended option: 64 MiB, 3 passes, 1 lane.
    pub(crate) const DEFAULT: KdfParams = KdfParams {
        m_kib: 65536,
        t: 3,
        p: 1,
    };

    pub(crate) fn to_bytes(self) -> [u8; 12] {
        let mut out = [0u8; 12];
        out[0..4].copy_from_slice(&self.m_kib.to_be_bytes());
        out[4..8].copy_from_slice(&self.t.to_be_bytes());
        out[8..12].copy_from_slice(&self.p.to_be_bytes());
        out
    }

    pub(crate) fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != 12 {
            return Err(Error::Keystore(
                "corrupt keystore: bad kdf parameters".into(),
            ));
        }
        let word = |i: usize| u32::from_be_bytes(bytes[i..i + 4].try_into().expect("4 bytes"));
        Ok(KdfParams {
            m_kib: word(0),
            t: word(4),
            p: word(8),
        })
    }
}

/// Turns a master key into the 32-byte key-encryption key.
pub(crate) fn derive_kek(master: &MasterKey, salt: &[u8], params: KdfParams) -> Result<Key32> {
    match master {
        MasterKey::Raw(key) => Ok(key.clone()),
        MasterKey::Passphrase(passphrase) => {
            let argon_params = argon2::Params::new(params.m_kib, params.t, params.p, Some(32))
                .map_err(|_| Error::Keystore("corrupt keystore: invalid kdf parameters".into()))?;
            let argon = argon2::Argon2::new(
                argon2::Algorithm::Argon2id,
                argon2::Version::V0x13,
                argon_params,
            );
            let mut out = Zeroizing::new([0u8; 32]);
            argon
                .hash_password_into(passphrase.as_bytes(), salt, &mut out[..])
                .map_err(|_| Error::Keystore("passphrase key derivation failed".into()))?;
            Ok(out)
        }
    }
}

fn cipher(key: &[u8; 32]) -> Aes256Gcm {
    Aes256Gcm::new_from_slice(key).expect("AES-256 key is 32 bytes")
}

/// Encrypts `plaintext` under `kek`: `nonce(12) || AES-256-GCM(ciphertext || tag)`.
pub(crate) fn wrap(kek: &[u8; 32], plaintext: &[u8], aad: &[u8]) -> Vec<u8> {
    let nonce = random_bytes::<NONCE_LEN>();
    let ciphertext = cipher(kek)
        .encrypt(
            &nonce.into(),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .expect("AES-GCM encryption of a short value cannot fail");
    let mut out = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    out
}

/// Reverses [`wrap`]. Returns `None` if the key, AAD, or bytes are wrong.
pub(crate) fn unwrap(kek: &[u8; 32], wrapped: &[u8], aad: &[u8]) -> Option<Zeroizing<Vec<u8>>> {
    if wrapped.len() < NONCE_LEN + TAG_LEN {
        return None;
    }
    let nonce: [u8; NONCE_LEN] = wrapped[..NONCE_LEN].try_into().ok()?;
    cipher(kek)
        .decrypt(
            &nonce.into(),
            Payload {
                msg: &wrapped[NONCE_LEN..],
                aad,
            },
        )
        .ok()
        .map(Zeroizing::new)
}

/// [`unwrap`] for values that must be exactly 32 bytes.
pub(crate) fn unwrap_key32(kek: &[u8; 32], wrapped: &[u8], aad: &[u8]) -> Option<Key32> {
    let bytes = unwrap(kek, wrapped, aad)?;
    let arr: [u8; 32] = bytes.as_slice().try_into().ok()?;
    Some(Zeroizing::new(arr))
}

/// AAD binding a wrapped data key to its key id and subject.
pub(crate) fn dek_aad(key_id: &[u8; 16], subject_hash: &[u8; 32]) -> Vec<u8> {
    [AAD_DEK, &key_id[..], &subject_hash[..]].concat()
}

/// Per-object key: `HKDF-SHA256(ikm = DEK, salt = object salt, info = "aegis-shred/v1/object" || key_id)`.
pub(crate) fn object_key(dek: &[u8; 32], salt: &[u8; 32], key_id: &[u8; 16]) -> Key32 {
    let hkdf = Hkdf::<Sha256>::new(Some(salt), dek);
    let info = [OBJECT_KEY_INFO, &key_id[..]].concat();
    let mut out = Zeroizing::new([0u8; 32]);
    hkdf.expand(&info, &mut out[..])
        .expect("32 bytes is a valid HKDF-SHA256 output length");
    out
}

/// `HMAC-SHA256(index_key, subject)`: how subjects are identified inside the keystore.
pub(crate) fn subject_hash(index_key: &[u8; 32], subject: &str) -> [u8; 32] {
    let mut mac = <Hmac<Sha256> as hmac::KeyInit>::new_from_slice(index_key)
        .expect("HMAC accepts any key length");
    mac.update(subject.as_bytes());
    mac.finalize().into_bytes().into()
}

/// Subject ids are 1 to 256 bytes of UTF-8.
pub(crate) fn validate_subject(subject: &str) -> Result<()> {
    if subject.is_empty() || subject.len() > MAX_SUBJECT_LEN {
        return Err(Error::InvalidArgument(
            "subject id must be 1 to 256 bytes of UTF-8".into(),
        ));
    }
    Ok(())
}
```

- [ ] **Step 5: Run the tests**

Run: `cargo test -p aegis-shred keys::`
Expected: `test result: ok. 8 passed`.

- [ ] **Step 6: Commit**

```bash
git add crates/aegis-shred/src/keys.rs crates/aegis-shred/src/lib.rs
git commit -m "Add master keys, key wrapping and key derivation"
```

---

### Task 4: Sealed object format, test vectors, `docs/FORMAT.md`

**Files:**
- Create: `crates/aegis-shred/src/format.rs`, `crates/aegis-shred/tests/vectors/format-v1.json` (generated), `docs/FORMAT.md`
- Modify: `crates/aegis-shred/src/lib.rs`

**Interfaces:**
- Consumes: `keys::object_key`, `Error::{Integrity, UnsupportedFormat, InvalidArgument, Io}`.
- Produces: `pub struct Header { version, algorithm, chunk_size_log2: u8, key_id: [u8; 16], salt: [u8; 32] }` with `chunk_size()`, `to_bytes() -> [u8; 56]`, `parse(&[u8]) -> Result<Header>`; `pub const HEADER_LEN: usize = 56`; `pub fn inspect_header(&[u8]) -> Result<Header>`; `pub(crate) Header::new(key_id, salt, chunk_size_log2)`, `DEFAULT_CHUNK_SIZE_LOG2 = 16`, `read_header<R: Read>(&mut R) -> Result<Header>`, `seal_with<R, W>(dek, &Header, R, W, context) -> Result<()>`, `unseal_with<R, W>(dek, &Header, R, W, context) -> Result<()>`.

- [ ] **Step 1: Create the vector file stub** (the tests read it at compile time):

```bash
mkdir -p crates/aegis-shred/tests/vectors
echo '{"description":"","dek_hex":"","key_id_hex":"","salt_hex":"","plaintext_rule":"","cases":[]}' \
  > crates/aegis-shred/tests/vectors/format-v1.json
```

- [ ] **Step 2: Write the failing tests** at the bottom of a new `crates/aegis-shred/src/format.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    const DEK: [u8; 32] = [0x11; 32];
    const KEY_ID: [u8; 16] = [0x22; 16];
    const SALT: [u8; 32] = [0x33; 32];
    const SMALL: u8 = 12; // 4096-byte chunks keep multi-chunk tests fast
    const SEG: usize = 4096 + 16;

    fn pattern(len: usize) -> Vec<u8> {
        (0..len).map(|i| (i % 251) as u8).collect()
    }

    fn seal_bytes(plaintext: &[u8], context: &[u8], log2: u8) -> Vec<u8> {
        let header = Header::new(KEY_ID, SALT, log2);
        let mut out = Vec::new();
        seal_with(&DEK, &header, plaintext, &mut out, context).unwrap();
        out
    }

    fn unseal_bytes(sealed: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut input = sealed;
        let header = read_header(&mut input)?;
        let mut out = Vec::new();
        unseal_with(&DEK, &header, input, &mut out, context)?;
        Ok(out)
    }

    #[test]
    fn round_trips_at_chunk_boundaries() {
        for len in [0, 1, 4095, 4096, 4097, 3 * 4096, 3 * 4096 + 5] {
            let data = pattern(len);
            let sealed = seal_bytes(&data, b"ctx", SMALL);
            assert_eq!(unseal_bytes(&sealed, b"ctx").unwrap(), data, "len {len}");
        }
        let big = pattern(200_000);
        let sealed = seal_bytes(&big, b"", DEFAULT_CHUNK_SIZE_LOG2);
        assert_eq!(unseal_bytes(&sealed, b"").unwrap(), big);
    }

    #[test]
    fn empty_plaintext_is_header_plus_one_tag() {
        let sealed = seal_bytes(b"", b"", SMALL);
        assert_eq!(sealed.len(), HEADER_LEN + 16);
        assert_eq!(unseal_bytes(&sealed, b"").unwrap(), b"");
    }

    #[test]
    fn exact_multiple_of_chunk_has_no_empty_trailer() {
        let sealed = seal_bytes(&pattern(2 * 4096), b"", SMALL);
        assert_eq!(sealed.len(), HEADER_LEN + 2 * SEG);
    }

    proptest! {
        #[test]
        fn round_trips_any_input(data in proptest::collection::vec(any::<u8>(), 0..20_000),
                                 context in proptest::collection::vec(any::<u8>(), 0..64)) {
            let sealed = seal_bytes(&data, &context, SMALL);
            prop_assert_eq!(unseal_bytes(&sealed, &context).unwrap(), data);
        }
    }

    #[test]
    fn every_single_byte_flip_is_rejected() {
        let sealed = seal_bytes(&pattern(100), b"ctx", SMALL);
        for i in 0..sealed.len() {
            let mut bad = sealed.clone();
            bad[i] ^= 0x01;
            let err = unseal_bytes(&bad, b"ctx").unwrap_err();
            if i < 6 || i == 7 {
                assert!(
                    matches!(err, Error::UnsupportedFormat(_)),
                    "byte {i}: {err:?}"
                );
            } else {
                assert!(matches!(err, Error::Integrity), "byte {i}: {err:?}");
            }
        }
    }

    #[test]
    fn wrong_context_is_rejected() {
        let sealed = seal_bytes(b"alice@example.com", b"users.email:42", SMALL);
        assert!(matches!(
            unseal_bytes(&sealed, b"users.email:43"),
            Err(Error::Integrity)
        ));
        assert!(matches!(unseal_bytes(&sealed, b""), Err(Error::Integrity)));
    }

    /// Splits a sealed object into header and body segments.
    fn segments(sealed: &[u8]) -> (Vec<u8>, Vec<Vec<u8>>) {
        let header = sealed[..HEADER_LEN].to_vec();
        let body = sealed[HEADER_LEN..]
            .chunks(SEG)
            .map(<[u8]>::to_vec)
            .collect();
        (header, body)
    }

    fn join(header: &[u8], segs: &[Vec<u8>]) -> Vec<u8> {
        let mut out = header.to_vec();
        for s in segs {
            out.extend_from_slice(s);
        }
        out
    }

    #[test]
    fn reordered_duplicated_and_dropped_chunks_are_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        let (header, segs) = segments(&sealed);
        assert_eq!(segs.len(), 4);

        let swapped = vec![
            segs[1].clone(),
            segs[0].clone(),
            segs[2].clone(),
            segs[3].clone(),
        ];
        assert!(matches!(
            unseal_bytes(&join(&header, &swapped), b""),
            Err(Error::Integrity)
        ));

        let duplicated = vec![
            segs[0].clone(),
            segs[0].clone(),
            segs[1].clone(),
            segs[2].clone(),
            segs[3].clone(),
        ];
        assert!(matches!(
            unseal_bytes(&join(&header, &duplicated), b""),
            Err(Error::Integrity)
        ));

        let dropped_middle = vec![segs[0].clone(), segs[2].clone(), segs[3].clone()];
        assert!(matches!(
            unseal_bytes(&join(&header, &dropped_middle), b""),
            Err(Error::Integrity)
        ));

        let dropped_last = segs[..3].to_vec();
        assert!(matches!(
            unseal_bytes(&join(&header, &dropped_last), b""),
            Err(Error::Integrity)
        ));
    }

    #[test]
    fn dropping_final_full_chunk_is_rejected() {
        let sealed = seal_bytes(&pattern(2 * 4096), b"", SMALL);
        let truncated = &sealed[..HEADER_LEN + SEG];
        assert!(matches!(
            unseal_bytes(truncated, b""),
            Err(Error::Integrity)
        ));
    }

    #[test]
    fn truncation_anywhere_is_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        for len in
            (0..sealed.len())
                .step_by(97)
                .chain([HEADER_LEN, HEADER_LEN + SEG, sealed.len() - 1])
        {
            let err = unseal_bytes(&sealed[..len], b"").unwrap_err();
            if len < 4 {
                assert!(
                    matches!(err, Error::UnsupportedFormat(_)),
                    "len {len}: {err:?}"
                );
            } else {
                assert!(matches!(err, Error::Integrity), "len {len}: {err:?}");
            }
        }
    }

    #[test]
    fn appended_bytes_are_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        for extra in [1usize, 16, 5000] {
            let mut longer = sealed.clone();
            longer.extend(std::iter::repeat_n(0u8, extra));
            assert!(
                matches!(unseal_bytes(&longer, b""), Err(Error::Integrity)),
                "extra {extra}"
            );
        }
    }

    #[test]
    fn header_validation() {
        let good = Header::new(KEY_ID, SALT, SMALL).to_bytes();
        assert_eq!(Header::parse(&good).unwrap().key_id, KEY_ID);
        let mut bad = good;
        bad[0] = b'X';
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        let mut bad = good;
        bad[6] = 30;
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        let mut bad = good;
        bad[7] = 1;
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        assert!(matches!(Header::parse(&good[..30]), Err(Error::Integrity)));
        assert!(matches!(
            Header::parse(b"no"),
            Err(Error::UnsupportedFormat(_))
        ));
    }

    // ---- known-answer vectors (tests/vectors/format-v1.json) ----

    #[derive(serde::Serialize, serde::Deserialize)]
    struct VectorFile {
        description: String,
        dek_hex: String,
        key_id_hex: String,
        salt_hex: String,
        plaintext_rule: String,
        cases: Vec<VectorCase>,
    }

    #[derive(serde::Serialize, serde::Deserialize)]
    struct VectorCase {
        name: String,
        chunk_size_log2: u8,
        plaintext_len: usize,
        context_hex: String,
        sealed_hex: String,
    }

    const VECTOR_CASES: [(&str, u8, usize, &[u8]); 4] = [
        ("empty", 12, 0, b""),
        ("short", 12, 5, b""),
        ("exact-chunk-with-context", 12, 4096, b"users.email:42"),
        ("multi-chunk", 12, 10_000, b""),
    ];

    fn build_vectors() -> VectorFile {
        VectorFile {
            description:
                "aegis-shred sealed object format v1 known-answer vectors. See docs/FORMAT.md."
                    .into(),
            dek_hex: hex::encode(DEK),
            key_id_hex: hex::encode(KEY_ID),
            salt_hex: hex::encode(SALT),
            plaintext_rule: "byte i of the plaintext is (i mod 251)".into(),
            cases: VECTOR_CASES
                .iter()
                .map(|(name, log2, len, ctx)| VectorCase {
                    name: (*name).into(),
                    chunk_size_log2: *log2,
                    plaintext_len: *len,
                    context_hex: hex::encode(ctx),
                    sealed_hex: hex::encode(seal_bytes(&pattern(*len), ctx, *log2)),
                })
                .collect(),
        }
    }

    #[test]
    #[ignore = "run explicitly to regenerate tests/vectors/format-v1.json"]
    fn regenerate_vectors() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/vectors/format-v1.json");
        let json = serde_json::to_string_pretty(&build_vectors()).unwrap();
        std::fs::write(path, json + "\n").unwrap();
    }

    #[test]
    fn matches_known_answer_vectors() {
        let file: VectorFile =
            serde_json::from_str(include_str!("../tests/vectors/format-v1.json")).unwrap();
        assert_eq!(file.cases.len(), VECTOR_CASES.len());
        for case in &file.cases {
            let context = hex::decode(&case.context_hex).unwrap();
            let expected = hex::decode(&case.sealed_hex).unwrap();
            let actual = seal_bytes(&pattern(case.plaintext_len), &context, case.chunk_size_log2);
            assert_eq!(hex::encode(&actual), case.sealed_hex, "case {}", case.name);
            assert_eq!(
                unseal_bytes(&expected, &context).unwrap(),
                pattern(case.plaintext_len)
            );
        }
    }
}
```

- [ ] **Step 3: Wire the module.** In `lib.rs` add `mod format;` and `pub use format::{HEADER_LEN, Header, inspect_header};`.

- [ ] **Step 4: Run the tests to see them fail**

Run: `cargo test -p aegis-shred format::`
Expected: compile errors (`cannot find struct Header`, `cannot find function seal_with`).

- [ ] **Step 5: Add the implementation** above the `#[cfg(test)]` line:

```rust
//! Sealed object format v1. `docs/FORMAT.md` is the normative description.

use std::io::{self, Read, Write};

use aead_stream::{DecryptorBE32, EncryptorBE32};
use aes_gcm::Aes256Gcm;
use aes_gcm::aead::{KeyInit, Payload};

use crate::error::{Error, Result};
use crate::keys::object_key;

pub(crate) const MAGIC: [u8; 4] = *b"AEGS";
pub(crate) const FORMAT_VERSION: u8 = 1;
pub(crate) const ALGORITHM_AES256GCM_HKDF_STREAM: u8 = 1;
/// Length of the fixed header at the start of every sealed object.
pub const HEADER_LEN: usize = 56;
pub(crate) const DEFAULT_CHUNK_SIZE_LOG2: u8 = 16;
const MIN_CHUNK_SIZE_LOG2: u8 = 12;
const MAX_CHUNK_SIZE_LOG2: u8 = 24;
const TAG_LEN: usize = 16;
const NONCE_PREFIX: [u8; 7] = [0u8; 7];

/// The plaintext header of a sealed object. It identifies the data key but not the subject.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Header {
    /// Format version (always 1).
    pub version: u8,
    /// Algorithm id (1 = AES-256-GCM + HKDF-SHA256 + STREAM-BE32).
    pub algorithm: u8,
    /// Plaintext chunk size as a power of two.
    pub chunk_size_log2: u8,
    /// Random id of the subject's data key.
    pub key_id: [u8; 16],
    /// Random per-object salt for the object key derivation.
    pub salt: [u8; 32],
}

impl Header {
    pub(crate) fn new(key_id: [u8; 16], salt: [u8; 32], chunk_size_log2: u8) -> Self {
        Header {
            version: FORMAT_VERSION,
            algorithm: ALGORITHM_AES256GCM_HKDF_STREAM,
            chunk_size_log2,
            key_id,
            salt,
        }
    }

    /// Plaintext bytes per chunk.
    pub fn chunk_size(&self) -> usize {
        1usize << self.chunk_size_log2
    }

    /// Serializes the header to its 56-byte wire form.
    pub fn to_bytes(&self) -> [u8; HEADER_LEN] {
        let mut out = [0u8; HEADER_LEN];
        out[0..4].copy_from_slice(&MAGIC);
        out[4] = self.version;
        out[5] = self.algorithm;
        out[6] = self.chunk_size_log2;
        out[7] = 0;
        out[8..24].copy_from_slice(&self.key_id);
        out[24..56].copy_from_slice(&self.salt);
        out
    }

    /// Parses and validates a header from the start of `bytes`.
    pub fn parse(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 4 || bytes[0..4] != MAGIC {
            return Err(Error::UnsupportedFormat(
                "not an aegis-shred object (bad magic bytes)",
            ));
        }
        if bytes.len() < 5 {
            return Err(Error::Integrity);
        }
        if bytes[4] != FORMAT_VERSION {
            return Err(Error::UnsupportedFormat("unsupported format version"));
        }
        if bytes.len() < HEADER_LEN {
            return Err(Error::Integrity);
        }
        if bytes[5] != ALGORITHM_AES256GCM_HKDF_STREAM {
            return Err(Error::UnsupportedFormat("unsupported algorithm"));
        }
        if !(MIN_CHUNK_SIZE_LOG2..=MAX_CHUNK_SIZE_LOG2).contains(&bytes[6]) {
            return Err(Error::UnsupportedFormat("unsupported chunk size"));
        }
        if bytes[7] != 0 {
            return Err(Error::UnsupportedFormat(
                "reserved header byte must be zero",
            ));
        }
        Ok(Header {
            version: bytes[4],
            algorithm: bytes[5],
            chunk_size_log2: bytes[6],
            key_id: bytes[8..24].try_into().expect("16 bytes"),
            salt: bytes[24..56].try_into().expect("32 bytes"),
        })
    }
}

/// Reads the header of a sealed object without decrypting anything or needing any key.
pub fn inspect_header(sealed: &[u8]) -> Result<Header> {
    Header::parse(sealed)
}

/// Fills `buf` as far as possible; returns fewer bytes than `buf.len()` only at end of input.
fn read_full<R: Read>(reader: &mut R, buf: &mut [u8]) -> io::Result<usize> {
    let mut filled = 0;
    while filled < buf.len() {
        match reader.read(&mut buf[filled..]) {
            Ok(0) => break,
            Ok(n) => filled += n,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        }
    }
    Ok(filled)
}

pub(crate) fn read_header<R: Read>(reader: &mut R) -> Result<Header> {
    let mut buf = [0u8; HEADER_LEN];
    let n = read_full(reader, &mut buf)?;
    Header::parse(&buf[..n])
}

fn aad_for(header: &Header, context: &[u8]) -> Vec<u8> {
    let mut aad = Vec::with_capacity(HEADER_LEN + context.len());
    aad.extend_from_slice(&header.to_bytes());
    aad.extend_from_slice(context);
    aad
}

fn object_cipher(dek: &[u8; 32], header: &Header) -> Aes256Gcm {
    let key = object_key(dek, &header.salt, &header.key_id);
    Aes256Gcm::new_from_slice(&key[..]).expect("object key is 32 bytes")
}

fn too_large() -> Error {
    Error::InvalidArgument("input is too large for format v1 (2^32 chunks)".into())
}

/// Writes `header`, then the STREAM-encrypted chunks of `input`.
pub(crate) fn seal_with<R: Read, W: Write>(
    dek: &[u8; 32],
    header: &Header,
    mut input: R,
    mut output: W,
    context: &[u8],
) -> Result<()> {
    let mut encryptor =
        EncryptorBE32::from_aead(object_cipher(dek, header), (&NONCE_PREFIX).into());
    let aad = aad_for(header, context);
    output.write_all(&header.to_bytes())?;

    let chunk_size = header.chunk_size();
    let mut current = vec![0u8; chunk_size];
    let mut next = vec![0u8; chunk_size];
    let mut filled = read_full(&mut input, &mut current)?;
    loop {
        let more = if filled == chunk_size {
            read_full(&mut input, &mut next)?
        } else {
            0
        };
        if more == 0 {
            let ciphertext = encryptor
                .encrypt_last(Payload {
                    msg: &current[..filled],
                    aad: &aad,
                })
                .map_err(|_| too_large())?;
            output.write_all(&ciphertext)?;
            break;
        }
        let ciphertext = encryptor
            .encrypt_next(Payload {
                msg: &current[..],
                aad: &aad,
            })
            .map_err(|_| too_large())?;
        output.write_all(&ciphertext)?;
        std::mem::swap(&mut current, &mut next);
        filled = more;
    }
    output.flush()?;
    Ok(())
}

/// Decrypts the chunks that follow an already-parsed `header`.
///
/// On error, `output` may already hold plaintext from earlier chunks that authenticated
/// individually; callers must discard it.
pub(crate) fn unseal_with<R: Read, W: Write>(
    dek: &[u8; 32],
    header: &Header,
    mut input: R,
    mut output: W,
    context: &[u8],
) -> Result<()> {
    let mut decryptor =
        DecryptorBE32::from_aead(object_cipher(dek, header), (&NONCE_PREFIX).into());
    let aad = aad_for(header, context);

    let segment = header.chunk_size() + TAG_LEN;
    let mut current = vec![0u8; segment];
    let mut next = vec![0u8; segment];
    let mut filled = read_full(&mut input, &mut current)?;
    loop {
        let more = if filled == segment {
            read_full(&mut input, &mut next)?
        } else {
            0
        };
        if more == 0 {
            if filled < TAG_LEN {
                return Err(Error::Integrity);
            }
            let plaintext = decryptor
                .decrypt_last(Payload {
                    msg: &current[..filled],
                    aad: &aad,
                })
                .map_err(|_| Error::Integrity)?;
            output.write_all(&plaintext)?;
            break;
        }
        let plaintext = decryptor
            .decrypt_next(Payload {
                msg: &current[..],
                aad: &aad,
            })
            .map_err(|_| Error::Integrity)?;
        output.write_all(&plaintext)?;
        std::mem::swap(&mut current, &mut next);
        filled = more;
    }
    output.flush()?;
    Ok(())
}
```

- [ ] **Step 6: Generate the known-answer vectors and check they match the planning run**

```bash
cargo test -p aegis-shred regenerate_vectors -- --ignored
shasum -a 256 crates/aegis-shred/tests/vectors/format-v1.json
```

Expected SHA-256: `a6ceceba47ed0dc6279af6b4b83a928a40f459e4760f572494fed21d1b4c54ce`. The encryption is deterministic for fixed keys and salts, so a different hash means the format code differs from the plan: stop and compare. Spot check: the `empty` case is 72 bytes and starts `4145475301010c00` + `22`×16 + `33`×32.

- [ ] **Step 7: Run the format tests**

Run: `cargo test -p aegis-shred format::`
Expected: `ok. 12 passed; 0 failed; 1 ignored`.

- [ ] **Step 8: Write `docs/FORMAT.md`**

````markdown
# aegis-shred formats (v1)

This document is normative: an independent implementation that follows it must interoperate
with aegis-shred. `python/tests/test_reference_format.py` is such an implementation, written
against this document using only the Python `cryptography` package, and it runs in CI.

All integers are big-endian unless stated otherwise. `||` is concatenation.

## 1. Primitives

| Use | Primitive |
|---|---|
| Authenticated encryption | AES-256-GCM, 96-bit nonce, 128-bit tag |
| Large-object segmentation | STREAM (Hoang, Reyhanitabar, Rogaway, Vizár 2015), "BE32" variant |
| Per-object key derivation | HKDF-SHA256 (RFC 5869) |
| Subject pseudonyms | HMAC-SHA256 |
| Passphrase stretching | Argon2id v1.3 (RFC 9106) |
| Audit chain | SHA-256 |

## 2. Keys

| Name | Size | Origin |
|---|---|---|
| KEK (master key) | 32 B | Raw key bytes, or `Argon2id(passphrase, kdf_salt, m, t, p)` with output length 32 |
| Index key | 32 B | Random, created with the keystore |
| DEK (data key), one per subject | 32 B | Random, created on the subject's first seal |
| `key_id`, one per DEK | 16 B | Random |
| Object key, one per sealed object | 32 B | `HKDF-SHA256(salt = object_salt, ikm = DEK, info = "aegis-shred/v1/object" \|\| key_id, L = 32)` |

`subject_hash = HMAC-SHA256(key = index_key, message = UTF-8(subject_id))`.
Subject ids are 1 to 256 bytes of UTF-8.

### 2.1 Key wrapping

`wrap(KEK, plaintext, aad) = nonce || AES-256-GCM-Encrypt(KEK, nonce, plaintext, aad)`, where
`nonce` is 12 random bytes and the GCM output is ciphertext followed by the 16-byte tag.

| Wrapped value | Plaintext | AAD |
|---|---|---|
| `kek_check` | ASCII `aegis-shred kek check` | ASCII `aegis-shred/v1/kek-check` |
| `wrapped_index_key` | index key | ASCII `aegis-shred/v1/index-key` |
| `wrapped_dek` | DEK | ASCII `aegis-shred/v1/dek` \|\| key_id \|\| subject_hash |

A KEK is correct for a keystore if and only if `kek_check` unwraps.

## 3. Sealed object

```
sealed object = header (56 bytes) || segment_0 || segment_1 || ... || segment_n
```

### 3.1 Header

| Offset | Size | Field | Value |
|---|---|---|---|
| 0 | 4 | magic | ASCII `AEGS` (`41 45 47 53`) |
| 4 | 1 | version | `0x01` |
| 5 | 1 | algorithm | `0x01` = AES-256-GCM + HKDF-SHA256 + STREAM-BE32 |
| 6 | 1 | chunk_size_log2 | 12 to 24 inclusive; writers use 16 (64 KiB) |
| 7 | 1 | reserved | `0x00` |
| 8 | 16 | key_id | id of the subject's DEK |
| 24 | 32 | object_salt | random |

Readers reject a header whose magic, version, algorithm, chunk size, or reserved byte is not
listed above ("unsupported format"), and treat a header shorter than 56 bytes that has valid
magic and version as an integrity failure.

### 3.2 Segments

Let `C = 2^chunk_size_log2`. The plaintext is split into chunks: every chunk except the last
holds exactly `C` bytes; the last holds 0 to `C` bytes and is empty only when the whole
plaintext is empty. There is always exactly one last chunk.

Segment `i` = `AES-256-GCM-Encrypt(object_key, nonce_i, chunk_i, aad)` (ciphertext || tag), with

```
nonce_i = 0x00 * 7  ||  u32(i)  ||  last_flag        (12 bytes)
last_flag = 0x01 for the final segment, 0x00 otherwise
aad = header (all 56 bytes) || context
```

`context` is an optional byte string chosen by the caller (for example `users.email:42`). It is
not stored; the same value must be supplied to unseal. The all-zero nonce prefix is safe because
every object has its own key.

Non-final segments are exactly `C + 16` bytes. The final segment is 16 to `C + 16` bytes.

### 3.3 Reading

1. Parse and validate the header.
2. Look up the DEK by `key_id`; derive the object key.
3. Read `C + 16` bytes at a time. A full segment followed by more data is a non-final segment;
   a segment followed by end of input is the final segment. A final segment shorter than 16
   bytes is an integrity failure.
4. Decrypt each segment with its counter and flag. Any failure is an integrity failure.

This rejects modified bytes, a modified header, reordered, duplicated, or removed segments,
truncation at any point (including at a segment boundary, because the new last segment was not
encrypted with `last_flag = 1`), appended bytes, and a wrong context.

Streaming readers may emit plaintext of earlier segments before a later segment fails; callers
must discard all output when unsealing fails. The library's file API writes to a temporary file
and renames it only on success.

### 3.4 Size

Overhead is `56 + 16 × number_of_segments` bytes: 72 bytes for any input up to 64 KiB.
The 32-bit counter limits one object to 2^32 segments (256 TiB at 64 KiB chunks).

### 3.5 Test vectors

`crates/aegis-shred/tests/vectors/format-v1.json` lists objects sealed with a fixed DEK
(`11` × 32), key_id (`22` × 16), object salt (`33` × 32) and `chunk_size_log2 = 12`, where
plaintext byte `i` is `i mod 251`. Cases: empty, 5 bytes, exactly one chunk with context
`users.email:42`, and 10,000 bytes (three segments).

## 4. Keystore (SQLite, schema version 1)

```sql
CREATE TABLE meta         (name TEXT PRIMARY KEY, value BLOB NOT NULL);
CREATE TABLE subject_keys (subject_hash BLOB PRIMARY KEY, key_id BLOB NOT NULL UNIQUE,
                           wrapped_dek BLOB NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE tombstones   (key_id BLOB PRIMARY KEY, shredded_at INTEGER NOT NULL);
CREATE TABLE audit        (seq INTEGER PRIMARY KEY, ts INTEGER NOT NULL, event TEXT NOT NULL,
                           subject_hash BLOB, key_id BLOB, detail TEXT,
                           prev_hash BLOB NOT NULL, hash BLOB NOT NULL);
```

`meta` rows:

| name | value |
|---|---|
| `schema_version` | ASCII `1` |
| `created_at` | i64 unix seconds |
| `kek_kind` | ASCII `raw` or `passphrase` |
| `kdf_salt` | 16 random bytes (used only for passphrases) |
| `kdf_params` | `u32(m_kib) \|\| u32(t) \|\| u32(p)`; default 65536, 3, 1 |
| `kek_check` | §2.1 |
| `wrapped_index_key` | §2.1 |

Connections use `PRAGMA secure_delete = ON` and `journal_mode = DELETE`. Times are unix seconds.
No table holds a raw subject id.

## 5. Audit chain

```
hash_n = SHA-256( prev_hash || u64(seq) || i64(ts) || lp(event) || lp(subject_hash) || lp(key_id) || lp(detail) )
lp(x)  = u32(len(x)) || x        (an absent field is encoded as length 0)
```

The first entry has `seq = 1` and `prev_hash` = 32 zero bytes. Each later entry's `prev_hash`
is the previous entry's `hash`, and `seq` increases by one.

Events: `keystore.created`, `key.created`, `key.shredded`, `kek.rotated`,
`tombstones.imported`, and (only when data-access auditing is enabled) `data.sealed`,
`data.unsealed`.

## 6. Shred journal

JSON Lines, one tombstone per line:

```json
{"key_id": "<32 lowercase hex characters>", "shredded_at": 1790000000}
```

Importing a journal inserts missing tombstones and deletes any `subject_keys` row whose
`key_id` appears in it.
````

- [ ] **Step 9: Commit**

```bash
git add crates/aegis-shred/src/format.rs crates/aegis-shred/src/lib.rs crates/aegis-shred/tests/vectors docs/FORMAT.md
git commit -m "Add sealed object format v1 with test vectors and specification"
```

---

### Task 5: Audit chain

**Files:**
- Create: `crates/aegis-shred/src/audit.rs`
- Modify: `crates/aegis-shred/src/lib.rs`

**Interfaces:**
- Produces: `pub struct AuditEntry { seq: i64, ts: i64, event: String, subject_hash: Option<Vec<u8>>, key_id: Option<Vec<u8>>, detail: Option<String>, prev_hash: Vec<u8>, hash: Vec<u8> }`; `pub struct AuditReport { ok: bool, entries: u64, head: [u8; 32], first_bad_seq: Option<i64> }`; `pub(crate) GENESIS_HASH`, `entry_hash(prev, seq, ts, event, subject_hash, key_id, detail) -> [u8; 32]`, `verify_chain(&[AuditEntry]) -> AuditReport`; event name constants `EVENT_KEYSTORE_CREATED`, `EVENT_KEY_CREATED`, `EVENT_KEY_SHREDDED`, `EVENT_KEK_ROTATED`, `EVENT_TOMBSTONES_IMPORTED`, `EVENT_DATA_SEALED`, `EVENT_DATA_UNSEALED`.

- [ ] **Step 1: Write the failing tests** at the bottom of a new `crates/aegis-shred/src/audit.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn chain(n: i64) -> Vec<AuditEntry> {
        let mut prev = GENESIS_HASH.to_vec();
        (1..=n)
            .map(|seq| {
                let detail = format!("{{\"n\":{seq}}}");
                let hash = entry_hash(
                    &prev,
                    seq,
                    1000 + seq,
                    "key.created",
                    Some(&[seq as u8; 32]),
                    None,
                    Some(&detail),
                );
                let entry = AuditEntry {
                    seq,
                    ts: 1000 + seq,
                    event: "key.created".into(),
                    subject_hash: Some(vec![seq as u8; 32]),
                    key_id: None,
                    detail: Some(detail),
                    prev_hash: prev.clone(),
                    hash: hash.to_vec(),
                };
                prev = hash.to_vec();
                entry
            })
            .collect()
    }

    #[test]
    fn intact_chain_verifies() {
        let entries = chain(3);
        let report = verify_chain(&entries);
        assert!(report.ok);
        assert_eq!(report.entries, 3);
        assert_eq!(report.head.to_vec(), entries[2].hash);
        assert_eq!(report.first_bad_seq, None);
    }

    #[test]
    fn empty_chain_is_ok() {
        let report = verify_chain(&[]);
        assert!(report.ok);
        assert_eq!(report.head, GENESIS_HASH);
    }

    #[test]
    fn edited_entry_is_detected() {
        let mut entries = chain(3);
        entries[1].detail = Some("{\"n\":99}".into());
        let report = verify_chain(&entries);
        assert!(!report.ok);
        assert_eq!(report.first_bad_seq, Some(2));
        assert_eq!(report.entries, 1);
    }

    #[test]
    fn deleted_middle_entry_is_detected() {
        let mut entries = chain(3);
        entries.remove(1);
        assert_eq!(verify_chain(&entries).first_bad_seq, Some(3));
    }

    #[test]
    fn rehashed_edit_breaks_the_next_link() {
        let mut entries = chain(3);
        entries[1].detail = Some("{\"n\":99}".into());
        entries[1].hash = entry_hash(
            &entries[1].prev_hash,
            2,
            entries[1].ts,
            "key.created",
            entries[1].subject_hash.as_deref(),
            None,
            entries[1].detail.as_deref(),
        )
        .to_vec();
        assert_eq!(verify_chain(&entries).first_bad_seq, Some(3));
    }
}
```

- [ ] **Step 2: Wire the module.** In `lib.rs` add `mod audit;` and `pub use audit::{AuditEntry, AuditReport};`.

- [ ] **Step 3: Run to see failure.** `cargo test -p aegis-shred audit::` → compile errors (`cannot find function entry_hash`).

- [ ] **Step 4: Add the implementation** above `#[cfg(test)]`:

```rust
//! Hash-chained audit log: entry hashing and chain verification.

use sha2::{Digest, Sha256};

pub(crate) const GENESIS_HASH: [u8; 32] = [0u8; 32];

pub(crate) const EVENT_KEYSTORE_CREATED: &str = "keystore.created";
pub(crate) const EVENT_KEY_CREATED: &str = "key.created";
pub(crate) const EVENT_KEY_SHREDDED: &str = "key.shredded";
pub(crate) const EVENT_KEK_ROTATED: &str = "kek.rotated";
pub(crate) const EVENT_TOMBSTONES_IMPORTED: &str = "tombstones.imported";
pub(crate) const EVENT_DATA_SEALED: &str = "data.sealed";
pub(crate) const EVENT_DATA_UNSEALED: &str = "data.unsealed";

/// One audit log entry. Subjects appear only as keyed hashes, never as raw ids.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEntry {
    /// Position in the chain, starting at 1.
    pub seq: i64,
    /// Unix time (seconds).
    pub ts: i64,
    /// Event name, e.g. `key.shredded`.
    pub event: String,
    /// `HMAC-SHA256(index_key, subject_id)`, when the event concerns one subject.
    pub subject_hash: Option<Vec<u8>>,
    /// Data key id, when the event concerns one key.
    pub key_id: Option<Vec<u8>>,
    /// Small JSON detail, e.g. counts.
    pub detail: Option<String>,
    /// Hash of the previous entry (32 zero bytes for the first).
    pub prev_hash: Vec<u8>,
    /// Hash of this entry.
    pub hash: Vec<u8>,
}

/// Outcome of [`crate::Vault::verify_audit`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditReport {
    /// True when every entry links correctly.
    pub ok: bool,
    /// Number of entries verified before the first problem (all of them when `ok`).
    pub entries: u64,
    /// Hash of the last verified entry.
    pub head: [u8; 32],
    /// Sequence number of the first entry that failed verification.
    pub first_bad_seq: Option<i64>,
}

fn length_prefixed(hasher: &mut Sha256, field: Option<&[u8]>) {
    let bytes = field.unwrap_or(&[]);
    hasher.update((bytes.len() as u32).to_be_bytes());
    hasher.update(bytes);
}

/// `SHA-256(prev_hash || u64be(seq) || i64be(ts) || lp(event) || lp(subject_hash) || lp(key_id) || lp(detail))`.
pub(crate) fn entry_hash(
    prev_hash: &[u8],
    seq: i64,
    ts: i64,
    event: &str,
    subject_hash: Option<&[u8]>,
    key_id: Option<&[u8]>,
    detail: Option<&str>,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update((seq as u64).to_be_bytes());
    hasher.update(ts.to_be_bytes());
    length_prefixed(&mut hasher, Some(event.as_bytes()));
    length_prefixed(&mut hasher, subject_hash);
    length_prefixed(&mut hasher, key_id);
    length_prefixed(&mut hasher, detail.map(str::as_bytes));
    hasher.finalize().into()
}

/// Checks sequence numbers, back-links, and hashes from the first entry onward.
pub(crate) fn verify_chain(entries: &[AuditEntry]) -> AuditReport {
    let mut prev = GENESIS_HASH;
    for (index, entry) in entries.iter().enumerate() {
        let recomputed = entry_hash(
            &entry.prev_hash,
            entry.seq,
            entry.ts,
            &entry.event,
            entry.subject_hash.as_deref(),
            entry.key_id.as_deref(),
            entry.detail.as_deref(),
        );
        let expected_seq = index as i64 + 1;
        if entry.seq != expected_seq || entry.prev_hash != prev || entry.hash != recomputed {
            return AuditReport {
                ok: false,
                entries: index as u64,
                head: prev,
                first_bad_seq: Some(entry.seq),
            };
        }
        prev = recomputed;
    }
    AuditReport {
        ok: true,
        entries: entries.len() as u64,
        head: prev,
        first_bad_seq: None,
    }
}
```

- [ ] **Step 5: Run.** `cargo test -p aegis-shred audit::` → `ok. 5 passed`.

- [ ] **Step 6: Commit**

```bash
git add crates/aegis-shred/src/audit.rs crates/aegis-shred/src/lib.rs
git commit -m "Add hash-chained audit entries and verification"
```

---

### Task 6: SQLite keystore

**Files:**
- Create: `crates/aegis-shred/src/keystore.rs`
- Modify: `crates/aegis-shred/src/lib.rs`

**Interfaces:**
- Consumes: `audit::{entry_hash, GENESIS_HASH, AuditEntry}`.
- Produces: `pub enum KeyStatus { Present, Shredded { at: i64 }, Unknown }`; `pub fn key_status(impl AsRef<Path>, &[u8; 16]) -> Result<KeyStatus>`; `pub(crate)`: `SCHEMA_VERSION`, `SCHEMA`, `StoredKey { subject_hash: [u8; 32], key_id: [u8; 16], wrapped_dek: Vec<u8> }`, `now() -> i64`, `create_connection(&Path)`, `open_connection(&Path)`, `table_count`, `meta_get`, `meta_require`, `meta_put`, `key_by_subject`, `key_by_id`, `insert_key`, `all_keys`, `update_wrapped_dek`, `delete_key`, `delete_key_by_id -> usize`, `tombstone_at -> Option<i64>`, `insert_tombstone -> bool`, `all_tombstones`, `audit_append -> i64`, `audit_head -> (i64, [u8; 32])`, `audit_entries -> Vec<AuditEntry>`. All functions take `&Connection` (a `Transaction` derefs to it).

- [ ] **Step 1: Write the failing tests** at the bottom of a new `crates/aegis-shred/src/keystore.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA).unwrap();
        conn
    }

    #[test]
    fn keys_round_trip_and_delete() {
        let conn = store();
        let key = StoredKey {
            subject_hash: [1; 32],
            key_id: [2; 16],
            wrapped_dek: vec![3; 60],
        };
        insert_key(&conn, &key, 10).unwrap();
        assert_eq!(
            key_by_subject(&conn, &[1; 32]).unwrap().unwrap().key_id,
            [2; 16]
        );
        assert_eq!(
            key_by_id(&conn, &[2; 16]).unwrap().unwrap().subject_hash,
            [1; 32]
        );
        assert_eq!(all_keys(&conn).unwrap().len(), 1);
        update_wrapped_dek(&conn, &[1; 32], &[9; 60]).unwrap();
        assert_eq!(
            key_by_id(&conn, &[2; 16]).unwrap().unwrap().wrapped_dek,
            vec![9; 60]
        );
        delete_key(&conn, &[1; 32]).unwrap();
        assert!(key_by_subject(&conn, &[1; 32]).unwrap().is_none());
    }

    #[test]
    fn tombstones_are_idempotent() {
        let conn = store();
        assert!(insert_tombstone(&conn, &[5; 16], 100).unwrap());
        assert!(!insert_tombstone(&conn, &[5; 16], 200).unwrap());
        assert_eq!(tombstone_at(&conn, &[5; 16]).unwrap(), Some(100));
        assert_eq!(all_tombstones(&conn).unwrap(), vec![([5; 16], 100)]);
    }

    #[test]
    fn audit_append_links_entries() {
        let conn = store();
        assert_eq!(audit_head(&conn).unwrap(), (0, audit::GENESIS_HASH));
        assert_eq!(audit_append(&conn, 1, "a", None, None, None).unwrap(), 1);
        assert_eq!(
            audit_append(&conn, 2, "b", Some(&[1; 32]), Some(&[2; 16]), Some("{}")).unwrap(),
            2
        );
        let entries = audit_entries(&conn).unwrap();
        assert_eq!(entries[1].prev_hash, entries[0].hash);
        assert!(audit::verify_chain(&entries).ok);
    }

    #[test]
    fn meta_upserts() {
        let conn = store();
        assert!(meta_get(&conn, "x").unwrap().is_none());
        meta_put(&conn, "x", b"1").unwrap();
        meta_put(&conn, "x", b"2").unwrap();
        assert_eq!(meta_require(&conn, "x").unwrap(), b"2");
        assert!(meta_require(&conn, "missing").is_err());
    }
}
```

- [ ] **Step 2: Wire the module.** In `lib.rs` add `mod keystore;` and `pub use keystore::{KeyStatus, key_status};`.

- [ ] **Step 3: Run to see failure.** `cargo test -p aegis-shred keystore::` → compile errors (`cannot find value SCHEMA`).

- [ ] **Step 4: Add the implementation** above `#[cfg(test)]`. `create_connection` refuses a missing parent directory (Review Focus 2):

```rust
//! SQLite storage for wrapped keys, tombstones, metadata, and the audit log.
//!
//! This module only stores bytes; wrapping and unwrapping live in `keys`, orchestration in `vault`.

use std::io;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OpenFlags, OptionalExtension, params};

use crate::audit::{self, AuditEntry};
use crate::error::{Error, Result};

pub(crate) const SCHEMA_VERSION: &[u8] = b"1";

pub(crate) const SCHEMA: &str = "
CREATE TABLE meta (
  name  TEXT PRIMARY KEY,
  value BLOB NOT NULL
);
CREATE TABLE subject_keys (
  subject_hash BLOB PRIMARY KEY,
  key_id       BLOB NOT NULL UNIQUE,
  wrapped_dek  BLOB NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE TABLE tombstones (
  key_id      BLOB PRIMARY KEY,
  shredded_at INTEGER NOT NULL
);
CREATE TABLE audit (
  seq          INTEGER PRIMARY KEY,
  ts           INTEGER NOT NULL,
  event        TEXT NOT NULL,
  subject_hash BLOB,
  key_id       BLOB,
  detail       TEXT,
  prev_hash    BLOB NOT NULL,
  hash         BLOB NOT NULL
);";

/// Whether a data key is present, shredded, or unknown in a keystore.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyStatus {
    /// The key exists; objects sealed with it can be unsealed.
    Present,
    /// The key was shredded.
    Shredded {
        /// Unix time (seconds) of the shred.
        at: i64,
    },
    /// This keystore has never held the key.
    Unknown,
}

/// A wrapped data key as stored on disk.
pub(crate) struct StoredKey {
    pub subject_hash: [u8; 32],
    pub key_id: [u8; 16],
    pub wrapped_dek: Vec<u8>,
}

pub(crate) fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn configure(conn: &Connection) -> Result<()> {
    conn.busy_timeout(Duration::from_secs(5))?;
    conn.pragma_update(None, "secure_delete", "ON")?;
    let _mode: String =
        conn.pragma_update_and_check(None, "journal_mode", "DELETE", |row| row.get(0))?;
    Ok(())
}

/// Opens (creating the file if needed) a connection for a keystore that may not be initialized yet.
pub(crate) fn create_connection(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "the keystore's directory does not exist",
            )
            .into());
        }
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    configure(&conn)?;
    Ok(conn)
}

/// Opens an existing keystore file read-write.
pub(crate) fn open_connection(path: &Path) -> Result<Connection> {
    if !path.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "keystore file not found").into());
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    configure(&conn)?;
    Ok(conn)
}

pub(crate) fn table_count(conn: &Connection) -> Result<i64> {
    Ok(conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type = 'table'",
        [],
        |r| r.get(0),
    )?)
}

pub(crate) fn meta_get(conn: &Connection, name: &str) -> Result<Option<Vec<u8>>> {
    Ok(conn
        .query_row("SELECT value FROM meta WHERE name = ?1", [name], |r| {
            r.get(0)
        })
        .optional()?)
}

pub(crate) fn meta_require(conn: &Connection, name: &str) -> Result<Vec<u8>> {
    meta_get(conn, name)?
        .ok_or_else(|| Error::Keystore(format!("corrupt keystore: missing {name}")))
}

pub(crate) fn meta_put(conn: &Connection, name: &str, value: &[u8]) -> Result<()> {
    conn.execute(
        "INSERT INTO meta (name, value) VALUES (?1, ?2)
         ON CONFLICT(name) DO UPDATE SET value = excluded.value",
        params![name, value],
    )?;
    Ok(())
}

fn to_array<const N: usize>(bytes: Vec<u8>) -> Result<[u8; N]> {
    bytes
        .try_into()
        .map_err(|_| Error::Keystore("corrupt keystore: field has the wrong length".into()))
}

pub(crate) fn key_by_subject(
    conn: &Connection,
    subject_hash: &[u8; 32],
) -> Result<Option<StoredKey>> {
    let row: Option<(Vec<u8>, Vec<u8>)> = conn
        .query_row(
            "SELECT key_id, wrapped_dek FROM subject_keys WHERE subject_hash = ?1",
            [&subject_hash[..]],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    row.map(|(key_id, wrapped_dek)| {
        Ok(StoredKey {
            subject_hash: *subject_hash,
            key_id: to_array(key_id)?,
            wrapped_dek,
        })
    })
    .transpose()
}

pub(crate) fn key_by_id(conn: &Connection, key_id: &[u8; 16]) -> Result<Option<StoredKey>> {
    let row: Option<(Vec<u8>, Vec<u8>)> = conn
        .query_row(
            "SELECT subject_hash, wrapped_dek FROM subject_keys WHERE key_id = ?1",
            [&key_id[..]],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    row.map(|(subject_hash, wrapped_dek)| {
        Ok(StoredKey {
            subject_hash: to_array(subject_hash)?,
            key_id: *key_id,
            wrapped_dek,
        })
    })
    .transpose()
}

pub(crate) fn insert_key(conn: &Connection, key: &StoredKey, created_at: i64) -> Result<()> {
    conn.execute(
        "INSERT INTO subject_keys (subject_hash, key_id, wrapped_dek, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![&key.subject_hash[..], &key.key_id[..], key.wrapped_dek, created_at],
    )?;
    Ok(())
}

pub(crate) fn all_keys(conn: &Connection) -> Result<Vec<StoredKey>> {
    let mut stmt = conn.prepare("SELECT subject_hash, key_id, wrapped_dek FROM subject_keys")?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, Vec<u8>>(0)?,
            r.get::<_, Vec<u8>>(1)?,
            r.get::<_, Vec<u8>>(2)?,
        ))
    })?;
    let mut keys = Vec::new();
    for row in rows {
        let (subject_hash, key_id, wrapped_dek) = row?;
        keys.push(StoredKey {
            subject_hash: to_array(subject_hash)?,
            key_id: to_array(key_id)?,
            wrapped_dek,
        });
    }
    Ok(keys)
}

pub(crate) fn update_wrapped_dek(
    conn: &Connection,
    subject_hash: &[u8; 32],
    wrapped_dek: &[u8],
) -> Result<()> {
    conn.execute(
        "UPDATE subject_keys SET wrapped_dek = ?1 WHERE subject_hash = ?2",
        params![wrapped_dek, &subject_hash[..]],
    )?;
    Ok(())
}

pub(crate) fn delete_key(conn: &Connection, subject_hash: &[u8; 32]) -> Result<()> {
    conn.execute(
        "DELETE FROM subject_keys WHERE subject_hash = ?1",
        [&subject_hash[..]],
    )?;
    Ok(())
}

pub(crate) fn delete_key_by_id(conn: &Connection, key_id: &[u8; 16]) -> Result<usize> {
    Ok(conn.execute("DELETE FROM subject_keys WHERE key_id = ?1", [&key_id[..]])?)
}

pub(crate) fn tombstone_at(conn: &Connection, key_id: &[u8; 16]) -> Result<Option<i64>> {
    Ok(conn
        .query_row(
            "SELECT shredded_at FROM tombstones WHERE key_id = ?1",
            [&key_id[..]],
            |r| r.get(0),
        )
        .optional()?)
}

/// Returns true when the tombstone was new.
pub(crate) fn insert_tombstone(conn: &Connection, key_id: &[u8; 16], at: i64) -> Result<bool> {
    let changed = conn.execute(
        "INSERT OR IGNORE INTO tombstones (key_id, shredded_at) VALUES (?1, ?2)",
        params![&key_id[..], at],
    )?;
    Ok(changed == 1)
}

pub(crate) fn all_tombstones(conn: &Connection) -> Result<Vec<([u8; 16], i64)>> {
    let mut stmt =
        conn.prepare("SELECT key_id, shredded_at FROM tombstones ORDER BY shredded_at, key_id")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, Vec<u8>>(0)?, r.get::<_, i64>(1)?)))?;
    let mut out = Vec::new();
    for row in rows {
        let (key_id, at) = row?;
        out.push((to_array(key_id)?, at));
    }
    Ok(out)
}

/// Appends an audit entry linked to the current head; returns its sequence number.
pub(crate) fn audit_append(
    conn: &Connection,
    ts: i64,
    event: &str,
    subject_hash: Option<&[u8]>,
    key_id: Option<&[u8]>,
    detail: Option<&str>,
) -> Result<i64> {
    let (head_seq, head_hash) = audit_head(conn)?;
    let seq = head_seq + 1;
    let hash = audit::entry_hash(&head_hash, seq, ts, event, subject_hash, key_id, detail);
    conn.execute(
        "INSERT INTO audit (seq, ts, event, subject_hash, key_id, detail, prev_hash, hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            seq,
            ts,
            event,
            subject_hash,
            key_id,
            detail,
            &head_hash[..],
            &hash[..]
        ],
    )?;
    Ok(seq)
}

/// `(seq, hash)` of the newest audit entry, or `(0, zeros)` when the log is empty.
pub(crate) fn audit_head(conn: &Connection) -> Result<(i64, [u8; 32])> {
    let row: Option<(i64, Vec<u8>)> = conn
        .query_row(
            "SELECT seq, hash FROM audit ORDER BY seq DESC LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    match row {
        Some((seq, hash)) => Ok((seq, to_array(hash)?)),
        None => Ok((0, audit::GENESIS_HASH)),
    }
}

pub(crate) fn audit_entries(conn: &Connection) -> Result<Vec<AuditEntry>> {
    let mut stmt = conn.prepare(
        "SELECT seq, ts, event, subject_hash, key_id, detail, prev_hash, hash FROM audit ORDER BY seq",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(AuditEntry {
            seq: r.get(0)?,
            ts: r.get(1)?,
            event: r.get(2)?,
            subject_hash: r.get(3)?,
            key_id: r.get(4)?,
            detail: r.get(5)?,
            prev_hash: r.get(6)?,
            hash: r.get(7)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Reports whether `key_id` is present, shredded, or unknown, without needing the master key.
pub fn key_status(keystore: impl AsRef<Path>, key_id: &[u8; 16]) -> Result<KeyStatus> {
    let path = keystore.as_ref();
    if !path.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "keystore file not found").into());
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(Duration::from_secs(5))?;
    if key_by_id(&conn, key_id)?.is_some() {
        return Ok(KeyStatus::Present);
    }
    Ok(match tombstone_at(&conn, key_id)? {
        Some(at) => KeyStatus::Shredded { at },
        None => KeyStatus::Unknown,
    })
}
```

- [ ] **Step 5: Run.** `cargo test -p aegis-shred keystore::` → `ok. 4 passed`.

- [ ] **Step 6: Commit**

```bash
git add crates/aegis-shred/src/keystore.rs crates/aegis-shred/src/lib.rs
git commit -m "Add the SQLite keystore"
```

---

### Task 7: `Vault` public API

**Files:**
- Create: `crates/aegis-shred/src/vault.rs`, `crates/aegis-shred/tests/vault.rs`, `crates/aegis-shred/tests/fork.rs`
- Replace: `crates/aegis-shred/src/lib.rs` (final version)

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces (`pub`): `Vault::{open, create, open_or_create}(impl AsRef<Path>, &MasterKey) -> Result<Vault>`; `set_audit_data_access(&mut self, bool)`; `seal(&self, subject: &str, plaintext: &[u8], context: &[u8]) -> Result<Vec<u8>>`; `unseal(&self, sealed: &[u8], context: &[u8]) -> Result<Vec<u8>>`; `seal_stream<R: Read, W: Write>(&self, subject, R, W, context) -> Result<()>`; `unseal_stream<R, W>(&self, R, W, context) -> Result<()>`; `seal_file(&self, subject, source, destination, context) -> Result<()>`; `unseal_file(&self, source, destination, context) -> Result<()>`; `has_key(&self, &str) -> Result<bool>`; `shred(&self, &str) -> Result<Option<ShredReceipt>>`; `audit_entries(&self) -> Result<Vec<AuditEntry>>`; `verify_audit(&self) -> Result<AuditReport>`; `audit_head(&self) -> Result<(i64, [u8; 32])>`; `rotate_master_key(&self, &MasterKey) -> Result<()>`; `export_tombstones(&self, path) -> Result<u64>`; `import_tombstones(&self, path) -> Result<u64>`; `pub struct ShredReceipt { subject_hash: [u8; 32], key_id: [u8; 16], shredded_at: i64, audit_seq: i64 }`. `Vault: Send + Sync`.

- [ ] **Step 1: Write the failing integration tests** in `crates/aegis-shred/tests/vault.rs` (the last three tests cover Review Focus 2, 3 and 4):

```rust
use std::path::{Path, PathBuf};
use std::sync::Arc;

use aegis_shred::{Error, KeyStatus, MasterKey, Vault, inspect_header, key_status};
use tempfile::TempDir;

fn keystore_path(dir: &TempDir) -> PathBuf {
    dir.path().join("keys.db")
}

fn new_vault() -> (TempDir, Vault, MasterKey) {
    let dir = TempDir::new().unwrap();
    let key = MasterKey::generate();
    let vault = Vault::create(keystore_path(&dir), &key).unwrap();
    (dir, vault, key)
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}

fn raw_db(path: &Path) -> rusqlite::Connection {
    rusqlite::Connection::open(path).unwrap()
}

#[test]
fn seal_unseal_round_trip_without_leaking_subject() {
    let (_dir, vault, _) = new_vault();
    let sealed = vault
        .seal("user-42", b"alice@example.com", b"users.email")
        .unwrap();
    assert_eq!(
        vault.unseal(&sealed, b"users.email").unwrap(),
        b"alice@example.com"
    );
    assert!(!contains(&sealed, b"user-42"));
    assert!(!contains(&sealed, b"alice"));
}

#[test]
fn one_key_per_subject() {
    let (_dir, vault, _) = new_vault();
    let a1 = inspect_header(&vault.seal("user-1", b"x", b"").unwrap()).unwrap();
    let a2 = inspect_header(&vault.seal("user-1", b"y", b"").unwrap()).unwrap();
    let b = inspect_header(&vault.seal("user-2", b"z", b"").unwrap()).unwrap();
    assert_eq!(a1.key_id, a2.key_id);
    assert_ne!(a1.salt, a2.salt);
    assert_ne!(a1.key_id, b.key_id);
}

#[test]
fn shred_makes_every_object_of_the_subject_unreadable() {
    let (_dir, vault, _) = new_vault();
    let first = vault.seal("user-42", b"one", b"").unwrap();
    let second = vault.seal("user-42", b"two", b"").unwrap();
    let other = vault.seal("user-7", b"keep", b"").unwrap();

    let receipt = vault.shred("user-42").unwrap().expect("subject had a key");
    assert_eq!(receipt.key_id, inspect_header(&first).unwrap().key_id);
    for sealed in [&first, &second] {
        match vault.unseal(sealed, b"") {
            Err(Error::Shredded { shredded_at }) => assert_eq!(shredded_at, receipt.shredded_at),
            other => panic!("expected Shredded, got {other:?}"),
        }
    }
    assert_eq!(vault.unseal(&other, b"").unwrap(), b"keep");
    assert!(!vault.has_key("user-42").unwrap());
    assert!(vault.shred("user-42").unwrap().is_none());

    // The same person signing up again gets a fresh key; old data stays dead.
    let fresh = vault.seal("user-42", b"new", b"").unwrap();
    assert_ne!(inspect_header(&fresh).unwrap().key_id, receipt.key_id);
    assert_eq!(vault.unseal(&fresh, b"").unwrap(), b"new");
    assert!(matches!(
        vault.unseal(&first, b""),
        Err(Error::Shredded { .. })
    ));
}

#[test]
fn shredding_an_unknown_subject_is_a_no_op() {
    let (_dir, vault, _) = new_vault();
    assert!(vault.shred("never-stored").unwrap().is_none());
    assert_eq!(vault.verify_audit().unwrap().entries, 1);
}

#[test]
fn objects_from_another_keystore_are_unknown() {
    let (_d1, vault_a, _) = new_vault();
    let (_d2, vault_b, _) = new_vault();
    let sealed = vault_a.seal("user-1", b"x", b"").unwrap();
    assert!(matches!(
        vault_b.unseal(&sealed, b""),
        Err(Error::UnknownKey)
    ));
}

#[test]
fn wrong_master_key_is_rejected() {
    let (dir, vault, _) = new_vault();
    drop(vault);
    let path = keystore_path(&dir);
    assert!(matches!(
        Vault::open(&path, &MasterKey::generate()),
        Err(Error::WrongMasterKey(_))
    ));
    let pass = MasterKey::from_passphrase("hunter2").unwrap();
    assert!(matches!(
        Vault::open(&path, &pass),
        Err(Error::WrongMasterKey(_))
    ));
}

#[test]
fn passphrase_keystore_reopens() {
    let dir = TempDir::new().unwrap();
    let path = keystore_path(&dir);
    let pass = MasterKey::from_passphrase("correct horse battery staple").unwrap();
    let sealed = Vault::create(&path, &pass)
        .unwrap()
        .seal("user-1", b"hi", b"")
        .unwrap();
    let reopened = Vault::open(
        &path,
        &MasterKey::from_passphrase("correct horse battery staple").unwrap(),
    )
    .unwrap();
    assert_eq!(reopened.unseal(&sealed, b"").unwrap(), b"hi");
    assert!(matches!(
        Vault::open(&path, &MasterKey::from_passphrase("wrong").unwrap()),
        Err(Error::WrongMasterKey(_))
    ));
}

#[test]
fn open_create_and_foreign_files() {
    let dir = TempDir::new().unwrap();
    let key = MasterKey::generate();
    match Vault::open(dir.path().join("missing.db"), &key) {
        Err(Error::Io(e)) => assert_eq!(e.kind(), std::io::ErrorKind::NotFound),
        other => panic!("expected NotFound, got {other:?}"),
    }

    let path = keystore_path(&dir);
    Vault::create(&path, &key).unwrap();
    assert!(matches!(
        Vault::create(&path, &key),
        Err(Error::InvalidArgument(_))
    ));
    Vault::open_or_create(&path, &key).unwrap();

    let foreign = dir.path().join("app.db");
    raw_db(&foreign)
        .execute_batch("CREATE TABLE users (id INTEGER);")
        .unwrap();
    assert!(matches!(
        Vault::open_or_create(&foreign, &key),
        Err(Error::InvalidArgument(_))
    ));
    assert!(matches!(
        Vault::open(&foreign, &key),
        Err(Error::Keystore(_))
    ));

    let text = dir.path().join("notes.txt");
    std::fs::write(
        &text,
        "definitely not sqlite, just some text that is long enough to be read",
    )
    .unwrap();
    assert!(Vault::open(&text, &key).is_err());
}

#[test]
fn master_key_rotation() {
    let (dir, vault, old_key) = new_vault();
    let path = keystore_path(&dir);
    let sealed = vault.seal("user-1", b"before", b"").unwrap();
    let stale = Vault::open(&path, &old_key).unwrap();

    let new_key = MasterKey::generate();
    vault.rotate_master_key(&new_key).unwrap();
    assert_eq!(vault.unseal(&sealed, b"").unwrap(), b"before");

    assert!(matches!(
        Vault::open(&path, &old_key),
        Err(Error::WrongMasterKey(_))
    ));
    let reopened = Vault::open(&path, &new_key).unwrap();
    assert_eq!(reopened.unseal(&sealed, b"").unwrap(), b"before");
    assert!(matches!(
        stale.unseal(&sealed, b""),
        Err(Error::WrongMasterKey(_))
    ));

    let pass = MasterKey::from_passphrase("now a passphrase").unwrap();
    reopened.rotate_master_key(&pass).unwrap();
    assert_eq!(
        Vault::open(&path, &pass)
            .unwrap()
            .unseal(&sealed, b"")
            .unwrap(),
        b"before"
    );
    let events: Vec<String> = reopened
        .audit_entries()
        .unwrap()
        .into_iter()
        .map(|e| e.event)
        .collect();
    assert_eq!(events.iter().filter(|e| *e == "kek.rotated").count(), 2);
}

#[test]
fn tombstone_journal_reapplies_shreds_to_a_restored_backup() {
    let (dir, vault, key) = new_vault();
    let path = keystore_path(&dir);
    let erased = vault.seal("user-1", b"erase me", b"").unwrap();
    let kept = vault.seal("user-2", b"keep me", b"").unwrap();

    let backup = dir.path().join("backup.db");
    std::fs::copy(&path, &backup).unwrap();

    vault.shred("user-1").unwrap().unwrap();
    let journal = dir.path().join("shreds.jsonl");
    assert_eq!(vault.export_tombstones(&journal).unwrap(), 1);

    // Restoring the old backup brings the erased key back...
    let restored = Vault::open(&backup, &key).unwrap();
    assert_eq!(restored.unseal(&erased, b"").unwrap(), b"erase me");
    // ...until the journal is re-applied.
    assert_eq!(restored.import_tombstones(&journal).unwrap(), 1);
    assert!(matches!(
        restored.unseal(&erased, b""),
        Err(Error::Shredded { .. })
    ));
    assert_eq!(restored.unseal(&kept, b"").unwrap(), b"keep me");
    assert_eq!(restored.import_tombstones(&journal).unwrap(), 0);
    assert!(restored.verify_audit().unwrap().ok);

    std::fs::write(&journal, "{\"key_id\": \"zz\", \"shredded_at\": 1}\n").unwrap();
    assert!(matches!(
        restored.import_tombstones(&journal),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn audit_log_records_lifecycle_and_detects_tampering() {
    let (dir, vault, _) = new_vault();
    vault.seal("user-42", b"x", b"").unwrap();
    let receipt = vault.shred("user-42").unwrap().unwrap();

    let entries = vault.audit_entries().unwrap();
    let events: Vec<&str> = entries.iter().map(|e| e.event.as_str()).collect();
    assert_eq!(events, ["keystore.created", "key.created", "key.shredded"]);
    assert_eq!(
        entries[2].subject_hash.as_deref(),
        Some(&receipt.subject_hash[..])
    );
    assert_eq!(receipt.audit_seq, 3);
    let report = vault.verify_audit().unwrap();
    assert!(report.ok);
    assert_eq!(vault.audit_head().unwrap(), (3, report.head));

    let path = keystore_path(&dir);
    let file = std::fs::read(&path).unwrap();
    assert!(
        !contains(&file, b"user-42"),
        "raw subject id must never be stored"
    );

    raw_db(&path)
        .execute("UPDATE audit SET ts = ts + 1 WHERE seq = 2", [])
        .unwrap();
    let report = vault.verify_audit().unwrap();
    assert!(!report.ok);
    assert_eq!(report.first_bad_seq, Some(2));
}

#[test]
fn shredded_key_bytes_are_overwritten_in_the_keystore_file() {
    let (dir, vault, _) = new_vault();
    let path = keystore_path(&dir);
    vault.seal("user-42", b"x", b"").unwrap();
    let wrapped: Vec<u8> = raw_db(&path)
        .query_row("SELECT wrapped_dek FROM subject_keys", [], |r| r.get(0))
        .unwrap();
    assert!(contains(&std::fs::read(&path).unwrap(), &wrapped));

    vault.shred("user-42").unwrap();
    drop(vault);
    assert!(!contains(&std::fs::read(&path).unwrap(), &wrapped));
}

#[test]
fn data_access_audit_is_opt_in() {
    let (dir, vault, key) = new_vault();
    let sealed = vault.seal("user-1", b"x", b"").unwrap();
    vault.unseal(&sealed, b"").unwrap();
    assert_eq!(vault.audit_entries().unwrap().len(), 2);

    let mut audited = Vault::open(keystore_path(&dir), &key).unwrap();
    audited.set_audit_data_access(true);
    let sealed = audited.seal("user-1", b"y", b"").unwrap();
    audited.unseal(&sealed, b"").unwrap();
    let events: Vec<String> = audited
        .audit_entries()
        .unwrap()
        .into_iter()
        .map(|e| e.event)
        .collect();
    assert_eq!(&events[2..], ["data.sealed", "data.unsealed"]);
}

#[test]
fn concurrent_first_seals_converge_on_one_key() {
    let (dir, vault, key) = new_vault();
    let path = keystore_path(&dir);
    let handles: Vec<_> = (0..8)
        .map(|i| {
            let (path, key) = (path.clone(), key.clone());
            std::thread::spawn(move || {
                let own = Vault::open(&path, &key).unwrap();
                own.seal("same-subject", format!("from {i}").as_bytes(), b"")
                    .unwrap()
            })
        })
        .collect();
    let sealed: Vec<Vec<u8>> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    let first_id = inspect_header(&sealed[0]).unwrap().key_id;
    for (i, blob) in sealed.iter().enumerate() {
        assert_eq!(inspect_header(blob).unwrap().key_id, first_id);
        assert_eq!(
            vault.unseal(blob, b"").unwrap(),
            format!("from {i}").as_bytes()
        );
    }
}

#[test]
fn one_vault_shared_across_threads() {
    let (_dir, vault, _) = new_vault();
    let vault = Arc::new(vault);
    let handles: Vec<_> = (0..8)
        .map(|i| {
            let vault = Arc::clone(&vault);
            std::thread::spawn(move || {
                for j in 0..20 {
                    let subject = format!("user-{}", (i + j) % 5);
                    let sealed = vault.seal(&subject, b"data", b"").unwrap();
                    assert_eq!(vault.unseal(&sealed, b"").unwrap(), b"data");
                }
            })
        })
        .collect();
    for h in handles {
        h.join().unwrap();
    }
    assert!(vault.verify_audit().unwrap().ok);
}

#[test]
fn files_round_trip_and_tampered_files_leave_nothing_behind() {
    let (dir, vault, _) = new_vault();
    let source = dir.path().join("scan.pdf");
    let data: Vec<u8> = (0..1_000_000u32).map(|i| (i % 253) as u8).collect();
    std::fs::write(&source, &data).unwrap();

    let sealed = dir.path().join("scan.pdf.aegis");
    vault.seal_file("user-1", &source, &sealed, b"").unwrap();
    let restored = dir.path().join("restored.pdf");
    vault.unseal_file(&sealed, &restored, b"").unwrap();
    assert_eq!(std::fs::read(&restored).unwrap(), data);

    let mut bytes = std::fs::read(&sealed).unwrap();
    let last = bytes.len() - 1;
    bytes[last] ^= 0xff;
    std::fs::write(&sealed, &bytes).unwrap();
    let target = dir.path().join("should-not-exist.pdf");
    assert!(matches!(
        vault.unseal_file(&sealed, &target, b""),
        Err(Error::Integrity)
    ));
    assert!(!target.exists());
    let leftovers: Vec<_> = std::fs::read_dir(dir.path())
        .unwrap()
        .map(|e| e.unwrap().file_name())
        .collect();
    assert_eq!(
        leftovers.len(),
        4,
        "only keys.db, scan.pdf, scan.pdf.aegis, restored.pdf: {leftovers:?}"
    );
}

#[test]
fn key_status_needs_no_master_key() {
    let (dir, vault, _) = new_vault();
    let path = keystore_path(&dir);
    let live = inspect_header(&vault.seal("user-1", b"x", b"").unwrap())
        .unwrap()
        .key_id;
    let dead = inspect_header(&vault.seal("user-2", b"x", b"").unwrap())
        .unwrap()
        .key_id;
    let receipt = vault.shred("user-2").unwrap().unwrap();
    assert_eq!(key_status(&path, &live).unwrap(), KeyStatus::Present);
    assert_eq!(
        key_status(&path, &dead).unwrap(),
        KeyStatus::Shredded {
            at: receipt.shredded_at
        }
    );
    assert_eq!(key_status(&path, &[0u8; 16]).unwrap(), KeyStatus::Unknown);
}

#[test]
fn invalid_subjects_are_rejected() {
    let (_dir, vault, _) = new_vault();
    assert!(matches!(
        vault.seal("", b"x", b""),
        Err(Error::InvalidArgument(_))
    ));
    assert!(matches!(
        vault.shred(&"x".repeat(257)),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn missing_keystore_directory_is_a_clear_not_found() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("no-such-dir").join("keys.db");
    for result in [
        Vault::open_or_create(&path, &MasterKey::generate()),
        Vault::create(&path, &MasterKey::generate()),
    ] {
        match result {
            Err(Error::Io(e)) => assert_eq!(e.kind(), std::io::ErrorKind::NotFound),
            other => panic!("expected NotFound, got {other:?}"),
        }
    }
    assert!(!path.parent().unwrap().exists());
}

#[test]
fn subject_ids_are_compared_byte_for_byte() {
    let (_dir, vault, _) = new_vault();
    let composed = "Jos\u{e9}"; // é as one code point (NFC)
    let decomposed = "Jose\u{301}"; // e + combining accent (NFD)
    let sealed = vault.seal(composed, b"x", b"").unwrap();
    assert!(
        vault.shred(decomposed).unwrap().is_none(),
        "different bytes, different subject"
    );
    assert!(vault.shred(composed).unwrap().is_some());
    assert!(matches!(
        vault.unseal(&sealed, b""),
        Err(Error::Shredded { .. })
    ));

    let emoji = "user-\u{1F600}";
    assert_eq!(
        vault
            .unseal(&vault.seal(emoji, b"y", b"").unwrap(), b"")
            .unwrap(),
        b"y"
    );
    assert!(vault.seal(&"\u{e9}".repeat(128), b"z", b"").is_ok()); // 256 bytes
    assert!(matches!(
        vault.seal(&"\u{e9}".repeat(129), b"z", b""),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn files_can_be_sealed_and_unsealed_in_place() {
    let (dir, vault, _) = new_vault();
    let path = dir.path().join("report.csv");
    std::fs::write(&path, b"id,email\n42,alice@example.com\n").unwrap();
    vault.seal_file("user-42", &path, &path, b"").unwrap();
    assert!(!contains(&std::fs::read(&path).unwrap(), b"alice"));
    vault.unseal_file(&path, &path, b"").unwrap();
    assert_eq!(
        std::fs::read(&path).unwrap(),
        b"id,email\n42,alice@example.com\n"
    );
}
```

- [ ] **Step 2: Write the failing fork test** in `crates/aegis-shred/tests/fork.rs` (Review Focus 1; one test per binary so no other test thread runs during `fork()`):

```rust
//! A vault opened before `fork()` must keep working in the child (gunicorn `--preload`,
//! Celery prefork). This file holds a single test so no other test thread runs during the fork.
#![cfg(unix)]

use aegis_shred::{Error, MasterKey, Vault};

fn open_fd_count() -> usize {
    std::fs::read_dir("/dev/fd").map(|d| d.count()).unwrap_or(0)
}

#[test]
fn vault_keeps_working_across_fork() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();
    let sealed = vault.seal("user-1", b"x", b"").unwrap();

    // SAFETY: this test binary contains one test, so no other thread holds a lock across fork().
    let pid = unsafe { libc::fork() };
    assert!(pid >= 0, "fork failed");
    if pid == 0 {
        let fds_before = open_fd_count();
        let read_ok = vault.unseal(&sealed, b"").ok().as_deref() == Some(&b"x"[..]);
        // The child must have opened its own connection instead of reusing the parent's.
        let reopened = open_fd_count() > fds_before;
        let write_ok =
            vault.seal("user-2", b"y", b"").is_ok() && matches!(vault.shred("user-1"), Ok(Some(_)));
        let code = match (read_ok && write_ok, reopened) {
            (true, true) => 0,
            (false, _) => 1,
            (true, false) => 3,
        };
        // SAFETY: _exit skips destructors that could touch the parent's resources.
        unsafe { libc::_exit(code) };
    }
    let mut status = 0;
    // SAFETY: pid is our child.
    unsafe { libc::waitpid(pid, &mut status, 0) };
    assert!(
        libc::WIFEXITED(status) && libc::WEXITSTATUS(status) == 0,
        "child exited with {} (1 = vault calls failed, 3 = reused the parent's connection)",
        libc::WEXITSTATUS(status)
    );
    assert!(matches!(
        vault.unseal(&sealed, b""),
        Err(Error::Shredded { .. })
    ));
    assert!(vault.has_key("user-2").unwrap());
}
```

- [ ] **Step 3: Run to see failure.** `cargo test -p aegis-shred --tests` → `unresolved imports aegis_shred::Vault`.

- [ ] **Step 4: Write `crates/aegis-shred/src/vault.rs`**. `lock()` reopens the SQLite connection in a forked child; every other method goes through it:

```rust
//! The public `Vault` API: seal, unseal, shred, rotate, audit.

use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::{Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};

use crate::audit::{self, AuditEntry, AuditReport};
use crate::error::{Error, Result};
use crate::format::{self, Header};
use crate::keys::{self, KdfParams, Key32, MasterKey};
use crate::keystore::{self, StoredKey};

const ROTATED_ELSEWHERE: &str =
    "the master key was rotated by another process; reopen the vault with the new key";

/// Proof that a subject's data key was destroyed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShredReceipt {
    /// `HMAC-SHA256(index_key, subject_id)`, as recorded in the audit log.
    pub subject_hash: [u8; 32],
    /// Id of the destroyed data key.
    pub key_id: [u8; 16],
    /// Unix time (seconds) of the shred.
    pub shredded_at: i64,
    /// Sequence number of the `key.shredded` audit entry.
    pub audit_seq: i64,
}

#[derive(Serialize, Deserialize)]
struct TombstoneLine {
    key_id: String,
    shredded_at: i64,
}

struct Inner {
    conn: Connection,
    kek: Key32,
    index_key: Key32,
    /// Absolute keystore path, used to reopen the connection in a forked child.
    path: PathBuf,
    /// Process that opened `conn`.
    pid: u32,
}

/// A crypto-shredding vault backed by one keystore file.
///
/// `Vault` is `Send + Sync`; share one instance across threads. Several processes may open
/// the same keystore file at once.
pub struct Vault {
    inner: Mutex<Inner>,
    audit_data_access: bool,
}

impl std::fmt::Debug for Vault {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Vault")
            .field("audit_data_access", &self.audit_data_access)
            .finish_non_exhaustive()
    }
}

fn not_a_keystore() -> Error {
    Error::Keystore("the file is not an aegis-shred keystore".into())
}

fn check_kek(conn: &Connection, kek: &[u8; 32]) -> Result<()> {
    let check = keystore::meta_require(conn, "kek_check")?;
    match keys::unwrap(kek, &check, keys::AAD_KEK_CHECK) {
        Some(plaintext) if plaintext.as_slice() == keys::KEK_CHECK_PLAINTEXT => Ok(()),
        _ => Err(Error::WrongMasterKey(
            "the master key does not match this keystore",
        )),
    }
}

fn write_kek_meta(
    conn: &Connection,
    master_key: &MasterKey,
    kdf_salt: &[u8; 16],
    params: KdfParams,
    kek: &[u8; 32],
    index_key: &[u8; 32],
) -> Result<()> {
    keystore::meta_put(conn, "kek_kind", master_key.kind().as_bytes())?;
    keystore::meta_put(conn, "kdf_salt", kdf_salt)?;
    keystore::meta_put(conn, "kdf_params", &params.to_bytes())?;
    keystore::meta_put(
        conn,
        "kek_check",
        &keys::wrap(kek, keys::KEK_CHECK_PLAINTEXT, keys::AAD_KEK_CHECK),
    )?;
    keystore::meta_put(
        conn,
        "wrapped_index_key",
        &keys::wrap(kek, index_key, keys::AAD_INDEX_KEY),
    )?;
    Ok(())
}

fn unwrap_dek(conn: &Connection, kek: &[u8; 32], stored: &StoredKey) -> Result<Key32> {
    let aad = keys::dek_aad(&stored.key_id, &stored.subject_hash);
    match keys::unwrap_key32(kek, &stored.wrapped_dek, &aad) {
        Some(dek) => Ok(dek),
        None => {
            check_kek(conn, kek).map_err(|_| Error::WrongMasterKey(ROTATED_ELSEWHERE))?;
            Err(Error::Keystore(
                "corrupt keystore: a data key does not unwrap".into(),
            ))
        }
    }
}

/// Writes to a temporary file next to `destination` and renames it into place only on success.
fn write_atomically(
    destination: &Path,
    write: impl FnOnce(&mut BufWriter<&File>) -> Result<()>,
) -> Result<()> {
    let dir = match destination.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };
    let temp = tempfile::NamedTempFile::new_in(dir)?;
    {
        let mut writer = BufWriter::new(temp.as_file());
        write(&mut writer)?;
        writer.flush()?;
    }
    temp.as_file().sync_all()?;
    temp.persist(destination).map_err(|e| Error::Io(e.error))?;
    Ok(())
}

impl Vault {
    /// Opens an existing keystore.
    pub fn open(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        let conn = keystore::open_connection(path)?;
        Self::load(conn, path, master_key)
    }

    /// Creates a new keystore. Fails if any file already exists at `path`.
    pub fn create(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        if path.exists() {
            return Err(Error::InvalidArgument(
                "a file already exists at the keystore path".into(),
            ));
        }
        let mut conn = keystore::create_connection(path)?;
        Self::initialize(&mut conn, master_key, true)?;
        Self::load(conn, path, master_key)
    }

    /// Opens the keystore at `path`, creating it first if it does not exist.
    ///
    /// Safe to call from many processes at once: exactly one of them initializes the keystore.
    pub fn open_or_create(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        let mut conn = keystore::create_connection(path)?;
        Self::initialize(&mut conn, master_key, false)?;
        Self::load(conn, path, master_key)
    }

    /// Records `data.sealed` / `data.unsealed` audit events (one keystore write per call). Off by default.
    pub fn set_audit_data_access(&mut self, enabled: bool) {
        self.audit_data_access = enabled;
    }

    fn initialize(conn: &mut Connection, master_key: &MasterKey, must_be_new: bool) -> Result<()> {
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        if keystore::table_count(&tx)? > 0 {
            let has_meta: i64 = tx.query_row(
                "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'meta'",
                [],
                |r| r.get(0),
            )?;
            if has_meta == 0 || keystore::meta_get(&tx, "schema_version")?.is_none() {
                return Err(Error::InvalidArgument(
                    "the file is an existing SQLite database that is not an aegis-shred keystore"
                        .into(),
                ));
            }
            if must_be_new {
                return Err(Error::InvalidArgument(
                    "a keystore already exists at this path".into(),
                ));
            }
            return Ok(());
        }
        tx.execute_batch(keystore::SCHEMA)?;
        let kdf_salt = keys::random_bytes::<16>();
        let params = KdfParams::DEFAULT;
        let kek = keys::derive_kek(master_key, &kdf_salt, params)?;
        let index_key = keys::random_key();
        keystore::meta_put(&tx, "schema_version", keystore::SCHEMA_VERSION)?;
        keystore::meta_put(&tx, "created_at", &keystore::now().to_be_bytes())?;
        write_kek_meta(&tx, master_key, &kdf_salt, params, &kek, &index_key)?;
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEYSTORE_CREATED,
            None,
            None,
            None,
        )?;
        tx.commit()?;
        Ok(())
    }

    fn load(conn: Connection, path: &Path, master_key: &MasterKey) -> Result<Vault> {
        let version = keystore::meta_get(&conn, "schema_version")
            .map_err(|_| not_a_keystore())?
            .ok_or_else(not_a_keystore)?;
        if version != keystore::SCHEMA_VERSION {
            return Err(Error::UnsupportedFormat(
                "unsupported keystore schema version",
            ));
        }
        let kind = keystore::meta_require(&conn, "kek_kind")?;
        if kind != master_key.kind().as_bytes() {
            return Err(Error::WrongMasterKey(if kind == b"passphrase" {
                "this keystore is protected by a passphrase, not a raw key"
            } else {
                "this keystore is protected by a raw key, not a passphrase"
            }));
        }
        let kdf_salt = keystore::meta_require(&conn, "kdf_salt")?;
        let params = KdfParams::from_bytes(&keystore::meta_require(&conn, "kdf_params")?)?;
        let kek = keys::derive_kek(master_key, &kdf_salt, params)?;
        check_kek(&conn, &kek)?;
        let index_key = keys::unwrap_key32(
            &kek,
            &keystore::meta_require(&conn, "wrapped_index_key")?,
            keys::AAD_INDEX_KEY,
        )
        .ok_or_else(|| Error::Keystore("corrupt keystore: the index key does not unwrap".into()))?;
        Ok(Vault {
            inner: Mutex::new(Inner {
                conn,
                kek,
                index_key,
                path: std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf()),
                pid: std::process::id(),
            }),
            audit_data_access: false,
        })
    }

    /// Locks the vault. In a process forked after the vault was opened (gunicorn `--preload`,
    /// Celery prefork, `multiprocessing` with fork), first replaces the inherited SQLite
    /// connection: SQLite connections must not be used across `fork()`
    /// (<https://sqlite.org/howtocorrupt.html>, section 2.6).
    fn lock(&self) -> Result<MutexGuard<'_, Inner>> {
        let mut guard = self
            .inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let pid = std::process::id();
        if guard.pid != pid {
            let fresh = keystore::open_connection(&guard.path)?;
            // The inherited connection belongs to the parent: never use or close it here.
            std::mem::forget(std::mem::replace(&mut guard.conn, fresh));
            guard.pid = pid;
        }
        Ok(guard)
    }

    /// Returns the subject's data key, creating it on first use.
    fn data_key_for_subject(&self, subject: &str) -> Result<([u8; 16], Key32)> {
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let subject_hash = keys::subject_hash(&inner.index_key, subject);
        if let Some(stored) = keystore::key_by_subject(&inner.conn, &subject_hash)? {
            let dek = unwrap_dek(&inner.conn, &inner.kek, &stored)?;
            return Ok((stored.key_id, dek));
        }
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        // Another process may have created the key between our read and taking the write lock.
        if let Some(stored) = keystore::key_by_subject(&tx, &subject_hash)? {
            let dek = unwrap_dek(&tx, &inner.kek, &stored)?;
            return Ok((stored.key_id, dek));
        }
        let key_id = keys::random_bytes::<16>();
        let dek = keys::random_key();
        let wrapped_dek = keys::wrap(&inner.kek, &dek[..], &keys::dek_aad(&key_id, &subject_hash));
        keystore::insert_key(
            &tx,
            &StoredKey {
                subject_hash,
                key_id,
                wrapped_dek,
            },
            keystore::now(),
        )?;
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEY_CREATED,
            Some(&subject_hash),
            Some(&key_id),
            None,
        )?;
        tx.commit()?;
        Ok((key_id, dek))
    }

    fn data_key_for_id(&self, key_id: &[u8; 16]) -> Result<Key32> {
        let guard = self.lock()?;
        if let Some(stored) = keystore::key_by_id(&guard.conn, key_id)? {
            return unwrap_dek(&guard.conn, &guard.kek, &stored);
        }
        match keystore::tombstone_at(&guard.conn, key_id)? {
            Some(at) => Err(Error::Shredded { shredded_at: at }),
            None => Err(Error::UnknownKey),
        }
    }

    fn record_data_access(&self, event: &str, key_id: &[u8; 16]) -> Result<()> {
        if !self.audit_data_access {
            return Ok(());
        }
        let mut guard = self.lock()?;
        let tx = guard
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        keystore::audit_append(&tx, keystore::now(), event, None, Some(key_id), None)?;
        tx.commit()?;
        Ok(())
    }

    /// Encrypts `plaintext` for `subject`. Pass the same `context` to [`Vault::unseal`].
    pub fn seal(&self, subject: &str, plaintext: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(
            plaintext.len() + format::HEADER_LEN + 16 * (plaintext.len() / 65_536 + 1),
        );
        self.seal_stream(subject, plaintext, &mut out, context)?;
        Ok(out)
    }

    /// Decrypts a sealed object. Fails with [`Error::Shredded`] if its subject was shredded.
    pub fn unseal(&self, sealed: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(sealed.len());
        self.unseal_stream(sealed, &mut out, context)?;
        Ok(out)
    }

    /// Streams `input` into a sealed object written to `output`, in constant memory.
    pub fn seal_stream<R: Read, W: Write>(
        &self,
        subject: &str,
        input: R,
        output: W,
        context: &[u8],
    ) -> Result<()> {
        keys::validate_subject(subject)?;
        let (key_id, dek) = self.data_key_for_subject(subject)?;
        let header = Header::new(
            key_id,
            keys::random_bytes::<32>(),
            format::DEFAULT_CHUNK_SIZE_LOG2,
        );
        format::seal_with(&dek, &header, input, output, context)?;
        self.record_data_access(audit::EVENT_DATA_SEALED, &key_id)
    }

    /// Streams a sealed object from `input` and writes the plaintext to `output`.
    ///
    /// On error, `output` may already have received plaintext from earlier chunks; discard it.
    /// [`Vault::unseal_file`] does this for you.
    pub fn unseal_stream<R: Read, W: Write>(
        &self,
        mut input: R,
        output: W,
        context: &[u8],
    ) -> Result<()> {
        let header = format::read_header(&mut input)?;
        let dek = self.data_key_for_id(&header.key_id)?;
        format::unseal_with(&dek, &header, input, output, context)?;
        self.record_data_access(audit::EVENT_DATA_UNSEALED, &header.key_id)
    }

    /// Seals the file at `source` into `destination` (atomically replaced on success).
    pub fn seal_file(
        &self,
        subject: &str,
        source: impl AsRef<Path>,
        destination: impl AsRef<Path>,
        context: &[u8],
    ) -> Result<()> {
        keys::validate_subject(subject)?;
        let input = BufReader::new(File::open(source.as_ref())?);
        write_atomically(destination.as_ref(), |out| {
            self.seal_stream(subject, input, out, context)
        })
    }

    /// Unseals the file at `source` into `destination`. Nothing is written unless every chunk verifies.
    pub fn unseal_file(
        &self,
        source: impl AsRef<Path>,
        destination: impl AsRef<Path>,
        context: &[u8],
    ) -> Result<()> {
        let input = BufReader::new(File::open(source.as_ref())?);
        write_atomically(destination.as_ref(), |out| {
            self.unseal_stream(input, out, context)
        })
    }

    /// True when `subject` currently has a data key.
    pub fn has_key(&self, subject: &str) -> Result<bool> {
        keys::validate_subject(subject)?;
        let guard = self.lock()?;
        let subject_hash = keys::subject_hash(&guard.index_key, subject);
        Ok(keystore::key_by_subject(&guard.conn, &subject_hash)?.is_some())
    }

    /// Destroys `subject`'s data key. Returns `None` if the subject had no key.
    pub fn shred(&self, subject: &str) -> Result<Option<ShredReceipt>> {
        keys::validate_subject(subject)?;
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let subject_hash = keys::subject_hash(&inner.index_key, subject);
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let Some(stored) = keystore::key_by_subject(&tx, &subject_hash)? else {
            return Ok(None);
        };
        let at = keystore::now();
        keystore::delete_key(&tx, &subject_hash)?;
        keystore::insert_tombstone(&tx, &stored.key_id, at)?;
        let audit_seq = keystore::audit_append(
            &tx,
            at,
            audit::EVENT_KEY_SHREDDED,
            Some(&subject_hash),
            Some(&stored.key_id),
            None,
        )?;
        tx.commit()?;
        Ok(Some(ShredReceipt {
            subject_hash,
            key_id: stored.key_id,
            shredded_at: at,
            audit_seq,
        }))
    }

    /// All audit entries, oldest first.
    pub fn audit_entries(&self) -> Result<Vec<AuditEntry>> {
        keystore::audit_entries(&self.lock()?.conn)
    }

    /// Verifies the audit hash chain.
    pub fn verify_audit(&self) -> Result<AuditReport> {
        Ok(audit::verify_chain(&self.audit_entries()?))
    }

    /// `(seq, hash)` of the newest audit entry; anchor it somewhere outside the keystore.
    pub fn audit_head(&self) -> Result<(i64, [u8; 32])> {
        keystore::audit_head(&self.lock()?.conn)
    }

    /// Re-wraps every data key under `new_master_key` in one transaction.
    pub fn rotate_master_key(&self, new_master_key: &MasterKey) -> Result<()> {
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let kdf_salt = keys::random_bytes::<16>();
        let params = KdfParams::DEFAULT;
        let new_kek = keys::derive_kek(new_master_key, &kdf_salt, params)?;
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        check_kek(&tx, &inner.kek).map_err(|_| Error::WrongMasterKey(ROTATED_ELSEWHERE))?;
        let stored_keys = keystore::all_keys(&tx)?;
        for stored in &stored_keys {
            let dek = unwrap_dek(&tx, &inner.kek, stored)?;
            let rewrapped = keys::wrap(
                &new_kek,
                &dek[..],
                &keys::dek_aad(&stored.key_id, &stored.subject_hash),
            );
            keystore::update_wrapped_dek(&tx, &stored.subject_hash, &rewrapped)?;
        }
        write_kek_meta(
            &tx,
            new_master_key,
            &kdf_salt,
            params,
            &new_kek,
            &inner.index_key,
        )?;
        let detail = format!(
            "{{\"keys\":{},\"kind\":\"{}\"}}",
            stored_keys.len(),
            new_master_key.kind()
        );
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEK_ROTATED,
            None,
            None,
            Some(&detail),
        )?;
        tx.commit()?;
        inner.kek = new_kek;
        Ok(())
    }

    /// Writes every tombstone as JSON Lines to `path`; returns how many were written.
    pub fn export_tombstones(&self, path: impl AsRef<Path>) -> Result<u64> {
        let rows = keystore::all_tombstones(&self.lock()?.conn)?;
        write_atomically(path.as_ref(), |out| {
            for (key_id, at) in &rows {
                let line = TombstoneLine {
                    key_id: hex::encode(key_id),
                    shredded_at: *at,
                };
                serde_json::to_writer(&mut *out, &line).map_err(|e| Error::Io(e.into()))?;
                out.write_all(b"\n")?;
            }
            Ok(())
        })?;
        Ok(rows.len() as u64)
    }

    /// Re-applies a tombstone journal, e.g. after restoring an old keystore backup.
    /// Deletes any data key named in the journal. Returns how many tombstones were new.
    pub fn import_tombstones(&self, path: impl AsRef<Path>) -> Result<u64> {
        let text = std::fs::read_to_string(path)?;
        let mut parsed = Vec::new();
        for (index, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let entry: TombstoneLine = serde_json::from_str(line).map_err(|_| {
                Error::InvalidArgument(format!("line {}: not a tombstone record", index + 1))
            })?;
            let key_id: [u8; 16] = hex::decode(&entry.key_id)
                .ok()
                .and_then(|bytes| bytes.try_into().ok())
                .ok_or_else(|| {
                    Error::InvalidArgument(format!(
                        "line {}: key_id must be 32 hex characters",
                        index + 1
                    ))
                })?;
            parsed.push((key_id, entry.shredded_at));
        }
        let mut guard = self.lock()?;
        let tx = guard
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let (mut added, mut removed) = (0u64, 0u64);
        for (key_id, at) in &parsed {
            if keystore::insert_tombstone(&tx, key_id, *at)? {
                added += 1;
            }
            removed += keystore::delete_key_by_id(&tx, key_id)? as u64;
        }
        let detail = format!("{{\"added\":{added},\"keys_removed\":{removed}}}");
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_TOMBSTONES_IMPORTED,
            None,
            None,
            Some(&detail),
        )?;
        tx.commit()?;
        Ok(added)
    }
}
```

- [ ] **Step 5: Replace `crates/aegis-shred/src/lib.rs`** with the final version:

````rust
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
````

- [ ] **Step 6: Run everything for the crate**

```bash
cargo test -p aegis-shred 2>&1 | grep "test result"
```

Expected, in order: `29 passed; 0 failed; 1 ignored` (unit), `1 passed` (fork), `21 passed` (vault), `1 passed` (doc-test).

- [ ] **Step 7: Prove the fork test catches connection reuse.** Temporarily change `if guard.pid != pid {` to `if false && guard.pid != pid {` in `vault.rs`, run `cargo test -p aegis-shred --test fork`, and expect a failure mentioning `exited with 3`. Revert the change and rerun: `1 passed`.

- [ ] **Step 8: Lint and format**

```bash
cargo fmt --all && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
```

Expected: no output from clippy beyond `Finished`.

- [ ] **Step 9: Commit**

```bash
git add crates/aegis-shred
git commit -m "Add the Vault API: seal, unseal, shred, rotation, shred journal, audit"
```

---

### Task 8: `aegis` command-line tool

**Files:**
- Create: `crates/aegis-shred-cli/Cargo.toml`, `crates/aegis-shred-cli/README.md`, `crates/aegis-shred-cli/src/main.rs`, `crates/aegis-shred-cli/src/lib.rs`, `crates/aegis-shred-cli/tests/cli.rs`
- Modify: `Cargo.toml` (workspace members)

**Interfaces:**
- Consumes: the whole public `aegis_shred` API.
- Produces: `pub fn run<I, T>(args: I) -> i32 where I: IntoIterator<Item = T>, T: Into<OsString> + Clone` (args include the program name); `pub fn exit_code(&Error) -> i32`; constants `EXIT_OK = 0`, `EXIT_ERROR = 1`, `EXIT_SHREDDED = 3`, `EXIT_INTEGRITY = 4`, `EXIT_WRONG_MASTER_KEY = 5`, `EXIT_UNKNOWN_KEY = 6` (clap usage errors exit 2). Environment: `AEGIS_MASTER_KEY`, `AEGIS_KEYSTORE`, `AEGIS_PASSPHRASE`, `AEGIS_NEW_PASSPHRASE`.

- [ ] **Step 1: Add the crate to the workspace.** In the root `Cargo.toml` set:

```toml
members = ["crates/aegis-shred", "crates/aegis-shred-cli"]
default-members = ["crates/aegis-shred", "crates/aegis-shred-cli"]
```

- [ ] **Step 2: Write `crates/aegis-shred-cli/Cargo.toml`, `README.md` and `src/main.rs`**

```toml
[package]
name = "aegis-shred-cli"
description = "The `aegis` command-line tool for aegis-shred crypto-shredding vaults."
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
homepage.workspace = true
readme = "README.md"
keywords = ["encryption", "crypto-shredding", "gdpr", "privacy", "cli"]
categories = ["cryptography", "command-line-utilities"]

[lib]
name = "aegis_shred_cli"
path = "src/lib.rs"

[[bin]]
name = "aegis"
path = "src/main.rs"

[dependencies]
aegis-shred.workspace = true
clap = { version = "4", features = ["derive", "env"] }
hex = "0.4"
rpassword = "7"

[dev-dependencies]
assert_cmd = "2"
predicates = "3"
tempfile = "3"
```

````markdown
# aegis-shred-cli

The `aegis` command-line tool for [aegis-shred](https://github.com/Lingikaushikreddy/Aegis)
crypto-shredding vaults.

```bash
cargo install aegis-shred-cli
export AEGIS_MASTER_KEY="$(aegis keygen)"
aegis init
aegis seal -s user-42 scan.pdf -o scan.pdf.aegis
aegis unseal scan.pdf.aegis -o scan.pdf
aegis shred user-42            # every file sealed for user-42 is now unreadable
aegis audit verify
```

The same command is installed by `pip install aegis-shred`. Run `aegis --help` for all commands.

Licensed under MIT or Apache-2.0, at your option.
````

```rust
fn main() {
    std::process::exit(aegis_shred_cli::run(std::env::args_os()));
}
```

- [ ] **Step 3: Write the failing tests** in `crates/aegis-shred-cli/tests/cli.rs`:

```rust
use assert_cmd::cargo::cargo_bin_cmd;
use predicates::prelude::*;
use tempfile::TempDir;

fn aegis(dir: &TempDir, key: &str) -> assert_cmd::Command {
    let mut cmd = cargo_bin_cmd!("aegis");
    cmd.current_dir(dir.path())
        .env("AEGIS_MASTER_KEY", key)
        .env_remove("AEGIS_KEYSTORE")
        .env_remove("AEGIS_PASSPHRASE")
        .env_remove("AEGIS_NEW_PASSPHRASE");
    cmd
}

fn keygen() -> String {
    let out = cargo_bin_cmd!("aegis").arg("keygen").output().unwrap();
    assert!(out.status.success());
    String::from_utf8(out.stdout).unwrap().trim().to_string()
}

fn setup() -> (TempDir, String) {
    let dir = TempDir::new().unwrap();
    let key = keygen();
    aegis(&dir, &key).arg("init").assert().success();
    std::fs::write(dir.path().join("plain.txt"), "alice@example.com").unwrap();
    (dir, key)
}

#[test]
fn keygen_prints_a_32_byte_base64_key() {
    let key = keygen();
    assert_eq!(key.len(), 44);
    assert_ne!(key, keygen());
}

#[test]
fn full_lifecycle() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-42", "plain.txt", "-o", "plain.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["unseal", "plain.aegis", "-o", "back.txt"])
        .assert()
        .success();
    assert_eq!(
        std::fs::read_to_string(dir.path().join("back.txt")).unwrap(),
        "alice@example.com"
    );
    aegis(&dir, &key)
        .args(["inspect", "plain.aegis"])
        .assert()
        .success()
        .stdout(predicate::str::contains("key status: present"));

    aegis(&dir, &key)
        .args(["shred", "user-42", "--yes"])
        .assert()
        .success()
        .stdout(predicate::str::contains("shredded key"));
    aegis(&dir, &key)
        .args(["unseal", "plain.aegis", "-o", "again.txt"])
        .assert()
        .code(3)
        .stderr(predicate::str::contains("shredded"));
    assert!(!dir.path().join("again.txt").exists());
    aegis(&dir, &key)
        .args(["inspect", "plain.aegis"])
        .assert()
        .stdout(predicate::str::contains("key status: shredded at"));

    aegis(&dir, &key)
        .args(["audit", "verify"])
        .assert()
        .success()
        .stdout(predicate::str::starts_with("ok: 3 entries"));
    aegis(&dir, &key)
        .args(["audit", "head"])
        .assert()
        .stdout(predicate::str::starts_with("3 "));
    aegis(&dir, &key)
        .args(["audit", "show"])
        .assert()
        .stdout(predicate::str::contains("key.shredded"));
}

#[test]
fn exit_codes_distinguish_failures() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args([
            "seal",
            "-s",
            "u",
            "-c",
            "ctx-a",
            "plain.txt",
            "-o",
            "p.aegis",
        ])
        .assert()
        .success();

    aegis(&dir, &key)
        .args(["unseal", "-c", "ctx-b", "p.aegis", "-o", "x"])
        .assert()
        .code(4);
    aegis(&dir, &keygen())
        .args(["unseal", "p.aegis", "-o", "x"])
        .assert()
        .code(5);

    let other = TempDir::new().unwrap();
    let other_key = keygen();
    aegis(&other, &other_key).arg("init").assert().success();
    std::fs::copy(dir.path().join("p.aegis"), other.path().join("p.aegis")).unwrap();
    aegis(&other, &other_key)
        .args(["unseal", "-c", "ctx-a", "p.aegis", "-o", "x"])
        .assert()
        .code(6);

    let mut bytes = std::fs::read(dir.path().join("p.aegis")).unwrap();
    let last = bytes.len() - 1;
    bytes[last] ^= 1;
    std::fs::write(dir.path().join("p.aegis"), bytes).unwrap();
    aegis(&dir, &key)
        .args(["unseal", "-c", "ctx-a", "p.aegis", "-o", "x"])
        .assert()
        .code(4);

    aegis(&dir, &key)
        .env_remove("AEGIS_MASTER_KEY")
        .args(["audit", "verify"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("no master key"));
    aegis(&dir, &key).assert().code(2);
    let empty = TempDir::new().unwrap();
    aegis(&empty, &key)
        .args(["audit", "verify"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("aegis init"));
}

#[test]
fn refuses_to_overwrite_without_force() {
    let (dir, key) = setup();
    std::fs::write(dir.path().join("taken.aegis"), "precious").unwrap();
    aegis(&dir, &key)
        .args(["seal", "-s", "u", "plain.txt", "-o", "taken.aegis"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("--force"));
    assert_eq!(
        std::fs::read_to_string(dir.path().join("taken.aegis")).unwrap(),
        "precious"
    );
    aegis(&dir, &key)
        .args([
            "seal",
            "-s",
            "u",
            "plain.txt",
            "-o",
            "taken.aegis",
            "--force",
        ])
        .assert()
        .success();
}

#[test]
fn shred_asks_for_confirmation() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-42", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["shred", "user-42"])
        .write_stdin("nope\n")
        .assert()
        .code(1)
        .stderr(predicate::str::contains("aborted"));
    aegis(&dir, &key)
        .args(["inspect", "p.aegis"])
        .assert()
        .stdout(predicate::str::contains("present"));
    aegis(&dir, &key)
        .args(["shred", "user-42"])
        .write_stdin("user-42\n")
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["shred", "user-42", "--yes"])
        .assert()
        .success()
        .stdout(predicate::str::contains("nothing to shred"));
}

#[test]
fn passphrase_from_environment() {
    let dir = TempDir::new().unwrap();
    std::fs::write(dir.path().join("plain.txt"), "hi").unwrap();
    let with_pass = |args: &[&str]| {
        let mut cmd = aegis(&dir, "unused");
        cmd.env_remove("AEGIS_MASTER_KEY")
            .env("AEGIS_PASSPHRASE", "correct horse")
            .arg("--passphrase")
            .args(args);
        cmd
    };
    with_pass(&["init"]).assert().success();
    with_pass(&["seal", "-s", "u", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    with_pass(&["unseal", "p.aegis", "-o", "back.txt"])
        .assert()
        .success();
    assert_eq!(
        std::fs::read_to_string(dir.path().join("back.txt")).unwrap(),
        "hi"
    );
}

#[test]
fn rotation_and_tombstone_journal() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-1", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    let new_key = keygen();
    std::fs::write(dir.path().join("new.key"), &new_key).unwrap();
    aegis(&dir, &key)
        .args(["rotate-master-key", "--new-key-file", "new.key"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["unseal", "p.aegis", "-o", "x"])
        .assert()
        .code(5);
    aegis(&dir, "")
        .env_remove("AEGIS_MASTER_KEY")
        .args(["--key-file", "new.key", "unseal", "p.aegis", "-o", "x"])
        .assert()
        .success();

    std::fs::copy(
        dir.path().join("aegis-keys.db"),
        dir.path().join("backup.db"),
    )
    .unwrap();
    aegis(&dir, &new_key)
        .args(["shred", "user-1", "--yes"])
        .assert()
        .success();
    aegis(&dir, &new_key)
        .args(["tombstones", "export", "shreds.jsonl"])
        .assert()
        .success()
        .stdout(predicate::str::contains("exported 1"));
    aegis(&dir, &new_key)
        .args(["--keystore", "backup.db", "unseal", "p.aegis", "-o", "y"])
        .assert()
        .success();
    aegis(&dir, &new_key)
        .args([
            "--keystore",
            "backup.db",
            "tombstones",
            "import",
            "shreds.jsonl",
        ])
        .assert()
        .success()
        .stdout(predicate::str::contains("imported 1"));
    aegis(&dir, &new_key)
        .args([
            "--keystore",
            "backup.db",
            "unseal",
            "p.aegis",
            "-o",
            "z",
            "--force",
        ])
        .assert()
        .code(3);
}

#[test]
fn inspect_without_a_keystore() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "u", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .env_remove("AEGIS_MASTER_KEY")
        .args(["--keystore", "nowhere.db", "inspect", "p.aegis"])
        .assert()
        .success()
        .stdout(predicate::str::contains("no keystore"));
    aegis(&dir, &key)
        .args(["inspect", "plain.txt"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("bad magic"));
}
```

- [ ] **Step 4: Run to see failure.** Create an empty `crates/aegis-shred-cli/src/lib.rs`, then `cargo test -p aegis-shred-cli` → `cannot find function run in crate aegis_shred_cli`.

- [ ] **Step 5: Write `crates/aegis-shred-cli/src/lib.rs`**

```rust
//! The `aegis` command-line tool. [`run`] is shared by the Rust binary and the Python package.

use std::ffi::OsString;
use std::fs::File;
use std::io::{self, BufRead, Read, Write};
use std::path::{Path, PathBuf};

use aegis_shred::{Error, HEADER_LEN, KeyStatus, MasterKey, Vault, inspect_header, key_status};
use clap::{Parser, Subcommand};

/// Success.
pub const EXIT_OK: i32 = 0;
/// Any error without a more specific code.
pub const EXIT_ERROR: i32 = 1;
/// The data's key was shredded.
pub const EXIT_SHREDDED: i32 = 3;
/// Integrity failure (tampered data, wrong context, broken audit chain).
pub const EXIT_INTEGRITY: i32 = 4;
/// The master key does not match the keystore.
pub const EXIT_WRONG_MASTER_KEY: i32 = 5;
/// The data was sealed with a key this keystore never held.
pub const EXIT_UNKNOWN_KEY: i32 = 6;

#[derive(Parser)]
#[command(
    name = "aegis",
    version,
    about = "Crypto-shredding vault: one key per data subject, so erasing a person makes their data unreadable everywhere."
)]
struct Cli {
    /// Keystore file.
    #[arg(
        long,
        global = true,
        env = "AEGIS_KEYSTORE",
        default_value = "aegis-keys.db"
    )]
    keystore: PathBuf,
    /// Read the base64 master key from this file instead of AEGIS_MASTER_KEY.
    #[arg(long, global = true, conflicts_with = "passphrase")]
    key_file: Option<PathBuf>,
    /// Use a passphrase master key (read from AEGIS_PASSPHRASE, otherwise prompted).
    #[arg(long, global = true)]
    passphrase: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Print a new random master key (base64).
    Keygen,
    /// Create a new keystore.
    Init,
    /// Encrypt a file for a subject.
    Seal {
        /// Subject id, e.g. a user id.
        #[arg(short, long)]
        subject: String,
        /// Context string; the same value is required to unseal.
        #[arg(short, long, default_value = "")]
        context: String,
        /// File to encrypt.
        input: PathBuf,
        /// Where to write the sealed file.
        #[arg(short, long)]
        output: PathBuf,
        /// Overwrite OUTPUT if it exists.
        #[arg(long)]
        force: bool,
    },
    /// Decrypt a sealed file.
    Unseal {
        /// Context string used when sealing.
        #[arg(short, long, default_value = "")]
        context: String,
        /// Sealed file.
        input: PathBuf,
        /// Where to write the plaintext.
        #[arg(short, long)]
        output: PathBuf,
        /// Overwrite OUTPUT if it exists.
        #[arg(long)]
        force: bool,
    },
    /// Destroy a subject's key, making all of their sealed data unreadable.
    Shred {
        /// Subject id.
        subject: String,
        /// Skip the confirmation prompt.
        #[arg(long)]
        yes: bool,
    },
    /// Show a sealed file's header and whether its key still exists (no master key needed).
    Inspect {
        /// Sealed file.
        file: PathBuf,
    },
    /// Inspect and verify the audit log.
    Audit {
        #[command(subcommand)]
        action: AuditAction,
    },
    /// Re-wrap every data key under a new master key.
    RotateMasterKey {
        /// File holding the new base64 master key.
        #[arg(long, conflicts_with = "new_passphrase")]
        new_key_file: Option<PathBuf>,
        /// Switch to a passphrase (read from AEGIS_NEW_PASSPHRASE, otherwise prompted).
        #[arg(long)]
        new_passphrase: bool,
    },
    /// Export or import the shred journal (tombstones).
    Tombstones {
        #[command(subcommand)]
        action: TombstoneAction,
    },
}

#[derive(Subcommand)]
enum AuditAction {
    /// Verify the hash chain.
    Verify,
    /// Show the newest entries.
    Show {
        /// How many entries to show.
        #[arg(long, default_value_t = 20)]
        limit: usize,
    },
    /// Print the newest entry's sequence number and hash, to anchor elsewhere.
    Head,
}

#[derive(Subcommand)]
enum TombstoneAction {
    /// Write every tombstone to FILE as JSON Lines.
    Export {
        /// Output file.
        file: PathBuf,
    },
    /// Re-apply tombstones from FILE (e.g. after restoring a keystore backup).
    Import {
        /// Journal file.
        file: PathBuf,
    },
}

/// Maps an error to the documented exit code.
pub fn exit_code(err: &Error) -> i32 {
    match err {
        Error::Shredded { .. } => EXIT_SHREDDED,
        Error::Integrity => EXIT_INTEGRITY,
        Error::WrongMasterKey(_) => EXIT_WRONG_MASTER_KEY,
        Error::UnknownKey => EXIT_UNKNOWN_KEY,
        _ => EXIT_ERROR,
    }
}

/// Parses `args` (including the program name) and runs the command. Returns the exit code.
pub fn run<I, T>(args: I) -> i32
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    let cli = match Cli::try_parse_from(args) {
        Ok(cli) => cli,
        Err(err) => {
            let _ = err.print();
            return err.exit_code();
        }
    };
    match execute(&cli) {
        Ok(code) => code,
        Err(err) => {
            eprintln!("error: {err}");
            exit_code(&err)
        }
    }
}

fn invalid(message: impl Into<String>) -> Error {
    Error::InvalidArgument(message.into())
}

fn passphrase_from(var: &str, prompt: &str, confirm: bool) -> Result<MasterKey, Error> {
    if let Ok(value) = std::env::var(var) {
        return MasterKey::from_passphrase(value);
    }
    let first = rpassword::prompt_password(prompt)?;
    if confirm {
        let second = rpassword::prompt_password("Repeat passphrase: ")?;
        if first != second {
            return Err(invalid("passphrases do not match"));
        }
    }
    MasterKey::from_passphrase(first)
}

fn master_key(cli: &Cli, confirm: bool) -> Result<MasterKey, Error> {
    if let Some(path) = &cli.key_file {
        return MasterKey::from_file(path);
    }
    if cli.passphrase {
        return passphrase_from("AEGIS_PASSPHRASE", "Passphrase: ", confirm);
    }
    if std::env::var_os("AEGIS_MASTER_KEY").is_some() {
        return MasterKey::from_env("AEGIS_MASTER_KEY");
    }
    Err(invalid(
        "no master key: set AEGIS_MASTER_KEY, or pass --key-file or --passphrase",
    ))
}

fn open_vault(cli: &Cli) -> Result<Vault, Error> {
    if !cli.keystore.exists() {
        return Err(invalid(format!(
            "no keystore at {}; run `aegis init` first or pass --keystore",
            cli.keystore.display()
        )));
    }
    Vault::open(&cli.keystore, &master_key(cli, false)?)
}

fn refuse_overwrite(output: &Path, force: bool) -> Result<(), Error> {
    if output.exists() && !force {
        return Err(invalid(format!(
            "{} already exists; pass --force to overwrite",
            output.display()
        )));
    }
    Ok(())
}

fn confirm_shred(subject: &str) -> Result<bool, Error> {
    eprint!(
        "This permanently destroys the key for '{subject}'; their sealed data can never be read again.\nType the subject id to confirm: "
    );
    io::stderr().flush()?;
    let mut answer = String::new();
    io::stdin().lock().read_line(&mut answer)?;
    Ok(answer.trim() == subject)
}

fn short_hex(bytes: &Option<Vec<u8>>) -> String {
    match bytes {
        Some(b) => hex::encode(&b[..b.len().min(8)]),
        None => "-".into(),
    }
}

fn execute(cli: &Cli) -> Result<i32, Error> {
    match &cli.command {
        Command::Keygen => {
            println!("{}", MasterKey::generate().to_base64()?);
            eprintln!(
                "Store this key in a secret manager. Commands read it from AEGIS_MASTER_KEY."
            );
        }
        Command::Init => {
            Vault::create(&cli.keystore, &master_key(cli, true)?)?;
            eprintln!("created keystore {}", cli.keystore.display());
        }
        Command::Seal {
            subject,
            context,
            input,
            output,
            force,
        } => {
            refuse_overwrite(output, *force)?;
            open_vault(cli)?.seal_file(subject, input, output, context.as_bytes())?;
            eprintln!("sealed {} -> {}", input.display(), output.display());
        }
        Command::Unseal {
            context,
            input,
            output,
            force,
        } => {
            refuse_overwrite(output, *force)?;
            open_vault(cli)?.unseal_file(input, output, context.as_bytes())?;
            eprintln!("unsealed {} -> {}", input.display(), output.display());
        }
        Command::Shred { subject, yes } => {
            let vault = open_vault(cli)?;
            if !*yes && !confirm_shred(subject)? {
                eprintln!("aborted; nothing was shredded");
                return Ok(EXIT_ERROR);
            }
            match vault.shred(subject)? {
                Some(receipt) => println!(
                    "shredded key {} at {} (audit seq {}, subject hash {})",
                    hex::encode(receipt.key_id),
                    receipt.shredded_at,
                    receipt.audit_seq,
                    hex::encode(receipt.subject_hash)
                ),
                None => println!("subject has no key; nothing to shred"),
            }
        }
        Command::Inspect { file } => {
            let mut bytes = Vec::with_capacity(HEADER_LEN);
            File::open(file)?
                .take(HEADER_LEN as u64)
                .read_to_end(&mut bytes)?;
            let header = inspect_header(&bytes)?;
            println!(
                "format:     aegis-shred v{} (AES-256-GCM, HKDF-SHA256, STREAM-BE32)",
                header.version
            );
            println!("chunk size: {} bytes", header.chunk_size());
            println!("key id:     {}", hex::encode(header.key_id));
            let status = if cli.keystore.exists() {
                match key_status(&cli.keystore, &header.key_id)? {
                    KeyStatus::Present => "present".to_string(),
                    KeyStatus::Shredded { at } => format!("shredded at {at}"),
                    KeyStatus::Unknown => "not in this keystore".to_string(),
                }
            } else {
                format!("unknown (no keystore at {})", cli.keystore.display())
            };
            println!("key status: {status}");
        }
        Command::Audit { action } => {
            let vault = open_vault(cli)?;
            match action {
                AuditAction::Verify => {
                    let report = vault.verify_audit()?;
                    if !report.ok {
                        println!(
                            "BROKEN: entry {} fails verification ({} entries verified before it)",
                            report.first_bad_seq.unwrap_or_default(),
                            report.entries
                        );
                        return Ok(EXIT_INTEGRITY);
                    }
                    println!(
                        "ok: {} entries, head {}",
                        report.entries,
                        hex::encode(report.head)
                    );
                }
                AuditAction::Show { limit } => {
                    let entries = vault.audit_entries()?;
                    for entry in &entries[entries.len().saturating_sub(*limit)..] {
                        println!(
                            "{:>6}  {}  {:<20} subject={} key={} {}",
                            entry.seq,
                            entry.ts,
                            entry.event,
                            short_hex(&entry.subject_hash),
                            short_hex(&entry.key_id),
                            entry.detail.as_deref().unwrap_or("")
                        );
                    }
                }
                AuditAction::Head => {
                    let (seq, hash) = vault.audit_head()?;
                    println!("{seq} {}", hex::encode(hash));
                }
            }
        }
        Command::RotateMasterKey {
            new_key_file,
            new_passphrase,
        } => {
            let vault = open_vault(cli)?;
            let new_key = match (new_key_file, new_passphrase) {
                (Some(path), _) => MasterKey::from_file(path)?,
                (None, true) => passphrase_from("AEGIS_NEW_PASSPHRASE", "New passphrase: ", true)?,
                (None, false) => return Err(invalid("pass --new-key-file or --new-passphrase")),
            };
            vault.rotate_master_key(&new_key)?;
            eprintln!(
                "master key rotated; destroy the old key once every process uses the new one"
            );
        }
        Command::Tombstones { action } => {
            let vault = open_vault(cli)?;
            match action {
                TombstoneAction::Export { file } => {
                    let count = vault.export_tombstones(file)?;
                    println!("exported {count} tombstones to {}", file.display());
                }
                TombstoneAction::Import { file } => {
                    let count = vault.import_tombstones(file)?;
                    println!("imported {count} new tombstones");
                }
            }
        }
    }
    Ok(EXIT_OK)
}
```

- [ ] **Step 6: Run.** `cargo test -p aegis-shred-cli 2>&1 | grep "test result"` → one line `ok. 8 passed`. Then `cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings`.

- [ ] **Step 7: Try it by hand**

```bash
cd "$(mktemp -d)" && export AEGIS_MASTER_KEY="$(cargo run -q --manifest-path ~/Desktop/Projects/Aegis/Cargo.toml -p aegis-shred-cli -- keygen 2>/dev/null)"
alias aegis="cargo run -q --manifest-path ~/Desktop/Projects/Aegis/Cargo.toml -p aegis-shred-cli --"
aegis init && echo hello > a.txt && aegis seal -s user-1 a.txt -o a.aegis && aegis inspect a.aegis
aegis shred user-1 --yes; aegis unseal a.aegis -o b.txt; echo "exit=$?"
cd ~/Desktop/Projects/Aegis; unset AEGIS_MASTER_KEY; unalias aegis
```

Expected: `key status: present`, a `shredded key …` receipt, then `error: the data key for this object was shredded …` and `exit=3`.

- [ ] **Step 8: Commit**

```bash
git add Cargo.toml Cargo.lock crates/aegis-shred-cli
git commit -m "Add the aegis command-line tool"
```

---

### Task 9: Python package

**Files:**
- Create: `crates/aegis-shred-py/Cargo.toml`, `crates/aegis-shred-py/src/lib.rs`, `pyproject.toml`, `python/aegis_shred/{__init__.py,__main__.py,_native.pyi,py.typed}`, `python/tests/{conftest.py,test_vault.py,test_concurrency.py,test_reference_format.py,test_cli.py}`
- Modify: `Cargo.toml` (members, workspace dependency)

**Interfaces:**
- Consumes: `aegis_shred` public API, `aegis_shred_cli::run`.
- Produces (Python, module `aegis_shred`): `Vault.open(path, master_key, *, create=False, audit_data_access=False)`; methods `seal(subject, data, context=None) -> bytes`, `unseal(sealed, context=None) -> bytes`, `seal_file`, `unseal_file`, `has_key`, `shred -> ShredReceipt | None`, `verify_audit -> AuditReport`, `audit_head -> (int, str)`, `rotate_master_key`, `export_tombstones -> int`, `import_tombstones -> int`; `MasterKey.{generate, from_base64, from_env(name="AEGIS_MASTER_KEY"), from_file, from_passphrase}`, `.to_base64()`, `.kind`; `ShredReceipt(subject_hash: str, key_id: str, shredded_at: int, audit_seq: int)`; `AuditReport(ok, entries, head, first_bad_seq)`; exceptions `AegisError` > `Shredded`, `UnknownKey`, `WrongMasterKey`, `IntegrityError`, `UnsupportedFormat`, `KeystoreError`; `ValueError` for bad arguments, `OSError` subclasses for file errors; `__version__`; console script `aegis`.

- [ ] **Step 1: Workspace.** In the root `Cargo.toml` set `members = ["crates/aegis-shred", "crates/aegis-shred-cli", "crates/aegis-shred-py"]` (leave `default-members` as is, so plain `cargo test` never links libpython) and add to `[workspace.dependencies]`:

```toml
aegis-shred-cli = { path = "crates/aegis-shred-cli", version = "0.1.0" }
```

- [ ] **Step 2: Packaging files**

`crates/aegis-shred-py/Cargo.toml`:

```toml
[package]
name = "aegis-shred-py"
description = "Python bindings for aegis-shred (built with maturin; published to PyPI as aegis-shred)."
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
publish = false

[lib]
name = "_native"
crate-type = ["cdylib"]

[dependencies]
aegis-shred.workspace = true
aegis-shred-cli.workspace = true
hex = "0.4"
pyo3 = { version = "0.29", features = ["abi3-py310"] }
```

`pyproject.toml` (Task 10 adds the example directory to `testpaths`):

```toml
[build-system]
requires = ["maturin>=1.9,<2"]
build-backend = "maturin"

[project]
name = "aegis-shred"
description = "Crypto-shredding vault: one key per data subject, so erasing a person makes their data unreadable everywhere, backups included."
readme = "README.md"
requires-python = ">=3.10"
license = "MIT OR Apache-2.0"
license-files = ["LICENSE-MIT", "LICENSE-APACHE"]
authors = [{ name = "Lingikaushikreddy" }]
keywords = ["encryption", "crypto-shredding", "gdpr", "privacy", "right-to-erasure"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "Operating System :: MacOS",
    "Operating System :: Microsoft :: Windows",
    "Operating System :: POSIX :: Linux",
    "Programming Language :: Python :: 3",
    "Programming Language :: Rust",
    "Topic :: Security :: Cryptography",
    "Typing :: Typed",
]
dynamic = ["version"]

[project.urls]
Homepage = "https://github.com/Lingikaushikreddy/Aegis"
Repository = "https://github.com/Lingikaushikreddy/Aegis"
Documentation = "https://github.com/Lingikaushikreddy/Aegis#readme"
Changelog = "https://github.com/Lingikaushikreddy/Aegis/blob/main/CHANGELOG.md"

[project.scripts]
aegis = "aegis_shred.__main__:main"

[tool.maturin]
manifest-path = "crates/aegis-shred-py/Cargo.toml"
python-source = "python"
module-name = "aegis_shred._native"
features = ["pyo3/extension-module"]

[tool.pytest.ini_options]
testpaths = ["python/tests", "examples/fastapi_users"]
```

Then edit the last line of `pyproject.toml` to read `testpaths = ["python/tests"]` for now, and create `python/aegis_shred/py.typed` as an empty file.

- [ ] **Step 3: Python sources**

`python/aegis_shred/__init__.py`:

```python
"""Crypto-shredding vault: one key per data subject, so erasing a person makes
their data unreadable everywhere, backups included.

Quickstart::

    from aegis_shred import MasterKey, Shredded, Vault

    vault = Vault.open("keys.db", MasterKey.from_env("AEGIS_MASTER_KEY"), create=True)
    blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")
    vault.unseal(blob, context=b"users.email")    # b"alice@example.com"
    vault.shred("user-42")
    vault.unseal(blob, context=b"users.email")    # raises Shredded
"""

from ._native import (
    AegisError,
    AuditReport,
    IntegrityError,
    KeystoreError,
    MasterKey,
    ShredReceipt,
    Shredded,
    UnknownKey,
    UnsupportedFormat,
    Vault,
    WrongMasterKey,
    __version__,
)

__all__ = [
    "AegisError",
    "AuditReport",
    "IntegrityError",
    "KeystoreError",
    "MasterKey",
    "ShredReceipt",
    "Shredded",
    "UnknownKey",
    "UnsupportedFormat",
    "Vault",
    "WrongMasterKey",
    "__version__",
]
```

`python/aegis_shred/__main__.py`:

```python
"""The ``aegis`` command (also ``python -m aegis_shred``); runs the Rust CLI."""

import sys

from ._native import run_cli


def main() -> None:
    raise SystemExit(run_cli(["aegis", *sys.argv[1:]]))


if __name__ == "__main__":
    main()
```

`python/aegis_shred/_native.pyi`:

```python
from os import PathLike
from typing import Optional, Union

StrPath = Union[str, PathLike[str]]

__version__: str

class AegisError(Exception): ...
class Shredded(AegisError): ...
class UnknownKey(AegisError): ...
class WrongMasterKey(AegisError): ...
class IntegrityError(AegisError): ...
class UnsupportedFormat(AegisError): ...
class KeystoreError(AegisError): ...

class MasterKey:
    @staticmethod
    def generate() -> MasterKey: ...
    @staticmethod
    def from_base64(encoded: str) -> MasterKey: ...
    @staticmethod
    def from_env(name: str = "AEGIS_MASTER_KEY") -> MasterKey: ...
    @staticmethod
    def from_file(path: StrPath) -> MasterKey: ...
    @staticmethod
    def from_passphrase(passphrase: str) -> MasterKey: ...
    def to_base64(self) -> str: ...
    @property
    def kind(self) -> str: ...

class ShredReceipt:
    @property
    def subject_hash(self) -> str: ...
    @property
    def key_id(self) -> str: ...
    @property
    def shredded_at(self) -> int: ...
    @property
    def audit_seq(self) -> int: ...

class AuditReport:
    @property
    def ok(self) -> bool: ...
    @property
    def entries(self) -> int: ...
    @property
    def head(self) -> str: ...
    @property
    def first_bad_seq(self) -> Optional[int]: ...

class Vault:
    @staticmethod
    def open(
        path: StrPath,
        master_key: MasterKey,
        *,
        create: bool = False,
        audit_data_access: bool = False,
    ) -> Vault: ...
    def seal(self, subject: str, data: bytes, context: Optional[bytes] = None) -> bytes: ...
    def unseal(self, sealed: bytes, context: Optional[bytes] = None) -> bytes: ...
    def seal_file(
        self, subject: str, source: StrPath, destination: StrPath, context: Optional[bytes] = None
    ) -> None: ...
    def unseal_file(self, source: StrPath, destination: StrPath, context: Optional[bytes] = None) -> None: ...
    def has_key(self, subject: str) -> bool: ...
    def shred(self, subject: str) -> Optional[ShredReceipt]: ...
    def verify_audit(self) -> AuditReport: ...
    def audit_head(self) -> tuple[int, str]: ...
    def rotate_master_key(self, new_master_key: MasterKey) -> None: ...
    def export_tombstones(self, path: StrPath) -> int: ...
    def import_tombstones(self, path: StrPath) -> int: ...

def run_cli(argv: list[str]) -> int: ...
```

- [ ] **Step 4: Write the failing tests**

`python/tests/conftest.py`:

```python
import pytest

from aegis_shred import MasterKey, Vault


@pytest.fixture
def key() -> MasterKey:
    return MasterKey.generate()


@pytest.fixture
def keystore(tmp_path):
    return tmp_path / "keys.db"


@pytest.fixture
def vault(keystore, key) -> Vault:
    return Vault.open(keystore, key, create=True)
```

`python/tests/test_vault.py` (the last test is Review Focus 5):

```python
import pytest

import aegis_shred
from aegis_shred import (
    AegisError,
    IntegrityError,
    KeystoreError,
    MasterKey,
    Shredded,
    UnknownKey,
    UnsupportedFormat,
    Vault,
    WrongMasterKey,
)


def test_round_trip_with_context(vault):
    blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")
    assert isinstance(blob, bytes)
    assert b"user-42" not in blob
    assert vault.unseal(blob, context=b"users.email") == b"alice@example.com"
    with pytest.raises(IntegrityError):
        vault.unseal(blob, context=b"users.phone")


def test_context_defaults_to_empty(vault):
    blob = vault.seal("user-1", b"x")
    assert vault.unseal(blob) == b"x"
    assert vault.unseal(blob, context=b"") == b"x"


def test_shred_makes_data_unreadable(vault):
    blob = vault.seal("user-42", b"secret")
    keep = vault.seal("user-7", b"keep")
    assert vault.has_key("user-42")

    receipt = vault.shred("user-42")
    assert receipt is not None
    assert len(receipt.subject_hash) == 64 and len(receipt.key_id) == 32
    assert receipt.audit_seq == 4
    assert "ShredReceipt(" in repr(receipt)

    with pytest.raises(Shredded):
        vault.unseal(blob)
    assert vault.unseal(keep) == b"keep"
    assert not vault.has_key("user-42")
    assert vault.shred("user-42") is None
    assert vault.shred("never-stored") is None


def test_files(vault, tmp_path):
    source = tmp_path / "scan.pdf"
    source.write_bytes(bytes(range(256)) * 4000)
    sealed = tmp_path / "scan.pdf.aegis"
    vault.seal_file("user-1", source, sealed)
    restored = tmp_path / "restored.pdf"
    vault.unseal_file(str(sealed), str(restored))
    assert restored.read_bytes() == source.read_bytes()

    data = bytearray(sealed.read_bytes())
    data[-1] ^= 0xFF
    sealed.write_bytes(bytes(data))
    target = tmp_path / "never.pdf"
    with pytest.raises(IntegrityError):
        vault.unseal_file(sealed, target)
    assert not target.exists()


def test_open_errors(keystore, key, tmp_path):
    with pytest.raises(FileNotFoundError):
        Vault.open(tmp_path / "missing.db", key)
    Vault.open(keystore, key, create=True)
    with pytest.raises(WrongMasterKey):
        Vault.open(keystore, MasterKey.generate())
    with pytest.raises(WrongMasterKey):
        Vault.open(keystore, MasterKey.from_passphrase("nope"))
    junk = tmp_path / "junk.db"
    junk.write_text("this is not a database, it is a text file with enough bytes in it")
    with pytest.raises(KeystoreError):
        Vault.open(junk, key)


def test_objects_from_another_keystore(vault, tmp_path):
    other = Vault.open(tmp_path / "other.db", MasterKey.generate(), create=True)
    with pytest.raises(UnknownKey):
        other.unseal(vault.seal("user-1", b"x"))
    with pytest.raises(UnsupportedFormat):
        vault.unseal(b"definitely not sealed")


def test_exception_hierarchy():
    for exc in (Shredded, UnknownKey, WrongMasterKey, IntegrityError, UnsupportedFormat, KeystoreError):
        assert issubclass(exc, AegisError)
    assert issubclass(AegisError, Exception)
    assert Shredded.__module__ == "aegis_shred"


def test_invalid_arguments(vault):
    with pytest.raises(ValueError):
        vault.seal("", b"x")
    with pytest.raises(ValueError):
        vault.seal("x" * 257, b"x")
    with pytest.raises(ValueError):
        MasterKey.from_base64("not base64!")
    with pytest.raises(ValueError):
        MasterKey.from_passphrase("")
    with pytest.raises(ValueError):
        MasterKey.from_env("AEGIS_TEST_UNSET_VARIABLE")


def test_master_key_handling(monkeypatch, tmp_path):
    key = MasterKey.generate()
    encoded = key.to_base64()
    assert encoded not in repr(key)
    assert repr(key) == "MasterKey(kind='raw')"
    assert MasterKey.from_base64(encoded).to_base64() == encoded
    monkeypatch.setenv("AEGIS_MASTER_KEY", encoded)
    assert MasterKey.from_env().to_base64() == encoded
    path = tmp_path / "master.key"
    path.write_text(encoded + "\n")
    assert MasterKey.from_file(path).to_base64() == encoded
    passphrase = MasterKey.from_passphrase("correct horse")
    assert passphrase.kind == "passphrase"
    with pytest.raises(ValueError):
        passphrase.to_base64()


def test_rotation_and_tombstones(vault, keystore, key, tmp_path):
    blob = vault.seal("user-1", b"before")
    new_key = MasterKey.generate()
    vault.rotate_master_key(new_key)
    assert vault.unseal(blob) == b"before"
    with pytest.raises(WrongMasterKey):
        Vault.open(keystore, key)

    backup = tmp_path / "backup.db"
    backup.write_bytes(keystore.read_bytes())
    vault.shred("user-1")
    journal = tmp_path / "shreds.jsonl"
    assert vault.export_tombstones(journal) == 1

    restored = Vault.open(backup, new_key)
    assert restored.unseal(blob) == b"before"
    assert restored.import_tombstones(journal) == 1
    with pytest.raises(Shredded):
        restored.unseal(blob)


def test_audit(vault, keystore, key):
    vault.seal("user-1", b"x")
    report = vault.verify_audit()
    assert report.ok and report.entries == 2 and report.first_bad_seq is None
    seq, head = vault.audit_head()
    assert seq == 2 and head == report.head

    audited = Vault.open(keystore, key, audit_data_access=True)
    audited.unseal(audited.seal("user-1", b"y"))
    assert audited.verify_audit().entries == 4


def test_version():
    assert aegis_shred.__version__ == "0.1.0"


def test_text_instead_of_bytes_is_a_type_error(vault):
    with pytest.raises(TypeError):
        vault.seal("user-1", "alice@example.com")
    with pytest.raises(TypeError):
        vault.seal("user-1", b"x", context="users.email")
    with pytest.raises(TypeError):
        vault.unseal("not bytes")
```

`python/tests/test_concurrency.py` (the last test is Review Focus 1):

```python
import multiprocessing
import os
from concurrent.futures import ThreadPoolExecutor

import pytest

from aegis_shred import MasterKey, Shredded, Vault


def _shred_in_child(path, key_b64, subject, queue):
    vault = Vault.open(path, MasterKey.from_base64(key_b64))
    queue.put(vault.shred(subject) is not None)


def _seal_in_child(path, key_b64, index, queue):
    vault = Vault.open(path, MasterKey.from_base64(key_b64), create=True)
    queue.put(vault.seal("shared-subject", f"from {index}".encode()))


def test_shred_in_one_process_is_seen_by_another(tmp_path, key):
    path = tmp_path / "keys.db"
    vault = Vault.open(path, key, create=True)
    blob = vault.seal("user-42", b"x")
    assert vault.unseal(blob) == b"x"

    ctx = multiprocessing.get_context("spawn")
    queue = ctx.Queue()
    child = ctx.Process(target=_shred_in_child, args=(str(path), key.to_base64(), "user-42", queue))
    child.start()
    child.join(60)
    assert child.exitcode == 0
    assert queue.get(timeout=5) is True
    with pytest.raises(Shredded):
        vault.unseal(blob)


def test_processes_racing_to_create_converge(tmp_path, key):
    path = tmp_path / "keys.db"
    ctx = multiprocessing.get_context("spawn")
    queue = ctx.Queue()
    children = [
        ctx.Process(target=_seal_in_child, args=(str(path), key.to_base64(), i, queue)) for i in range(4)
    ]
    for child in children:
        child.start()
    blobs = [queue.get(timeout=60) for _ in children]
    for child in children:
        child.join(60)
        assert child.exitcode == 0
    vault = Vault.open(path, key)
    assert sorted(vault.unseal(b) for b in blobs) == sorted(f"from {i}".encode() for i in range(4))
    assert len({b[8:24] for b in blobs}) == 1, "all processes must share one subject key"


def test_one_vault_shared_by_threads(vault):
    def work(i):
        subject = f"user-{i % 5}"
        blob = vault.seal(subject, str(i).encode())
        return vault.unseal(blob) == str(i).encode()

    with ThreadPoolExecutor(max_workers=8) as pool:
        assert all(pool.map(work, range(200)))
    assert vault.verify_audit().ok


@pytest.mark.skipif(not hasattr(os, "fork"), reason="needs os.fork (POSIX)")
def test_vault_keeps_working_across_fork(vault):
    # gunicorn --preload and Celery prefork open the vault, then fork workers.
    blob = vault.seal("user-1", b"x")
    pid = os.fork()
    if pid == 0:
        try:
            ok = vault.unseal(blob) == b"x"
            vault.seal("user-2", b"y")
            vault.shred("user-1")
            os._exit(0 if ok else 1)
        except BaseException:
            os._exit(2)
    _, status = os.waitpid(pid, 0)
    assert os.waitstatus_to_exitcode(status) == 0
    with pytest.raises(Shredded):
        vault.unseal(blob)
    assert vault.has_key("user-2")
    assert vault.verify_audit().ok
```

`python/tests/test_reference_format.py` (an independent implementation of `docs/FORMAT.md`):

```python
"""An independent implementation of docs/FORMAT.md using the `cryptography` package.

If these tests pass, the published format description and the Rust code agree.
"""

import base64
import json
import sqlite3
from pathlib import Path

from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from aegis_shred import MasterKey, Vault

VECTORS = Path(__file__).resolve().parents[2] / "crates/aegis-shred/tests/vectors/format-v1.json"


def object_key(dek: bytes, salt: bytes, key_id: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b"aegis-shred/v1/object" + key_id).derive(dek)


def reference_unseal(dek: bytes, sealed: bytes, context: bytes) -> bytes:
    header = sealed[:56]
    assert header[0:4] == b"AEGS" and header[4] == 1 and header[5] == 1 and header[7] == 0
    chunk_size = 1 << header[6]
    key_id, salt = header[8:24], header[24:56]
    aead = AESGCM(object_key(dek, salt, key_id))
    body = sealed[56:]
    segment = chunk_size + 16
    pieces = [body[i : i + segment] for i in range(0, len(body), segment)]
    plaintext = b""
    for counter, piece in enumerate(pieces):
        last = b"\x01" if counter == len(pieces) - 1 else b"\x00"
        nonce = bytes(7) + counter.to_bytes(4, "big") + last
        plaintext += aead.decrypt(nonce, piece, header + context)
    return plaintext


def unwrap(kek: bytes, wrapped: bytes, aad: bytes) -> bytes:
    return AESGCM(kek).decrypt(wrapped[:12], wrapped[12:], aad)


def test_known_answer_vectors():
    vectors = json.loads(VECTORS.read_text())
    dek = bytes.fromhex(vectors["dek_hex"])
    for case in vectors["cases"]:
        expected = bytes(i % 251 for i in range(case["plaintext_len"]))
        sealed = bytes.fromhex(case["sealed_hex"])
        assert reference_unseal(dek, sealed, bytes.fromhex(case["context_hex"])) == expected, case["name"]


def test_keystore_wrapping_matches_spec(tmp_path):
    key = MasterKey.generate()
    path = tmp_path / "keys.db"
    vault = Vault.open(path, key, create=True)
    blob = vault.seal("user-1", b"hello", context=b"ctx")
    del vault

    kek = base64.b64decode(key.to_base64())
    db = sqlite3.connect(path)
    meta = dict(db.execute("SELECT name, value FROM meta"))
    assert unwrap(kek, meta["kek_check"], b"aegis-shred/v1/kek-check") == b"aegis-shred kek check"
    index_key = unwrap(kek, meta["wrapped_index_key"], b"aegis-shred/v1/index-key")

    mac = hmac.HMAC(index_key, hashes.SHA256())
    mac.update(b"user-1")
    subject_hash = mac.finalize()
    key_id, wrapped_dek = db.execute(
        "SELECT key_id, wrapped_dek FROM subject_keys WHERE subject_hash = ?", (subject_hash,)
    ).fetchone()
    db.close()
    assert blob[8:24] == key_id

    dek = unwrap(kek, wrapped_dek, b"aegis-shred/v1/dek" + key_id + subject_hash)
    assert reference_unseal(dek, blob, b"ctx") == b"hello"
```

`python/tests/test_cli.py`:

```python
import os
import subprocess
import sys


def aegis(*args, cwd, env_extra=None, stdin=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith("AEGIS_")}
    env.update(env_extra or {})
    return subprocess.run(
        [sys.executable, "-m", "aegis_shred", *args],
        cwd=cwd,
        env=env,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_cli_through_python(tmp_path):
    keygen = aegis("keygen", cwd=tmp_path)
    assert keygen.returncode == 0
    env = {"AEGIS_MASTER_KEY": keygen.stdout.strip()}
    assert aegis("init", cwd=tmp_path, env_extra=env).returncode == 0
    (tmp_path / "plain.txt").write_text("hello")
    assert aegis("seal", "-s", "user-1", "plain.txt", "-o", "p.aegis", cwd=tmp_path, env_extra=env).returncode == 0
    assert aegis("shred", "user-1", "--yes", cwd=tmp_path, env_extra=env).returncode == 0
    result = aegis("unseal", "p.aegis", "-o", "back.txt", cwd=tmp_path, env_extra=env)
    assert result.returncode == 3
    assert "shredded" in result.stderr


def test_help_and_usage_errors(tmp_path):
    assert "crypto-shredding" in aegis("--help", cwd=tmp_path).stdout.lower()
    assert aegis(cwd=tmp_path).returncode == 2
```

- [ ] **Step 5: Set up the venv and see the tests fail**

```bash
cd ~/Desktop/Projects/Aegis
unset CONDA_PREFIX CONDA_DEFAULT_ENV CONDA_SHLVL
uv venv --python 3.12 .venv && export VIRTUAL_ENV="$PWD/.venv" PATH="$PWD/.venv/bin:$PATH"
uv pip install maturin pytest cryptography
python -m pytest -q python/tests 2>&1 | tail -3
```

Expected: collection errors, `ModuleNotFoundError: No module named 'aegis_shred._native'` (or `aegis_shred`).

- [ ] **Step 6: Write the bindings** in `crates/aegis-shred-py/src/lib.rs`:

```rust
//! Python bindings for aegis-shred, exposed as `aegis_shred._native`.

use std::path::PathBuf;

use aegis_shred as core;
use pyo3::create_exception;
use pyo3::exceptions::{PyException, PyValueError};
use pyo3::prelude::*;
use pyo3::types::PyBytes;

create_exception!(
    aegis_shred,
    AegisError,
    PyException,
    "Base class for aegis-shred errors."
);
create_exception!(
    aegis_shred,
    Shredded,
    AegisError,
    "The data key for this object was shredded."
);
create_exception!(
    aegis_shred,
    UnknownKey,
    AegisError,
    "The object was sealed with a key that is not in this keystore."
);
create_exception!(
    aegis_shred,
    WrongMasterKey,
    AegisError,
    "The master key does not match the keystore."
);
create_exception!(
    aegis_shred,
    IntegrityError,
    AegisError,
    "The data is corrupt, truncated, tampered with, or the context does not match."
);
create_exception!(
    aegis_shred,
    UnsupportedFormat,
    AegisError,
    "The bytes are not a sealed object this version understands."
);
create_exception!(
    aegis_shred,
    KeystoreError,
    AegisError,
    "The keystore database failed or is corrupt."
);

fn to_py_err(err: core::Error) -> PyErr {
    let message = err.to_string();
    match err {
        core::Error::Shredded { .. } => Shredded::new_err(message),
        core::Error::UnknownKey => UnknownKey::new_err(message),
        core::Error::WrongMasterKey(_) => WrongMasterKey::new_err(message),
        core::Error::Integrity => IntegrityError::new_err(message),
        core::Error::UnsupportedFormat(_) => UnsupportedFormat::new_err(message),
        core::Error::Keystore(_) => KeystoreError::new_err(message),
        core::Error::Io(io) => PyErr::from(io),
        core::Error::InvalidArgument(_) => PyValueError::new_err(message),
    }
}

/// A master key (key-encryption key). Its value is never shown by repr().
#[pyclass(frozen, module = "aegis_shred")]
struct MasterKey {
    inner: core::MasterKey,
}

#[pymethods]
impl MasterKey {
    /// A new random 32-byte key.
    #[staticmethod]
    fn generate() -> Self {
        MasterKey {
            inner: core::MasterKey::generate(),
        }
    }

    /// Decode a base64 key (32 bytes).
    #[staticmethod]
    fn from_base64(encoded: &str) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_base64(encoded).map_err(to_py_err)?,
        })
    }

    /// Read a base64 key from an environment variable.
    #[staticmethod]
    #[pyo3(signature = (name = "AEGIS_MASTER_KEY"))]
    fn from_env(name: &str) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_env(name).map_err(to_py_err)?,
        })
    }

    /// Read a base64 key from a file.
    #[staticmethod]
    fn from_file(path: PathBuf) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_file(path).map_err(to_py_err)?,
        })
    }

    /// Use a passphrase (stretched with Argon2id).
    #[staticmethod]
    fn from_passphrase(passphrase: String) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_passphrase(passphrase).map_err(to_py_err)?,
        })
    }

    /// The key as base64. Raises ValueError for passphrase keys.
    fn to_base64(&self) -> PyResult<String> {
        self.inner.to_base64().map_err(to_py_err)
    }

    /// "raw" or "passphrase".
    #[getter]
    fn kind(&self) -> &'static str {
        self.inner.kind()
    }

    fn __repr__(&self) -> String {
        format!("MasterKey(kind='{}')", self.inner.kind())
    }
}

/// Proof that a subject's data key was destroyed.
#[pyclass(frozen, get_all, module = "aegis_shred")]
struct ShredReceipt {
    subject_hash: String,
    key_id: String,
    shredded_at: i64,
    audit_seq: i64,
}

#[pymethods]
impl ShredReceipt {
    fn __repr__(&self) -> String {
        format!(
            "ShredReceipt(key_id='{}', shredded_at={}, audit_seq={})",
            self.key_id, self.shredded_at, self.audit_seq
        )
    }
}

/// Result of verifying the audit hash chain.
#[pyclass(frozen, get_all, module = "aegis_shred")]
struct AuditReport {
    ok: bool,
    entries: u64,
    head: String,
    first_bad_seq: Option<i64>,
}

#[pymethods]
impl AuditReport {
    fn __repr__(&self) -> String {
        format!(
            "AuditReport(ok={}, entries={}, head='{}', first_bad_seq={:?})",
            if self.ok { "True" } else { "False" },
            self.entries,
            self.head,
            self.first_bad_seq
        )
    }
}

/// A crypto-shredding vault backed by one keystore file. Safe to share across threads.
#[pyclass(frozen, module = "aegis_shred")]
struct Vault {
    inner: core::Vault,
}

#[pymethods]
impl Vault {
    /// Open the keystore at `path`; with `create=True`, create it if missing.
    #[staticmethod]
    #[pyo3(signature = (path, master_key, *, create = false, audit_data_access = false))]
    fn open(
        py: Python<'_>,
        path: PathBuf,
        master_key: &MasterKey,
        create: bool,
        audit_data_access: bool,
    ) -> PyResult<Self> {
        let key = master_key.inner.clone();
        let mut vault = py
            .detach(|| {
                if create {
                    core::Vault::open_or_create(&path, &key)
                } else {
                    core::Vault::open(&path, &key)
                }
            })
            .map_err(to_py_err)?;
        vault.set_audit_data_access(audit_data_access);
        Ok(Vault { inner: vault })
    }

    /// Encrypt `data` for `subject`. Pass the same `context` to unseal().
    #[pyo3(signature = (subject, data, context = None))]
    fn seal<'py>(
        &self,
        py: Python<'py>,
        subject: &str,
        data: &[u8],
        context: Option<&[u8]>,
    ) -> PyResult<Bound<'py, PyBytes>> {
        let context = context.unwrap_or_default();
        let sealed = py
            .detach(|| self.inner.seal(subject, data, context))
            .map_err(to_py_err)?;
        Ok(PyBytes::new(py, &sealed))
    }

    /// Decrypt a sealed object. Raises Shredded if its subject was shredded.
    #[pyo3(signature = (sealed, context = None))]
    fn unseal<'py>(
        &self,
        py: Python<'py>,
        sealed: &[u8],
        context: Option<&[u8]>,
    ) -> PyResult<Bound<'py, PyBytes>> {
        let context = context.unwrap_or_default();
        let plaintext = py
            .detach(|| self.inner.unseal(sealed, context))
            .map_err(to_py_err)?;
        Ok(PyBytes::new(py, &plaintext))
    }

    /// Seal the file at `source` into `destination` (streaming, atomic).
    #[pyo3(signature = (subject, source, destination, context = None))]
    fn seal_file(
        &self,
        py: Python<'_>,
        subject: &str,
        source: PathBuf,
        destination: PathBuf,
        context: Option<&[u8]>,
    ) -> PyResult<()> {
        let context = context.unwrap_or_default();
        py.detach(|| {
            self.inner
                .seal_file(subject, &source, &destination, context)
        })
        .map_err(to_py_err)
    }

    /// Unseal `source` into `destination`; nothing is written unless every chunk verifies.
    #[pyo3(signature = (source, destination, context = None))]
    fn unseal_file(
        &self,
        py: Python<'_>,
        source: PathBuf,
        destination: PathBuf,
        context: Option<&[u8]>,
    ) -> PyResult<()> {
        let context = context.unwrap_or_default();
        py.detach(|| self.inner.unseal_file(&source, &destination, context))
            .map_err(to_py_err)
    }

    /// True when `subject` currently has a data key.
    fn has_key(&self, py: Python<'_>, subject: &str) -> PyResult<bool> {
        py.detach(|| self.inner.has_key(subject)).map_err(to_py_err)
    }

    /// Destroy `subject`'s data key. Returns None if the subject had no key.
    fn shred(&self, py: Python<'_>, subject: &str) -> PyResult<Option<ShredReceipt>> {
        let receipt = py.detach(|| self.inner.shred(subject)).map_err(to_py_err)?;
        Ok(receipt.map(|r| ShredReceipt {
            subject_hash: hex::encode(r.subject_hash),
            key_id: hex::encode(r.key_id),
            shredded_at: r.shredded_at,
            audit_seq: r.audit_seq,
        }))
    }

    /// Verify the audit hash chain.
    fn verify_audit(&self, py: Python<'_>) -> PyResult<AuditReport> {
        let report = py.detach(|| self.inner.verify_audit()).map_err(to_py_err)?;
        Ok(AuditReport {
            ok: report.ok,
            entries: report.entries,
            head: hex::encode(report.head),
            first_bad_seq: report.first_bad_seq,
        })
    }

    /// (seq, hash_hex) of the newest audit entry.
    fn audit_head(&self, py: Python<'_>) -> PyResult<(i64, String)> {
        let (seq, hash) = py.detach(|| self.inner.audit_head()).map_err(to_py_err)?;
        Ok((seq, hex::encode(hash)))
    }

    /// Re-wrap every data key under `new_master_key`.
    fn rotate_master_key(&self, py: Python<'_>, new_master_key: &MasterKey) -> PyResult<()> {
        let key = new_master_key.inner.clone();
        py.detach(|| self.inner.rotate_master_key(&key))
            .map_err(to_py_err)
    }

    /// Write every tombstone to `path` as JSON Lines; returns the count.
    fn export_tombstones(&self, py: Python<'_>, path: PathBuf) -> PyResult<u64> {
        py.detach(|| self.inner.export_tombstones(&path))
            .map_err(to_py_err)
    }

    /// Re-apply a tombstone journal; returns how many tombstones were new.
    fn import_tombstones(&self, py: Python<'_>, path: PathBuf) -> PyResult<u64> {
        py.detach(|| self.inner.import_tombstones(&path))
            .map_err(to_py_err)
    }
}

/// Run the `aegis` command line with `argv` (including the program name); returns the exit code.
#[pyfunction]
fn run_cli(argv: Vec<String>) -> i32 {
    aegis_shred_cli::run(argv)
}

#[pymodule]
fn _native(m: &Bound<'_, PyModule>) -> PyResult<()> {
    let py = m.py();
    m.add("__version__", env!("CARGO_PKG_VERSION"))?;
    m.add_class::<MasterKey>()?;
    m.add_class::<Vault>()?;
    m.add_class::<ShredReceipt>()?;
    m.add_class::<AuditReport>()?;
    m.add_function(wrap_pyfunction!(run_cli, m)?)?;
    m.add("AegisError", py.get_type::<AegisError>())?;
    m.add("Shredded", py.get_type::<Shredded>())?;
    m.add("UnknownKey", py.get_type::<UnknownKey>())?;
    m.add("WrongMasterKey", py.get_type::<WrongMasterKey>())?;
    m.add("IntegrityError", py.get_type::<IntegrityError>())?;
    m.add("UnsupportedFormat", py.get_type::<UnsupportedFormat>())?;
    m.add("KeystoreError", py.get_type::<KeystoreError>())?;
    Ok(())
}
```

- [ ] **Step 7: Build and test**

```bash
maturin develop --uv 2>&1 | tail -1          # "Installed aegis-shred-0.1.0"
python -m pytest -q python/tests 2>&1 | tail -1
.venv/bin/aegis --version
```

Expected: `21 passed`; `aegis 0.1.0`.

- [ ] **Step 8: Check the sdist builds and installs on its own** (this is what PyPI users without a wheel get):

```bash
rm -rf dist && maturin sdist --out dist
uv venv --python 3.11 /tmp/aegis-sdist-check && VIRTUAL_ENV= uv pip install --python /tmp/aegis-sdist-check/bin/python dist/*.tar.gz
/tmp/aegis-sdist-check/bin/python -c "import aegis_shred as a, tempfile, os; v = a.Vault.open(os.path.join(tempfile.mkdtemp(), 'k.db'), a.MasterKey.generate(), create=True); print(v.unseal(v.seal('u', b'sdist ok')))"
rm -rf /tmp/aegis-sdist-check dist
```

Expected: `b'sdist ok'`.

- [ ] **Step 9: Lint, then commit**

```bash
cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add Cargo.toml Cargo.lock crates/aegis-shred-py pyproject.toml python
git commit -m "Add the Python package with typed bindings"
```

---

### Task 10: FastAPI example

**Files:**
- Create: `examples/fastapi_users/{app.py,test_app.py,README.md}`
- Modify: `pyproject.toml` (`testpaths`)

**Interfaces:** consumes the Python API only. Endpoints: `POST /users {name, email} -> 201 {id}`, `GET /users/{id} -> 200 | 404 | 410`, `DELETE /users/{id} -> 200 receipt | 404`.

- [ ] **Step 1: Write the failing test** `examples/fastapi_users/test_app.py`:

```python
import importlib
import sqlite3
import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient

from aegis_shred import MasterKey


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DB", str(tmp_path / "users.db"))
    monkeypatch.setenv("AEGIS_KEYSTORE", str(tmp_path / "keys.db"))
    monkeypatch.setenv("AEGIS_MASTER_KEY", MasterKey.generate().to_base64())
    monkeypatch.syspath_prepend(str(Path(__file__).parent))
    sys.modules.pop("app", None)
    app_module = importlib.import_module("app")
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_erasure_flow(client, tmp_path):
    user_id = client.post("/users", json={"name": "Alice", "email": "alice@example.com"}).json()["id"]
    assert client.get(f"/users/{user_id}").json()["email"] == "alice@example.com"

    raw = sqlite3.connect(tmp_path / "users.db").execute("SELECT email FROM users").fetchone()[0]
    assert b"alice" not in raw

    erased = client.delete(f"/users/{user_id}")
    assert erased.status_code == 200 and erased.json()["erased"] is True
    assert client.get(f"/users/{user_id}").status_code == 410
    assert client.delete(f"/users/{user_id}").status_code == 404
    assert client.get("/users/999").status_code == 404
```

- [ ] **Step 2: Restore `testpaths`.** In `pyproject.toml` set `testpaths = ["python/tests", "examples/fastapi_users"]`. Then `uv pip install fastapi httpx` and run `python -m pytest -q examples/fastapi_users` → `ModuleNotFoundError: No module named 'app'`.

- [ ] **Step 3: Write `examples/fastapi_users/app.py`**

```python
"""A user directory where every personal field is sealed under the user's own key.

DELETE /users/{id} shreds the key. The encrypted row stays in the database (and in every
backup of it), but nobody can read it again.

Run:
    pip install aegis-shred fastapi uvicorn
    export AEGIS_MASTER_KEY="$(aegis keygen)"
    uvicorn app:app --reload
"""

import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aegis_shred import MasterKey, Shredded, Vault

DB_PATH = os.environ.get("APP_DB", "users.db")
KEYSTORE_PATH = os.environ.get("AEGIS_KEYSTORE", "aegis-keys.db")

state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["vault"] = Vault.open(KEYSTORE_PATH, MasterKey.from_env("AEGIS_MASTER_KEY"), create=True)
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name BLOB NOT NULL, email BLOB NOT NULL)")
    state["db"] = db
    yield
    db.close()


app = FastAPI(title="aegis-shred example: user directory", lifespan=lifespan)


class NewUser(BaseModel):
    name: str
    email: str


def subject(user_id: int) -> str:
    return f"user-{user_id}"


@app.post("/users", status_code=201)
def create_user(user: NewUser):
    db, vault = state["db"], state["vault"]
    cursor = db.execute("INSERT INTO users (name, email) VALUES (x'', x'')")
    user_id = cursor.lastrowid
    db.execute(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        (
            vault.seal(subject(user_id), user.name.encode(), context=f"users.name:{user_id}".encode()),
            vault.seal(subject(user_id), user.email.encode(), context=f"users.email:{user_id}".encode()),
            user_id,
        ),
    )
    db.commit()
    return {"id": user_id}


@app.get("/users/{user_id}")
def read_user(user_id: int):
    db, vault = state["db"], state["vault"]
    row = db.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "no such user")
    try:
        name = vault.unseal(row[0], context=f"users.name:{user_id}".encode()).decode()
        email = vault.unseal(row[1], context=f"users.email:{user_id}".encode()).decode()
    except Shredded:
        raise HTTPException(410, "this user's data was erased")
    return {"id": user_id, "name": name, "email": email}


@app.delete("/users/{user_id}")
def erase_user(user_id: int):
    receipt = state["vault"].shred(subject(user_id))
    if receipt is None:
        raise HTTPException(404, "no data stored for this user")
    return {"erased": True, "key_id": receipt.key_id, "shredded_at": receipt.shredded_at, "audit_seq": receipt.audit_seq}
```

- [ ] **Step 4: Write `examples/fastapi_users/README.md`**

````markdown
# Example: a user directory with real erasure

A small FastAPI app that stores each user's name and email sealed under that user's own key.
`DELETE /users/{id}` shreds the key: the encrypted row stays in the database (and in every
backup of it), but it can never be read again, and `GET` returns `410 Gone`.

```bash
pip install aegis-shred fastapi uvicorn
export AEGIS_MASTER_KEY="$(aegis keygen)"
uvicorn app:app --reload

curl -X POST localhost:8000/users -H 'content-type: application/json' \
     -d '{"name": "Alice", "email": "alice@example.com"}'      # {"id": 1}
curl localhost:8000/users/1                                     # Alice's record
curl -X DELETE localhost:8000/users/1                           # shred receipt
curl -i localhost:8000/users/1                                  # 410 Gone
```

Each field is sealed with a context such as `users.email:1`, so a blob copied into another row
or column fails to unseal instead of leaking.

Tests: `pip install pytest fastapi httpx && pytest examples/fastapi_users`.
````

- [ ] **Step 5: Run all Python tests.** `python -m pytest -q 2>&1 | tail -1` → `22 passed` (a Starlette deprecation warning about `httpx` is expected and harmless).

- [ ] **Step 6: Commit**

```bash
git add examples pyproject.toml
git commit -m "Add a FastAPI example with an erasure endpoint"
```

---

### Task 11: Benchmarks and fuzzing

**Files:**
- Create: `crates/aegis-shred/benches/throughput.rs`, `fuzz/Cargo.toml`, `fuzz/fuzz_targets/unseal.rs`
- Modify: `crates/aegis-shred/Cargo.toml`

- [ ] **Step 1: Add criterion and the bench target.** Final `crates/aegis-shred/Cargo.toml`:

```toml
[package]
name = "aegis-shred"
description = "Crypto-shredding vault: one key per data subject, so erasing a person makes their data unreadable everywhere, backups included."
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
homepage.workspace = true
readme = "README.md"
keywords = ["encryption", "crypto-shredding", "gdpr", "privacy", "erasure"]
categories = ["cryptography"]

[dependencies]
aead-stream = { version = "0.6", features = ["alloc"] }
aes-gcm = { version = "0.11", features = ["zeroize"] }
argon2 = "0.6"
base64 = "0.23"
getrandom = "0.4"
hex = "0.4"
hkdf = "0.13"
hmac = "0.13"
rusqlite = { version = "0.40", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sha2 = "0.11"
tempfile = "3"
thiserror = "2"
zeroize = "1"

[dev-dependencies]
criterion = "0.8"
proptest = "1"

[target.'cfg(unix)'.dev-dependencies]
libc = "0.2"

[[bench]]
name = "throughput"
harness = false
```

- [ ] **Step 2: Write `crates/aegis-shred/benches/throughput.rs`**

```rust
use std::io;

use aegis_shred::{MasterKey, Vault};
use criterion::{Criterion, Throughput, criterion_group, criterion_main};

fn throughput(c: &mut Criterion) {
    let dir = tempfile::TempDir::new().unwrap();
    let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();

    let record = vec![7u8; 1024];
    let sealed_record = vault.seal("user-1", &record, b"").unwrap();
    let mut group = c.benchmark_group("record_1KiB");
    group.throughput(Throughput::Elements(1));
    group.bench_function("seal", |b| {
        b.iter(|| vault.seal("user-1", &record, b"").unwrap())
    });
    group.bench_function("unseal", |b| {
        b.iter(|| vault.unseal(&sealed_record, b"").unwrap())
    });
    group.finish();

    let big = vec![7u8; 100 * 1024 * 1024];
    let sealed_big = vault.seal("user-1", &big, b"").unwrap();
    let mut group = c.benchmark_group("stream_100MiB");
    group.sample_size(10);
    group.throughput(Throughput::Bytes(big.len() as u64));
    group.bench_function("seal", |b| {
        b.iter(|| {
            vault
                .seal_stream("user-1", big.as_slice(), io::sink(), b"")
                .unwrap()
        })
    });
    group.bench_function("unseal", |b| {
        b.iter(|| {
            vault
                .unseal_stream(sealed_big.as_slice(), io::sink(), b"")
                .unwrap()
        })
    });
    group.finish();
}

criterion_group!(benches, throughput);
criterion_main!(benches);
```

- [ ] **Step 3: Measure** and keep the output for the README (Task 12):

```bash
cargo bench -p aegis-shred --bench throughput 2>&1 | grep -E "^[a-z_0-9]+/|time:|thrpt:"
sysctl -n machdep.cpu.brand_string; rustc --version
```

Planning run on an Apple M3 Pro, Rust 1.94: seal 1 KiB 8.17 µs, unseal 1 KiB 7.50 µs, seal 100 MiB 4.34 GiB/s, unseal 100 MiB 4.16 GiB/s.

- [ ] **Step 4: Write the fuzz target**

`fuzz/Cargo.toml`:

```toml
[package]
name = "aegis-shred-fuzz"
version = "0.0.0"
publish = false
edition = "2024"

[package.metadata]
cargo-fuzz = true

[dependencies]
aegis-shred = { path = "../crates/aegis-shred" }
libfuzzer-sys = "0.4"
tempfile = "3"

[[bin]]
name = "unseal"
path = "fuzz_targets/unseal.rs"
test = false
doc = false
bench = false

# Not part of the main workspace.
[workspace]
```

`fuzz/fuzz_targets/unseal.rs`:

```rust
#![no_main]

use std::sync::OnceLock;

use aegis_shred::{MasterKey, Vault, inspect_header};
use libfuzzer_sys::fuzz_target;

struct Fixture {
    _dir: tempfile::TempDir,
    vault: Vault,
    key_id: [u8; 16],
}

fn fixture() -> &'static Fixture {
    static FIXTURE: OnceLock<Fixture> = OnceLock::new();
    FIXTURE.get_or_init(|| {
        let dir = tempfile::TempDir::new().unwrap();
        let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();
        let sealed = vault.seal("fuzz", b"seed", b"").unwrap();
        let key_id = inspect_header(&sealed).unwrap().key_id;
        Fixture { _dir: dir, vault, key_id }
    })
}

fuzz_target!(|data: &[u8]| {
    let fixture = fixture();
    let mut input = data.to_vec();
    // Point the input at the real key so the fuzzer reaches the decryption loop.
    if input.len() >= 24 {
        input[8..24].copy_from_slice(&fixture.key_id);
    }
    let _ = fixture.vault.unseal(&input, b"");
});
```

- [ ] **Step 5: Run the fuzzer for one minute**

```bash
rustup toolchain install nightly --profile minimal
cargo install cargo-fuzz
cargo +nightly fuzz run unseal -- -max_total_time=60
```

Expected: ends with `Done N runs` and no crash. A crash writes an input under `fuzz/artifacts/unseal/`; reproduce it with `cargo +nightly fuzz run unseal <file>`, fix it with a regression test in `format.rs`, and rerun.

- [ ] **Step 6: Commit**

```bash
cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add crates/aegis-shred/Cargo.toml crates/aegis-shred/benches Cargo.lock fuzz/Cargo.toml fuzz/Cargo.lock fuzz/fuzz_targets
git commit -m "Add throughput benchmarks and an unseal fuzz target"
```

---

### Task 12: Documentation and landing page

**Files:**
- Replace: `README.md`
- Create: `docs/THREAT_MODEL.md`, `docs/OPERATIONS.md`, `CHANGELOG.md`, `site/index.html`

- [ ] **Step 1: Write `README.md`.** If any Task 11 number differs from the table below by more than 10%, use the new measurement and name the machine and Rust version it ran on.

````markdown
# aegis-shred

**Crypto-shredding for application data.** Every data subject (a user, a customer, a patient)
gets their own encryption key. When someone asks you to delete their data, you destroy one key,
and every copy of their data becomes unreadable: the live database, replicas, last month's
backups, the export someone forgot about.

```python
from aegis_shred import MasterKey, Vault

vault = Vault.open("keys.db", MasterKey.from_env("AEGIS_MASTER_KEY"), create=True)
blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")  # store anywhere
vault.unseal(blob, context=b"users.email")       # b'alice@example.com'
vault.shred("user-42")                           # erase user-42, everywhere, at once
vault.unseal(blob, context=b"users.email")       # raises aegis_shred.Shredded
```

A Rust core with a Python package and an `aegis` command-line tool. MIT OR Apache-2.0.

> **Status: v0.1, alpha.** The format is specified and versioned and every guarantee below has a
> test, but there has been no independent security audit yet. Read the
> [threat model](docs/THREAT_MODEL.md) before you rely on it.

## Why

Deleting one person's data is hard when copies live in backups, replicas, logs and exports you
cannot edit. GDPR Art. 17, CCPA/CPRA and India's DPDP Act all give people a right to erasure.
Crypto-shredding is the standard engineering answer: encrypt each person's data under their own
key, keep the keys in one small keystore, and erase by destroying the key. The ciphertext can
stay where it is; without the key it is noise.

Whether that satisfies a particular regulation or request is a question for your lawyers.
aegis-shred gives you the mechanism and an audit trail.

## Install

```bash
pip install aegis-shred          # Python 3.10+; prebuilt wheels for Linux, macOS, Windows
cargo add aegis-shred            # Rust library
cargo install aegis-shred-cli    # the `aegis` command (pip installs it too)
```

## How it works

```
master key (from your secret manager)
  └─ wraps one data key per subject ──────────── keystore (SQLite file)
        └─ HKDF → one key per sealed object        subject_keys · tombstones · audit log
              └─ AES-256-GCM, chunked (STREAM)
                    └─ sealed blob/file ───────── your database, S3, backups, …
```

- **`seal(subject, data, context)`** creates the subject's data key on first use and returns a
  self-describing blob: a 56-byte header (format version, key id, random salt) followed by
  authenticated chunks. Store it in any column, bucket or file. The blob names a random key id,
  never the subject.
- **`unseal(blob, context)`** looks up the key id, derives the object key and checks every chunk.
  Any modified byte, reordered or missing chunk, truncation, or a different `context` fails.
- **`shred(subject)`** deletes the subject's wrapped key in one transaction, records a tombstone
  and a hash-chained audit entry, and returns a receipt. From the next call on, in every process,
  that subject's blobs raise `Shredded`.
- The keystore stores subjects only as `HMAC(index_key, subject_id)`, so the keystore and the
  audit log do not themselves list your users.

The byte-level format is in [docs/FORMAT.md](docs/FORMAT.md). A second, independent
implementation of it in Python (using the `cryptography` package) runs in CI.

## Python guide

```python
from aegis_shred import MasterKey, Vault, Shredded, IntegrityError

key = MasterKey.from_env("AEGIS_MASTER_KEY")      # base64 of 32 bytes; `aegis keygen` makes one
# or MasterKey.from_file("/run/secrets/aegis"), or MasterKey.from_passphrase("...")
vault = Vault.open("keys.db", key, create=True)   # one vault per process; thread-safe

# Records: bind each blob to where it lives with `context`.
blob = vault.seal("user-42", b"+1 555 0100", context=b"users.phone:42")

# Files and large data: streamed in 64 KiB chunks, constant memory, atomic output.
vault.seal_file("user-42", "scan.pdf", "scan.pdf.aegis")
vault.unseal_file("scan.pdf.aegis", "scan.pdf")   # writes nothing if verification fails

# Erasure.
receipt = vault.shred("user-42")                  # ShredReceipt, or None if nothing was stored
print(receipt.key_id, receipt.shredded_at, receipt.audit_seq)
try:
    vault.unseal(blob, context=b"users.phone:42")
except Shredded:
    ...                                           # show "this data was erased"

# Backups: re-apply erasures after restoring an old keystore.
vault.export_tombstones("shreds.jsonl")
Vault.open("restored.db", key).import_tombstones("shreds.jsonl")

# Master-key rotation (old keystore backups then need the retired key).
vault.rotate_master_key(MasterKey.generate())

# Audit.
report = vault.verify_audit()                     # AuditReport(ok=True, entries=..., head=...)
seq, head = vault.audit_head()                    # anchor this outside the keystore
```

**Choose subject ids carefully.** They are compared byte for byte. Use a stable internal id such
as `user-<primary key>`, not a name or email: those change, and the same name can be written in
different Unicode forms that would count as different subjects.

Errors are all subclasses of `aegis_shred.AegisError`: `Shredded`, `UnknownKey` (blob from a
different keystore), `WrongMasterKey`, `IntegrityError`, `UnsupportedFormat`, `KeystoreError`.
Bad arguments raise `ValueError`; file problems raise the usual `OSError` subclasses.

A complete FastAPI app with an erasure endpoint is in
[examples/fastapi_users](examples/fastapi_users).

## Command line

```bash
export AEGIS_MASTER_KEY="$(aegis keygen)"       # keep it in a secret manager, not your shell history
aegis init                                      # creates ./aegis-keys.db (or --keystore PATH)
aegis seal -s user-42 contract.pdf -o contract.pdf.aegis
aegis unseal contract.pdf.aegis -o contract.pdf
aegis inspect contract.pdf.aegis                # header + key status; no master key needed
aegis shred user-42                             # asks you to type the subject id
aegis audit verify
aegis tombstones export shreds.jsonl
aegis rotate-master-key --new-key-file new.key
```

Exit codes: 3 shredded, 4 integrity failure, 5 wrong master key, 6 unknown key, 1 other errors.
See [docs/OPERATIONS.md](docs/OPERATIONS.md) for backups, rotation and multi-process use.

## Rust

```rust
use aegis_shred::{Error, MasterKey, Vault};

let vault = Vault::open_or_create("keys.db", &MasterKey::from_env("AEGIS_MASTER_KEY")?)?;
let sealed = vault.seal("user-42", b"alice@example.com", b"users.email")?;
vault.shred("user-42")?;
assert!(matches!(vault.unseal(&sealed, b"users.email"), Err(Error::Shredded { .. })));
```

`seal_stream` / `unseal_stream` work on any `Read` / `Write`.

## Guarantees and limits

Each guarantee below has a test in this repository.

- After `shred`, every object sealed for that subject fails with `Shredded`, in every process
  sharing the keystore, from the next call on.
- Tampering is detected: every single-byte change, chunk reorder, duplicate, drop, truncation,
  appended data and context mismatch is rejected.
- The deleted wrapped key's bytes are overwritten in the SQLite file.
- Raw subject ids are never written to the keystore or the audit log.
- Edits to the audit log are detected by `verify_audit()`.

It does **not** protect against a master key that was stolen before the shred together with an
old keystore copy, plaintext your app copied into logs or caches, restoring an old keystore
without importing the shred journal, or an attacker running code inside your application. The
full list is in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

**Losing the master key or the keystore loses all data.** Back them up separately.

## Performance

Measured with `cargo bench -p aegis-shred` on an Apple M3 Pro (macOS, Rust 1.94, release build):

| Operation | Result |
|---|---|
| seal a 1 KiB record (includes the keystore lookup) | 8.2 µs (~122,000 records/s, one thread) |
| unseal a 1 KiB record | 7.5 µs (~133,000 records/s) |
| seal a 100 MiB stream | 4.3 GiB/s |
| unseal a 100 MiB stream | 4.2 GiB/s |

## Repository layout

| Path | What |
|---|---|
| `crates/aegis-shred` | Rust library |
| `crates/aegis-shred-cli` | `aegis` command |
| `crates/aegis-shred-py`, `python/` | Python package |
| `examples/fastapi_users` | example web app |
| `docs/` | format, threat model, operations |
| `fuzz/` | `cargo fuzz run unseal` |

## History

This repository used to hold *Aegis*, an experimental privacy-preserving machine-learning
platform. It is archived on the [`legacy/platform`](https://github.com/Lingikaushikreddy/Aegis/tree/legacy/platform)
branch (tag `v0-platform`). aegis-shred grew out of its encrypted-vault component.

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
Security reports: see [SECURITY.md](SECURITY.md).
````

- [ ] **Step 2: Write `docs/THREAT_MODEL.md`**

```markdown
# Threat model

aegis-shred makes one promise: **after `shred(subject)`, the data sealed for that subject cannot
be decrypted by anyone, wherever copies of it are stored**, provided the conditions below hold.
This page says exactly when that is true and when it is not.

## What is protected

- **Sealed objects** (blobs and files) wherever they end up: databases, replicas, backups,
  object storage, exports, laptops.
- **Data keys**, wrapped by the master key inside the keystore.
- **Subject identity in the keystore and audit log.** Only `HMAC(index_key, subject_id)` is
  stored, so the files alone do not reveal who your users are.

## Guarantees

1. **Erasure.** Once `shred` commits, the subject's data key no longer exists in the live
   keystore. Every object sealed for the subject fails with `Shredded`, in every process that
   uses the keystore, from the next call on (keys are never cached).
2. **Confidentiality of sealed objects** against anyone without both the keystore and the
   master key: AES-256-GCM under a per-object key derived from a per-subject key.
3. **Integrity.** Any change to a sealed object (flipped bits, edited header, reordered,
   duplicated, dropped or appended chunks, truncation) or a mismatched `context` is rejected.
   Swapping two users' blobs, or moving a blob between columns, fails when contexts differ.
4. **Tamper evidence for the audit log.** Editing, inserting, reordering or deleting entries
   before the newest one is detected by `verify_audit()`.
5. **No partial plaintext from files.** `unseal_file` writes nothing unless every chunk verifies.

## Assumptions

- The **master key** was not compromised before the shred. Anyone who held the master key and a
  copy of the keystore from before the shred can still decrypt that subject's data.
- **Old keystore backups** are either kept out of reach, re-shredded with the shred journal
  after a restore (`import_tombstones`), or retired by rotating the master key and destroying
  the old one. See [OPERATIONS.md](OPERATIONS.md).
- The machine running your application is not under an attacker's control while it runs.
- Your platform's random number generator works (the library uses the OS generator).

## Not protected

| Situation | Why |
|---|---|
| Stolen master key **plus** a keystore copy from before the shred | They can unwrap the old data key. Rotate and destroy master keys to shrink this window. |
| Plaintext your application copied elsewhere | Logs, caches, search indexes, analytics, emails, error trackers. Seal at the boundary and keep plaintext out of side channels. |
| Restored keystore backup without journal import or key retirement | The restored file still contains the wrapped key. |
| Residue on disk | Deleted pages are zeroed in the SQLite file, but SQLite's temporary journal files, filesystem snapshots, and SSD wear-leveling can keep old bytes. Those bytes are wrapped keys, useless without the master key. |
| Memory of a running process | Keys are zeroed when dropped, but an attacker who can read process memory sees keys in use. |
| An attacker who can run code as your application | They can call `unseal` like your application does. |
| Traffic analysis | Sealed sizes reveal approximate plaintext sizes. `key_id` links objects that belong to the same subject (not who the subject is). |
| Whole-log rewrite | Someone with write access to the keystore can rebuild the entire audit chain or cut off its newest entries. Anchor `audit_head()` somewhere they cannot write. |
| Legal sufficiency | Whether crypto-shredding satisfies a particular regulation or request is a legal question. |

## Design choices

- **AES-256-GCM** with random 96-bit nonces only ever encrypts small key material under the
  master key. Bulk data uses a fresh HKDF-derived key per object, so nonce reuse across
  objects is impossible and per-key message limits never come into play.
- **STREAM** (as implemented by RustCrypto `aead-stream`) gives constant-memory encryption of
  large files with truncation and reordering protection.
- **One error for every integrity failure**, so an attacker probing with modified blobs learns
  nothing about which check failed.
- **No key cache**, so a shred is effective immediately across threads and processes.
- **Pseudonymous storage** (`HMAC` of subject ids) because keeping a list of erased people
  would itself be retaining personal data.

## Not yet done

- No independent security audit.
- No hardware-backed or cloud KMS master keys (planned).
```

- [ ] **Step 3: Write `docs/OPERATIONS.md`**

````markdown
# Operating aegis-shred

## The two things you must not lose

- **The master key.** Without it nothing in the keystore can be unwrapped. Keep it in a secret
  manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, 1Password, …) and inject
  it as `AEGIS_MASTER_KEY`. Generate one with `aegis keygen`.
- **The keystore file.** It holds every data key. Losing it is equivalent to shredding every
  subject at once.

Back up both, separately, and test restores.

## Where the keystore lives

- One SQLite file, opened by every process that seals or unseals. Several processes and threads
  on one host can share it safely (SQLite locking; a 5-second busy timeout).
- Forking after opening the vault (gunicorn `--preload`, Celery prefork, `multiprocessing` with
  the fork start method) is supported: a forked process opens its own SQLite connection on its
  first call. Do not fork while another thread is in the middle of a vault call.
- Put it on local disk or a volume shared by the processes of one host. Network filesystems
  with unreliable locking (some NFS setups) are not supported.
- v0.1 has no multi-host keystore. Several app servers need a shared volume with working
  locks, or a single service that owns the vault. A Postgres keystore is planned.

## Backups and the shred journal

A keystore backup taken **before** a shred still contains that subject's wrapped key. Restoring
it would bring the subject's data back. To keep erasures permanent:

1. **Keep the keystore out of your general data backups.** Back it up on its own schedule with
   short retention.
2. **Export the shred journal after every erasure** (or on a schedule) and store it alongside
   your keystore backups:
   ```bash
   aegis tombstones export shreds.jsonl
   ```
3. **After any restore, re-apply the journal before serving traffic:**
   ```bash
   aegis --keystore restored.db tombstones import shreds.jsonl
   ```
4. **Rotate the master key periodically** and destroy the old one. Backups taken before the
   rotation then need a key that no longer exists.

## Rotating the master key

```bash
aegis keygen > new.key                    # or use your secret manager
aegis rotate-master-key --new-key-file new.key
```

Rotation re-wraps every data key in one transaction; sealed objects do not change. Other
processes still holding the old key get `WrongMasterKey` ("rotated by another process") on
their next operation and must be restarted with the new key. Destroy the old key once every
process uses the new one.

Passphrase keystores rotate with `--new-passphrase` (reads `AEGIS_NEW_PASSPHRASE` or prompts).

## Erasure requests

```bash
aegis shred user-42            # asks you to type the subject id to confirm
aegis shred user-42 --yes      # for scripts
```

The command prints a receipt: the destroyed key id, the time, the audit sequence number, and
the subject hash (the Python and Rust `ShredReceipt` carries the same fields). Keep the receipt with the erasure request
ticket: the audit log's `key.shredded` entry at that sequence number holds the same key id and
subject hash, which is how you show later that the request was honoured.

Shredding a subject with no key succeeds and changes nothing. If the same person signs up
again, they get a new key; their old data stays unreadable.

## Audit log

```bash
aegis audit verify     # checks the hash chain
aegis audit show       # newest entries
aegis audit head       # "<seq> <hash>" — copy this somewhere the keystore's owner cannot edit
```

Anchoring the head regularly (a ticket, a log pipeline, a git commit) lets you detect someone
rewriting the whole chain. Per-call `data.sealed` / `data.unsealed` events are off by default;
enable them with `Vault.open(..., audit_data_access=True)` if you need access logging and can
afford one keystore write per call.

## Inspecting a file

```bash
aegis inspect invoice.pdf.aegis
```

Shows the format version, chunk size, key id, and whether the key is present, shredded (and
when), or unknown to this keystore. It needs no master key.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | other error (missing file, bad argument, aborted confirmation) |
| 2 | usage error |
| 3 | the data's key was shredded |
| 4 | integrity failure (tampered data, wrong context, broken audit chain) |
| 5 | wrong master key |
| 6 | the data belongs to a different keystore |
````

- [ ] **Step 4: Write `CHANGELOG.md`** (the date is set at release, Task 15)

```markdown
# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

First release of **aegis-shred**, which replaces the archived Aegis v0 platform on `main`.

### Added
- Rust library `aegis-shred`: per-subject data keys, sealed object format v1 (AES-256-GCM,
  HKDF-SHA256, STREAM), SQLite keystore with master-key wrapping (raw key or Argon2id
  passphrase), `shred`, master-key rotation, shred journal export/import, hash-chained audit log.
- `aegis` command-line tool (`aegis-shred-cli` on crates.io, also installed by the Python package).
- Python package `aegis-shred` with typed bindings and wheels for Linux, macOS and Windows.
- FastAPI example, format specification, threat model and operations guide.

### Removed
- The Aegis v0 platform (federated-learning server, gateway, Next.js site, mobile shells).
  It is preserved on the `legacy/platform` branch and the `v0-platform` tag.

[0.1.0]: https://github.com/Lingikaushikreddy/Aegis/releases/tag/v0.1.0
```

- [ ] **Step 5: Write `site/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aegis-shred — crypto-shredding for application data</title>
<meta name="description" content="One encryption key per data subject. Erase a person by destroying one key; every copy of their data, backups included, becomes unreadable. Rust core, Python package, CLI.">
<style>
  :root {
    --bg: #fbfaf7; --fg: #1c1b19; --muted: #5f5b53; --line: #e3dfd6;
    --code-bg: #f1eee7; --accent: #0f6b5c; --accent-fg: #ffffff;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #121211; --fg: #ecebe7; --muted: #a29d93; --line: #2c2b28;
            --code-bg: #1c1b19; --accent: #5cc4ae; --accent-fg: #0b1a17; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.6 var(--sans); }
  main { max-width: 760px; margin: 0 auto; padding: 56px 20px 80px; }
  h1 { font-size: clamp(2rem, 6vw, 2.8rem); line-height: 1.1; margin: 0 0 12px; letter-spacing: -0.02em; }
  h2 { font-size: 1.15rem; margin: 48px 0 12px; }
  p, li { color: var(--fg); }
  .lede { font-size: 1.2rem; color: var(--muted); margin: 0 0 28px; }
  .badge { display: inline-block; font: 600 12px/1 var(--mono); color: var(--muted);
           border: 1px solid var(--line); border-radius: 999px; padding: 6px 10px; margin-bottom: 20px; }
  pre { background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
        padding: 16px 18px; overflow-x: auto; font: 14px/1.55 var(--mono); margin: 0 0 16px; }
  code { font-family: var(--mono); font-size: 0.92em; }
  .cta { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0 8px; }
  .cta a { text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; }
  .primary { background: var(--accent); color: var(--accent-fg); }
  .secondary { border: 1px solid var(--line); color: var(--fg); }
  ul { padding-left: 1.2em; }
  li { margin: 6px 0; }
  a { color: var(--accent); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
  .card { border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .card strong { display: block; margin-bottom: 4px; }
  .card span { color: var(--muted); font-size: 0.95rem; }
  footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.9rem; }
</style>
</head>
<body>
<main>
  <span class="badge">v0.1 · alpha · MIT OR Apache-2.0</span>
  <h1>Erase a person's data by destroying one key.</h1>
  <p class="lede">aegis-shred gives every user their own encryption key. Shred the key and every
  copy of their data (database, replicas, backups, exports) becomes unreadable at once.</p>
  <div class="cta">
    <a class="primary" href="https://github.com/Lingikaushikreddy/Aegis#readme">Read the docs</a>
    <a class="secondary" href="https://github.com/Lingikaushikreddy/Aegis">GitHub</a>
  </div>

  <h2>Install</h2>
  <pre><code>pip install aegis-shred        # Python 3.10+, Linux · macOS · Windows
cargo add aegis-shred          # Rust
cargo install aegis-shred-cli  # the `aegis` command</code></pre>

  <h2>Five lines</h2>
  <pre><code>from aegis_shred import MasterKey, Vault

vault = Vault.open("keys.db", MasterKey.from_env("AEGIS_MASTER_KEY"), create=True)
blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")
vault.shred("user-42")
vault.unseal(blob, context=b"users.email")   # raises Shredded</code></pre>

  <h2>What you get</h2>
  <div class="grid">
    <div class="card"><strong>Per-subject keys</strong><span>Created on first use, wrapped by your master key in a small SQLite keystore.</span></div>
    <div class="card"><strong>Tamper-evident blobs</strong><span>AES-256-GCM in authenticated chunks. Edits, reordering, truncation and wrong context all fail.</span></div>
    <div class="card"><strong>Instant erasure</strong><span>No key cache: a shred takes effect in every process on the next call.</span></div>
    <div class="card"><strong>Audit trail</strong><span>Hash-chained log of key creation, shreds and rotations, without raw user ids.</span></div>
    <div class="card"><strong>Backups handled</strong><span>Shred journal re-applies erasures to restored keystores; rotation retires old copies.</span></div>
    <div class="card"><strong>Open format</strong><span>Byte-level spec with test vectors and an independent Python implementation in CI.</span></div>
  </div>

  <h2>Know the limits</h2>
  <ul>
    <li>A master key stolen <em>before</em> a shred, together with an old keystore copy, can still decrypt.</li>
    <li>Plaintext your application copied into logs, caches or analytics is out of reach.</li>
    <li>No independent security audit yet. Read the <a href="https://github.com/Lingikaushikreddy/Aegis/blob/main/docs/THREAT_MODEL.md">threat model</a>.</li>
  </ul>

  <footer>
    Built by <a href="https://github.com/Lingikaushikreddy">Lingikaushikreddy</a>.
    <a href="https://github.com/Lingikaushikreddy/Aegis/blob/main/docs/FORMAT.md">Format spec</a> ·
    <a href="https://github.com/Lingikaushikreddy/Aegis/blob/main/docs/OPERATIONS.md">Operations guide</a> ·
    <a href="https://github.com/Lingikaushikreddy/Aegis/security/advisories/new">Report a vulnerability</a>
  </footer>
</main>
</body>
</html>
```

- [ ] **Step 6: Check every README guarantee against its test**

```bash
cargo test -p aegis-shred -- shred_makes_every_object_of_the_subject_unreadable every_single_byte_flip_is_rejected \
  reordered_duplicated_and_dropped_chunks_are_rejected truncation_anywhere_is_rejected appended_bytes_are_rejected \
  wrong_context_is_rejected shredded_key_bytes_are_overwritten_in_the_keystore_file \
  audit_log_records_lifecycle_and_detects_tampering 2>&1 | grep -E "^test |test result: ok. [1-9]"
```

Expected: eight `... ok` lines (five from the unit tests, three from `tests/vault.rs`). Then open `site/index.html` in a browser at desktop width and at 375 px: no horizontal scrolling, readable in light and dark mode.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/THREAT_MODEL.md docs/OPERATIONS.md CHANGELOG.md site
git commit -m "Write the README, threat model, operations guide and landing page"
```

---

### Task 13: Continuous integration

**Files:**
- Create: `deny.toml`, `.github/workflows/ci.yml`

- [ ] **Step 1: Write `deny.toml`** and run `cargo deny check` (install with `cargo install cargo-deny` if missing). Expected: `advisories ok, bans ok, licenses ok, sources ok`.

```toml
[graph]
all-features = false

[advisories]
version = 2
yanked = "deny"

[licenses]
version = 2
allow = [
    "MIT",
    "Apache-2.0",
    "Apache-2.0 WITH LLVM-exception",
    "Unicode-3.0",
    "Zlib",
]
confidence-threshold = 0.9

[bans]
multiple-versions = "allow"
wildcards = "deny"
allow-wildcard-paths = true

[sources]
unknown-registry = "deny"
unknown-git = "deny"
```

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

env:
  CARGO_TERM_COLOR: always

jobs:
  rust:
    name: Rust (${{ matrix.os }})
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: Swatinem/rust-cache@v2
      - name: Format
        if: matrix.os == 'ubuntu-latest'
        run: cargo fmt --all --check
      - name: Clippy
        run: cargo clippy --workspace --all-targets -- -D warnings
      - name: Test
        run: cargo test

  msrv:
    name: MSRV (Rust 1.85)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@1.85
      - uses: Swatinem/rust-cache@v2
      - run: cargo check --workspace --lib --bins

  deny:
    name: Licenses and advisories
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: EmbarkStudios/cargo-deny-action@v2

  python:
    name: Python (${{ matrix.os }})
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - name: Build and install the wheel
        shell: bash
        run: |
          python -m pip install --upgrade pip maturin
          maturin build --release --out dist
          python -m pip install --no-index --find-links dist aegis-shred
          python -m pip install pytest cryptography fastapi httpx
      - name: Test
        run: python -m pytest -q
```

- [ ] **Step 3: Validate the YAML locally**

```bash
python3 -c "import yaml; print(list(yaml.safe_load(open('.github/workflows/ci.yml'))['jobs']))"
```

Expected: `['rust', 'msrv', 'deny', 'python']`.

- [ ] **Step 4: Commit, then push and open the PR (ask Kaushik first)**

```bash
git add deny.toml .github/workflows/ci.yml
git commit -m "Add CI: Rust on three platforms, MSRV, cargo-deny, Python tests"
git push -u origin refocus/aegis-shred
gh pr create --base main --head refocus/aegis-shred --title "Refocus Aegis as aegis-shred v0.1" --body-file - <<'EOF'
## What
Replaces the archived Aegis v0 platform (kept on `legacy/platform`, tag `v0-platform`) with
**aegis-shred**: per-subject encryption keys so erasing a person makes every copy of their data
unreadable. Rust library, `aegis` CLI, Python package, docs, CI.

## Why
The v0 code was mostly stubs and the site made claims that were not true. See
`docs/superpowers/specs/2026-09-30-aegis-shred-design.md`.

## How to review
Start with `docs/FORMAT.md` and `docs/THREAT_MODEL.md`, then `crates/aegis-shred/src/vault.rs`.
EOF
```

- [ ] **Step 5: Watch CI until it is green**

```bash
gh pr checks --watch
```

Expected: `Rust (ubuntu-latest)`, `Rust (macos-latest)`, `Rust (windows-latest)`, `MSRV (Rust 1.85)`, `Licenses and advisories`, and the three `Python (...)` jobs pass. On failure: `gh run view --log-failed`, fix, commit, push.

---

### Task 14: Release workflow (built on every packaging PR, publishes only on tags)

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write `.github/workflows/release.yml`**

```yaml
name: Release

# Tag pushes (v*) build and publish. Pull requests that touch packaging, and manual runs,
# only build; every publish job requires a v* tag.
on:
  push:
    tags: ["v*"]
  pull_request:
    paths:
      - "Cargo.toml"
      - "Cargo.lock"
      - "pyproject.toml"
      - "crates/**"
      - "python/**"
      - ".github/workflows/release.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  wheels:
    name: Wheel ${{ matrix.os }} ${{ matrix.target }} ${{ matrix.manylinux }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - { os: ubuntu-latest, target: x86_64, manylinux: auto, smoke: true }
          - { os: ubuntu-latest, target: aarch64, manylinux: auto, smoke: false }
          - { os: ubuntu-latest, target: x86_64, manylinux: musllinux_1_2, smoke: false }
          - { os: macos-latest, target: x86_64, manylinux: "", smoke: false }
          - { os: macos-latest, target: aarch64, manylinux: "", smoke: true }
          - { os: windows-latest, target: x64, manylinux: "", smoke: true }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - uses: PyO3/maturin-action@v1
        with:
          target: ${{ matrix.target }}
          manylinux: ${{ matrix.manylinux }}
          args: --release --out dist
      - name: Smoke-test the wheel
        if: matrix.smoke
        shell: bash
        run: |
          python -m pip install --no-index --find-links dist aegis-shred
          python - <<'PY'
          import os, tempfile, aegis_shred as a
          vault = a.Vault.open(os.path.join(tempfile.mkdtemp(), "k.db"), a.MasterKey.generate(), create=True)
          blob = vault.seal("u", b"ok")
          assert vault.unseal(blob) == b"ok"
          vault.shred("u")
          try:
              vault.unseal(blob)
          except a.Shredded:
              print("wheel ok")
          else:
              raise SystemExit("shred did not take effect")
          PY
          aegis --version
      - uses: actions/upload-artifact@v7
        with:
          name: wheel-${{ matrix.os }}-${{ matrix.target }}-${{ matrix.manylinux || 'native' }}
          path: dist

  sdist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: PyO3/maturin-action@v1
        with:
          command: sdist
          args: --out dist
      - uses: actions/upload-artifact@v7
        with:
          name: sdist
          path: dist

  publish-pypi:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [wheels, sdist]
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          path: dist
          merge-multiple: true
      - uses: pypa/gh-action-pypi-publish@release/v1

  publish-crates:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [wheels, sdist]
    runs-on: ubuntu-latest
    environment: crates-io
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@stable
      - uses: rust-lang/crates-io-auth-action@v1
        id: auth
      - name: Publish crates (versions already on crates.io are skipped)
        env:
          CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
        run: |
          for crate in aegis-shred aegis-shred-cli; do
            version=$(cargo metadata --no-deps --format-version 1 | jq -r ".packages[] | select(.name == \"$crate\") | .version")
            if curl -sf -A "aegis-shred release (github.com/Lingikaushikreddy/Aegis)" "https://crates.io/api/v1/crates/$crate/$version" > /dev/null; then
              echo "$crate $version is already on crates.io"
            else
              cargo publish -p "$crate"
            fi
          done

  github-release:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [publish-pypi, publish-crates]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v7
      - uses: actions/download-artifact@v8
        with:
          path: dist
          merge-multiple: true
      - name: Release notes from CHANGELOG.md
        run: |
          version="${GITHUB_REF_NAME#v}"
          awk -v v="$version" 'index($0, "## [" v "]") == 1 {f = 1; next} /^## \[/ {f = 0} f' CHANGELOG.md > notes.md
          test -s notes.md
      - uses: softprops/action-gh-release@v3
        with:
          body_path: notes.md
          files: dist/*
```

The `pull_request` trigger builds the wheel matrix and sdist on this PR and on future packaging changes; nothing publishes without a `v*` tag.

- [ ] **Step 2: Validate and push (ask first)**

```bash
python3 -c "import yaml; print(list(yaml.safe_load(open('.github/workflows/release.yml'))['jobs']))"
git add .github/workflows/release.yml
git commit -m "Add the release workflow: wheels, sdist, PyPI and crates.io publishing"
git push
gh pr checks --watch
```

Expected: jobs `['wheels', 'sdist', 'publish-pypi', 'publish-crates', 'github-release']`; on the PR, the six `Wheel …` jobs and `sdist` pass (each smoke-tested wheel prints `wheel ok`), and the publish jobs show as skipped.

- [ ] **Step 3: Inspect the artifacts**

```bash
run=$(gh run list --workflow release.yml --branch refocus/aegis-shred --limit 1 --json databaseId --jq '.[0].databaseId')
gh run download "$run" --dir /tmp/aegis-wheels && find /tmp/aegis-wheels -type f | sort && rm -rf /tmp/aegis-wheels
```

Expected: six wheels named `aegis_shred-0.1.0-cp310-abi3-…` (manylinux x86_64 and aarch64, musllinux x86_64, macOS x86_64 and arm64, win_amd64) and `aegis_shred-0.1.0.tar.gz`.

---

### Task 15: Launch v0.1.0

Every step here acts on Kaushik's accounts or public infrastructure. Do each only after he says yes.

- [ ] **Step 1: Date the release.** In `CHANGELOG.md` replace `## [0.1.0] - Unreleased` with `## [0.1.0] - YYYY-MM-DD` (the release day). Commit `Release 0.1.0`, push, wait for green checks.

- [ ] **Step 2: Merge.** Kaushik merges the PR (or tells you to run `gh pr merge --merge`). Then `git switch main && git pull`.

- [ ] **Step 3: Point Vercel at `site/`.** Until this happens, aegis-khaki.vercel.app keeps serving the old site with the false claims. With the Vercel tools: find the project behind `aegis-khaki.vercel.app` (`list_teams`, `list_projects`), read it (`get_project`), and show Kaushik the planned change: root directory `site`, framework preset "Other", no build command, no install command, output directory `.`. After his yes, apply it (`update_project`), redeploy production from `main`, and confirm with `web_fetch_vercel_url` that the page title is `aegis-shred — crypto-shredding for application data`.

- [ ] **Step 4: GitHub repository details** (after a yes):

```bash
gh repo edit Lingikaushikreddy/Aegis \
  --description "Crypto-shredding vault: one key per user, so erasing a person makes their data unreadable everywhere, backups included. Rust core, Python package, CLI." \
  --homepage "https://aegis-khaki.vercel.app" \
  --add-topic crypto-shredding --add-topic gdpr --add-topic right-to-erasure --add-topic python \
  --add-topic pyo3 --add-topic sqlite --remove-topic federated-learning --remove-topic nextjs
gh api -X PUT repos/Lingikaushikreddy/Aegis/environments/pypi
gh api -X PUT repos/Lingikaushikreddy/Aegis/environments/crates-io
```

- [ ] **Step 5: PyPI trusted publisher (Kaushik, about 2 minutes).** At https://pypi.org/manage/account/publishing/ add a pending publisher: PyPI project name `aegis-shred`, owner `Lingikaushikreddy`, repository `Aegis`, workflow `release.yml`, environment `pypi`.

- [ ] **Step 6: First crates.io publish (Kaushik, about 3 minutes).** crates.io only allows trusted publishing for crates that already exist ("initial publish requires an API token"). Kaushik creates a token at https://crates.io/settings/tokens with scopes `publish-new` and `publish-update` and crate pattern `aegis-shred*`, then runs `cargo login` in his own terminal (not through this session, so the token never enters the transcript). After his go-ahead:

```bash
cargo publish -p aegis-shred
cargo publish -p aegis-shred-cli
```

Then, for each crate on crates.io → Settings → Trusted Publishing, add GitHub repository `Lingikaushikreddy/Aegis`, workflow `release.yml`, environment `crates-io`. Kaushik revokes the token afterwards (`cargo logout` plus deleting it on crates.io).

- [ ] **Step 7: Tag and release (after a yes)**

```bash
git switch main && git pull
git tag -a v0.1.0 -m "aegis-shred 0.1.0"
git push origin v0.1.0
gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: wheels and sdist build, `publish-pypi` uploads, `publish-crates` prints `aegis-shred 0.1.0 is already on crates.io` for both crates, and `github-release` creates the release with notes from `CHANGELOG.md`.

- [ ] **Step 8: Verify as a stranger would**

```bash
uv venv --python 3.12 /tmp/aegis-pypi && VIRTUAL_ENV= uv pip install --python /tmp/aegis-pypi/bin/python aegis-shred
/tmp/aegis-pypi/bin/python - <<'PY'
import os, tempfile
from aegis_shred import MasterKey, Shredded, Vault
vault = Vault.open(os.path.join(tempfile.mkdtemp(), "keys.db"), MasterKey.generate(), create=True)
blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")
assert vault.unseal(blob, context=b"users.email") == b"alice@example.com"
vault.shred("user-42")
try:
    vault.unseal(blob, context=b"users.email")
except Shredded:
    print("PyPI install works")
PY
/tmp/aegis-pypi/bin/aegis --version
cargo install aegis-shred-cli --root /tmp/aegis-cargo && /tmp/aegis-cargo/bin/aegis --version
rm -rf /tmp/aegis-pypi /tmp/aegis-cargo
gh release view v0.1.0
```

Expected: `PyPI install works`, `aegis 0.1.0` twice, and a release listing seven assets.
