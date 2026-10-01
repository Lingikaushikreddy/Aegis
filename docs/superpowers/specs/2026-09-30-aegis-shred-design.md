# aegis-shred v0.1 — Design Spec

- **Date:** 2026-09-30
- **Status:** Draft for review
- **Repo:** github.com/Lingikaushikreddy/Aegis (branch `refocus/aegis-shred`)

## 1. Brief

### What Kaushik asked for
- Make Aegis useful to developers in the open world: something they **install** and use.
- Core job: **crypto-shredding** — one encryption key per data subject, so erasing a person means destroying one key and every copy of their data (including backups) becomes unreadable.
- Archive the current platform (FL server, gateway, Next.js site, mobile shells); refocus `main` on the package.
- Done = **v0.1.0 published** on PyPI and crates.io.

### Assumptions (confirmed during brainstorming)
- Primary users: Python backend developers (Django/FastAPI/Flask) storing personal data in Postgres/S3/files. Rust users second.
- Package name `aegis-shred` (free on PyPI and crates.io on 2026-09-30; `aegis` and `aegis-vault` are taken on both). Python import `aegis_shred`. CLI command `aegis`.
- The committed `certs/key.pem` is a self-signed `localhost` dev cert: removing it from `main`, ignoring it, and declaring it compromised is sufficient; no history rewrite.
- The existing Rust AES-GCM/streaming code is the starting point; the on-disk format changes.

### Success criteria
1. `pip install aegis-shred` works on macOS (x86_64, arm64), Linux (x86_64, aarch64, glibc and musl x86_64) and Windows x64 without a Rust toolchain, for Python ≥ 3.10.
2. A stranger can seal a user's record in ~5 lines of Python, following only the README.
3. `aegis shred user-42` (or `vault.shred("user-42")`) makes every blob sealed for that subject fail with `Shredded`, in every process sharing the keystore, immediately.
4. Every security claim in the README is backed by a test in the repo.

## 2. Scope

### In v0.1
- Rust core library `aegis-shred`.
- CLI `aegis` (crate `aegis-shred-cli`; also shipped inside the Python wheel).
- Python package `aegis-shred` (PyO3, abi3 wheels).
- Local SQLite keystore; master key from raw key (env var / file / base64) or passphrase (Argon2id).
- Sealed-object format v1 (records and multi-GB streams), shredding, shred journal, master-key rotation, hash-chained audit log.
- FastAPI example, docs, static landing page, CI, release automation.

### Not in v0.1
Cloud KMS backends (AWS/GCP/HashiCorp Vault), Postgres keystore, OS keychain, mobile (Swift/Kotlin) bindings, federated learning / differential privacy, any hosted service, searchable encryption, key escrow. The internal `keystore` boundary (§5.4) is kept narrow so a Postgres or KMS backend can be added in v0.2 without changing the public API.

## 3. Stage 0 — Cleanup and archive (done first)

1. Create branch `legacy/platform` from current `origin/main` and add one commit:
   - README rewritten as an archive notice: "Archived — superseded by aegis-shred on `main`", an honest list of what the archived code does and does not do; the "84/84 tests / Status: PASSED / verified DP / turnkey HIPAA/GDPR" claims removed.
   - Remove the entire Next.js marketing frontend (`app/`, `components/`, `public/`, `lib/`, Node/Next/Tailwind/ESLint config, `package*.json`, `PRD_AEGIS_FRONTEND.md`, `FRONTEND_DEVELOPMENT_COMPLETE.md`). Found during planning: beyond the invented testimonials, nearly every page presents real organizations (Mayo Clinic, JPMorgan Chase, NHS Digital, Barclays, HDFC Bank, Emirates NBD, Reliance Jio, DHA) as customers or POC prospects with real-looking contact emails, and claims certifications that do not exist (SOC 2 certified/compliant, FedRAMP Authorized, NHS Digital-approved integrator). Scrubbing line by line is not worth it for an archive.
   - Remove `certs/*.pem` (compromised key).
   - Add the missing `import numpy as np` in `aegis-server/aegis_server/strategy.py`.
   - Tag that commit `v0-platform`; push the branch and the tag.
