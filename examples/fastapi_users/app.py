"""A user directory where every personal field is sealed under the user's own key.

DELETE /users/{id} shreds the key. The encrypted row stays in the database (and in every
backup of it), but nobody can read it again.

Run:
    pip install aegis-shred fastapi uvicorn
    export AEGIS_MASTER_KEY="$(aegis keygen)"
    uvicorn app:app --reload
"""

import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aegis_shred import MasterKey, Shredded, Vault

DB_PATH = os.environ.get("APP_DB", "users.db")
KEYSTORE_PATH = os.environ.get("AEGIS_KEYSTORE", "aegis-keys.db")

state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["vault"] = Vault.open(KEYSTORE_PATH, MasterKey.from_env("AEGIS_MASTER_KEY"), create=True)
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name BLOB NOT NULL, email BLOB NOT NULL)")
    state["db"] = db
    yield
    db.close()


app = FastAPI(title="aegis-shred example: user directory", lifespan=lifespan)


class NewUser(BaseModel):
    name: str
    email: str


def subject(user_id: int) -> str:
    return f"user-{user_id}"


@app.post("/users", status_code=201)
def create_user(user: NewUser):
    db, vault = state["db"], state["vault"]
    cursor = db.execute("INSERT INTO users (name, email) VALUES (x'', x'')")
    user_id = cursor.lastrowid
    db.execute(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        (
            vault.seal(subject(user_id), user.name.encode(), context=f"users.name:{user_id}".encode()),
            vault.seal(subject(user_id), user.email.encode(), context=f"users.email:{user_id}".encode()),
            user_id,
        ),
    )
    db.commit()
    return {"id": user_id}


@app.get("/users/{user_id}")
def read_user(user_id: int):
    db, vault = state["db"], state["vault"]
    row = db.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "no such user")
    try:
        name = vault.unseal(row[0], context=f"users.name:{user_id}".encode()).decode()
        email = vault.unseal(row[1], context=f"users.email:{user_id}".encode()).decode()
    except Shredded:
        raise HTTPException(410, "this user's data was erased")
    return {"id": user_id, "name": name, "email": email}


@app.delete("/users/{user_id}")
def erase_user(user_id: int):
    receipt = state["vault"].shred(subject(user_id))
    if receipt is None:
        raise HTTPException(404, "no data stored for this user")
    return {"erased": True, "key_id": receipt.key_id, "shredded_at": receipt.shredded_at, "audit_seq": receipt.audit_seq}
