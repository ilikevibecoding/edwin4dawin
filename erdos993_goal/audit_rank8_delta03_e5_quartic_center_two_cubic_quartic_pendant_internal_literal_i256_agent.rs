// Independent checked-i256 literal audit for quartic_center_two_cubic:quartic_pendant_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::thread;

const QLA_THREADS: usize = 6;
const QLA_TASKS: usize = 56;
const QLA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QLAState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QLAMessage { parent_absent: V, parent_present: V }
#[derive(Clone, Copy)] struct QLAModule { arm0: QLAState, arm1: QLAState, spine: QLAState, at_quartic: QLAMessage }
#[derive(Clone, Copy)] struct QLAModulePair { first: QLAModule, second: QLAModule }
#[derive(Clone, Copy)] struct QLAPrefix { gap: QLAState, tail: QLAState, sibling: QLAState }

fn qla_gap(length: i32) -> QLAState { QLAState { length, is_long: length == 7 } }
fn qla_pendant(length: i32) -> QLAState { QLAState { length, is_long: length == 7 } }
fn qla_spine(length: i32) -> QLAState { QLAState { length, is_long: length == 8 } }

fn qla_propagate(absent: V, present: V, length: i32) -> QLAMessage {
    QLAMessage {
        parent_absent: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        parent_present: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}

fn qla_module(arm0: i32, arm1: i32, spine: i32) -> QLAMessage {
    let absent = mul(&path(arm0), &path(arm1));
    let present = shifted(&mul(&path(arm0 - 1), &path(arm1 - 1)), 1);
    qla_propagate(absent, present, spine)
}

fn qla_modules() -> Vec<QLAModule> {
    let mut modules = Vec::with_capacity(224);
    for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for spine in 1..=8_i32 {
        modules.push(QLAModule { arm0: qla_pendant(arm0), arm1: qla_pendant(arm1), spine: qla_spine(spine), at_quartic: qla_module(arm0, arm1, spine) });
    } } }
    assert_eq!(modules.len(), 224); modules
}

fn qla_pairs() -> Vec<QLAModulePair> {
    let modules = qla_modules(); let mut pairs = Vec::with_capacity(25_200);
    for first in 0..modules.len() { for second in first..modules.len() { pairs.push(QLAModulePair { first: modules[first], second: modules[second] }); } }
    assert_eq!(pairs.len(), 25_200); pairs
}

fn qla_prefixes() -> Vec<QLAPrefix> {
    let mut prefixes = Vec::with_capacity(392);
    for gap in 0..=7_i32 { for tail in 1..=7_i32 { for sibling in 1..=7_i32 { prefixes.push(QLAPrefix { gap: qla_gap(gap), tail: qla_pendant(tail), sibling: qla_pendant(sibling) }); } } }
    assert_eq!(prefixes.len(), 392); prefixes
}

fn qla_states(prefix: QLAPrefix, pair: QLAModulePair) -> [QLAState; 9] {
    [prefix.gap, prefix.tail, prefix.sibling, pair.first.arm0, pair.first.arm1, pair.first.spine, pair.second.arm0, pair.second.arm1, pair.second.spine]
}
fn qla_lengths(states: &[QLAState; 9]) -> [i32; 9] { std::array::from_fn(|index| states[index].length) }

fn qla_finish(lengths: &[i32; 9], first: QLAMessage, second: QLAMessage) -> (V, V) {
    let quartic_absent = product(&[path(lengths[2]), first.parent_absent, second.parent_absent]);
    let quartic_present = shifted(&product(&[path(lengths[2] - 1), first.parent_present, second.parent_present]), 1);
    let quartic_side = qla_propagate(quartic_absent, quartic_present, lengths[0] + 1);
    let deleted = mul(&quartic_side.parent_absent, &path(lengths[1]));
    let selected = shifted(&mul(&quartic_side.parent_present, &path(lengths[1] - 1)), 1);
    (add(&deleted, &selected), deleted)
}

