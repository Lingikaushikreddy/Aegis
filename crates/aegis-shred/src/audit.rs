//! Hash-chained audit log: entry hashing and chain verification.

use sha2::{Digest, Sha256};

pub(crate) const GENESIS_HASH: [u8; 32] = [0u8; 32];

pub(crate) const EVENT_KEYSTORE_CREATED: &str = "keystore.created";
pub(crate) const EVENT_KEY_CREATED: &str = "key.created";
pub(crate) const EVENT_KEY_SHREDDED: &str = "key.shredded";
pub(crate) const EVENT_KEK_ROTATED: &str = "kek.rotated";
pub(crate) const EVENT_TOMBSTONES_IMPORTED: &str = "tombstones.imported";
pub(crate) const EVENT_DATA_SEALED: &str = "data.sealed";
pub(crate) const EVENT_DATA_UNSEALED: &str = "data.unsealed";

/// One audit log entry. Subjects appear only as keyed hashes, never as raw ids.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEntry {
    /// Position in the chain, starting at 1.
    pub seq: i64,
    /// Unix time (seconds).
    pub ts: i64,
    /// Event name, e.g. `key.shredded`.
    pub event: String,
    /// `HMAC-SHA256(index_key, subject_id)`, when the event concerns one subject.
    pub subject_hash: Option<Vec<u8>>,
    /// Data key id, when the event concerns one key.
    pub key_id: Option<Vec<u8>>,
    /// Small JSON detail, e.g. counts.
    pub detail: Option<String>,
    /// Hash of the previous entry (32 zero bytes for the first).
    pub prev_hash: Vec<u8>,
    /// Hash of this entry.
    pub hash: Vec<u8>,
}

/// Outcome of [`crate::Vault::verify_audit`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditReport {
    /// True when every entry links correctly.
    pub ok: bool,
    /// Number of entries verified before the first problem (all of them when `ok`).
    pub entries: u64,
    /// Hash of the last verified entry.
    pub head: [u8; 32],
    /// Sequence number of the first entry that failed verification.
    pub first_bad_seq: Option<i64>,
}

fn length_prefixed(hasher: &mut Sha256, field: Option<&[u8]>) {
    let bytes = field.unwrap_or(&[]);
    hasher.update((bytes.len() as u32).to_be_bytes());
    hasher.update(bytes);
}

/// `SHA-256(prev_hash || u64be(seq) || i64be(ts) || lp(event) || lp(subject_hash) || lp(key_id) || lp(detail))`.
pub(crate) fn entry_hash(
    prev_hash: &[u8],
    seq: i64,
    ts: i64,
    event: &str,
    subject_hash: Option<&[u8]>,
    key_id: Option<&[u8]>,
    detail: Option<&str>,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash);
    hasher.update((seq as u64).to_be_bytes());
    hasher.update(ts.to_be_bytes());
    length_prefixed(&mut hasher, Some(event.as_bytes()));
    length_prefixed(&mut hasher, subject_hash);
    length_prefixed(&mut hasher, key_id);
    length_prefixed(&mut hasher, detail.map(str::as_bytes));
    hasher.finalize().into()
}

/// Checks sequence numbers, back-links, and hashes from the first entry onward.
pub(crate) fn verify_chain(entries: &[AuditEntry]) -> AuditReport {
    let mut prev = GENESIS_HASH;
    for (index, entry) in entries.iter().enumerate() {
        let recomputed = entry_hash(
            &entry.prev_hash,
            entry.seq,
            entry.ts,
            &entry.event,
            entry.subject_hash.as_deref(),
            entry.key_id.as_deref(),
            entry.detail.as_deref(),
        );
        let expected_seq = index as i64 + 1;
        if entry.seq != expected_seq || entry.prev_hash != prev || entry.hash != recomputed {
            return AuditReport {
                ok: false,
                entries: index as u64,
                head: prev,
                first_bad_seq: Some(entry.seq),
            };
        }
        prev = recomputed;
    }
    AuditReport {
        ok: true,
        entries: entries.len() as u64,
        head: prev,
        first_bad_seq: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chain(n: i64) -> Vec<AuditEntry> {
        let mut prev = GENESIS_HASH.to_vec();
        (1..=n)
            .map(|seq| {
                let detail = format!("{{\"n\":{seq}}}");
                let hash = entry_hash(
                    &prev,
                    seq,
                    1000 + seq,
                    "key.created",
                    Some(&[seq as u8; 32]),
                    None,
                    Some(&detail),
                );
                let entry = AuditEntry {
                    seq,
                    ts: 1000 + seq,
                    event: "key.created".into(),
                    subject_hash: Some(vec![seq as u8; 32]),
                    key_id: None,
                    detail: Some(detail),
                    prev_hash: prev.clone(),
                    hash: hash.to_vec(),
                };
                prev = hash.to_vec();
                entry
            })
            .collect()
    }

    #[test]
    fn intact_chain_verifies() {
        let entries = chain(3);
        let report = verify_chain(&entries);
        assert!(report.ok);
        assert_eq!(report.entries, 3);
        assert_eq!(report.head.to_vec(), entries[2].hash);
        assert_eq!(report.first_bad_seq, None);
    }

    #[test]
    fn empty_chain_is_ok() {
        let report = verify_chain(&[]);
        assert!(report.ok);
        assert_eq!(report.head, GENESIS_HASH);
    }

    #[test]
    fn edited_entry_is_detected() {
        let mut entries = chain(3);
        entries[1].detail = Some("{\"n\":99}".into());
        let report = verify_chain(&entries);
        assert!(!report.ok);
        assert_eq!(report.first_bad_seq, Some(2));
        assert_eq!(report.entries, 1);
    }

    #[test]
    fn deleted_middle_entry_is_detected() {
        let mut entries = chain(3);
        entries.remove(1);
        assert_eq!(verify_chain(&entries).first_bad_seq, Some(3));
    }

    #[test]
    fn rehashed_edit_breaks_the_next_link() {
        let mut entries = chain(3);
        entries[1].detail = Some("{\"n\":99}".into());
        entries[1].hash = entry_hash(
            &entries[1].prev_hash,
            2,
            entries[1].ts,
            "key.created",
            entries[1].subject_hash.as_deref(),
            None,
            entries[1].detail.as_deref(),
        )
        .to_vec();
        assert_eq!(verify_chain(&entries).first_bad_seq, Some(3));
    }
}