2. The live site at aegis-khaki.vercel.app keeps serving the old frontend until the Vercel project is repointed (§9); that repoint happens when the PR merges.
3. On `refocus/aegis-shred`: remove the platform code (Next.js app, `components/`, `public/`, `aegis-core/`, `aegis-server/`, `aegis-gateway/`, `aegis-engine/`, `android/`, `ios/`, old `docs/*`, root test scripts, `test_data_ingestion/`, `certs/`, `scripts/`, `Makefile`, `requirements.txt`, Node config files). Add `certs/` and `*.pem` to `.gitignore`.
4. `SECURITY.md` states the previously committed `certs/key.pem` (self-signed, CN=localhost, O=Vaulted) is compromised and must never be used.
5. Changes reach `main` through a pull request from `refocus/aegis-shred`; Kaushik merges.
6. All commits authored as Lingikaushikreddy with no AI attribution trailers.
7. Not touched: the stale Aegis copy inside the home-directory git repo (`~/aegis-*`).

## 4. Repository layout (`main` after refocus)

```
Aegis/
├── Cargo.toml                    # workspace
├── crates/
│   ├── aegis-shred/              # core library (crates.io: aegis-shred)
│   ├── aegis-shred-cli/          # bin `aegis` + `pub fn run(args) -> i32` (crates.io: aegis-shred-cli)
│   └── aegis-shred-py/           # PyO3 extension `aegis_shred._native` (not published to crates.io)
├── python/
│   ├── aegis_shred/              # __init__.py, _native.pyi, py.typed, __main__.py
│   └── tests/                    # pytest
├── pyproject.toml                # maturin; console script `aegis = aegis_shred.__main__:main`
├── examples/fastapi_users/       # sealed emails; DELETE /users/{id} shreds
├── docs/
│   ├── FORMAT.md                 # byte-level format spec
│   ├── THREAT_MODEL.md
│   ├── OPERATIONS.md             # backups, rotation, shred journal, multi-process
│   └── superpowers/specs/        # this document
├── site/index.html               # static landing page
├── fuzz/                         # cargo-fuzz target (not a workspace member)
├── .github/workflows/{ci,release}.yml
├── deny.toml
├── LICENSE-MIT, LICENSE-APACHE   # dual license "MIT OR Apache-2.0"
├── SECURITY.md, CHANGELOG.md, README.md
```

## 5. Core design

### 5.1 Keys

| Key | Size | Origin | Stored as |
|---|---|---|---|
| Master key (KEK) | 32 B | Raw (env/file/base64) or Argon2id(passphrase, salt) | Never stored. A check value is stored. |
| Index key | 32 B | Random at keystore creation | Wrapped by KEK in `meta`. Survives KEK rotation (rewrapped, not regenerated). |
| Data key (DEK), one per subject | 32 B | Random on first `seal` for a subject | Wrapped by KEK in `subject_keys` |
| Object key, one per sealed object | 32 B | `HKDF-SHA256(ikm=DEK, salt=object_salt, info="aegis-shred/v1/object" ‖ key_id)` | Never stored |

- `key_id`: 16 random bytes per DEK. Appears in sealed objects; carries no subject identity.
- `subject_hash = HMAC-SHA256(index_key, UTF-8(subject_id))`. The keystore and audit log store only `subject_hash`, never a raw subject id.
- Wrapping (DEK, index key, check value): `nonce(12) ‖ AES-256-GCM(KEK, nonce, plaintext, aad)` with domain-separated AAD:
  - DEK: `"aegis-shred/v1/dek" ‖ key_id ‖ subject_hash`
  - Index key: `"aegis-shred/v1/index-key"`
  - Check value: plaintext `"aegis-shred kek check"`, AAD `"aegis-shred/v1/kek-check"`. Failure to unwrap ⇒ `WrongMasterKey`.
- Argon2id parameters: m = 64 MiB, t = 3, p = 1 (RFC 9106 second recommended option); salt 16 B. Parameters and salt stored in `meta` so they can change later.
- Subject id rules: non-empty, ≤ 256 bytes UTF-8. Otherwise `ValueError` / `InvalidArgument`.
- All secret buffers use `zeroize` on drop.

### 5.2 Sealed object format v1

Header (56 bytes, fixed):

