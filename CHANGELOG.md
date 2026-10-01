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
