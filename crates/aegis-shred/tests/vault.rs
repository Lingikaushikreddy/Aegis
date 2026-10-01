use std::path::{Path, PathBuf};
use std::sync::Arc;

use aegis_shred::{Error, KeyStatus, MasterKey, Vault, inspect_header, key_status};
use tempfile::TempDir;

fn keystore_path(dir: &TempDir) -> PathBuf {
    dir.path().join("keys.db")
}

fn new_vault() -> (TempDir, Vault, MasterKey) {
    let dir = TempDir::new().unwrap();
    let key = MasterKey::generate();
    let vault = Vault::create(keystore_path(&dir), &key).unwrap();
    (dir, vault, key)
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}

fn raw_db(path: &Path) -> rusqlite::Connection {
    rusqlite::Connection::open(path).unwrap()
}

#[test]
fn seal_unseal_round_trip_without_leaking_subject() {
    let (_dir, vault, _) = new_vault();
    let sealed = vault
        .seal("user-42", b"alice@example.com", b"users.email")
        .unwrap();
    assert_eq!(
        vault.unseal(&sealed, b"users.email").unwrap(),
        b"alice@example.com"
    );
    assert!(!contains(&sealed, b"user-42"));
    assert!(!contains(&sealed, b"alice"));
}

#[test]
fn one_key_per_subject() {
    let (_dir, vault, _) = new_vault();
    let a1 = inspect_header(&vault.seal("user-1", b"x", b"").unwrap()).unwrap();
    let a2 = inspect_header(&vault.seal("user-1", b"y", b"").unwrap()).unwrap();
    let b = inspect_header(&vault.seal("user-2", b"z", b"").unwrap()).unwrap();
    assert_eq!(a1.key_id, a2.key_id);
    assert_ne!(a1.salt, a2.salt);
    assert_ne!(a1.key_id, b.key_id);
}

#[test]
fn shred_makes_every_object_of_the_subject_unreadable() {
    let (_dir, vault, _) = new_vault();
    let first = vault.seal("user-42", b"one", b"").unwrap();
    let second = vault.seal("user-42", b"two", b"").unwrap();
    let other = vault.seal("user-7", b"keep", b"").unwrap();

    let receipt = vault.shred("user-42").unwrap().expect("subject had a key");
    assert_eq!(receipt.key_id, inspect_header(&first).unwrap().key_id);
    for sealed in [&first, &second] {
        match vault.unseal(sealed, b"") {
            Err(Error::Shredded { shredded_at }) => assert_eq!(shredded_at, receipt.shredded_at),
            other => panic!("expected Shredded, got {other:?}"),
        }
    }
    assert_eq!(vault.unseal(&other, b"").unwrap(), b"keep");
    assert!(!vault.has_key("user-42").unwrap());
    assert!(vault.shred("user-42").unwrap().is_none());

    // The same person signing up again gets a fresh key; old data stays dead.
    let fresh = vault.seal("user-42", b"new", b"").unwrap();
    assert_ne!(inspect_header(&fresh).unwrap().key_id, receipt.key_id);
    assert_eq!(vault.unseal(&fresh, b"").unwrap(), b"new");
    assert!(matches!(
        vault.unseal(&first, b""),
        Err(Error::Shredded { .. })
    ));
}

#[test]
fn shredding_an_unknown_subject_is_a_no_op() {
    let (_dir, vault, _) = new_vault();
    assert!(vault.shred("never-stored").unwrap().is_none());
    assert_eq!(vault.verify_audit().unwrap().entries, 1);
}

#[test]
fn objects_from_another_keystore_are_unknown() {
    let (_d1, vault_a, _) = new_vault();
    let (_d2, vault_b, _) = new_vault();
    let sealed = vault_a.seal("user-1", b"x", b"").unwrap();
    assert!(matches!(
        vault_b.unseal(&sealed, b""),
        Err(Error::UnknownKey)
    ));
}

#[test]
fn wrong_master_key_is_rejected() {
    let (dir, vault, _) = new_vault();
    drop(vault);
    let path = keystore_path(&dir);
    assert!(matches!(
        Vault::open(&path, &MasterKey::generate()),
        Err(Error::WrongMasterKey(_))
    ));
    let pass = MasterKey::from_passphrase("hunter2").unwrap();
    assert!(matches!(
        Vault::open(&path, &pass),
        Err(Error::WrongMasterKey(_))
    ));
}