| Offset | Size | Field | Value |
|---|---|---|---|
| 0 | 4 | magic | `"AEGS"` |
| 4 | 1 | version | `1` |
| 5 | 1 | algorithm | `1` = AES-256-GCM, HKDF-SHA256, STREAM-BE32 |
| 6 | 1 | chunk_size_log2 | writer uses `16` (64 KiB); reader accepts 12..=24 |
| 7 | 1 | reserved | `0` (reader rejects non-zero) |
| 8 | 16 | key_id | |
| 24 | 32 | object_salt | random |

Body: STREAM construction (RustCrypto `aead::stream::StreamBE32` over AES-256-GCM with the object key). Nonce = 7-byte zero prefix ‖ 32-bit big-endian chunk counter ‖ 1-byte last-chunk flag. The zero prefix is safe because every object has its own key.

- Every chunk's AAD = `header(56 B) ‖ context`. `context` is an optional caller-supplied byte string (e.g. `b"users.email:42"`), not stored in the object; the same context must be supplied to unseal.
- Non-final chunks carry exactly `chunk_size` plaintext bytes (ciphertext `chunk_size + 16`). Exactly one final chunk exists and carries 0..=`chunk_size` bytes; it is empty only when the whole plaintext is empty.
- Writer buffers one chunk ahead to know which chunk is last. Reader reads `chunk_size + 16` bytes, peeks for more data, and uses `decrypt_last` when none follows. A final segment shorter than 16 bytes is an integrity failure.
- Overhead: 56 + 16 × number_of_chunks bytes (72 bytes for a small record).
- Detected as `IntegrityError`: bit flips anywhere, header edits (other than magic/version/algorithm/reserved/chunk size, which raise `UnsupportedFormat`), chunk reordering/duplication/removal, truncation at any point including chunk boundaries, appended data, wrong context. An object unsealed against a different keystore raises `UnknownKey` (its key_id is not there).
- `docs/FORMAT.md` is the normative byte-level spec; `tests/vectors/` holds known-answer vectors (fixed DEK, salt, plaintext, context → exact bytes).

### 5.3 Keystore (SQLite)

Connection settings: `PRAGMA secure_delete = ON`, `PRAGMA journal_mode = DELETE` (no WAL), busy timeout 5 s. Key-mutating operations use `BEGIN IMMEDIATE`. Keystore initialization also runs inside `BEGIN IMMEDIATE`, so many processes opening with `create=True` at once converge on one keystore, and an unrelated SQLite database is never modified.

```sql
CREATE TABLE meta (
  name  TEXT PRIMARY KEY,
  value BLOB NOT NULL
); -- schema_version, kek_kind ('raw'|'passphrase'), kdf_salt, kdf_params,
   -- kek_check, wrapped_index_key, created_at

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
);
```

- First `seal` for a subject creates its DEK: read; if absent, take `BEGIN IMMEDIATE`, read again, insert only if still absent. Concurrent first-seals across processes converge on one key.
- A process forked after opening the vault (gunicorn `--preload`, Celery prefork) reopens its own SQLite connection on first use and never touches the parent's (SQLite forbids sharing a connection across `fork()`).
- Creating a keystore in a directory that does not exist fails with `NotFound`.
- No in-memory DEK cache: every `seal`/`unseal` reads the keystore, so a shred in one process is effective in all others immediately. Cost is one indexed SQLite read plus one AES-GCM unwrap per call.
- Opening a keystore with the wrong kind of master key (raw vs passphrase) ⇒ `WrongMasterKey` with an explanatory message.

### 5.4 Internal boundaries

- `format` — header encode/decode, STREAM seal/unseal over `Read`/`Write`. Pure; no I/O beyond the given reader/writer.
- `keys` — master key derivation, wrap/unwrap, HKDF, HMAC.
- `keystore` — the storage boundary: a small set of functions over a SQLite connection (open/configure, schema, meta get/put, key insert/lookup by subject or key_id, delete, tombstones, audit append/read, `key_status`). Holds wrapped bytes only; unwrapping happens in `keys`, orchestration in `vault`. It is a concrete module rather than a trait in v0.1 (one backend); the trait is extracted when the second backend lands.
- `audit` — event types, hash-chain computation, verification.
- `vault` — the public API composing the above.

