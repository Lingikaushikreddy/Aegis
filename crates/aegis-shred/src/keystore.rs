//! SQLite storage for wrapped keys, tombstones, metadata, and the audit log.
//!
//! This module only stores bytes; wrapping and unwrapping live in `keys`, orchestration in `vault`.

use std::io;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OpenFlags, OptionalExtension, params};

use crate::audit::{self, AuditEntry};
use crate::error::{Error, Result};

pub(crate) const SCHEMA_VERSION: &[u8] = b"1";

pub(crate) const SCHEMA: &str = "
CREATE TABLE meta (
  name  TEXT PRIMARY KEY,
  value BLOB NOT NULL
);
CREATE TABLE subject_keys (
  subject_hash BLOB PRIMARY KEY,
  key_id       BLOB NOT NULL UNIQUE,
  wrapped_dek  BLOB NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE TABLE tombstones (
  key_id      BLOB PRIMARY KEY,
  shredded_at INTEGER NOT NULL
);
CREATE TABLE audit (
  seq          INTEGER PRIMARY KEY,
  ts           INTEGER NOT NULL,
  event        TEXT NOT NULL,
  subject_hash BLOB,
  key_id       BLOB,
  detail       TEXT,
  prev_hash    BLOB NOT NULL,
  hash         BLOB NOT NULL
);";

/// Whether a data key is present, shredded, or unknown in a keystore.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyStatus {
    /// The key exists; objects sealed with it can be unsealed.
    Present,
    /// The key was shredded.
    Shredded {
        /// Unix time (seconds) of the shred.
        at: i64,
    },
    /// This keystore has never held the key.
    Unknown,
}

/// A wrapped data key as stored on disk.
pub(crate) struct StoredKey {
    pub subject_hash: [u8; 32],
    pub key_id: [u8; 16],
    pub wrapped_dek: Vec<u8>,
}

pub(crate) fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Per-connection settings only: nothing here writes to the database file, so opening a file
/// that turns out not to be a keystore leaves it untouched.
fn configure(conn: &Connection) -> Result<()> {
    conn.busy_timeout(Duration::from_secs(5))?;
    conn.pragma_update(None, "secure_delete", "ON")?;
    Ok(())
}

/// Keeps a keystore in rollback-journal mode (new SQLite files start in it; this undoes a
/// switch to WAL). Call only once the file is known to be a keystore.
pub(crate) fn use_rollback_journal(conn: &Connection) -> Result<()> {
    let _mode: String =
        conn.pragma_update_and_check(None, "journal_mode", "DELETE", |row| row.get(0))?;
    Ok(())
}

/// Opens (creating the file if needed) a connection for a keystore that may not be initialized yet.
pub(crate) fn create_connection(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "the keystore's directory does not exist",
            )
            .into());
        }
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    configure(&conn)?;
    Ok(conn)
}

/// Opens an existing keystore file read-write.
pub(crate) fn open_connection(path: &Path) -> Result<Connection> {
    if !path.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "keystore file not found").into());
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    configure(&conn)?;
    Ok(conn)
}

pub(crate) fn table_count(conn: &Connection) -> Result<i64> {
    Ok(conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type = 'table'",
        [],
        |r| r.get(0),
    )?)
}

pub(crate) fn meta_get(conn: &Connection, name: &str) -> Result<Option<Vec<u8>>> {
    Ok(conn
        .query_row("SELECT value FROM meta WHERE name = ?1", [name], |r| {
            r.get(0)
        })
        .optional()?)
}

pub(crate) fn meta_require(conn: &Connection, name: &str) -> Result<Vec<u8>> {
    meta_get(conn, name)?
        .ok_or_else(|| Error::Keystore(format!("corrupt keystore: missing {name}")))
}

pub(crate) fn meta_put(conn: &Connection, name: &str, value: &[u8]) -> Result<()> {
    conn.execute(
        "INSERT INTO meta (name, value) VALUES (?1, ?2)
         ON CONFLICT(name) DO UPDATE SET value = excluded.value",
        params![name, value],
    )?;
    Ok(())
}

fn to_array<const N: usize>(bytes: Vec<u8>) -> Result<[u8; N]> {
    bytes
        .try_into()
        .map_err(|_| Error::Keystore("corrupt keystore: field has the wrong length".into()))
}

