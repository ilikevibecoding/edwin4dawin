// Memory-bounded six-thread checked-i256 producer for
// four_cubic_path:inner_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const IBR_THREADS: usize = 6;
const IBR_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct IBRState {
    value: i32,
    long: bool,
}

#[derive(Clone, Copy)]
struct IBRPair {
    first: IBRState,
    second: IBRState,
}

#[derive(Clone, Copy)]
struct IBRMessage {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct IBRPrefix {
    root_pendant: IBRState,
    left_pair: IBRPair,
    left_spine: IBRState,
    root_free: V,
    root_blocked: V,
    left_message: IBRMessage,
}

#[derive(Clone, Copy)]
struct IBRRight {
    right_pendant: IBRState,
    middle_spine: IBRState,
    far_pair: IBRPair,
    far_spine: IBRState,
    message: IBRMessage,
}

fn ibr_arm(value: i32) -> IBRState {
    IBRState { value, long: value == 7 }
}

fn ibr_spine(value: i32) -> IBRState {
    IBRState { value, long: value == 8 }
}

fn ibr_pairs() -> Vec<IBRPair> {
    let mut out = Vec::with_capacity(28);
    for first in 1..=7_i32 {
        for second in first..=7_i32 {
            out.push(IBRPair {
                first: ibr_arm(first),
                second: ibr_arm(second),
            });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn ibr_branch_pair(first: i32, second: i32) -> (V, V) {
    (
        mul(&path(first), &path(second)),
        shifted(&mul(&path(first - 1), &path(second - 1)), 1),
    )
}

fn ibr_edge_message(absent: &V, present: &V, length: i32) -> IBRMessage {
    IBRMessage {
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

fn ibr_left_message(first: i32, second: i32, spine: i32) -> IBRMessage {
    let (absent, present) = ibr_branch_pair(first, second);
    ibr_edge_message(&absent, &present, spine)
}

fn ibr_right_message(
    right_pendant: i32,
    middle_spine: i32,
    far_first: i32,
    far_second: i32,
    far_spine: i32,
) -> IBRMessage {
    let (far_absent, far_present) = ibr_branch_pair(far_first, far_second);
    let far = ibr_edge_message(&far_absent, &far_present, far_spine);
    let right_absent = mul(&path(right_pendant), &far.free);
    let right_present = shifted(&mul(&path(right_pendant - 1), &far.blocked), 1);
    ibr_edge_message(&right_absent, &right_present, middle_spine)
}

fn ibr_prefixes() -> Vec<IBRPrefix> {
    let pairs = ibr_pairs();
    let mut out = Vec::with_capacity(1568);
    for root_pendant_value in 1..=7_i32 {
        let root_pendant = ibr_arm(root_pendant_value);
        for &left_pair in &pairs {
            for left_spine_value in 1..=8_i32 {
                let left_spine = ibr_spine(left_spine_value);
                out.push(IBRPrefix {
                    root_pendant,
                    left_pair,
                    left_spine,
                    root_free: path(root_pendant_value),
                    root_blocked: path(root_pendant_value - 1),
                    left_message: ibr_left_message(
                        left_pair.first.value,
                        left_pair.second.value,
                        left_spine_value,
                    ),
                });
            }
        }
    }
    assert_eq!(out.len(), 1568);
    out
}

fn ibr_rights() -> Vec<IBRRight> {
    let pairs = ibr_pairs();
    let mut out = Vec::with_capacity(12544);
    for right_pendant_value in 1..=7_i32 {
        let right_pendant = ibr_arm(right_pendant_value);
        for middle_spine_value in 1..=8_i32 {
            let middle_spine = ibr_spine(middle_spine_value);
            for &far_pair in &pairs {
                for far_spine_value in 1..=8_i32 {
                    let far_spine = ibr_spine(far_spine_value);
                    out.push(IBRRight {
                        right_pendant,
                        middle_spine,
                        far_pair,
                        far_spine,
                        message: ibr_right_message(
                            right_pendant_value,
                            middle_spine_value,
                            far_pair.first.value,
                            far_pair.second.value,
                            far_spine_value,
                        ),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12544);
    out
}

// Public canonical coordinate order pinned by the reduction report:
// root pendant; left pair; left spine; right pendant; middle spine;
// far pair; far spine.
fn ibr_states(prefix: IBRPrefix, right: IBRRight) -> [IBRState; 9] {
    [
        prefix.root_pendant,
        prefix.left_pair.first,
        prefix.left_pair.second,
        prefix.left_spine,
        right.right_pendant,
        right.middle_spine,
        right.far_pair.first,
        right.far_pair.second,
        right.far_spine,
    ]
}

fn ibr_lengths(states: &[IBRState; 9]) -> [i32; 9] {
    std::array::from_fn(|index| states[index].value)
}

fn ibr_values_from_parts(
    root_free: V,
    root_blocked: V,
    left: IBRMessage,
    right: IBRMessage,
) -> [Z; 4] {
    let root_absent = product(&[root_free, left.free, right.free]);
    let root_present = shifted(&product(&[root_blocked, left.blocked, right.blocked]), 1);
    let core = add(&root_absent, &root_present);
    // Deleting the inner root detaches its pendant path and separates the left
    // and right messages; hence the deleted forest is exactly root_absent.
    deltas03(&core, &root_absent)
}

fn ibr_values_with_variable(
    lengths: &[i32; 9],
    varying: usize,
    prefix: IBRPrefix,
    right: IBRRight,
) -> [Z; 4] {
    let root_free = if varying == 0 { path(lengths[0]) } else { prefix.root_free };
    let root_blocked = if varying == 0 {
        path(lengths[0] - 1)
    } else {
        prefix.root_blocked
    };
    let left_message = if (1..=3).contains(&varying) {
        ibr_left_message(lengths[1], lengths[2], lengths[3])
    } else {
        prefix.left_message
    };
    let right_message = if varying >= 4 {
        ibr_right_message(
            lengths[4],
            lengths[5],
            lengths[6],
            lengths[7],
            lengths[8],
        )
    } else {
        right.message
    };
    ibr_values_from_parts(root_free, root_blocked, left_message, right_message)
}

fn ibr_build_literal(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    audit_attach(&mut adjacency, root, lengths[0]);
    let left_outer = audit_attach(&mut adjacency, root, lengths[3]);
    audit_attach(&mut adjacency, left_outer, lengths[1]);
    audit_attach(&mut adjacency, left_outer, lengths[2]);
    let right_inner = audit_attach(&mut adjacency, root, lengths[5]);
    audit_attach(&mut adjacency, right_inner, lengths[4]);
    let far_outer = audit_attach(&mut adjacency, right_inner, lengths[8]);
    audit_attach(&mut adjacency, far_outer, lengths[6]);
    audit_attach(&mut adjacency, far_outer, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 3);
    (adjacency, root)
}

fn ibr_formula_polys(lengths: &[i32; 9]) -> (V, V) {
    let left = ibr_left_message(lengths[1], lengths[2], lengths[3]);
    let right = ibr_right_message(
        lengths[4],
        lengths[5],
        lengths[6],
        lengths[7],
        lengths[8],
    );
    let deleted = product(&[path(lengths[0]), left.free, right.free]);
    let selected = shifted(
        &product(&[path(lengths[0] - 1), left.blocked, right.blocked]),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn ibr_smoke() {
    let mut state = 0xD1B54A32D192ED03_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 9];
        for value in &mut lengths {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = 1 + (state % 17) as i32;
        }
        let (adjacency, root) = ibr_build_literal(&lengths);
        let (literal_values, literal_core, literal_deleted) = audit_deltas(&adjacency, root);
        let (formula_core, formula_deleted) = ibr_formula_polys(&lengths);
        assert_eq!(literal_core, formula_core, "smoke core mismatch {}", sample);
        assert_eq!(literal_deleted, formula_deleted, "smoke deleted mismatch {}", sample);
        assert_eq!(
            literal_values,
            deltas03(&formula_core, &formula_deleted),
            "smoke residual mismatch {}",
            sample
        );
    }
    println!("PASS_FOUR_CUBIC_PATH_INNER_BRANCH_512_LITERAL_FORMULA_SMOKE");
}

fn ibr_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn ibr_hash_state(hash: &mut AuditSha256, state: IBRState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn ibr_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn ibr_coefficient_leaf(
    states: &[IBRState; 9],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-branch-coefficient-v1\0");
    for &state in states { ibr_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { ibr_hash_z(&mut hash, value); } }
    ibr_sha_bytes(hash)
}

fn ibr_finite_leaf(states: &[IBRState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-branch-finite-v1\0");
    for &state in states { ibr_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { ibr_hash_z(&mut hash, value); }
    ibr_sha_bytes(hash)
}

struct IBRResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn ibr_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<IBRPrefix>>,
    rights: Arc<Vec<IBRRight>>,
) -> IBRResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    let mut checked_finite = false;
    let mut checked_ray = false;
    for &right in rights.iter() {
        let states = ibr_states(prefix, right);
        let flags: [bool; 9] = std::array::from_fn(|index| states[index].long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = ibr_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 1 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = ibr_values_from_parts(
                prefix.root_free,
                prefix.root_blocked,
                prefix.left_message,
                right.message,
            );
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&ibr_finite_leaf(&states, order, &values));
            if !checked_finite {
                let (adjacency, root) = ibr_build_literal(&lengths);
                assert_eq!(audit_deltas(&adjacency, root).0, values, "finite literal mismatch");
                checked_finite = true;
                literal_checks += 1;
            }
            counts[1] += 1;
            continue;
        }
        if long_count == 9 { counts[3] += 1; } else { counts[2] += 1; }
        let baseline = 1 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32;
            let values = ibr_values_with_variable(&lengths, varying, prefix, right);
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &ibr_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = ibr_values_with_variable(&lengths, varying, prefix, right);
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
            unseen += 1;
        }
        if !checked_ray {
            let (adjacency, root) = ibr_build_literal(&lengths);
            assert_eq!(audit_deltas(&adjacency, root).0, next, "ray literal mismatch");
            checked_ray = true;
            literal_checks += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    IBRResult {
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
        ibr_smoke();
        return;
    }
    let prefixes = Arc::new(ibr_prefixes());
    let rights = Arc::new(ibr_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();

    for batch_start in (0..prefixes.len()).step_by(IBR_BATCH_PREFIXES) {
        let batch_end = (batch_start + IBR_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..IBR_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(ibr_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&rights_copy),
                    ));
                    prefix_index += IBR_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<IBRResult> = handles
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
    assert_eq!(counts, [5_445_468, 4_950_075, 14_223_523, 1, 14_223_524]);
    assert_eq!(unseen, 56_894_096);
    assert_eq!(literal_checks, 2_450);
    let raw = format!(
        concat!(
            "PASS_I256_FOUR_CUBIC_PATH_INNER_BRANCH_PRODUCER\n",
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
        "rank8_delta03_e4_four_cubic_path_inner_branch_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("producer raw write");
    print!("{}", raw);
}
