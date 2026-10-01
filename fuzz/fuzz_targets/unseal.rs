#![no_main]

use std::sync::OnceLock;

use aegis_shred::{MasterKey, Vault, inspect_header};
use libfuzzer_sys::fuzz_target;

struct Fixture {
    _dir: tempfile::TempDir,
    vault: Vault,
    key_id: [u8; 16],
}

fn fixture() -> &'static Fixture {
    static FIXTURE: OnceLock<Fixture> = OnceLock::new();
    FIXTURE.get_or_init(|| {
        let dir = tempfile::TempDir::new().unwrap();
        let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();
        let sealed = vault.seal("fuzz", b"seed", b"").unwrap();
        let key_id = inspect_header(&sealed).unwrap().key_id;
        Fixture { _dir: dir, vault, key_id }
    })
}

fuzz_target!(|data: &[u8]| {
    let fixture = fixture();
    let mut input = data.to_vec();
    // Point the input at the real key so the fuzzer reaches the decryption loop.
    if input.len() >= 24 {
        input[8..24].copy_from_slice(&fixture.key_id);
    }
    let _ = fixture.vault.unseal(&input, b"");
});
