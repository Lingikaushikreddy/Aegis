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
