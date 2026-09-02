// Independent checked-i256 literal audit for quartic_endpoint_cubic_path:center_cubic_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCA_THREADS: usize = 6;
const QCA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QCAState { size: i32, long: bool }
#[derive(Clone, Copy)] struct QCAMessage { parent_absent: V, parent_present: V }
#[derive(Clone, Copy)] struct QCAQuartic { stem: QCAState, branch0: QCAState, branch1: QCAState, branch2: QCAState, message: QCAMessage }
#[derive(Clone, Copy)] struct QCAEndpoint { stem: QCAState, branch0: QCAState, branch1: QCAState, message: QCAMessage }
#[derive(Clone, Copy)] struct QCARootChoice { root_arm: QCAState, far: QCAEndpoint }

fn qca_root_arm(size: i32) -> QCAState { QCAState { size, long: size == 8 } }
fn qca_internal(size: i32) -> QCAState { QCAState { size, long: size == 8 } }
fn qca_terminal(size: i32) -> QCAState { QCAState { size, long: size == 7 } }
fn qca_propagate(absent: V, present: V, distance: i32) -> QCAMessage {
    QCAMessage {
        parent_absent: add(&mul(&path(distance - 1), &absent), &mul(&path(distance - 2), &present)),
        parent_present: add(&mul(&path(distance - 2), &absent), &mul(&path(distance - 3), &present)),
    }
}
fn qca_quartic_message(stem: i32, branch0: i32, branch1: i32, branch2: i32) -> QCAMessage {
    let absent = product(&[path(branch0), path(branch1), path(branch2)]);
    let present = shifted(&product(&[path(branch0 - 1), path(branch1 - 1), path(branch2 - 1)]), 1);
    qca_propagate(absent, present, stem)
}
fn qca_endpoint_message(stem: i32, branch0: i32, branch1: i32) -> QCAMessage {
    let absent = product(&[path(branch0), path(branch1)]);
    let present = shifted(&product(&[path(branch0 - 1), path(branch1 - 1)]), 1);
    qca_propagate(absent, present, stem)
}
fn qca_quartic_table() -> Vec<QCAQuartic> {
    let mut table = Vec::with_capacity(672);
    for branch0 in 1..=7_i32 { for branch1 in branch0..=7_i32 { for branch2 in branch1..=7_i32 { for stem in 1..=8_i32 {
        table.push(QCAQuartic { stem: qca_internal(stem), branch0: qca_terminal(branch0), branch1: qca_terminal(branch1), branch2: qca_terminal(branch2), message: qca_quartic_message(stem, branch0, branch1, branch2) });
    } } } }
    assert_eq!(table.len(), 672); table
}
fn qca_root_table() -> Vec<QCARootChoice> {
    let mut table = Vec::with_capacity(1_792);
    for root_arm in 1..=8_i32 { for branch0 in 1..=7_i32 { for branch1 in branch0..=7_i32 { for stem in 1..=8_i32 {
        table.push(QCARootChoice { root_arm: qca_root_arm(root_arm), far: QCAEndpoint { stem: qca_internal(stem), branch0: qca_terminal(branch0), branch1: qca_terminal(branch1), message: qca_endpoint_message(stem, branch0, branch1) } });
    } } } }
    assert_eq!(table.len(), 1_792); table
}
fn qca_states(quartic: QCAQuartic, choice: QCARootChoice) -> [QCAState; 8] {
    [choice.root_arm, quartic.stem, quartic.branch0, quartic.branch1, quartic.branch2, choice.far.stem, choice.far.branch0, choice.far.branch1]
}
fn qca_lengths(states: &[QCAState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].size) }
fn qca_root_polynomials(lengths: &[i32; 8], quartic: QCAMessage, endpoint: QCAMessage) -> (V, V) {
    let center_absent = product(&[quartic.parent_absent, endpoint.parent_absent]);
    let center_present = shifted(&product(&[quartic.parent_present, endpoint.parent_present]), 1);
    let toward_root = qca_propagate(center_absent, center_present, lengths[0]);
    let root_deleted = toward_root.parent_absent;
    let root_selected = shifted(&toward_root.parent_present, 1);
    (add(&root_deleted, &root_selected), root_deleted)
}
fn qca_direct_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qca_root_polynomials(lengths, qca_quartic_message(lengths[1], lengths[2], lengths[3], lengths[4]), qca_endpoint_message(lengths[5], lengths[6], lengths[7]))
}
fn qca_values(lengths: &[i32; 8], quartic: QCAQuartic, endpoint: QCAEndpoint, varying: Option<usize>) -> [Z; 4] {
    let left = if varying.is_some_and(|index| (1..5).contains(&index)) { qca_quartic_message(lengths[1], lengths[2], lengths[3], lengths[4]) } else { quartic.message };
    let right = if varying.is_some_and(|index| index >= 5) { qca_endpoint_message(lengths[5], lengths[6], lengths[7]) } else { endpoint.message };
    let (core, deleted) = qca_root_polynomials(lengths, left, right); deltas03(&core, &deleted)
}
fn qca_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, distance: i32) -> usize {
    let mut current = start;
    for _ in 0..distance { let next = adjacency.len(); adjacency.push(Vec::new()); adjacency[current].push(next); adjacency[next].push(current); current = next; }
    current
}
fn qca_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()];
    let center = qca_extend(&mut adjacency, root, lengths[0]);
    let quartic = qca_extend(&mut adjacency, center, lengths[1]);
    qca_extend(&mut adjacency, quartic, lengths[2]); qca_extend(&mut adjacency, quartic, lengths[3]); qca_extend(&mut adjacency, quartic, lengths[4]);
    let endpoint = qca_extend(&mut adjacency, center, lengths[5]);
    qca_extend(&mut adjacency, endpoint, lengths[6]); qca_extend(&mut adjacency, endpoint, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize); assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}
