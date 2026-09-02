// Six-thread checked-i256 producer for quartic_endpoint_cubic_path:center_cubic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCP_THREADS: usize = 6;
const QCP_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QCPState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QCPMessage { free: V, blocked: V }
#[derive(Clone, Copy)] struct QCPQuartic { spine: QCPState, low: QCPState, middle: QCPState, high: QCPState, at_root: QCPMessage }
#[derive(Clone, Copy)] struct QCPEndpoint { spine: QCPState, low: QCPState, high: QCPState, at_root: QCPMessage }
#[derive(Clone, Copy)] struct QCPPrefix { root_arm: QCPState, quartic: QCPQuartic }

fn qcp_pendant(length: i32) -> QCPState { QCPState { length, is_long: length == 7 } }
fn qcp_spine(length: i32) -> QCPState { QCPState { length, is_long: length == 8 } }
fn qcp_cross(absent: V, present: V, length: i32) -> QCPMessage {
    QCPMessage { free: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)), blocked: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)) }
}
fn qcp_quartic_parts(spine: i32, low: i32, middle: i32, high: i32) -> QCPMessage {
    let absent = product(&[path(low), path(middle), path(high)]);
    let present = shifted(&product(&[path(low - 1), path(middle - 1), path(high - 1)]), 1);
    qcp_cross(absent, present, spine)
}
fn qcp_endpoint_parts(spine: i32, low: i32, high: i32) -> QCPMessage {
    let absent = mul(&path(low), &path(high)); let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1); qcp_cross(absent, present, spine)
}
fn qcp_prefixes() -> Vec<QCPPrefix> {
    let mut out = Vec::with_capacity(4_704);
    for root_arm in 1..=7_i32 { for low in 1..=7_i32 { for middle in low..=7_i32 { for high in middle..=7_i32 { for spine in 1..=8_i32 {
        out.push(QCPPrefix { root_arm: qcp_pendant(root_arm), quartic: QCPQuartic { spine: qcp_spine(spine), low: qcp_pendant(low), middle: qcp_pendant(middle), high: qcp_pendant(high), at_root: qcp_quartic_parts(spine, low, middle, high) } });
    } } } } }
    assert_eq!(out.len(), 4_704); out
}
fn qcp_endpoints() -> Vec<QCPEndpoint> {
    let mut out = Vec::with_capacity(224);
    for low in 1..=7_i32 { for high in low..=7_i32 { for spine in 1..=8_i32 {
        out.push(QCPEndpoint { spine: qcp_spine(spine), low: qcp_pendant(low), high: qcp_pendant(high), at_root: qcp_endpoint_parts(spine, low, high) });
    } } }
    assert_eq!(out.len(), 224); out
}
fn qcp_states(prefix: QCPPrefix, endpoint: QCPEndpoint) -> [QCPState; 8] {
    [prefix.root_arm, prefix.quartic.spine, prefix.quartic.low, prefix.quartic.middle, prefix.quartic.high, endpoint.spine, endpoint.low, endpoint.high]
}
fn qcp_lengths(states: &[QCPState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].length) }
fn qcp_finish(lengths: &[i32; 8], quartic: QCPMessage, endpoint: QCPMessage) -> (V, V) {
    let deleted = product(&[path(lengths[0]), quartic.free, endpoint.free]);
    let selected = shifted(&product(&[path(lengths[0] - 1), quartic.blocked, endpoint.blocked]), 1);
    (add(&deleted, &selected), deleted)
}
fn qcp_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qcp_finish(lengths, qcp_quartic_parts(lengths[1], lengths[2], lengths[3], lengths[4]), qcp_endpoint_parts(lengths[5], lengths[6], lengths[7]))
}
fn qcp_values(lengths: &[i32; 8], prefix: QCPPrefix, endpoint: QCPEndpoint, varying: Option<usize>) -> [Z; 4] {
    let quartic = if varying.is_some_and(|index| (1..=4).contains(&index)) { qcp_quartic_parts(lengths[1], lengths[2], lengths[3], lengths[4]) } else { prefix.quartic.at_root };
    let far = if varying.is_some_and(|index| index >= 5) { qcp_endpoint_parts(lengths[5], lengths[6], lengths[7]) } else { endpoint.at_root };
    let (core, deleted) = qcp_finish(lengths, quartic, far); deltas03(&core, &deleted)
}
fn qcp_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()]; audit_attach(&mut adjacency, root, lengths[0]);
    let quartic = audit_attach(&mut adjacency, root, lengths[1]); audit_attach(&mut adjacency, quartic, lengths[2]); audit_attach(&mut adjacency, quartic, lengths[3]); audit_attach(&mut adjacency, quartic, lengths[4]);
    let endpoint = audit_attach(&mut adjacency, root, lengths[5]); audit_attach(&mut adjacency, endpoint, lengths[6]); audit_attach(&mut adjacency, endpoint, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize); assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 3); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2); (adjacency, root)
}
fn qcp_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qcp_literal_tree(lengths); audit_deltas(&adjacency, root).0 }

