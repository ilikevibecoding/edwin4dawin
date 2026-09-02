// Six-thread checked-i256 producer for five_cubic_t:short_outer_pendant_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MPI_THREADS: usize = 6;
const MPI_BOUNDS: [usize; 7] = [0, 15_344, 30_598, 45_374, 60_681, 75_744, 87_808];

#[derive(Clone, Copy)] struct MPIState { value: i32, long: bool }
#[derive(Clone, Copy)] struct MPIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct MPIArm { spine: MPIState, low: MPIState, high: MPIState, message: MPIMessage }

#[derive(Clone, Copy)]
struct MPIPair {
    near_gap: MPIState,
    tail: MPIState,
    other_pendant: MPIState,
    other_arm: MPIArm,
    tail_message: MPIMessage,
}

#[derive(Clone, Copy)]
struct MPIFar {
    selected_spine: MPIState,
    center_middle: MPIState,
    middle_leaf: MPIState,
    middle_outer: MPIState,
    long_low: MPIState,
    long_high: MPIState,
    long_message: MPIMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MPIMessage,
}

#[derive(Clone, Copy)]
struct MPIFixed {
    moving_group: usize,
    near_gap: i32,
    tail: i32,
    other_pendant: i32,
    selected_spine: i32,
    other_message: MPIMessage,
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    long_low: i32,
    long_high: i32,
    long_message: MPIMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MPIMessage,
    center_absent: V,
    center_present: V,
    center_message: MPIMessage,
    selected_absent: V,
    selected_present: V,
    core_message: MPIMessage,
    tail_message: MPIMessage,
}

fn mpi_pendant(value: i32) -> MPIState { MPIState { value, long: value == 7 } }
fn mpi_spine(value: i32) -> MPIState { MPIState { value, long: value == 8 } }
fn mpi_near(value: i32) -> MPIState { MPIState { value, long: value == 7 } }

fn mpi_edge(absent: V, present: V, distance: i32) -> MPIMessage {
    MPIMessage {
        free: add(&mul(&path(distance - 1), &absent), &mul(&path(distance - 2), &present)),
        blocked: add(&mul(&path(distance - 2), &absent), &mul(&path(distance - 3), &present)),
    }
}

fn mpi_arm(spine: i32, low: i32, high: i32) -> MPIMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    mpi_edge(absent, present, spine)
}

fn mpi_middle_parts(middle_leaf: i32, long_message: MPIMessage) -> (V, V) {
    (
        mul(&path(middle_leaf), &long_message.free),
        shifted(&mul(&path(middle_leaf - 1), &long_message.blocked), 1),
    )
}

fn mpi_tail(tail: i32) -> MPIMessage {
    MPIMessage { free: path(tail), blocked: path(tail - 1) }
}

fn mpi_middle(center_middle: i32, middle_leaf: i32, long_message: MPIMessage) -> MPIMessage {
    let (absent, present) = mpi_middle_parts(middle_leaf, long_message);
    mpi_edge(absent, present, center_middle)
}

fn mpi_center_parts(other: MPIMessage, middle: MPIMessage) -> (V, V) {
    (
        mul(&other.free, &middle.free),
        shifted(&mul(&other.blocked, &middle.blocked), 1),
    )
}

fn mpi_center(selected_spine: i32, other: MPIMessage, middle: MPIMessage) -> MPIMessage {
    let (absent, present) = mpi_center_parts(other, middle);
    mpi_edge(absent, present, selected_spine)
}

fn mpi_selected_parts(other_pendant: i32, center: MPIMessage) -> (V, V) {
    (
        mul(&path(other_pendant), &center.free),
        shifted(&mul(&path(other_pendant - 1), &center.blocked), 1),
    )
}

fn mpi_core(near_gap: i32, other_pendant: i32, center: MPIMessage) -> MPIMessage {
    let (absent, present) = mpi_selected_parts(other_pendant, center);
    mpi_edge(absent, present, near_gap + 1)
}

fn mpi_from_sides(tail: MPIMessage, core: MPIMessage) -> (V, V) {
    let deleted = mul(&tail.free, &core.free);
    let selected = shifted(&mul(&tail.blocked, &core.blocked), 1);
    (add(&deleted, &selected), deleted)
}

