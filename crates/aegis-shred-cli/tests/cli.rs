use assert_cmd::cargo::cargo_bin_cmd;
use predicates::prelude::*;
use tempfile::TempDir;

fn aegis(dir: &TempDir, key: &str) -> assert_cmd::Command {
    let mut cmd = cargo_bin_cmd!("aegis");
    cmd.current_dir(dir.path())
        .env("AEGIS_MASTER_KEY", key)
        .env_remove("AEGIS_KEYSTORE")
        .env_remove("AEGIS_PASSPHRASE")
        .env_remove("AEGIS_NEW_PASSPHRASE");
    cmd
}

fn keygen() -> String {
    let out = cargo_bin_cmd!("aegis").arg("keygen").output().unwrap();
    assert!(out.status.success());
    String::from_utf8(out.stdout).unwrap().trim().to_string()
}

fn setup() -> (TempDir, String) {
    let dir = TempDir::new().unwrap();
    let key = keygen();
    aegis(&dir, &key).arg("init").assert().success();
    std::fs::write(dir.path().join("plain.txt"), "alice@example.com").unwrap();
    (dir, key)
}

#[test]
fn keygen_prints_a_32_byte_base64_key() {
    let key = keygen();
    assert_eq!(key.len(), 44);
    assert_ne!(key, keygen());
}

#[test]
fn full_lifecycle() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-42", "plain.txt", "-o", "plain.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["unseal", "plain.aegis", "-o", "back.txt"])
        .assert()
        .success();
    assert_eq!(
        std::fs::read_to_string(dir.path().join("back.txt")).unwrap(),
        "alice@example.com"
    );
    aegis(&dir, &key)
        .args(["inspect", "plain.aegis"])
        .assert()
        .success()
        .stdout(predicate::str::contains("key status: present"));

    aegis(&dir, &key)
        .args(["shred", "user-42", "--yes"])
        .assert()
        .success()
        .stdout(predicate::str::contains("shredded key"));
    aegis(&dir, &key)
        .args(["unseal", "plain.aegis", "-o", "again.txt"])
        .assert()
        .code(3)
        .stderr(predicate::str::contains("shredded"));
    assert!(!dir.path().join("again.txt").exists());
    aegis(&dir, &key)
        .args(["inspect", "plain.aegis"])
        .assert()
        .stdout(predicate::str::contains("key status: shredded at"));

    aegis(&dir, &key)
        .args(["audit", "verify"])
        .assert()
        .success()
        .stdout(predicate::str::starts_with("ok: 3 entries"));
    aegis(&dir, &key)
        .args(["audit", "head"])
        .assert()
        .stdout(predicate::str::starts_with("3 "));
    aegis(&dir, &key)
        .args(["audit", "show"])
        .assert()
        .stdout(predicate::str::contains("key.shredded"));
}

#[test]
fn exit_codes_distinguish_failures() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args([
            "seal",
            "-s",
            "u",
            "-c",
            "ctx-a",
            "plain.txt",
            "-o",
            "p.aegis",
        ])
        .assert()
        .success();

    aegis(&dir, &key)
        .args(["unseal", "-c", "ctx-b", "p.aegis", "-o", "x"])
        .assert()
        .code(4);
    aegis(&dir, &keygen())
        .args(["unseal", "p.aegis", "-o", "x"])
        .assert()
        .code(5);

    let other = TempDir::new().unwrap();
    let other_key = keygen();
    aegis(&other, &other_key).arg("init").assert().success();
    std::fs::copy(dir.path().join("p.aegis"), other.path().join("p.aegis")).unwrap();
    aegis(&other, &other_key)
        .args(["unseal", "-c", "ctx-a", "p.aegis", "-o", "x"])
        .assert()
        .code(6);

    let mut bytes = std::fs::read(dir.path().join("p.aegis")).unwrap();
    let last = bytes.len() - 1;
    bytes[last] ^= 1;
    std::fs::write(dir.path().join("p.aegis"), bytes).unwrap();
    aegis(&dir, &key)
        .args(["unseal", "-c", "ctx-a", "p.aegis", "-o", "x"])
        .assert()
        .code(4);

    aegis(&dir, &key)
        .env_remove("AEGIS_MASTER_KEY")
        .args(["audit", "verify"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("no master key"));
    aegis(&dir, &key).assert().code(2);
    let empty = TempDir::new().unwrap();
    aegis(&empty, &key)
        .args(["audit", "verify"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("aegis init"));
}

#[test]
fn refuses_to_overwrite_without_force() {
    let (dir, key) = setup();
    std::fs::write(dir.path().join("taken.aegis"), "precious").unwrap();
    aegis(&dir, &key)
        .args(["seal", "-s", "u", "plain.txt", "-o", "taken.aegis"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("--force"));
    assert_eq!(
        std::fs::read_to_string(dir.path().join("taken.aegis")).unwrap(),
        "precious"
    );
    aegis(&dir, &key)
        .args([
            "seal",
            "-s",
            "u",
            "plain.txt",
            "-o",
            "taken.aegis",
            "--force",
        ])
        .assert()
        .success();
}

#[test]
fn shred_asks_for_confirmation() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-42", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["shred", "user-42"])
        .write_stdin("nope\n")
        .assert()
        .code(1)
        .stderr(predicate::str::contains("aborted"));
    aegis(&dir, &key)
        .args(["inspect", "p.aegis"])
        .assert()
        .stdout(predicate::str::contains("present"));
    aegis(&dir, &key)
        .args(["shred", "user-42"])
        .write_stdin("user-42\n")
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["shred", "user-42", "--yes"])
        .assert()
        .success()
        .stdout(predicate::str::contains("nothing to shred"));
}

