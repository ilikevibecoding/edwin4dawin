// Six-thread checked-i256 producer for five_cubic_t:center_middle_spine_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const CSI_THREADS: usize = 6;
const CSI_BOUNDS: [usize; 7] = [0, 4_535, 8_841, 13_080, 17_328, 21_448, 25_200];

#[derive(Clone, Copy)]
struct CSIState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct CSIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct CSIArm {
    spine: CSIState,
    low: CSIState,
    high: CSIState,
    message: CSIMessage,
}

#[derive(Clone, Copy)]
struct CSIPair {
    first: CSIArm,
    second: CSIArm,
    center_absent: V,
    center_present: V,
}

#[derive(Clone, Copy)]
struct CSIRight {
    center_gap: CSIState,
    middle_gap: CSIState,
    middle_leaf: CSIState,
    middle_outer: CSIState,
    outer_low: CSIState,
    outer_high: CSIState,
    right_side: CSIMessage,
}

#[derive(Clone, Copy)]
struct CSIFixed {
    moving_group: usize,
    other_arm: CSIMessage,
    center_absent: V,
    center_present: V,
    center_gap: i32,
    left_side: CSIMessage,
    middle_gap: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
    right_side: CSIMessage,
}

fn csi_pendant(value: i32) -> CSIState { CSIState { value, long: value == 7 } }
fn csi_spine(value: i32) -> CSIState { CSIState { value, long: value == 8 } }
fn csi_gap(value: i32) -> CSIState { CSIState { value, long: value == 7 } }

fn csi_edge(absent: V, present: V, distance: i32) -> CSIMessage {
    CSIMessage {
        free: add(&mul(&path(distance - 1), &absent), &mul(&path(distance - 2), &present)),
        blocked: add(&mul(&path(distance - 2), &absent), &mul(&path(distance - 3), &present)),
    }
}

fn csi_arm(spine: i32, low: i32, high: i32) -> CSIMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    csi_edge(absent, present, spine)
}

fn csi_left(center_absent: V, center_present: V, center_gap: i32) -> CSIMessage {
    csi_edge(center_absent, center_present, center_gap + 1)
}

