// Independent, memory-bounded exact audit for
// four_cubic_path:outer_pendant_internal.
//
// Unlike the producer's far-to-root cached dynamic program, this source
// propagates two independently transcribed full/deleted states from the
// selected root through B0--B1--B2--B3.  The full run also expands every
// eligible finite tree and S=0,S=13,S=29 on every ray as literal adjacency
// lists evaluated by the generic forest DP.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const OPA_THREADS: usize = 6;
const OPA_BATCH_PREFIXES: usize = 12;

#[derive(Clone, Copy)]
struct OPAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct OPAPair {
    low: OPAState,
    high: OPAState,
}

#[derive(Clone, Copy)]
struct OPATransfer {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct OPAPrefix {
    near_gap: OPAState,
    tail: OPAState,
    sibling: OPAState,
    first_spine: OPAState,
    full_to_b1: OPATransfer,
    deleted_to_b1: OPATransfer,
    deleted_tail: V,
}

#[derive(Clone, Copy)]
struct OPARight {
    left_inner: OPAState,
    middle_spine: OPAState,
    right_inner: OPAState,
    final_spine: OPAState,
    far_pair: OPAPair,
}

fn opa_near(length: i32) -> OPAState {
    OPAState { length, is_long: length == 7 }
}

fn opa_pendant(length: i32) -> OPAState {
    OPAState { length, is_long: length == 7 }
}

fn opa_spine(length: i32) -> OPAState {
    OPAState { length, is_long: length == 8 }
}

fn opa_pairs() -> Vec<OPAPair> {
    let mut pairs = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            pairs.push(OPAPair {
                low: opa_pendant(low),
                high: opa_pendant(high),
            });
        }
    }
    assert_eq!(pairs.len(), 28);
    pairs
}

fn opa_transfer(
    child_absent: V,
    child_present: V,
    edge_length: i32,
) -> OPATransfer {
    OPATransfer {
        parent_absent: add(
            &mul(&path(edge_length - 1), &child_absent),
            &mul(&path(edge_length - 2), &child_present),
        ),
        parent_present: add(
            &mul(&path(edge_length - 2), &child_absent),
            &mul(&path(edge_length - 3), &child_present),
        ),
    }
}

fn opa_prefix_parts(lengths: &[i32; 10]) -> (OPATransfer, OPATransfer, V) {
    // Full tree: begin with the selected root's tail contribution and move
    // across the root--B0 distance near+1.
    let root_absent = path(lengths[1]);
    let root_present = shifted(&path(lengths[1] - 1), 1);
    let root_to_b0 = opa_transfer(root_absent, root_present, lengths[0] + 1);
    let b0_absent = mul(&path(lengths[2]), &root_to_b0.parent_absent);
    let b0_present = shifted(
        &mul(&path(lengths[2] - 1), &root_to_b0.parent_present),
        1,
    );
    let full_to_b1 = opa_transfer(b0_absent, b0_present, lengths[3]);

    // Root-deleted tree: the B0 component sees the near gap as an ordinary
    // pendant arm; the tail is a separate path component.
    let deleted_b0_absent = mul(&path(lengths[0]), &path(lengths[2]));
    let deleted_b0_present = shifted(
        &mul(&path(lengths[0] - 1), &path(lengths[2] - 1)),
        1,
    );
    let deleted_to_b1 = opa_transfer(
        deleted_b0_absent,
        deleted_b0_present,
        lengths[3],
    );
    (full_to_b1, deleted_to_b1, path(lengths[1]))
}

fn opa_finish_at_far(
    start: OPATransfer,
    left_inner: i32,
    middle_spine: i32,
    right_inner: i32,
    final_spine: i32,
    far_low: i32,
    far_high: i32,
) -> V {
    let b1_absent = mul(&path(left_inner), &start.parent_absent);
    let b1_present = shifted(
        &mul(&path(left_inner - 1), &start.parent_present),
        1,
    );
    let b1_to_b2 = opa_transfer(b1_absent, b1_present, middle_spine);
    let b2_absent = mul(&path(right_inner), &b1_to_b2.parent_absent);
    let b2_present = shifted(
        &mul(&path(right_inner - 1), &b1_to_b2.parent_present),
        1,
    );
    let b2_to_b3 = opa_transfer(b2_absent, b2_present, final_spine);
    let b3_absent = product(&[
        path(far_low),
        path(far_high),
        b2_to_b3.parent_absent,
    ]);
    let b3_present = shifted(
        &product(&[
            path(far_low - 1),
            path(far_high - 1),
            b2_to_b3.parent_present,
        ]),
        1,
    );
    add(&b3_absent, &b3_present)
}

