// Six-thread checked-i256 producer for five_cubic_t:short_outer_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const SOL_THREADS: usize = 6;
const SOL_BOUNDS: [usize; 7] = [0, 16_726, 33_451, 50_176, 66_902, 83_627, 100_352];

#[derive(Clone, Copy)]
struct SOLState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct SOLTransfer { free: V, blocked: V }

#[derive(Clone, Copy)]
struct SOLRootedArm {
    link: SOLState,
    other_leaf: SOLState,
    incident_leaf: SOLState,
}

#[derive(Clone, Copy)]
struct SOLOtherArm {
    link: SOLState,
    low: SOLState,
    high: SOLState,
    at_center: SOLTransfer,
}

#[derive(Clone, Copy)]
struct SOLPair { rooted: SOLRootedArm, other: SOLOtherArm }

#[derive(Clone, Copy)]
struct SOLLong {
    center_middle: SOLState,
    middle_leaf: SOLState,
    middle_outer: SOLState,
    outer_low: SOLState,
    outer_high: SOLState,
    at_center: SOLTransfer,
}

#[derive(Clone, Copy)]
struct SOLFixed {
    moving_group: usize,
    rooted_link: i32,
    rooted_other_leaf: i32,
    rooted_incident_leaf: i32,
    other_arm: SOLTransfer,
    long_arm: SOLTransfer,
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
}

fn sol_pendant(length: i32) -> SOLState {
    SOLState { length, is_long: length == 7 }
}

fn sol_incident(length: i32) -> SOLState {
    SOLState { length, is_long: length == 8 }
}

fn sol_spine(length: i32) -> SOLState {
    SOLState { length, is_long: length == 8 }
}

fn sol_cross(absent: V, present: V, length: i32) -> SOLTransfer {
    SOLTransfer {
        free: add(&mul(&path(length - 1), &absent), &mul(&path(length - 2), &present)),
        blocked: add(&mul(&path(length - 2), &absent), &mul(&path(length - 3), &present)),
    }
}

fn sol_short_arm(link: i32, low: i32, high: i32) -> SOLTransfer {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    sol_cross(absent, present, link)
}

