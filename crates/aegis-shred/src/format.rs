//! Sealed object format v1. `docs/FORMAT.md` is the normative description.

use std::io::{self, Read, Write};

use aead_stream::{DecryptorBE32, EncryptorBE32};
use aes_gcm::Aes256Gcm;
use aes_gcm::aead::{KeyInit, Payload};

use crate::error::{Error, Result};
use crate::keys::object_key;

pub(crate) const MAGIC: [u8; 4] = *b"AEGS";
pub(crate) const FORMAT_VERSION: u8 = 1;
pub(crate) const ALGORITHM_AES256GCM_HKDF_STREAM: u8 = 1;
/// Length of the fixed header at the start of every sealed object.
pub const HEADER_LEN: usize = 56;
pub(crate) const DEFAULT_CHUNK_SIZE_LOG2: u8 = 16;
const MIN_CHUNK_SIZE_LOG2: u8 = 12;
const MAX_CHUNK_SIZE_LOG2: u8 = 24;
const TAG_LEN: usize = 16;
const NONCE_PREFIX: [u8; 7] = [0u8; 7];

/// The plaintext header of a sealed object. It identifies the data key but not the subject.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Header {
    /// Format version (always 1).
    pub version: u8,
    /// Algorithm id (1 = AES-256-GCM + HKDF-SHA256 + STREAM-BE32).
    pub algorithm: u8,
    /// Plaintext chunk size as a power of two.
    pub chunk_size_log2: u8,
    /// Random id of the subject's data key.
    pub key_id: [u8; 16],
    /// Random per-object salt for the object key derivation.
    pub salt: [u8; 32],
}

impl Header {
    pub(crate) fn new(key_id: [u8; 16], salt: [u8; 32], chunk_size_log2: u8) -> Self {
        Header {
            version: FORMAT_VERSION,
            algorithm: ALGORITHM_AES256GCM_HKDF_STREAM,
            chunk_size_log2,
            key_id,
            salt,
        }
    }

    /// Plaintext bytes per chunk.
    pub fn chunk_size(&self) -> usize {
        1usize << self.chunk_size_log2
    }

    /// Serializes the header to its 56-byte wire form.
    pub fn to_bytes(&self) -> [u8; HEADER_LEN] {
        let mut out = [0u8; HEADER_LEN];
        out[0..4].copy_from_slice(&MAGIC);
        out[4] = self.version;
        out[5] = self.algorithm;
        out[6] = self.chunk_size_log2;
        out[7] = 0;
        out[8..24].copy_from_slice(&self.key_id);
        out[24..56].copy_from_slice(&self.salt);
        out
    }

    /// Parses and validates a header from the start of `bytes`.
    pub fn parse(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 4 || bytes[0..4] != MAGIC {
            return Err(Error::UnsupportedFormat(
                "not an aegis-shred object (bad magic bytes)",
            ));
        }
        if bytes.len() < 5 {
            return Err(Error::Integrity);
        }
        if bytes[4] != FORMAT_VERSION {
            return Err(Error::UnsupportedFormat("unsupported format version"));
        }
        if bytes.len() < HEADER_LEN {
            return Err(Error::Integrity);
        }
        if bytes[5] != ALGORITHM_AES256GCM_HKDF_STREAM {
            return Err(Error::UnsupportedFormat("unsupported algorithm"));
        }
        if !(MIN_CHUNK_SIZE_LOG2..=MAX_CHUNK_SIZE_LOG2).contains(&bytes[6]) {
            return Err(Error::UnsupportedFormat("unsupported chunk size"));
        }
        if bytes[7] != 0 {
            return Err(Error::UnsupportedFormat(
                "reserved header byte must be zero",
            ));
        }
        Ok(Header {
            version: bytes[4],
            algorithm: bytes[5],
            chunk_size_log2: bytes[6],
            key_id: bytes[8..24].try_into().expect("16 bytes"),
            salt: bytes[24..56].try_into().expect("32 bytes"),
        })
    }
}

/// Reads the header of a sealed object without decrypting anything or needing any key.
pub fn inspect_header(sealed: &[u8]) -> Result<Header> {
    Header::parse(sealed)
}

/// Fills `buf` as far as possible; returns fewer bytes than `buf.len()` only at end of input.
fn read_full<R: Read>(reader: &mut R, buf: &mut [u8]) -> io::Result<usize> {
    let mut filled = 0;
    while filled < buf.len() {
        match reader.read(&mut buf[filled..]) {
            Ok(0) => break,
            Ok(n) => filled += n,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        }
    }
    Ok(filled)
}

