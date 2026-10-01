"""The ``aegis`` command (also ``python -m aegis_shred``); runs the Rust CLI."""

import signal
import sys

from ._native import run_cli


def main() -> None:
    # The Rust CLI never returns to Python while it works or waits at a prompt, so Python's
    # KeyboardInterrupt handler would leave Ctrl-C ignored. Let the signal end the process.
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    raise SystemExit(run_cli(["aegis", *sys.argv[1:]]))


if __name__ == "__main__":
    main()