fn mpi_arms() -> Vec<MPIArm> {
    let mut table = Vec::with_capacity(224);
    for spine in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(MPIArm {
                    spine: mpi_spine(spine), low: mpi_pendant(low), high: mpi_pendant(high),
                    message: mpi_arm(spine, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn mpi_pairs() -> Vec<MPIPair> {
    let arms = mpi_arms();
    let mut table = Vec::with_capacity(87_808);
    for near_gap in 0..=7_i32 {
        for tail in 1..=7_i32 {
            for other_pendant in 1..=7_i32 {
                for &other_arm in &arms {
                    table.push(MPIPair {
                        near_gap: mpi_near(near_gap),
                        tail: mpi_pendant(tail),
                        other_pendant: mpi_pendant(other_pendant),
                        other_arm,
                        tail_message: mpi_tail(tail),
                    });
                }
            }
        }
    }
    assert_eq!(table.len(), 87_808);
    table
}

fn mpi_fars() -> Vec<MPIFar> {
    let mut table = Vec::with_capacity(100_352);
    for selected_spine in 1..=8_i32 {
        for center_middle in 1..=8_i32 {
            for middle_leaf in 1..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for long_low in 1..=7_i32 {
                        for long_high in long_low..=7_i32 {
                            let long_message = mpi_arm(middle_outer, long_low, long_high);
                            let (middle_absent, middle_present) = mpi_middle_parts(middle_leaf, long_message);
                            table.push(MPIFar {
                                selected_spine: mpi_spine(selected_spine),
                                center_middle: mpi_spine(center_middle),
                                middle_leaf: mpi_pendant(middle_leaf),
                                middle_outer: mpi_spine(middle_outer),
                                long_low: mpi_pendant(long_low),
                                long_high: mpi_pendant(long_high),
                                long_message,
                                middle_absent,
                                middle_present,
                                middle_message: mpi_edge(middle_absent, middle_present, center_middle),
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

fn mpi_states(pair: MPIPair, far: MPIFar) -> [MPIState; 12] {
    [
        pair.near_gap, pair.tail, pair.other_pendant,
        far.selected_spine,
        pair.other_arm.spine, pair.other_arm.low, pair.other_arm.high,
        far.center_middle, far.middle_leaf, far.middle_outer,
        far.long_low, far.long_high,
    ]
}

fn mpi_lengths(states: &[MPIState; 12]) -> [i32; 12] {
    std::array::from_fn(|index| states[index].value)
}

fn mpi_formula_polynomials(lengths: &[i32; 12]) -> (V, V) {
    let other = mpi_arm(lengths[4], lengths[5], lengths[6]);
    let long_message = mpi_arm(lengths[9], lengths[10], lengths[11]);
    let middle = mpi_middle(lengths[7], lengths[8], long_message);
    let center = mpi_center(lengths[3], other, middle);
    let core = mpi_core(lengths[0], lengths[2], center);
    mpi_from_sides(mpi_tail(lengths[1]), core)
}

fn mpi_fixed(pair: MPIPair, far: MPIFar, varying: usize) -> MPIFixed {
    let (center_absent, center_present) = mpi_center_parts(pair.other_arm.message, far.middle_message);
    let center_message = mpi_edge(center_absent, center_present, far.selected_spine.value);
    let (selected_absent, selected_present) = mpi_selected_parts(pair.other_pendant.value, center_message);
    MPIFixed {
        moving_group: match varying {
            0 => 0, 1 => 1, 2 => 2, 3 => 3, 4..=6 => 4,
            7 => 5, 8 => 6, 9 => 7, 10..=11 => 8,
            _ => unreachable!(),
        },
        near_gap: pair.near_gap.value,
        tail: pair.tail.value,
        other_pendant: pair.other_pendant.value,
        selected_spine: far.selected_spine.value,
        other_message: pair.other_arm.message,
        center_middle: far.center_middle.value,
        middle_leaf: far.middle_leaf.value,
        middle_outer: far.middle_outer.value,
        long_low: far.long_low.value,
        long_high: far.long_high.value,
        long_message: far.long_message,
        middle_absent: far.middle_absent,
        middle_present: far.middle_present,
        middle_message: far.middle_message,
        center_absent,
        center_present,
        center_message,
        selected_absent,
        selected_present,
        core_message: mpi_edge(selected_absent, selected_present, pair.near_gap.value + 1),
        tail_message: pair.tail_message,
    }
}

fn mpi_values_with_fixed(lengths: &[i32; 12], fixed: MPIFixed) -> [Z; 4] {
    let (tail, core) = match fixed.moving_group {
        0 => (fixed.tail_message, mpi_edge(fixed.selected_absent, fixed.selected_present, lengths[0] + 1)),
        1 => (mpi_tail(lengths[1]), fixed.core_message),
        2 => (
            fixed.tail_message,
            mpi_core(lengths[0], lengths[2], fixed.center_message),
        ),
        3 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_edge(fixed.center_absent, fixed.center_present, lengths[3]),
            ),
        ),
        4 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_center(
                    fixed.selected_spine,
                    mpi_arm(lengths[4], lengths[5], lengths[6]),
                    fixed.middle_message,
                ),
            ),
        ),
        5 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_center(
                    fixed.selected_spine, fixed.other_message,
                    mpi_edge(fixed.middle_absent, fixed.middle_present, lengths[7]),
                ),
            ),
        ),
        6 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_center(
                    fixed.selected_spine, fixed.other_message,
                    mpi_middle(fixed.center_middle, lengths[8], fixed.long_message),
                ),
            ),
        ),
        7 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_center(
                    fixed.selected_spine, fixed.other_message,
                    mpi_middle(
                        fixed.center_middle, fixed.middle_leaf,
                        mpi_arm(lengths[9], fixed.long_low, fixed.long_high),
                    ),
                ),
            ),
        ),
        8 => (
            fixed.tail_message,
            mpi_core(
                fixed.near_gap, fixed.other_pendant,
                mpi_center(
                    fixed.selected_spine, fixed.other_message,
                    mpi_middle(
                        fixed.center_middle, fixed.middle_leaf,
                        mpi_arm(fixed.middle_outer, lengths[10], lengths[11]),
                    ),
                ),
            ),
        ),
        _ => unreachable!(),
    };
    let (whole, deleted) = mpi_from_sides(tail, core);
    deltas03(&whole, &deleted)
}

fn mpi_values(lengths: &[i32; 12], pair: MPIPair, far: MPIFar, varying: Option<usize>) -> [Z; 4] {
    if let Some(index) = varying { return mpi_values_with_fixed(lengths, mpi_fixed(pair, far, index)); }
    let (whole, deleted) = mpi_formula_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn mpi_literal_tree(lengths: &[i32; 12]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    audit_attach(&mut adjacency, root, lengths[1]);
    let selected_outer = audit_attach(&mut adjacency, root, lengths[0] + 1);
    audit_attach(&mut adjacency, selected_outer, lengths[2]);
    let center = audit_attach(&mut adjacency, selected_outer, lengths[3]);
    let other_outer = audit_attach(&mut adjacency, center, lengths[4]);
    audit_attach(&mut adjacency, other_outer, lengths[5]);
    audit_attach(&mut adjacency, other_outer, lengths[6]);
    let middle = audit_attach(&mut adjacency, center, lengths[7]);
    audit_attach(&mut adjacency, middle, lengths[8]);
    let long_outer = audit_attach(&mut adjacency, middle, lengths[9]);
    audit_attach(&mut adjacency, long_outer, lengths[10]);
    audit_attach(&mut adjacency, long_outer, lengths[11]);
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn mpi_literal_values(lengths: &[i32; 12]) -> [Z; 4] {
    let (adjacency, root) = mpi_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn mpi_formula_smoke() {
    let mut random = 0xE61A3D87C4529BF0_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 12];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 0 { (random % 23) as i32 } else { 1 + (random % 23) as i32 };
        }
        let (whole, deleted) = mpi_formula_polynomials(&lengths);
        assert_eq!(deltas03(&whole, &deleted), mpi_literal_values(&lengths), "short-outer-pendant-internal mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn mpi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn mpi_hash_state(hash: &mut AuditSha256, state: MPIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn mpi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn mpi_coefficient_leaf(states: &[MPIState; 12], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-pendant-internal-coefficient-v1\0");
    for &state in states { mpi_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { mpi_hash_z(&mut hash, value); } }
    mpi_sha_bytes(hash)
}

fn mpi_finite_leaf(states: &[MPIState; 12], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-pendant-internal-finite-v1\0");
    for &state in states { mpi_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { mpi_hash_z(&mut hash, value); }
    mpi_sha_bytes(hash)
}

fn mpi_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn mpi_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } }
    }
    mpi_degree_ok(rows)
}

