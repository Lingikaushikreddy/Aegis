//! The public `Vault` API: seal, unseal, shred, rotate, audit.

use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::{Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};

use crate::audit::{self, AuditEntry, AuditReport};
use crate::error::{Error, Result};
use crate::format::{self, Header};
use crate::keys::{self, KdfParams, Key32, MasterKey};
use crate::keystore::{self, StoredKey};

const ROTATED_ELSEWHERE: &str =
    "the master key was rotated by another process; reopen the vault with the new key";

/// Proof that a subject's data key was destroyed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShredReceipt {
    /// `HMAC-SHA256(index_key, subject_id)`, as recorded in the audit log.
    pub subject_hash: [u8; 32],
    /// Id of the destroyed data key.
    pub key_id: [u8; 16],
    /// Unix time (seconds) of the shred.
    pub shredded_at: i64,
    /// Sequence number of the `key.shredded` audit entry.
    pub audit_seq: i64,
}

#[derive(Serialize, Deserialize)]
struct TombstoneLine {
    key_id: String,
    shredded_at: i64,
}

struct Inner {
    conn: Connection,
    kek: Key32,
    index_key: Key32,
    /// Absolute keystore path, used to reopen the connection in a forked child.
    path: PathBuf,
    /// Process that opened `conn`.
    pid: u32,
}

/// A crypto-shredding vault backed by one keystore file.
///
/// `Vault` is `Send + Sync`; share one instance across threads. Several processes may open
/// the same keystore file at once.
pub struct Vault {
    inner: Mutex<Inner>,
    audit_data_access: bool,
}

impl std::fmt::Debug for Vault {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Vault")
            .field("audit_data_access", &self.audit_data_access)
            .finish_non_exhaustive()
    }
}

fn not_a_keystore() -> Error {
    Error::Keystore("the file is not an aegis-shred keystore".into())
}

fn check_kek(conn: &Connection, kek: &[u8; 32]) -> Result<()> {
    let check = keystore::meta_require(conn, "kek_check")?;
    match keys::unwrap(kek, &check, keys::AAD_KEK_CHECK) {
        Some(plaintext) if plaintext.as_slice() == keys::KEK_CHECK_PLAINTEXT => Ok(()),
        _ => Err(Error::WrongMasterKey(
            "the master key does not match this keystore",
        )),
    }
}

fn write_kek_meta(
    conn: &Connection,
    master_key: &MasterKey,
    kdf_salt: &[u8; 16],
    params: KdfParams,
    kek: &[u8; 32],
    index_key: &[u8; 32],
) -> Result<()> {
    keystore::meta_put(conn, "kek_kind", master_key.kind().as_bytes())?;
    keystore::meta_put(conn, "kdf_salt", kdf_salt)?;
    keystore::meta_put(conn, "kdf_params", &params.to_bytes())?;
    keystore::meta_put(
        conn,
        "kek_check",
        &keys::wrap(kek, keys::KEK_CHECK_PLAINTEXT, keys::AAD_KEK_CHECK),
    )?;
    keystore::meta_put(
        conn,
        "wrapped_index_key",
        &keys::wrap(kek, index_key, keys::AAD_INDEX_KEY),
    )?;
    Ok(())
}

fn unwrap_dek(conn: &Connection, kek: &[u8; 32], stored: &StoredKey) -> Result<Key32> {
    let aad = keys::dek_aad(&stored.key_id, &stored.subject_hash);
    match keys::unwrap_key32(kek, &stored.wrapped_dek, &aad) {
        Some(dek) => Ok(dek),
        None => {
            check_kek(conn, kek).map_err(|_| Error::WrongMasterKey(ROTATED_ELSEWHERE))?;
            Err(Error::Keystore(
                "corrupt keystore: a data key does not unwrap".into(),
            ))
        }
    }
}

