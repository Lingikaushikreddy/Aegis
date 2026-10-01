# aegis-shred-cli

The `aegis` command-line tool for [aegis-shred](https://github.com/Lingikaushikreddy/Aegis)
crypto-shredding vaults.

```bash
cargo install aegis-shred-cli
export AEGIS_MASTER_KEY="$(aegis keygen)"
aegis init
aegis seal -s user-42 scan.pdf -o scan.pdf.aegis
aegis unseal scan.pdf.aegis -o scan.pdf
aegis shred user-42            # every file sealed for user-42 is now unreadable
aegis audit verify
```

The same command is installed by `pip install aegis-shred`. Run `aegis --help` for all commands.

Licensed under MIT or Apache-2.0, at your option.