fn qca_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qca_tree(lengths); audit_deltas(&adjacency, root).0 }
fn qca_independent_smoke() {
    let mut random = 0x61D7E3AC98420FB5_u64;
    for sample in 0..512_usize { let mut lengths = [0_i32; 8]; for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; }
        let (core, deleted) = qca_direct_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qca_literal_values(&lengths), "independent center leaf mismatch {}", sample);
    }
    let quartics = qca_quartic_table(); let choices = qca_root_table();
    for sample in 0..512_usize { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let quartic = quartics[random as usize % quartics.len()];
        random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let choice = choices[random as usize % choices.len()]; let mut lengths = qca_lengths(&qca_states(quartic, choice)); let varying = random as usize % 8; lengths[varying] += (random % 19) as i32;
        assert_eq!(qca_values(&lengths, quartic, choice.far, Some(varying)), qca_literal_values(&lengths), "cached center leaf mismatch {}", sample);
    }
    println!("PASS_E5_CENTER_CUBIC_LEAF_INDEPENDENT_1024_LITERAL_SMOKE");
}
fn qca_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qca_hash_state(hash: &mut AuditSha256, state: QCAState) { hash.update(&[state.long as u8]); hash.update(&state.size.to_le_bytes()); }
fn qca_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }
fn qca_coefficient_leaf(states: &[QCAState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-coefficient-v1\0"); for &state in states { qca_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes()); for row in rows { for &value in row { qca_hash_z(&mut hash, value); } } qca_sha_bytes(hash)
}
fn qca_finite_leaf(states: &[QCAState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-finite-v1\0"); for &state in states { qca_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes()); for &value in values { qca_hash_z(&mut hash, value); } qca_sha_bytes(hash)
}
fn qca_order27_leaf(lengths: &[i32; 8], values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-order27-v1\0"); for &length in lengths { hash.update(&length.to_le_bytes()); }
    for &value in values { qca_hash_z(&mut hash, value); } qca_sha_bytes(hash)
}
fn qca_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qca_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qca_degree_ok(rows) }
fn qca_formula_coefficients(states: &[QCAState; 8], quartic: QCAQuartic, endpoint: QCAEndpoint, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.long).expect("ray expected"); let mut lengths = qca_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qca_values(&lengths, quartic, endpoint, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qca_literal_values(&lengths)); literal_trees += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qca_degree_ok(&rows)); lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qca_values(&lengths, quartic, endpoint, Some(varying)); if literal_points { assert_eq!(unseen, qca_literal_values(&lengths)); literal_trees += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_trees)
}
fn qca_literal_coefficients(states: &[QCAState; 8]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = states.iter().position(|state| state.long).expect("ray expected"); let mut lengths = qca_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qca_literal_values(&lengths); for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qca_degree_ok(&rows)); lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qca_literal_values(&lengths); for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows)
}
fn qca_smoke_stream() {
    let quartics = qca_quartic_table(); let choices = qca_root_table(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize { let quartic = quartics[(sample * 104_729 + 3) % quartics.len()]; let choice = choices[(sample * 17 + 23) % choices.len()]; let states = qca_states(quartic, choice);
        if !states.iter().any(|state| state.long) { let lengths = qca_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qca_literal_values(&lengths); finite.update(&qca_finite_leaf(&states, order, &values)); finite_records += 1; } continue; }
        let (baseline, shift, rows) = qca_literal_coefficients(&states); if !qca_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qca_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}
fn qca_bench() {
    let quartics = qca_quartic_table(); let choices = qca_root_table(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QCA_BENCH_RAYS { let quartic = quartics[(candidate * 104_729 + 5) % quartics.len()]; let choice = choices[(candidate * 17 + 31) % choices.len()]; candidate += 1; let states = qca_states(quartic, choice); if !states.iter().any(|state| state.long) { continue; }
        let (baseline, shift, rows, checked) = qca_formula_coefficients(&states, quartic, choice.far, true); assert_eq!(checked, 3); stream.update(&qca_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1;
    }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", quartics.len() * std::mem::size_of::<QCAQuartic>(), choices.len() * std::mem::size_of::<QCARootChoice>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 1_085_160_usize * 32);
}
fn qca_cuts<F: FnMut(&[i32; 8])>(next: i32, depth: usize, cuts: &mut [i32; 7], callback: &mut F) {
    if depth == 7 { let mut row = [0_i32; 8]; let mut previous = 0_i32; for index in 0..7 { row[index] = cuts[index] - previous; previous = cuts[index]; } row[7] = 26 - previous; callback(&row); return; }
    let maximum = 19 + depth as i32; for value in next..=maximum { cuts[depth] = value; qca_cuts(value + 1, depth + 1, cuts, callback); }
}
fn qca_order27() {
    let mut raw_count = 0_u64; let mut count = 0_u64; let mut nonpositive = [0_u64; 4]; let mut stream = AuditSha256::new(); let mut cuts = [0_i32; 7];
    qca_cuts(1, 0, &mut cuts, &mut |row| { raw_count += 1; if !(row[2] <= row[3] && row[3] <= row[4] && row[6] <= row[7]) { return; } let values = qca_literal_values(row); for rank in 0..4 { if !values[rank].is_positive() { nonpositive[rank] += 1; } } stream.update(&qca_order27_leaf(row, &values)); count += 1; });
    assert_eq!(raw_count, 480_700); assert_eq!(count, 70_854); assert_eq!(nonpositive, [0; 4]);
    let raw = format!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_ORDER27\nRAW_COMPOSITIONS {}\nORDER27_COUNT {}\nNONPOSITIVE {} {} {} {}\nLITERAL_TREES {}\nVALUE_STREAM {}\n", raw_count, count, nonpositive[0], nonpositive[1], nonpositive[2], nonpositive[3], count, stream.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_literal_raw_agent_20260823.txt", raw.as_bytes()).expect("order27 audit raw write"); print!("{}", raw);
}
struct QCAResult { worker: usize, counts: [u64; 5], unseen: u64, literal_trees: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qca_worker(worker: usize, quartics: Arc<Vec<QCAQuartic>>, choices: Arc<Vec<QCARootChoice>>) -> QCAResult {
    let start = quartics.len() * worker / QCA_THREADS; let end = quartics.len() * (worker + 1) / QCA_THREADS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    for quartic_index in start..end { let quartic = quartics[quartic_index]; for &choice in choices.iter() { let states = qca_states(quartic, choice); let long_count = states.iter().filter(|state| state.long).count();
        if long_count == 0 { counts[0] += 1; let lengths = qca_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qca_values(&lengths, quartic, choice.far, None); assert_eq!(values, qca_literal_values(&lengths)); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qca_finite_leaf(&states, order, &values)); counts[1] += 1; literal_trees += 1; continue; }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qca_formula_coefficients(&states, quartic, choice.far, true); audit_assert_gate(&rows); coefficient_leaves.extend_from_slice(&qca_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4; literal_trees += checked;
    } }
    QCAResult { worker, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}
fn qca_full() {
    let quartics = Arc::new(qca_quartic_table()); let choices = Arc::new(qca_root_table()); let mut handles = Vec::new();
    for worker in 0..QCA_THREADS { let a = Arc::clone(&quartics); let b = Arc::clone(&choices); handles.push(thread::spawn(move || qca_worker(worker, a, b))); }
    let mut results: Vec<QCAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).collect(); results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_trees += result.literal_trees; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [403_368, 284_304, 800_855, 1, 800_856]); assert_eq!(unseen, 3_203_424); assert_eq!(literal_trees, 2_686_872);
    let raw = format!(concat!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_TREES {}\n", "LITERAL_RAY_POINTS 0 13 29\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_trees, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write"); print!("{}", raw);
}
fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() { Some("smoke") => { qca_independent_smoke(); qca_smoke_stream(); }, Some("bench") => qca_bench(), Some("order27") => qca_order27(), Some(value) => panic!("unknown mode {}", value), None => qca_full() }
}
