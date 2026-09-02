// Independent checked-i256 audit for
// four_cubic_path:outer_spine_internal.
//
// The producer splits the matching polynomial at the selected degree-two
// root.  This audit instead orients the whole suppressed path from the left
// outer cubic B0 through the selected root and then forward through
// B1--B2--B3.  The root-deleted forest is derived separately as the product
// of its left component and a right component in which the severed root arm
// is an ordinary pendant at B1.  A full run expands every eligible finite
// tree and the S=0,13,29 trees on every Newton ray.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const OSA_THREADS: usize = 6;
const OSA_BATCH_PREFIXES: usize = 12;

#[derive(Clone, Copy)]
struct OSAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct OSAPair {
    low: OSAState,
    high: OSAState,
}

#[derive(Clone, Copy)]
struct OSATransfer {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct OSAPrefix {
    left_gap: OSAState,
    left_pair: OSAPair,
    right_gap: OSAState,
    left_to_root: OSATransfer,
}

#[derive(Clone, Copy)]
struct OSARight {
    first_inner: OSAState,
    middle_spine: OSAState,
    second_inner: OSAState,
    final_spine: OSAState,
    far_pair: OSAPair,
}

fn osa_gap(length: i32) -> OSAState {
    OSAState { length, is_long: length == 7 }
}

fn osa_pendant(length: i32) -> OSAState {
    OSAState { length, is_long: length == 7 }
}

fn osa_spine(length: i32) -> OSAState {
    OSAState { length, is_long: length == 8 }
}

fn osa_pairs() -> Vec<OSAPair> {
    let mut pairs = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            pairs.push(OSAPair {
                low: osa_pendant(low),
                high: osa_pendant(high),
            });
        }
    }
    assert_eq!(pairs.len(), 28);
    pairs
}

// Given the absent/present states at the far endpoint of a path, return the
// contribution conditional on the near endpoint being absent/present.  The
// present state deliberately omits the near endpoint's own x factor.
fn osa_cross_path(
    far_absent: V,
    far_present: V,
    edge_length: i32,
) -> OSATransfer {
    OSATransfer {
        parent_absent: add(
            &mul(&path(edge_length - 1), &far_absent),
            &mul(&path(edge_length - 2), &far_present),
        ),
        parent_present: add(
            &mul(&path(edge_length - 2), &far_absent),
            &mul(&path(edge_length - 3), &far_present),
        ),
    }
}

fn osa_left_component_to_root(gap: i32, low: i32, high: i32) -> OSATransfer {
    let b0_absent = mul(&path(low), &path(high));
    let b0_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    osa_cross_path(b0_absent, b0_present, gap + 1)
}

fn osa_finish_at_right_end(
    b1_absent: V,
    b1_present: V,
    middle_spine: i32,
    second_inner: i32,
    final_spine: i32,
    far_low: i32,
    far_high: i32,
) -> V {
    let at_b2 = osa_cross_path(b1_absent, b1_present, middle_spine);
    let b2_absent = mul(&path(second_inner), &at_b2.parent_absent);
    let b2_present = shifted(
        &mul(&path(second_inner - 1), &at_b2.parent_present),
        1,
    );
    let at_b3 = osa_cross_path(b2_absent, b2_present, final_spine);
    let b3_absent = product(&[
        path(far_low),
        path(far_high),
        at_b3.parent_absent,
    ]);
    let b3_present = shifted(
        &product(&[
            path(far_low - 1),
            path(far_high - 1),
            at_b3.parent_present,
        ]),
        1,
    );
    add(&b3_absent, &b3_present)
}

fn osa_polynomials_from_left(
    left_to_root: OSATransfer,
    lengths: &[i32; 10],
) -> (V, V) {
    // Full tree: include the root's x only in its present state, propagate
    // across the right root segment, and then walk B1 -> B2 -> B3.
    let root_absent = left_to_root.parent_absent;
    let root_present = shifted(&left_to_root.parent_present, 1);
    let root_at_b1 = osa_cross_path(root_absent, root_present, lengths[3] + 1);
    let b1_absent = mul(&path(lengths[4]), &root_at_b1.parent_absent);
    let b1_present = shifted(
        &mul(&path(lengths[4] - 1), &root_at_b1.parent_present),
        1,
    );
    let core = osa_finish_at_right_end(
        b1_absent,
        b1_present,
        lengths[5],
        lengths[6],
        lengths[7],
        lengths[8],
        lengths[9],
    );

    // Deleted root: the left component is exactly its root-absent message.
    // On the right, the remaining right-gap vertices form a pendant at B1.
    let deleted_b1_absent = mul(&path(lengths[3]), &path(lengths[4]));
    let deleted_b1_present = shifted(
        &mul(&path(lengths[3] - 1), &path(lengths[4] - 1)),
        1,
    );
    let deleted_right = osa_finish_at_right_end(
        deleted_b1_absent,
        deleted_b1_present,
        lengths[5],
        lengths[6],
        lengths[7],
        lengths[8],
        lengths[9],
    );
    (core, mul(&left_to_root.parent_absent, &deleted_right))
}

