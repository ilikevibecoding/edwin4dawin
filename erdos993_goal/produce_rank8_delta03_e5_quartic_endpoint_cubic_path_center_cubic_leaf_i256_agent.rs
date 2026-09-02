// Six-thread checked-i256 producer for quartic_endpoint_cubic_path:center_cubic_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCL_THREADS: usize = 6;
const QCL_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QCLState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QCLMessage { free: V, blocked: V }
#[derive(Clone, Copy)] struct QCLQuartic { spine: QCLState, arm0: QCLState, arm1: QCLState, arm2: QCLState, at_center: QCLMessage }
#[derive(Clone, Copy)] struct QCLEndpoint { spine: QCLState, arm0: QCLState, arm1: QCLState, at_center: QCLMessage }
#[derive(Clone, Copy)] struct QCLRoot { incident: QCLState, endpoint: QCLEndpoint }

fn qcl_incident(length: i32) -> QCLState { QCLState { length, is_long: length == 8 } }
fn qcl_spine(length: i32) -> QCLState { QCLState { length, is_long: length == 8 } }
fn qcl_pendant(length: i32) -> QCLState { QCLState { length, is_long: length == 7 } }
fn qcl_cross(absent: V, present: V, length: i32) -> QCLMessage {
    QCLMessage {
        free: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        blocked: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}
fn qcl_quartic_parts(spine: i32, arm0: i32, arm1: i32, arm2: i32) -> QCLMessage {
    let absent = product(&[path(arm0), path(arm1), path(arm2)]);
    let present = shifted(&product(&[path(arm0 - 1), path(arm1 - 1), path(arm2 - 1)]), 1);
    qcl_cross(absent, present, spine)
}
fn qcl_endpoint_parts(spine: i32, arm0: i32, arm1: i32) -> QCLMessage {
    let absent = mul(&path(arm0), &path(arm1));
    let present = shifted(&mul(&path(arm0 - 1), &path(arm1 - 1)), 1);
    qcl_cross(absent, present, spine)
}
fn qcl_quartics() -> Vec<QCLQuartic> {
    let mut out = Vec::with_capacity(672);
    for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for arm2 in arm1..=7_i32 { for spine in 1..=8_i32 {
        out.push(QCLQuartic { spine: qcl_spine(spine), arm0: qcl_pendant(arm0), arm1: qcl_pendant(arm1), arm2: qcl_pendant(arm2), at_center: qcl_quartic_parts(spine, arm0, arm1, arm2) });
    } } } }
    assert_eq!(out.len(), 672); out
}
fn qcl_roots() -> Vec<QCLRoot> {
    let mut out = Vec::with_capacity(1_792);
    for incident in 1..=8_i32 { for arm0 in 1..=7_i32 { for arm1 in arm0..=7_i32 { for spine in 1..=8_i32 {
        out.push(QCLRoot { incident: qcl_incident(incident), endpoint: QCLEndpoint { spine: qcl_spine(spine), arm0: qcl_pendant(arm0), arm1: qcl_pendant(arm1), at_center: qcl_endpoint_parts(spine, arm0, arm1) } });
    } } } }
    assert_eq!(out.len(), 1_792); out
}
fn qcl_states(quartic: QCLQuartic, root: QCLRoot) -> [QCLState; 8] {
    [root.incident, quartic.spine, quartic.arm0, quartic.arm1, quartic.arm2, root.endpoint.spine, root.endpoint.arm0, root.endpoint.arm1]
}
fn qcl_lengths(states: &[QCLState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].length) }
fn qcl_finish(lengths: &[i32; 8], quartic: QCLMessage, endpoint: QCLMessage) -> (V, V) {
    let center_absent = mul(&quartic.free, &endpoint.free);
    let center_present = shifted(&mul(&quartic.blocked, &endpoint.blocked), 1);
    let at_root = qcl_cross(center_absent, center_present, lengths[0]);
    let deleted = at_root.free;
    let selected = shifted(&at_root.blocked, 1);
    (add(&deleted, &selected), deleted)
}
fn qcl_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qcl_finish(lengths, qcl_quartic_parts(lengths[1], lengths[2], lengths[3], lengths[4]), qcl_endpoint_parts(lengths[5], lengths[6], lengths[7]))
}
fn qcl_values(lengths: &[i32; 8], quartic: QCLQuartic, endpoint: QCLEndpoint, varying: Option<usize>) -> [Z; 4] {
    let q = if varying.is_some_and(|index| (1..=4).contains(&index)) { qcl_quartic_parts(lengths[1], lengths[2], lengths[3], lengths[4]) } else { quartic.at_center };
    let e = if varying.is_some_and(|index| index >= 5) { qcl_endpoint_parts(lengths[5], lengths[6], lengths[7]) } else { endpoint.at_center };
    let (core, deleted) = qcl_finish(lengths, q, e); deltas03(&core, &deleted)
}
fn qcl_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()];
    let center = audit_attach(&mut adjacency, root, lengths[0]);
    let quartic = audit_attach(&mut adjacency, center, lengths[1]);
    audit_attach(&mut adjacency, quartic, lengths[2]); audit_attach(&mut adjacency, quartic, lengths[3]); audit_attach(&mut adjacency, quartic, lengths[4]);
    let endpoint = audit_attach(&mut adjacency, center, lengths[5]);
    audit_attach(&mut adjacency, endpoint, lengths[6]); audit_attach(&mut adjacency, endpoint, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1); assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}
