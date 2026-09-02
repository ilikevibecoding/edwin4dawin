// Six-thread checked-i256 producer for five_cubic_t:middle_long_outer_spine_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MLI_THREADS: usize = 6;
const MLI_BOUNDS: [usize; 7] = [0, 4_535, 8_841, 13_080, 17_328, 21_448, 25_200];

#[derive(Clone, Copy)] struct MLIState { value: i32, long: bool }
#[derive(Clone, Copy)] struct MLIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct MLIArm { spine: MLIState, low: MLIState, high: MLIState, message: MLIMessage }

#[derive(Clone, Copy)]
struct MLIPair {
    first: MLIArm,
    second: MLIArm,
    center_absent: V,
    center_present: V,
}

#[derive(Clone, Copy)]
struct MLIFar {
    center_middle: MLIState,
    middle_leaf: MLIState,
    middle_gap: MLIState,
    outer_gap: MLIState,
    outer_low: MLIState,
    outer_high: MLIState,
    right_message: MLIMessage,
}

#[derive(Clone, Copy)]
struct MLIFixed {
    moving_group: usize,
    other_arm: MLIMessage,
    center_absent: V,
    center_present: V,
    center_middle: i32,
    middle_leaf: i32,
    middle_gap: i32,
    left_message: MLIMessage,
    outer_gap: i32,
    outer_low: i32,
    outer_high: i32,
    right_message: MLIMessage,
}

fn mli_pendant(value: i32) -> MLIState { MLIState { value, long: value == 7 } }
fn mli_spine(value: i32) -> MLIState { MLIState { value, long: value == 8 } }
fn mli_gap(value: i32) -> MLIState { MLIState { value, long: value == 7 } }

fn mli_edge(absent: V, present: V, distance: i32) -> MLIMessage {
    MLIMessage {
        free: add(&mul(&path(distance - 1), &absent), &mul(&path(distance - 2), &present)),
        blocked: add(&mul(&path(distance - 2), &absent), &mul(&path(distance - 3), &present)),
    }
}

fn mli_arm(spine: i32, low: i32, high: i32) -> MLIMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    mli_edge(absent, present, spine)
}

fn mli_left(
    center_absent: V,
    center_present: V,
    center_middle: i32,
    middle_leaf: i32,
    middle_gap: i32,
) -> MLIMessage {
    let at_middle = mli_edge(center_absent, center_present, center_middle);
    let middle_absent = mul(&at_middle.free, &path(middle_leaf));
    let middle_present = shifted(&mul(&at_middle.blocked, &path(middle_leaf - 1)), 1);
    mli_edge(middle_absent, middle_present, middle_gap + 1)
}

fn mli_right(outer_gap: i32, low: i32, high: i32) -> MLIMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    mli_edge(absent, present, outer_gap + 1)
}

fn mli_from_sides(left: MLIMessage, right: MLIMessage) -> (V, V) {
    let deleted = mul(&left.free, &right.free);
    let selected = shifted(&mul(&left.blocked, &right.blocked), 1);
    (add(&deleted, &selected), deleted)
}

