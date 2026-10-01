//! The `aegis` command-line tool. [`run`] is shared by the Rust binary and the Python package.

use std::ffi::OsString;
use std::fs::File;
use std::io::{self, BufRead, Read, Write};
use std::path::{Path, PathBuf};

use aegis_shred::{Error, HEADER_LEN, KeyStatus, MasterKey, Vault, inspect_header, key_status};
use clap::{Parser, Subcommand};

/// Success.
pub const EXIT_OK: i32 = 0;
/// Any error without a more specific code.
pub const EXIT_ERROR: i32 = 1;
/// The data's key was shredded.
pub const EXIT_SHREDDED: i32 = 3;
/// Integrity failure (tampered data, wrong context, broken audit chain).
pub const EXIT_INTEGRITY: i32 = 4;
/// The master key does not match the keystore.
pub const EXIT_WRONG_MASTER_KEY: i32 = 5;
/// The data was sealed with a key this keystore never held.
pub const EXIT_UNKNOWN_KEY: i32 = 6;

#[derive(Parser)]
#[command(
    name = "aegis",
    version,
    about = "Crypto-shredding vault: one key per data subject, so erasing a person makes their data unreadable everywhere."
)]
struct Cli {
    /// Keystore file.
    #[arg(
        long,
        global = true,
        env = "AEGIS_KEYSTORE",
        default_value = "aegis-keys.db"
    )]
    keystore: PathBuf,
    /// Read the base64 master key from this file instead of AEGIS_MASTER_KEY.
    #[arg(long, global = true, conflicts_with = "passphrase")]
    key_file: Option<PathBuf>,
    /// Use a passphrase master key (read from AEGIS_PASSPHRASE, otherwise prompted).
    #[arg(long, global = true)]
    passphrase: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Print a new random master key (base64).
    Keygen,
    /// Create a new keystore.
    Init,
    /// Encrypt a file for a subject.
    Seal {
        /// Subject id, e.g. a user id.
        #[arg(short, long)]
        subject: String,
        /// Context string; the same value is required to unseal.
        #[arg(short, long, default_value = "")]
        context: String,
        /// File to encrypt.
        input: PathBuf,
        /// Where to write the sealed file.
        #[arg(short, long)]
        output: PathBuf,
        /// Overwrite OUTPUT if it exists.
        #[arg(long)]
        force: bool,
    },
    /// Decrypt a sealed file.
    Unseal {
        /// Context string used when sealing.
        #[arg(short, long, default_value = "")]
        context: String,
        /// Sealed file.
        input: PathBuf,
        /// Where to write the plaintext.
        #[arg(short, long)]
        output: PathBuf,
        /// Overwrite OUTPUT if it exists.
        #[arg(long)]
        force: bool,
    },
    /// Destroy a subject's key, making all of their sealed data unreadable.
    Shred {
        /// Subject id.
        subject: String,
        /// Skip the confirmation prompt.
        #[arg(long)]
        yes: bool,
    },
    /// Show a sealed file's header and whether its key still exists (no master key needed).
    Inspect {
        /// Sealed file.
        file: PathBuf,
    },
    /// Inspect and verify the audit log.
    Audit {
        #[command(subcommand)]
        action: AuditAction,
    },
    /// Re-wrap every data key under a new master key.
    RotateMasterKey {
        /// File holding the new base64 master key.
        #[arg(long, conflicts_with = "new_passphrase")]
        new_key_file: Option<PathBuf>,
        /// Switch to a passphrase (read from AEGIS_NEW_PASSPHRASE, otherwise prompted).
        #[arg(long)]
        new_passphrase: bool,
    },
    /// Export or import the shred journal (tombstones).
    Tombstones {
        #[command(subcommand)]
        action: TombstoneAction,
    },
}

#[derive(Subcommand)]
enum AuditAction {
    /// Verify the hash chain.
    Verify,
    /// Show the newest entries.
    Show {
        /// How many entries to show.
        #[arg(long, default_value_t = 20)]
        limit: usize,
    },
    /// Print the newest entry's sequence number and hash, to anchor elsewhere.
    Head,
}

