// Six-thread checked-i256 producer for quartic_endpoint_cubic_path:quartic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QBP_THREADS: usize = 6;
const QBP_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)] struct QBPState { length: i32, is_long: bool }
#[derive(Clone, Copy)] struct QBPTransfer { free: V, blocked: V }
#[derive(Clone, Copy)] struct QBPFar {
    qm: QBPState, middle_pendant: QBPState, mc: QBPState,
    endpoint_low: QBPState, endpoint_high: QBPState,
    at_root: QBPTransfer,
}
#[derive(Clone, Copy)] struct QBPPrefix { low: QBPState, middle: QBPState, high: QBPState }

fn qbp_pendant(length: i32) -> QBPState { QBPState { length, is_long: length == 7 } }
fn qbp_spine(length: i32) -> QBPState { QBPState { length, is_long: length == 8 } }

fn qbp_cross(absent: V, present: V, length: i32) -> QBPTransfer {
    QBPTransfer {
        free: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        blocked: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}

fn qbp_far_parts(qm: i32, middle_pendant: i32, mc: i32, endpoint_low: i32, endpoint_high: i32) -> QBPTransfer {
    let endpoint_absent = mul(&path(endpoint_low), &path(endpoint_high));
    let endpoint_present = shifted(&mul(&path(endpoint_low - 1), &path(endpoint_high - 1)), 1);
    let at_middle = qbp_cross(endpoint_absent, endpoint_present, mc);
    let middle_absent = mul(&path(middle_pendant), &at_middle.free);
    let middle_present = shifted(&mul(&path(middle_pendant - 1), &at_middle.blocked), 1);
    qbp_cross(middle_absent, middle_present, qm)
}

fn qbp_fars() -> Vec<QBPFar> {
    let mut out = Vec::with_capacity(12_544);
    for endpoint_low in 1..=7_i32 {
        for endpoint_high in endpoint_low..=7_i32 {
            for mc in 1..=8_i32 {
                for middle_pendant in 1..=7_i32 {
                    for qm in 1..=8_i32 {
                        out.push(QBPFar {
                            qm: qbp_spine(qm), middle_pendant: qbp_pendant(middle_pendant), mc: qbp_spine(mc),
                            endpoint_low: qbp_pendant(endpoint_low), endpoint_high: qbp_pendant(endpoint_high),
                            at_root: qbp_far_parts(qm, middle_pendant, mc, endpoint_low, endpoint_high),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544); out
}

fn qbp_prefixes() -> Vec<QBPPrefix> {
    let mut out = Vec::with_capacity(84);
    for low in 1..=7_i32 { for middle in low..=7_i32 { for high in middle..=7_i32 {
        out.push(QBPPrefix { low: qbp_pendant(low), middle: qbp_pendant(middle), high: qbp_pendant(high) });
    } } }
    assert_eq!(out.len(), 84); out
}

fn qbp_states(prefix: QBPPrefix, far: QBPFar) -> [QBPState; 8] {
    [prefix.low, prefix.middle, prefix.high, far.qm, far.middle_pendant, far.mc, far.endpoint_low, far.endpoint_high]
}
fn qbp_lengths(states: &[QBPState; 8]) -> [i32; 8] { std::array::from_fn(|index| states[index].length) }

fn qbp_from_far(lengths: &[i32; 8], far: QBPTransfer) -> (V, V) {
    let deleted = product(&[path(lengths[0]), path(lengths[1]), path(lengths[2]), far.free]);
    let selected = shifted(&product(&[path(lengths[0] - 1), path(lengths[1] - 1), path(lengths[2] - 1), far.blocked]), 1);
    (add(&deleted, &selected), deleted)
}

fn qbp_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qbp_from_far(lengths, qbp_far_parts(lengths[3], lengths[4], lengths[5], lengths[6], lengths[7]))
}

fn qbp_values(lengths: &[i32; 8], far: QBPFar, varying: Option<usize>) -> [Z; 4] {
    let at_root = if varying.is_some_and(|index| index >= 3) {
        qbp_far_parts(lengths[3], lengths[4], lengths[5], lengths[6], lengths[7])
    } else { far.at_root };
    let (core, deleted) = qbp_from_far(lengths, at_root); deltas03(&core, &deleted)
}

fn qbp_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize; let mut adjacency = vec![Vec::new()];
    audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, root, lengths[1]);
    audit_attach(&mut adjacency, root, lengths[2]);
    let middle = audit_attach(&mut adjacency, root, lengths[3]);
    audit_attach(&mut adjacency, middle, lengths[4]);
    let endpoint = audit_attach(&mut adjacency, middle, lengths[5]);
    audit_attach(&mut adjacency, endpoint, lengths[6]);
    audit_attach(&mut adjacency, endpoint, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 4);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}
fn qbp_literal_values(lengths: &[i32; 8]) -> [Z; 4] { let (adjacency, root) = qbp_literal_tree(lengths); audit_deltas(&adjacency, root).0 }

fn qbp_formula_smoke() {
    let mut random = 0xA24BAED4963EE407_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths {
            random ^= random >> 12; random ^= random << 25; random ^= random >> 27; random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = qbp_formula_polynomials(&lengths);
        assert_eq!(deltas03(&core, &deleted), qbp_literal_values(&lengths), "endpoint quartic primary mismatch {}", sample);
    }
    println!("PASS_E5_ENDPOINT_QUARTIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn qbp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes()); let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32]; for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}
fn qbp_hash_state(hash: &mut AuditSha256, state: QBPState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn qbp_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }

fn qbp_coefficient_leaf(states: &[QBPState; 8], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-quartic-branch-coefficient-v1\0");
    for &state in states { qbp_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { qbp_hash_z(&mut hash, value); } } qbp_sha_bytes(hash)
}
fn qbp_finite_leaf(states: &[QBPState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"e5-quartic-endpoint-quartic-branch-finite-v1\0");
    for &state in states { qbp_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes()); for &value in values { qbp_hash_z(&mut hash, value); } qbp_sha_bytes(hash)
}
fn qbp_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES { if !rows[rank][power].is_zero() { return false; } } } true }
fn qbp_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool { for rank in 0..4 { if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; } for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } } } qbp_degree_ok(rows) }

fn qbp_coefficients(states: &[QBPState; 8], far: QBPFar, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected"); let mut lengths = qbp_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>(); let shift = (28 - baseline).max(0); let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4]; let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32; let values = qbp_values(&lengths, far, Some(varying));
        if literal_points && (point == 0 || point == 13) { assert_eq!(values, qbp_literal_values(&lengths)); literal_checks += 1; }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); assert!(qbp_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let unseen = qbp_values(&lengths, far, Some(varying));
    if literal_points { assert_eq!(unseen, qbp_literal_values(&lengths)); literal_checks += 1; }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn qbp_smoke_stream() {
    let prefixes = qbp_prefixes(); let fars = qbp_fars(); let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64; let mut ray_records = 0_u64; let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 17 + 3) % prefixes.len()]; let far = fars[(sample * 104_729 + 23) % fars.len()]; let states = qbp_states(prefix, far);
        if !states.iter().any(|state| state.is_long) {
            let lengths = qbp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 { let values = qbp_values(&lengths, far, None); finite.update(&qbp_finite_leaf(&states, order, &values)); finite_records += 1; }
            continue;
        }
        let (baseline, shift, rows, _) = qbp_coefficients(&states, far, false); if !qbp_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&qbp_coefficient_leaf(&states, baseline, shift, &rows)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_GATE_FAILURES {}", gate_failures); println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

fn qbp_bench() {
    let prefixes = qbp_prefixes(); let fars = qbp_fars(); let mut stream = AuditSha256::new(); let mut rays = 0_usize; let mut candidate = 0_usize;
    while rays < QBP_BENCH_RAYS {
        let prefix = prefixes[(candidate * 17 + 5) % prefixes.len()]; let far = fars[(candidate * 104_729 + 31) % fars.len()]; candidate += 1;
        let states = qbp_states(prefix, far); if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, _) = qbp_coefficients(&states, far, false); stream.update(&qbp_coefficient_leaf(&states, baseline, shift, &rows)); rays += 1;
    }
    println!("BENCH_RAYS {}", rays); println!("BENCH_STREAM {}", stream.hex());
    println!("RESOURCE_TABLE_BYTES {} {}", prefixes.len() * std::mem::size_of::<QBPPrefix>(), fars.len() * std::mem::size_of::<QBPFar>());
    println!("RESOURCE_FULL_LEAF_BYTES {}", 941_680_usize * 32);
}

