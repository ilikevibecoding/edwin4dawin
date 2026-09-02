// Independent checked-i256 literal audit for quartic_endpoint_cubic_path:center_cubic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCA_THREADS: usize = 6;
const QCA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QCAState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QCAMessage { absent_if_parent_absent: V, absent_if_parent_present: V }
#[derive(Clone, Copy)] struct QCAQuartic { stem: QCAState, arm0: QCAState, arm1: QCAState, arm2: QCAState, message: QCAMessage }
#[derive(Clone, Copy)] struct QCAEndpoint { stem: QCAState, arm0: QCAState, arm1: QCAState, message: QCAMessage }
#[derive(Clone, Copy)] struct QCAPrefix { own_arm: QCAState, quartic: QCAQuartic }

fn qca_arm(length: i32) -> QCAState { QCAState { length, is_long: length == 7 } }
fn qca_stem(length: i32) -> QCAState { QCAState { length, is_long: length == 8 } }
fn qca_propagate(absent: V, present: V, length: i32) -> QCAMessage {
    QCAMessage { absent_if_parent_absent: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)), absent_if_parent_present: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)) }
}
fn qca_quartic_message(stem: i32, arm0: i32, arm1: i32, arm2: i32) -> QCAMessage {
    let absent = product(&[path(arm0), path(arm1), path(arm2)]); let present = shifted(&product(&[path(arm0 - 1), path(arm1 - 1), path(arm2 - 1)]), 1); qca_propagate(absent, present, stem)
}
fn qca_endpoint_message(stem: i32, arm0: i32, arm1: i32) -> QCAMessage {
    let absent = product(&[path(arm0), path(arm1)]); let present = shifted(&product(&[path(arm0 - 1), path(arm1 - 1)]), 1); qca_propagate(absent, present, stem)
}
fn qca_prefixes() -> Vec<QCAPrefix> {
    let mut out = Vec::with_capacity(4_704);
    for own_arm in 1..=7_i32 { for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for arm2 in arm1..=7_i32 { for stem in 1..=8_i32 {
        out.push(QCAPrefix { own_arm: qca_arm(own_arm), quartic: QCAQuartic { stem: qca_stem(stem), arm0: qca_arm(arm0), arm1: qca_arm(arm1), arm2: qca_arm(arm2), message: qca_quartic_message(stem, arm0, arm1, arm2) } });
    } } } } }
    assert_eq!(out.len(), 4_704); out
}
fn qca_endpoints() -> Vec<QCAEndpoint> {
    let mut out = Vec::with_capacity(224);
    for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for stem in 1..=8_i32 { out.push(QCAEndpoint { stem: qca_stem(stem), arm0: qca_arm(arm0), arm1: qca_arm(arm1), message: qca_endpoint_message(stem, arm0, arm1) }); } } }
    assert_eq!(out.len(), 224); out
}
fn qca_states(prefix: QCAPrefix, endpoint: QCAEndpoint) -> [QCAState; 8] { [prefix.own_arm, prefix.quartic.stem, prefix.quartic.arm0, prefix.quartic.arm1, prefix.quartic.arm2, endpoint.stem, endpoint.arm0, endpoint.arm1] }
fn qca_lengths(states: &[QCAState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].length) }
fn qca_finish(lengths: &[i32; 8], quartic: QCAMessage, endpoint: QCAMessage) -> (V, V) {
    let absent = product(&[path(lengths[0]), quartic.absent_if_parent_absent, endpoint.absent_if_parent_absent]);
    let present = shifted(&product(&[path(lengths[0] - 1), quartic.absent_if_parent_present, endpoint.absent_if_parent_present]), 1); (add(&absent, &present), absent)
}
fn qca_formula_polynomials(lengths: &[i32; 8]) -> (V, V) { qca_finish(lengths, qca_quartic_message(lengths[1], lengths[2], lengths[3], lengths[4]), qca_endpoint_message(lengths[5], lengths[6], lengths[7])) }
fn qca_values(lengths: &[i32; 8], prefix: QCAPrefix, endpoint: QCAEndpoint, varying: Option<usize>) -> [Z; 4] {
    let quartic = if varying.is_some_and(|index| (1..=4).contains(&index)) { qca_quartic_message(lengths[1], lengths[2], lengths[3], lengths[4]) } else { prefix.quartic.message };
    let terminal = if varying.is_some_and(|index| index >= 5) { qca_endpoint_message(lengths[5], lengths[6], lengths[7]) } else { endpoint.message };
    let (core, deleted) = qca_finish(lengths, quartic, terminal); deltas03(&core, &deleted)
}
fn qca_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize { let mut endpoint = start; for _ in 0..length { let next = adjacency.len(); adjacency.push(Vec::new()); adjacency[endpoint].push(next); adjacency[next].push(endpoint); endpoint = next; } endpoint }
fn qca_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()]; qca_extend(&mut adjacency, root, lengths[0]); let quartic = qca_extend(&mut adjacency, root, lengths[1]); qca_extend(&mut adjacency, quartic, lengths[2]); qca_extend(&mut adjacency, quartic, lengths[3]); qca_extend(&mut adjacency, quartic, lengths[4]); let endpoint = qca_extend(&mut adjacency, root, lengths[5]); qca_extend(&mut adjacency, endpoint, lengths[6]); qca_extend(&mut adjacency, endpoint, lengths[7]); assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize); assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1)); assert_eq!(adjacency[root].len(), 3); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2); (adjacency, root)
}
fn qca_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qca_tree(lengths); audit_deltas(&adjacency, root).0 }
fn qca_independent_smoke() {
    let mut random = 0x94D049BB133111EB_u64;
    for sample in 0..512_usize { let mut lengths = [0_i32; 8]; for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; } let (core, deleted) = qca_formula_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qca_literal_values(&lengths), "independent center cubic mismatch {}", sample); }
    let prefixes = qca_prefixes(); let endpoints = qca_endpoints(); for sample in 0..512_usize { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let prefix = prefixes[random as usize % prefixes.len()]; random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); let endpoint = endpoints[random as usize % endpoints.len()]; let mut lengths = qca_lengths(&qca_states(prefix, endpoint)); let varying = random as usize % 8; lengths[varying] += (random % 19) as i32; assert_eq!(qca_values(&lengths, prefix, endpoint, Some(varying)), qca_literal_values(&lengths), "cached center cubic mismatch {}", sample); }
    println!("PASS_E5_CENTER_CUBIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
}
fn qca_sha_bytes(mut hash: AuditSha256) -> [u8; 32] { let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1; if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; } for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block); let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out }
fn qca_hash_state(hash: &mut AuditSha256, state: QCAState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qca_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }
fn qca_coefficient_leaf(states: &[QCAState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] { let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-coefficient-v1\0"); for &state in states { qca_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes()); for row in rows { for &value in row { qca_hash_z(&mut hash, value); } } qca_sha_bytes(hash) }
fn qca_finite_leaf(states: &[QCAState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] { let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-finite-v1\0"); for &state in states { qca_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes()); for &value in values { qca_hash_z(&mut hash, value); } qca_sha_bytes(hash) }
fn qca_order27_leaf(lengths: &[i32; 8], values: &[Z; 4]) -> [u8; 32] { let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-branch-order27-v1\0"); for &length in lengths { hash.update(&length.to_le_bytes()); } for &value in values { qca_hash_z(&mut hash, value); } qca_sha_bytes(hash) }
fn qca_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qca_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qca_degree_ok(rows) }
fn qca_formula_coefficients(states: &[QCAState; 8], prefix: QCAPrefix, endpoint: QCAEndpoint, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qca_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qca_values(&lengths, prefix, endpoint, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qca_literal_values(&lengths)); literal_trees += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qca_degree_ok(&rows)); lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qca_values(&lengths, prefix, endpoint, Some(varying)); if literal_points { assert_eq!(unseen, qca_literal_values(&lengths)); literal_trees += 1; } for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_trees)
}
fn qca_literal_coefficients(states: &[QCAState; 8]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qca_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qca_literal_values(&lengths); for rank in 0..4 { samples[rank][point] = values[rank]; } } let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qca_degree_ok(&rows)); lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qca_literal_values(&lengths); for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows)
}
fn qca_smoke_stream() {
    let prefixes = qca_prefixes(); let endpoints = qca_endpoints(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64; for sample in 0..512_usize { let prefix = prefixes[(sample * 104_729 + 3) % prefixes.len()]; let endpoint = endpoints[(sample * 17 + 23) % endpoints.len()]; let states = qca_states(prefix, endpoint); if !states.iter().any(|state| state.is_long) { let lengths = qca_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qca_literal_values(&lengths); finite.update(&qca_finite_leaf(&states, order, &values)); finite_records += 1; } continue; } let (baseline, shift, rows) = qca_literal_coefficients(&states); if !qca_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qca_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1; } println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}