fn mpi_coefficients(states: &[MPIState; 12], pair: MPIPair, far: MPIFar, literal_points: bool) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.long).expect("ray expected");
    let fixed = mpi_fixed(pair, far, varying);
    let mut lengths = mpi_lengths(states);
    let baseline = 2 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = mpi_values_with_fixed(&lengths, fixed);
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, mpi_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(mpi_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = mpi_values_with_fixed(&lengths, fixed);
    if literal_points {
        assert_eq!(unseen, mpi_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn mpi_smoke_stream() {
    let pairs = mpi_pairs();
    let fars = mpi_fars();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let far = fars[(sample * 104_729 + 23) % fars.len()];
        let states = mpi_states(pair, far);
        if !states.iter().any(|state| state.long) {
            let lengths = mpi_lengths(&states);
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = mpi_values(&lengths, pair, far, None);
                finite.update(&mpi_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = mpi_coefficients(&states, pair, far, false);
        if !mpi_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&mpi_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct MPIResult {
    worker: usize, start: usize, end: usize, counts: [u64; 5], unseen: u64,
    literal_checks: u64, coefficient_records: u64, finite_records: u64,
    coefficient_digest: [u8; 32], finite_digest: [u8; 32],
}

fn mpi_worker(worker: usize, pairs: Arc<Vec<MPIPair>>, fars: Arc<Vec<MPIFar>>) -> MPIResult {
    let start = MPI_BOUNDS[worker];
    let end = MPI_BOUNDS[worker + 1];
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
            let states = mpi_states(pair, far);
            let long_count = states.iter().filter(|state| state.long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = mpi_lengths(&states);
                let order = 2 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = mpi_values(&lengths, pair, far, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite.update(&mpi_finite_leaf(&states, order, &values));
                finite_records += 1;
                if !checked_finite {
                    assert_eq!(values, mpi_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 12 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) = mpi_coefficients(&states, pair, far, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient.update(&mpi_coefficient_leaf(&states, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert!(checked_finite && checked_ray);
    MPIResult {
        worker, start, end, counts, unseen, literal_checks, coefficient_records, finite_records,
        coefficient_digest: mpi_sha_bytes(coefficient), finite_digest: mpi_sha_bytes(finite),
    }
}

fn mpi_root_stream(results: &[MPIResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-short-outer-pendant-internal-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-short-outer-pendant-internal-finite-six-shard-root-v1\0"
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

fn mpi_full() {
    let pairs = Arc::new(mpi_pairs());
    let fars = Arc::new(mpi_fars());
    let mut handles = Vec::new();
    for worker in 0..MPI_THREADS {
        let pair_table = Arc::clone(&pairs);
        let far_table = Arc::clone(&fars);
        handles.push(thread::spawn(move || mpi_worker(worker, pair_table, far_table)));
    }
    let mut results: Vec<MPIResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, MPI_BOUNDS[worker]);
        assert_eq!(result.end, MPI_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [1_600_967_592, 1_597_435_864, 7_210_740_823, 1, 7_210_740_824]);
    assert_eq!(unseen, 28_842_963_296);
    assert_eq!(literal_checks, 24);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = mpi_root_stream(&results, true);
    let finite_stream = mpi_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_PENDANT_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_stream, finite_stream,
    );
    std::fs::write("rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_i256_raw_agent_20260824.txt", raw.as_bytes()).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { mpi_formula_smoke(); mpi_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => mpi_full(),
    }
}
