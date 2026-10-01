import importlib
import sqlite3
import sys
from concurrent.futures import ThreadPoolExecutor
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


def test_concurrent_signups_keep_each_users_data(client):
    def signup(i):
        email = f"user{i}@example.com"
        return client.post("/users", json={"name": f"User {i}", "email": email}).json()["id"], email

    with ThreadPoolExecutor(max_workers=16) as pool:
        created = list(pool.map(signup, range(200)))
    assert len({user_id for user_id, _ in created}) == 200
    for user_id, email in created:
        assert client.get(f"/users/{user_id}").json()["email"] == email
