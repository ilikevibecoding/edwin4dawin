// Six-thread checked-i256 producer for quartic_center_two_cubic:quartic_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QLP_THREADS: usize = 6;
const QLP_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)]
struct QLPState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct QLPTransfer { free: V, blocked: V }

#[derive(Clone, Copy)]
struct QLPModule { low: QLPState, high: QLPState, spine: QLPState, at_quartic: QLPTransfer }

#[derive(Clone, Copy)]
struct QLPModulePair {
    first: QLPModule,
    second: QLPModule,
    free_product: V,
    blocked_product: V,
}

#[derive(Clone, Copy)]
struct QLPPrefix { incident: QLPState, sibling: QLPState }

fn qlp_incident(length: i32) -> QLPState { QLPState { length, is_long: length == 8 } }
fn qlp_pendant(length: i32) -> QLPState { QLPState { length, is_long: length == 7 } }
fn qlp_spine(length: i32) -> QLPState { QLPState { length, is_long: length == 8 } }

fn qlp_cross(far_absent: V, far_present: V, length: i32) -> QLPTransfer {
    QLPTransfer {
        free: add(&mul(&path(length - 1), &far_absent), &mul(&path(length - 2), &far_present)),
        blocked: add(&mul(&path(length - 2), &far_absent), &mul(&path(length - 3), &far_present)),
    }
}

fn qlp_module_parts(low: i32, high: i32, spine: i32) -> QLPTransfer {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    qlp_cross(absent, present, spine)
}

fn qlp_modules() -> Vec<QLPModule> {
    let mut modules = Vec::with_capacity(224);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(QLPModule { low: qlp_pendant(low), high: qlp_pendant(high), spine: qlp_spine(spine), at_quartic: qlp_module_parts(low, high, spine) });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn qlp_pairs() -> Vec<QLPModulePair> {
    let modules = qlp_modules();
    let mut pairs = Vec::with_capacity(25_200);
    for first in 0..modules.len() {
        for second in first..modules.len() {
            let a = modules[first];
            let b = modules[second];
            pairs.push(QLPModulePair { first: a, second: b, free_product: mul(&a.at_quartic.free, &b.at_quartic.free), blocked_product: mul(&a.at_quartic.blocked, &b.at_quartic.blocked) });
        }
    }
    assert_eq!(pairs.len(), 25_200);
    pairs
}

fn qlp_prefixes() -> Vec<QLPPrefix> {
    let mut prefixes = Vec::with_capacity(56);
    for incident in 1..=8_i32 {
        for sibling in 1..=7_i32 {
            prefixes.push(QLPPrefix { incident: qlp_incident(incident), sibling: qlp_pendant(sibling) });
        }
    }
    assert_eq!(prefixes.len(), 56);
    prefixes
}

fn qlp_states(prefix: QLPPrefix, pair: QLPModulePair) -> [QLPState; 8] {
    [prefix.incident, prefix.sibling, pair.first.low, pair.first.high, pair.first.spine, pair.second.low, pair.second.high, pair.second.spine]
}

fn qlp_lengths(states: &[QLPState; 8]) -> [i32; 8] {
    std::array::from_fn(|index| states[index].length)
}

fn qlp_from_products(lengths: &[i32; 8], free_product: V, blocked_product: V) -> (V, V) {
    let quartic_absent = mul(&path(lengths[1]), &free_product);
    let quartic_present = shifted(&mul(&path(lengths[1] - 1), &blocked_product), 1);
    let at_root = qlp_cross(quartic_absent, quartic_present, lengths[0]);
    let deleted = at_root.free;
    let selected = shifted(&at_root.blocked, 1);
    (add(&deleted, &selected), deleted)
}

fn qlp_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    let first = qlp_module_parts(lengths[2], lengths[3], lengths[4]);
    let second = qlp_module_parts(lengths[5], lengths[6], lengths[7]);
    qlp_from_products(lengths, mul(&first.free, &second.free), mul(&first.blocked, &second.blocked))
}

fn qlp_values(lengths: &[i32; 8], pair: QLPModulePair, varying: Option<usize>) -> [Z; 4] {
    let (free_product, blocked_product) = if varying.is_some_and(|index| index >= 2) {
        let first = if varying.is_some_and(|index| (2..5).contains(&index)) { qlp_module_parts(lengths[2], lengths[3], lengths[4]) } else { pair.first.at_quartic };
        let second = if varying.is_some_and(|index| index >= 5) { qlp_module_parts(lengths[5], lengths[6], lengths[7]) } else { pair.second.at_quartic };
        (mul(&first.free, &second.free), mul(&first.blocked, &second.blocked))
    } else {
        (pair.free_product, pair.blocked_product)
    };
    let (core, deleted) = qlp_from_products(lengths, free_product, blocked_product);
    deltas03(&core, &deleted)
}

fn qlp_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let quartic = audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, quartic, lengths[1]);
    for offset in [2_usize, 5_usize] {
        let cubic = audit_attach(&mut adjacency, quartic, lengths[offset + 2]);
        audit_attach(&mut adjacency, cubic, lengths[offset]);
        audit_attach(&mut adjacency, cubic, lengths[offset + 1]);
    }
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}