fn qca_bench() {
    let prefixes = qca_prefixes(); let endpoints = qca_endpoints(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize; while rays < QCA_BENCH_RAYS { let prefix = prefixes[(candidate * 104_729 + 5) % prefixes.len()]; let endpoint = endpoints[(candidate * 17 + 31) % endpoints.len()]; candidate += 1; let states = qca_states(prefix, endpoint); if !states.iter().any(|state| state.is_long) { continue; } let (baseline, shift, rows, checked) = qca_formula_coefficients(&states, prefix, endpoint, true); assert_eq!(checked, 3); stream.update(&qca_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1; } println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QCAPrefix>(), endpoints.len() * std::mem::size_of::<QCAEndpoint>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 941_680_usize * 32);
}

fn qca_cuts<F: FnMut(&[i32; 8])>(next: i32, depth: usize, cuts: &mut [i32; 7], callback: &mut F) {
    if depth == 7 { let mut row = [0_i32; 8]; let mut previous = 0_i32; for index in 0..7 { row[index] = cuts[index] - previous; previous = cuts[index]; } row[7] = 26 - previous; callback(&row); return; }
    let maximum = 19 + depth as i32; for value in next..=maximum { cuts[depth] = value; qca_cuts(value + 1, depth + 1, cuts, callback); }
}
fn qca_order27() {
    let mut raw_count = 0_u64; let mut count = 0_u64; let mut nonpositive = [0_u64; 4]; let mut stream = AuditSha256::new(); let mut cuts = [0_i32; 7];
    qca_cuts(1, 0, &mut cuts, &mut |row| { raw_count += 1; if !(row[2] <= row[3] && row[3] <= row[4] && row[6] <= row[7]) { return; } let values = qca_literal_values(row); for rank in 0..4 { if !values[rank].is_positive() { nonpositive[rank] += 1; } } stream.update(&qca_order27_leaf(row, &values)); count += 1; });
    assert_eq!(raw_count, 480_700); assert_eq!(count, 70_854); assert_eq!(nonpositive, [0; 4]); let raw = format!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27\nRAW_COMPOSITIONS {}\nORDER27_COUNT {}\nNONPOSITIVE {} {} {} {}\nLITERAL_TREES {}\nVALUE_STREAM {}\n", raw_count, count, nonpositive[0], nonpositive[1], nonpositive[2], nonpositive[3], count, stream.hex()); std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_literal_raw_agent_20260823.txt", raw.as_bytes()).expect("order27 audit raw write"); print!("{}", raw);
}