#[derive(Subcommand)]
enum TombstoneAction {
    /// Write every tombstone to FILE as JSON Lines.
    Export {
        /// Output file.
        file: PathBuf,
    },
    /// Re-apply tombstones from FILE (e.g. after restoring a keystore backup).
    Import {
        /// Journal file.
        file: PathBuf,
    },
}

/// Maps an error to the documented exit code.
pub fn exit_code(err: &Error) -> i32 {
    match err {
        Error::Shredded { .. } => EXIT_SHREDDED,
        Error::Integrity => EXIT_INTEGRITY,
        Error::WrongMasterKey(_) => EXIT_WRONG_MASTER_KEY,
        Error::UnknownKey => EXIT_UNKNOWN_KEY,
        _ => EXIT_ERROR,
    }
}

/// Parses `args` (including the program name) and runs the command. Returns the exit code.
pub fn run<I, T>(args: I) -> i32
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    let cli = match Cli::try_parse_from(args) {
        Ok(cli) => cli,
        Err(err) => {
            let _ = err.print();
            return err.exit_code();
        }
    };
    match execute(&cli) {
        Ok(code) => code,
        Err(err) => {
            eprintln!("error: {err}");
            exit_code(&err)
        }
    }
}

fn invalid(message: impl Into<String>) -> Error {
    Error::InvalidArgument(message.into())
}

fn passphrase_from(var: &str, prompt: &str, confirm: bool) -> Result<MasterKey, Error> {
    if let Ok(value) = std::env::var(var) {
        return MasterKey::from_passphrase(value);
    }
    let first = rpassword::prompt_password(prompt)?;
    if confirm {
        let second = rpassword::prompt_password("Repeat passphrase: ")?;
        if first != second {
            return Err(invalid("passphrases do not match"));
        }
    }
    MasterKey::from_passphrase(first)
}

fn master_key(cli: &Cli, confirm: bool) -> Result<MasterKey, Error> {
    if let Some(path) = &cli.key_file {
        return MasterKey::from_file(path);
    }
    if cli.passphrase {
        return passphrase_from("AEGIS_PASSPHRASE", "Passphrase: ", confirm);
    }
    if std::env::var_os("AEGIS_MASTER_KEY").is_some() {
        return MasterKey::from_env("AEGIS_MASTER_KEY");
    }
    Err(invalid(
        "no master key: set AEGIS_MASTER_KEY, or pass --key-file or --passphrase",
    ))
}

fn open_vault(cli: &Cli) -> Result<Vault, Error> {
    if !cli.keystore.exists() {
        return Err(invalid(format!(
            "no keystore at {}; run `aegis init` first or pass --keystore",
            cli.keystore.display()
        )));
    }
    Vault::open(&cli.keystore, &master_key(cli, false)?)
}

fn refuse_overwrite(output: &Path, force: bool) -> Result<(), Error> {
    if output.exists() && !force {
        return Err(invalid(format!(
            "{} already exists; pass --force to overwrite",
            output.display()
        )));
    }
    Ok(())
}

fn confirm_shred(subject: &str) -> Result<bool, Error> {
    eprint!(
        "This permanently destroys the key for '{subject}'; their sealed data can never be read again.\nType the subject id to confirm: "
    );
    io::stderr().flush()?;
    let mut answer = String::new();
    io::stdin().lock().read_line(&mut answer)?;
    Ok(answer.trim() == subject)
}

fn short_hex(bytes: &Option<Vec<u8>>) -> String {
    match bytes {
        Some(b) => hex::encode(&b[..b.len().min(8)]),
        None => "-".into(),
    }
}

