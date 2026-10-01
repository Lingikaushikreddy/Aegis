//! Key material: master keys, key wrapping, and key derivation.

use std::fmt;
use std::path::Path;

use aes_gcm::Aes256Gcm;
use aes_gcm::aead::{Aead, KeyInit, Payload};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as B64;
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use zeroize::Zeroizing;

use crate::error::{Error, Result};

/// A 32-byte secret that is wiped from memory when dropped.
pub(crate) type Key32 = Zeroizing<[u8; 32]>;

pub(crate) const AAD_DEK: &[u8] = b"aegis-shred/v1/dek";
pub(crate) const AAD_INDEX_KEY: &[u8] = b"aegis-shred/v1/index-key";
pub(crate) const AAD_KEK_CHECK: &[u8] = b"aegis-shred/v1/kek-check";
pub(crate) const KEK_CHECK_PLAINTEXT: &[u8] = b"aegis-shred kek check";
const OBJECT_KEY_INFO: &[u8] = b"aegis-shred/v1/object";
const MAX_SUBJECT_LEN: usize = 256;
const NONCE_LEN: usize = 12;
const TAG_LEN: usize = 16;

pub(crate) fn random_bytes<const N: usize>() -> [u8; N] {
    let mut buf = [0u8; N];
    getrandom::fill(&mut buf).expect("operating system random number generator failed");
    buf
}

pub(crate) fn random_key() -> Key32 {
    Zeroizing::new(random_bytes::<32>())
}

/// The master key (key-encryption key) that protects every data key in a keystore.
#[derive(Clone)]
pub enum MasterKey {
    /// 32 random bytes, usually stored base64-encoded in a secret manager.
    Raw(Zeroizing<[u8; 32]>),
    /// A passphrase, stretched with Argon2id when the keystore is opened.
    Passphrase(Zeroizing<String>),
}

impl fmt::Debug for MasterKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MasterKey::Raw(_) => f.write_str("MasterKey::Raw(<redacted>)"),
            MasterKey::Passphrase(_) => f.write_str("MasterKey::Passphrase(<redacted>)"),
        }
    }
}

impl MasterKey {
    /// Generates a new random 32-byte master key.
    pub fn generate() -> Self {
        MasterKey::Raw(random_key())
    }

    /// Uses exactly 32 raw bytes as the master key.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        let arr: [u8; 32] = bytes.try_into().map_err(|_| {
            Error::InvalidArgument("a raw master key must be exactly 32 bytes".into())
        })?;
        Ok(MasterKey::Raw(Zeroizing::new(arr)))
    }

    /// Decodes a base64 (standard alphabet, padded) master key. Surrounding whitespace is ignored.
    pub fn from_base64(encoded: &str) -> Result<Self> {
        let bytes = Zeroizing::new(
            B64.decode(encoded.trim())
                .map_err(|_| Error::InvalidArgument("master key is not valid base64".into()))?,
        );
        Self::from_bytes(&bytes)
    }

    /// Reads a base64 master key from an environment variable.
    pub fn from_env(var: &str) -> Result<Self> {
        let value = Zeroizing::new(std::env::var(var).map_err(|_| {
            Error::InvalidArgument(format!(
                "environment variable {var} is not set or is not valid UTF-8"
            ))
        })?);
        Self::from_base64(&value)
    }

    /// Reads a base64 master key from a file.
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self> {
        let text = Zeroizing::new(std::fs::read_to_string(path)?);
        Self::from_base64(&text)
    }

    /// Uses a passphrase as the master key.
    pub fn from_passphrase(passphrase: impl Into<String>) -> Result<Self> {
        let passphrase = Zeroizing::new(passphrase.into());
        if passphrase.is_empty() {
            return Err(Error::InvalidArgument(
                "passphrase must not be empty".into(),
            ));
        }
        Ok(MasterKey::Passphrase(passphrase))
    }

    /// Encodes a raw master key as base64. Passphrase keys cannot be exported.
    pub fn to_base64(&self) -> Result<String> {
        match self {
            MasterKey::Raw(key) => Ok(B64.encode(key.as_slice())),
            MasterKey::Passphrase(_) => Err(Error::InvalidArgument(
                "a passphrase master key has no raw bytes to export".into(),
            )),
        }
    }

    /// `"raw"` or `"passphrase"`.
    pub fn kind(&self) -> &'static str {
        match self {
            MasterKey::Raw(_) => "raw",
            MasterKey::Passphrase(_) => "passphrase",
        }
    }
}

