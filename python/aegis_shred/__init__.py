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
