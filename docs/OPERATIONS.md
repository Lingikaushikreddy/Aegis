# Operating aegis-shred

## The two things you must not lose

- **The master key.** Without it nothing in the keystore can be unwrapped. Keep it in a secret
  manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, 1Password, …) and inject
  it as `AEGIS_MASTER_KEY`. Generate one with `aegis keygen`.
- **The keystore file.** It holds every data key. Losing it is equivalent to shredding every
  subject at once.

Back up both, separately, and test restores.

## Where the keystore lives

- One SQLite file, opened by every process that seals or unseals. Several processes and threads
  on one host can share it safely (SQLite locking; a 5-second busy timeout).
- Forking after opening the vault (gunicorn `--preload`, Celery prefork, `multiprocessing` with
  the fork start method) is supported: a forked process opens its own SQLite connection on its
  first call. Do not fork while another thread is in the middle of a vault call.
- Put it on local disk or a volume shared by the processes of one host. Network filesystems
  with unreliable locking (some NFS setups) are not supported.
- v0.1 has no multi-host keystore. Several app servers need a shared volume with working
  locks, or a single service that owns the vault. A Postgres keystore is planned.

## Backups and the shred journal

A keystore backup taken **before** a shred still contains that subject's wrapped key. Restoring
it would bring the subject's data back. To keep erasures permanent:

1. **Keep the keystore out of your general data backups.** Back it up on its own schedule with
   short retention.
2. **Export the shred journal after every erasure** (or on a schedule) and store it alongside
   your keystore backups:
   ```bash
   aegis tombstones export shreds.jsonl
   ```
3. **After any restore, re-apply the journal before serving traffic:**
   ```bash
   aegis --keystore restored.db tombstones import shreds.jsonl
   ```
4. **Rotate the master key periodically** and destroy the old one. Backups taken before the
   rotation then need a key that no longer exists.

## Rotating the master key

```bash
aegis keygen > new.key                    # or use your secret manager
aegis rotate-master-key --new-key-file new.key
```

Rotation re-wraps every data key in one transaction; sealed objects do not change. Other
processes still holding the old key get `WrongMasterKey` ("rotated by another process") on
their next operation and must be restarted with the new key. Destroy the old key once every
process uses the new one.

Passphrase keystores rotate with `--new-passphrase` (reads `AEGIS_NEW_PASSPHRASE` or prompts).

## Erasure requests

```bash
aegis shred user-42            # asks you to type the subject id to confirm
aegis shred user-42 --yes      # for scripts
```

The command prints a receipt: the destroyed key id, the time, the audit sequence number, and
the subject hash (the Python and Rust `ShredReceipt` carries the same fields). Keep the receipt with the erasure request
ticket: the audit log's `key.shredded` entry at that sequence number holds the same key id and
subject hash, which is how you show later that the request was honoured.

Shredding a subject with no key succeeds and changes nothing. If the same person signs up
again, they get a new key; their old data stays unreadable.

## Audit log

```bash
aegis audit verify     # checks the hash chain
aegis audit show       # newest entries
aegis audit head       # "<seq> <hash>" — copy this somewhere the keystore's owner cannot edit
```

Anchoring the head regularly (a ticket, a log pipeline, a git commit) lets you detect someone
rewriting the whole chain. Per-call `data.sealed` / `data.unsealed` events are off by default;
enable them with `Vault.open(..., audit_data_access=True)` if you need access logging and can
afford one keystore write per call.

## Inspecting a file

```bash
aegis inspect invoice.pdf.aegis
```

Shows the format version, chunk size, key id, and whether the key is present, shredded (and
when), or unknown to this keystore. It needs no master key.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | other error (missing file, bad argument, aborted confirmation) |
| 2 | usage error |
| 3 | the data's key was shredded |
| 4 | integrity failure (tampered data, wrong context, broken audit chain) |
| 5 | wrong master key |
| 6 | the data belongs to a different keystore |
