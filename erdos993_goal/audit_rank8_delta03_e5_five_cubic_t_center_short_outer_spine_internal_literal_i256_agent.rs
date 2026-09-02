// Independent checked-i256 literal audit for five_cubic_t:center_short_outer_spine_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MLA_THREADS: usize = 6;
const MLA_BOUNDS: [usize; 7] = [0, 9_028, 17_546, 25_976, 34_413, 42_885, 50_176];

#[derive(Clone, Copy)] struct MLACoord { value: i32, infinite: bool }
#[derive(Clone, Copy)] struct MLAMessage { parent_absent: V, parent_present: V }

#[derive(Clone, Copy)]
struct MLAArm { spine: MLACoord, low: MLACoord, high: MLACoord, message: MLAMessage }

#[derive(Clone, Copy)]
struct MLAPair {
    selected_low: MLACoord,
    selected_high: MLACoord,
    other: MLAArm,
    center_gap: MLACoord,
    selected_absent: V,
    selected_present: V,
}

#[derive(Clone, Copy)]
struct MLAFar {
    outer_gap: MLACoord,
    center_middle: MLACoord,
    middle_outer: MLACoord,
    middle_leaf: MLACoord,
    long_low: MLACoord,
    long_high: MLACoord,
    long_message: MLAMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MLAMessage,
}

#[derive(Clone, Copy)]
struct MLAFixed {
    moving_group: usize,
    selected_absent: V,
    selected_present: V,
    selected_side: MLAMessage,
    other_message: MLAMessage,
    center_gap: i32,
    center_absent: V,
    center_present: V,
    center_side: MLAMessage,
    outer_gap: i32,
    center_middle: i32,
    middle_outer: i32,
    middle_leaf: i32,
    long_low: i32,
    long_high: i32,
    long_message: MLAMessage,
    middle_absent: V,
    middle_present: V,
    middle_message: MLAMessage,
}

fn mla_leaf(value: i32) -> MLACoord { MLACoord { value, infinite: value == 7 } }
fn mla_link(value: i32) -> MLACoord { MLACoord { value, infinite: value == 8 } }
fn mla_gap(value: i32) -> MLACoord { MLACoord { value, infinite: value == 7 } }

fn mla_send(absent: V, present: V, distance: i32) -> MLAMessage {
    MLAMessage {
        parent_absent: add(
            &mul(&path(distance - 1), &absent),
            &mul(&path(distance - 2), &present),
        ),
        parent_present: add(
            &mul(&path(distance - 2), &absent),
            &mul(&path(distance - 3), &present),
        ),
    }
}

fn mla_arm_message(spine: i32, low: i32, high: i32) -> MLAMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    mla_send(absent, present, spine)
}

fn mla_branch_parts(low: i32, high: i32) -> (V, V) {
    (
        mul(&path(low), &path(high)),
        shifted(&mul(&path(low - 1), &path(high - 1)), 1),
    )
}

fn mla_middle_parts(middle_leaf: i32, long_message: MLAMessage) -> (V, V) {
    (
        mul(&path(middle_leaf), &long_message.parent_absent),
        shifted(&mul(&path(middle_leaf - 1), &long_message.parent_present), 1),
    )
}

fn mla_middle_message(center_middle: i32, middle_leaf: i32, long_message: MLAMessage) -> MLAMessage {
    let (absent, present) = mla_middle_parts(middle_leaf, long_message);
    mla_send(absent, present, center_middle)
}

fn mla_center_parts(other: MLAMessage, middle: MLAMessage) -> (V, V) {
    (
        mul(&other.parent_absent, &middle.parent_absent),
        shifted(&mul(&other.parent_present, &middle.parent_present), 1),
    )
}

fn mla_center_message(center_gap: i32, other: MLAMessage, middle: MLAMessage) -> MLAMessage {
    let (absent, present) = mla_center_parts(other, middle);
    mla_send(absent, present, center_gap + 1)
}

fn mla_selected_message(outer_gap: i32, low: i32, high: i32) -> MLAMessage {
    let (absent, present) = mla_branch_parts(low, high);
    mla_send(absent, present, outer_gap + 1)
}

fn mla_root_polynomials(selected: MLAMessage, center: MLAMessage) -> (V, V) {
    let root_absent = mul(&selected.parent_absent, &center.parent_absent);
    let root_present = shifted(&mul(&selected.parent_present, &center.parent_present), 1);
    (add(&root_absent, &root_present), root_absent)
}