fn osa_formula_polynomials(lengths: &[i32; 10]) -> (V, V) {
    let left = osa_left_component_to_root(lengths[0], lengths[1], lengths[2]);
    osa_polynomials_from_left(left, lengths)
}

fn osa_values(
    lengths: &[i32; 10],
    prefix: OSAPrefix,
    varying: Option<usize>,
) -> [Z; 4] {
    let left = if varying.is_some_and(|index| index <= 2) {
        osa_left_component_to_root(lengths[0], lengths[1], lengths[2])
    } else {
        prefix.left_to_root
    };
    let (core, deleted) = osa_polynomials_from_left(left, lengths);
    deltas03(&core, &deleted)
}

fn osa_prefixes() -> Vec<OSAPrefix> {
    let pairs = osa_pairs();
    let mut prefixes = Vec::with_capacity(1_792);
    for left_gap in 0..=7_i32 {
        for &left_pair in &pairs {
            for right_gap in 0..=7_i32 {
                prefixes.push(OSAPrefix {
                    left_gap: osa_gap(left_gap),
                    left_pair,
                    right_gap: osa_gap(right_gap),
                    left_to_root: osa_left_component_to_root(
                        left_gap,
                        left_pair.low.length,
                        left_pair.high.length,
                    ),
                });
            }
        }
    }
    assert_eq!(prefixes.len(), 1_792);
    prefixes
}

fn osa_right_states() -> Vec<OSARight> {
    let pairs = osa_pairs();
    let mut rights = Vec::with_capacity(87_808);
    for first_inner in 1..=7_i32 {
        for middle_spine in 1..=8_i32 {
            for second_inner in 1..=7_i32 {
                for final_spine in 1..=8_i32 {
                    for &far_pair in &pairs {
                        rights.push(OSARight {
                            first_inner: osa_pendant(first_inner),
                            middle_spine: osa_spine(middle_spine),
                            second_inner: osa_pendant(second_inner),
                            final_spine: osa_spine(final_spine),
                            far_pair,
                        });
                    }
                }
            }
        }
    }
    assert_eq!(rights.len(), 87_808);
    rights
}

fn osa_states(prefix: OSAPrefix, right: OSARight) -> [OSAState; 10] {
    [
        prefix.left_gap,
        prefix.left_pair.low,
        prefix.left_pair.high,
        prefix.right_gap,
        right.first_inner,
        right.middle_spine,
        right.second_inner,
        right.final_spine,
        right.far_pair.low,
        right.far_pair.high,
    ]
}

fn osa_lengths(states: &[OSAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn osa_grow_path(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut endpoint = start;
    for _ in 0..length {
        let next = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[endpoint].push(next);
        adjacency[next].push(endpoint);
        endpoint = next;
    }
    endpoint
}

fn osa_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];

    let b0 = osa_grow_path(&mut adjacency, root, lengths[0] + 1);
    osa_grow_path(&mut adjacency, b0, lengths[1]);
    osa_grow_path(&mut adjacency, b0, lengths[2]);

    let b1 = osa_grow_path(&mut adjacency, root, lengths[3] + 1);
    osa_grow_path(&mut adjacency, b1, lengths[4]);
    let b2 = osa_grow_path(&mut adjacency, b1, lengths[5]);
    osa_grow_path(&mut adjacency, b2, lengths[6]);
    let b3 = osa_grow_path(&mut adjacency, b2, lengths[7]);
    osa_grow_path(&mut adjacency, b3, lengths[8]);
    osa_grow_path(&mut adjacency, b3, lengths[9]);

    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (adjacency.len() - 1),
    );
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn osa_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = osa_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn osa_smoke() {
    let mut random = 0x243F6A8885A308D3_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 0 || index == 3 {
                (random % 19) as i32
            } else {
                1 + (random % 19) as i32
            };
        }
        let (core, deleted) = osa_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            osa_literal_values(&lengths),
            "forward formula smoke mismatch {}",
            sample,
        );
    }

    let prefixes = osa_prefixes();
    let rights = osa_right_states();
    for sample in 0..512_usize {
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let prefix = prefixes[random as usize % prefixes.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let right = rights[random as usize % rights.len()];
        let mut lengths = osa_lengths(&osa_states(prefix, right));
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = random as usize % 10;
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            osa_values(&lengths, prefix, Some(varying)),
            osa_literal_values(&lengths),
            "cached formula smoke mismatch {}",
            sample,
        );
    }
    println!("PASS_INDEPENDENT_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL_1024_LITERAL_SMOKE");
}

