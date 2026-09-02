// Independent checked-i256 literal audit for quartic_endpoint_cubic_path:quartic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QBA_THREADS: usize = 6;
const QBA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QBAState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QBAMessage { parent_absent: V, parent_present: V }
#[derive(Clone, Copy)] struct QBAFar {
    first_spine: QBAState, middle_arm: QBAState, second_spine: QBAState,
    terminal_arm0: QBAState, terminal_arm1: QBAState, toward_root: QBAMessage,
}
#[derive(Clone, Copy)] struct QBAPrefix { arm0: QBAState, arm1: QBAState, arm2: QBAState }

fn qba_arm(length: i32) -> QBAState { QBAState { length, is_long: length == 7 } }
fn qba_internal(length: i32) -> QBAState { QBAState { length, is_long: length == 8 } }

fn qba_propagate(absent: V, present: V, length: i32) -> QBAMessage {
    QBAMessage {
        parent_absent: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        parent_present: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}

fn qba_far_message(first_spine: i32, middle_arm: i32, second_spine: i32, terminal_arm0: i32, terminal_arm1: i32) -> QBAMessage {
    let terminal_absent = product(&[path(terminal_arm0), path(terminal_arm1)]);
    let terminal_present = shifted(&product(&[path(terminal_arm0 - 1), path(terminal_arm1 - 1)]), 1);
    let terminal_at_middle = qba_propagate(terminal_absent, terminal_present, second_spine);
    let middle_absent = product(&[path(middle_arm), terminal_at_middle.parent_absent]);
    let middle_present = shifted(&product(&[path(middle_arm - 1), terminal_at_middle.parent_present]), 1);
    qba_propagate(middle_absent, middle_present, first_spine)
}

fn qba_fars() -> Vec<QBAFar> {
    let mut out = Vec::with_capacity(12_544);
    for terminal_arm0 in 1..=7_i32 { for terminal_arm1 in terminal_arm0..=7_i32 { for second_spine in 1..=8_i32 { for middle_arm in 1..=7_i32 { for first_spine in 1..=8_i32 {
        out.push(QBAFar {
            first_spine: qba_internal(first_spine), middle_arm: qba_arm(middle_arm), second_spine: qba_internal(second_spine),
            terminal_arm0: qba_arm(terminal_arm0), terminal_arm1: qba_arm(terminal_arm1),
            toward_root: qba_far_message(first_spine, middle_arm, second_spine, terminal_arm0, terminal_arm1),
        });
    } } } } }
    assert_eq!(out.len(), 12_544); out
}

fn qba_prefixes() -> Vec<QBAPrefix> {
    let mut out = Vec::with_capacity(84);
    for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for arm2 in arm1..=7_i32 {
        out.push(QBAPrefix { arm0: qba_arm(arm0), arm1: qba_arm(arm1), arm2: qba_arm(arm2) });
    } } }
    assert_eq!(out.len(), 84); out
}

fn qba_states(prefix: QBAPrefix, far: QBAFar) -> [QBAState; 8] {
    [prefix.arm0, prefix.arm1, prefix.arm2, far.first_spine, far.middle_arm, far.second_spine, far.terminal_arm0, far.terminal_arm1]
}
fn qba_lengths(states: &[QBAState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].length) }

fn qba_finish(lengths: &[i32; 8], far: QBAMessage) -> (V, V) {
    let root_absent = product(&[path(lengths[0]), path(lengths[1]), path(lengths[2]), far.parent_absent]);
    let root_present = shifted(&product(&[path(lengths[0] - 1), path(lengths[1] - 1), path(lengths[2] - 1), far.parent_present]), 1);
    (add(&root_absent, &root_present), root_absent)
}
fn qba_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qba_finish(lengths, qba_far_message(lengths[3], lengths[4], lengths[5], lengths[6], lengths[7]))
}
fn qba_values(lengths: &[i32; 8], far: QBAFar, varying: Option<usize>) -> [Z; 4] {
    let message = if varying.is_some_and(|index| index >= 3) { qba_far_message(lengths[3], lengths[4], lengths[5], lengths[6], lengths[7]) } else { far.toward_root };
    let (core, deleted) = qba_finish(lengths, message); deltas03(&core, &deleted)
}

fn qba_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut endpoint = start;
    for _ in 0..length { let next = adjacency.len(); adjacency.push(Vec::new()); adjacency[endpoint].push(next); adjacency[next].push(endpoint); endpoint = next; }
    endpoint
}
fn qba_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()];
    qba_extend(&mut adjacency, root, lengths[0]); qba_extend(&mut adjacency, root, lengths[1]); qba_extend(&mut adjacency, root, lengths[2]);
    let middle = qba_extend(&mut adjacency, root, lengths[3]); qba_extend(&mut adjacency, middle, lengths[4]);
    let terminal = qba_extend(&mut adjacency, middle, lengths[5]); qba_extend(&mut adjacency, terminal, lengths[6]); qba_extend(&mut adjacency, terminal, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize); assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 4); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}