fn opa_polys_from_parts(
    full_to_b1: OPATransfer,
    deleted_to_b1: OPATransfer,
    deleted_tail: V,
    lengths: &[i32; 10],
) -> (V, V) {
    let full = opa_finish_at_far(
        full_to_b1,
        lengths[4],
        lengths[5],
        lengths[6],
        lengths[7],
        lengths[8],
        lengths[9],
    );
    let deleted_rest = opa_finish_at_far(
        deleted_to_b1,
        lengths[4],
        lengths[5],
        lengths[6],
        lengths[7],
        lengths[8],
        lengths[9],
    );
    (full, mul(&deleted_tail, &deleted_rest))
}

fn opa_formula_polys(lengths: &[i32; 10]) -> (V, V) {
    let (full_to_b1, deleted_to_b1, deleted_tail) = opa_prefix_parts(lengths);
    opa_polys_from_parts(full_to_b1, deleted_to_b1, deleted_tail, lengths)
}

fn opa_values(
    lengths: &[i32; 10],
    prefix: OPAPrefix,
    varying: Option<usize>,
) -> [Z; 4] {
    let (full_to_b1, deleted_to_b1, deleted_tail) =
        if varying.is_some_and(|index| index <= 3) {
            opa_prefix_parts(lengths)
        } else {
            (prefix.full_to_b1, prefix.deleted_to_b1, prefix.deleted_tail)
        };
    let (core, deleted) = opa_polys_from_parts(
        full_to_b1,
        deleted_to_b1,
        deleted_tail,
        lengths,
    );
    deltas03(&core, &deleted)
}

fn opa_prefixes() -> Vec<OPAPrefix> {
    let mut prefixes = Vec::with_capacity(3136);
    for near_length in 0..=7_i32 {
        for tail_length in 1..=7_i32 {
            for sibling_length in 1..=7_i32 {
                for first_length in 1..=8_i32 {
                    let lengths = [
                        near_length,
                        tail_length,
                        sibling_length,
                        first_length,
                        1, 1, 1, 1, 1, 1,
                    ];
                    let (full_to_b1, deleted_to_b1, deleted_tail) =
                        opa_prefix_parts(&lengths);
                    prefixes.push(OPAPrefix {
                        near_gap: opa_near(near_length),
                        tail: opa_pendant(tail_length),
                        sibling: opa_pendant(sibling_length),
                        first_spine: opa_spine(first_length),
                        full_to_b1,
                        deleted_to_b1,
                        deleted_tail,
                    });
                }
            }
        }
    }
    assert_eq!(prefixes.len(), 3136);
    prefixes
}

