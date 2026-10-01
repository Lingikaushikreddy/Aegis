//! A vault opened before `fork()` must keep working in the child (gunicorn `--preload`,
//! Celery prefork). This file holds a single test so no other test thread runs during the fork.
#![cfg(unix)]

use aegis_shred::{Error, MasterKey, Vault};

fn open_fd_count() -> usize {
    std::fs::read_dir("/dev/fd").map(|d| d.count()).unwrap_or(0)
}

#[test]
fn vault_keeps_working_across_fork() {
    let dir = tempfile::TempDir::new().unwrap();
    let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();
    let sealed = vault.seal("user-1", b"x", b"").unwrap();

    // SAFETY: this test binary contains one test, so no other thread holds a lock across fork().
    let pid = unsafe { libc::fork() };
    assert!(pid >= 0, "fork failed");
    if pid == 0 {
        let fds_before = open_fd_count();
        let read_ok = vault.unseal(&sealed, b"").ok().as_deref() == Some(&b"x"[..]);
        // The child must have opened its own connection instead of reusing the parent's.
        let reopened = open_fd_count() > fds_before;
        let write_ok =
            vault.seal("user-2", b"y", b"").is_ok() && matches!(vault.shred("user-1"), Ok(Some(_)));
        let code = match (read_ok && write_ok, reopened) {
            (true, true) => 0,
            (false, _) => 1,
            (true, false) => 3,
        };
        // SAFETY: _exit skips destructors that could touch the parent's resources.
        unsafe { libc::_exit(code) };
    }
    let mut status = 0;
    // SAFETY: pid is our child.
    unsafe { libc::waitpid(pid, &mut status, 0) };
    assert!(
        libc::WIFEXITED(status) && libc::WEXITSTATUS(status) == 0,
        "child exited with {} (1 = vault calls failed, 3 = reused the parent's connection)",
        libc::WEXITSTATUS(status)
    );
    assert!(matches!(
        vault.unseal(&sealed, b""),
        Err(Error::Shredded { .. })
    ));
    assert!(vault.has_key("user-2").unwrap());
}