fn osa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow");
    hash.buffer[hash.used] = 0x80;
    hash.used += 1;
    if hash.used > 56 {
        for index in hash.used..64 {
            hash.buffer[index] = 0;
        }
        let block = hash.buffer;
        hash.block(&block);
        hash.buffer = [0; 64];
        hash.used = 0;
    }
    for index in hash.used..56 {
        hash.buffer[index] = 0;
    }
    hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block = hash.buffer;
    hash.block(&block);
    let mut out = [0_u8; 32];
    for index in 0..8 {
        out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes());
    }
    out
}

fn osa_hash_state(hash: &mut AuditSha256, state: OSAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn osa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs {
        hash.update(&limb.to_le_bytes());
    }
}

fn osa_coefficient_leaf(
    states: &[OSAState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-spine-internal-coefficient-v1\0");
    for &state in states {
        osa_hash_state(&mut hash, state);
    }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row {
            osa_hash_z(&mut hash, value);
        }
    }
    osa_sha_bytes(hash)
}

fn osa_finite_leaf(
    states: &[OSAState; 10],
    order: i32,
    values: &[Z; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-spine-internal-finite-v1\0");
    for &state in states {
        osa_hash_state(&mut hash, state);
    }
    hash.update(&order.to_le_bytes());
    for &value in values {
        osa_hash_z(&mut hash, value);
    }
    osa_sha_bytes(hash)
}

fn osa_smoke_stream() {
    let prefixes = osa_prefixes();
    let rights = osa_right_states();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let right = rights[(sample * 104729 + 23) % rights.len()];
        let states = osa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let mut lengths = osa_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = osa_values(&lengths, prefix, None);
                finite_stream.update(&osa_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let baseline = 3 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = osa_values(&lengths, prefix, Some(varying));
            for rank in 0..4 {
                samples[rank][point] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(&osa_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!(
        "SMOKE_STREAM {} {}",
        coefficient_stream.hex(),
        finite_stream.hex(),
    );
}

struct OSAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn osa_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<OSAPrefix>>,
    rights: Arc<Vec<OSARight>>,
) -> OSAResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();

    for &right in rights.iter() {
        let states = osa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = osa_lengths(&states);

        if long_count == 0 {
            counts[0] += 1;
            let order = 3 + lengths.iter().sum::<i32>();
            if order < 27 {
                continue;
            }
            let values = osa_values(&lengths, prefix, None);
            assert_eq!(values, osa_literal_values(&lengths), "finite literal mismatch");
            assert!(
                values.iter().all(|value| value.is_positive()),
                "finite nonpositive",
            );
            finite_leaves.extend_from_slice(&osa_finite_leaf(&states, order, &values));
            literal_trees += 1;
            counts[1] += 1;
            continue;
        }

        if long_count == 10 {
            counts[3] += 1;
        } else {
            counts[2] += 1;
        }
        let baseline = 3 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32;
            let values = osa_values(&lengths, prefix, Some(varying));
            if sample == 0 || sample == 13 {
                assert_eq!(values, osa_literal_values(&lengths), "ray literal mismatch");
                literal_trees += 1;
            }
            for rank in 0..4 {
                samples[rank][sample] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&osa_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));

        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = osa_values(&lengths, prefix, Some(varying));
        assert_eq!(next, osa_literal_values(&lengths), "unseen literal mismatch");
        literal_trees += 1;
        for rank in 0..4 {
            assert_eq!(
                next[rank],
                audit_newton_at_29(&coefficients[rank]),
                "unseen Newton mismatch",
            );
            unseen += 1;
        }
        counts[4] += 1;
    }

    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    OSAResult {
        prefix_index,
        counts,
        unseen,
        literal_trees,
        coefficient_leaves,
        finite_leaves,
    }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        osa_smoke();
        osa_smoke_stream();
        return;
    }

    let prefixes = Arc::new(osa_prefixes());
    let rights = Arc::new(osa_right_states());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();

    for batch_start in (0..prefixes.len()).step_by(OSA_BATCH_PREFIXES) {
        let batch_end = (batch_start + OSA_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..OSA_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let right_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(osa_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&right_copy),
                    ));
                    prefix_index += OSA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<OSAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("audit worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 {
                counts[index] += result.counts[index];
            }
            unseen += result.unseen;
            literal_trees += result.literal_trees;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("AUDIT PREFIXES {}/{}", batch_end, prefixes.len());
    }

    assert_eq!(
        counts,
        [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660],
    );
    assert_eq!(unseen, 476_934_640);
    assert_eq!(literal_trees, 394_844_751);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_TREES {}\n",
            "LITERAL_RAY_POINTS 0 13 29\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0],
        counts[1],
        counts[2],
        counts[3],
        counts[4],
        unseen,
        literal_trees,
        coefficient_master.hex(),
        finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_outer_spine_internal_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    )
    .expect("audit raw write");
    print!("{}", raw);
}