fn qcl_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qcl_literal_tree(lengths); audit_deltas(&adjacency, root).0 }
fn qcl_formula_smoke() {
    let mut random = 0xBD6A4C379EF02185_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths { random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D); *length = 1 + (random % 23) as i32; }
        let (core, deleted) = qcl_formula_polynomials(&lengths); assert_eq!(deltas03(&core, &deleted), qcl_literal_values(&lengths), "center-cubic leaf primary mismatch {}", sample);
    }
    println!("PASS_E5_CENTER_CUBIC_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}
fn qcl_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qcl_hash_state(hash: &mut AuditSha256, state: QCLState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qcl_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }
fn qcl_coefficient_leaf(states: &[QCLState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-coefficient-v1\0"); for &state in states { qcl_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes()); for row in rows { for &value in row { qcl_hash_z(&mut hash, value); } } qcl_sha_bytes(hash)
}
fn qcl_finite_leaf(states: &[QCLState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-finite-v1\0"); for &state in states { qcl_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes()); for &value in values { qcl_hash_z(&mut hash, value); } qcl_sha_bytes(hash)
}
fn qcl_order27_leaf(lengths: &[i32; 8], values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-center-cubic-leaf-order27-v1\0"); for &length in lengths { hash.update(&length.to_le_bytes()); }
    for &value in values { qcl_hash_z(&mut hash, value); } qcl_sha_bytes(hash)
}
fn qcl_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qcl_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qcl_degree_ok(rows) }
fn qcl_coefficients(states: &[QCLState; 8], quartic: QCLQuartic, endpoint: QCLEndpoint, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qcl_lengths(states); let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = qcl_values(&lengths, quartic, endpoint, Some(varying)); if literal_points && (point == 0 || point == 13) { assert_eq!(values, qcl_literal_values(&lengths)); literal_checks += 1; } for rank in 0..4 { samples[rank][point] = values[rank]; } }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qcl_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qcl_values(&lengths, quartic, endpoint, Some(varying)); if literal_points { assert_eq!(unseen, qcl_literal_values(&lengths)); literal_checks += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); } (baseline, shift, rows, literal_checks)
}
fn qcl_smoke_stream() {
    let quartics = qcl_quartics(); let roots = qcl_roots(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new(); let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize { let quartic = quartics[(sample * 104_729 + 3) % quartics.len()]; let root = roots[(sample * 17 + 23) % roots.len()]; let states = qcl_states(quartic, root);
        if !states.iter().any(|state| state.is_long) { let lengths = qcl_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order >= 28 { let values = qcl_values(&lengths, quartic, root.endpoint, None); finite.update(&qcl_finite_leaf(&states, order, &values)); finite_records += 1; } continue; }
        let (baseline, shift, rows, _) = qcl_coefficients(&states, quartic, root.endpoint, false); if !qcl_gate_ok(&rows) { gate_failures += 1; } coefficient.update(&qcl_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}
fn qcl_bench() {
    let quartics = qcl_quartics(); let roots = qcl_roots(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QCL_BENCH_RAYS { let quartic = quartics[(candidate * 104_729 + 5) % quartics.len()]; let root = roots[(candidate * 17 + 31) % roots.len()]; candidate += 1; let states = qcl_states(quartic, root); if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, _) = qcl_coefficients(&states, quartic, root.endpoint, false); stream.update(&qcl_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1;
    }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex()); println!("RESOURCE_TABLE_BYTES {} {}", quartics.len() * std::mem::size_of::<QCLQuartic>(), roots.len() * std::mem::size_of::<QCLRoot>()); println!("RESOURCE_FULL_LEAF_BYTES {}", 1_085_160_usize * 32);
}
fn qcl_compositions<F: FnMut(&[i32; 8])>(remaining: i32, slot: usize, current: &mut [i32; 8], callback: &mut F) {
    if slot == 7 { if remaining >= 1 { current[slot] = remaining; callback(current); } return; }
    let left = 8 - slot; for value in 1..=(remaining - left as i32 + 1) { current[slot] = value; qcl_compositions(remaining - value, slot + 1, current, callback); }
}
fn qcl_order27() {
    let mut count = 0_u64; let mut nonpositive = [0_u64; 4]; let mut literal_spots = 0_u64; let mut stream = AuditSha256::new(); let mut lengths = [0_i32; 8];
    qcl_compositions(26, 0, &mut lengths, &mut |row| { if !(row[2] <= row[3] && row[3] <= row[4] && row[6] <= row[7]) { return; } let (core, deleted) = qcl_formula_polynomials(row); let values = deltas03(&core, &deleted);
        for rank in 0..4 { if !values[rank].is_positive() { nonpositive[rank] += 1; } } if count % 4096 == 0 { assert_eq!(values, qcl_literal_values(row)); literal_spots += 1; } stream.update(&qcl_order27_leaf(row, &values)); count += 1;
    });
    assert_eq!(count, 70_854); assert_eq!(nonpositive, [0; 4]); assert_eq!(literal_spots, 18);
    let raw = format!("PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_ORDER27\nORDER27_COUNT {}\nNONPOSITIVE {} {} {} {}\nLITERAL_SPOTS {}\nVALUE_STREAM {}\n", count, nonpositive[0], nonpositive[1], nonpositive[2], nonpositive[3], literal_spots, stream.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_raw_agent_20260823.txt", raw.as_bytes()).expect("order27 raw write"); print!("{}", raw);
}
struct QCLResult { worker: usize, counts: [u64; 5], unseen: u64, literal_checks: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qcl_worker(worker: usize, quartics: Arc<Vec<QCLQuartic>>, roots: Arc<Vec<QCLRoot>>) -> QCLResult {
    let start = quartics.len() * worker / QCL_THREADS; let end = quartics.len() * (worker + 1) / QCL_THREADS; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new(); let mut checked_finite = false; let mut checked_ray = false;
    for quartic_index in start..end { let quartic = quartics[quartic_index]; for &root in roots.iter() { let states = qcl_states(quartic, root); let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 { counts[0] += 1; let lengths = qcl_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; } let values = qcl_values(&lengths, quartic, root.endpoint, None); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qcl_finite_leaf(&states, order, &values)); if !checked_finite { assert_eq!(values, qcl_literal_values(&lengths)); checked_finite = true; literal_checks += 1; } counts[1] += 1; continue; }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; } let (baseline, shift, rows, checked) = qcl_coefficients(&states, quartic, root.endpoint, !checked_ray); audit_assert_gate(&rows); if !checked_ray { checked_ray = true; literal_checks += checked; }
        coefficient_leaves.extend_from_slice(&qcl_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4;
    } }
    QCLResult { worker, counts, unseen, literal_checks, coefficient_leaves, finite_leaves }
}
fn qcl_full() {
    let quartics = Arc::new(qcl_quartics()); let roots = Arc::new(qcl_roots()); let mut handles = Vec::new();
    for worker in 0..QCL_THREADS { let a = Arc::clone(&quartics); let b = Arc::clone(&roots); handles.push(thread::spawn(move || qcl_worker(worker, a, b))); }
    let mut results: Vec<QCLResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect(); results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_checks += result.literal_checks; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [403_368, 284_304, 800_855, 1, 800_856]); assert_eq!(unseen, 3_203_424);
    let raw = format!(concat!("PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_CHECKS {}\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_checks, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("primary raw write"); print!("{}", raw);
}
fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() { Some("smoke") => { qcl_formula_smoke(); qcl_smoke_stream(); }, Some("bench") => qcl_bench(), Some("order27") => qcl_order27(), Some(value) => panic!("unknown mode {}", value), None => qcl_full() }
}
