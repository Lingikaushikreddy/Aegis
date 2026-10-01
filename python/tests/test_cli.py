import os
import signal
import subprocess
import sys

import pytest


def aegis(*args, cwd, env_extra=None, stdin=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith("AEGIS_")}
    env.update(env_extra or {})
    return subprocess.run(
        [sys.executable, "-m", "aegis_shred", *args],
        cwd=cwd,
        env=env,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_cli_through_python(tmp_path):
    keygen = aegis("keygen", cwd=tmp_path)
    assert keygen.returncode == 0
    env = {"AEGIS_MASTER_KEY": keygen.stdout.strip()}
    assert aegis("init", cwd=tmp_path, env_extra=env).returncode == 0
    (tmp_path / "plain.txt").write_text("hello")
    assert aegis("seal", "-s", "user-1", "plain.txt", "-o", "p.aegis", cwd=tmp_path, env_extra=env).returncode == 0
    assert aegis("shred", "user-1", "--yes", cwd=tmp_path, env_extra=env).returncode == 0
    result = aegis("unseal", "p.aegis", "-o", "back.txt", cwd=tmp_path, env_extra=env)
    assert result.returncode == 3
    assert "shredded" in result.stderr


def test_help_and_usage_errors(tmp_path):
    assert "crypto-shredding" in aegis("--help", cwd=tmp_path).stdout.lower()
    assert aegis(cwd=tmp_path).returncode == 2


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signals")
def test_ctrl_c_stops_a_waiting_command(tmp_path):
    key = aegis("keygen", cwd=tmp_path).stdout.strip()
    assert aegis("init", cwd=tmp_path, env_extra={"AEGIS_MASTER_KEY": key}).returncode == 0
    env = {k: v for k, v in os.environ.items() if not k.startswith("AEGIS_")}
    env["AEGIS_MASTER_KEY"] = key
    proc = subprocess.Popen(
        [sys.executable, "-m", "aegis_shred", "shred", "user-1"],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        seen = b""
        while b"confirm" not in seen:  # wait until it is blocked on the confirmation prompt
            chunk = os.read(proc.stderr.fileno(), 1024)
            assert chunk, f"process ended early: {seen!r}"
            seen += chunk
        proc.send_signal(signal.SIGINT)
        assert proc.wait(timeout=5) == -signal.SIGINT
    finally:
        proc.kill()
        proc.wait()
