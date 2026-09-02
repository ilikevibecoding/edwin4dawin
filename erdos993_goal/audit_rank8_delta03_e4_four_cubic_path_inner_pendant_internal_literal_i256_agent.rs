// Independent, memory-bounded exact audit for
// four_cubic_path:inner_pendant_internal.
//
// This engine propagates independent full/deleted states from the selected
// root and left outer cubic into B1 and then forward through B2--B3.  It does
// not call the producer's root-centered left/right combination.  The full run
// expands every eligible finite tree and S=0,S=13,S=29 on every ray.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const IPA_THREADS: usize = 6;
const IPA_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct IPAState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct IPAPair { low: IPAState, high: IPAState }

#[derive(Clone, Copy)]
struct IPATransfer { parent_absent: V, parent_present: V }

#[derive(Clone, Copy)]
struct IPAPrefix {
    near_gap: IPAState,
    tail: IPAState,
    left_pair: IPAPair,
    left_spine: IPAState,
    full_b1_absent: V,
    full_b1_present: V,
    deleted_b1_absent: V,
    deleted_b1_present: V,
    deleted_tail: V,
}

#[derive(Clone, Copy)]
struct IPARight {
    middle_spine: IPAState,
    other_inner: IPAState,
    final_spine: IPAState,
    right_pair: IPAPair,
}

fn ipa_near(length: i32) -> IPAState {
    IPAState { length, is_long: length == 7 }
}

fn ipa_pendant(length: i32) -> IPAState {
    IPAState { length, is_long: length == 7 }
}

fn ipa_spine(length: i32) -> IPAState {
    IPAState { length, is_long: length == 8 }
}

