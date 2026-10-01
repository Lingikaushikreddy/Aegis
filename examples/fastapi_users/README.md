# Example: a user directory with real erasure

A small FastAPI app that stores each user's name and email sealed under that user's own key.
`DELETE /users/{id}` shreds the key: the encrypted row stays in the database (and in every
backup of it), but it can never be read again, and `GET` returns `410 Gone`.

```bash
pip install aegis-shred fastapi uvicorn
export AEGIS_MASTER_KEY="$(aegis keygen)"
uvicorn app:app --reload

curl -X POST localhost:8000/users -H 'content-type: application/json' \
     -d '{"name": "Alice", "email": "alice@example.com"}'      # {"id": 1}
curl localhost:8000/users/1                                     # Alice's record
curl -X DELETE localhost:8000/users/1                           # shred receipt
curl -i localhost:8000/users/1                                  # 410 Gone
```

Each field is sealed with a context such as `users.email:1`, so a blob copied into another row
or column fails to unseal instead of leaking.

Tests: `pip install pytest fastapi httpx && pytest examples/fastapi_users`.
