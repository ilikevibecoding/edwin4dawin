// Six-thread checked-i256 producer for five_cubic_t:center_short_outer_spine_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MLI_THREADS: usize = 6;
const MLI_BOUNDS: [usize; 7] = [0, 9_028, 17_546, 25_976, 34_413, 42_885, 50_176];

#[derive(Clone, Copy)] struct MLIState { value: i32, long: bool }
#[derive(Clone, Copy)] struct MLIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct MLIArm { spine: MLIState, low: MLIState, high: MLIState, message: MLIMessage }

#[derive(Clone, Copy)]
struct MLIPair {
    selected_low: MLIState,
    selected_high: MLIState,
    other: MLIArm,
    center_gap: MLIState,
    selected_absent: V,
    selected_present: V,
}

#[derive(Clone, Copy)]
struct MLIFar {
    outer_gap: MLIState,
    center_middle: MLIState,
    middle_leaf: MLIState,
    middle_outer: MLIState,
    long_low: MLIState,
    long_high: MLIState,
    long_message: MLIMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MLIMessage,
}

#[derive(Clone, Copy)]
struct MLIFixed {
    moving_group: usize,
    selected_absent: V,
    selected_present: V,
    selected_side: MLIMessage,
    other_message: MLIMessage,
    center_gap: i32,
    center_absent: V,
    center_present: V,
    center_side: MLIMessage,
    outer_gap: i32,
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    long_low: i32,
    long_high: i32,
    long_message: MLIMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MLIMessage,
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

fn mli_branch_parts(low: i32, high: i32) -> (V, V) {
    (
        mul(&path(low), &path(high)),
        shifted(&mul(&path(low - 1), &path(high - 1)), 1),
    )
}

fn mli_middle_parts(middle_leaf: i32, long_message: MLIMessage) -> (V, V) {
    (
        mul(&path(middle_leaf), &long_message.free),
        shifted(&mul(&path(middle_leaf - 1), &long_message.blocked), 1),
    )
}

fn mli_middle(center_middle: i32, middle_leaf: i32, long_message: MLIMessage) -> MLIMessage {
    let (absent, present) = mli_middle_parts(middle_leaf, long_message);
    mli_edge(absent, present, center_middle)
}

fn mli_center_parts(other: MLIMessage, middle: MLIMessage) -> (V, V) {
    (
        mul(&other.free, &middle.free),
        shifted(&mul(&other.blocked, &middle.blocked), 1),
    )
}

fn mli_center(center_gap: i32, other: MLIMessage, middle: MLIMessage) -> MLIMessage {
    let (absent, present) = mli_center_parts(other, middle);
    mli_edge(absent, present, center_gap + 1)
}

fn mli_selected(outer_gap: i32, low: i32, high: i32) -> MLIMessage {
    let (absent, present) = mli_branch_parts(low, high);
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
    let mut table = Vec::with_capacity(50_176);
    for selected_low in 1..=7_i32 {
        for selected_high in selected_low..=7_i32 {
            let (selected_absent, selected_present) = mli_branch_parts(selected_low, selected_high);
            for &other in &arms {
                for center_gap in 0..=7_i32 {
                    table.push(MLIPair {
                        selected_low: mli_pendant(selected_low),
                        selected_high: mli_pendant(selected_high),
                        other,
                        center_gap: mli_gap(center_gap),
                        selected_absent,
                        selected_present,
                    });
                }
            }
        }
    }
    assert_eq!(table.len(), 50_176);
    table
}

fn mli_fars() -> Vec<MLIFar> {
    let mut table = Vec::with_capacity(100_352);
    for outer_gap in 0..=7_i32 {
        for center_middle in 1..=8_i32 {
            for middle_leaf in 1..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for long_low in 1..=7_i32 {
                        for long_high in long_low..=7_i32 {
                            let long_message = mli_arm(middle_outer, long_low, long_high);
                            let (middle_absent, middle_present) = mli_middle_parts(middle_leaf, long_message);
                            table.push(MLIFar {
                                outer_gap: mli_gap(outer_gap),
                                center_middle: mli_spine(center_middle),
                                middle_leaf: mli_pendant(middle_leaf),
                                middle_outer: mli_spine(middle_outer),
                                long_low: mli_pendant(long_low),
                                long_high: mli_pendant(long_high),
                                long_message,
                                middle_absent,
                                middle_present,
                                middle_message: mli_edge(middle_absent, middle_present, center_middle),
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
        pair.selected_low, pair.selected_high,
        pair.other.spine, pair.other.low, pair.other.high,
        pair.center_gap, far.outer_gap,
        far.center_middle, far.middle_leaf, far.middle_outer,
        far.long_low, far.long_high,
    ]
}

fn mli_lengths(states: &[MLIState; 12]) -> [i32; 12] {
    std::array::from_fn(|index| states[index].value)
}

fn mli_formula_polynomials(lengths: &[i32; 12]) -> (V, V) {
    let selected = mli_selected(lengths[6], lengths[0], lengths[1]);
    let other = mli_arm(lengths[2], lengths[3], lengths[4]);
    let long_message = mli_arm(lengths[9], lengths[10], lengths[11]);
    let middle = mli_middle(lengths[7], lengths[8], long_message);
    let center = mli_center(lengths[5], other, middle);
    mli_from_sides(selected, center)
}

fn mli_fixed(pair: MLIPair, far: MLIFar, varying: usize) -> MLIFixed {
    let selected_side = mli_edge(pair.selected_absent, pair.selected_present, far.outer_gap.value + 1);
    let (center_absent, center_present) = mli_center_parts(pair.other.message, far.middle_message);
    MLIFixed {
        moving_group: match varying {
            0..=1 => 0,
            2..=4 => 1,
            5 => 2,
            6 => 3,
            7 => 4,
            8 => 5,
            9 => 6,
            10..=11 => 7,
            _ => unreachable!(),
        },
        selected_absent: pair.selected_absent,
        selected_present: pair.selected_present,
        selected_side,
        other_message: pair.other.message,
        center_gap: pair.center_gap.value,
        center_absent,
        center_present,
        center_side: mli_edge(center_absent, center_present, pair.center_gap.value + 1),
        outer_gap: far.outer_gap.value,
        center_middle: far.center_middle.value,
        middle_leaf: far.middle_leaf.value,
        middle_outer: far.middle_outer.value,
        long_low: far.long_low.value,
        long_high: far.long_high.value,
        long_message: far.long_message,
        middle_absent: far.middle_absent,
        middle_present: far.middle_present,
        middle_message: far.middle_message,
    }
}

fn mli_values_with_fixed(lengths: &[i32; 12], fixed: MLIFixed) -> [Z; 4] {
    let (selected, center) = match fixed.moving_group {
        0 => (mli_selected(fixed.outer_gap, lengths[0], lengths[1]), fixed.center_side),
        1 => (
            fixed.selected_side,
            mli_center(
                fixed.center_gap,
                mli_arm(lengths[2], lengths[3], lengths[4]),
                fixed.middle_message,
            ),
        ),
        2 => (
            fixed.selected_side,
            mli_edge(fixed.center_absent, fixed.center_present, lengths[5] + 1),
        ),
        3 => (
            mli_edge(fixed.selected_absent, fixed.selected_present, lengths[6] + 1),
            fixed.center_side,
        ),
        4 => (
            fixed.selected_side,
            mli_center(
                fixed.center_gap,
                fixed.other_message,
                mli_edge(fixed.middle_absent, fixed.middle_present, lengths[7]),
            ),
        ),
        5 => (
            fixed.selected_side,
            mli_center(
                fixed.center_gap,
                fixed.other_message,
                mli_middle(fixed.center_middle, lengths[8], fixed.long_message),
            ),
        ),
        6 => (
            fixed.selected_side,
            mli_center(
                fixed.center_gap,
                fixed.other_message,
                mli_middle(
                    fixed.center_middle,
                    fixed.middle_leaf,
                    mli_arm(lengths[9], fixed.long_low, fixed.long_high),
                ),
            ),
        ),
        7 => (
            fixed.selected_side,
            mli_center(
                fixed.center_gap,
                fixed.other_message,
                mli_middle(
                    fixed.center_middle,
                    fixed.middle_leaf,
                    mli_arm(fixed.middle_outer, lengths[10], lengths[11]),
                ),
            ),
        ),
        _ => unreachable!(),
    };
    let (whole, deleted) = mli_from_sides(selected, center);
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
    let selected_outer = audit_attach(&mut adjacency, root, lengths[6] + 1);
    audit_attach(&mut adjacency, selected_outer, lengths[0]);
    audit_attach(&mut adjacency, selected_outer, lengths[1]);
    let center = audit_attach(&mut adjacency, root, lengths[5] + 1);
    let other_outer = audit_attach(&mut adjacency, center, lengths[2]);
    audit_attach(&mut adjacency, other_outer, lengths[3]);
    audit_attach(&mut adjacency, other_outer, lengths[4]);
    let middle = audit_attach(&mut adjacency, center, lengths[7]);
    audit_attach(&mut adjacency, middle, lengths[8]);
    let long_outer = audit_attach(&mut adjacency, middle, lengths[9]);
    audit_attach(&mut adjacency, long_outer, lengths[10]);
    audit_attach(&mut adjacency, long_outer, lengths[11]);
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
    let mut random = 0xA17E4C932D68B5F0_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 12];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 5 || index == 6 { (random % 23) as i32 } else { 1 + (random % 23) as i32 };
        }
        let (whole, deleted) = mli_formula_polynomials(&lengths);
        assert_eq!(deltas03(&whole, &deleted), mli_literal_values(&lengths), "center-short-outer-spine mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE");
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
    hash.update(b"e5-five-cubic-t-center-short-outer-spine-internal-coefficient-v1\0");
    for &state in states { mli_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { mli_hash_z(&mut hash, value); } }
    mli_sha_bytes(hash)
}

fn mli_finite_leaf(states: &[MLIState; 12], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-short-outer-spine-internal-finite-v1\0");
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
        b"e5-five-cubic-t-center-short-outer-spine-internal-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-center-short-outer-spine-internal-finite-six-shard-root-v1\0"
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
    assert_eq!(counts, [933_897_762, 931_636_700, 4_101_364_189, 1, 4_101_364_190]);
    assert_eq!(unseen, 16_405_456_760);
    assert_eq!(literal_checks, 24);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = mli_root_stream(&results, true);
    let finite_stream = mli_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_stream, finite_stream,
    );
    std::fs::write("rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_i256_raw_agent_20260824.txt", raw.as_bytes()).expect("primary raw write");
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
