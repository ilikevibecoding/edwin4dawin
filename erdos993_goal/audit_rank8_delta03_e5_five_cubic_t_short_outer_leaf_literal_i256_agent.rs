// Independent checked-i256 literal audit for five_cubic_t:short_outer_leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const SOA_THREADS: usize = 6;
const SOA_BOUNDS: [usize; 7] = [0, 16_726, 33_451, 50_176, 66_902, 83_627, 100_352];

#[derive(Clone, Copy)]
struct SOACoord { value: i32, infinite: bool }

#[derive(Clone, Copy)]
struct SOAMessage { parent_absent: V, parent_present: V }

#[derive(Clone, Copy)]
struct SOARootedArm {
    link: SOACoord,
    other_leaf: SOACoord,
    incident_leaf: SOACoord,
}

#[derive(Clone, Copy)]
struct SOAOtherArm {
    link: SOACoord,
    low: SOACoord,
    high: SOACoord,
    message: SOAMessage,
}

#[derive(Clone, Copy)]
struct SOAPair { rooted: SOARootedArm, other: SOAOtherArm }

#[derive(Clone, Copy)]
struct SOALongArm {
    center_middle: SOACoord,
    middle_leaf: SOACoord,
    middle_outer: SOACoord,
    outer_low: SOACoord,
    outer_high: SOACoord,
    message: SOAMessage,
}

#[derive(Clone, Copy)]
struct SOAFixed {
    moving_group: usize,
    rooted_link: i32,
    rooted_other_leaf: i32,
    rooted_incident_leaf: i32,
    other_arm: SOAMessage,
    long_arm: SOAMessage,
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
}

fn soa_leaf(value: i32) -> SOACoord {
    SOACoord { value, infinite: value == 7 }
}

fn soa_incident(value: i32) -> SOACoord {
    SOACoord { value, infinite: value == 8 }
}

fn soa_link(value: i32) -> SOACoord {
    SOACoord { value, infinite: value == 8 }
}