pub(crate) fn key_by_subject(
    conn: &Connection,
    subject_hash: &[u8; 32],
) -> Result<Option<StoredKey>> {
    let row: Option<(Vec<u8>, Vec<u8>)> = conn
        .query_row(
            "SELECT key_id, wrapped_dek FROM subject_keys WHERE subject_hash = ?1",
            [&subject_hash[..]],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    row.map(|(key_id, wrapped_dek)| {
        Ok(StoredKey {
            subject_hash: *subject_hash,
            key_id: to_array(key_id)?,
            wrapped_dek,
        })
    })
    .transpose()
}

pub(crate) fn key_by_id(conn: &Connection, key_id: &[u8; 16]) -> Result<Option<StoredKey>> {
    let row: Option<(Vec<u8>, Vec<u8>)> = conn
        .query_row(
            "SELECT subject_hash, wrapped_dek FROM subject_keys WHERE key_id = ?1",
            [&key_id[..]],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    row.map(|(subject_hash, wrapped_dek)| {
        Ok(StoredKey {
            subject_hash: to_array(subject_hash)?,
            key_id: *key_id,
            wrapped_dek,
        })
    })
    .transpose()
}

pub(crate) fn insert_key(conn: &Connection, key: &StoredKey, created_at: i64) -> Result<()> {
    conn.execute(
        "INSERT INTO subject_keys (subject_hash, key_id, wrapped_dek, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![&key.subject_hash[..], &key.key_id[..], key.wrapped_dek, created_at],
    )?;
    Ok(())
}

pub(crate) fn all_keys(conn: &Connection) -> Result<Vec<StoredKey>> {
    let mut stmt = conn.prepare("SELECT subject_hash, key_id, wrapped_dek FROM subject_keys")?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, Vec<u8>>(0)?,
            r.get::<_, Vec<u8>>(1)?,
            r.get::<_, Vec<u8>>(2)?,
        ))
    })?;
    let mut keys = Vec::new();
    for row in rows {
        let (subject_hash, key_id, wrapped_dek) = row?;
        keys.push(StoredKey {
            subject_hash: to_array(subject_hash)?,
            key_id: to_array(key_id)?,
            wrapped_dek,
        });
    }
    Ok(keys)
}

pub(crate) fn update_wrapped_dek(
    conn: &Connection,
    subject_hash: &[u8; 32],
    wrapped_dek: &[u8],
) -> Result<()> {
    conn.execute(
        "UPDATE subject_keys SET wrapped_dek = ?1 WHERE subject_hash = ?2",
        params![wrapped_dek, &subject_hash[..]],
    )?;
    Ok(())
}

pub(crate) fn delete_key(conn: &Connection, subject_hash: &[u8; 32]) -> Result<()> {
    conn.execute(
        "DELETE FROM subject_keys WHERE subject_hash = ?1",
        [&subject_hash[..]],
    )?;
    Ok(())
}

pub(crate) fn delete_key_by_id(conn: &Connection, key_id: &[u8; 16]) -> Result<usize> {
    Ok(conn.execute("DELETE FROM subject_keys WHERE key_id = ?1", [&key_id[..]])?)
}

pub(crate) fn tombstone_at(conn: &Connection, key_id: &[u8; 16]) -> Result<Option<i64>> {
    Ok(conn
        .query_row(
            "SELECT shredded_at FROM tombstones WHERE key_id = ?1",
            [&key_id[..]],
            |r| r.get(0),
        )
        .optional()?)
}

/// Returns true when the tombstone was new.
pub(crate) fn insert_tombstone(conn: &Connection, key_id: &[u8; 16], at: i64) -> Result<bool> {
    let changed = conn.execute(
        "INSERT OR IGNORE INTO tombstones (key_id, shredded_at) VALUES (?1, ?2)",
        params![&key_id[..], at],
    )?;
    Ok(changed == 1)
}

pub(crate) fn all_tombstones(conn: &Connection) -> Result<Vec<([u8; 16], i64)>> {
    let mut stmt =
        conn.prepare("SELECT key_id, shredded_at FROM tombstones ORDER BY shredded_at, key_id")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, Vec<u8>>(0)?, r.get::<_, i64>(1)?)))?;
    let mut out = Vec::new();
    for row in rows {
        let (key_id, at) = row?;
        out.push((to_array(key_id)?, at));
    }
    Ok(out)
}

/// Appends an audit entry linked to the current head; returns its sequence number.
pub(crate) fn audit_append(
    conn: &Connection,
    ts: i64,
    event: &str,
    subject_hash: Option<&[u8]>,
    key_id: Option<&[u8]>,
    detail: Option<&str>,
) -> Result<i64> {
    let (head_seq, head_hash) = audit_head(conn)?;
    let seq = head_seq + 1;
    let hash = audit::entry_hash(&head_hash, seq, ts, event, subject_hash, key_id, detail);
    conn.execute(
        "INSERT INTO audit (seq, ts, event, subject_hash, key_id, detail, prev_hash, hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            seq,
            ts,
            event,
            subject_hash,
            key_id,
            detail,
            &head_hash[..],
            &hash[..]
        ],
    )?;
    Ok(seq)
}

