import multiprocessing
import os
from concurrent.futures import ThreadPoolExecutor

import pytest

from aegis_shred import MasterKey, Shredded, Vault


def _shred_in_child(path, key_b64, subject, queue):
    vault = Vault.open(path, MasterKey.from_base64(key_b64))
    queue.put(vault.shred(subject) is not None)


def _seal_in_child(path, key_b64, index, queue):
    vault = Vault.open(path, MasterKey.from_base64(key_b64), create=True)
    queue.put(vault.seal("shared-subject", f"from {index}".encode()))


def test_shred_in_one_process_is_seen_by_another(tmp_path, key):
    path = tmp_path / "keys.db"
    vault = Vault.open(path, key, create=True)
    blob = vault.seal("user-42", b"x")
    assert vault.unseal(blob) == b"x"

    ctx = multiprocessing.get_context("spawn")
    queue = ctx.Queue()
    child = ctx.Process(target=_shred_in_child, args=(str(path), key.to_base64(), "user-42", queue))
    child.start()
    child.join(60)
    assert child.exitcode == 0
    assert queue.get(timeout=5) is True
    with pytest.raises(Shredded):
        vault.unseal(blob)


def test_processes_racing_to_create_converge(tmp_path, key):
    path = tmp_path / "keys.db"
    ctx = multiprocessing.get_context("spawn")
    queue = ctx.Queue()
    children = [
        ctx.Process(target=_seal_in_child, args=(str(path), key.to_base64(), i, queue)) for i in range(4)
    ]
    for child in children:
        child.start()
    blobs = [queue.get(timeout=60) for _ in children]
    for child in children:
        child.join(60)
        assert child.exitcode == 0
    vault = Vault.open(path, key)
    assert sorted(vault.unseal(b) for b in blobs) == sorted(f"from {i}".encode() for i in range(4))
    assert len({b[8:24] for b in blobs}) == 1, "all processes must share one subject key"


def test_one_vault_shared_by_threads(vault):
    def work(i):
        subject = f"user-{i % 5}"
        blob = vault.seal(subject, str(i).encode())
        return vault.unseal(blob) == str(i).encode()

    with ThreadPoolExecutor(max_workers=8) as pool:
        assert all(pool.map(work, range(200)))
    assert vault.verify_audit().ok


@pytest.mark.skipif(not hasattr(os, "fork"), reason="needs os.fork (POSIX)")
def test_vault_keeps_working_across_fork(vault):
    # gunicorn --preload and Celery prefork open the vault, then fork workers.
    blob = vault.seal("user-1", b"x")
    pid = os.fork()
    if pid == 0:
        try:
            ok = vault.unseal(blob) == b"x"
            vault.seal("user-2", b"y")
            vault.shred("user-1")
            os._exit(0 if ok else 1)
        except BaseException:
            os._exit(2)
    _, status = os.waitpid(pid, 0)
    assert os.waitstatus_to_exitcode(status) == 0
    with pytest.raises(Shredded):
        vault.unseal(blob)
    assert vault.has_key("user-2")
    assert vault.verify_audit().ok