### 5.5 Shredding semantics

- `shred(subject)`, in one `IMMEDIATE` transaction: delete the `subject_keys` row, insert tombstone `(key_id, shredded_at)`, append audit event `key.shredded` with `subject_hash` and `key_id`. Returns `ShredReceipt { subject_hash, key_id, shredded_at, audit_seq }`.
- Shredding a subject with no key returns `None` (an erasure request for someone never stored succeeds trivially); no audit event.
- After a shred, `unseal` of that subject's objects ⇒ `Shredded` (key_id found in `tombstones`). A key_id in neither table ⇒ `UnknownKey`.
- A later `seal` for the same subject creates a fresh DEK (e.g. the person signs up again). Old objects stay unreadable.
- Tombstones store only `key_id` and time — no subject identifier.

### 5.6 Backups, shred journal, rotation

- **Shred journal:** `export_tombstones(path)` writes JSON Lines `{"key_id": "<hex>", "shredded_at": <unix>}`. `import_tombstones(path)` inserts missing tombstones and deletes any `subject_keys` row with a matching `key_id` (re-applies erasures after restoring an old keystore backup); appends audit event `tombstones.imported` with counts.
- **Master-key rotation:** `rotate_master_key(new)` in one transaction: unwrap every DEK and the index key with the old KEK, rewrap with the new KEK, write new check value / kdf salt / kek_kind, append `kek.rotated`. Old keystore backups then require the retired KEK; destroying it retires them.
- `docs/OPERATIONS.md` states: keep the keystore out of general data backups; back it up separately with short retention; after restoring, import the latest shred journal; rotate the KEK periodically and destroy old ones.

### 5.7 Audit log

- Events: `keystore.created`, `key.created`, `key.shredded`, `kek.rotated`, `tombstones.imported`; opt-in (`audit_data_access=True`): `data.sealed`, `data.unsealed`.
- `hash_n = SHA-256(prev_hash ‖ u64be(seq) ‖ i64be(ts) ‖ lp(event) ‖ lp(subject_hash) ‖ lp(key_id) ‖ lp(detail))`, where `lp(x) = u32be(len(x)) ‖ x` and an absent field is encoded as zero length. Genesis `prev_hash` = 32 zero bytes.
- `verify_audit()` → `AuditReport { ok, entries, head, first_bad_seq }`; detects edited, inserted, reordered, or deleted entries before the head.
- Stated limits: anyone with write access to the file can rewrite the whole chain or truncate its tail. `audit head` prints `(seq, hash)` so operators can anchor it externally (ticket, log pipeline, git).

## 6. Public API

### 6.1 Python

```python
from aegis_shred import Vault, MasterKey, Shredded

key = MasterKey.from_env("AEGIS_MASTER_KEY")      # base64 of 32 bytes
vault = Vault.open("keys.db", key, create=True)   # create=False (default) requires an existing keystore

blob = vault.seal("user-42", b"alice@example.com", context=b"users.email")
vault.unseal(blob, context=b"users.email")        # -> b"alice@example.com"

vault.seal_file("user-42", "scan.pdf", "scan.pdf.aegis", context=b"")    # streaming, constant memory
vault.unseal_file("scan.pdf.aegis", "scan.pdf", context=b"")

vault.has_key("user-42")                          # -> bool
receipt = vault.shred("user-42")                  # -> ShredReceipt | None
vault.unseal(blob, context=b"users.email")        # raises Shredded

vault.verify_audit()                              # -> AuditReport
vault.audit_head()                                # -> (seq: int, hash_hex: str)
vault.rotate_master_key(MasterKey.from_passphrase("correct horse ..."))
vault.export_tombstones("shreds.jsonl")          # -> int (tombstones written)
vault.import_tombstones("shreds.jsonl")           # -> int (tombstones added)

MasterKey.generate(); MasterKey.from_base64(s); MasterKey.from_file(path)
MasterKey.from_passphrase(s); key.to_base64()     # to_base64 raises for passphrase keys
```

