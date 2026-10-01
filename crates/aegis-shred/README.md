# aegis-shred

Crypto-shredding for application data: every data subject gets their own encryption key, so
erasing a person means destroying one key, and every copy of their data (including copies in
backups) becomes unreadable.

```rust
use aegis_shred::{Error, MasterKey, Vault};

let vault = Vault::open_or_create("keys.db", &MasterKey::from_env("AEGIS_MASTER_KEY")?)?;
let sealed = vault.seal("user-42", b"alice@example.com", b"users.email")?;
assert_eq!(vault.unseal(&sealed, b"users.email")?, b"alice@example.com");

vault.shred("user-42")?;
assert!(matches!(vault.unseal(&sealed, b"users.email"), Err(Error::Shredded { .. })));
```

Documentation, the format specification, the threat model and the Python package live in the
[repository](https://github.com/Lingikaushikreddy/Aegis).

Licensed under MIT or Apache-2.0, at your option.
