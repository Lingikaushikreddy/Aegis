use std::io;

use aegis_shred::{MasterKey, Vault};
use criterion::{Criterion, Throughput, criterion_group, criterion_main};

fn throughput(c: &mut Criterion) {
    let dir = tempfile::TempDir::new().unwrap();
    let vault = Vault::create(dir.path().join("keys.db"), &MasterKey::generate()).unwrap();

    let record = vec![7u8; 1024];
    let sealed_record = vault.seal("user-1", &record, b"").unwrap();
    let mut group = c.benchmark_group("record_1KiB");
    group.throughput(Throughput::Elements(1));
    group.bench_function("seal", |b| {
        b.iter(|| vault.seal("user-1", &record, b"").unwrap())
    });
    group.bench_function("unseal", |b| {
        b.iter(|| vault.unseal(&sealed_record, b"").unwrap())
    });
    group.finish();

    let big = vec![7u8; 100 * 1024 * 1024];
    let sealed_big = vault.seal("user-1", &big, b"").unwrap();
    let mut group = c.benchmark_group("stream_100MiB");
    group.sample_size(10);
    group.throughput(Throughput::Bytes(big.len() as u64));
    group.bench_function("seal", |b| {
        b.iter(|| {
            vault
                .seal_stream("user-1", big.as_slice(), io::sink(), b"")
                .unwrap()
        })
    });
    group.bench_function("unseal", |b| {
        b.iter(|| {
            vault
                .unseal_stream(sealed_big.as_slice(), io::sink(), b"")
                .unwrap()
        })
    });
    group.finish();
}

criterion_group!(benches, throughput);
criterion_main!(benches);