fn qla_formula_polynomials(lengths: &[i32; 9]) -> (V, V) {
    qla_finish(lengths, qla_module(lengths[3], lengths[4], lengths[5]), qla_module(lengths[6], lengths[7], lengths[8]))
}

fn qla_values(lengths: &[i32; 9], pair: QLAModulePair, varying: Option<usize>) -> [Z; 4] {
    let first = if varying.is_some_and(|index| (3..6).contains(&index)) { qla_module(lengths[3], lengths[4], lengths[5]) } else { pair.first.at_quartic };
    let second = if varying.is_some_and(|index| index >= 6) { qla_module(lengths[6], lengths[7], lengths[8]) } else { pair.second.at_quartic };
    let (core, deleted) = qla_finish(lengths, first, second); deltas03(&core, &deleted)
}

fn qla_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut endpoint = start;
    for _ in 0..length { let next = adjacency.len(); adjacency.push(Vec::new()); adjacency[endpoint].push(next); adjacency[next].push(endpoint); endpoint = next; }
    endpoint
}

fn qla_tree(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()];
    let quartic = qla_extend(&mut adjacency, root, lengths[0] + 1); qla_extend(&mut adjacency, root, lengths[1]); qla_extend(&mut adjacency, quartic, lengths[2]);
    let first = qla_extend(&mut adjacency, quartic, lengths[5]); qla_extend(&mut adjacency, first, lengths[3]); qla_extend(&mut adjacency, first, lengths[4]);
    let second = qla_extend(&mut adjacency, quartic, lengths[8]); qla_extend(&mut adjacency, second, lengths[6]); qla_extend(&mut adjacency, second, lengths[7]);
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize); assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 2); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}
fn qla_literal_values(lengths: &[i32; 9]) -> [Z; 4] { let (adjacency, root) = qla_tree(lengths); audit_deltas(&adjacency, root).0 }

fn qla_independent_smoke() {
    let mut random = 0xC6BC279692B5CC83_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 9];
        for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; }
        let (core, deleted) = qla_formula_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qla_literal_values(&lengths), "independent quartic-pendant-internal mismatch {}", sample);
    }
    let prefixes = qla_prefixes(); let pairs = qla_pairs();
    for sample in 0..512_usize {
        random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let prefix = prefixes[random as usize % prefixes.len()];
        random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let pair = pairs[random as usize % pairs.len()];
        let mut lengths = qla_lengths(&qla_states(prefix, pair)); let varying = random as usize % 9; lengths[varying] += (random % 19) as i32;
        assert_eq!(qla_values(&lengths, pair, Some(varying)), qla_literal_values(&lengths), "cached audit mismatch {}", sample);
    }
    println!("PASS_E5_QUARTIC_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn qla_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qla_hash_state(hash: &mut AuditSha256, state: QLAState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qla_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }

fn qla_coefficient_leaf(states: &[QLAState; 9], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-center-quartic-pendant-internal-coefficient-v1\0");
    for &state in states { qla_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { qla_hash_z(&mut hash, value); } } qla_sha_bytes(hash)
}
fn qla_finite_leaf(states: &[QLAState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-center-quartic-pendant-internal-finite-v1\0");
    for &state in states { qla_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes()); for &value in values { qla_hash_z(&mut hash, value); } qla_sha_bytes(hash)
}
fn qla_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qla_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qla_degree_ok(rows) }

fn qla_formula_coefficients(states: &[QLAState; 9], pair: QLAModulePair, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qla_lengths(states);
    let baseline = 2 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qla_values(&lengths, pair, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qla_literal_values(&lengths)); literal_trees += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qla_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qla_values(&lengths, pair, Some(varying)); if literal_points { assert_eq!(unseen, qla_literal_values(&lengths)); literal_trees += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_trees)
}

fn qla_literal_coefficients(states: &[QLAState; 9]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qla_lengths(states);
    let baseline = 2 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qla_literal_values(&lengths); for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qla_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qla_literal_values(&lengths); for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows)
}

