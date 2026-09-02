// Memory-bounded six-thread checked-i256 producer for
// four_cubic_path:inner_pendant_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const IPI_THREADS: usize = 6;
const IPI_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct IPIState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct IPIPair { first: IPIState, second: IPIState }

#[derive(Clone, Copy)]
struct IPIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct IPIPrefix {
    near_gap: IPIState,
    tail: IPIState,
    left_pair: IPIPair,
    left_spine: IPIState,
    tail_free: V,
    tail_blocked: V,
    left_message: IPIMessage,
}

#[derive(Clone, Copy)]
struct IPIRight {
    middle_spine: IPIState,
    other_inner: IPIState,
    final_spine: IPIState,
    right_pair: IPIPair,
    right_message: IPIMessage,
}

fn ipi_near(value: i32) -> IPIState {
    IPIState { value, long: value == 7 }
}

fn ipi_pendant(value: i32) -> IPIState {
    IPIState { value, long: value == 7 }
}

fn ipi_spine(value: i32) -> IPIState {
    IPIState { value, long: value == 8 }
}

fn ipi_pairs() -> Vec<IPIPair> {
    let mut out = Vec::with_capacity(28);
    for first in 1..=7_i32 {
        for second in first..=7_i32 {
            out.push(IPIPair {
                first: ipi_pendant(first),
                second: ipi_pendant(second),
            });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn ipi_branch_pair(first: i32, second: i32) -> (V, V) {
    (
        mul(&path(first), &path(second)),
        shifted(&mul(&path(first - 1), &path(second - 1)), 1),
    )
}

fn ipi_edge_message(absent: &V, present: &V, length: i32) -> IPIMessage {
    IPIMessage {
        free: add(
            &mul(&path(length - 1), absent),
            &mul(&path(length - 2), present),
        ),
        blocked: add(
            &mul(&path(length - 2), absent),
            &mul(&path(length - 3), present),
        ),
    }
}

fn ipi_left_message(first: i32, second: i32, spine: i32) -> IPIMessage {
    let (absent, present) = ipi_branch_pair(first, second);
    ipi_edge_message(&absent, &present, spine)
}

fn ipi_right_message(
    middle_spine: i32,
    other_inner: i32,
    final_spine: i32,
    far_first: i32,
    far_second: i32,
) -> IPIMessage {
    let (far_absent, far_present) = ipi_branch_pair(far_first, far_second);
    let far_to_b2 = ipi_edge_message(&far_absent, &far_present, final_spine);
    let b2_absent = mul(&path(other_inner), &far_to_b2.free);
    let b2_present = shifted(
        &mul(&path(other_inner - 1), &far_to_b2.blocked),
        1,
    );
    ipi_edge_message(&b2_absent, &b2_present, middle_spine)
}

fn ipi_prefixes() -> Vec<IPIPrefix> {
    let pairs = ipi_pairs();
    let mut out = Vec::with_capacity(12_544);
    for near_value in 0..=7_i32 {
        for tail_value in 1..=7_i32 {
            for &left_pair in &pairs {
                for left_spine_value in 1..=8_i32 {
                    out.push(IPIPrefix {
                        near_gap: ipi_near(near_value),
                        tail: ipi_pendant(tail_value),
                        left_pair,
                        left_spine: ipi_spine(left_spine_value),
                        tail_free: path(tail_value),
                        tail_blocked: path(tail_value - 1),
                        left_message: ipi_left_message(
                            left_pair.first.value,
                            left_pair.second.value,
                            left_spine_value,
                        ),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

fn ipi_rights() -> Vec<IPIRight> {
    let pairs = ipi_pairs();
    let mut out = Vec::with_capacity(12_544);
    for middle_value in 1..=8_i32 {
        for inner_value in 1..=7_i32 {
            for final_value in 1..=8_i32 {
                for &right_pair in &pairs {
                    out.push(IPIRight {
                        middle_spine: ipi_spine(middle_value),
                        other_inner: ipi_pendant(inner_value),
                        final_spine: ipi_spine(final_value),
                        right_pair,
                        right_message: ipi_right_message(
                            middle_value,
                            inner_value,
                            final_value,
                            right_pair.first.value,
                            right_pair.second.value,
                        ),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

// Canonical order: near; tail; left pair; left spine; middle spine;
// other inner pendant; final spine; right pair.
fn ipi_states(prefix: IPIPrefix, right: IPIRight) -> [IPIState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.left_pair.first,
        prefix.left_pair.second,
        prefix.left_spine,
        right.middle_spine,
        right.other_inner,
        right.final_spine,
        right.right_pair.first,
        right.right_pair.second,
    ]
}

fn ipi_lengths(states: &[IPIState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].value)
}

fn ipi_core_side(
    near_gap: i32,
    left: IPIMessage,
    right: IPIMessage,
) -> IPIMessage {
    let b1_absent = mul(&left.free, &right.free);
    let b1_present = shifted(&mul(&left.blocked, &right.blocked), 1);
    ipi_edge_message(&b1_absent, &b1_present, near_gap + 1)
}

fn ipi_values_from_parts(
    tail_free: V,
    tail_blocked: V,
    core_side: IPIMessage,
) -> [Z; 4] {
    let root_absent = mul(&tail_free, &core_side.free);
    let root_present = shifted(&mul(&tail_blocked, &core_side.blocked), 1);
    deltas03(&add(&root_absent, &root_present), &root_absent)
}

fn ipi_values_fixed(prefix: IPIPrefix, right: IPIRight) -> [Z; 4] {
    ipi_values_from_parts(
        prefix.tail_free,
        prefix.tail_blocked,
        ipi_core_side(prefix.near_gap.value, prefix.left_message, right.right_message),
    )
}

fn ipi_values_variable(
    lengths: &[i32; 10],
    varying: usize,
    prefix: IPIPrefix,
    right: IPIRight,
) -> [Z; 4] {
    let (tail_free, tail_blocked) = if varying == 1 {
        (path(lengths[1]), path(lengths[1] - 1))
    } else {
        (prefix.tail_free, prefix.tail_blocked)
    };
    let left = if (2..=4).contains(&varying) {
        ipi_left_message(lengths[2], lengths[3], lengths[4])
    } else {
        prefix.left_message
    };
    let right_message = if varying >= 5 {
        ipi_right_message(
            lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
        )
    } else {
        right.right_message
    };
    ipi_values_from_parts(
        tail_free,
        tail_blocked,
        ipi_core_side(lengths[0], left, right_message),
    )
}

fn ipi_formula_polys(lengths: &[i32; 10]) -> (V, V) {
    let left = ipi_left_message(lengths[2], lengths[3], lengths[4]);
    let right = ipi_right_message(
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
    );
    let core_side = ipi_core_side(lengths[0], left, right);
    let deleted = mul(&path(lengths[1]), &core_side.free);
    let selected = shifted(
        &mul(&path(lengths[1] - 1), &core_side.blocked),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn ipi_build_literal(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    let b1 = audit_attach(&mut adjacency, root, lengths[0] + 1);
    audit_attach(&mut adjacency, root, lengths[1]);
    let b0 = audit_attach(&mut adjacency, b1, lengths[4]);
    audit_attach(&mut adjacency, b0, lengths[2]);
    audit_attach(&mut adjacency, b0, lengths[3]);
    let b2 = audit_attach(&mut adjacency, b1, lengths[5]);
    audit_attach(&mut adjacency, b2, lengths[6]);
    let b3 = audit_attach(&mut adjacency, b2, lengths[7]);
    audit_attach(&mut adjacency, b3, lengths[8]);
    audit_attach(&mut adjacency, b3, lengths[9]);
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn ipi_smoke() {
    let mut state = 0x8EBC6AF09C88C6E3_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 { (state % 17) as i32 }
                else { 1 + (state % 17) as i32 };
        }
        let (adjacency, root) = ipi_build_literal(&lengths);
        let (literal, literal_core, literal_deleted) = audit_deltas(&adjacency, root);
        let (core, deleted) = ipi_formula_polys(&lengths);
        assert_eq!(literal_core, core, "smoke core mismatch {}", sample);
        assert_eq!(literal_deleted, deleted, "smoke deleted mismatch {}", sample);
        assert_eq!(literal, deltas03(&core, &deleted), "smoke delta mismatch {}", sample);
    }
    println!("PASS_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE");
}

fn ipi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn ipi_hash_state(hash: &mut AuditSha256, state: IPIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn ipi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn ipi_coefficient_leaf(
    states: &[IPIState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-pendant-internal-coefficient-v1\0");
    for &state in states { ipi_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { ipi_hash_z(&mut hash, value); } }
    ipi_sha_bytes(hash)
}

fn ipi_finite_leaf(states: &[IPIState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-pendant-internal-finite-v1\0");
    for &state in states { ipi_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { ipi_hash_z(&mut hash, value); }
    ipi_sha_bytes(hash)
}

fn ipi_smoke_stream() {
    let prefixes = ipi_prefixes();
    let rights = ipi_rights();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let right = rights[(sample * 104729 + 23) % rights.len()];
        let states = ipi_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let mut lengths = ipi_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = ipi_values_fixed(prefix, right);
                finite_stream.update(&ipi_finite_leaf(&states, order, &values));
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
            let values = ipi_values_variable(&lengths, varying, prefix, right);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(
            &ipi_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

struct IPIResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn ipi_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<IPIPrefix>>,
    rights: Arc<Vec<IPIRight>>,
) -> IPIResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    let mut checked_finite = false;
    let mut checked_ray = false;
    for &right in rights.iter() {
        let states = ipi_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = ipi_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = ipi_values_fixed(prefix, right);
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&ipi_finite_leaf(&states, order, &values));
            if !checked_finite {
                let (adjacency, root) = ipi_build_literal(&lengths);
                assert_eq!(audit_deltas(&adjacency, root).0, values, "finite literal mismatch");
                checked_finite = true;
                literal_checks += 1;
            }
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
            let values = ipi_values_variable(&lengths, varying, prefix, right);
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &ipi_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = ipi_values_variable(&lengths, varying, prefix, right);
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
            unseen += 1;
        }
        if !checked_ray {
            let (adjacency, root) = ipi_build_literal(&lengths);
            assert_eq!(audit_deltas(&adjacency, root).0, next, "ray literal mismatch");
            checked_ray = true;
            literal_checks += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    IPIResult { prefix_index, counts, unseen, coefficient_leaves, finite_leaves, literal_checks }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        ipi_smoke();
        ipi_smoke_stream();
        return;
    }
    let prefixes = Arc::new(ipi_prefixes());
    let rights = Arc::new(ipi_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(IPI_BATCH_PREFIXES) {
        let batch_end = (batch_start + IPI_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..IPI_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(ipi_prefix_worker(prefix_index, Arc::clone(&prefix_copy), Arc::clone(&rights_copy)));
                    prefix_index += IPI_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<IPIResult> = handles.into_iter()
            .map(|handle| handle.join().expect("producer worker panic"))
            .flatten().collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("PRODUCER PREFIXES {}/{}", batch_end, prefixes.len());
    }
    assert_eq!(counts, [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660]);
    assert_eq!(unseen, 476_934_640);
    assert_eq!(literal_checks, 18_718);
    let raw = format!(
        concat!(
            "PASS_I256_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_PRODUCER\n",
            "COUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_SPOT_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("producer raw write");
    print!("{}", raw);
}