fn qcp_formula_smoke() {
    let mut random = 0xD1B54A32D192ED03_u64;
    for sample in 0..512_usize { let mut lengths = [0_i32; 8]; for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; } let (core, deleted) = qcp_formula_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qcp_literal_values(&lengths), "center cubic primary mismatch {}", sample); }
    println!("PASS_E5_CENTER_CUBIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}
fn qcp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1; if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; } for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block); let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qcp_hash_state(hash: &mut AuditSha256, state: QCPState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qcp_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }
fn qcp_coefficient_leaf(states: &[QCPState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-coefficient-v1\0"); for &state in states { qcp_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes()); for row in rows { for &value in row { qcp_hash_z(&mut hash, value); } } qcp_sha_bytes(hash)
}
fn qcp_finite_leaf(states: &[QCPState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-finite-v1\0"); for &state in states { qcp_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes()); for &value in values { qcp_hash_z(&mut hash, value); } qcp_sha_bytes(hash)
}
fn qcp_order27_leaf(lengths: &[i32; 8], values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-order27-v1\0"); for &length in lengths { hash.update(&length.to_le_bytes()); } for &value in values { qcp_hash_z(&mut hash, value); } qcp_sha_bytes(hash)
}
fn qcp_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qcp_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qcp_degree_ok(rows) }
fn qcp_coefficients(states: &[QCPState; 8], prefix: QCPPrefix, endpoint: QCPEndpoint, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qcp_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qcp_values(&lengths, prefix, endpoint, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qcp_literal_values(&lengths)); literal_checks += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qcp_degree_ok(&rows)); lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qcp_values(&lengths, prefix, endpoint, Some(varying)); if literal_points { assert_eq!(unseen, qcp_literal_values(&lengths)); literal_checks += 1; } for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_checks)
}

fn qcp_smoke_stream() {
    let prefixes = qcp_prefixes(); let endpoints = qcp_endpoints(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize { let prefix = prefixes[(sample * 104_729 + 3) % prefixes.len()]; let endpoint = endpoints[(sample * 17 + 23) % endpoints.len()]; let states = qcp_states(prefix, endpoint); if !states.iter().any(|state| state.is_long) { let lengths = qcp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qcp_values(&lengths, prefix, endpoint, None); finite.update(&qcp_finite_leaf(&states, order, &values)); finite_records += 1; } continue; } let (baseline, shift, rows, _) = qcp_coefficients(&states, prefix, endpoint, false); if !qcp_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qcp_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1; }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}