/// Argon2id cost parameters, stored in the keystore so they can change later.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct KdfParams {
    pub m_kib: u32,
    pub t: u32,
    pub p: u32,
}

impl KdfParams {
    /// RFC 9106 second recommended option: 64 MiB, 3 passes, 1 lane.
    pub(crate) const DEFAULT: KdfParams = KdfParams {
        m_kib: 65536,
        t: 3,
        p: 1,
    };

    pub(crate) fn to_bytes(self) -> [u8; 12] {
        let mut out = [0u8; 12];
        out[0..4].copy_from_slice(&self.m_kib.to_be_bytes());
        out[4..8].copy_from_slice(&self.t.to_be_bytes());
        out[8..12].copy_from_slice(&self.p.to_be_bytes());
        out
    }

    pub(crate) fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != 12 {
            return Err(Error::Keystore(
                "corrupt keystore: bad kdf parameters".into(),
            ));
        }
        let word = |i: usize| u32::from_be_bytes(bytes[i..i + 4].try_into().expect("4 bytes"));
        Ok(KdfParams {
            m_kib: word(0),
            t: word(4),
            p: word(8),
        })
    }
}

/// Turns a master key into the 32-byte key-encryption key.
pub(crate) fn derive_kek(master: &MasterKey, salt: &[u8], params: KdfParams) -> Result<Key32> {
    match master {
        MasterKey::Raw(key) => Ok(key.clone()),
        MasterKey::Passphrase(passphrase) => {
            let argon_params = argon2::Params::new(params.m_kib, params.t, params.p, Some(32))
                .map_err(|_| Error::Keystore("corrupt keystore: invalid kdf parameters".into()))?;
            let argon = argon2::Argon2::new(
                argon2::Algorithm::Argon2id,
                argon2::Version::V0x13,
                argon_params,
            );
            let mut out = Zeroizing::new([0u8; 32]);
            argon
                .hash_password_into(passphrase.as_bytes(), salt, &mut out[..])
                .map_err(|_| Error::Keystore("passphrase key derivation failed".into()))?;
            Ok(out)
        }
    }
}

fn cipher(key: &[u8; 32]) -> Aes256Gcm {
    Aes256Gcm::new_from_slice(key).expect("AES-256 key is 32 bytes")
}

