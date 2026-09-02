// Independent checked-i256 literal audit for five_cubic_t:long_outer_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const FLA_THREADS: usize = 6;
const FLA_BOUNDS: [usize; 7] = [0, 4_535, 8_841, 13_080, 17_328, 21_448, 25_200];

#[derive(Clone, Copy)]
struct FLCoord {
    value: i32,
    infinite: bool,
}

#[derive(Clone, Copy)]
struct FLMessage {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct FLOuter {
    link: FLCoord,
    leaf_low: FLCoord,
    leaf_high: FLCoord,
    message: FLMessage,
}

#[derive(Clone, Copy)]
struct FLOuterPair {
    first: FLOuter,
    second: FLOuter,
    pair_absent: V,
    pair_present: V,
}

#[derive(Clone, Copy)]
struct FLLongLeaf {
    center_middle: FLCoord,
    middle_leaf: FLCoord,
    middle_outer: FLCoord,
    other_leaf: FLCoord,
    incident_leaf: FLCoord,
}

#[derive(Clone, Copy)]
struct FLFixed {
    moving_group: usize,
    other_outer: FLMessage,
    center_absent: V,
    center_present: V,
    center_middle: i32,
    center_side: FLMessage,
    middle_leaf: i32,
    middle_outer: i32,
    middle_side: FLMessage,
    other_leaf: i32,
    incident_leaf: i32,
}

fn fl_leaf(value: i32) -> FLCoord {
    FLCoord { value, infinite: value == 7 }
}

fn fl_incident_leaf(value: i32) -> FLCoord {
    FLCoord { value, infinite: value == 8 }
}

fn fl_link(value: i32) -> FLCoord {
    FLCoord { value, infinite: value == 8 }
}

fn fl_send(absent: V, present: V, distance: i32) -> FLMessage {
    let parent_absent = add(
        &mul(&path(distance - 1), &absent),
        &mul(&path(distance - 2), &present),
    );
    let parent_present = add(
        &mul(&path(distance - 2), &absent),
        &mul(&path(distance - 3), &present),
    );
    FLMessage { parent_absent, parent_present }
}

fn fl_outer_message(link: i32, low: i32, high: i32) -> FLMessage {
    let branch_absent = mul(&path(low), &path(high));
    let branch_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    fl_send(branch_absent, branch_present, link)
}

fn fl_center_message(first: FLMessage, second: FLMessage, center_middle: i32) -> FLMessage {
    let center_absent = mul(&first.parent_absent, &second.parent_absent);
    let center_present = shifted(&mul(&first.parent_present, &second.parent_present), 1);
    fl_send(center_absent, center_present, center_middle)
}

fn fl_middle_message(center_side: FLMessage, middle_leaf: i32, middle_outer: i32) -> FLMessage {
    let middle_absent = mul(&center_side.parent_absent, &path(middle_leaf));
    let middle_present = shifted(&mul(&center_side.parent_present, &path(middle_leaf - 1)), 1);
    fl_send(middle_absent, middle_present, middle_outer)
}

fn fl_incident_message(middle_side: FLMessage, other_leaf: i32, incident_leaf: i32) -> FLMessage {
    let outer_absent = mul(&middle_side.parent_absent, &path(other_leaf));
    let outer_present = shifted(&mul(&middle_side.parent_present, &path(other_leaf - 1)), 1);
    fl_send(outer_absent, outer_present, incident_leaf)
}

fn fl_root_polynomials(message: FLMessage) -> (V, V) {
    let root_absent = message.parent_absent;
    let root_present = shifted(&message.parent_present, 1);
    (add(&root_absent, &root_present), root_absent)
}

fn fl_outer_table() -> Vec<FLOuter> {
    let mut table = Vec::with_capacity(224);
    for link in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(FLOuter {
                    link: fl_link(link),
                    leaf_low: fl_leaf(low),
                    leaf_high: fl_leaf(high),
                    message: fl_outer_message(link, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn fl_pair_table() -> Vec<FLOuterPair> {
    let outer = fl_outer_table();
    let mut table = Vec::with_capacity(25_200);
    for first in 0..outer.len() {
        for second in first..outer.len() {
            table.push(FLOuterPair {
                first: outer[first],
                second: outer[second],
                pair_absent: mul(
                    &outer[first].message.parent_absent,
                    &outer[second].message.parent_absent,
                ),
                pair_present: mul(
                    &outer[first].message.parent_present,
                    &outer[second].message.parent_present,
                ),
            });
        }
    }
    assert_eq!(table.len(), 25_200);
    table
}

fn fl_long_table() -> Vec<FLLongLeaf> {
    let mut table = Vec::with_capacity(25_088);
    for incident_leaf in 1..=8_i32 {
        for other_leaf in 1..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        table.push(FLLongLeaf {
                            center_middle: fl_link(center_middle),
                            middle_leaf: fl_leaf(middle_leaf),
                            middle_outer: fl_link(middle_outer),
                            other_leaf: fl_leaf(other_leaf),
                            incident_leaf: fl_incident_leaf(incident_leaf),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(table.len(), 25_088);
    table
}

fn fl_coords(pair: FLOuterPair, long: FLLongLeaf) -> [FLCoord; 11] {
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
        long.other_leaf,
        long.incident_leaf,
    ]
}

fn fl_lengths(coords: &[FLCoord; 11]) -> [i32; 11] {
    std::array::from_fn(|index| coords[index].value)
}

fn fl_direct_polynomials(lengths: &[i32; 11]) -> (V, V) {
    fl_root_polynomials(fl_incident_message(
        fl_middle_message(
            fl_center_message(
                fl_outer_message(lengths[0], lengths[1], lengths[2]),
                fl_outer_message(lengths[3], lengths[4], lengths[5]),
                lengths[6],
            ),
            lengths[7],
            lengths[8],
        ),
        lengths[9],
        lengths[10],
    ))
}

fn fl_fixed(pair: FLOuterPair, long: FLLongLeaf, varying: usize) -> FLFixed {
    let center_present = shifted(&pair.pair_present, 1);
    let center_side = fl_send(pair.pair_absent, center_present, long.center_middle.value);
    let middle_side = fl_middle_message(center_side, long.middle_leaf.value, long.middle_outer.value);
    FLFixed {
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
        other_outer: if varying < 3 { pair.second.message } else { pair.first.message },
        center_absent: pair.pair_absent,
        center_present,
        center_middle: long.center_middle.value,
        center_side,
        middle_leaf: long.middle_leaf.value,
        middle_outer: long.middle_outer.value,
        middle_side,
        other_leaf: long.other_leaf.value,
        incident_leaf: long.incident_leaf.value,
    }
}

fn fl_values_with_fixed(lengths: &[i32; 11], fixed: FLFixed) -> [Z; 4] {
    let message = match fixed.moving_group {
        0 => {
            let center = fl_center_message(
                fl_outer_message(lengths[0], lengths[1], lengths[2]),
                fixed.other_outer,
                fixed.center_middle,
            );
            let middle = fl_middle_message(center, fixed.middle_leaf, fixed.middle_outer);
            fl_incident_message(middle, fixed.other_leaf, fixed.incident_leaf)
        }
        1 => {
            let center = fl_center_message(
                fixed.other_outer,
                fl_outer_message(lengths[3], lengths[4], lengths[5]),
                fixed.center_middle,
            );
            let middle = fl_middle_message(center, fixed.middle_leaf, fixed.middle_outer);
            fl_incident_message(middle, fixed.other_leaf, fixed.incident_leaf)
        }
        2 => {
            let center = fl_send(fixed.center_absent, fixed.center_present, lengths[6]);
            let middle = fl_middle_message(center, fixed.middle_leaf, fixed.middle_outer);
            fl_incident_message(middle, fixed.other_leaf, fixed.incident_leaf)
        }
        3 => {
            let middle = fl_middle_message(fixed.center_side, lengths[7], fixed.middle_outer);
            fl_incident_message(middle, fixed.other_leaf, fixed.incident_leaf)
        }
        4 => {
            let middle = fl_middle_message(fixed.center_side, fixed.middle_leaf, lengths[8]);
            fl_incident_message(middle, fixed.other_leaf, fixed.incident_leaf)
        }
        5 => fl_incident_message(fixed.middle_side, lengths[9], fixed.incident_leaf),
        6 => fl_incident_message(fixed.middle_side, fixed.other_leaf, lengths[10]),
        _ => unreachable!(),
    };
    let (whole, deleted) = fl_root_polynomials(message);
    deltas03(&whole, &deleted)
}

fn fl_values(
    lengths: &[i32; 11],
    pair: FLOuterPair,
    long: FLLongLeaf,
    varying: Option<usize>,
) -> [Z; 4] {
    if let Some(index) = varying {
        return fl_values_with_fixed(lengths, fl_fixed(pair, long, index));
    }
    let center = fl_send(
        pair.pair_absent,
        shifted(&pair.pair_present, 1),
        long.center_middle.value,
    );
    let middle = fl_middle_message(center, long.middle_leaf.value, long.middle_outer.value);
    let message = fl_incident_message(middle, long.other_leaf.value, long.incident_leaf.value);
    let (whole, deleted) = fl_root_polynomials(message);
    deltas03(&whole, &deleted)
}

fn fl_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, distance: i32) -> usize {
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

fn fl_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let center = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let first = fl_extend(&mut adjacency, center, lengths[0]);
    fl_extend(&mut adjacency, first, lengths[1]);
    fl_extend(&mut adjacency, first, lengths[2]);
    let second = fl_extend(&mut adjacency, center, lengths[3]);
    fl_extend(&mut adjacency, second, lengths[4]);
    fl_extend(&mut adjacency, second, lengths[5]);
    let middle = fl_extend(&mut adjacency, center, lengths[6]);
    fl_extend(&mut adjacency, middle, lengths[7]);
    let outer = fl_extend(&mut adjacency, middle, lengths[8]);
    fl_extend(&mut adjacency, outer, lengths[9]);
    let rooted = fl_extend(&mut adjacency, outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, rooted)
}

fn fl_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = fl_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn fl_independent_smoke() {
    let mut random = 0x6D2F9A841CE5B703_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (whole, deleted) = fl_direct_polynomials(&lengths);
        assert_eq!(
            deltas03(&whole, &deleted),
            fl_literal_values(&lengths),
            "independent long-outer-leaf direct mismatch {}",
            sample,
        );
    }
    let pairs = fl_pair_table();
    let longs = fl_long_table();
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
        let mut lengths = fl_lengths(&fl_coords(pair, long));
        let varying = random as usize % 11;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            fl_values(&lengths, pair, long, Some(varying)),
            fl_literal_values(&lengths),
            "independent long-outer-leaf cache mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_FIVE_CUBIC_T_LONG_OUTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn fl_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn fl_hash_coord(hash: &mut AuditSha256, coord: FLCoord) {
    hash.update(&[coord.infinite as u8]);
    hash.update(&coord.value.to_le_bytes());
}

fn fl_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn fl_coefficient_leaf(
    coords: &[FLCoord; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-long-outer-leaf-coefficient-v1\0");
    for &coord in coords { fl_hash_coord(&mut hash, coord); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { fl_hash_z(&mut hash, value); } }
    fl_sha_bytes(hash)
}

fn fl_finite_leaf(coords: &[FLCoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-long-outer-leaf-finite-v1\0");
    for &coord in coords { fl_hash_coord(&mut hash, coord); }
    hash.update(&order.to_le_bytes());
    for &value in values { fl_hash_z(&mut hash, value); }
    fl_sha_bytes(hash)
}

fn fl_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn fl_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    fl_degree_ok(rows)
}

fn fl_formula_coefficients(
    coords: &[FLCoord; 11],
    pair: FLOuterPair,
    long: FLLongLeaf,
    literal: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let fixed = fl_fixed(pair, long, varying);
    let mut lengths = fl_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = fl_values_with_fixed(&lengths, fixed);
        if literal && (point == 0 || point == 13) {
            assert_eq!(values, fl_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(fl_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = fl_values_with_fixed(&lengths, fixed);
    if literal {
        assert_eq!(unseen, fl_literal_values(&lengths));
        checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, checks)
}

fn fl_literal_coefficients(coords: &[FLCoord; 11]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let mut lengths = fl_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = fl_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(fl_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = fl_literal_values(&lengths);
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows)
}

fn fl_smoke_stream() {
    let pairs = fl_pair_table();
    let longs = fl_long_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let long = longs[(sample * 104_729 + 23) % longs.len()];
        let coords = fl_coords(pair, long);
        if !coords.iter().any(|coord| coord.infinite) {
            let lengths = fl_lengths(&coords);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = fl_literal_values(&lengths);
                finite.update(&fl_finite_leaf(&coords, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = fl_literal_coefficients(&coords);
        if !fl_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&fl_coefficient_leaf(&coords, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct FLResult {
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

fn fl_worker(
    worker: usize,
    pairs: Arc<Vec<FLOuterPair>>,
    longs: Arc<Vec<FLLongLeaf>>,
) -> FLResult {
    let start = FLA_BOUNDS[worker];
    let end = FLA_BOUNDS[worker + 1];
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
            let coords = fl_coords(pair, long);
            let long_count = coords.iter().filter(|coord| coord.infinite).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = fl_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let fast = fl_values(&lengths, pair, long, None);
                let direct = fl_literal_values(&lengths);
                assert_eq!(fast, direct);
                assert!(direct.iter().all(|value| value.is_positive()));
                finite.update(&fl_finite_leaf(&coords, order, &direct));
                finite_records += 1;
                counts[1] += 1;
                literal += 1;
                continue;
            }
            if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checks) =
                fl_formula_coefficients(&coords, pair, long, true);
            audit_assert_gate(&rows);
            coefficient.update(&fl_coefficient_leaf(&coords, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
            literal += checks;
        }
    }
    FLResult {
        worker,
        start,
        end,
        counts,
        unseen,
        literal,
        coefficient_records,
        finite_records,
        coefficient_digest: fl_sha_bytes(coefficient),
        finite_digest: fl_sha_bytes(finite),
    }
}

fn fl_root_stream(results: &[FLResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-long-outer-leaf-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-long-outer-leaf-finite-six-shard-root-v1\0"
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

fn fl_full() {
    let pairs = Arc::new(fl_pair_table());
    let longs = Arc::new(fl_long_table());
    let mut handles = Vec::new();
    for worker in 0..FLA_THREADS {
        let pair_table = Arc::clone(&pairs);
        let long_table = Arc::clone(&longs);
        handles.push(thread::spawn(move || fl_worker(worker, pair_table, long_table)));
    }
    let mut results: Vec<FLResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("audit worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, FLA_BOUNDS[worker]);
        assert_eq!(result.end, FLA_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [134_321_544, 133_041_981, 497_896_055, 1, 497_896_056]);
    assert_eq!(unseen, 1_991_584_224);
    assert_eq!(literal, 1_626_730_149);
    assert_eq!(results.iter().map(|result| result.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|result| result.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = fl_root_stream(&results, true);
    let finite_stream = fl_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_LONG_OUTER_LEAF\n",
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
    std::fs::write(
        "rank8_delta03_e5_five_cubic_t_long_outer_leaf_literal_i256_raw_agent_20260824.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { fl_independent_smoke(); fl_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => fl_full(),
    }
}