fn soa_send(absent: V, present: V, distance: i32) -> SOAMessage {
    SOAMessage {
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

fn soa_short_message(link: i32, low: i32, high: i32) -> SOAMessage {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    soa_send(absent, present, link)
}

fn soa_long_message(
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> SOAMessage {
    let outer_absent = mul(&path(outer_low), &path(outer_high));
    let outer_present = shifted(&mul(&path(outer_low - 1), &path(outer_high - 1)), 1);
    let outer_to_middle = soa_send(outer_absent, outer_present, middle_outer);
    let middle_absent = mul(&path(middle_leaf), &outer_to_middle.parent_absent);
    let middle_present = shifted(
        &mul(&path(middle_leaf - 1), &outer_to_middle.parent_present),
        1,
    );
    soa_send(middle_absent, middle_present, center_middle)
}

fn soa_center_message(other: SOAMessage, long: SOAMessage, rooted_link: i32) -> SOAMessage {
    let center_absent = mul(&other.parent_absent, &long.parent_absent);
    let center_present = shifted(&mul(&other.parent_present, &long.parent_present), 1);
    soa_send(center_absent, center_present, rooted_link)
}

fn soa_incident_message(
    center_side: SOAMessage,
    other_leaf: i32,
    incident_leaf: i32,
) -> SOAMessage {
    let outer_absent = mul(&center_side.parent_absent, &path(other_leaf));
    let outer_present = shifted(&mul(&center_side.parent_present, &path(other_leaf - 1)), 1);
    soa_send(outer_absent, outer_present, incident_leaf)
}

fn soa_root_polynomials(message: SOAMessage) -> (V, V) {
    let root_absent = message.parent_absent;
    let root_present = shifted(&message.parent_present, 1);
    (add(&root_absent, &root_present), root_absent)
}

fn soa_rooted_table() -> Vec<SOARootedArm> {
    let mut table = Vec::with_capacity(448);
    for incident_leaf in 1..=8_i32 {
        for other_leaf in 1..=7_i32 {
            for link in 1..=8_i32 {
                table.push(SOARootedArm {
                    link: soa_link(link),
                    other_leaf: soa_leaf(other_leaf),
                    incident_leaf: soa_incident(incident_leaf),
                });
            }
        }
    }
    assert_eq!(table.len(), 448);
    table
}

fn soa_other_table() -> Vec<SOAOtherArm> {
    let mut table = Vec::with_capacity(224);
    for link in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(SOAOtherArm {
                    link: soa_link(link),
                    low: soa_leaf(low),
                    high: soa_leaf(high),
                    message: soa_short_message(link, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn soa_pair_table() -> Vec<SOAPair> {
    let rooted = soa_rooted_table();
    let other = soa_other_table();
    let mut table = Vec::with_capacity(100_352);
    for &rooted_arm in &rooted {
        for &other_arm in &other {
            table.push(SOAPair { rooted: rooted_arm, other: other_arm });
        }
    }
    assert_eq!(table.len(), 100_352);
    table
}

fn soa_long_table() -> Vec<SOALongArm> {
    let mut table = Vec::with_capacity(12_544);
    for outer_low in 1..=7_i32 {
        for outer_high in outer_low..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        table.push(SOALongArm {
                            center_middle: soa_link(center_middle),
                            middle_leaf: soa_leaf(middle_leaf),
                            middle_outer: soa_link(middle_outer),
                            outer_low: soa_leaf(outer_low),
                            outer_high: soa_leaf(outer_high),
                            message: soa_long_message(
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

fn soa_coords(pair: SOAPair, long: SOALongArm) -> [SOACoord; 11] {
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

fn soa_lengths(coords: &[SOACoord; 11]) -> [i32; 11] {
    std::array::from_fn(|index| coords[index].value)
}

fn soa_direct_polynomials(lengths: &[i32; 11]) -> (V, V) {
    let other = soa_short_message(lengths[3], lengths[4], lengths[5]);
    let long = soa_long_message(lengths[6], lengths[7], lengths[8], lengths[9], lengths[10]);
    let center = soa_center_message(other, long, lengths[0]);
    soa_root_polynomials(soa_incident_message(center, lengths[1], lengths[2]))
}

fn soa_fixed(pair: SOAPair, long: SOALongArm, varying: usize) -> SOAFixed {
    SOAFixed {
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
        rooted_link: pair.rooted.link.value,
        rooted_other_leaf: pair.rooted.other_leaf.value,
        rooted_incident_leaf: pair.rooted.incident_leaf.value,
        other_arm: pair.other.message,
        long_arm: long.message,
        center_middle: long.center_middle.value,
        middle_leaf: long.middle_leaf.value,
        middle_outer: long.middle_outer.value,
        outer_low: long.outer_low.value,
        outer_high: long.outer_high.value,
    }
}

fn soa_values_with_fixed(lengths: &[i32; 11], fixed: SOAFixed) -> [Z; 4] {
    let message = match fixed.moving_group {
        0 => {
            let center = soa_center_message(fixed.other_arm, fixed.long_arm, lengths[0]);
            soa_incident_message(center, lengths[1], lengths[2])
        }
        1 => {
            let other = soa_short_message(lengths[3], lengths[4], lengths[5]);
            let center = soa_center_message(other, fixed.long_arm, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        2 => {
            let long = soa_long_message(
                lengths[6], fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, fixed.outer_high,
            );
            let center = soa_center_message(fixed.other_arm, long, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        3 => {
            let long = soa_long_message(
                fixed.center_middle, lengths[7], fixed.middle_outer, fixed.outer_low, fixed.outer_high,
            );
            let center = soa_center_message(fixed.other_arm, long, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        4 => {
            let long = soa_long_message(
                fixed.center_middle, fixed.middle_leaf, lengths[8], fixed.outer_low, fixed.outer_high,
            );
            let center = soa_center_message(fixed.other_arm, long, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        5 => {
            let long = soa_long_message(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer, lengths[9], fixed.outer_high,
            );
            let center = soa_center_message(fixed.other_arm, long, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        6 => {
            let long = soa_long_message(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer, fixed.outer_low, lengths[10],
            );
            let center = soa_center_message(fixed.other_arm, long, fixed.rooted_link);
            soa_incident_message(center, fixed.rooted_other_leaf, fixed.rooted_incident_leaf)
        }
        _ => unreachable!(),
    };
    let (whole, deleted) = soa_root_polynomials(message);
    deltas03(&whole, &deleted)
}

fn soa_values(
    lengths: &[i32; 11],
    pair: SOAPair,
    long: SOALongArm,
    varying: Option<usize>,
) -> [Z; 4] {
    if let Some(index) = varying {
        return soa_values_with_fixed(lengths, soa_fixed(pair, long, index));
    }
    let (whole, deleted) = soa_direct_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn soa_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, distance: i32) -> usize {
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

fn soa_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let center = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let rooted_outer = soa_extend(&mut adjacency, center, lengths[0]);
    soa_extend(&mut adjacency, rooted_outer, lengths[1]);
    let rooted = soa_extend(&mut adjacency, rooted_outer, lengths[2]);
    let other_outer = soa_extend(&mut adjacency, center, lengths[3]);
    soa_extend(&mut adjacency, other_outer, lengths[4]);
    soa_extend(&mut adjacency, other_outer, lengths[5]);
    let middle = soa_extend(&mut adjacency, center, lengths[6]);
    soa_extend(&mut adjacency, middle, lengths[7]);
    let long_outer = soa_extend(&mut adjacency, middle, lengths[8]);
    soa_extend(&mut adjacency, long_outer, lengths[9]);
    soa_extend(&mut adjacency, long_outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, rooted)
}

fn soa_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = soa_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn soa_independent_smoke() {
    let mut random = 0xE4B17C932D6A805F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (whole, deleted) = soa_direct_polynomials(&lengths);
        assert_eq!(
            deltas03(&whole, &deleted),
            soa_literal_values(&lengths),
            "independent short-outer-leaf direct mismatch {}",
            sample,
        );
    }
    let pairs = soa_pair_table();
    let longs = soa_long_table();
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
        let mut lengths = soa_lengths(&soa_coords(pair, long));
        let varying = random as usize % 11;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            soa_values(&lengths, pair, long, Some(varying)),
            soa_literal_values(&lengths),
            "independent short-outer-leaf cache mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn soa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn soa_hash_coord(hash: &mut AuditSha256, coord: SOACoord) {
    hash.update(&[coord.infinite as u8]);
    hash.update(&coord.value.to_le_bytes());
}

fn soa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn soa_coefficient_leaf(
    coords: &[SOACoord; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-leaf-coefficient-v1\0");
    for &coord in coords { soa_hash_coord(&mut hash, coord); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { soa_hash_z(&mut hash, value); } }
    soa_sha_bytes(hash)
}

fn soa_finite_leaf(coords: &[SOACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-leaf-finite-v1\0");
    for &coord in coords { soa_hash_coord(&mut hash, coord); }
    hash.update(&order.to_le_bytes());
    for &value in values { soa_hash_z(&mut hash, value); }
    soa_sha_bytes(hash)
}

fn soa_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn soa_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    soa_degree_ok(rows)
}

fn soa_formula_coefficients(
    coords: &[SOACoord; 11],
    pair: SOAPair,
    long: SOALongArm,
    literal: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let fixed = soa_fixed(pair, long, varying);
    let mut lengths = soa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = soa_values_with_fixed(&lengths, fixed);
        if literal && (point == 0 || point == 13) {
            assert_eq!(values, soa_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(soa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = soa_values_with_fixed(&lengths, fixed);
    if literal {
        assert_eq!(unseen, soa_literal_values(&lengths));
        checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, checks)
}

fn soa_literal_coefficients(coords: &[SOACoord; 11]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let mut lengths = soa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = soa_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(soa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = soa_literal_values(&lengths);
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows)
}

fn soa_smoke_stream() {
    let pairs = soa_pair_table();
    let longs = soa_long_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pair = pairs[(sample * 131 + 17) % pairs.len()];
        let long = longs[(sample * 104_729 + 23) % longs.len()];
        let coords = soa_coords(pair, long);
        if !coords.iter().any(|coord| coord.infinite) {
            let lengths = soa_lengths(&coords);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = soa_literal_values(&lengths);
                finite.update(&soa_finite_leaf(&coords, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = soa_literal_coefficients(&coords);
        if !soa_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&soa_coefficient_leaf(&coords, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct SOAResult {
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

fn soa_worker(
    worker: usize,
    pairs: Arc<Vec<SOAPair>>,
    longs: Arc<Vec<SOALongArm>>,
) -> SOAResult {
    let start = SOA_BOUNDS[worker];
    let end = SOA_BOUNDS[worker + 1];
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
            let coords = soa_coords(pair, long);
            let long_count = coords.iter().filter(|coord| coord.infinite).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = soa_lengths(&coords);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let fast = soa_values(&lengths, pair, long, None);
                let direct = soa_literal_values(&lengths);
                assert_eq!(fast, direct);
                assert!(direct.iter().all(|value| value.is_positive()));
                finite.update(&soa_finite_leaf(&coords, order, &direct));
                finite_records += 1;
                counts[1] += 1;
                literal += 1;
                continue;
            }
            if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checks) =
                soa_formula_coefficients(&coords, pair, long, true);
            audit_assert_gate(&rows);
            coefficient.update(&soa_coefficient_leaf(&coords, baseline, shift, &rows));
            coefficient_records += 1;
            counts[4] += 1;
            unseen += 4;
            literal += checks;
        }
    }
    SOAResult {
        worker, start, end, counts, unseen, literal,
        coefficient_records, finite_records,
        coefficient_digest: soa_sha_bytes(coefficient),
        finite_digest: soa_sha_bytes(finite),
    }
}

fn soa_root_stream(results: &[SOAResult], coefficient: bool) -> String {
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

fn soa_full() {
    let pairs = Arc::new(soa_pair_table());
    let longs = Arc::new(soa_long_table());
    let mut handles = Vec::new();
    for worker in 0..SOA_THREADS {
        let pair_table = Arc::clone(&pairs);
        let long_table = Arc::clone(&longs);
        handles.push(thread::spawn(move || soa_worker(worker, pair_table, long_table)));
    }
    let mut results: Vec<SOAResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("audit worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, SOA_BOUNDS[worker]);
        assert_eq!(result.end, SOA_BOUNDS[worker + 1]);
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
    assert_eq!(counts, [266_827_932, 264_323_724, 991_987_555, 1, 991_987_556]);
    assert_eq!(unseen, 3_967_950_224);
    assert_eq!(literal, 3_240_286_392);
    assert_eq!(results.iter().map(|r| r.coefficient_records).sum::<u64>(), counts[4]);
    assert_eq!(results.iter().map(|r| r.finite_records).sum::<u64>(), counts[1]);
    let coefficient_stream = soa_root_stream(&results, true);
    let finite_stream = soa_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF\n",
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
        "rank8_delta03_e5_five_cubic_t_short_outer_leaf_literal_i256_raw_agent_20260824.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { soa_independent_smoke(); soa_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => soa_full(),
    }
}
