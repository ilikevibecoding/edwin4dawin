// Six-thread checked-i256 producer for five_cubic_t:center_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const FCT_THREADS: usize = 6;
const FCT_BENCH_RAYS: usize = 1_024;
const FCT_BOUNDS: [usize; 7] = [0, 4_535, 8_841, 13_080, 17_328, 21_448, 25_200];

#[derive(Clone, Copy)]
struct FCTState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct FCTTransfer {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct FCTArm {
    spine: FCTState,
    low: FCTState,
    high: FCTState,
    at_root: FCTTransfer,
}

#[derive(Clone, Copy)]
struct FCTPair {
    left: FCTArm,
    right: FCTArm,
    both_free: V,
    both_blocked: V,
}

#[derive(Clone, Copy)]
struct FCTFar {
    center_middle: FCTState,
    middle_pendant: FCTState,
    middle_outer: FCTState,
    outer_low: FCTState,
    outer_high: FCTState,
    at_root: FCTTransfer,
}

#[derive(Clone, Copy)]
struct FCTFixed {
    moving_group: usize,
    free: V,
    blocked: V,
}

fn fct_pendant(length: i32) -> FCTState {
    FCTState { length, is_long: length == 7 }
}

fn fct_spine(length: i32) -> FCTState {
    FCTState { length, is_long: length == 8 }
}

fn fct_cross(absent: V, present: V, length: i32) -> FCTTransfer {
    FCTTransfer {
        free: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        blocked: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}

fn fct_arm_parts(spine: i32, low: i32, high: i32) -> FCTTransfer {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    fct_cross(absent, present, spine)
}

fn fct_far_parts(
    center_middle: i32,
    middle_pendant: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> FCTTransfer {
    let outer_absent = mul(&path(outer_low), &path(outer_high));
    let outer_present = shifted(&mul(&path(outer_low - 1), &path(outer_high - 1)), 1);
    let at_middle = fct_cross(outer_absent, outer_present, middle_outer);
    let middle_absent = mul(&path(middle_pendant), &at_middle.free);
    let middle_present = shifted(&mul(&path(middle_pendant - 1), &at_middle.blocked), 1);
    fct_cross(middle_absent, middle_present, center_middle)
}

fn fct_arms() -> Vec<FCTArm> {
    let mut out = Vec::with_capacity(224);
    for spine in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                out.push(FCTArm {
                    spine: fct_spine(spine),
                    low: fct_pendant(low),
                    high: fct_pendant(high),
                    at_root: fct_arm_parts(spine, low, high),
                });
            }
        }
    }
    assert_eq!(out.len(), 224);
    out
}

fn fct_pairs() -> Vec<FCTPair> {
    let arms = fct_arms();
    let mut out = Vec::with_capacity(25_200);
    for left in 0..arms.len() {
        for right in left..arms.len() {
            out.push(FCTPair {
                left: arms[left],
                right: arms[right],
                both_free: mul(&arms[left].at_root.free, &arms[right].at_root.free),
                both_blocked: mul(&arms[left].at_root.blocked, &arms[right].at_root.blocked),
            });
        }
    }
    assert_eq!(out.len(), 25_200);
    out
}