fn opa_rights() -> Vec<OPARight> {
    let pairs = opa_pairs();
    let mut rights = Vec::with_capacity(87_808);
    for left_inner_length in 1..=7_i32 {
        for middle_length in 1..=8_i32 {
            for right_inner_length in 1..=7_i32 {
                for final_length in 1..=8_i32 {
                    for &far_pair in &pairs {
                        rights.push(OPARight {
                            left_inner: opa_pendant(left_inner_length),
                            middle_spine: opa_spine(middle_length),
                            right_inner: opa_pendant(right_inner_length),
                            final_spine: opa_spine(final_length),
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

fn opa_states(prefix: OPAPrefix, right: OPARight) -> [OPAState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.sibling,
        prefix.first_spine,
        right.left_inner,
        right.middle_spine,
        right.right_inner,
        right.final_spine,
        right.far_pair.low,
        right.far_pair.high,
    ]
}

fn opa_lengths(states: &[OPAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn opa_append(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut previous = start;
    for _ in 0..length {
        let vertex = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[previous].push(vertex);
        adjacency[vertex].push(previous);
        previous = vertex;
    }
    previous
}

fn opa_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    let b0 = opa_append(&mut adjacency, root, lengths[0] + 1);
    opa_append(&mut adjacency, root, lengths[1]);
    opa_append(&mut adjacency, b0, lengths[2]);
    let b1 = opa_append(&mut adjacency, b0, lengths[3]);
    opa_append(&mut adjacency, b1, lengths[4]);
    let b2 = opa_append(&mut adjacency, b1, lengths[5]);
    opa_append(&mut adjacency, b2, lengths[6]);
    let b3 = opa_append(&mut adjacency, b2, lengths[7]);
    opa_append(&mut adjacency, b3, lengths[8]);
    opa_append(&mut adjacency, b3, lengths[9]);
    assert_eq!(
        adjacency.len(),
        2 + lengths.iter().sum::<i32>() as usize,
    );
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (adjacency.len() - 1),
    );
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn opa_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = opa_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn opa_smoke() {
    let mut state = 0xE7037ED1A0B428DB_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 {
                (state % 19) as i32
            } else {
                1 + (state % 19) as i32
            };
        }
        let (core, deleted) = opa_formula_polys(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            opa_literal_values(&lengths),
            "independent formula smoke mismatch {}", sample,
        );
    }

    let prefixes = opa_prefixes();
    let rights = opa_rights();
    for sample in 0..512_usize {
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let prefix = prefixes[state as usize % prefixes.len()];
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let right = rights[state as usize % rights.len()];
        let mut lengths = opa_lengths(&opa_states(prefix, right));
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = state as usize % 10;
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        lengths[varying] += (state % 19) as i32;
        assert_eq!(
            opa_values(&lengths, prefix, Some(varying)),
            opa_literal_values(&lengths),
            "cached smoke mismatch {}", sample,
        );
    }
    println!(
        "PASS_INDEPENDENT_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL_1024_LITERAL_SMOKE"
    );
}

fn opa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn opa_hash_state(hash: &mut AuditSha256, state: OPAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn opa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn opa_coefficient_leaf(
    states: &[OPAState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-pendant-internal-coefficient-v1\0");
    for &state in states { opa_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { opa_hash_z(&mut hash, value); } }
    opa_sha_bytes(hash)
}

fn opa_finite_leaf(states: &[OPAState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-pendant-internal-finite-v1\0");
    for &state in states { opa_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { opa_hash_z(&mut hash, value); }
    opa_sha_bytes(hash)
}

fn opa_smoke_stream() {
    let prefixes = opa_prefixes();
    let rights = opa_rights();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let right = rights[(sample * 104729 + 23) % rights.len()];
        let states = opa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let mut lengths = opa_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = opa_values(&lengths, prefix, None);
                finite_stream.update(&opa_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let baseline = 2 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = opa_values(&lengths, prefix, Some(varying));
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(
            &opa_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!(
        "SMOKE_STREAM {} {}",
        coefficient_stream.hex(),
        finite_stream.hex(),
    );
}

struct OPAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn opa_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<OPAPrefix>>,
    rights: Arc<Vec<OPARight>>,
) -> OPAResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for &right in rights.iter() {
        let states = opa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = opa_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = opa_values(&lengths, prefix, None);
            assert_eq!(values, opa_literal_values(&lengths), "finite literal mismatch");
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&opa_finite_leaf(&states, order, &values));
            literal_trees += 1;
            counts[1] += 1;
            continue;
        }
        if long_count == 10 { counts[3] += 1; } else { counts[2] += 1; }
        let baseline = 2 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32;
            let values = opa_values(&lengths, prefix, Some(varying));
            if sample == 0 || sample == 13 {
                assert_eq!(values, opa_literal_values(&lengths), "ray literal mismatch");
                literal_trees += 1;
            }
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &opa_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = opa_values(&lengths, prefix, Some(varying));
        assert_eq!(next, opa_literal_values(&lengths), "unseen literal mismatch");
        literal_trees += 1;
        for rank in 0..4 {
            assert_eq!(
                next[rank], audit_newton_at_29(&coefficients[rank]),
                "unseen mismatch",
            );
            unseen += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    OPAResult {
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
        opa_smoke();
        opa_smoke_stream();
        return;
    }
    let prefixes = Arc::new(opa_prefixes());
    let rights = Arc::new(opa_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();

    for batch_start in (0..prefixes.len()).step_by(OPA_BATCH_PREFIXES) {
        let batch_end = (batch_start + OPA_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..OPA_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(opa_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&rights_copy),
                    ));
                    prefix_index += OPA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<OPAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("audit worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal_trees += result.literal_trees;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("AUDIT PREFIXES {}/{}", batch_end, prefixes.len());
    }
    assert_eq!(
        counts,
        [65_345_616, 63_768_530, 210_020_271, 1, 210_020_272],
    );
    assert_eq!(unseen, 840_081_088);
    assert_eq!(literal_trees, 693_829_346);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_TREES {}\n",
            "LITERAL_RAY_POINTS 0 13 29\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_trees, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}
