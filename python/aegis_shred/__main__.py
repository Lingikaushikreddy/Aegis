"""The ``aegis`` command (also ``python -m aegis_shred``); runs the Rust CLI."""

import sys

from ._native import run_cli


def main() -> None:
    raise SystemExit(run_cli(["aegis", *sys.argv[1:]]))


if __name__ == "__main__":
    main()