fn ipa_pairs() -> Vec<IPAPair> {
    let mut out = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            out.push(IPAPair {
                low: ipa_pendant(low),
                high: ipa_pendant(high),
            });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn ipa_transfer(
    child_absent: V,
    child_present: V,
    edge_length: i32,
) -> IPATransfer {
    IPATransfer {
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

fn ipa_outer_to_b1(low: i32, high: i32, spine: i32) -> IPATransfer {
    let absent = mul(&path(low), &path(high));
    let present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    ipa_transfer(absent, present, spine)
}

fn ipa_prefix_parts(lengths: &[i32; 10]) -> (V, V, V, V, V) {
    let left = ipa_outer_to_b1(lengths[2], lengths[3], lengths[4]);

    let root_absent = path(lengths[1]);
    let root_present = shifted(&path(lengths[1] - 1), 1);
    let root_to_b1 = ipa_transfer(root_absent, root_present, lengths[0] + 1);
    let full_b1_absent = mul(&left.parent_absent, &root_to_b1.parent_absent);
    let full_b1_present = shifted(
        &mul(&left.parent_present, &root_to_b1.parent_present),
        1,
    );

    let deleted_b1_absent = mul(&path(lengths[0]), &left.parent_absent);
    let deleted_b1_present = shifted(
        &mul(&path(lengths[0] - 1), &left.parent_present),
        1,
    );
    (
        full_b1_absent,
        full_b1_present,
        deleted_b1_absent,
        deleted_b1_present,
        path(lengths[1]),
    )
}

fn ipa_finish_right(
    b1_absent: V,
    b1_present: V,
    middle_spine: i32,
    other_inner: i32,
    final_spine: i32,
    far_low: i32,
    far_high: i32,
) -> V {
    let b1_to_b2 = ipa_transfer(b1_absent, b1_present, middle_spine);
    let b2_absent = mul(&path(other_inner), &b1_to_b2.parent_absent);
    let b2_present = shifted(
        &mul(&path(other_inner - 1), &b1_to_b2.parent_present),
        1,
    );
    let b2_to_b3 = ipa_transfer(b2_absent, b2_present, final_spine);
    let b3_absent = product(&[
        path(far_low), path(far_high), b2_to_b3.parent_absent,
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

fn ipa_polys_from_parts(
    full_b1_absent: V,
    full_b1_present: V,
    deleted_b1_absent: V,
    deleted_b1_present: V,
    deleted_tail: V,
    lengths: &[i32; 10],
) -> (V, V) {
    let core = ipa_finish_right(
        full_b1_absent,
        full_b1_present,
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
    );
    let deleted_rest = ipa_finish_right(
        deleted_b1_absent,
        deleted_b1_present,
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
    );
    (core, mul(&deleted_tail, &deleted_rest))
}

fn ipa_formula_polys(lengths: &[i32; 10]) -> (V, V) {
    let (fa, fp, da, dp, tail) = ipa_prefix_parts(lengths);
    ipa_polys_from_parts(fa, fp, da, dp, tail, lengths)
}

fn ipa_values(
    lengths: &[i32; 10],
    prefix: IPAPrefix,
    varying: Option<usize>,
) -> [Z; 4] {
    let (fa, fp, da, dp, tail) = if varying.is_some_and(|index| index <= 4) {
        ipa_prefix_parts(lengths)
    } else {
        (
            prefix.full_b1_absent,
            prefix.full_b1_present,
            prefix.deleted_b1_absent,
            prefix.deleted_b1_present,
            prefix.deleted_tail,
        )
    };
    let (core, deleted) = ipa_polys_from_parts(fa, fp, da, dp, tail, lengths);
    deltas03(&core, &deleted)
}

fn ipa_prefixes() -> Vec<IPAPrefix> {
    let pairs = ipa_pairs();
    let mut out = Vec::with_capacity(12_544);
    for near_length in 0..=7_i32 {
        for tail_length in 1..=7_i32 {
            for &left_pair in &pairs {
                for left_length in 1..=8_i32 {
                    let lengths = [
                        near_length,
                        tail_length,
                        left_pair.low.length,
                        left_pair.high.length,
                        left_length,
                        1, 1, 1, 1, 1,
                    ];
                    let (fa, fp, da, dp, tail) = ipa_prefix_parts(&lengths);
                    out.push(IPAPrefix {
                        near_gap: ipa_near(near_length),
                        tail: ipa_pendant(tail_length),
                        left_pair,
                        left_spine: ipa_spine(left_length),
                        full_b1_absent: fa,
                        full_b1_present: fp,
                        deleted_b1_absent: da,
                        deleted_b1_present: dp,
                        deleted_tail: tail,
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

fn ipa_rights() -> Vec<IPARight> {
    let pairs = ipa_pairs();
    let mut out = Vec::with_capacity(12_544);
    for middle_length in 1..=8_i32 {
        for inner_length in 1..=7_i32 {
            for final_length in 1..=8_i32 {
                for &right_pair in &pairs {
                    out.push(IPARight {
                        middle_spine: ipa_spine(middle_length),
                        other_inner: ipa_pendant(inner_length),
                        final_spine: ipa_spine(final_length),
                        right_pair,
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

fn ipa_states(prefix: IPAPrefix, right: IPARight) -> [IPAState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.left_pair.low,
        prefix.left_pair.high,
        prefix.left_spine,
        right.middle_spine,
        right.other_inner,
        right.final_spine,
        right.right_pair.low,
        right.right_pair.high,
    ]
}

fn ipa_lengths(states: &[IPAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn ipa_append(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
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

fn ipa_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    let b1 = ipa_append(&mut adjacency, root, lengths[0] + 1);
    ipa_append(&mut adjacency, root, lengths[1]);
    let b0 = ipa_append(&mut adjacency, b1, lengths[4]);
    ipa_append(&mut adjacency, b0, lengths[2]);
    ipa_append(&mut adjacency, b0, lengths[3]);
    let b2 = ipa_append(&mut adjacency, b1, lengths[5]);
    ipa_append(&mut adjacency, b2, lengths[6]);
    let b3 = ipa_append(&mut adjacency, b2, lengths[7]);
    ipa_append(&mut adjacency, b3, lengths[8]);
    ipa_append(&mut adjacency, b3, lengths[9]);
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn ipa_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = ipa_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn ipa_smoke() {
    let mut state = 0x589965CC75374CC3_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 { (state % 19) as i32 }
                else { 1 + (state % 19) as i32 };
        }
        let (core, deleted) = ipa_formula_polys(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            ipa_literal_values(&lengths),
            "formula smoke mismatch {}", sample,
        );
    }
    let prefixes = ipa_prefixes();
    let rights = ipa_rights();
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
        let mut lengths = ipa_lengths(&ipa_states(prefix, right));
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
            ipa_values(&lengths, prefix, Some(varying)),
            ipa_literal_values(&lengths),
            "cached smoke mismatch {}", sample,
        );
    }
    println!("PASS_INDEPENDENT_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_1024_LITERAL_SMOKE");
}

fn ipa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn ipa_hash_state(hash: &mut AuditSha256, state: IPAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn ipa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn ipa_coefficient_leaf(
    states: &[IPAState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-pendant-internal-coefficient-v1\0");
    for &state in states { ipa_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { ipa_hash_z(&mut hash, value); } }
    ipa_sha_bytes(hash)
}

fn ipa_finite_leaf(states: &[IPAState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-pendant-internal-finite-v1\0");
    for &state in states { ipa_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { ipa_hash_z(&mut hash, value); }
    ipa_sha_bytes(hash)
}

fn ipa_smoke_stream() {
    let prefixes = ipa_prefixes();
    let rights = ipa_rights();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let right = rights[(sample * 104729 + 23) % rights.len()];
        let states = ipa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let mut lengths = ipa_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = ipa_values(&lengths, prefix, None);
                finite_stream.update(&ipa_finite_leaf(&states, order, &values));
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
            let values = ipa_values(&lengths, prefix, Some(varying));
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(
            &ipa_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

struct IPAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn ipa_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<IPAPrefix>>,
    rights: Arc<Vec<IPARight>>,
) -> IPAResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for &right in rights.iter() {
        let states = ipa_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = ipa_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = ipa_values(&lengths, prefix, None);
            assert_eq!(values, ipa_literal_values(&lengths), "finite literal mismatch");
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&ipa_finite_leaf(&states, order, &values));
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
            let values = ipa_values(&lengths, prefix, Some(varying));
            if sample == 0 || sample == 13 {
                assert_eq!(values, ipa_literal_values(&lengths), "ray literal mismatch");
                literal_trees += 1;
            }
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &ipa_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = ipa_values(&lengths, prefix, Some(varying));
        assert_eq!(next, ipa_literal_values(&lengths), "unseen literal mismatch");
        literal_trees += 1;
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
            unseen += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    IPAResult { prefix_index, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        ipa_smoke();
        ipa_smoke_stream();
        return;
    }
    let prefixes = Arc::new(ipa_prefixes());
    let rights = Arc::new(ipa_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(IPA_BATCH_PREFIXES) {
        let batch_end = (batch_start + IPA_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..IPA_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(ipa_prefix_worker(prefix_index, Arc::clone(&prefix_copy), Arc::clone(&rights_copy)));
                    prefix_index += IPA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<IPAResult> = handles.into_iter()
            .map(|handle| handle.join().expect("audit worker panic"))
            .flatten().collect();
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
    assert_eq!(counts, [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660]);
    assert_eq!(unseen, 476_934_640);
    assert_eq!(literal_trees, 394_844_751);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL\n",
            "COUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_TREES {}\n",
            "LITERAL_RAY_POINTS 0 13 29\nCOEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_trees, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}
