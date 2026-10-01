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