pub(crate) fn read_header<R: Read>(reader: &mut R) -> Result<Header> {
    let mut buf = [0u8; HEADER_LEN];
    let n = read_full(reader, &mut buf)?;
    Header::parse(&buf[..n])
}

fn aad_for(header: &Header, context: &[u8]) -> Vec<u8> {
    let mut aad = Vec::with_capacity(HEADER_LEN + context.len());
    aad.extend_from_slice(&header.to_bytes());
    aad.extend_from_slice(context);
    aad
}

fn object_cipher(dek: &[u8; 32], header: &Header) -> Aes256Gcm {
    let key = object_key(dek, &header.salt, &header.key_id);
    Aes256Gcm::new_from_slice(&key[..]).expect("object key is 32 bytes")
}

fn too_large() -> Error {
    Error::InvalidArgument("input is too large for format v1 (2^32 chunks)".into())
}

/// Writes `header`, then the STREAM-encrypted chunks of `input`.
pub(crate) fn seal_with<R: Read, W: Write>(
    dek: &[u8; 32],
    header: &Header,
    mut input: R,
    mut output: W,
    context: &[u8],
) -> Result<()> {
    let mut encryptor =
        EncryptorBE32::from_aead(object_cipher(dek, header), (&NONCE_PREFIX).into());
    let aad = aad_for(header, context);
    output.write_all(&header.to_bytes())?;

    let chunk_size = header.chunk_size();
    let mut current = vec![0u8; chunk_size];
    let mut next = vec![0u8; chunk_size];
    let mut filled = read_full(&mut input, &mut current)?;
    loop {
        let more = if filled == chunk_size {
            read_full(&mut input, &mut next)?
        } else {
            0
        };
        if more == 0 {
            let ciphertext = encryptor
                .encrypt_last(Payload {
                    msg: &current[..filled],
                    aad: &aad,
                })
                .map_err(|_| too_large())?;
            output.write_all(&ciphertext)?;
            break;
        }
        let ciphertext = encryptor
            .encrypt_next(Payload {
                msg: &current[..],
                aad: &aad,
            })
            .map_err(|_| too_large())?;
        output.write_all(&ciphertext)?;
        std::mem::swap(&mut current, &mut next);
        filled = more;
    }
    output.flush()?;
    Ok(())
}

