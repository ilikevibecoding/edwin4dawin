// Independent checked-i256 literal audit for five_cubic_t:center_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const FCA_THREADS: usize = 6;
const FCA_BOUNDS: [usize; 7] = [0, 4_535, 8_841, 13_080, 17_328, 21_448, 25_200];

#[derive(Clone, Copy)]
struct FACoord {
    value: i32,
    infinite: bool,
}

#[derive(Clone, Copy)]
struct FAMessage {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct FAOuter {
    link: FACoord,
    leaf_low: FACoord,
    leaf_high: FACoord,
    message: FAMessage,
}

#[derive(Clone, Copy)]
struct FAOuterPair {
    first: FAOuter,
    second: FAOuter,
    pair_absent: V,
    pair_present: V,
}

#[derive(Clone, Copy)]
struct FALongArm {
    center_middle: FACoord,
    middle_leaf: FACoord,
    middle_outer: FACoord,
    outer_low: FACoord,
    outer_high: FACoord,
    message: FAMessage,
}

#[derive(Clone, Copy)]
struct FAFixed {
    moving_group: usize,
    parent_absent: V,
    parent_present: V,
}

fn fa_leaf(value: i32) -> FACoord {
    FACoord { value, infinite: value == 7 }
}

fn fa_link(value: i32) -> FACoord {
    FACoord { value, infinite: value == 8 }
}

fn fa_send(absent: V, present: V, distance: i32) -> FAMessage {
    let parent_absent = add(
        &mul(&path(distance - 1), &absent),
        &mul(&path(distance - 2), &present),
    );
    let parent_present = add(
        &mul(&path(distance - 2), &absent),
        &mul(&path(distance - 3), &present),
    );
    FAMessage { parent_absent, parent_present }
}

fn fa_outer_message(link: i32, low: i32, high: i32) -> FAMessage {
    let branch_absent = mul(&path(low), &path(high));
    let branch_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    fa_send(branch_absent, branch_present, link)
}

fn fa_long_message(
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> FAMessage {
    let outer = fa_outer_message(middle_outer, outer_low, outer_high);
    let middle_absent = mul(&path(middle_leaf), &outer.parent_absent);
    let middle_present = shifted(&mul(&path(middle_leaf - 1), &outer.parent_present), 1);
    fa_send(middle_absent, middle_present, center_middle)
}

fn fa_outer_table() -> Vec<FAOuter> {
    let mut table = Vec::with_capacity(224);
    for link in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(FAOuter {
                    link: fa_link(link),
                    leaf_low: fa_leaf(low),
                    leaf_high: fa_leaf(high),
                    message: fa_outer_message(link, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn fa_pair_table() -> Vec<FAOuterPair> {
    let outer = fa_outer_table();
    let mut table = Vec::with_capacity(25_200);
    for first in 0..outer.len() {
        for second in first..outer.len() {
            table.push(FAOuterPair {
                first: outer[first],
                second: outer[second],
                pair_absent: mul(&outer[first].message.parent_absent, &outer[second].message.parent_absent),
                pair_present: mul(&outer[first].message.parent_present, &outer[second].message.parent_present),
            });
        }
    }
    assert_eq!(table.len(), 25_200);
    table
}

fn fa_long_table() -> Vec<FALongArm> {
    let mut table = Vec::with_capacity(12_544);
    for outer_low in 1..=7_i32 {
        for outer_high in outer_low..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        table.push(FALongArm {
                            center_middle: fa_link(center_middle),
                            middle_leaf: fa_leaf(middle_leaf),
                            middle_outer: fa_link(middle_outer),
                            outer_low: fa_leaf(outer_low),
                            outer_high: fa_leaf(outer_high),
                            message: fa_long_message(
                                center_middle,
                                middle_leaf,
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
    assert_eq!(table.len(), 12_544);
    table
}

fn fa_coords(pair: FAOuterPair, long: FALongArm) -> [FACoord; 11] {
    [
        pair.first.link,
        pair.first.leaf_low,
        pair.first.leaf_high,
        pair.second.link,
        pair.second.leaf_low,
        pair.second.leaf_high,
        long.center_middle,
        long.middle_leaf,
        long.middle_outer,
        long.outer_low,
        long.outer_high,
    ]
}

fn fa_lengths(coords: &[FACoord; 11]) -> [i32; 11] {
    std::array::from_fn(|index| coords[index].value)
}

fn fa_root_polynomials(first: FAMessage, second: FAMessage, long: FAMessage) -> (V, V) {
    let root_absent = product(&[first.parent_absent, second.parent_absent, long.parent_absent]);
    let root_present = shifted(
        &product(&[first.parent_present, second.parent_present, long.parent_present]),
        1,
    );
    (add(&root_absent, &root_present), root_absent)
}

fn fa_direct_polynomials(lengths: &[i32; 11]) -> (V, V) {
    fa_root_polynomials(
        fa_outer_message(lengths[0], lengths[1], lengths[2]),
        fa_outer_message(lengths[3], lengths[4], lengths[5]),
        fa_long_message(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
    )
}

fn fa_from_fixed(moving: FAMessage, fixed: FAFixed) -> (V, V) {
    let root_absent = mul(&moving.parent_absent, &fixed.parent_absent);
    let root_present = shifted(&mul(&moving.parent_present, &fixed.parent_present), 1);
    (add(&root_absent, &root_present), root_absent)
}

fn fa_fixed(pair: FAOuterPair, long: FALongArm, varying: usize) -> FAFixed {
    if varying < 3 {
        FAFixed {
            moving_group: 0,
            parent_absent: mul(&pair.second.message.parent_absent, &long.message.parent_absent),
            parent_present: mul(&pair.second.message.parent_present, &long.message.parent_present),
        }
    } else if varying < 6 {
        FAFixed {
            moving_group: 1,
            parent_absent: mul(&pair.first.message.parent_absent, &long.message.parent_absent),
            parent_present: mul(&pair.first.message.parent_present, &long.message.parent_present),
        }
    } else {
        FAFixed {
            moving_group: 2,
            parent_absent: pair.pair_absent,
            parent_present: pair.pair_present,
        }
    }
}

fn fa_values_with_fixed(lengths: &[i32; 11], fixed: FAFixed) -> [Z; 4] {
    let moving = match fixed.moving_group {
        0 => fa_outer_message(lengths[0], lengths[1], lengths[2]),
        1 => fa_outer_message(lengths[3], lengths[4], lengths[5]),
        2 => fa_long_message(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
        _ => unreachable!(),
    };
    let (whole, deleted) = fa_from_fixed(moving, fixed);
    deltas03(&whole, &deleted)
}

fn fa_values(
    lengths: &[i32; 11],
    pair: FAOuterPair,
    long: FALongArm,
    varying: Option<usize>,
) -> [Z; 4] {
    let (whole, deleted) = if let Some(index) = varying {
        fa_from_fixed(
            match index {
                0..=2 => fa_outer_message(lengths[0], lengths[1], lengths[2]),
                3..=5 => fa_outer_message(lengths[3], lengths[4], lengths[5]),
                _ => fa_long_message(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]),
            },
            fa_fixed(pair, long, index),
        )
    } else {
        let root_absent = mul(&pair.pair_absent, &long.message.parent_absent);
        let root_present = shifted(&mul(&pair.pair_present, &long.message.parent_present), 1);
        (add(&root_absent, &root_present), root_absent)
    };
    deltas03(&whole, &deleted)
}

fn fa_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, distance: i32) -> usize {
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

fn fa_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let first = fa_extend(&mut adjacency, root, lengths[0]);
    fa_extend(&mut adjacency, first, lengths[1]);
    fa_extend(&mut adjacency, first, lengths[2]);
    let second = fa_extend(&mut adjacency, root, lengths[3]);
    fa_extend(&mut adjacency, second, lengths[4]);
    fa_extend(&mut adjacency, second, lengths[5]);
    let middle = fa_extend(&mut adjacency, root, lengths[6]);
    fa_extend(&mut adjacency, middle, lengths[7]);
    let outer = fa_extend(&mut adjacency, middle, lengths[8]);
    fa_extend(&mut adjacency, outer, lengths[9]);
    fa_extend(&mut adjacency, outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, root)
}

fn fa_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = fa_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn fa_independent_smoke() {
    let mut random = 0xD4E78125A9BC603F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (whole, deleted) = fa_direct_polynomials(&lengths);
        assert_eq!(deltas03(&whole, &deleted), fa_literal_values(&lengths), "independent direct mismatch {}", sample);
    }
    let pairs = fa_pair_table();
    let longs = fa_long_table();
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
        let long = longs[random as usize % longs.len()];
        let mut lengths = fa_lengths(&fa_coords(pair, long));
        let varying = random as usize % 11;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(fa_values(&lengths, pair, long, Some(varying)), fa_literal_values(&lengths), "independent cache mismatch {}", sample);
    }
    println!("PASS_E5_FIVE_CUBIC_T_CENTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn fa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn fa_hash_coord(hash: &mut AuditSha256, coord: FACoord) {
    hash.update(&[coord.infinite as u8]);
    hash.update(&coord.value.to_le_bytes());
}

fn fa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn fa_coefficient_leaf(
    coords: &[FACoord; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-branch-coefficient-v1\0");
    for &coord in coords { fa_hash_coord(&mut hash, coord); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { fa_hash_z(&mut hash, value); } }
    fa_sha_bytes(hash)
}

fn fa_finite_leaf(coords: &[FACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-center-branch-finite-v1\0");
    for &coord in coords { fa_hash_coord(&mut hash, coord); }
    hash.update(&order.to_le_bytes());
    for &value in values { fa_hash_z(&mut hash, value); }
    fa_sha_bytes(hash)
}

fn fa_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn fa_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    fa_degree_ok(rows)
}

fn fa_formula_coefficients(
    coords: &[FACoord; 11],
    pair: FAOuterPair,
    long: FALongArm,
    literal: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let fixed = fa_fixed(pair, long, varying);
    let mut lengths = fa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = fa_values_with_fixed(&lengths, fixed);
        if literal && (point == 0 || point == 13) {
            assert_eq!(values, fa_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(fa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = fa_values_with_fixed(&lengths, fixed);
    if literal {
        assert_eq!(unseen, fa_literal_values(&lengths));
        checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, checks)
}

fn fa_literal_coefficients(coords: &[FACoord; 11]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let mut lengths = fa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = fa_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(fa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = fa_literal_values(&lengths);
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows)
}

fn fa_smoke_stream() {
    let pairs = fa_pair_table();
    let longs = fa_long_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let long = longs[(sample * 104_729 + 23) % longs.len()];
        let coords = fa_coords(pair, long);
        if !coords.iter().any(|coord| coord.infinite) {
            let lengths = fa_lengths(&coords);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = fa_literal_values(&lengths);
                finite.update(&fa_finite_leaf(&coords, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = fa_literal_coefficients(&coords);
        if !fa_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&fa_coefficient_leaf(&coords, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct FAResult {
    worker: usize,
    start: usize,
    end: usize,
    counts: [u64; 5],
    unseen: u64,
    literal: u64,
    coefficient_records: u64,
    finite_records: u64,
    coefficient_digest: [u8; 32],
    finite_digest: [u8; 32],
}

fn fa_worker(worker: usize, pairs: Arc<Vec<FAOuterPair>>, longs: Arc<Vec<FALongArm>>) -> FAResult {
    let start = FCA_BOUNDS[worker];
    let end = FCA_BOUNDS[worker + 1];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal = 0_u64;
    let mut coefficient_records = 0_u64;
    let mut finite_records = 0_u64;
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    for pair_index in start..end {
        let pair = pairs[pair_index];
        for &long in longs.iter() {
            let coords = fa_coords(pair, long);
            let long_count = coords.iter().filter(|coord| coord.infinite).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = fa_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let fast = fa_values(&lengths, pair, long, None);
                let direct = fa_literal_values(&lengths);
                assert_eq!(fast, direct);
                assert!(direct.iter().all(|value| value.is_positive()));
                finite.update(&fa_finite_leaf(&coords, order, &direct));
                finite_records += 1;
                counts[1] += 1;
                literal += 1;
                continue;
            }
            if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checks) = fa_formula_coefficients(&coords, pair, long, true);
            audit_assert_gate(&rows);
            coefficient.update(&fa_coefficient_leaf(&coords, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
            literal += checks;
        }
    }
    FAResult {
        worker,
        start,
        end,
        counts,
        unseen,
        literal,
        coefficient_records,
        finite_records,
        coefficient_digest: fa_sha_bytes(coefficient),
        finite_digest: fa_sha_bytes(finite),
    }
}

fn fa_root_stream(results: &[FAResult], coefficient: bool) -> String {
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

fn fa_full() {
    let pairs = Arc::new(fa_pair_table());
    let longs = Arc::new(fa_long_table());
    let mut handles = Vec::new();
    for worker in 0..FCA_THREADS {
        let pair_table = Arc::clone(&pairs);
        let long_table = Arc::clone(&longs);
        handles.push(thread::spawn(move || fa_worker(worker, pair_table, long_table)));
    }
    let mut results: Vec<FAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, FCA_BOUNDS[worker]);
        assert_eq!(result.end, FCA_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [67_160_772, 66_375_425, 248_948_027, 1, 248_948_028]);
    assert_eq!(unseen, 995_792_112);
    assert_eq!(literal, 813_219_509);
    assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = fa_root_stream(&results, true);
    let finite_stream = fa_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_CENTER_BRANCH\n",
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
    std::fs::write("rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { fa_independent_smoke(); fa_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => fa_full(),
    }
}
