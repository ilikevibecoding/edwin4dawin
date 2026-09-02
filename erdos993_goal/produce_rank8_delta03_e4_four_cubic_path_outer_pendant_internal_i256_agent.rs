// Memory-bounded six-thread checked-i256 producer for
// four_cubic_path:outer_pendant_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const OPI_THREADS: usize = 6;
const OPI_BATCH_PREFIXES: usize = 12;

#[derive(Clone, Copy)]
struct OPIState {
    value: i32,
    long: bool,
}

#[derive(Clone, Copy)]
struct OPIPair {
    first: OPIState,
    second: OPIState,
}

#[derive(Clone, Copy)]
struct OPIMessage {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct OPIPrefix {
    near_gap: OPIState,
    tail: OPIState,
    sibling: OPIState,
    first_spine: OPIState,
    tail_free: V,
    tail_blocked: V,
}

#[derive(Clone, Copy)]
struct OPIRight {
    left_inner: OPIState,
    middle_spine: OPIState,
    right_inner: OPIState,
    final_spine: OPIState,
    far_pair: OPIPair,
    b1_absent: V,
    b1_present: V,
}

fn opi_near(value: i32) -> OPIState {
    OPIState { value, long: value == 7 }
}

fn opi_pendant(value: i32) -> OPIState {
    OPIState { value, long: value == 7 }
}

fn opi_spine(value: i32) -> OPIState {
    OPIState { value, long: value == 8 }
}

fn opi_pairs() -> Vec<OPIPair> {
    let mut out = Vec::with_capacity(28);
    for first in 1..=7_i32 {
        for second in first..=7_i32 {
            out.push(OPIPair {
                first: opi_pendant(first),
                second: opi_pendant(second),
            });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn opi_branch_pair(first: i32, second: i32) -> (V, V) {
    (
        mul(&path(first), &path(second)),
        shifted(&mul(&path(first - 1), &path(second - 1)), 1),
    )
}

fn opi_edge_message(absent: &V, present: &V, length: i32) -> OPIMessage {
    OPIMessage {
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

fn opi_b1_parts(
    left_inner: i32,
    middle_spine: i32,
    right_inner: i32,
    final_spine: i32,
    far_first: i32,
    far_second: i32,
) -> (V, V) {
    let (far_absent, far_present) = opi_branch_pair(far_first, far_second);
    let far_to_b2 = opi_edge_message(&far_absent, &far_present, final_spine);
    let b2_absent = mul(&path(right_inner), &far_to_b2.free);
    let b2_present = shifted(
        &mul(&path(right_inner - 1), &far_to_b2.blocked),
        1,
    );
    let b2_to_b1 = opi_edge_message(&b2_absent, &b2_present, middle_spine);
    (
        mul(&path(left_inner), &b2_to_b1.free),
        shifted(
            &mul(&path(left_inner - 1), &b2_to_b1.blocked),
            1,
        ),
    )
}

fn opi_prefixes() -> Vec<OPIPrefix> {
    let mut out = Vec::with_capacity(3136);
    for near_value in 0..=7_i32 {
        for tail_value in 1..=7_i32 {
            for sibling_value in 1..=7_i32 {
                for first_spine_value in 1..=8_i32 {
                    out.push(OPIPrefix {
                        near_gap: opi_near(near_value),
                        tail: opi_pendant(tail_value),
                        sibling: opi_pendant(sibling_value),
                        first_spine: opi_spine(first_spine_value),
                        tail_free: path(tail_value),
                        tail_blocked: path(tail_value - 1),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 3136);
    out
}

fn opi_rights() -> Vec<OPIRight> {
    let pairs = opi_pairs();
    let mut out = Vec::with_capacity(87_808);
    for left_inner_value in 1..=7_i32 {
        for middle_spine_value in 1..=8_i32 {
            for right_inner_value in 1..=7_i32 {
                for final_spine_value in 1..=8_i32 {
                    for &far_pair in &pairs {
                        let (b1_absent, b1_present) = opi_b1_parts(
                            left_inner_value,
                            middle_spine_value,
                            right_inner_value,
                            final_spine_value,
                            far_pair.first.value,
                            far_pair.second.value,
                        );
                        out.push(OPIRight {
                            left_inner: opi_pendant(left_inner_value),
                            middle_spine: opi_spine(middle_spine_value),
                            right_inner: opi_pendant(right_inner_value),
                            final_spine: opi_spine(final_spine_value),
                            far_pair,
                            b1_absent,
                            b1_present,
                        });
                    }
                }
            }
        }
    }
    assert_eq!(out.len(), 87_808);
    out
}

// Canonical coordinate order pinned by the reduction report:
// near gap; tail; sibling; first spine; left inner; middle spine;
// right inner; final spine; far unordered pair.
fn opi_states(prefix: OPIPrefix, right: OPIRight) -> [OPIState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.sibling,
        prefix.first_spine,
        right.left_inner,
        right.middle_spine,
        right.right_inner,
        right.final_spine,
        right.far_pair.first,
        right.far_pair.second,
    ]
}

fn opi_lengths(states: &[OPIState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].value)
}

fn opi_core_side(
    near_gap: i32,
    sibling: i32,
    first_spine: i32,
    b1_absent: V,
    b1_present: V,
) -> OPIMessage {
    let b1_to_b0 = opi_edge_message(&b1_absent, &b1_present, first_spine);
    let b0_absent = mul(&path(sibling), &b1_to_b0.free);
    let b0_present = shifted(
        &mul(&path(sibling - 1), &b1_to_b0.blocked),
        1,
    );
    // The stored near gap counts only vertices strictly between the selected
    // root and B0, so the root--B0 endpoint distance is near_gap+1.
    opi_edge_message(&b0_absent, &b0_present, near_gap + 1)
}

fn opi_values_from_parts(tail_free: V, tail_blocked: V, core_side: OPIMessage) -> [Z; 4] {
    let root_absent = mul(&tail_free, &core_side.free);
    let root_present = shifted(&mul(&tail_blocked, &core_side.blocked), 1);
    let core = add(&root_absent, &root_present);
    // Removing the internal degree-two root detaches the tail and leaves the
    // near-side component; their forest polynomial is exactly root_absent.
    deltas03(&core, &root_absent)
}

fn opi_values_fixed(prefix: OPIPrefix, right: OPIRight) -> [Z; 4] {
    opi_values_from_parts(
        prefix.tail_free,
        prefix.tail_blocked,
        opi_core_side(
            prefix.near_gap.value,
            prefix.sibling.value,
            prefix.first_spine.value,
            right.b1_absent,
            right.b1_present,
        ),
    )
}

fn opi_values_variable(
    lengths: &[i32; 10],
    varying: usize,
    prefix: OPIPrefix,
    right: OPIRight,
) -> [Z; 4] {
    let (tail_free, tail_blocked) = if varying == 1 {
        (path(lengths[1]), path(lengths[1] - 1))
    } else {
        (prefix.tail_free, prefix.tail_blocked)
    };
    let (b1_absent, b1_present) = if varying >= 4 {
        opi_b1_parts(
            lengths[4],
            lengths[5],
            lengths[6],
            lengths[7],
            lengths[8],
            lengths[9],
        )
    } else {
        (right.b1_absent, right.b1_present)
    };
    let core_side = opi_core_side(
        lengths[0],
        lengths[2],
        lengths[3],
        b1_absent,
        b1_present,
    );
    opi_values_from_parts(tail_free, tail_blocked, core_side)
}

fn opi_formula_polys(lengths: &[i32; 10]) -> (V, V) {
    let (b1_absent, b1_present) = opi_b1_parts(
        lengths[4], lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
    );
    let core_side = opi_core_side(
        lengths[0], lengths[2], lengths[3], b1_absent, b1_present,
    );
    let deleted = mul(&path(lengths[1]), &core_side.free);
    let selected = shifted(
        &mul(&path(lengths[1] - 1), &core_side.blocked),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn opi_build_literal(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    let b0 = audit_attach(&mut adjacency, root, lengths[0] + 1);
    audit_attach(&mut adjacency, root, lengths[1]);
    audit_attach(&mut adjacency, b0, lengths[2]);
    let b1 = audit_attach(&mut adjacency, b0, lengths[3]);
    audit_attach(&mut adjacency, b1, lengths[4]);
    let b2 = audit_attach(&mut adjacency, b1, lengths[5]);
    audit_attach(&mut adjacency, b2, lengths[6]);
    let b3 = audit_attach(&mut adjacency, b2, lengths[7]);
    audit_attach(&mut adjacency, b3, lengths[8]);
    audit_attach(&mut adjacency, b3, lengths[9]);
    assert_eq!(
        adjacency.len(),
        2 + lengths.iter().sum::<i32>() as usize,
    );
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn opi_smoke() {
    let mut state = 0xA0761D6478BD642F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 {
                (state % 17) as i32
            } else {
                1 + (state % 17) as i32
            };
        }
        let (adjacency, root) = opi_build_literal(&lengths);
        let (literal_values, literal_core, literal_deleted) = audit_deltas(&adjacency, root);
        let (formula_core, formula_deleted) = opi_formula_polys(&lengths);
        assert_eq!(literal_core, formula_core, "smoke core mismatch {}", sample);
        assert_eq!(
            literal_deleted, formula_deleted,
            "smoke deleted mismatch {}", sample,
        );
        assert_eq!(
            literal_values,
            deltas03(&formula_core, &formula_deleted),
            "smoke residual mismatch {}", sample,
        );
    }
    println!("PASS_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE");
}

fn opi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn opi_hash_state(hash: &mut AuditSha256, state: OPIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn opi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn opi_coefficient_leaf(
    states: &[OPIState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-pendant-internal-coefficient-v1\0");
    for &state in states { opi_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { opi_hash_z(&mut hash, value); } }
    opi_sha_bytes(hash)
}

fn opi_finite_leaf(states: &[OPIState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-pendant-internal-finite-v1\0");
    for &state in states { opi_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { opi_hash_z(&mut hash, value); }
    opi_sha_bytes(hash)
}

fn opi_smoke_stream() {
    let prefixes = opi_prefixes();
    let rights = opi_rights();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let right = rights[(sample * 104729 + 23) % rights.len()];
        let states = opi_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let mut lengths = opi_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = opi_values_fixed(prefix, right);
                finite_stream.update(&opi_finite_leaf(&states, order, &values));
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
            let values = opi_values_variable(&lengths, varying, prefix, right);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(
            &opi_coefficient_leaf(&states, baseline, shift, &coefficients),
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

struct OPIResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn opi_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<OPIPrefix>>,
    rights: Arc<Vec<OPIRight>>,
) -> OPIResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    let mut checked_finite = false;
    let mut checked_ray = false;
    for &right in rights.iter() {
        let states = opi_states(prefix, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = opi_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = opi_values_fixed(prefix, right);
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&opi_finite_leaf(&states, order, &values));
            if !checked_finite {
                let (adjacency, root) = opi_build_literal(&lengths);
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
            let values = opi_values_variable(&lengths, varying, prefix, right);
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &opi_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = opi_values_variable(&lengths, varying, prefix, right);
        for rank in 0..4 {
            assert_eq!(
                next[rank], audit_newton_at_29(&coefficients[rank]),
                "unseen mismatch",
            );
            unseen += 1;
        }
        if !checked_ray {
            let (adjacency, root) = opi_build_literal(&lengths);
            assert_eq!(audit_deltas(&adjacency, root).0, next, "ray literal mismatch");
            checked_ray = true;
            literal_checks += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    OPIResult {
        prefix_index,
        counts,
        unseen,
        coefficient_leaves,
        finite_leaves,
        literal_checks,
    }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        opi_smoke();
        opi_smoke_stream();
        return;
    }
    let prefixes = Arc::new(opi_prefixes());
    let rights = Arc::new(opi_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();

    for batch_start in (0..prefixes.len()).step_by(OPI_BATCH_PREFIXES) {
        let batch_end = (batch_start + OPI_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..OPI_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(opi_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&rights_copy),
                    ));
                    prefix_index += OPI_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<OPIResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("producer worker panic"))
            .flatten()
            .collect();
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
    assert_eq!(
        counts,
        [65_345_616, 63_768_530, 210_020_271, 1, 210_020_272],
    );
    assert_eq!(unseen, 840_081_088);
    assert_eq!(literal_checks, 4_900);
    let raw = format!(
        concat!(
            "PASS_I256_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL_PRODUCER\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_SPOT_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("producer raw write");
    print!("{}", raw);
}
