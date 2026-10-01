"""Import the installed aegis-shred wheel and check that a shred takes effect (used by release.yml)."""

import os
import tempfile

import aegis_shred as a

vault = a.Vault.open(os.path.join(tempfile.mkdtemp(), "k.db"), a.MasterKey.generate(), create=True)
blob = vault.seal("u", b"ok")
assert vault.unseal(blob) == b"ok"
vault.shred("u")
try:
    vault.unseal(blob)
except a.Shredded:
    print("wheel ok:", a.__version__)
else:
    raise SystemExit("shred did not take effect")