fn mla_arm_table() -> Vec<MLAArm> {
    let mut table = Vec::with_capacity(224);
    for spine in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(MLAArm {
                    spine: mla_link(spine),
                    low: mla_leaf(low),
                    high: mla_leaf(high),
                    message: mla_arm_message(spine, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn mla_pair_table() -> Vec<MLAPair> {
    let arms = mla_arm_table();
    let mut table = Vec::with_capacity(50_176);
    for selected_low in 1..=7_i32 {
        for selected_high in selected_low..=7_i32 {
            let (selected_absent, selected_present) = mla_branch_parts(selected_low, selected_high);
            for &other in &arms {
                for center_gap in 0..=7_i32 {
                    table.push(MLAPair {
                        selected_low: mla_leaf(selected_low),
                        selected_high: mla_leaf(selected_high),
                        other,
                        center_gap: mla_gap(center_gap),
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

fn mla_far_table() -> Vec<MLAFar> {
    let mut table = Vec::with_capacity(100_352);
    for outer_gap in 0..=7_i32 {
        for center_middle in 1..=8_i32 {
            for middle_leaf in 1..=7_i32 {
                for middle_outer in 1..=8_i32 {
                    for long_low in 1..=7_i32 {
                        for long_high in long_low..=7_i32 {
                            let long_message = mla_arm_message(middle_outer, long_low, long_high);
                            let (middle_absent, middle_present) = mla_middle_parts(middle_leaf, long_message);
                            table.push(MLAFar {
                                outer_gap: mla_gap(outer_gap),
                                center_middle: mla_link(center_middle),
                                middle_outer: mla_link(middle_outer),
                                middle_leaf: mla_leaf(middle_leaf),
                                long_low: mla_leaf(long_low),
                                long_high: mla_leaf(long_high),
                                long_message,
                                middle_absent,
                                middle_present,
                                middle_message: mla_send(middle_absent, middle_present, center_middle),
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

fn mla_coords(pair: MLAPair, far: MLAFar) -> [MLACoord; 12] {
    [
        pair.selected_low, pair.selected_high,
        pair.other.spine, pair.other.low, pair.other.high,
        pair.center_gap, far.outer_gap,
        far.center_middle, far.middle_leaf, far.middle_outer,
        far.long_low, far.long_high,
    ]
}

fn mla_lengths(coords: &[MLACoord; 12]) -> [i32; 12] {
    std::array::from_fn(|index| coords[index].value)
}

fn mla_direct_polynomials(lengths: &[i32; 12]) -> (V, V) {
    let selected = mla_selected_message(lengths[6], lengths[0], lengths[1]);
    let other = mla_arm_message(lengths[2], lengths[3], lengths[4]);
    let long_message = mla_arm_message(lengths[9], lengths[10], lengths[11]);
    let middle = mla_middle_message(lengths[7], lengths[8], long_message);
    let center = mla_center_message(lengths[5], other, middle);
    mla_root_polynomials(selected, center)
}

fn mla_fixed(pair: MLAPair, far: MLAFar, varying: usize) -> MLAFixed {
    let selected_side = mla_send(pair.selected_absent, pair.selected_present, far.outer_gap.value + 1);
    let (center_absent, center_present) = mla_center_parts(pair.other.message, far.middle_message);
    MLAFixed {
        moving_group: match varying {
            0..=1 => 0, 2..=4 => 1, 5 => 2, 6 => 3, 7 => 4, 8 => 5, 9 => 6, 10..=11 => 7,
            _ => unreachable!(),
        },
        selected_absent: pair.selected_absent,
        selected_present: pair.selected_present,
        selected_side,
        other_message: pair.other.message,
        center_gap: pair.center_gap.value,
        center_absent,
        center_present,
        center_side: mla_send(center_absent, center_present, pair.center_gap.value + 1),
        outer_gap: far.outer_gap.value,
        center_middle: far.center_middle.value,
        middle_outer: far.middle_outer.value,
        middle_leaf: far.middle_leaf.value,
        long_low: far.long_low.value,
        long_high: far.long_high.value,
        long_message: far.long_message,
        middle_absent: far.middle_absent,
        middle_present: far.middle_present,
        middle_message: far.middle_message,
    }
}

fn mla_values_with_fixed(lengths: &[i32; 12], fixed: MLAFixed) -> [Z; 4] {
    let (selected, center) = match fixed.moving_group {
        0 => (mla_selected_message(fixed.outer_gap, lengths[0], lengths[1]), fixed.center_side),
        1 => (
            fixed.selected_side,
            mla_center_message(
                fixed.center_gap,
                mla_arm_message(lengths[2], lengths[3], lengths[4]),
                fixed.middle_message,
            ),
        ),
        2 => (
            fixed.selected_side,
            mla_send(fixed.center_absent, fixed.center_present, lengths[5] + 1),
        ),
        3 => (
            mla_send(fixed.selected_absent, fixed.selected_present, lengths[6] + 1),
            fixed.center_side,
        ),
        4 => (
            fixed.selected_side,
            mla_center_message(
                fixed.center_gap,
                fixed.other_message,
                mla_send(fixed.middle_absent, fixed.middle_present, lengths[7]),
            ),
        ),
        5 => (
            fixed.selected_side,
            mla_center_message(
                fixed.center_gap,
                fixed.other_message,
                mla_middle_message(fixed.center_middle, lengths[8], fixed.long_message),
            ),
        ),
        6 => (
            fixed.selected_side,
            mla_center_message(
                fixed.center_gap,
                fixed.other_message,
                mla_middle_message(
                    fixed.center_middle,
                    fixed.middle_leaf,
                    mla_arm_message(lengths[9], fixed.long_low, fixed.long_high),
                ),
            ),
        ),
        7 => (
            fixed.selected_side,
            mla_center_message(
                fixed.center_gap,
                fixed.other_message,
                mla_middle_message(
                    fixed.center_middle,
                    fixed.middle_leaf,
                    mla_arm_message(fixed.middle_outer, lengths[10], lengths[11]),
                ),
            ),
        ),
        _ => unreachable!(),
    };
    let (whole, deleted) = mla_root_polynomials(selected, center);
    deltas03(&whole, &deleted)
}

fn mla_values(lengths: &[i32; 12], pair: MLAPair, far: MLAFar, varying: Option<usize>) -> [Z; 4] {
    if let Some(index) = varying {
        return mla_values_with_fixed(lengths, mla_fixed(pair, far, index));
    }
    let (whole, deleted) = mla_direct_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn mla_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, distance: i32) -> usize {
    let mut current = start;
    for _ in 0..distance {
        let next = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[current].push(next);
        adjacency[next].push(current);
        current = next;
    }
    current
}

fn mla_tree(lengths: &[i32; 12]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let selected_outer = mla_extend(&mut adjacency, root, lengths[6] + 1);
    mla_extend(&mut adjacency, selected_outer, lengths[0]);
    mla_extend(&mut adjacency, selected_outer, lengths[1]);
    let center = mla_extend(&mut adjacency, root, lengths[5] + 1);
    let other_outer = mla_extend(&mut adjacency, center, lengths[2]);
    mla_extend(&mut adjacency, other_outer, lengths[3]);
    mla_extend(&mut adjacency, other_outer, lengths[4]);
    let middle = mla_extend(&mut adjacency, center, lengths[7]);
    mla_extend(&mut adjacency, middle, lengths[8]);
    let long_outer = mla_extend(&mut adjacency, middle, lengths[9]);
    mla_extend(&mut adjacency, long_outer, lengths[10]);
    mla_extend(&mut adjacency, long_outer, lengths[11]);
    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn mla_literal_values(lengths: &[i32; 12]) -> [Z; 4] {
    let (adjacency, root) = mla_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn mla_independent_smoke() {
    let mut random = 0x3B95D7E12A6C804F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 12];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 5 || index == 6 { (random % 23) as i32 } else { 1 + (random % 23) as i32 };
        }
        let (whole, deleted) = mla_direct_polynomials(&lengths);
        assert_eq!(deltas03(&whole, &deleted), mla_literal_values(&lengths), "independent center-short-outer direct mismatch {}", sample);
    }
    let pairs = mla_pair_table();
    let fars = mla_far_table();
    for sample in 0..512_usize {
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let pair = pairs[random as usize % pairs.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let far = fars[random as usize % fars.len()];
        let mut lengths = mla_lengths(&mla_coords(pair, far));
        let varying = random as usize % 12;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(mla_values(&lengths, pair, far, Some(varying)), mla_literal_values(&lengths), "independent center-short-outer cache mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn mla_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn mla_hash_coord(hash: &mut AuditSha256, coord: MLACoord) {
    hash.update(&[coord.infinite as u8]);
    hash.update(&coord.value.to_le_bytes());
}

fn mla_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn mla_coefficient_leaf(coords: &[MLACoord; 12], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-short-outer-spine-internal-coefficient-v1\0");
    for &coord in coords { mla_hash_coord(&mut hash, coord); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { mla_hash_z(&mut hash, value); } }
    mla_sha_bytes(hash)
}

fn mla_finite_leaf(coords: &[MLACoord; 12], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-short-outer-spine-internal-finite-v1\0");
    for &coord in coords { mla_hash_coord(&mut hash, coord); }
    hash.update(&order.to_le_bytes());
    for &value in values { mla_hash_z(&mut hash, value); }
    mla_sha_bytes(hash)
}

fn mla_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn mla_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] { if rows[rank][power].is_negative() { return false; } }
    }
    mla_degree_ok(rows)
}

fn mla_formula_coefficients(
    coords: &[MLACoord; 12],
    pair: MLAPair,
    far: MLAFar,
    literal: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let fixed = mla_fixed(pair, far, varying);
    let mut lengths = mla_lengths(coords);
    let baseline = 3 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = mla_values_with_fixed(&lengths, fixed);
        if literal && (point == 0 || point == 13) {
            assert_eq!(values, mla_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(mla_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = mla_values_with_fixed(&lengths, fixed);
    if literal {
        assert_eq!(unseen, mla_literal_values(&lengths));
        checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, checks)
}

fn mla_literal_coefficients(coords: &[MLACoord; 12]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let mut lengths = mla_lengths(coords);
    let baseline = 3 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = mla_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(mla_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = mla_literal_values(&lengths);
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows)
}

fn mla_smoke_stream() {
    let pairs = mla_pair_table();
    let fars = mla_far_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let far = fars[(sample * 104_729 + 23) % fars.len()];
        let coords = mla_coords(pair, far);
        if !coords.iter().any(|coord| coord.infinite) {
            let lengths = mla_lengths(&coords);
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = mla_literal_values(&lengths);
                finite.update(&mla_finite_leaf(&coords, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = mla_literal_coefficients(&coords);
        if !mla_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&mla_coefficient_leaf(&coords, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct MLAResult {
    worker: usize, start: usize, end: usize, counts: [u64; 5], unseen: u64, literal: u64,
    coefficient_records: u64, finite_records: u64,
    coefficient_digest: [u8; 32], finite_digest: [u8; 32],
}

fn mla_worker(worker: usize, pairs: Arc<Vec<MLAPair>>, fars: Arc<Vec<MLAFar>>) -> MLAResult {
    let start = MLA_BOUNDS[worker];
    let end = MLA_BOUNDS[worker + 1];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal = 0_u64;
    let mut coefficient_records = 0_u64;
    let mut finite_records = 0_u64;
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    for pair_index in start..end {
        let pair = pairs[pair_index];
        for &far in fars.iter() {
            let coords = mla_coords(pair, far);
            let long_count = coords.iter().filter(|coord| coord.infinite).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = mla_lengths(&coords);
                let order = 3 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let fast = mla_values(&lengths, pair, far, None);
                let direct = mla_literal_values(&lengths);
                assert_eq!(fast, direct);
                assert!(direct.iter().all(|value| value.is_positive()));
                finite.update(&mla_finite_leaf(&coords, order, &direct));
                finite_records += 1;
                counts[1] += 1;
                literal += 1;
                continue;
            }
            if long_count == 12 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checks) = mla_formula_coefficients(&coords, pair, far, true);
            audit_assert_gate(&rows);
            coefficient.update(&mla_coefficient_leaf(&coords, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
            literal += checks;
        }
    }
    MLAResult {
        worker, start, end, counts, unseen, literal, coefficient_records, finite_records,
        coefficient_digest: mla_sha_bytes(coefficient), finite_digest: mla_sha_bytes(finite),
    }
}

fn mla_root_stream(results: &[MLAResult], coefficient: bool) -> String {
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

fn mla_full() {
    let pairs = Arc::new(mla_pair_table());
    let fars = Arc::new(mla_far_table());
    let mut handles = Vec::new();
    for worker in 0..MLA_THREADS {
        let pair_table = Arc::clone(&pairs);
        let far_table = Arc::clone(&fars);
        handles.push(thread::spawn(move || mla_worker(worker, pair_table, far_table)));
    }
    let mut results: Vec<MLAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, MLA_BOUNDS[worker]);
        assert_eq!(result.end, MLA_BOUNDS[worker + 1]);
        if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
    }
    assert_eq!(results.first().unwrap().start, 0);
    assert_eq!(results.last().unwrap().end, pairs.len());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal = 0_u64;
    for result in &results {
        for index in 0..5 { counts[index] += result.counts[index]; }
        unseen += result.unseen;
        literal += result.literal;
    }
    assert_eq!(counts, [933_897_762, 931_636_700, 4_101_364_189, 1, 4_101_364_190]);
    assert_eq!(unseen, 16_405_456_760);
    assert_eq!(literal, 13_235_729_270);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = mla_root_stream(&results, true);
    let finite_stream = mla_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_TREES {}\n",
            "LITERAL_RAY_POINTS 0 13 29\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal, coefficient_stream, finite_stream,
    );
    std::fs::write("rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_literal_i256_raw_agent_20260824.txt", raw.as_bytes()).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { mla_independent_smoke(); mla_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => mla_full(),
    }
}