struct QCAResult { worker: usize, counts: [u64; 5], unseen: u64, literal_trees: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qca_worker(worker: usize, prefixes: Arc<Vec<QCAPrefix>>, endpoints: Arc<Vec<QCAEndpoint>>) -> QCAResult {
    let start = prefixes.len() * worker / QCA_THREADS; let end = prefixes.len() * (worker + 1) / QCA_THREADS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new(); for prefix_index in start..end { let prefix = prefixes[prefix_index]; for &endpoint in endpoints.iter() { let states = qca_states(prefix, endpoint); let long_count = states.iter().filter(|state| state.is_long).count(); if long_count == 0 { counts[0] += 1; let lengths = qca_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qca_values(&lengths, prefix, endpoint, None); assert_eq!(values, qca_literal_values(&lengths)); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qca_finite_leaf(&states, order, &values)); counts[1] += 1; literal_trees += 1; continue; } if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qca_formula_coefficients(&states, prefix, endpoint, true); audit_assert_gate(&rows); coefficient_leaves.extend_from_slice(&qca_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4; literal_trees += checked; } } QCAResult { worker, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}
fn qca_full() {
    let prefixes = Arc::new(qca_prefixes()); let endpoints = Arc::new(qca_endpoints()); let mut handles = Vec::new(); for worker in 0..QCA_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&endpoints); handles.push(thread::spawn(move || qca_worker(worker, a, b))); } let mut results: Vec<QCAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).collect(); results.sort_by_key(|result| result.worker); let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_trees += result.literal_trees; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); } assert_eq!(counts, [345_744, 233_728, 707_951, 1, 707_952]); assert_eq!(unseen, 2_831_808); assert_eq!(literal_trees, 2_357_584); let raw = format!(concat!("PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_TREES {}\n", "LITERAL_RAY_POINTS 0 13 29\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_trees, coefficient.hex(), finite.hex()); std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write"); print!("{}", raw);
}
fn main() { audit_sha_self_test(); match std::env::args().nth(1).as_deref() { Some("smoke") => { qca_independent_smoke(); qca_smoke_stream(); }, Some("bench") => qca_bench(), Some("order27") => qca_order27(), Some(value) => panic!("unknown mode {}", value), None => qca_full() } }
