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