fn qla_smoke_stream() {
    let prefixes = qla_prefixes(); let pairs = qla_pairs(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 17 + 3) % prefixes.len()]; let pair = pairs[(sample * 104_729 + 23) % pairs.len()]; let states = qla_states(prefix, pair);
        if !states.iter().any(|state| state.is_long) { let lengths = qla_lengths(&states); let order = 2 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qla_literal_values(&lengths); finite.update(&qla_finite_leaf(&states, order, &values)); finite_records += 1; } continue; }
        let (baseline, shift, rows) = qla_literal_coefficients(&states); if !qla_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qla_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

fn qla_bench() {
    let prefixes = qla_prefixes(); let pairs = qla_pairs(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QLA_BENCH_RAYS { let prefix = prefixes[(candidate * 17 + 5) % prefixes.len()]; let pair = pairs[(candidate * 104_729 + 31) % pairs.len()]; candidate += 1; let states = qla_states(prefix, pair); if !states.iter().any(|state| state.is_long) { continue; } let (baseline, shift, rows, checked) = qla_formula_coefficients(&states, pair, true); assert_eq!(checked, 3); stream.update(&qla_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1; }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QLAPrefix>(), pairs.len() * std::mem::size_of::<QLAModulePair>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 9_536_299_usize * 32);
}

struct QLAResult { worker: usize, counts: [u64; 5], unseen: u64, literal_trees: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qla_worker(worker: usize, prefixes: Arc<Vec<QLAPrefix>>, pairs: Arc<Vec<QLAModulePair>>) -> QLAResult {
    let start = prefixes.len() * worker / QLA_TASKS; let end = prefixes.len() * (worker + 1) / QLA_TASKS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    for prefix_index in start..end { let prefix = prefixes[prefix_index]; for &pair in pairs.iter() { let states = qla_states(prefix, pair); let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 { counts[0] += 1; let lengths = qla_lengths(&states); let order = 2 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qla_values(&lengths, pair, None); assert_eq!(values, qla_literal_values(&lengths)); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qla_finite_leaf(&states, order, &values)); counts[1] += 1; literal_trees += 1; continue; }
        if long_count == 9 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qla_formula_coefficients(&states, pair, true); audit_assert_gate(&rows); coefficient_leaves.extend_from_slice(&qla_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4; literal_trees += checked;
    } }
    QLAResult { worker, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn qla_full() {
    let prefixes = Arc::new(qla_prefixes()); let pairs = Arc::new(qla_pairs()); let next = Arc::new(AtomicUsize::new(0)); let mut handles = Vec::new(); for _ in 0..QLA_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&pairs); let n = Arc::clone(&next); handles.push(thread::spawn(move || { let mut out = Vec::new(); loop { let task = n.fetch_add(1, Ordering::SeqCst); if task >= QLA_TASKS { break; } out.push(qla_worker(task, Arc::clone(&a), Arc::clone(&b))); } out })); }
    let mut results: Vec<QLAResult> = handles.into_iter().flat_map(|handle| handle.join().expect("audit worker panic")).collect(); results.sort_by_key(|result| result.worker);
    assert_eq!(results.len(), QLA_TASKS); for (index, result) in results.iter().enumerate() { assert_eq!(result.worker, index); }
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_trees += result.literal_trees; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [2_741_256, 2_399_155, 7_137_143, 1, 7_137_144]); assert_eq!(unseen, 28_548_576); assert_eq!(literal_trees, 23_810_587);
    let raw = format!(concat!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_TREES {}\n", "LITERAL_RAY_POINTS 0 13 29\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_trees, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write"); print!("{}", raw);
}

fn main() { audit_sha_self_test(); match std::env::args().nth(1).as_deref() { Some("smoke") => { qla_independent_smoke(); qla_smoke_stream(); }, Some("bench") => qla_bench(), Some(value) => panic!("unknown mode {}", value), None => qla_full() } }