fn fct_fars() -> Vec<FCTFar> {
    let mut out = Vec::with_capacity(12_544);
    for outer_low in 1..=7_i32 {
        for outer_high in outer_low..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_pendant in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        out.push(FCTFar {
                            center_middle: fct_spine(center_middle),
                            middle_pendant: fct_pendant(middle_pendant),
                            middle_outer: fct_spine(middle_outer),
                            outer_low: fct_pendant(outer_low),
                            outer_high: fct_pendant(outer_high),
                            at_root: fct_far_parts(
                                center_middle,
                                middle_pendant,
                                middle_outer,
                                outer_low,
                                outer_high,
                            ),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

fn fct_states(pair: FCTPair, far: FCTFar) -> [FCTState; 11] {
    [
        pair.left.spine,
        pair.left.low,
        pair.left.high,
        pair.right.spine,
        pair.right.low,
        pair.right.high,
        far.center_middle,
        far.middle_pendant,
        far.middle_outer,
        far.outer_low,
        far.outer_high,
    ]
}

fn fct_lengths(states: &[FCTState; 11]) -> [i32; 11] {
    std::array::from_fn(|index| states[index].length)
}

fn fct_from_parts(left: FCTTransfer, right: FCTTransfer, far: FCTTransfer) -> (V, V) {
    let deleted = product(&[left.free, right.free, far.free]);
    let selected = shifted(&product(&[left.blocked, right.blocked, far.blocked]), 1);
    (add(&deleted, &selected), deleted)
}

fn fct_formula_polynomials(lengths: &[i32; 11]) -> (V, V) {
    fct_from_parts(
        fct_arm_parts(lengths[0], lengths[1], lengths[2]),
        fct_arm_parts(lengths[3], lengths[4], lengths[5]),
        fct_far_parts(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
    )
}

fn fct_from_fixed(moving: FCTTransfer, fixed: FCTFixed) -> (V, V) {
    let deleted = mul(&moving.free, &fixed.free);
    let selected = shifted(&mul(&moving.blocked, &fixed.blocked), 1);
    (add(&deleted, &selected), deleted)
}

fn fct_fixed(pair: FCTPair, far: FCTFar, varying: usize) -> FCTFixed {
    if varying < 3 {
        FCTFixed {
            moving_group: 0,
            free: mul(&pair.right.at_root.free, &far.at_root.free),
            blocked: mul(&pair.right.at_root.blocked, &far.at_root.blocked),
        }
    } else if varying < 6 {
        FCTFixed {
            moving_group: 1,
            free: mul(&pair.left.at_root.free, &far.at_root.free),
            blocked: mul(&pair.left.at_root.blocked, &far.at_root.blocked),
        }
    } else {
        FCTFixed {
            moving_group: 2,
            free: pair.both_free,
            blocked: pair.both_blocked,
        }
    }
}

fn fct_values_with_fixed(lengths: &[i32; 11], fixed: FCTFixed) -> [Z; 4] {
    let moving = match fixed.moving_group {
        0 => fct_arm_parts(lengths[0], lengths[1], lengths[2]),
        1 => fct_arm_parts(lengths[3], lengths[4], lengths[5]),
        2 => fct_far_parts(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
        _ => unreachable!(),
    };
    let (core, deleted) = fct_from_fixed(moving, fixed);
    deltas03(&core, &deleted)
}

fn fct_values(lengths: &[i32; 11], pair: FCTPair, far: FCTFar, varying: Option<usize>) -> [Z; 4] {
    let (core, deleted) = if let Some(index) = varying {
        fct_from_fixed(
            match index {
                0..=2 => fct_arm_parts(lengths[0], lengths[1], lengths[2]),
                3..=5 => fct_arm_parts(lengths[3], lengths[4], lengths[5]),
                _ => fct_far_parts(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
            },
            fct_fixed(pair, far, index),
        )
    } else {
        let deleted = mul(&pair.both_free, &far.at_root.free);
        let selected = shifted(&mul(&pair.both_blocked, &far.at_root.blocked), 1);
        (add(&deleted, &selected), deleted)
    };
    deltas03(&core, &deleted)
}

fn fct_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let left = audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, left, lengths[1]);
    audit_attach(&mut adjacency, left, lengths[2]);
    let right = audit_attach(&mut adjacency, root, lengths[3]);
    audit_attach(&mut adjacency, right, lengths[4]);
    audit_attach(&mut adjacency, right, lengths[5]);
    let middle = audit_attach(&mut adjacency, root, lengths[6]);
    audit_attach(&mut adjacency, middle, lengths[7]);
    let outer = audit_attach(&mut adjacency, middle, lengths[8]);
    audit_attach(&mut adjacency, outer, lengths[9]);
    audit_attach(&mut adjacency, outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn fct_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = fct_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn fct_formula_smoke() {
    let mut random = 0x15B45A3D92C06EF7_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = fct_formula_polynomials(&lengths);
        assert_eq!(deltas03(&core, &deleted), fct_literal_values(&lengths), "five-cubic-T center mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_CENTER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn fct_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn fct_hash_state(hash: &mut AuditSha256, state: FCTState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn fct_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn fct_coefficient_leaf(
    states: &[FCTState; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-branch-coefficient-v1\0");
    for &state in states { fct_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { fct_hash_z(&mut hash, value); } }
    fct_sha_bytes(hash)
}

fn fct_finite_leaf(states: &[FCTState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-branch-finite-v1\0");
    for &state in states { fct_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { fct_hash_z(&mut hash, value); }
    fct_sha_bytes(hash)
}

fn fct_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn fct_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    fct_degree_ok(rows)
}

fn fct_coefficients(
    states: &[FCTState; 11],
    pair: FCTPair,
    far: FCTFar,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let fixed = fct_fixed(pair, far, varying);
    let mut lengths = fct_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = fct_values_with_fixed(&lengths, fixed);
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, fct_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(fct_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = fct_values_with_fixed(&lengths, fixed);
    if literal_points {
        assert_eq!(unseen, fct_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn fct_smoke_stream() {
    let pairs = fct_pairs();
    let fars = fct_fars();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let far = fars[(sample * 104_729 + 23) % fars.len()];
        let states = fct_states(pair, far);
        if !states.iter().any(|state| state.is_long) {
            let lengths = fct_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = fct_values(&lengths, pair, far, None);
                finite.update(&fct_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = fct_coefficients(&states, pair, far, false);
        if !fct_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&fct_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

fn fct_bench() {
    let pairs = fct_pairs();
    let fars = fct_fars();
    let mut stream = AuditSha256::new();
    let mut rays = 0_usize;
    let mut candidate = 0_usize;
    while rays < FCT_BENCH_RAYS {
        let pair = pairs[(candidate * 131 + 5) % pairs.len()];
        let far = fars[(candidate * 104_729 + 31) % fars.len()];
        candidate += 1;
        let states = fct_states(pair, far);
        if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, _) = fct_coefficients(&states, pair, far, false);
        stream.update(&fct_coefficient_leaf(&states, baseline, shift, &rows));
        rays += 1;
    }
    println!("BENCH_RAYS {}", rays);
    println!("BENCH_STREAM {}", stream.hex());
    println!("RESOURCE_TABLE_BYTES {} {}", pairs.len() * std::mem::size_of::<FCTPair>(), fars.len() * std::mem::size_of::<FCTFar>());
}

struct FCTResult {
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

fn fct_worker(worker: usize, pairs: Arc<Vec<FCTPair>>, fars: Arc<Vec<FCTFar>>) -> FCTResult {
    let start = FCT_BOUNDS[worker];
    let end = FCT_BOUNDS[worker + 1];
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
            let states = fct_states(pair, far);
            let long_count = states.iter().filter(|state| state.is_long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = fct_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = fct_values(&lengths, pair, far, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite.update(&fct_finite_leaf(&states, order, &values));
                finite_records += 1;
                if !checked_finite {
                    assert_eq!(values, fct_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) = fct_coefficients(&states, pair, far, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray {
                checked_ray = true;
                literal_checks += checked;
            }
            coefficient.update(&fct_coefficient_leaf(&states, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert!(checked_finite && checked_ray);
    FCTResult {
        worker,
        start,
        end,
        counts,
        unseen,
        literal_checks,
        coefficient_records,
        finite_records,
        coefficient_digest: fct_sha_bytes(coefficient),
        finite_digest: fct_sha_bytes(finite),
    }
}

fn fct_root_stream(results: &[FCTResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-center-branch-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-center-branch-finite-six-shard-root-v1\0"
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

fn fct_full() {
    let pairs = Arc::new(fct_pairs());
    let fars = Arc::new(fct_fars());
    let mut handles = Vec::new();
    for worker in 0..FCT_THREADS {
        let pair_table = Arc::clone(&pairs);
        let far_table = Arc::clone(&fars);
        handles.push(thread::spawn(move || fct_worker(worker, pair_table, far_table)));
    }
    let mut results: Vec<FCTResult> = handles.into_iter().map(|handle| handle.join().expect("primary worker panic")).collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, FCT_BOUNDS[worker]);
        assert_eq!(result.end, FCT_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [67_160_772, 66_375_425, 248_948_027, 1, 248_948_028]);
    assert_eq!(unseen, 995_792_112);
    assert_eq!(literal_checks, 24);
    assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = fct_root_stream(&results, true);
    let finite_stream = fct_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_CENTER_BRANCH\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_stream, finite_stream,
    );
    std::fs::write("rank8_delta03_e5_five_cubic_t_center_branch_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { fct_formula_smoke(); fct_smoke_stream(); }
        Some("bench") => fct_bench(),
        Some(value) => panic!("unknown mode {}", value),
        None => fct_full(),
    }
}