fn mli_arms() -> Vec<MLIArm> {
    let mut table = Vec::with_capacity(224);
    for spine in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(MLIArm {
                    spine: mli_spine(spine),
                    low: mli_pendant(low),
                    high: mli_pendant(high),
                    message: mli_arm(spine, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn mli_pairs() -> Vec<MLIPair> {
    let arms = mli_arms();
    let mut table = Vec::with_capacity(25_200);
    for first in 0..arms.len() {
        for second in first..arms.len() {
            table.push(MLIPair {
                first: arms[first],
                second: arms[second],
                center_absent: mul(&arms[first].message.free, &arms[second].message.free),
                center_present: shifted(&mul(&arms[first].message.blocked, &arms[second].message.blocked), 1),
            });
        }
    }
    assert_eq!(table.len(), 25_200);
    table
}

fn mli_fars() -> Vec<MLIFar> {
    let mut table = Vec::with_capacity(100_352);
    for middle_gap in 0..=7_i32 {
        for outer_gap in 0..=7_i32 {
            for center_middle in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for outer_low in 1..=7_i32 {
                        for outer_high in outer_low..=7_i32 {
                            table.push(MLIFar {
                                center_middle: mli_spine(center_middle),
                                middle_leaf: mli_pendant(middle_leaf),
                                middle_gap: mli_gap(middle_gap),
                                outer_gap: mli_gap(outer_gap),
                                outer_low: mli_pendant(outer_low),
                                outer_high: mli_pendant(outer_high),
                                right_message: mli_right(outer_gap, outer_low, outer_high),
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

fn mli_states(pair: MLIPair, far: MLIFar) -> [MLIState; 12] {
    [
        pair.first.spine, pair.first.low, pair.first.high,
        pair.second.spine, pair.second.low, pair.second.high,
        far.center_middle, far.middle_leaf, far.middle_gap,
        far.outer_gap, far.outer_low, far.outer_high,
    ]
}

fn mli_lengths(states: &[MLIState; 12]) -> [i32; 12] {
    std::array::from_fn(|index| states[index].value)
}

fn mli_formula_polynomials(lengths: &[i32; 12]) -> (V, V) {
    let first = mli_arm(lengths[0], lengths[1], lengths[2]);
    let second = mli_arm(lengths[3], lengths[4], lengths[5]);
    let center_absent = mul(&first.free, &second.free);
    let center_present = shifted(&mul(&first.blocked, &second.blocked), 1);
    let left = mli_left(center_absent, center_present, lengths[6], lengths[7], lengths[8]);
    let right = mli_right(lengths[9], lengths[10], lengths[11]);
    mli_from_sides(left, right)
}

fn mli_fixed(pair: MLIPair, far: MLIFar, varying: usize) -> MLIFixed {
    MLIFixed {
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
        center_middle: far.center_middle.value,
        middle_leaf: far.middle_leaf.value,
        middle_gap: far.middle_gap.value,
        left_message: mli_left(
            pair.center_absent, pair.center_present,
            far.center_middle.value, far.middle_leaf.value, far.middle_gap.value,
        ),
        outer_gap: far.outer_gap.value,
        outer_low: far.outer_low.value,
        outer_high: far.outer_high.value,
        right_message: far.right_message,
    }
}

fn mli_values_with_fixed(lengths: &[i32; 12], fixed: MLIFixed) -> [Z; 4] {
    let (left, right) = match fixed.moving_group {
        0 => {
            let arm = mli_arm(lengths[0], lengths[1], lengths[2]);
            let absent = mul(&arm.free, &fixed.other_arm.free);
            let present = shifted(&mul(&arm.blocked, &fixed.other_arm.blocked), 1);
            (
                mli_left(absent, present, fixed.center_middle, fixed.middle_leaf, fixed.middle_gap),
                fixed.right_message,
            )
        }
        1 => {
            let arm = mli_arm(lengths[3], lengths[4], lengths[5]);
            let absent = mul(&fixed.other_arm.free, &arm.free);
            let present = shifted(&mul(&fixed.other_arm.blocked, &arm.blocked), 1);
            (
                mli_left(absent, present, fixed.center_middle, fixed.middle_leaf, fixed.middle_gap),
                fixed.right_message,
            )
        }
        2 => (
            mli_left(fixed.center_absent, fixed.center_present, lengths[6], fixed.middle_leaf, fixed.middle_gap),
            fixed.right_message,
        ),
        3 => (
            mli_left(fixed.center_absent, fixed.center_present, fixed.center_middle, lengths[7], fixed.middle_gap),
            fixed.right_message,
        ),
        4 => (
            mli_left(fixed.center_absent, fixed.center_present, fixed.center_middle, fixed.middle_leaf, lengths[8]),
            fixed.right_message,
        ),
        5 => (fixed.left_message, mli_right(lengths[9], fixed.outer_low, fixed.outer_high)),
        6 => (fixed.left_message, mli_right(fixed.outer_gap, lengths[10], fixed.outer_high)),
        7 => (fixed.left_message, mli_right(fixed.outer_gap, fixed.outer_low, lengths[11])),
        _ => unreachable!(),
    };
    let (whole, deleted) = mli_from_sides(left, right);
    deltas03(&whole, &deleted)
}

fn mli_values(lengths: &[i32; 12], pair: MLIPair, far: MLIFar, varying: Option<usize>) -> [Z; 4] {
    if let Some(index) = varying {
        return mli_values_with_fixed(lengths, mli_fixed(pair, far, index));
    }
    let (whole, deleted) = mli_formula_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn mli_literal_tree(lengths: &[i32; 12]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let middle = audit_attach(&mut adjacency, root, lengths[8] + 1);
    let center = audit_attach(&mut adjacency, middle, lengths[6]);
    let first = audit_attach(&mut adjacency, center, lengths[0]);
    audit_attach(&mut adjacency, first, lengths[1]);
    audit_attach(&mut adjacency, first, lengths[2]);
    let second = audit_attach(&mut adjacency, center, lengths[3]);
    audit_attach(&mut adjacency, second, lengths[4]);
    audit_attach(&mut adjacency, second, lengths[5]);
    audit_attach(&mut adjacency, middle, lengths[7]);
    let outer = audit_attach(&mut adjacency, root, lengths[9] + 1);
    audit_attach(&mut adjacency, outer, lengths[10]);
    audit_attach(&mut adjacency, outer, lengths[11]);
    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn mli_literal_values(lengths: &[i32; 12]) -> [Z; 4] {
    let (adjacency, root) = mli_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn mli_formula_smoke() {
    let mut random = 0x2FC7A19D854E603B_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 12];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 8 || index == 9 { (random % 23) as i32 } else { 1 + (random % 23) as i32 };
        }
        let (whole, deleted) = mli_formula_polynomials(&lengths);
        assert_eq!(deltas03(&whole, &deleted), mli_literal_values(&lengths), "middle-long-outer-spine mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_MIDDLE_LONG_OUTER_SPINE_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn mli_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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
    for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); }
    out
}

fn mli_hash_state(hash: &mut AuditSha256, state: MLIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn mli_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn mli_coefficient_leaf(states: &[MLIState; 12], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-middle-long-outer-spine-internal-coefficient-v1\0");
    for &state in states { mli_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { mli_hash_z(&mut hash, value); } }
    mli_sha_bytes(hash)
}

fn mli_finite_leaf(states: &[MLIState; 12], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-middle-long-outer-spine-internal-finite-v1\0");
    for &state in states { mli_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { mli_hash_z(&mut hash, value); }
    mli_sha_bytes(hash)
}

fn mli_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn mli_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } }
    }
    mli_degree_ok(rows)
}

fn mli_coefficients(
    states: &[MLIState; 12],
    pair: MLIPair,
    far: MLIFar,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.long).expect("ray expected");
    let fixed = mli_fixed(pair, far, varying);
    let mut lengths = mli_lengths(states);
    let baseline = 3 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = mli_values_with_fixed(&lengths, fixed);
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, mli_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(mli_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = mli_values_with_fixed(&lengths, fixed);
    if literal_points {
        assert_eq!(unseen, mli_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn mli_smoke_stream() {
    let pairs = mli_pairs();
    let fars = mli_fars();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let far = fars[(sample * 104_729 + 23) % fars.len()];
        let states = mli_states(pair, far);
        if !states.iter().any(|state| state.long) {
            let lengths = mli_lengths(&states);
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = mli_values(&lengths, pair, far, None);
                finite.update(&mli_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = mli_coefficients(&states, pair, far, false);
        if !mli_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&mli_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct MLIResult {
    worker: usize, start: usize, end: usize, counts: [u64; 5], unseen: u64,
    literal_checks: u64, coefficient_records: u64, finite_records: u64,
    coefficient_digest: [u8; 32], finite_digest: [u8; 32],
}

fn mli_worker(worker: usize, pairs: Arc<Vec<MLIPair>>, fars: Arc<Vec<MLIFar>>) -> MLIResult {
    let start = MLI_BOUNDS[worker];
    let end = MLI_BOUNDS[worker + 1];
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
        for &far in fars.iter() {
            let states = mli_states(pair, far);
            let long_count = states.iter().filter(|state| state.long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = mli_lengths(&states);
                let order = 3 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = mli_values(&lengths, pair, far, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite.update(&mli_finite_leaf(&states, order, &values));
                finite_records += 1;
                if !checked_finite {
                    assert_eq!(values, mli_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 12 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) = mli_coefficients(&states, pair, far, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient.update(&mli_coefficient_leaf(&states, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert!(checked_finite && checked_ray);
    MLIResult {
        worker, start, end, counts, unseen, literal_checks, coefficient_records, finite_records,
        coefficient_digest: mli_sha_bytes(coefficient), finite_digest: mli_sha_bytes(finite),
    }
}

fn mli_root_stream(results: &[MLIResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-middle-long-outer-spine-internal-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-middle-long-outer-spine-internal-finite-six-shard-root-v1\0"
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

fn mli_full() {
    let pairs = Arc::new(mli_pairs());
    let fars = Arc::new(mli_fars());
    let mut handles = Vec::new();
    for worker in 0..MLI_THREADS {
        let pair_table = Arc::clone(&pairs);
        let far_table = Arc::clone(&fars);
        handles.push(thread::spawn(move || mli_worker(worker, pair_table, far_table)));
    }
    let mut results: Vec<MLIResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, MLI_BOUNDS[worker]);
        assert_eq!(result.end, MLI_BOUNDS[worker + 1]);
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
    let coefficient_stream = mli_root_stream(&results, true);
    let finite_stream = mli_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_MIDDLE_LONG_OUTER_SPINE_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_stream, finite_stream,
    );
    std::fs::write("rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_i256_raw_agent_20260824.txt", raw.as_bytes()).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { mli_formula_smoke(); mli_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => mli_full(),
    }
}