- `Vault.open(path, master_key, *, create=False, audit_data_access=False)`.
- `ShredReceipt`: `subject_hash: str` (hex), `key_id: str` (hex), `shredded_at: int` (unix seconds), `audit_seq: int`.
- `AuditReport`: `ok: bool`, `entries: int`, `head: str`, `first_bad_seq: int | None`.
- `repr(MasterKey)` never reveals key material.
- `Vault` is safe to share across threads (internal mutex around the SQLite connection; GIL released during crypto and file I/O). Multiple processes may share one keystore file.
- `seal_file`/`unseal_file` write to a temporary file in the destination directory and rename only after success, so failures never leave partial output (in particular, no partial plaintext from a tampered object).
- Type stubs (`_native.pyi`) and `py.typed` ship in the wheel.

### 6.2 Rust

Same surface: `Vault::open(path, MasterKey)`, `Vault::create(path, MasterKey)`, `seal(&self, subject, &[u8], context) -> Vec<u8>`, `unseal(&self, &[u8], context) -> Vec<u8>`, `seal_stream<R: Read, W: Write>(subject, R, W, context)`, `unseal_stream<R, W>(R, W, context)`, `seal_file`, `unseal_file`, `has_key`, `shred -> Option<ShredReceipt>`, `verify_audit`, `audit_head`, `rotate_master_key`, `export_tombstones`, `import_tombstones`. Two functions need no master key: `inspect_header(&[u8]) -> Header` and `key_status(keystore_path, key_id) -> KeyStatus { Present, Shredded { at }, Unknown }` (reads only `subject_keys`/`tombstones`, used by `aegis inspect`). Errors via one `aegis_shred::Error` enum.

### 6.3 CLI

Master key from `AEGIS_MASTER_KEY`, `--key-file PATH`, or `--passphrase` (interactive prompt). Keystore from `--keystore PATH`, `AEGIS_KEYSTORE`, default `./aegis-keys.db`.

```
aegis keygen                                   print a new base64 master key
aegis init                                     create the keystore
aegis seal -s SUBJECT [-c CONTEXT] IN -o OUT
aegis unseal [-c CONTEXT] IN -o OUT
aegis shred SUBJECT [--yes]                    asks for confirmation without --yes
aegis inspect FILE                             header + key status (present/shredded/unknown); no master key needed
aegis audit verify | show [--limit N] | head
aegis rotate-master-key [--new-key-file PATH | --new-passphrase]
aegis tombstones export FILE | import FILE
```

Exit codes: `0` ok, `1` other error, `2` usage, `3` shredded, `4` integrity, `5` wrong master key, `6` unknown key.

The CLI logic lives in `aegis-shred-cli` as `pub fn run(args: Vec<String>) -> i32`; the binary calls it, and the Python console script calls it through the extension, so there is one implementation.

### 6.4 Errors

| Rust `Error` | Python exception (all subclass `AegisError` unless noted) | Meaning |
|---|---|---|
| `Shredded` | `Shredded` | key deliberately destroyed |
| `UnknownKey` | `UnknownKey` | object belongs to a different keystore |
| `WrongMasterKey` | `WrongMasterKey` | master key (or its kind) doesn't match |
| `Integrity` | `IntegrityError` | tampered, truncated, reordered, wrong context — one variant on purpose |
| `UnsupportedFormat` | `UnsupportedFormat` | bad magic, version, algorithm, reserved byte, or chunk size |
| `Keystore` | `KeystoreError` | SQLite failure or corrupt keystore |
| `Io` | `OSError` (built-in) | file errors |
| `InvalidArgument` | `ValueError` (built-in) | bad subject id, malformed key, etc. |

Error messages never contain plaintext, key material, or raw subject ids.

## 7. Testing

Written test-first (superpowers:test-driven-development).