fn sol_long_arm(
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> SOLTransfer {
    let outer_absent = mul(&path(outer_low), &path(outer_high));
    let outer_present = shifted(&mul(&path(outer_low - 1), &path(outer_high - 1)), 1);
    let at_middle = sol_cross(outer_absent, outer_present, middle_outer);
    let middle_absent = mul(&path(middle_leaf), &at_middle.free);
    let middle_present = shifted(&mul(&path(middle_leaf - 1), &at_middle.blocked), 1);
    sol_cross(middle_absent, middle_present, center_middle)
}

fn sol_center_side(other: SOLTransfer, long: SOLTransfer, rooted_link: i32) -> SOLTransfer {
    let absent = mul(&other.free, &long.free);
    let present = shifted(&mul(&other.blocked, &long.blocked), 1);
    sol_cross(absent, present, rooted_link)
}

fn sol_root_message(
    center_side: SOLTransfer,
    other_leaf: i32,
    incident_leaf: i32,
) -> SOLTransfer {
    let absent = mul(&center_side.free, &path(other_leaf));
    let present = shifted(&mul(&center_side.blocked, &path(other_leaf - 1)), 1);
    sol_cross(absent, present, incident_leaf)
}

fn sol_from_message(message: SOLTransfer) -> (V, V) {
    let deleted = message.free;
    let selected = shifted(&message.blocked, 1);
    (add(&deleted, &selected), deleted)
}

fn sol_rooted_table() -> Vec<SOLRootedArm> {
    let mut table = Vec::with_capacity(448);
    for incident_leaf in 1..=8_i32 {
        for other_leaf in 1..=7_i32 {
            for link in 1..=8_i32 {
                table.push(SOLRootedArm {
                    link: sol_spine(link),
                    other_leaf: sol_pendant(other_leaf),
                    incident_leaf: sol_incident(incident_leaf),
                });
            }
        }
    }
    assert_eq!(table.len(), 448);
    table
}

fn sol_other_table() -> Vec<SOLOtherArm> {
    let mut table = Vec::with_capacity(224);
    for link in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(SOLOtherArm {
                    link: sol_spine(link),
                    low: sol_pendant(low),
                    high: sol_pendant(high),
                    at_center: sol_short_arm(link, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn sol_pair_table() -> Vec<SOLPair> {
    let rooted = sol_rooted_table();
    let other = sol_other_table();
    let mut table = Vec::with_capacity(100_352);
    for &rooted_arm in &rooted {
        for &other_arm in &other {
            table.push(SOLPair { rooted: rooted_arm, other: other_arm });
        }
    }
    assert_eq!(table.len(), 100_352);
    table
}

fn sol_long_table() -> Vec<SOLLong> {
    let mut table = Vec::with_capacity(12_544);
    for outer_low in 1..=7_i32 {
        for outer_high in outer_low..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        table.push(SOLLong {
                            center_middle: sol_spine(center_middle),
                            middle_leaf: sol_pendant(middle_leaf),
                            middle_outer: sol_spine(middle_outer),
                            outer_low: sol_pendant(outer_low),
                            outer_high: sol_pendant(outer_high),
                            at_center: sol_long_arm(
                                center_middle, middle_leaf, middle_outer, outer_low, outer_high,
                            ),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(table.len(), 12_544);
    table
}

fn sol_states(pair: SOLPair, long: SOLLong) -> [SOLState; 11] {
    [
        pair.rooted.link,
        pair.rooted.other_leaf,
        pair.rooted.incident_leaf,
        pair.other.link,
        pair.other.low,
        pair.other.high,
        long.center_middle,
        long.middle_leaf,
        long.middle_outer,
        long.outer_low,
        long.outer_high,
    ]
}

fn sol_lengths(states: &[SOLState; 11]) -> [i32; 11] {
    std::array::from_fn(|index| states[index].length)
}

fn sol_formula_polynomials(lengths: &[i32; 11]) -> (V, V) {
    let other = sol_short_arm(lengths[3], lengths[4], lengths[5]);
    let long = sol_long_arm(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]);
    let center = sol_center_side(other, long, lengths[0]);
    sol_from_message(sol_root_message(center, lengths[1], lengths[2]))
}

fn sol_fixed(pair: SOLPair, long: SOLLong, varying: usize) -> SOLFixed {
    SOLFixed {
        moving_group: match varying {
            0..=2 => 0,
            3..=5 => 1,
            6 => 2,
            7 => 3,
            8 => 4,
            9 => 5,
            10 => 6,
            _ => unreachable!(),
        },
        rooted_link: pair.rooted.link.length,
        rooted_other_leaf: pair.rooted.other_leaf.length,
        rooted_incident_leaf: pair.rooted.incident_leaf.length,
        other_arm: pair.other.at_center,
        long_arm: long.at_center,
        center_middle: long.center_middle.length,
        middle_leaf: long.middle_leaf.length,
        middle_outer: long.middle_outer.length,
        outer_low: long.outer_low.length,
        outer_high: long.outer_high.length,
    }
}

fn sol_values_with_fixed(lengths: &[i32; 11], fixed: SOLFixed) -> [Z; 4] {
    let message = match fixed.moving_group {
        0 => {
            let center = sol_center_side(fixed.other_arm, fixed.long_arm, lengths[0]);
            sol_root_message(center, lengths[1], lengths[2])
        }
        1 => {
            let other = sol_short_arm(lengths[3], lengths[4], lengths[5]);
            let center = sol_center_side(other, fixed.long_arm, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        2 => {
            let long = sol_long_arm(
                lengths[6], fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, fixed.outer_high,
            );
            let center = sol_center_side(fixed.other_arm, long, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        3 => {
            let long = sol_long_arm(
                fixed.center_middle, lengths[7], fixed.middle_outer, fixed.outer_low, fixed.outer_high,
            );
            let center = sol_center_side(fixed.other_arm, long, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        4 => {
            let long = sol_long_arm(
                fixed.center_middle, fixed.middle_leaf, lengths[8], fixed.outer_low, fixed.outer_high,
            );
            let center = sol_center_side(fixed.other_arm, long, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        5 => {
            let long = sol_long_arm(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer, lengths[9], fixed.outer_high,
            );
            let center = sol_center_side(fixed.other_arm, long, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        6 => {
            let long = sol_long_arm(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, lengths[10],
            );
            let center = sol_center_side(fixed.other_arm, long, fixed.rooted_link);
            sol_root_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        _ => unreachable!(),
    };
    let (whole, deleted) = sol_from_message(message);
    deltas03(&whole, &deleted)
}

fn sol_values(
    lengths: &[i32; 11],
    pair: SOLPair,
    long: SOLLong,
    varying: Option<usize>,
) -> [Z; 4] {
    if let Some(index) = varying {
        return sol_values_with_fixed(lengths, sol_fixed(pair, long, index));
    }
    let (whole, deleted) = sol_formula_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn sol_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let center = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let rooted_outer = audit_attach(&mut adjacency, center, lengths[0]);
    audit_attach(&mut adjacency, rooted_outer, lengths[1]);
    let rooted = audit_attach(&mut adjacency, rooted_outer, lengths[2]);
    let other_outer = audit_attach(&mut adjacency, center, lengths[3]);
    audit_attach(&mut adjacency, other_outer, lengths[4]);
    audit_attach(&mut adjacency, other_outer, lengths[5]);
    let middle = audit_attach(&mut adjacency, center, lengths[6]);
    audit_attach(&mut adjacency, middle, lengths[7]);
    let long_outer = audit_attach(&mut adjacency, middle, lengths[8]);
    audit_attach(&mut adjacency, long_outer, lengths[9]);
    audit_attach(&mut adjacency, long_outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, rooted)
}

fn sol_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = sol_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn sol_formula_smoke() {
    let mut random = 0x31C8D5A47B2E906F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (whole, deleted) = sol_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&whole, &deleted),
            sol_literal_values(&lengths),
            "five-cubic-T short-outer-leaf mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn sol_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn sol_hash_state(hash: &mut AuditSha256, state: SOLState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn sol_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn sol_coefficient_leaf(
    states: &[SOLState; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-leaf-coefficient-v1\0");
    for &state in states { sol_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { sol_hash_z(&mut hash, value); } }
    sol_sha_bytes(hash)
}

fn sol_finite_leaf(states: &[SOLState; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-leaf-finite-v1\0");
    for &state in states { sol_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { sol_hash_z(&mut hash, value); }
    sol_sha_bytes(hash)
}

fn sol_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn sol_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    sol_degree_ok(rows)
}

fn sol_coefficients(
    states: &[SOLState; 11],
    pair: SOLPair,
    long: SOLLong,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let fixed = sol_fixed(pair, long, varying);
    let mut lengths = sol_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = sol_values_with_fixed(&lengths, fixed);
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, sol_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(sol_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = sol_values_with_fixed(&lengths, fixed);
    if literal_points {
        assert_eq!(unseen, sol_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_checks)
}

fn sol_smoke_stream() {
    let pairs = sol_pair_table();
    let longs = sol_long_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let long = longs[(sample * 104_729 + 23) % longs.len()];
        let states = sol_states(pair, long);
        if !states.iter().any(|state| state.is_long) {
            let lengths = sol_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = sol_values(&lengths, pair, long, None);
                finite.update(&sol_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = sol_coefficients(&states, pair, long, false);
        if !sol_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&sol_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct SOLResult {
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

fn sol_worker(
    worker: usize,
    pairs: Arc<Vec<SOLPair>>,
    longs: Arc<Vec<SOLLong>>,
) -> SOLResult {
    let start = SOL_BOUNDS[worker];
    let end = SOL_BOUNDS[worker + 1];
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
        for &long in longs.iter() {
            let states = sol_states(pair, long);
            let long_count = states.iter().filter(|state| state.is_long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = sol_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = sol_values(&lengths, pair, long, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite.update(&sol_finite_leaf(&states, order, &values));
                finite_records += 1;
                if !checked_finite {
                    assert_eq!(values, sol_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) =
                sol_coefficients(&states, pair, long, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient.update(&sol_coefficient_leaf(&states, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert!(checked_finite && checked_ray);
    SOLResult {
        worker, start, end, counts, unseen, literal_checks,
        coefficient_records, finite_records,
        coefficient_digest: sol_sha_bytes(coefficient),
        finite_digest: sol_sha_bytes(finite),
    }
}

fn sol_root_stream(results: &[SOLResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-short-outer-leaf-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-short-outer-leaf-finite-six-shard-root-v1\0"
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

fn sol_full() {
    let pairs = Arc::new(sol_pair_table());
    let longs = Arc::new(sol_long_table());
    let mut handles = Vec::new();
    for worker in 0..SOL_THREADS {
        let pair_table = Arc::clone(&pairs);
        let long_table = Arc::clone(&longs);
        handles.push(thread::spawn(move || sol_worker(worker, pair_table, long_table)));
    }
    let mut results: Vec<SOLResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("primary worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, SOL_BOUNDS[worker]);
        assert_eq!(result.end, SOL_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [266_827_932, 264_323_724, 991_987_555, 1, 991_987_556]);
    assert_eq!(unseen, 3_967_950_224);
    assert_eq!(literal_checks, 24);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = sol_root_stream(&results, true);
    let finite_stream = sol_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF\n",
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
        "rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_raw_agent_20260824.txt",
        raw.as_bytes(),
    ).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { sol_formula_smoke(); sol_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => sol_full(),
    }
}