fn csi_right(
    middle_gap: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> CSIMessage {
    let outer_absent = mul(&path(outer_low), &path(outer_high));
    let outer_present = shifted(&mul(&path(outer_low - 1), &path(outer_high - 1)), 1);
    let at_middle = csi_edge(outer_absent, outer_present, middle_outer);
    let middle_absent = mul(&path(middle_leaf), &at_middle.free);
    let middle_present = shifted(&mul(&path(middle_leaf - 1), &at_middle.blocked), 1);
    csi_edge(middle_absent, middle_present, middle_gap + 1)
}

fn csi_from_sides(left: CSIMessage, right: CSIMessage) -> (V, V) {
    let deleted = mul(&left.free, &right.free);
    let selected = shifted(&mul(&left.blocked, &right.blocked), 1);
    (add(&deleted, &selected), deleted)
}

fn csi_arms() -> Vec<CSIArm> {
    let mut table = Vec::with_capacity(224);
    for spine in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(CSIArm {
                    spine: csi_spine(spine),
                    low: csi_pendant(low),
                    high: csi_pendant(high),
                    message: csi_arm(spine, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn csi_pairs() -> Vec<CSIPair> {
    let arms = csi_arms();
    let mut table = Vec::with_capacity(25_200);
    for first in 0..arms.len() {
        for second in first..arms.len() {
            table.push(CSIPair {
                first: arms[first],
                second: arms[second],
                center_absent: mul(&arms[first].message.free, &arms[second].message.free),
                center_present: shifted(
                    &mul(&arms[first].message.blocked, &arms[second].message.blocked),
                    1,
                ),
            });
        }
    }
    assert_eq!(table.len(), 25_200);
    table
}

fn csi_rights() -> Vec<CSIRight> {
    let mut table = Vec::with_capacity(100_352);
    for center_gap in 0..=7_i32 {
        for middle_gap in 0..=7_i32 {
            for middle_leaf in 1..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for outer_low in 1..=7_i32 {
                        for outer_high in outer_low..=7_i32 {
                            table.push(CSIRight {
                                center_gap: csi_gap(center_gap),
                                middle_gap: csi_gap(middle_gap),
                                middle_leaf: csi_pendant(middle_leaf),
                                middle_outer: csi_spine(middle_outer),
                                outer_low: csi_pendant(outer_low),
                                outer_high: csi_pendant(outer_high),
                                right_side: csi_right(
                                    middle_gap, middle_leaf, middle_outer, outer_low, outer_high,
                                ),
                            });
                        }
                    }
                }
            }
        }
    }
    assert_eq!(table.len(), 100_352);
    table
}

fn csi_states(pair: CSIPair, right: CSIRight) -> [CSIState; 12] {
    [
        pair.first.spine, pair.first.low, pair.first.high,
        pair.second.spine, pair.second.low, pair.second.high,
        right.center_gap, right.middle_gap, right.middle_leaf,
        right.middle_outer, right.outer_low, right.outer_high,
    ]
}

fn csi_lengths(states: &[CSIState; 12]) -> [i32; 12] {
    std::array::from_fn(|index| states[index].value)
}

fn csi_formula_polynomials(lengths: &[i32; 12]) -> (V, V) {
    let first = csi_arm(lengths[0], lengths[1], lengths[2]);
    let second = csi_arm(lengths[3], lengths[4], lengths[5]);
    let center_absent = mul(&first.free, &second.free);
    let center_present = shifted(&mul(&first.blocked, &second.blocked), 1);
    let left = csi_left(center_absent, center_present, lengths[6]);
    let right = csi_right(lengths[7], lengths[8], lengths[9], lengths[10], lengths[11]);
    csi_from_sides(left, right)
}

fn csi_fixed(pair: CSIPair, right: CSIRight, varying: usize) -> CSIFixed {
    let left_side = csi_left(pair.center_absent, pair.center_present, right.center_gap.value);
    CSIFixed {
        moving_group: match varying {
            0..=2 => 0,
            3..=5 => 1,
            6 => 2,
            7 => 3,
            8 => 4,
            9 => 5,
            10 => 6,
            11 => 7,
            _ => unreachable!(),
        },
        other_arm: if varying < 3 { pair.second.message } else { pair.first.message },
        center_absent: pair.center_absent,
        center_present: pair.center_present,
        center_gap: right.center_gap.value,
        left_side,
        middle_gap: right.middle_gap.value,
        middle_leaf: right.middle_leaf.value,
        middle_outer: right.middle_outer.value,
        outer_low: right.outer_low.value,
        outer_high: right.outer_high.value,
        right_side: right.right_side,
    }
}

fn csi_values_with_fixed(lengths: &[i32; 12], fixed: CSIFixed) -> [Z; 4] {
    let (left, right) = match fixed.moving_group {
        0 => {
            let arm = csi_arm(lengths[0], lengths[1], lengths[2]);
            let absent = mul(&arm.free, &fixed.other_arm.free);
            let present = shifted(&mul(&arm.blocked, &fixed.other_arm.blocked), 1);
            (csi_left(absent, present, fixed.center_gap), fixed.right_side)
        }
        1 => {
            let arm = csi_arm(lengths[3], lengths[4], lengths[5]);
            let absent = mul(&fixed.other_arm.free, &arm.free);
            let present = shifted(&mul(&fixed.other_arm.blocked, &arm.blocked), 1);
            (csi_left(absent, present, fixed.center_gap), fixed.right_side)
        }
        2 => (
            csi_left(fixed.center_absent, fixed.center_present, lengths[6]),
            fixed.right_side,
        ),
        3 => (
            fixed.left_side,
            csi_right(lengths[7], fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, fixed.outer_high),
        ),
        4 => (
            fixed.left_side,
            csi_right(fixed.middle_gap, lengths[8], fixed.middle_outer, fixed.outer_low, fixed.outer_high),
        ),
        5 => (
            fixed.left_side,
            csi_right(fixed.middle_gap, fixed.middle_leaf, lengths[9], fixed.outer_low, fixed.outer_high),
        ),
        6 => (
            fixed.left_side,
            csi_right(fixed.middle_gap, fixed.middle_leaf, fixed.middle_outer, lengths[10], fixed.outer_high),
        ),
        7 => (
            fixed.left_side,
            csi_right(fixed.middle_gap, fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, lengths[11]),
        ),
        _ => unreachable!(),
    };
    let (whole, deleted) = csi_from_sides(left, right);
    deltas03(&whole, &deleted)
}

fn csi_values(
    lengths: &[i32; 12],
    pair: CSIPair,
    right: CSIRight,
    varying: Option<usize>,
) -> [Z; 4] {
    if let Some(index) = varying {
        return csi_values_with_fixed(lengths, csi_fixed(pair, right, index));
    }
    let (whole, deleted) = csi_formula_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn csi_literal_tree(lengths: &[i32; 12]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let center = audit_attach(&mut adjacency, root, lengths[6] + 1);
    let first = audit_attach(&mut adjacency, center, lengths[0]);
    audit_attach(&mut adjacency, first, lengths[1]);
    audit_attach(&mut adjacency, first, lengths[2]);
    let second = audit_attach(&mut adjacency, center, lengths[3]);
    audit_attach(&mut adjacency, second, lengths[4]);
    audit_attach(&mut adjacency, second, lengths[5]);
    let middle = audit_attach(&mut adjacency, root, lengths[7] + 1);
    audit_attach(&mut adjacency, middle, lengths[8]);
    let outer = audit_attach(&mut adjacency, middle, lengths[9]);
    audit_attach(&mut adjacency, outer, lengths[10]);
    audit_attach(&mut adjacency, outer, lengths[11]);
    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn csi_literal_values(lengths: &[i32; 12]) -> [Z; 4] {
    let (adjacency, root) = csi_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn csi_formula_smoke() {
    let mut random = 0xA48D21F7C5936BE0_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 12];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 6 || index == 7 {
                (random % 23) as i32
            } else {
                1 + (random % 23) as i32
            };
        }
        let (whole, deleted) = csi_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&whole, &deleted),
            csi_literal_values(&lengths),
            "center-middle-spine-internal mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_FIVE_CUBIC_T_CENTER_MIDDLE_SPINE_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn csi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow");
    hash.buffer[hash.used] = 0x80;
    hash.used += 1;
    if hash.used > 56 {
        for index in hash.used..64 { hash.buffer[index] = 0; }
        let block = hash.buffer;
        hash.block(&block);
        hash.buffer = [0; 64];
        hash.used = 0;
    }
    for index in hash.used..56 { hash.buffer[index] = 0; }
    hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block = hash.buffer;
    hash.block(&block);
    let mut out = [0_u8; 32];
    for index in 0..8 {
        out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes());
    }
    out
}

fn csi_hash_state(hash: &mut AuditSha256, state: CSIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn csi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn csi_coefficient_leaf(
    states: &[CSIState; 12],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-middle-spine-internal-coefficient-v1\0");
    for &state in states { csi_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { csi_hash_z(&mut hash, value); } }
    csi_sha_bytes(hash)
}

fn csi_finite_leaf(states: &[CSIState; 12], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-middle-spine-internal-finite-v1\0");
    for &state in states { csi_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { csi_hash_z(&mut hash, value); }
    csi_sha_bytes(hash)
}

fn csi_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn csi_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    csi_degree_ok(rows)
}

fn csi_coefficients(
    states: &[CSIState; 12],
    pair: CSIPair,
    right: CSIRight,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.long).expect("ray expected");
    let fixed = csi_fixed(pair, right, varying);
    let mut lengths = csi_lengths(states);
    let baseline = 3 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = csi_values_with_fixed(&lengths, fixed);
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, csi_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(csi_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = csi_values_with_fixed(&lengths, fixed);
    if literal_points {
        assert_eq!(unseen, csi_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn csi_smoke_stream() {
    let pairs = csi_pairs();
    let rights = csi_rights();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let right = rights[(sample * 104_729 + 23) % rights.len()];
        let states = csi_states(pair, right);
        if !states.iter().any(|state| state.long) {
            let lengths = csi_lengths(&states);
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = csi_values(&lengths, pair, right, None);
                finite.update(&csi_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = csi_coefficients(&states, pair, right, false);
        if !csi_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&csi_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct CSIResult {
    worker: usize,
    start: usize,
    end: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_checks: u64,
    coefficient_records: u64,
    finite_records: u64,
    coefficient_digest: [u8; 32],
    finite_digest: [u8; 32],
}

fn csi_worker(
    worker: usize,
    pairs: Arc<Vec<CSIPair>>,
    rights: Arc<Vec<CSIRight>>,
) -> CSIResult {
    let start = CSI_BOUNDS[worker];
    let end = CSI_BOUNDS[worker + 1];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_records = 0_u64;
    let mut finite_records = 0_u64;
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut checked_finite = false;
    let mut checked_ray = false;
    for pair_index in start..end {
        let pair = pairs[pair_index];
        for &right in rights.iter() {
            let states = csi_states(pair, right);
            let long_count = states.iter().filter(|state| state.long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = csi_lengths(&states);
                let order = 3 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = csi_values(&lengths, pair, right, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite.update(&csi_finite_leaf(&states, order, &values));
                finite_records += 1;
                if !checked_finite {
                    assert_eq!(values, csi_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 12 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) =
                csi_coefficients(&states, pair, right, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient.update(&csi_coefficient_leaf(&states, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert!(checked_finite && checked_ray);
    CSIResult {
        worker, start, end, counts, unseen, literal_checks,
        coefficient_records, finite_records,
        coefficient_digest: csi_sha_bytes(coefficient),
        finite_digest: csi_sha_bytes(finite),
    }
}

fn csi_root_stream(results: &[CSIResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-center-middle-spine-internal-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-center-middle-spine-internal-finite-six-shard-root-v1\0"
    });
    for result in results {
        hash.update(&(result.worker as u64).to_le_bytes());
        hash.update(&(result.start as u64).to_le_bytes());
        hash.update(&(result.end as u64).to_le_bytes());
        if coefficient {
            hash.update(&result.coefficient_records.to_le_bytes());
            hash.update(&result.coefficient_digest);
        } else {
            hash.update(&result.finite_records.to_le_bytes());
            hash.update(&result.finite_digest);
        }
    }
    hash.hex()
}

fn csi_full() {
    let pairs = Arc::new(csi_pairs());
    let rights = Arc::new(csi_rights());
    let mut handles = Vec::new();
    for worker in 0..CSI_THREADS {
        let pair_table = Arc::clone(&pairs);
        let right_table = Arc::clone(&rights);
        handles.push(thread::spawn(move || csi_worker(worker, pair_table, right_table)));
    }
    let mut results: Vec<CSIResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("primary worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, CSI_BOUNDS[worker]);
        assert_eq!(result.end, CSI_BOUNDS[worker + 1]);
        if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
    }
    assert_eq!(results.first().unwrap().start, 0);
    assert_eq!(results.last().unwrap().end, pairs.len());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    for result in &results {
        for index in 0..5 { counts[index] += result.counts[index]; }
        unseen += result.unseen;
        literal_checks += result.literal_checks;
    }
    assert_eq!(counts, [470_125_404, 468_960_977, 2_058_744_995, 1, 2_058_744_996]);
    assert_eq!(unseen, 8_234_979_984);
    assert_eq!(literal_checks, 24);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = csi_root_stream(&results, true);
    let finite_stream = csi_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_CENTER_MIDDLE_SPINE_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_stream, finite_stream,
    );
    std::fs::write(
        "rank8_delta03_e5_five_cubic_t_center_middle_spine_internal_i256_raw_agent_20260824.txt",
        raw.as_bytes(),
    ).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { csi_formula_smoke(); csi_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => csi_full(),
    }
}