- **Format:** round-trip property tests (proptest) for sizes 0, 1, chunk−1, chunk, chunk+1, 3×chunk, several MB; flip every byte of a small object ⇒ `Integrity`; reorder, duplicate, drop chunks; truncate at every chunk boundary and mid-chunk; append bytes; wrong context; non-zero reserved byte / bad magic / unknown version ⇒ `UnsupportedFormat`.
- **Vectors:** committed known-answer vectors; a test fails if output bytes change.
- **Keystore/vault:** shred ⇒ `Shredded`; foreign keystore ⇒ `UnknownKey`; wrong KEK and wrong KEK kind ⇒ `WrongMasterKey`; rotation keeps old objects readable and rejects the old KEK; tombstone export/import re-applies shreds to a restored copy; concurrent first-seal converges on one key; audit edits/deletions detected with the right `first_bad_seq`.
- **Secure delete:** after shred, the wrapped DEK bytes do not occur anywhere in the keystore's main database file.
- **CLI:** `assert_cmd` tests for each subcommand and exit code.
- **Python:** pytest against the built wheel, including a two-process test (process A shreds; process B's next unseal raises `Shredded`) and a thread-sharing test.
- **Fuzz:** `cargo-fuzz` target over `unseal` with arbitrary bytes; run locally, not in CI.
- **Benchmarks:** criterion seal/unseal throughput for 1 KiB records and 100 MiB streams. The README quotes only measured numbers, with the machine named.

## 8. CI and release

- `ci.yml` (push, PR): `cargo fmt --check`; `cargo clippy --all-targets -- -D warnings`; `cargo test` on ubuntu, macos, windows; MSRV build (`rust-version` pinned in `Cargo.toml`); `cargo deny check`; `maturin build` + `pytest` on ubuntu, macos, windows.
- `release.yml` (tag `v*`): maturin-action wheels (abi3-py310) for manylinux x86_64/aarch64, musllinux x86_64, macOS x86_64/arm64, Windows x64, plus sdist; publish to PyPI via Trusted Publishing; publish `aegis-shred` then `aegis-shred-cli` to crates.io via trusted publishing, skipping versions already on crates.io (the first version of each crate must be published with an API token, which crates.io requires); create a GitHub Release with wheels attached and notes from `CHANGELOG.md`.
- Kaushik's one-time setup: register the trusted publisher on pypi.org (pending publisher for `aegis-shred`) and crates.io. Exact steps provided when release work starts. The tag push that publishes happens only after he confirms.

## 9. Docs and site

- `README.md`: what crypto-shredding is; install; 5-line quickstart; CLI example; guarantees and non-guarantees; link to FastAPI example and docs. No badge for anything not actually run.
- `docs/FORMAT.md`, `docs/OPERATIONS.md` as above.
- `docs/THREAT_MODEL.md`: protects against reading a subject's data after shred given the KEK was not compromised before the shred; does not protect against KEK compromise, plaintext the application copied elsewhere (logs, caches, analytics), restored keystore backups without journal import or KEK retirement, residue in SQLite journal files / filesystem / SSD wear-leveling (wrapped DEKs only — useless without the KEK), memory inspection of a running process, or an attacker who can run code as the application.
- `SECURITY.md`: private reporting via GitHub Security Advisories; the compromised dev cert note.
- `CHANGELOG.md`: Keep a Changelog format.
- `site/index.html`: single static page (what, install, quickstart, links). Repointing the existing Vercel project (aegis-khaki.vercel.app) to `site/` is a project-setting change; ask before doing it.
- GitHub repo description and topics updated to match (ask before changing).

## 10. Self-review notes

- Changed from the in-chat design: decryption is `unseal` / `unseal_file` / `aegis unseal` rather than `open`, because `Vault.open(path)` (classmethod) and `vault.open(blob)` (method) cannot coexist on one type in Python or Rust.
- Added `has_key`, `audit_head`, `Vault.create` (Rust), and `key_status` (Rust, for `aegis inspect`) for the example app and CLI; no other API additions.
- Dependency versions and MSRV were fixed during planning (2026-09-30): RustCrypto `aes-gcm` 0.11 / `aead-stream` 0.6 / `hkdf` 0.13 / `hmac` 0.13 / `sha2` 0.11 / `argon2` 0.6, `rusqlite` 0.40, PyO3 0.29, MSRV 1.85 (shipped code only).
- Added during planning, after building a prototype: `Vault::open_or_create` in Rust (what Python's `create=True` calls; safe under concurrent creation); `export_tombstones` returns the count written; fork safety and the missing-directory check (§5.3); the CLI shred receipt also prints the subject hash.
- crates.io allows trusted publishing only for crates that already exist, so v0.1.0's two crates are first published with a short-lived token from Kaushik, and trusted publishing covers every later release (§8).