/// `(seq, hash)` of the newest audit entry, or `(0, zeros)` when the log is empty.
pub(crate) fn audit_head(conn: &Connection) -> Result<(i64, [u8; 32])> {
    let row: Option<(i64, Vec<u8>)> = conn
        .query_row(
            "SELECT seq, hash FROM audit ORDER BY seq DESC LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    match row {
        Some((seq, hash)) => Ok((seq, to_array(hash)?)),
        None => Ok((0, audit::GENESIS_HASH)),
    }
}

pub(crate) fn audit_entries(conn: &Connection) -> Result<Vec<AuditEntry>> {
    let mut stmt = conn.prepare(
        "SELECT seq, ts, event, subject_hash, key_id, detail, prev_hash, hash FROM audit ORDER BY seq",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(AuditEntry {
            seq: r.get(0)?,
            ts: r.get(1)?,
            event: r.get(2)?,
            subject_hash: r.get(3)?,
            key_id: r.get(4)?,
            detail: r.get(5)?,
            prev_hash: r.get(6)?,
            hash: r.get(7)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Reports whether `key_id` is present, shredded, or unknown, without needing the master key.
pub fn key_status(keystore: impl AsRef<Path>, key_id: &[u8; 16]) -> Result<KeyStatus> {
    let path = keystore.as_ref();
    if !path.exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "keystore file not found").into());
    }
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(Duration::from_secs(5))?;
    if key_by_id(&conn, key_id)?.is_some() {
        return Ok(KeyStatus::Present);
    }
    Ok(match tombstone_at(&conn, key_id)? {
        Some(at) => KeyStatus::Shredded { at },
        None => KeyStatus::Unknown,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(SCHEMA).unwrap();
        conn
    }

    #[test]
    fn keys_round_trip_and_delete() {
        let conn = store();
        let key = StoredKey {
            subject_hash: [1; 32],
            key_id: [2; 16],
            wrapped_dek: vec![3; 60],
        };
        insert_key(&conn, &key, 10).unwrap();
        assert_eq!(
            key_by_subject(&conn, &[1; 32]).unwrap().unwrap().key_id,
            [2; 16]
        );
        assert_eq!(
            key_by_id(&conn, &[2; 16]).unwrap().unwrap().subject_hash,
            [1; 32]
        );
        assert_eq!(all_keys(&conn).unwrap().len(), 1);
        update_wrapped_dek(&conn, &[1; 32], &[9; 60]).unwrap();
        assert_eq!(
            key_by_id(&conn, &[2; 16]).unwrap().unwrap().wrapped_dek,
            vec![9; 60]
        );
        delete_key(&conn, &[1; 32]).unwrap();
        assert!(key_by_subject(&conn, &[1; 32]).unwrap().is_none());
    }

    #[test]
    fn tombstones_are_idempotent() {
        let conn = store();
        assert!(insert_tombstone(&conn, &[5; 16], 100).unwrap());
        assert!(!insert_tombstone(&conn, &[5; 16], 200).unwrap());
        assert_eq!(tombstone_at(&conn, &[5; 16]).unwrap(), Some(100));
        assert_eq!(all_tombstones(&conn).unwrap(), vec![([5; 16], 100)]);
    }

    #[test]
    fn audit_append_links_entries() {
        let conn = store();
        assert_eq!(audit_head(&conn).unwrap(), (0, audit::GENESIS_HASH));
        assert_eq!(audit_append(&conn, 1, "a", None, None, None).unwrap(), 1);
        assert_eq!(
            audit_append(&conn, 2, "b", Some(&[1; 32]), Some(&[2; 16]), Some("{}")).unwrap(),
            2
        );
        let entries = audit_entries(&conn).unwrap();
        assert_eq!(entries[1].prev_hash, entries[0].hash);
        assert!(audit::verify_chain(&entries).ok);
    }

    #[test]
    fn meta_upserts() {
        let conn = store();
        assert!(meta_get(&conn, "x").unwrap().is_none());
        meta_put(&conn, "x", b"1").unwrap();
        meta_put(&conn, "x", b"2").unwrap();
        assert_eq!(meta_require(&conn, "x").unwrap(), b"2");
        assert!(meta_require(&conn, "missing").is_err());
    }
}