/// Decrypts the chunks that follow an already-parsed `header`.
///
/// On error, `output` may already hold plaintext from earlier chunks that authenticated
/// individually; callers must discard it.
pub(crate) fn unseal_with<R: Read, W: Write>(
    dek: &[u8; 32],
    header: &Header,
    mut input: R,
    mut output: W,
    context: &[u8],
) -> Result<()> {
    let mut decryptor =
        DecryptorBE32::from_aead(object_cipher(dek, header), (&NONCE_PREFIX).into());
    let aad = aad_for(header, context);

    let segment = header.chunk_size() + TAG_LEN;
    let mut current = vec![0u8; segment];
    let mut next = vec![0u8; segment];
    let mut filled = read_full(&mut input, &mut current)?;
    loop {
        let more = if filled == segment {
            read_full(&mut input, &mut next)?
        } else {
            0
        };
        if more == 0 {
            if filled < TAG_LEN {
                return Err(Error::Integrity);
            }
            let plaintext = decryptor
                .decrypt_last(Payload {
                    msg: &current[..filled],
                    aad: &aad,
                })
                .map_err(|_| Error::Integrity)?;
            output.write_all(&plaintext)?;
            break;
        }
        let plaintext = decryptor
            .decrypt_next(Payload {
                msg: &current[..],
                aad: &aad,
            })
            .map_err(|_| Error::Integrity)?;
        output.write_all(&plaintext)?;
        std::mem::swap(&mut current, &mut next);
        filled = more;
    }
    output.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    const DEK: [u8; 32] = [0x11; 32];
    const KEY_ID: [u8; 16] = [0x22; 16];
    const SALT: [u8; 32] = [0x33; 32];
    const SMALL: u8 = 12; // 4096-byte chunks keep multi-chunk tests fast
    const SEG: usize = 4096 + 16;

    fn pattern(len: usize) -> Vec<u8> {
        (0..len).map(|i| (i % 251) as u8).collect()
    }

    fn seal_bytes(plaintext: &[u8], context: &[u8], log2: u8) -> Vec<u8> {
        let header = Header::new(KEY_ID, SALT, log2);
        let mut out = Vec::new();
        seal_with(&DEK, &header, plaintext, &mut out, context).unwrap();
        out
    }

    fn unseal_bytes(sealed: &[u8], context: &[u8]) -> Result<Vec<u8>> {
        let mut input = sealed;
        let header = read_header(&mut input)?;
        let mut out = Vec::new();
        unseal_with(&DEK, &header, input, &mut out, context)?;
        Ok(out)
    }

    #[test]
    fn round_trips_at_chunk_boundaries() {
        for len in [0, 1, 4095, 4096, 4097, 3 * 4096, 3 * 4096 + 5] {
            let data = pattern(len);
            let sealed = seal_bytes(&data, b"ctx", SMALL);
            assert_eq!(unseal_bytes(&sealed, b"ctx").unwrap(), data, "len {len}");
        }
        let big = pattern(200_000);
        let sealed = seal_bytes(&big, b"", DEFAULT_CHUNK_SIZE_LOG2);
        assert_eq!(unseal_bytes(&sealed, b"").unwrap(), big);
    }

    #[test]
    fn empty_plaintext_is_header_plus_one_tag() {
        let sealed = seal_bytes(b"", b"", SMALL);
        assert_eq!(sealed.len(), HEADER_LEN + 16);
        assert_eq!(unseal_bytes(&sealed, b"").unwrap(), b"");
    }

    #[test]
    fn exact_multiple_of_chunk_has_no_empty_trailer() {
        let sealed = seal_bytes(&pattern(2 * 4096), b"", SMALL);
        assert_eq!(sealed.len(), HEADER_LEN + 2 * SEG);
    }

    proptest! {
        #[test]
        fn round_trips_any_input(data in proptest::collection::vec(any::<u8>(), 0..20_000),
                                 context in proptest::collection::vec(any::<u8>(), 0..64)) {
            let sealed = seal_bytes(&data, &context, SMALL);
            prop_assert_eq!(unseal_bytes(&sealed, &context).unwrap(), data);
        }
    }

    #[test]
    fn every_single_byte_flip_is_rejected() {
        let sealed = seal_bytes(&pattern(100), b"ctx", SMALL);
        for i in 0..sealed.len() {
            let mut bad = sealed.clone();
            bad[i] ^= 0x01;
            let err = unseal_bytes(&bad, b"ctx").unwrap_err();
            if i < 6 || i == 7 {
                assert!(
                    matches!(err, Error::UnsupportedFormat(_)),
                    "byte {i}: {err:?}"
                );
            } else {
                assert!(matches!(err, Error::Integrity), "byte {i}: {err:?}");
            }
        }
    }

    #[test]
    fn wrong_context_is_rejected() {
        let sealed = seal_bytes(b"alice@example.com", b"users.email:42", SMALL);
        assert!(matches!(
            unseal_bytes(&sealed, b"users.email:43"),
            Err(Error::Integrity)
        ));
        assert!(matches!(unseal_bytes(&sealed, b""), Err(Error::Integrity)));
    }

    /// Splits a sealed object into header and body segments.
    fn segments(sealed: &[u8]) -> (Vec<u8>, Vec<Vec<u8>>) {
        let header = sealed[..HEADER_LEN].to_vec();
        let body = sealed[HEADER_LEN..]
            .chunks(SEG)
            .map(<[u8]>::to_vec)
            .collect();
        (header, body)
    }

    fn join(header: &[u8], segs: &[Vec<u8>]) -> Vec<u8> {
        let mut out = header.to_vec();
        for s in segs {
            out.extend_from_slice(s);
        }
        out
    }

    #[test]
    fn reordered_duplicated_and_dropped_chunks_are_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        let (header, segs) = segments(&sealed);
        assert_eq!(segs.len(), 4);

        let swapped = vec![
            segs[1].clone(),
            segs[0].clone(),
            segs[2].clone(),
            segs[3].clone(),
        ];
        assert!(matches!(
            unseal_bytes(&join(&header, &swapped), b""),
            Err(Error::Integrity)
        ));

        let duplicated = vec![
            segs[0].clone(),
            segs[0].clone(),
            segs[1].clone(),
            segs[2].clone(),
            segs[3].clone(),
        ];
        assert!(matches!(
            unseal_bytes(&join(&header, &duplicated), b""),
            Err(Error::Integrity)
        ));

        let dropped_middle = vec![segs[0].clone(), segs[2].clone(), segs[3].clone()];
        assert!(matches!(
            unseal_bytes(&join(&header, &dropped_middle), b""),
            Err(Error::Integrity)
        ));

        let dropped_last = segs[..3].to_vec();
        assert!(matches!(
            unseal_bytes(&join(&header, &dropped_last), b""),
            Err(Error::Integrity)
        ));
    }

    #[test]
    fn dropping_final_full_chunk_is_rejected() {
        let sealed = seal_bytes(&pattern(2 * 4096), b"", SMALL);
        let truncated = &sealed[..HEADER_LEN + SEG];
        assert!(matches!(
            unseal_bytes(truncated, b""),
            Err(Error::Integrity)
        ));
    }

    #[test]
    fn truncation_anywhere_is_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        for len in
            (0..sealed.len())
                .step_by(97)
                .chain([HEADER_LEN, HEADER_LEN + SEG, sealed.len() - 1])
        {
            let err = unseal_bytes(&sealed[..len], b"").unwrap_err();
            if len < 4 {
                assert!(
                    matches!(err, Error::UnsupportedFormat(_)),
                    "len {len}: {err:?}"
                );
            } else {
                assert!(matches!(err, Error::Integrity), "len {len}: {err:?}");
            }
        }
    }

    #[test]
    fn appended_bytes_are_rejected() {
        let sealed = seal_bytes(&pattern(3 * 4096 + 100), b"", SMALL);
        for extra in [1usize, 16, 5000] {
            let mut longer = sealed.clone();
            longer.extend(std::iter::repeat_n(0u8, extra));
            assert!(
                matches!(unseal_bytes(&longer, b""), Err(Error::Integrity)),
                "extra {extra}"
            );
        }
    }

    #[test]
    fn header_validation() {
        let good = Header::new(KEY_ID, SALT, SMALL).to_bytes();
        assert_eq!(Header::parse(&good).unwrap().key_id, KEY_ID);
        let mut bad = good;
        bad[0] = b'X';
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        let mut bad = good;
        bad[6] = 30;
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        let mut bad = good;
        bad[7] = 1;
        assert!(matches!(
            Header::parse(&bad),
            Err(Error::UnsupportedFormat(_))
        ));
        assert!(matches!(Header::parse(&good[..30]), Err(Error::Integrity)));
        assert!(matches!(
            Header::parse(b"no"),
            Err(Error::UnsupportedFormat(_))
        ));
    }

    // ---- known-answer vectors (tests/vectors/format-v1.json) ----

    #[derive(serde::Serialize, serde::Deserialize)]
    struct VectorFile {
        description: String,
        dek_hex: String,
        key_id_hex: String,
        salt_hex: String,
        plaintext_rule: String,
        cases: Vec<VectorCase>,
    }

    #[derive(serde::Serialize, serde::Deserialize)]
    struct VectorCase {
        name: String,
        chunk_size_log2: u8,
        plaintext_len: usize,
        context_hex: String,
        sealed_hex: String,
    }

    const VECTOR_CASES: [(&str, u8, usize, &[u8]); 4] = [
        ("empty", 12, 0, b""),
        ("short", 12, 5, b""),
        ("exact-chunk-with-context", 12, 4096, b"users.email:42"),
        ("multi-chunk", 12, 10_000, b""),
    ];

    fn build_vectors() -> VectorFile {
        VectorFile {
            description:
                "aegis-shred sealed object format v1 known-answer vectors. See docs/FORMAT.md."
                    .into(),
            dek_hex: hex::encode(DEK),
            key_id_hex: hex::encode(KEY_ID),
            salt_hex: hex::encode(SALT),
            plaintext_rule: "byte i of the plaintext is (i mod 251)".into(),
            cases: VECTOR_CASES
                .iter()
                .map(|(name, log2, len, ctx)| VectorCase {
                    name: (*name).into(),
                    chunk_size_log2: *log2,
                    plaintext_len: *len,
                    context_hex: hex::encode(ctx),
                    sealed_hex: hex::encode(seal_bytes(&pattern(*len), ctx, *log2)),
                })
                .collect(),
        }
    }

    #[test]
    #[ignore = "run explicitly to regenerate tests/vectors/format-v1.json"]
    fn regenerate_vectors() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/vectors/format-v1.json");
        let json = serde_json::to_string_pretty(&build_vectors()).unwrap();
        std::fs::write(path, json + "\n").unwrap();
    }

    #[test]
    fn matches_known_answer_vectors() {
        let file: VectorFile =
            serde_json::from_str(include_str!("../tests/vectors/format-v1.json")).unwrap();
        assert_eq!(file.cases.len(), VECTOR_CASES.len());
        for case in &file.cases {
            let context = hex::decode(&case.context_hex).unwrap();
            let expected = hex::decode(&case.sealed_hex).unwrap();
            let actual = seal_bytes(&pattern(case.plaintext_len), &context, case.chunk_size_log2);
            assert_eq!(hex::encode(&actual), case.sealed_hex, "case {}", case.name);
            assert_eq!(
                unseal_bytes(&expected, &context).unwrap(),
                pattern(case.plaintext_len)
            );
        }
    }
}
