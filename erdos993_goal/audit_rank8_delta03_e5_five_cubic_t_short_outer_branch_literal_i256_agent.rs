// Independently transcribed checked-i256 audit for five_cubic_t:short_outer_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const SA_THREADS: usize = 6;
const SA_BOUNDS: [usize; 7] = [0, 40, 79, 118, 157, 193, 224];

#[derive(Clone, Copy)]
struct SACoord {
    value: i32,
    infinite: bool,
}

#[derive(Clone, Copy)]
struct SAMessage {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct SAArm {
    link: SACoord,
    leaf_low: SACoord,
    leaf_high: SACoord,
    message: SAMessage,
}

#[derive(Clone, Copy)]
struct SAFar {
    center_middle: SACoord,
    middle_leaf: SACoord,
    middle_outer: SACoord,
    outer_low: SACoord,
    outer_high: SACoord,
    middle_message: SAMessage,
}

#[derive(Clone, Copy)]
struct SAFixed {
    moving_group: usize,
    root_link: i32,
    root_low: i32,
    root_high: i32,
    other_message: SAMessage,
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
    middle_message: SAMessage,
}

fn sa_leaf(value: i32) -> SACoord {
    SACoord { value, infinite: value == 7 }
}

fn sa_link(value: i32) -> SACoord {
    SACoord { value, infinite: value == 8 }
}

// Send the two-state message across a path whose edge-count coordinate is d.
fn sa_send(absent: V, present: V, d: i32) -> SAMessage {
    SAMessage {
        parent_absent: add(
            &mul(&path(d - 1), &absent),
            &mul(&path(d - 2), &present),
        ),
        parent_present: add(
            &mul(&path(d - 2), &absent),
            &mul(&path(d - 3), &present),
        ),
    }
}

fn sa_leaf_message(length: i32) -> SAMessage {
    SAMessage {
        parent_absent: path(length),
        parent_present: path(length - 1),
    }
}

fn sa_join_and_send(first: SAMessage, second: SAMessage, link: i32) -> SAMessage {
    let branch_absent = mul(&first.parent_absent, &second.parent_absent);
    let branch_present = shifted(
        &mul(&first.parent_present, &second.parent_present),
        1,
    );
    sa_send(branch_absent, branch_present, link)
}

fn sa_arm_message(link: i32, low: i32, high: i32) -> SAMessage {
    sa_join_and_send(sa_leaf_message(low), sa_leaf_message(high), link)
}

fn sa_middle_message(
    center_middle: i32,
    middle_leaf: i32,
    middle_outer: i32,
    outer_low: i32,
    outer_high: i32,
) -> SAMessage {
    sa_join_and_send(
        sa_leaf_message(middle_leaf),
        sa_arm_message(middle_outer, outer_low, outer_high),
        center_middle,
    )
}

fn sa_center_message(
    root_link: i32,
    other: SAMessage,
    middle: SAMessage,
) -> SAMessage {
    sa_join_and_send(other, middle, root_link)
}

fn sa_root_polynomials(
    root_low: i32,
    root_high: i32,
    center: SAMessage,
) -> (V, V) {
    let root_absent = product(&[
        path(root_low),
        path(root_high),
        center.parent_absent,
    ]);
    let root_present = shifted(
        &product(&[
            path(root_low - 1),
            path(root_high - 1),
            center.parent_present,
        ]),
        1,
    );
    (add(&root_absent, &root_present), root_absent)
}

fn sa_arm_table() -> Vec<SAArm> {
    let mut table = Vec::with_capacity(224);
    for link in 1..=8_i32 {
        for low in 1..=7_i32 {
            for high in low..=7_i32 {
                table.push(SAArm {
                    link: sa_link(link),
                    leaf_low: sa_leaf(low),
                    leaf_high: sa_leaf(high),
                    message: sa_arm_message(link, low, high),
                });
            }
        }
    }
    assert_eq!(table.len(), 224);
    table
}

fn sa_far_table() -> Vec<SAFar> {
    let mut table = Vec::with_capacity(12_544);
    for outer_low in 1..=7_i32 {
        for outer_high in outer_low..=7_i32 {
            for middle_outer in 1..=8_i32 {
                for middle_leaf in 1..=7_i32 {
                    for center_middle in 1..=8_i32 {
                        table.push(SAFar {
                            center_middle: sa_link(center_middle),
                            middle_leaf: sa_leaf(middle_leaf),
                            middle_outer: sa_link(middle_outer),
                            outer_low: sa_leaf(outer_low),
                            outer_high: sa_leaf(outer_high),
                            middle_message: sa_middle_message(
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

fn sa_coords(root: SAArm, other: SAArm, far: SAFar) -> [SACoord; 11] {
    [
        root.link, root.leaf_low, root.leaf_high,
        other.link, other.leaf_low, other.leaf_high,
        far.center_middle, far.middle_leaf, far.middle_outer,
        far.outer_low, far.outer_high,
    ]
}

fn sa_lengths(coords: &[SACoord; 11]) -> [i32; 11] {
    std::array::from_fn(|index| coords[index].value)
}

fn sa_direct_polynomials(lengths: &[i32; 11]) -> (V, V) {
    let middle = sa_middle_message(
        lengths[6], lengths[7], lengths[8], lengths[9], lengths[10],
    );
    let center = sa_center_message(
        lengths[0],
        sa_arm_message(lengths[3], lengths[4], lengths[5]),
        middle,
    );
    sa_root_polynomials(lengths[1], lengths[2], center)
}

fn sa_fixed(root: SAArm, other: SAArm, far: SAFar, varying: usize) -> SAFixed {
    SAFixed {
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
        root_link: root.link.value,
        root_low: root.leaf_low.value,
        root_high: root.leaf_high.value,
        other_message: other.message,
        center_middle: far.center_middle.value,
        middle_leaf: far.middle_leaf.value,
        middle_outer: far.middle_outer.value,
        outer_low: far.outer_low.value,
        outer_high: far.outer_high.value,
        middle_message: far.middle_message,
    }
}

fn sa_values_with_fixed(lengths: &[i32; 11], fixed: SAFixed) -> [Z; 4] {
    let (low, high, center) = match fixed.moving_group {
        0 => (
            lengths[1],
            lengths[2],
            sa_center_message(lengths[0], fixed.other_message, fixed.middle_message),
        ),
        1 => (
            fixed.root_low,
            fixed.root_high,
            sa_center_message(
                fixed.root_link,
                sa_arm_message(lengths[3], lengths[4], lengths[5]),
                fixed.middle_message,
            ),
        ),
        2 => {
            let middle = sa_middle_message(
                lengths[6], fixed.middle_leaf, fixed.middle_outer,
                fixed.outer_low, fixed.outer_high,
            );
            (fixed.root_low, fixed.root_high,
             sa_center_message(fixed.root_link, fixed.other_message, middle))
        }
        3 => {
            let middle = sa_middle_message(
                fixed.center_middle, lengths[7], fixed.middle_outer,
                fixed.outer_low, fixed.outer_high,
            );
            (fixed.root_low, fixed.root_high,
             sa_center_message(fixed.root_link, fixed.other_message, middle))
        }
        4 => {
            let middle = sa_middle_message(
                fixed.center_middle, fixed.middle_leaf, lengths[8],
                fixed.outer_low, fixed.outer_high,
            );
            (fixed.root_low, fixed.root_high,
             sa_center_message(fixed.root_link, fixed.other_message, middle))
        }
        5 => {
            let middle = sa_middle_message(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer,
                lengths[9], fixed.outer_high,
            );
            (fixed.root_low, fixed.root_high,
             sa_center_message(fixed.root_link, fixed.other_message, middle))
        }
        6 => {
            let middle = sa_middle_message(
                fixed.center_middle, fixed.middle_leaf, fixed.middle_outer,
                fixed.outer_low, lengths[10],
            );
            (fixed.root_low, fixed.root_high,
             sa_center_message(fixed.root_link, fixed.other_message, middle))
        }
        _ => unreachable!(),
    };
    let (whole, deleted) = sa_root_polynomials(low, high, center);
    deltas03(&whole, &deleted)
}

fn sa_fast_values(
    lengths: &[i32; 11],
    root: SAArm,
    other: SAArm,
    far: SAFar,
    varying: Option<usize>,
) -> [Z; 4] {
    if let Some(index) = varying {
        return sa_values_with_fixed(lengths, sa_fixed(root, other, far, index));
    }
    let (whole, deleted) = sa_direct_polynomials(lengths);
    deltas03(&whole, &deleted)
}

fn sa_literal_tree(lengths: &[i32; 11]) -> (Vec<Vec<usize>>, usize) {
    let center = 0_usize;
    let mut adjacency = vec![Vec::new()];
    let rooted = audit_attach(&mut adjacency, center, lengths[0]);
    audit_attach(&mut adjacency, rooted, lengths[1]);
    audit_attach(&mut adjacency, rooted, lengths[2]);
    let other = audit_attach(&mut adjacency, center, lengths[3]);
    audit_attach(&mut adjacency, other, lengths[4]);
    audit_attach(&mut adjacency, other, lengths[5]);
    let middle = audit_attach(&mut adjacency, center, lengths[6]);
    audit_attach(&mut adjacency, middle, lengths[7]);
    let outer = audit_attach(&mut adjacency, middle, lengths[8]);
    audit_attach(&mut adjacency, outer, lengths[9]);
    audit_attach(&mut adjacency, outer, lengths[10]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 5);
    (adjacency, rooted)
}

fn sa_literal_values(lengths: &[i32; 11]) -> [Z; 4] {
    let (adjacency, root) = sa_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn sa_independent_smoke() {
    let mut random = 0xA6D3185B7C2940EF_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 11];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (whole, deleted) = sa_direct_polynomials(&lengths);
        assert_eq!(
            deltas03(&whole, &deleted),
            sa_literal_values(&lengths),
            "independent direct mismatch {}",
            sample,
        );
    }
    let arms = sa_arm_table();
    let fars = sa_far_table();
    for sample in 0..512_usize {
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let root = arms[random as usize % arms.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let other = arms[random as usize % arms.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let far = fars[random as usize % fars.len()];
        let mut lengths = sa_lengths(&sa_coords(root, other, far));
        let varying = random as usize % 11;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            sa_fast_values(&lengths, root, other, far, Some(varying)),
            sa_literal_values(&lengths),
            "independent cache mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn sa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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
        out[4 * index..4 * index + 4]
            .copy_from_slice(&hash.state[index].to_be_bytes());
    }
    out
}

fn sa_hash_coord(hash: &mut AuditSha256, coord: SACoord) {
    hash.update(&[coord.infinite as u8]);
    hash.update(&coord.value.to_le_bytes());
}

fn sa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn sa_coefficient_leaf(
    coords: &[SACoord; 11],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-branch-coefficient-v1\0");
    for &coord in coords { sa_hash_coord(&mut hash, coord); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { sa_hash_z(&mut hash, value); } }
    sa_sha_bytes(hash)
}

fn sa_finite_leaf(coords: &[SACoord; 11], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-five-cubic-t-short-outer-branch-finite-v1\0");
    for &coord in coords { sa_hash_coord(&mut hash, coord); }
    hash.update(&order.to_le_bytes());
    for &value in values { sa_hash_z(&mut hash, value); }
    sa_sha_bytes(hash)
}

fn sa_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn sa_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() {
            return false;
        }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    sa_degree_ok(rows)
}

fn sa_formula_coefficients(
    coords: &[SACoord; 11],
    root: SAArm,
    other: SAArm,
    far: SAFar,
    literal: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let fixed = sa_fixed(root, other, far, varying);
    let mut lengths = sa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = sa_values_with_fixed(&lengths, fixed);
        if literal && (point == 0 || point == 13) {
            assert_eq!(values, sa_literal_values(&lengths));
            checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(sa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = sa_values_with_fixed(&lengths, fixed);
    if literal {
        assert_eq!(unseen, sa_literal_values(&lengths));
        checks += 1;
    }
    for rank in 0..4 {
        assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank]));
    }
    (baseline, shift, rows, checks)
}

fn sa_literal_coefficients(coords: &[SACoord; 11]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = coords.iter().position(|coord| coord.infinite).expect("ray expected");
    let mut lengths = sa_lengths(coords);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = sa_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(sa_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = sa_literal_values(&lengths);
    for rank in 0..4 {
        assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank]));
    }
    (baseline, shift, rows)
}

fn sa_smoke_stream() {
    let arms = sa_arm_table();
    let fars = sa_far_table();
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let root = arms[(sample * 131 + 17) % arms.len()];
        let other = arms[(sample * 193 + 29) % arms.len()];
        let far = fars[(sample * 104_729 + 23) % fars.len()];
        let coords = sa_coords(root, other, far);
        if !coords.iter().any(|coord| coord.infinite) {
            let lengths = sa_lengths(&coords);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = sa_literal_values(&lengths);
                finite.update(&sa_finite_leaf(&coords, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = sa_literal_coefficients(&coords);
        if !sa_gate_ok(&rows) { gate_failures += 1; }
        coefficient.update(&sa_coefficient_leaf(&coords, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient.hex(), finite.hex());
}

struct SAResult {
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

fn sa_worker(
    worker: usize,
    arms: Arc<Vec<SAArm>>,
    fars: Arc<Vec<SAFar>>,
) -> SAResult {
    let start = SA_BOUNDS[worker];
    let end = SA_BOUNDS[worker + 1];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal = 0_u64;
    let mut coefficient_records = 0_u64;
    let mut finite_records = 0_u64;
    let mut coefficient = AuditSha256::new();
    let mut finite = AuditSha256::new();
    for root_index in start..end {
        let root = arms[root_index];
        for &other in arms.iter() {
            for &far in fars.iter() {
                let coords = sa_coords(root, other, far);
                let long_count = coords.iter().filter(|coord| coord.infinite).count();
                if long_count == 0 {
                    counts[0] += 1;
                    let lengths = sa_lengths(&coords);
                    let order = 1 + lengths.iter().sum::<i32>();
                    if order < 28 { continue; }
                    let fast = sa_fast_values(&lengths, root, other, far, None);
                    let direct = sa_literal_values(&lengths);
                    assert_eq!(fast, direct);
                    assert!(direct.iter().all(|value| value.is_positive()));
                    finite.update(&sa_finite_leaf(&coords, order, &direct));
                    finite_records += 1;
                    counts[1] += 1;
                    literal += 1;
                    continue;
                }
                if long_count == 11 { counts[3] += 1; } else { counts[2] += 1; }
                let (baseline, shift, rows, checks) =
                    sa_formula_coefficients(&coords, root, other, far, true);
                audit_assert_gate(&rows);
                coefficient.update(&sa_coefficient_leaf(
                    &coords, baseline, shift, &rows,
                ));
                coefficient_records += 1;
                counts[4] += 1;
                unseen += 4;
                literal += checks;
            }
        }
    }
    SAResult {
        worker, start, end, counts, unseen, literal,
        coefficient_records, finite_records,
        coefficient_digest: sa_sha_bytes(coefficient),
        finite_digest: sa_sha_bytes(finite),
    }
}

fn sa_root_stream(results: &[SAResult], coefficient: bool) -> String {
    let mut hash = AuditSha256::new();
    hash.update(if coefficient {
        b"e5-five-cubic-t-short-outer-branch-coefficient-six-shard-root-v1\0"
    } else {
        b"e5-five-cubic-t-short-outer-branch-finite-six-shard-root-v1\0"
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

fn sa_full() {
    let arms = Arc::new(sa_arm_table());
    let fars = Arc::new(sa_far_table());
    let mut handles = Vec::new();
    for worker in 0..SA_THREADS {
        let arm_table = Arc::clone(&arms);
        let far_table = Arc::clone(&fars);
        handles.push(thread::spawn(move || sa_worker(worker, arm_table, far_table)));
    }
    let mut results: Vec<SAResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("audit worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    for (worker, result) in results.iter().enumerate() {
        assert_eq!(result.worker, worker);
        assert_eq!(result.start, SA_BOUNDS[worker]);
        assert_eq!(result.end, SA_BOUNDS[worker + 1]);
        if worker > 0 { assert_eq!(results[worker - 1].end, result.start); }
    }
    assert_eq!(results.first().unwrap().start, 0);
    assert_eq!(results.last().unwrap().end, arms.len());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal = 0_u64;
    for result in &results {
        for index in 0..5 { counts[index] += result.counts[index]; }
        unseen += result.unseen;
        literal += result.literal;
    }
    assert_eq!(
        counts,
        [133_413_966, 131_875_095, 495_993_777, 1, 495_993_778],
    );
    assert_eq!(unseen, 1_983_975_112);
    assert_eq!(literal, 1_619_856_429);
    assert_eq!(
        results.iter().map(|result| result.coefficient_records).sum::<u64>(),
        counts[4],
    );
    assert_eq!(
        results.iter().map(|result| result.finite_records).sum::<u64>(),
        counts[1],
    );
    let coefficient_stream = sa_root_stream(&results, true);
    let finite_stream = sa_root_stream(&results, false);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH\n",
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
        "rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { sa_independent_smoke(); sa_smoke_stream(); }
        Some(value) => panic!("unknown mode {}", value),
        None => sa_full(),
    }
}