#[test]
fn passphrase_from_environment() {
    let dir = TempDir::new().unwrap();
    std::fs::write(dir.path().join("plain.txt"), "hi").unwrap();
    let with_pass = |args: &[&str]| {
        let mut cmd = aegis(&dir, "unused");
        cmd.env_remove("AEGIS_MASTER_KEY")
            .env("AEGIS_PASSPHRASE", "correct horse")
            .arg("--passphrase")
            .args(args);
        cmd
    };
    with_pass(&["init"]).assert().success();
    with_pass(&["seal", "-s", "u", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    with_pass(&["unseal", "p.aegis", "-o", "back.txt"])
        .assert()
        .success();
    assert_eq!(
        std::fs::read_to_string(dir.path().join("back.txt")).unwrap(),
        "hi"
    );
}

#[test]
fn rotation_and_tombstone_journal() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "user-1", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    let new_key = keygen();
    std::fs::write(dir.path().join("new.key"), &new_key).unwrap();
    aegis(&dir, &key)
        .args(["rotate-master-key", "--new-key-file", "new.key"])
        .assert()
        .success();
    aegis(&dir, &key)
        .args(["unseal", "p.aegis", "-o", "x"])
        .assert()
        .code(5);
    aegis(&dir, "")
        .env_remove("AEGIS_MASTER_KEY")
        .args(["--key-file", "new.key", "unseal", "p.aegis", "-o", "x"])
        .assert()
        .success();

    std::fs::copy(
        dir.path().join("aegis-keys.db"),
        dir.path().join("backup.db"),
    )
    .unwrap();
    aegis(&dir, &new_key)
        .args(["shred", "user-1", "--yes"])
        .assert()
        .success();
    aegis(&dir, &new_key)
        .args(["tombstones", "export", "shreds.jsonl"])
        .assert()
        .success()
        .stdout(predicate::str::contains("exported 1"));
    aegis(&dir, &new_key)
        .args(["--keystore", "backup.db", "unseal", "p.aegis", "-o", "y"])
        .assert()
        .success();
    aegis(&dir, &new_key)
        .args([
            "--keystore",
            "backup.db",
            "tombstones",
            "import",
            "shreds.jsonl",
        ])
        .assert()
        .success()
        .stdout(predicate::str::contains("imported 1"));
    aegis(&dir, &new_key)
        .args([
            "--keystore",
            "backup.db",
            "unseal",
            "p.aegis",
            "-o",
            "z",
            "--force",
        ])
        .assert()
        .code(3);
}

#[test]
fn inspect_without_a_keystore() {
    let (dir, key) = setup();
    aegis(&dir, &key)
        .args(["seal", "-s", "u", "plain.txt", "-o", "p.aegis"])
        .assert()
        .success();
    aegis(&dir, &key)
        .env_remove("AEGIS_MASTER_KEY")
        .args(["--keystore", "nowhere.db", "inspect", "p.aegis"])
        .assert()
        .success()
        .stdout(predicate::str::contains("no keystore"));
    aegis(&dir, &key)
        .args(["inspect", "plain.txt"])
        .assert()
        .code(1)
        .stderr(predicate::str::contains("bad magic"));
}