/// Encrypts `plaintext` under `kek`: `nonce(12) || AES-256-GCM(ciphertext || tag)`.
pub(crate) fn wrap(kek: &[u8; 32], plaintext: &[u8], aad: &[u8]) -> Vec<u8> {
    let nonce = random_bytes::<NONCE_LEN>();
    let ciphertext = cipher(kek)
        .encrypt(
            &nonce.into(),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .expect("AES-GCM encryption of a short value cannot fail");
    let mut out = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    out
}

/// Reverses [`wrap`]. Returns `None` if the key, AAD, or bytes are wrong.
pub(crate) fn unwrap(kek: &[u8; 32], wrapped: &[u8], aad: &[u8]) -> Option<Zeroizing<Vec<u8>>> {
    if wrapped.len() < NONCE_LEN + TAG_LEN {
        return None;
    }
    let nonce: [u8; NONCE_LEN] = wrapped[..NONCE_LEN].try_into().ok()?;
    cipher(kek)
        .decrypt(
            &nonce.into(),
            Payload {
                msg: &wrapped[NONCE_LEN..],
                aad,
            },
        )
        .ok()
        .map(Zeroizing::new)
}

/// [`unwrap`] for values that must be exactly 32 bytes.
pub(crate) fn unwrap_key32(kek: &[u8; 32], wrapped: &[u8], aad: &[u8]) -> Option<Key32> {
    let bytes = unwrap(kek, wrapped, aad)?;
    let arr: [u8; 32] = bytes.as_slice().try_into().ok()?;
    Some(Zeroizing::new(arr))
}

/// AAD binding a wrapped data key to its key id and subject.
pub(crate) fn dek_aad(key_id: &[u8; 16], subject_hash: &[u8; 32]) -> Vec<u8> {
    [AAD_DEK, &key_id[..], &subject_hash[..]].concat()
}

/// Per-object key: `HKDF-SHA256(ikm = DEK, salt = object salt, info = "aegis-shred/v1/object" || key_id)`.
pub(crate) fn object_key(dek: &[u8; 32], salt: &[u8; 32], key_id: &[u8; 16]) -> Key32 {
    let hkdf = Hkdf::<Sha256>::new(Some(salt), dek);
    let info = [OBJECT_KEY_INFO, &key_id[..]].concat();
    let mut out = Zeroizing::new([0u8; 32]);
    hkdf.expand(&info, &mut out[..])
        .expect("32 bytes is a valid HKDF-SHA256 output length");
    out
}

/// `HMAC-SHA256(index_key, subject)`: how subjects are identified inside the keystore.
pub(crate) fn subject_hash(index_key: &[u8; 32], subject: &str) -> [u8; 32] {
    let mut mac = <Hmac<Sha256> as hmac::KeyInit>::new_from_slice(index_key)
        .expect("HMAC accepts any key length");
    mac.update(subject.as_bytes());
    mac.finalize().into_bytes().into()
}

/// Subject ids are 1 to 256 bytes of UTF-8.
pub(crate) fn validate_subject(subject: &str) -> Result<()> {
    if subject.is_empty() || subject.len() > MAX_SUBJECT_LEN {
        return Err(Error::InvalidArgument(
            "subject id must be 1 to 256 bytes of UTF-8".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAST: KdfParams = KdfParams {
        m_kib: 1024,
        t: 1,
        p: 1,
    };

    #[test]
    fn base64_round_trip() {
        let key = MasterKey::generate();
        let encoded = key.to_base64().unwrap();
        let decoded = MasterKey::from_base64(&format!("  {encoded}\n")).unwrap();
        assert_eq!(decoded.to_base64().unwrap(), encoded);
    }

    #[test]
    fn rejects_wrong_length_and_garbage() {
        assert!(matches!(
            MasterKey::from_bytes(&[0u8; 31]),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_base64("not base64!"),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_base64("AAAA"),
            Err(Error::InvalidArgument(_))
        ));
        assert!(matches!(
            MasterKey::from_passphrase(""),
            Err(Error::InvalidArgument(_))
        ));
    }

    #[test]
    fn debug_never_shows_key_material() {
        let key = MasterKey::from_bytes(&[0x41; 32]).unwrap();
        assert_eq!(format!("{key:?}"), "MasterKey::Raw(<redacted>)");
        let pass = MasterKey::from_passphrase("hunter2").unwrap();
        assert!(!format!("{pass:?}").contains("hunter2"));
        assert!(pass.to_base64().is_err());
    }

    #[test]
    fn wrap_round_trip_and_rejections() {
        let kek = [7u8; 32];
        let wrapped = wrap(&kek, b"secret", b"aad");
        assert_eq!(
            unwrap(&kek, &wrapped, b"aad").unwrap().as_slice(),
            b"secret"
        );
        assert!(unwrap(&kek, &wrapped, b"other").is_none());
        assert!(unwrap(&[8u8; 32], &wrapped, b"aad").is_none());
        assert!(unwrap(&kek, &wrapped[..20], b"aad").is_none());
    }

    #[test]
    fn passphrase_kdf_depends_on_salt() {
        let pass = MasterKey::from_passphrase("correct horse").unwrap();
        let a = derive_kek(&pass, b"salt-one-16bytes", FAST).unwrap();
        let b = derive_kek(&pass, b"salt-one-16bytes", FAST).unwrap();
        let c = derive_kek(&pass, b"salt-two-16bytes", FAST).unwrap();
        assert_eq!(*a, *b);
        assert_ne!(*a, *c);
    }

    #[test]
    fn kdf_params_round_trip() {
        assert_eq!(
            KdfParams::from_bytes(&KdfParams::DEFAULT.to_bytes()).unwrap(),
            KdfParams::DEFAULT
        );
        assert!(KdfParams::from_bytes(&[0u8; 5]).is_err());
    }

    #[test]
    fn derivations_are_domain_separated() {
        let index = [1u8; 32];
        assert_eq!(
            subject_hash(&index, "user-42"),
            subject_hash(&index, "user-42")
        );
        assert_ne!(
            subject_hash(&index, "user-42"),
            subject_hash(&index, "user-43")
        );
        assert_ne!(
            subject_hash(&index, "user-42"),
            subject_hash(&[2u8; 32], "user-42")
        );
        let dek = [3u8; 32];
        assert_ne!(
            *object_key(&dek, &[4u8; 32], &[5u8; 16]),
            *object_key(&dek, &[6u8; 32], &[5u8; 16])
        );
        assert_ne!(
            *object_key(&dek, &[4u8; 32], &[5u8; 16]),
            *object_key(&dek, &[4u8; 32], &[9u8; 16])
        );
    }

    #[test]
    fn subject_length_limits() {
        assert!(validate_subject("").is_err());
        assert!(validate_subject(&"x".repeat(257)).is_err());
        assert!(validate_subject(&"x".repeat(256)).is_ok());
    }
}