fn execute(cli: &Cli) -> Result<i32, Error> {
    match &cli.command {
        Command::Keygen => {
            println!("{}", MasterKey::generate().to_base64()?);
            eprintln!(
                "Store this key in a secret manager. Commands read it from AEGIS_MASTER_KEY."
            );
        }
        Command::Init => {
            Vault::create(&cli.keystore, &master_key(cli, true)?)?;
            eprintln!("created keystore {}", cli.keystore.display());
        }
        Command::Seal {
            subject,
            context,
            input,
            output,
            force,
        } => {
            refuse_overwrite(output, *force)?;
            open_vault(cli)?.seal_file(subject, input, output, context.as_bytes())?;
            eprintln!("sealed {} -> {}", input.display(), output.display());
        }
        Command::Unseal {
            context,
            input,
            output,
            force,
        } => {
            refuse_overwrite(output, *force)?;
            open_vault(cli)?.unseal_file(input, output, context.as_bytes())?;
            eprintln!("unsealed {} -> {}", input.display(), output.display());
        }
        Command::Shred { subject, yes } => {
            let vault = open_vault(cli)?;
            if !*yes && !confirm_shred(subject)? {
                eprintln!("aborted; nothing was shredded");
                return Ok(EXIT_ERROR);
            }
            match vault.shred(subject)? {
                Some(receipt) => println!(
                    "shredded key {} at {} (audit seq {}, subject hash {})",
                    hex::encode(receipt.key_id),
                    receipt.shredded_at,
                    receipt.audit_seq,
                    hex::encode(receipt.subject_hash)
                ),
                None => println!("subject has no key; nothing to shred"),
            }
        }
        Command::Inspect { file } => {
            let mut bytes = Vec::with_capacity(HEADER_LEN);
            File::open(file)?
                .take(HEADER_LEN as u64)
                .read_to_end(&mut bytes)?;
            let header = inspect_header(&bytes)?;
            println!(
                "format:     aegis-shred v{} (AES-256-GCM, HKDF-SHA256, STREAM-BE32)",
                header.version
            );
            println!("chunk size: {} bytes", header.chunk_size());
            println!("key id:     {}", hex::encode(header.key_id));
            let status = if cli.keystore.exists() {
                match key_status(&cli.keystore, &header.key_id)? {
                    KeyStatus::Present => "present".to_string(),
                    KeyStatus::Shredded { at } => format!("shredded at {at}"),
                    KeyStatus::Unknown => "not in this keystore".to_string(),
                }
            } else {
                format!("unknown (no keystore at {})", cli.keystore.display())
            };
            println!("key status: {status}");
        }
        Command::Audit { action } => {
            let vault = open_vault(cli)?;
            match action {
                AuditAction::Verify => {
                    let report = vault.verify_audit()?;
                    if !report.ok {
                        println!(
                            "BROKEN: entry {} fails verification ({} entries verified before it)",
                            report.first_bad_seq.unwrap_or_default(),
                            report.entries
                        );
                        return Ok(EXIT_INTEGRITY);
                    }
                    println!(
                        "ok: {} entries, head {}",
                        report.entries,
                        hex::encode(report.head)
                    );
                }
                AuditAction::Show { limit } => {
                    let entries = vault.audit_entries()?;
                    for entry in &entries[entries.len().saturating_sub(*limit)..] {
                        println!(
                            "{:>6}  {}  {:<20} subject={} key={} {}",
                            entry.seq,
                            entry.ts,
                            entry.event,
                            short_hex(&entry.subject_hash),
                            short_hex(&entry.key_id),
                            entry.detail.as_deref().unwrap_or("")
                        );
                    }
                }
                AuditAction::Head => {
                    let (seq, hash) = vault.audit_head()?;
                    println!("{seq} {}", hex::encode(hash));
                }
            }
        }
        Command::RotateMasterKey {
            new_key_file,
            new_passphrase,
        } => {
            let vault = open_vault(cli)?;
            let new_key = match (new_key_file, new_passphrase) {
                (Some(path), _) => MasterKey::from_file(path)?,
                (None, true) => passphrase_from("AEGIS_NEW_PASSPHRASE", "New passphrase: ", true)?,
                (None, false) => return Err(invalid("pass --new-key-file or --new-passphrase")),
            };
            vault.rotate_master_key(&new_key)?;
            eprintln!(
                "master key rotated; destroy the old key once every process uses the new one"
            );
        }
        Command::Tombstones { action } => {
            let vault = open_vault(cli)?;
            match action {
                TombstoneAction::Export { file } => {
                    let count = vault.export_tombstones(file)?;
                    println!("exported {count} tombstones to {}", file.display());
                }
                TombstoneAction::Import { file } => {
                    let count = vault.import_tombstones(file)?;
                    println!("imported {count} new tombstones");
                }
            }
        }
    }
    Ok(EXIT_OK)
}