fn qba_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qba_tree(lengths); audit_deltas(&adjacency, root).0 }

fn qba_independent_smoke() {
    let mut random = 0x9FB21C651E98DF25_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; }
        let (core, deleted) = qba_formula_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qba_literal_values(&lengths), "independent endpoint quartic mismatch {}", sample);
    }
    let prefixes = qba_prefixes(); let fars = qba_fars();
    for sample in 0..512_usize {
        random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let prefix = prefixes[random as usize % prefixes.len()];
        random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let far = fars[random as usize % fars.len()];
        let mut lengths = qba_lengths(&qba_states(prefix, far)); let varying = random as usize % 8; lengths[varying] += (random % 19) as i32;
        assert_eq!(qba_values(&lengths, far, Some(varying)), qba_literal_values(&lengths), "cached endpoint quartic audit mismatch {}", sample);
    }
    println!("PASS_E5_ENDPOINT_QUARTIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn qba_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qba_hash_state(hash: &mut AuditSha256, state: QBAState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qba_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }
fn qba_coefficient_leaf(states: &[QBAState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-quartic-branch-coefficient-v1\0");
    for &state in states { qba_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { qba_hash_z(&mut hash, value); } } qba_sha_bytes(hash)
}
fn qba_finite_leaf(states: &[QBAState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-quartic-branch-finite-v1\0");
    for &state in states { qba_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes()); for &value in values { qba_hash_z(&mut hash, value); } qba_sha_bytes(hash)
}
fn qba_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qba_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qba_degree_ok(rows) }

fn qba_formula_coefficients(states: &[QBAState; 8], far: QBAFar, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qba_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qba_values(&lengths, far, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qba_literal_values(&lengths)); literal_trees += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qba_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qba_values(&lengths, far, Some(varying)); if literal_points { assert_eq!(unseen, qba_literal_values(&lengths)); literal_trees += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_trees)
}
fn qba_literal_coefficients(states: &[QBAState; 8]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qba_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qba_literal_values(&lengths); for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qba_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qba_literal_values(&lengths); for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows)
}

fn qba_smoke_stream() {
    let prefixes = qba_prefixes(); let fars = qba_fars(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 17 + 3) % prefixes.len()]; let far = fars[(sample * 104_729 + 23) % fars.len()]; let states = qba_states(prefix, far);
        if !states.iter().any(|state| state.is_long) { let lengths = qba_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qba_literal_values(&lengths); finite.update(&qba_finite_leaf(&states, order, &values)); finite_records += 1; } continue; }
        let (baseline, shift, rows) = qba_literal_coefficients(&states); if !qba_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qba_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

fn qba_bench() {
    let prefixes = qba_prefixes(); let fars = qba_fars(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QBA_BENCH_RAYS {
        let prefix = prefixes[(candidate * 17 + 5) % prefixes.len()]; let far = fars[(candidate * 104_729 + 31) % fars.len()]; candidate += 1; let states = qba_states(prefix, far); if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, checked) = qba_formula_coefficients(&states, far, true); assert_eq!(checked, 3); stream.update(&qba_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1;
    }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QBAPrefix>(), fars.len() * std::mem::size_of::<QBAFar>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 941_680_usize * 32);
}

struct QBAResult { worker: usize, counts: [u64; 5], unseen: u64, literal_trees: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qba_worker(worker: usize, prefixes: Arc<Vec<QBAPrefix>>, fars: Arc<Vec<QBAFar>>) -> QBAResult {
    let start = prefixes.len() * worker / QBA_THREADS; let end = prefixes.len() * (worker + 1) / QBA_THREADS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    for prefix_index in start..end { let prefix = prefixes[prefix_index]; for &far in fars.iter() { let states = qba_states(prefix, far); let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 { counts[0] += 1; let lengths = qba_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qba_values(&lengths, far, None); assert_eq!(values, qba_literal_values(&lengths)); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qba_finite_leaf(&states, order, &values)); counts[1] += 1; literal_trees += 1; continue; }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qba_formula_coefficients(&states, far, true); audit_assert_gate(&rows); coefficient_leaves.extend_from_slice(&qba_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4; literal_trees += checked;
    } }
    QBAResult { worker, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn qba_full() {
    let prefixes = Arc::new(qba_prefixes()); let fars = Arc::new(qba_fars()); let mut handles = Vec::new(); for worker in 0..QBA_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&fars); handles.push(thread::spawn(move || qba_worker(worker, a, b))); }
    let mut results: Vec<QBAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).collect(); results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_trees += result.literal_trees; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [345_744, 233_728, 707_951, 1, 707_952]); assert_eq!(unseen, 2_831_808); assert_eq!(literal_trees, 2_357_584);
    let raw = format!(concat!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_TREES {}\n", "LITERAL_RAY_POINTS 0 13 29\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_trees, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write"); print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() { Some("smoke") => { qba_independent_smoke(); qba_smoke_stream(); }, Some("bench") => qba_bench(), Some(value) => panic!("unknown mode {}", value), None => qba_full() }
}
