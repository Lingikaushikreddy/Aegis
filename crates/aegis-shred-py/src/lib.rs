//! Python bindings for aegis-shred, exposed as `aegis_shred._native`.

use std::path::PathBuf;

use aegis_shred as core;
use pyo3::create_exception;
use pyo3::exceptions::{PyException, PyValueError};
use pyo3::prelude::*;
use pyo3::types::PyBytes;

create_exception!(
    aegis_shred,
    AegisError,
    PyException,
    "Base class for aegis-shred errors."
);
create_exception!(
    aegis_shred,
    Shredded,
    AegisError,
    "The data key for this object was shredded."
);
create_exception!(
    aegis_shred,
    UnknownKey,
    AegisError,
    "The object was sealed with a key that is not in this keystore."
);
create_exception!(
    aegis_shred,
    WrongMasterKey,
    AegisError,
    "The master key does not match the keystore."
);
create_exception!(
    aegis_shred,
    IntegrityError,
    AegisError,
    "The data is corrupt, truncated, tampered with, or the context does not match."
);
create_exception!(
    aegis_shred,
    UnsupportedFormat,
    AegisError,
    "The bytes are not a sealed object this version understands."
);
create_exception!(
    aegis_shred,
    KeystoreError,
    AegisError,
    "The keystore database failed or is corrupt."
);

fn to_py_err(err: core::Error) -> PyErr {
    let message = err.to_string();
    match err {
        core::Error::Shredded { .. } => Shredded::new_err(message),
        core::Error::UnknownKey => UnknownKey::new_err(message),
        core::Error::WrongMasterKey(_) => WrongMasterKey::new_err(message),
        core::Error::Integrity => IntegrityError::new_err(message),
        core::Error::UnsupportedFormat(_) => UnsupportedFormat::new_err(message),
        core::Error::Keystore(_) => KeystoreError::new_err(message),
        core::Error::Io(io) => PyErr::from(io),
        core::Error::InvalidArgument(_) => PyValueError::new_err(message),
    }
}

/// A master key (key-encryption key). Its value is never shown by repr().
#[pyclass(frozen, module = "aegis_shred")]
struct MasterKey {
    inner: core::MasterKey,
}

#[pymethods]
impl MasterKey {
    /// A new random 32-byte key.
    #[staticmethod]
    fn generate() -> Self {
        MasterKey {
            inner: core::MasterKey::generate(),
        }
    }

    /// Decode a base64 key (32 bytes).
    #[staticmethod]
    fn from_base64(encoded: &str) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_base64(encoded).map_err(to_py_err)?,
        })
    }

    /// Read a base64 key from an environment variable.
    #[staticmethod]
    #[pyo3(signature = (name = "AEGIS_MASTER_KEY"))]
    fn from_env(name: &str) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_env(name).map_err(to_py_err)?,
        })
    }

    /// Read a base64 key from a file.
    #[staticmethod]
    fn from_file(path: PathBuf) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_file(path).map_err(to_py_err)?,
        })
    }

    /// Use a passphrase (stretched with Argon2id).
    #[staticmethod]
    fn from_passphrase(passphrase: String) -> PyResult<Self> {
        Ok(MasterKey {
            inner: core::MasterKey::from_passphrase(passphrase).map_err(to_py_err)?,
        })
    }

    /// The key as base64. Raises ValueError for passphrase keys.
    fn to_base64(&self) -> PyResult<String> {
        self.inner.to_base64().map_err(to_py_err)
    }

    /// "raw" or "passphrase".
    #[getter]
    fn kind(&self) -> &'static str {
        self.inner.kind()
    }

    fn __repr__(&self) -> String {
        format!("MasterKey(kind='{}')", self.inner.kind())
    }
}

/// Proof that a subject's data key was destroyed.
#[pyclass(frozen, get_all, module = "aegis_shred")]
struct ShredReceipt {
    subject_hash: String,
    key_id: String,
    shredded_at: i64,
    audit_seq: i64,
}

#[pymethods]
impl ShredReceipt {
    fn __repr__(&self) -> String {
        format!(
            "ShredReceipt(key_id='{}', shredded_at={}, audit_seq={})",
            self.key_id, self.shredded_at, self.audit_seq
        )
    }
}

/// Result of verifying the audit hash chain.
#[pyclass(frozen, get_all, module = "aegis_shred")]
struct AuditReport {
    ok: bool,
    entries: u64,
    head: String,
    first_bad_seq: Option<i64>,
}

#[pymethods]
impl AuditReport {
    fn __repr__(&self) -> String {
        format!(
            "AuditReport(ok={}, entries={}, head='{}', first_bad_seq={:?})",
            if self.ok { "True" } else { "False" },
            self.entries,
            self.head,
            self.first_bad_seq
        )
    }
}

/// A crypto-shredding vault backed by one keystore file. Safe to share across threads.
#[pyclass(frozen, module = "aegis_shred")]
struct Vault {
    inner: core::Vault,
}

#[pymethods]
impl Vault {
    /// Open the keystore at `path`; with `create=True`, create it if missing.
    #[staticmethod]
    #[pyo3(signature = (path, master_key, *, create = false, audit_data_access = false))]
    fn open(
        py: Python<'_>,
        path: PathBuf,
        master_key: &MasterKey,
        create: bool,
        audit_data_access: bool,
    ) -> PyResult<Self> {
        let key = master_key.inner.clone();
        let mut vault = py
            .detach(|| {
                if create {
                    core::Vault::open_or_create(&path, &key)
                } else {
                    core::Vault::open(&path, &key)
                }
            })
            .map_err(to_py_err)?;
        vault.set_audit_data_access(audit_data_access);
        Ok(Vault { inner: vault })
    }

