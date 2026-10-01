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

Measured with `cargo bench -p aegis-shred` on an Apple M3 Pro laptop (macOS, Rust 1.94, release
build). Ranges are the spread across four runs on a machine doing other work; record operations
include a SQLite keystore lookup, which makes them sensitive to load.

| Operation | Result |
|---|---|
| seal a 1 KiB record | 8.2–11.4 µs (about 90,000–120,000 records/s on one thread) |
| unseal a 1 KiB record | 7.5–12.8 µs (about 80,000–130,000 records/s) |
| seal a 100 MiB stream | 4.2–4.3 GiB/s |
| unseal a 100 MiB stream | 4.1–4.2 GiB/s |

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