struct QBPResult { worker: usize, counts: [u64; 5], unseen: u64, literal_checks: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }
fn qbp_worker(worker: usize, prefixes: Arc<Vec<QBPPrefix>>, fars: Arc<Vec<QBPFar>>) -> QBPResult {
    let start = prefixes.len() * worker / QBP_THREADS; let end = prefixes.len() * (worker + 1) / QBP_THREADS;
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    let mut checked_finite = false; let mut checked_ray = false;
    for prefix_index in start..end { let prefix = prefixes[prefix_index]; for &far in fars.iter() {
        let states = qbp_states(prefix, far); let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 {
            counts[0] += 1; let lengths = qbp_lengths(&states); let order = 1 + lengths.iter().sum::<i32>(); if order < 28 { continue; }
            let values = qbp_values(&lengths, far, None); assert!(values.iter().all(|value| value.is_positive())); finite_leaves.extend_from_slice(&qbp_finite_leaf(&states, order, &values));
            if !checked_finite { assert_eq!(values, qbp_literal_values(&lengths)); checked_finite = true; literal_checks += 1; } counts[1] += 1; continue;
        }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
        let (baseline, shift, rows, checked) = qbp_coefficients(&states, far, !checked_ray); audit_assert_gate(&rows);
        if !checked_ray { checked_ray = true; literal_checks += checked; }
        coefficient_leaves.extend_from_slice(&qbp_coefficient_leaf(&states, baseline, shift, &rows)); counts[4] += 1; unseen += 4;
    } }
    QBPResult { worker, counts, unseen, literal_checks, coefficient_leaves, finite_leaves }
}

fn qbp_full() {
    let prefixes = Arc::new(qbp_prefixes()); let fars = Arc::new(qbp_fars()); let mut handles = Vec::new();
    for worker in 0..QBP_THREADS { let a = Arc::clone(&prefixes); let b = Arc::clone(&fars); handles.push(thread::spawn(move || qbp_worker(worker, a, b))); }
    let mut results: Vec<QBPResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect(); results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64; let mut coefficient = AuditSha256::new(); let mut finite = AuditSha256::new();
    for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_checks += result.literal_checks; coefficient.update(&result.coefficient_leaves); finite.update(&result.finite_leaves); }
    assert_eq!(counts, [345_744, 233_728, 707_951, 1, 707_952]); assert_eq!(unseen, 2_831_808);
    let raw = format!(concat!("PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH\n", "COUNTS {} {} {} {} {}\n", "UNSEEN {}\n", "LITERAL_CHECKS {}\n", "COEFFICIENT_MERKLE_STREAM {}\n", "FINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_checks, coefficient.hex(), finite.hex());
    std::fs::write("rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("primary raw write"); print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() { Some("smoke") => { qbp_formula_smoke(); qbp_smoke_stream(); }, Some("bench") => qbp_bench(), Some(value) => panic!("unknown mode {}", value), None => qbp_full() }
}
