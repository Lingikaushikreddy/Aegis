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
