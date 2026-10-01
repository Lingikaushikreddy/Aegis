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