fn qcp_bench() {
    let prefixes = qcp_prefixes(); let endpoints = qcp_endpoints(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QCP_BENCH_RAYS { let prefix = prefixes[(candidate * 104_729 + 5) % prefixes.len()]; let endpoint = endpoints[(candidate * 17 + 31) % endpoints.len()]; candidate += 1; let states = qcp_states(prefix, endpoint); if !states.iter().any(|state| state.is_long) { continue; } let (baseline, shift, rows, _) = qcp_coefficients(&states, prefix, endpoint, false); stream.update(&qcp_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1; }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QCPPrefix>(), endpoints.len() * std::mem::size_of::<QCPEndpoint>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 941_680_usize * 32);
}

fn qcp_compositions<F: FnMut(&[i32; 8])>(remaining: i32, slot: usize, current: &mut [i32; 8], callback: &mut F) {
    if slot == 7 { if remaining >= 1 { current[slot] = remaining; callback(current); } return; }
    let left = 8 - slot; for value in 1..=(remaining - left as i32 + 1) { current[slot] = value; qcp_compositions(remaining - value, slot + 1, current, callback); }
}
fn qcp_order27() {
    let mut count = 0_u64; let mut nonpositive = [0_u64; 4]; let mut literal_spots = 0_u64; let mut stream = AuditSha256::new(); let mut lengths = [0_i32; 8];
    qcp_compositions(26, 0, &mut lengths, &mut |row| { if !(row[2] <= row[3] && row[3] <= row[4] && row[6] <= row[7]) { return; } let (core, deleted) = qcp_formula_polynomials(row); let values = deltas03(&core, &deleted); for rank in 0..4 { if !values[rank].is_positive() { nonpositive[rank] += 1; } } if count % 4096 == 0 { assert_eq!(values, qcp_literal_values(row)); literal_spots += 1; } stream.update(&qcp_order27_leaf(row, &values)); count += 1; });
    assert_eq!(count, 70_854); assert_eq!(nonpositive, [0; 4]); assert_eq!(literal_spots, 18);
    let raw = format!("PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27\nORDER27_COUNT {}\nNONPOSITIVE {} {} {} {}\nLITERAL_SPOTS {}\nVALUE_STREAM {}\n", count, nonpositive[0], nonpositive[1], nonpositive[2], nonpositive[3], literal_spots, stream.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_raw_agent_20260823.txt", raw.as_bytes()).expect("order27 raw write"); print!("{}", raw);
}

struct QCPResult { worker: usize, counts: [u64; 5], unseen: u64, literal_checks: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qcp_worker(worker: usize, prefixes: Arc<Vec<QCPPrefix>>, endpoints: Arc<Vec<QCPEndpoint>>) -> QCPResult {
    let start = prefixes.len() * worker / QCP_THREADS; let end = prefixes.len() * (worker + 1) / QCP_THREADS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new(); let mut checked_finite = false; let mut checked_ray = false;
    for prefix_index in start..end { let prefix = prefixes[prefix_index]; for &endpoint in endpoints.iter() { let states = qcp_states(prefix, endpoint); let long_count = states.iter().filter(|state| state.is_long).count(); if long_count == 0 { counts[0] += 1; let lengths = qcp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qcp_values(&lengths, prefix, endpoint, None); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qcp_finite_leaf(&states, order, &values)); if !checked_finite { assert_eq!(values, qcp_literal_values(&lengths)); checked_finite = true; literal_checks += 1; } counts[1] += 1; continue; } if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qcp_coefficients(&states, prefix, endpoint, !checked_ray); audit_assert_gate(&rows); if !checked_ray { checked_ray = true; literal_checks += checked; } coefficient_leaves.extend_from_slice(&qcp_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4; } }
    QCPResult { worker, counts, unseen, literal_checks, coefficient_leaves, finite_leaves }
}
fn qcp_full() {
    let prefixes = Arc::new(qcp_prefixes()); let endpoints = Arc::new(qcp_endpoints()); let mut handles = Vec::new(); for worker in 0..QCP_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&endpoints); handles.push(thread::spawn(move || qcp_worker(worker, a, b))); } let mut results: Vec<QCPResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect(); results.sort_by_key(|result| result.worker); let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_checks += result.literal_checks; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); } assert_eq!(counts, [345_744, 233_728, 707_951, 1, 707_952]); assert_eq!(unseen, 2_831_808); let raw = format!(concat!("PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_CHECKS {}\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_checks, coefficient.hex(), finite.hex()); std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("primary raw write"); print!("{}", raw);
}
fn main() { audit_sha_self_test(); match std::env::args().nth(1).as_deref() { Some("smoke") => { qcp_formula_smoke(); qcp_smoke_stream(); }, Some("bench") => qcp_bench(), Some("order27") => qcp_order27(), Some(value) => panic!("unknown mode {}", value), None => qcp_full() } }