#[test]
fn passphrase_keystore_reopens() {
    let dir = TempDir::new().unwrap();
    let path = keystore_path(&dir);
    let pass = MasterKey::from_passphrase("correct horse battery staple").unwrap();
    let sealed = Vault::create(&path, &pass)
        .unwrap()
        .seal("user-1", b"hi", b"")
        .unwrap();
    let reopened = Vault::open(
        &path,
        &MasterKey::from_passphrase("correct horse battery staple").unwrap(),
    )
    .unwrap();
    assert_eq!(reopened.unseal(&sealed, b"").unwrap(), b"hi");
    assert!(matches!(
        Vault::open(&path, &MasterKey::from_passphrase("wrong").unwrap()),
        Err(Error::WrongMasterKey(_))
    ));
}

#[test]
fn open_create_and_foreign_files() {
    let dir = TempDir::new().unwrap();
    let key = MasterKey::generate();
    match Vault::open(dir.path().join("missing.db"), &key) {
        Err(Error::Io(e)) => assert_eq!(e.kind(), std::io::ErrorKind::NotFound),
        other => panic!("expected NotFound, got {other:?}"),
    }

    let path = keystore_path(&dir);
    Vault::create(&path, &key).unwrap();
    assert!(matches!(
        Vault::create(&path, &key),
        Err(Error::InvalidArgument(_))
    ));
    Vault::open_or_create(&path, &key).unwrap();

    let foreign = dir.path().join("app.db");
    raw_db(&foreign)
        .execute_batch("CREATE TABLE users (id INTEGER);")
        .unwrap();
    assert!(matches!(
        Vault::open_or_create(&foreign, &key),
        Err(Error::InvalidArgument(_))
    ));
    assert!(matches!(
        Vault::open(&foreign, &key),
        Err(Error::Keystore(_))
    ));

    let text = dir.path().join("notes.txt");
    std::fs::write(
        &text,
        "definitely not sqlite, just some text that is long enough to be read",
    )
    .unwrap();
    assert!(Vault::open(&text, &key).is_err());
}

#[test]
fn master_key_rotation() {
    let (dir, vault, old_key) = new_vault();
    let path = keystore_path(&dir);
    let sealed = vault.seal("user-1", b"before", b"").unwrap();
    let stale = Vault::open(&path, &old_key).unwrap();

    let new_key = MasterKey::generate();
    vault.rotate_master_key(&new_key).unwrap();
    assert_eq!(vault.unseal(&sealed, b"").unwrap(), b"before");

    assert!(matches!(
        Vault::open(&path, &old_key),
        Err(Error::WrongMasterKey(_))
    ));
    let reopened = Vault::open(&path, &new_key).unwrap();
    assert_eq!(reopened.unseal(&sealed, b"").unwrap(), b"before");
    assert!(matches!(
        stale.unseal(&sealed, b""),
        Err(Error::WrongMasterKey(_))
    ));

    let pass = MasterKey::from_passphrase("now a passphrase").unwrap();
    reopened.rotate_master_key(&pass).unwrap();
    assert_eq!(
        Vault::open(&path, &pass)
            .unwrap()
            .unseal(&sealed, b"")
            .unwrap(),
        b"before"
    );
    let events: Vec<String> = reopened
        .audit_entries()
        .unwrap()
        .into_iter()
        .map(|e| e.event)
        .collect();
    assert_eq!(events.iter().filter(|e| *e == "kek.rotated").count(), 2);
}