/// Writes to a temporary file next to `destination` and renames it into place only on success.
fn write_atomically(
    destination: &Path,
    write: impl FnOnce(&mut BufWriter<&File>) -> Result<()>,
) -> Result<()> {
    let dir = match destination.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };
    let temp = tempfile::NamedTempFile::new_in(dir)?;
    {
        let mut writer = BufWriter::new(temp.as_file());
        write(&mut writer)?;
        writer.flush()?;
    }
    temp.as_file().sync_all()?;
    temp.persist(destination).map_err(|e| Error::Io(e.error))?;
    Ok(())
}

impl Vault {
    /// Opens an existing keystore.
    pub fn open(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        let conn = keystore::open_connection(path)?;
        Self::load(conn, path, master_key)
    }

    /// Creates a new keystore. Fails if any file already exists at `path`.
    pub fn create(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        if path.exists() {
            return Err(Error::InvalidArgument(
                "a file already exists at the keystore path".into(),
            ));
        }
        let mut conn = keystore::create_connection(path)?;
        Self::initialize(&mut conn, master_key, true)?;
        Self::load(conn, path, master_key)
    }

    /// Opens the keystore at `path`, creating it first if it does not exist.
    ///
    /// Safe to call from many processes at once: exactly one of them initializes the keystore.
    pub fn open_or_create(path: impl AsRef<Path>, master_key: &MasterKey) -> Result<Vault> {
        let path = path.as_ref();
        let mut conn = keystore::create_connection(path)?;
        Self::initialize(&mut conn, master_key, false)?;
        Self::load(conn, path, master_key)
    }

    /// Records `data.sealed` / `data.unsealed` audit events (one keystore write per call). Off by default.
    pub fn set_audit_data_access(&mut self, enabled: bool) {
        self.audit_data_access = enabled;
    }