fn qlp_literal_values(lengths: &[i32; 8]) -> [Z; 4] {
    let (adjacency, root) = qlp_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn qlp_formula_smoke() {
    let mut random = 0xDB4F0B9175AE2165_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths {
            random ^= random >> 12; random ^= random << 25; random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = qlp_formula_polynomials(&lengths);
        assert_eq!(deltas03(&core, &deleted), qlp_literal_values(&lengths), "quartic-leaf primary mismatch {}", sample);
    }
    println!("PASS_E5_QUARTIC_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn qlp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow");
    hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; }
    hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32];
    for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); }
    out
}

fn qlp_hash_state(hash: &mut AuditSha256, state: QLPState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qlp_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }

fn qlp_coefficient_leaf(states: &[QLPState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-quartic-leaf-coefficient-v1\0");
    for &state in states { qlp_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { qlp_hash_z(&mut hash, value); } }
    qlp_sha_bytes(hash)
}

fn qlp_finite_leaf(states: &[QLPState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-quartic-leaf-finite-v1\0");
    for &state in states { qlp_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes()); for &value in values { qlp_hash_z(&mut hash, value); }
    qlp_sha_bytes(hash)
}

fn qlp_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } }
    true
}

fn qlp_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } }
    }
    qlp_degree_ok(rows)
}

fn qlp_coefficients(states: &[QLPState; 8], pair: QLPModulePair, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let mut lengths = qlp_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = qlp_values(&lengths, pair, Some(varying));
        if literal_points && (point == 0 || point == 13) { assert_eq!(values, qlp_literal_values(&lengths)); literal_checks += 1; }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(qlp_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = qlp_values(&lengths, pair, Some(varying));
    if literal_points { assert_eq!(unseen, qlp_literal_values(&lengths)); literal_checks += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn qlp_smoke_stream() {
    let prefixes = qlp_prefixes(); let pairs = qlp_pairs();
    let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 17 + 3) % prefixes.len()];
        let pair = pairs[(sample * 104_729 + 23) % pairs.len()];
        let states = qlp_states(prefix, pair);
        if !states.iter().any(|state| state.is_long) {
            let lengths = qlp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 { let values = qlp_values(&lengths, pair, None); finite.update(&qlp_finite_leaf(&states, order, &values)); finite_records += 1; }
            continue;
        }
        let (baseline, shift, rows, _) = qlp_coefficients(&states, pair, false);
        if !qlp_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&qlp_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

fn qlp_bench() {
    let prefixes = qlp_prefixes(); let pairs = qlp_pairs();
    let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QLP_BENCH_RAYS {
        let prefix = prefixes[(candidate * 17 + 5) % prefixes.len()];
        let pair = pairs[(candidate * 104_729 + 31) % pairs.len()]; candidate += 1;
        let states = qlp_states(prefix, pair); if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, _) = qlp_coefficients(&states, pair, false);
        stream.update(&qlp_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1;
    }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex());
    println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QLPPrefix>(), pairs.len() * std::mem::size_of::<QLPModulePair>());
    println!("RESOURCE_FULL_LEAF_BYTES {}", 1_278_732_usize * 32);
}

struct QLPResult { worker: usize, counts: [u64; 5], unseen: u64, literal_checks: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }

fn qlp_worker(worker: usize, prefixes: Arc<Vec<QLPPrefix>>, pairs: Arc<Vec<QLPModulePair>>) -> QLPResult {
    let start = prefixes.len() * worker / QLP_THREADS; let end = prefixes.len() * (worker + 1) / QLP_THREADS;
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64;
    let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    let mut checked_finite = false; let mut checked_ray = false;
    for prefix_index in start..end {
        let prefix = prefixes[prefix_index];
        for &pair in pairs.iter() {
            let states = qlp_states(prefix, pair); let long_count = states.iter().filter(|state| state.is_long).count();
            if long_count == 0 {
                counts[0] += 1; let lengths = qlp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; }
                let values = qlp_values(&lengths, pair, None); assert!(values.iter().all(|value| value.is_positive()));
                finite_leaves.extend_from_slice(&qlp_finite_leaf(&states, order, &values));
                if !checked_finite { assert_eq!(values, qlp_literal_values(&lengths)); checked_finite = true; literal_checks += 1; }
                counts[1] += 1; continue;
            }
            if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) = qlp_coefficients(&states, pair, !checked_ray); audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient_leaves.extend_from_slice(&qlp_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4;
        }
    }
    QLPResult { worker, counts, unseen, literal_checks, coefficient_leaves, finite_leaves }
}

fn qlp_full() {
    let prefixes = Arc::new(qlp_prefixes()); let pairs = Arc::new(qlp_pairs()); let mut handles = Vec::new();
    for worker in 0..QLP_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&pairs); handles.push(thread::spawn(move || qlp_worker(worker, a, b))); }
    let mut results: Vec<QLPResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect(); results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_checks += result.literal_checks; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [456_876, 324_408, 954_323, 1, 954_324]); assert_eq!(unseen, 3_817_296);
    let raw = format!(concat!("PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_CHECKS {}\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_checks, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("primary raw write"); print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() { Some("smoke") => { qlp_formula_smoke(); qlp_smoke_stream(); }, Some("bench") => qlp_bench(), Some(value) => panic!("unknown mode {}", value), None => qlp_full() }
}