    /// Encrypt `data` for `subject`. Pass the same `context` to unseal().
    #[pyo3(signature = (subject, data, context = None))]
    fn seal<'py>(
        &self,
        py: Python<'py>,
        subject: &str,
        data: &[u8],
        context: Option<&[u8]>,
    ) -> PyResult<Bound<'py, PyBytes>> {
        let context = context.unwrap_or_default();
        let sealed = py
            .detach(|| self.inner.seal(subject, data, context))
            .map_err(to_py_err)?;
        Ok(PyBytes::new(py, &sealed))
    }

    /// Decrypt a sealed object. Raises Shredded if its subject was shredded.
    #[pyo3(signature = (sealed, context = None))]
    fn unseal<'py>(
        &self,
        py: Python<'py>,
        sealed: &[u8],
        context: Option<&[u8]>,
    ) -> PyResult<Bound<'py, PyBytes>> {
        let context = context.unwrap_or_default();
        let plaintext = py
            .detach(|| self.inner.unseal(sealed, context))
            .map_err(to_py_err)?;
        Ok(PyBytes::new(py, &plaintext))
    }

    /// Seal the file at `source` into `destination` (streaming, atomic).
    #[pyo3(signature = (subject, source, destination, context = None))]
    fn seal_file(
        &self,
        py: Python<'_>,
        subject: &str,
        source: PathBuf,
        destination: PathBuf,
        context: Option<&[u8]>,
    ) -> PyResult<()> {
        let context = context.unwrap_or_default();
        py.detach(|| {
            self.inner
                .seal_file(subject, &source, &destination, context)
        })
        .map_err(to_py_err)
    }

    /// Unseal `source` into `destination`; nothing is written unless every chunk verifies.
    #[pyo3(signature = (source, destination, context = None))]
    fn unseal_file(
        &self,
        py: Python<'_>,
        source: PathBuf,
        destination: PathBuf,
        context: Option<&[u8]>,
    ) -> PyResult<()> {
        let context = context.unwrap_or_default();
        py.detach(|| self.inner.unseal_file(&source, &destination, context))
            .map_err(to_py_err)
    }

    /// True when `subject` currently has a data key.
    fn has_key(&self, py: Python<'_>, subject: &str) -> PyResult<bool> {
        py.detach(|| self.inner.has_key(subject)).map_err(to_py_err)
    }

    /// Destroy `subject`'s data key. Returns None if the subject had no key.
    fn shred(&self, py: Python<'_>, subject: &str) -> PyResult<Option<ShredReceipt>> {
        let receipt = py.detach(|| self.inner.shred(subject)).map_err(to_py_err)?;
        Ok(receipt.map(|r| ShredReceipt {
            subject_hash: hex::encode(r.subject_hash),
            key_id: hex::encode(r.key_id),
            shredded_at: r.shredded_at,
            audit_seq: r.audit_seq,
        }))
    }

    /// Verify the audit hash chain.
    fn verify_audit(&self, py: Python<'_>) -> PyResult<AuditReport> {
        let report = py.detach(|| self.inner.verify_audit()).map_err(to_py_err)?;
        Ok(AuditReport {
            ok: report.ok,
            entries: report.entries,
            head: hex::encode(report.head),
            first_bad_seq: report.first_bad_seq,
        })
    }

    /// (seq, hash_hex) of the newest audit entry.
    fn audit_head(&self, py: Python<'_>) -> PyResult<(i64, String)> {
        let (seq, hash) = py.detach(|| self.inner.audit_head()).map_err(to_py_err)?;
        Ok((seq, hex::encode(hash)))
    }

    /// Re-wrap every data key under `new_master_key`.
    fn rotate_master_key(&self, py: Python<'_>, new_master_key: &MasterKey) -> PyResult<()> {
        let key = new_master_key.inner.clone();
        py.detach(|| self.inner.rotate_master_key(&key))
            .map_err(to_py_err)
    }

    /// Write every tombstone to `path` as JSON Lines; returns the count.
    fn export_tombstones(&self, py: Python<'_>, path: PathBuf) -> PyResult<u64> {
        py.detach(|| self.inner.export_tombstones(&path))
            .map_err(to_py_err)
    }

    /// Re-apply a tombstone journal; returns how many tombstones were new.
    fn import_tombstones(&self, py: Python<'_>, path: PathBuf) -> PyResult<u64> {
        py.detach(|| self.inner.import_tombstones(&path))
            .map_err(to_py_err)
    }
}

/// Run the `aegis` command line with `argv` (including the program name); returns the exit code.
#[pyfunction]
fn run_cli(argv: Vec<String>) -> i32 {
    aegis_shred_cli::run(argv)
}

#[pymodule]
fn _native(m: &Bound<'_, PyModule>) -> PyResult<()> {
    let py = m.py();
    m.add("__version__", env!("CARGO_PKG_VERSION"))?;
    m.add_class::<MasterKey>()?;
    m.add_class::<Vault>()?;
    m.add_class::<ShredReceipt>()?;
    m.add_class::<AuditReport>()?;
    m.add_function(wrap_pyfunction!(run_cli, m)?)?;
    m.add("AegisError", py.get_type::<AegisError>())?;
    m.add("Shredded", py.get_type::<Shredded>())?;
    m.add("UnknownKey", py.get_type::<UnknownKey>())?;
    m.add("WrongMasterKey", py.get_type::<WrongMasterKey>())?;
    m.add("IntegrityError", py.get_type::<IntegrityError>())?;
    m.add("UnsupportedFormat", py.get_type::<UnsupportedFormat>())?;
    m.add("KeystoreError", py.get_type::<KeystoreError>())?;
    Ok(())
}