    fn initialize(conn: &mut Connection, master_key: &MasterKey, must_be_new: bool) -> Result<()> {
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        if keystore::table_count(&tx)? > 0 {
            let has_meta: i64 = tx.query_row(
                "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'meta'",
                [],
                |r| r.get(0),
            )?;
            if has_meta == 0 || keystore::meta_get(&tx, "schema_version")?.is_none() {
                return Err(Error::InvalidArgument(
                    "the file is an existing SQLite database that is not an aegis-shred keystore"
                        .into(),
                ));
            }
            if must_be_new {
                return Err(Error::InvalidArgument(
                    "a keystore already exists at this path".into(),
                ));
            }
            return Ok(());
        }
        tx.execute_batch(keystore::SCHEMA)?;
        let kdf_salt = keys::random_bytes::<16>();
        let params = KdfParams::DEFAULT;
        let kek = keys::derive_kek(master_key, &kdf_salt, params)?;
        let index_key = keys::random_key();
        keystore::meta_put(&tx, "schema_version", keystore::SCHEMA_VERSION)?;
        keystore::meta_put(&tx, "created_at", &keystore::now().to_be_bytes())?;
        write_kek_meta(&tx, master_key, &kdf_salt, params, &kek, &index_key)?;
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEYSTORE_CREATED,
            None,
            None,
            None,
        )?;
        tx.commit()?;
        Ok(())
    }

    fn load(conn: Connection, path: &Path, master_key: &MasterKey) -> Result<Vault> {
        let version = keystore::meta_get(&conn, "schema_version")
            .map_err(|_| not_a_keystore())?
            .ok_or_else(not_a_keystore)?;
        if version != keystore::SCHEMA_VERSION {
            return Err(Error::UnsupportedFormat(
                "unsupported keystore schema version",
            ));
        }
        let kind = keystore::meta_require(&conn, "kek_kind")?;
        if kind != master_key.kind().as_bytes() {
            return Err(Error::WrongMasterKey(if kind == b"passphrase" {
                "this keystore is protected by a passphrase, not a raw key"
            } else {
                "this keystore is protected by a raw key, not a passphrase"
            }));
        }
        let kdf_salt = keystore::meta_require(&conn, "kdf_salt")?;
        let params = KdfParams::from_bytes(&keystore::meta_require(&conn, "kdf_params")?)?;
        let kek = keys::derive_kek(master_key, &kdf_salt, params)?;
        check_kek(&conn, &kek)?;
        let index_key = keys::unwrap_key32(
            &kek,
            &keystore::meta_require(&conn, "wrapped_index_key")?,
            keys::AAD_INDEX_KEY,
        )
        .ok_or_else(|| Error::Keystore("corrupt keystore: the index key does not unwrap".into()))?;
        Ok(Vault {
            inner: Mutex::new(Inner {
                conn,
                kek,
                index_key,
                path: std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf()),
                pid: std::process::id(),
            }),
            audit_data_access: false,
        })
    }

    /// Locks the vault. In a process forked after the vault was opened (gunicorn `--preload`,
    /// Celery prefork, `multiprocessing` with fork), first replaces the inherited SQLite
    /// connection: SQLite connections must not be used across `fork()`
    /// (<https://sqlite.org/howtocorrupt.html>, section 2.6).
    fn lock(&self) -> Result<MutexGuard<'_, Inner>> {
        let mut guard = self
            .inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let pid = std::process::id();
        if guard.pid != pid {
            let fresh = keystore::open_connection(&guard.path)?;
            // The inherited connection belongs to the parent: never use or close it here.
            std::mem::forget(std::mem::replace(&mut guard.conn, fresh));
            guard.pid = pid;
        }
        Ok(guard)
    }

    /// Returns the subject's data key, creating it on first use.
    fn data_key_for_subject(&self, subject: &str) -> Result<([u8; 16], Key32)> {
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let subject_hash = keys::subject_hash(&inner.index_key, subject);
        if let Some(stored) = keystore::key_by_subject(&inner.conn, &subject_hash)? {
            let dek = unwrap_dek(&inner.conn, &inner.kek, &stored)?;
            return Ok((stored.key_id, dek));
        }
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        // Another process may have created the key between our read and taking the write lock.
        if let Some(stored) = keystore::key_by_subject(&tx, &subject_hash)? {
            let dek = unwrap_dek(&tx, &inner.kek, &stored)?;
            return Ok((stored.key_id, dek));
        }
        let key_id = keys::random_bytes::<16>();
        let dek = keys::random_key();
        let wrapped_dek = keys::wrap(&inner.kek, &dek[..], &keys::dek_aad(&key_id, &subject_hash));
        keystore::insert_key(
            &tx,
            &StoredKey {
                subject_hash,
                key_id,
                wrapped_dek,
            },
            keystore::now(),
        )?;
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEY_CREATED,
            Some(&subject_hash),
            Some(&key_id),
            None,
        )?;
        tx.commit()?;
        Ok((key_id, dek))
    }

    fn data_key_for_id(&self, key_id: &[u8; 16]) -> Result<Key32> {
        let guard = self.lock()?;
        if let Some(stored) = keystore::key_by_id(&guard.conn, key_id)? {
            return unwrap_dek(&guard.conn, &guard.kek, &stored);
        }
        match keystore::tombstone_at(&guard.conn, key_id)? {
            Some(at) => Err(Error::Shredded { shredded_at: at }),
            None => Err(Error::UnknownKey),
        }
    }

    fn record_data_access(&self, event: &str, key_id: &[u8; 16]) -> Result<()> {
        if !self.audit_data_access {
            return Ok(());
        }
        let mut guard = self.lock()?;
        let tx = guard
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        keystore::audit_append(&tx, keystore::now(), event, None, Some(key_id), None)?;
        tx.commit()?;
        Ok(())
    }

    /// Encrypts `plaintext` for `subject`. Pass the same `context` to [`Vault::unseal`].
    pub fn seal(&self, subject: &str, plaintext: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(
            plaintext.len() + format::HEADER_LEN + 16 * (plaintext.len() / 65_536 + 1),
        );
        self.seal_stream(subject, plaintext, &mut out, context)?;
        Ok(out)
    }

    /// Decrypts a sealed object. Fails with [`Error::Shredded`] if its subject was shredded.
    pub fn unseal(&self, sealed: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(sealed.len());
        self.unseal_stream(sealed, &mut out, context)?;
        Ok(out)
    }

    /// Streams `input` into a sealed object written to `output`, in constant memory.
    pub fn seal_stream<R: Read, W: Write>(
        &self,
        subject: &str,
        input: R,
        output: W,
        context: &[u8],
    ) -> Result<()> {
        keys::validate_subject(subject)?;
        let (key_id, dek) = self.data_key_for_subject(subject)?;
        let header = Header::new(
            key_id,
            keys::random_bytes::<32>(),
            format::DEFAULT_CHUNK_SIZE_LOG2,
        );
        format::seal_with(&dek, &header, input, output, context)?;
        self.record_data_access(audit::EVENT_DATA_SEALED, &key_id)
    }

    /// Streams a sealed object from `input` and writes the plaintext to `output`.
    ///
    /// On error, `output` may already have received plaintext from earlier chunks; discard it.
    /// [`Vault::unseal_file`] does this for you.
    pub fn unseal_stream<R: Read, W: Write>(
        &self,
        mut input: R,
        output: W,
        context: &[u8],
    ) -> Result<()> {
        let header = format::read_header(&mut input)?;
        let dek = self.data_key_for_id(&header.key_id)?;
        format::unseal_with(&dek, &header, input, output, context)?;
        self.record_data_access(audit::EVENT_DATA_UNSEALED, &header.key_id)
    }

    /// Seals the file at `source` into `destination` (atomically replaced on success).
    pub fn seal_file(
        &self,
        subject: &str,
        source: impl AsRef<Path>,
        destination: impl AsRef<Path>,
        context: &[u8],
    ) -> Result<()> {
        keys::validate_subject(subject)?;
        let input = BufReader::new(File::open(source.as_ref())?);
        write_atomically(destination.as_ref(), |out| {
            self.seal_stream(subject, input, out, context)
        })
    }

    /// Unseals the file at `source` into `destination`. Nothing is written unless every chunk verifies.
    pub fn unseal_file(
        &self,
        source: impl AsRef<Path>,
        destination: impl AsRef<Path>,
        context: &[u8],
    ) -> Result<()> {
        let input = BufReader::new(File::open(source.as_ref())?);
        write_atomically(destination.as_ref(), |out| {
            self.unseal_stream(input, out, context)
        })
    }

    /// True when `subject` currently has a data key.
    pub fn has_key(&self, subject: &str) -> Result<bool> {
        keys::validate_subject(subject)?;
        let guard = self.lock()?;
        let subject_hash = keys::subject_hash(&guard.index_key, subject);
        Ok(keystore::key_by_subject(&guard.conn, &subject_hash)?.is_some())
    }

    /// Destroys `subject`'s data key. Returns `None` if the subject had no key.
    pub fn shred(&self, subject: &str) -> Result<Option<ShredReceipt>> {
        keys::validate_subject(subject)?;
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let subject_hash = keys::subject_hash(&inner.index_key, subject);
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let Some(stored) = keystore::key_by_subject(&tx, &subject_hash)? else {
            return Ok(None);
        };
        let at = keystore::now();
        keystore::delete_key(&tx, &subject_hash)?;
        keystore::insert_tombstone(&tx, &stored.key_id, at)?;
        let audit_seq = keystore::audit_append(
            &tx,
            at,
            audit::EVENT_KEY_SHREDDED,
            Some(&subject_hash),
            Some(&stored.key_id),
            None,
        )?;
        tx.commit()?;
        Ok(Some(ShredReceipt {
            subject_hash,
            key_id: stored.key_id,
            shredded_at: at,
            audit_seq,
        }))
    }

    /// All audit entries, oldest first.
    pub fn audit_entries(&self) -> Result<Vec<AuditEntry>> {
        keystore::audit_entries(&self.lock()?.conn)
    }

    /// Verifies the audit hash chain.
    pub fn verify_audit(&self) -> Result<AuditReport> {
        Ok(audit::verify_chain(&self.audit_entries()?))
    }

    /// `(seq, hash)` of the newest audit entry; anchor it somewhere outside the keystore.
    pub fn audit_head(&self) -> Result<(i64, [u8; 32])> {
        keystore::audit_head(&self.lock()?.conn)
    }

    /// Re-wraps every data key under `new_master_key` in one transaction.
    pub fn rotate_master_key(&self, new_master_key: &MasterKey) -> Result<()> {
        let mut guard = self.lock()?;
        let inner = &mut *guard;
        let kdf_salt = keys::random_bytes::<16>();
        let params = KdfParams::DEFAULT;
        let new_kek = keys::derive_kek(new_master_key, &kdf_salt, params)?;
        let tx = inner
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        check_kek(&tx, &inner.kek).map_err(|_| Error::WrongMasterKey(ROTATED_ELSEWHERE))?;
        let stored_keys = keystore::all_keys(&tx)?;
        for stored in &stored_keys {
            let dek = unwrap_dek(&tx, &inner.kek, stored)?;
            let rewrapped = keys::wrap(
                &new_kek,
                &dek[..],
                &keys::dek_aad(&stored.key_id, &stored.subject_hash),
            );
            keystore::update_wrapped_dek(&tx, &stored.subject_hash, &rewrapped)?;
        }
        write_kek_meta(
            &tx,
            new_master_key,
            &kdf_salt,
            params,
            &new_kek,
            &inner.index_key,
        )?;
        let detail = format!(
            "{{\"keys\":{},\"kind\":\"{}\"}}",
            stored_keys.len(),
            new_master_key.kind()
        );
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_KEK_ROTATED,
            None,
            None,
            Some(&detail),
        )?;
        tx.commit()?;
        inner.kek = new_kek;
        Ok(())
    }

    /// Writes every tombstone as JSON Lines to `path`; returns how many were written.
    pub fn export_tombstones(&self, path: impl AsRef<Path>) -> Result<u64> {
        let rows = keystore::all_tombstones(&self.lock()?.conn)?;
        write_atomically(path.as_ref(), |out| {
            for (key_id, at) in &rows {
                let line = TombstoneLine {
                    key_id: hex::encode(key_id),
                    shredded_at: *at,
                };
                serde_json::to_writer(&mut *out, &line).map_err(|e| Error::Io(e.into()))?;
                out.write_all(b"\n")?;
            }
            Ok(())
        })?;
        Ok(rows.len() as u64)
    }

    /// Re-applies a tombstone journal, e.g. after restoring an old keystore backup.
    /// Deletes any data key named in the journal. Returns how many tombstones were new.
    pub fn import_tombstones(&self, path: impl AsRef<Path>) -> Result<u64> {
        let text = std::fs::read_to_string(path)?;
        let mut parsed = Vec::new();
        for (index, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let entry: TombstoneLine = serde_json::from_str(line).map_err(|_| {
                Error::InvalidArgument(format!("line {}: not a tombstone record", index + 1))
            })?;
            let key_id: [u8; 16] = hex::decode(&entry.key_id)
                .ok()
                .and_then(|bytes| bytes.try_into().ok())
                .ok_or_else(|| {
                    Error::InvalidArgument(format!(
                        "line {}: key_id must be 32 hex characters",
                        index + 1
                    ))
                })?;
            parsed.push((key_id, entry.shredded_at));
        }
        let mut guard = self.lock()?;
        let tx = guard
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)?;
        let (mut added, mut removed) = (0u64, 0u64);
        for (key_id, at) in &parsed {
            if keystore::insert_tombstone(&tx, key_id, *at)? {
                added += 1;
            }
            removed += keystore::delete_key_by_id(&tx, key_id)? as u64;
        }
        let detail = format!("{{\"added\":{added},\"keys_removed\":{removed}}}");
        keystore::audit_append(
            &tx,
            keystore::now(),
            audit::EVENT_TOMBSTONES_IMPORTED,
            None,
            None,
            Some(&detail),
        )?;
        tx.commit()?;
        Ok(added)
    }
}