#[test]
fn tombstone_journal_reapplies_shreds_to_a_restored_backup() {
    let (dir, vault, key) = new_vault();
    let path = keystore_path(&dir);
    let erased = vault.seal("user-1", b"erase me", b"").unwrap();
    let kept = vault.seal("user-2", b"keep me", b"").unwrap();

    let backup = dir.path().join("backup.db");
    std::fs::copy(&path, &backup).unwrap();

    vault.shred("user-1").unwrap().unwrap();
    let journal = dir.path().join("shreds.jsonl");
    assert_eq!(vault.export_tombstones(&journal).unwrap(), 1);

    // Restoring the old backup brings the erased key back...
    let restored = Vault::open(&backup, &key).unwrap();
    assert_eq!(restored.unseal(&erased, b"").unwrap(), b"erase me");
    // ...until the journal is re-applied.
    assert_eq!(restored.import_tombstones(&journal).unwrap(), 1);
    assert!(matches!(
        restored.unseal(&erased, b""),
        Err(Error::Shredded { .. })
    ));
    assert_eq!(restored.unseal(&kept, b"").unwrap(), b"keep me");
    assert_eq!(restored.import_tombstones(&journal).unwrap(), 0);
    assert!(restored.verify_audit().unwrap().ok);

    std::fs::write(&journal, "{\"key_id\": \"zz\", \"shredded_at\": 1}\n").unwrap();
    assert!(matches!(
        restored.import_tombstones(&journal),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn audit_log_records_lifecycle_and_detects_tampering() {
    let (dir, vault, _) = new_vault();
    vault.seal("user-42", b"x", b"").unwrap();
    let receipt = vault.shred("user-42").unwrap().unwrap();

    let entries = vault.audit_entries().unwrap();
    let events: Vec<&str> = entries.iter().map(|e| e.event.as_str()).collect();
    assert_eq!(events, ["keystore.created", "key.created", "key.shredded"]);
    assert_eq!(
        entries[2].subject_hash.as_deref(),
        Some(&receipt.subject_hash[..])
    );
    assert_eq!(receipt.audit_seq, 3);
    let report = vault.verify_audit().unwrap();
    assert!(report.ok);
    assert_eq!(vault.audit_head().unwrap(), (3, report.head));

    let path = keystore_path(&dir);
    let file = std::fs::read(&path).unwrap();
    assert!(
        !contains(&file, b"user-42"),
        "raw subject id must never be stored"
    );

    raw_db(&path)
        .execute("UPDATE audit SET ts = ts + 1 WHERE seq = 2", [])
        .unwrap();
    let report = vault.verify_audit().unwrap();
    assert!(!report.ok);
    assert_eq!(report.first_bad_seq, Some(2));
}

#[test]
fn shredded_key_bytes_are_overwritten_in_the_keystore_file() {
    let (dir, vault, _) = new_vault();
    let path = keystore_path(&dir);
    vault.seal("user-42", b"x", b"").unwrap();
    let wrapped: Vec<u8> = raw_db(&path)
        .query_row("SELECT wrapped_dek FROM subject_keys", [], |r| r.get(0))
        .unwrap();
    assert!(contains(&std::fs::read(&path).unwrap(), &wrapped));

    vault.shred("user-42").unwrap();
    drop(vault);
    assert!(!contains(&std::fs::read(&path).unwrap(), &wrapped));
}

#[test]
fn data_access_audit_is_opt_in() {
    let (dir, vault, key) = new_vault();
    let sealed = vault.seal("user-1", b"x", b"").unwrap();
    vault.unseal(&sealed, b"").unwrap();
    assert_eq!(vault.audit_entries().unwrap().len(), 2);

    let mut audited = Vault::open(keystore_path(&dir), &key).unwrap();
    audited.set_audit_data_access(true);
    let sealed = audited.seal("user-1", b"y", b"").unwrap();
    audited.unseal(&sealed, b"").unwrap();
    let events: Vec<String> = audited
        .audit_entries()
        .unwrap()
        .into_iter()
        .map(|e| e.event)
        .collect();
    assert_eq!(&events[2..], ["data.sealed", "data.unsealed"]);
}

#[test]
fn concurrent_first_seals_converge_on_one_key() {
    let (dir, vault, key) = new_vault();
    let path = keystore_path(&dir);
    let handles: Vec<_> = (0..8)
        .map(|i| {
            let (path, key) = (path.clone(), key.clone());
            std::thread::spawn(move || {
                let own = Vault::open(&path, &key).unwrap();
                own.seal("same-subject", format!("from {i}").as_bytes(), b"")
                    .unwrap()
            })
        })
        .collect();
    let sealed: Vec<Vec<u8>> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    let first_id = inspect_header(&sealed[0]).unwrap().key_id;
    for (i, blob) in sealed.iter().enumerate() {
        assert_eq!(inspect_header(blob).unwrap().key_id, first_id);
        assert_eq!(
            vault.unseal(blob, b"").unwrap(),
            format!("from {i}").as_bytes()
        );
    }
}

#[test]
fn one_vault_shared_across_threads() {
    let (_dir, vault, _) = new_vault();
    let vault = Arc::new(vault);
    let handles: Vec<_> = (0..8)
        .map(|i| {
            let vault = Arc::clone(&vault);
            std::thread::spawn(move || {
                for j in 0..20 {
                    let subject = format!("user-{}", (i + j) % 5);
                    let sealed = vault.seal(&subject, b"data", b"").unwrap();
                    assert_eq!(vault.unseal(&sealed, b"").unwrap(), b"data");
                }
            })
        })
        .collect();
    for h in handles {
        h.join().unwrap();
    }
    assert!(vault.verify_audit().unwrap().ok);
}

#[test]
fn files_round_trip_and_tampered_files_leave_nothing_behind() {
    let (dir, vault, _) = new_vault();
    let source = dir.path().join("scan.pdf");
    let data: Vec<u8> = (0..1_000_000u32).map(|i| (i % 253) as u8).collect();
    std::fs::write(&source, &data).unwrap();

    let sealed = dir.path().join("scan.pdf.aegis");
    vault.seal_file("user-1", &source, &sealed, b"").unwrap();
    let restored = dir.path().join("restored.pdf");
    vault.unseal_file(&sealed, &restored, b"").unwrap();
    assert_eq!(std::fs::read(&restored).unwrap(), data);

    let mut bytes = std::fs::read(&sealed).unwrap();
    let last = bytes.len() - 1;
    bytes[last] ^= 0xff;
    std::fs::write(&sealed, &bytes).unwrap();
    let target = dir.path().join("should-not-exist.pdf");
    assert!(matches!(
        vault.unseal_file(&sealed, &target, b""),
        Err(Error::Integrity)
    ));
    assert!(!target.exists());
    let leftovers: Vec<_> = std::fs::read_dir(dir.path())
        .unwrap()
        .map(|e| e.unwrap().file_name())
        .collect();
    assert_eq!(
        leftovers.len(),
        4,
        "only keys.db, scan.pdf, scan.pdf.aegis, restored.pdf: {leftovers:?}"
    );
}

#[test]
fn key_status_needs_no_master_key() {
    let (dir, vault, _) = new_vault();
    let path = keystore_path(&dir);
    let live = inspect_header(&vault.seal("user-1", b"x", b"").unwrap())
        .unwrap()
        .key_id;
    let dead = inspect_header(&vault.seal("user-2", b"x", b"").unwrap())
        .unwrap()
        .key_id;
    let receipt = vault.shred("user-2").unwrap().unwrap();
    assert_eq!(key_status(&path, &live).unwrap(), KeyStatus::Present);
    assert_eq!(
        key_status(&path, &dead).unwrap(),
        KeyStatus::Shredded {
            at: receipt.shredded_at
        }
    );
    assert_eq!(key_status(&path, &[0u8; 16]).unwrap(), KeyStatus::Unknown);
}

#[test]
fn invalid_subjects_are_rejected() {
    let (_dir, vault, _) = new_vault();
    assert!(matches!(
        vault.seal("", b"x", b""),
        Err(Error::InvalidArgument(_))
    ));
    assert!(matches!(
        vault.shred(&"x".repeat(257)),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn missing_keystore_directory_is_a_clear_not_found() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("no-such-dir").join("keys.db");
    for result in [
        Vault::open_or_create(&path, &MasterKey::generate()),
        Vault::create(&path, &MasterKey::generate()),
    ] {
        match result {
            Err(Error::Io(e)) => assert_eq!(e.kind(), std::io::ErrorKind::NotFound),
            other => panic!("expected NotFound, got {other:?}"),
        }
    }
    assert!(!path.parent().unwrap().exists());
}

#[test]
fn subject_ids_are_compared_byte_for_byte() {
    let (_dir, vault, _) = new_vault();
    let composed = "Jos\u{e9}"; // é as one code point (NFC)
    let decomposed = "Jose\u{301}"; // e + combining accent (NFD)
    let sealed = vault.seal(composed, b"x", b"").unwrap();
    assert!(
        vault.shred(decomposed).unwrap().is_none(),
        "different bytes, different subject"
    );
    assert!(vault.shred(composed).unwrap().is_some());
    assert!(matches!(
        vault.unseal(&sealed, b""),
        Err(Error::Shredded { .. })
    ));

    let emoji = "user-\u{1F600}";
    assert_eq!(
        vault
            .unseal(&vault.seal(emoji, b"y", b"").unwrap(), b"")
            .unwrap(),
        b"y"
    );
    assert!(vault.seal(&"\u{e9}".repeat(128), b"z", b"").is_ok()); // 256 bytes
    assert!(matches!(
        vault.seal(&"\u{e9}".repeat(129), b"z", b""),
        Err(Error::InvalidArgument(_))
    ));
}

#[test]
fn files_can_be_sealed_and_unsealed_in_place() {
    let (dir, vault, _) = new_vault();
    let path = dir.path().join("report.csv");
    std::fs::write(&path, b"id,email\n42,alice@example.com\n").unwrap();
    vault.seal_file("user-42", &path, &path, b"").unwrap();
    assert!(!contains(&std::fs::read(&path).unwrap(), b"alice"));
    vault.unseal_file(&path, &path, b"").unwrap();
    assert_eq!(
        std::fs::read(&path).unwrap(),
        b"id,email\n42,alice@example.com\n"
    );
}

#[test]
fn stale_process_cannot_create_keys_after_rotation() {
    let (dir, vault, old_key) = new_vault();
    let path = keystore_path(&dir);
    let stale = Vault::open(&path, &old_key).unwrap();
    let new_key = MasterKey::generate();
    vault.rotate_master_key(&new_key).unwrap();

    // A process still holding the old master key must not wrap a new data key with it:
    // once the old key is destroyed, that subject's data would be unreadable.
    assert!(matches!(
        stale.seal("new-user", b"x", b""),
        Err(Error::WrongMasterKey(_))
    ));
    let current = Vault::open(&path, &new_key).unwrap();
    assert!(!current.has_key("new-user").unwrap());
    current.rotate_master_key(&MasterKey::generate()).unwrap();
}
