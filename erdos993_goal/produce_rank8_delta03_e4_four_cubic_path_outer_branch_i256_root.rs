// Six-thread checked-i256 producer for four_cubic_path:outer_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const OB_THREADS: usize = 6;

#[derive(Clone, Copy)]
struct OBState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct OBPair { first: OBState, second: OBState }

#[derive(Clone, Copy)]
struct OBPrefix { pair: OBPair, first_spine: OBState }

fn ob_arm(index: i32) -> OBState {
    if index == 6 { OBState { value: 7, long: true } }
    else { OBState { value: index + 1, long: false } }
}

fn ob_spine(index: i32) -> OBState {
    if index == 7 { OBState { value: 8, long: true } }
    else { OBState { value: index + 1, long: false } }
}

fn ob_pairs() -> Vec<OBPair> {
    let mut out = Vec::with_capacity(28);
    for first in 0..7_i32 {
        for second in first..7_i32 {
            out.push(OBPair { first: ob_arm(first), second: ob_arm(second) });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn ob_prefixes() -> Vec<OBPrefix> {
    let mut out = Vec::with_capacity(224);
    for pair in ob_pairs() {
        for first_spine in 0..8_i32 {
            out.push(OBPrefix { pair, first_spine: ob_spine(first_spine) });
        }
    }
    assert_eq!(out.len(), 224);
    out
}

fn ob_local_outer(first: i32, second: i32) -> [V; 2] {
    [
        product(&[path(first), path(second)]),
        shifted(&product(&[path(first - 1), path(second - 1)]), 1),
    ]
}

fn ob_local_inner(pendant: i32) -> [V; 2] {
    [path(pendant), shifted(&path(pendant - 1), 1)]
}

fn ob_core(lengths: &[i32; 9]) -> V {
    let local = [
        ob_local_outer(lengths[0], lengths[1]),
        ob_local_inner(lengths[3]),
        ob_local_inner(lengths[5]),
        ob_local_outer(lengths[7], lengths[8]),
    ];
    let mut out = zero();
    for s0 in 0..2_usize {
        for s1 in 0..2_usize {
            for s2 in 0..2_usize {
                for s3 in 0..2_usize {
                    let row = product(&[
                        local[0][s0], local[1][s1], local[2][s2], local[3][s3],
                        path(lengths[2] - 1 - s0 as i32 - s1 as i32),
                        path(lengths[4] - 1 - s1 as i32 - s2 as i32),
                        path(lengths[6] - 1 - s2 as i32 - s3 as i32),
                    ]);
                    out = add(&out, &row);
                }
            }
        }
    }
    out
}

fn ob_deleted_outer_branch(lengths: &[i32; 9]) -> V {
    let inner_left = ob_local_inner(lengths[3]);
    let inner_right = ob_local_inner(lengths[5]);
    let outer_right = ob_local_outer(lengths[7], lengths[8]);
    let detached = product(&[path(lengths[0]), path(lengths[1])]);
    let mut remainder = zero();
    for s1 in 0..2_usize {
        for s2 in 0..2_usize {
            for s3 in 0..2_usize {
                let row = product(&[
                    inner_left[s1], inner_right[s2], outer_right[s3],
                    path(lengths[2] - 1 - s1 as i32),
                    path(lengths[4] - 1 - s1 as i32 - s2 as i32),
                    path(lengths[6] - 1 - s2 as i32 - s3 as i32),
                ]);
                remainder = add(&remainder, &row);
            }
        }
    }
    mul(&detached, &remainder)
}

fn ob_formula(lengths: &[i32; 9]) -> (V, V) {
    (ob_core(lengths), ob_deleted_outer_branch(lengths))
}

fn ob_values(lengths: &[i32; 9]) -> [Z; 4] {
    let (core, deleted) = ob_formula(lengths);
    deltas03(&core, &deleted)
}

fn ob_build_literal(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0;
    audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, root, lengths[1]);
    let inner_left = audit_attach(&mut adjacency, root, lengths[2]);
    audit_attach(&mut adjacency, inner_left, lengths[3]);
    let inner_right = audit_attach(&mut adjacency, inner_left, lengths[4]);
    audit_attach(&mut adjacency, inner_right, lengths[5]);
    let outer_right = audit_attach(&mut adjacency, inner_right, lengths[6]);
    audit_attach(&mut adjacency, outer_right, lengths[7]);
    audit_attach(&mut adjacency, outer_right, lengths[8]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency[root].len(), 3);
    (adjacency, root)
}

fn ob_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn ob_hash_state(hash: &mut AuditSha256, state: OBState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn ob_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn ob_coefficient_leaf(
    states: &[OBState; 9],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-branch-coefficient-v1\0");
    for &state in states { ob_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { ob_hash_z(&mut hash, value); } }
    ob_sha_bytes(hash)
}

fn ob_finite_leaf(states: &[OBState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-outer-branch-finite-v1\0");
    for &state in states { ob_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { ob_hash_z(&mut hash, value); }
    ob_sha_bytes(hash)
}

struct OBResult {
    id: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn ob_smoke() {
    let mut state = 0x9E3779B97F4A7C15_u64;
    for sample in 0..256_usize {
        let mut lengths = [0_i32; 9];
        for index in 0..9 {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            lengths[index] = 1 + (state % 13) as i32;
        }
        let (adjacency, root) = ob_build_literal(&lengths);
        let (literal, literal_c, literal_h) = audit_deltas(&adjacency, root);
        let (formula_c, formula_h) = ob_formula(&lengths);
        assert_eq!(literal_c, formula_c, "smoke core mismatch sample {}", sample);
        assert_eq!(literal_h, formula_h, "smoke deleted mismatch sample {}", sample);
        assert_eq!(literal, deltas03(&formula_c, &formula_h), "smoke residual mismatch sample {}", sample);
    }
    println!("PASS_FOUR_CUBIC_PATH_OUTER_BRANCH_256_LITERAL_FORMULA_SMOKE");
}

fn ob_worker(
    id: usize,
    start: usize,
    end: usize,
    prefixes: Arc<Vec<OBPrefix>>,
    pairs: Arc<Vec<OBPair>>,
) -> OBResult {
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    for prefix_index in start..end {
        let prefix = prefixes[prefix_index];
        for inner_left in 0..7_i32 {
            for middle_spine in 0..8_i32 {
                for inner_right in 0..7_i32 {
                    for final_spine in 0..8_i32 {
                        for &right_pair in pairs.iter() {
                            let states = [
                                prefix.pair.first,
                                prefix.pair.second,
                                prefix.first_spine,
                                ob_arm(inner_left),
                                ob_spine(middle_spine),
                                ob_arm(inner_right),
                                ob_spine(final_spine),
                                right_pair.first,
                                right_pair.second,
                            ];
                            let flags: [bool; 9] = std::array::from_fn(|index| states[index].long);
                            let long_count = flags.iter().filter(|&&value| value).count();
                            let mut lengths: [i32; 9] = std::array::from_fn(|index| states[index].value);
                            if long_count == 0 {
                                counts[0] += 1;
                                let order = 1 + lengths.iter().sum::<i32>();
                                if order < 27 { continue; }
                                let values = ob_values(&lengths);
                                assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
                                finite_leaves.extend_from_slice(&ob_finite_leaf(&states, order, &values));
                                if literal_checks < 16 {
                                    let (adjacency, root) = ob_build_literal(&lengths);
                                    let (literal, literal_c, literal_h) = audit_deltas(&adjacency, root);
                                    let (formula_c, formula_h) = ob_formula(&lengths);
                                    assert_eq!(literal_c, formula_c, "finite core formula mismatch");
                                    assert_eq!(literal_h, formula_h, "finite deleted formula mismatch");
                                    assert_eq!(literal, values, "finite literal value mismatch");
                                    literal_checks += 1;
                                }
                                counts[1] += 1;
                                continue;
                            }
                            if long_count == 9 { counts[3] += 1; } else { counts[2] += 1; }
                            let baseline = 1 + lengths.iter().sum::<i32>();
                            let shift = (27 - baseline).max(0);
                            let first = flags.iter().position(|&value| value).unwrap();
                            let base_first = lengths[first];
                            let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
                            for sample in 0..AUDIT_SAMPLES {
                                lengths[first] = base_first + shift + sample as i32;
                                let values = ob_values(&lengths);
                                for rank in 0..4 { samples[rank][sample] = values[rank]; }
                            }
                            let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
                                std::array::from_fn(|rank| audit_differences(&samples[rank]));
                            audit_assert_gate(&coefficients);
                            coefficient_leaves.extend_from_slice(
                                &ob_coefficient_leaf(&states, baseline, shift, &coefficients),
                            );
                            lengths[first] = base_first + shift + AUDIT_SAMPLES as i32;
                            let next = ob_values(&lengths);
                            for rank in 0..4 {
                                assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
                                unseen += 1;
                            }
                            if literal_checks < 32 {
                                let (adjacency, root) = ob_build_literal(&lengths);
                                let (literal, literal_c, literal_h) = audit_deltas(&adjacency, root);
                                let (formula_c, formula_h) = ob_formula(&lengths);
                                assert_eq!(literal_c, formula_c, "ray core formula mismatch");
                                assert_eq!(literal_h, formula_h, "ray deleted formula mismatch");
                                assert_eq!(literal, next, "ray literal value mismatch");
                                literal_checks += 1;
                            }
                            counts[4] += 1;
                        }
                    }
                }
            }
        }
        eprintln!("WORKER {} PREFIX {}/{}", id, prefix_index + 1, end);
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    OBResult { id, counts, unseen, coefficient_leaves, finite_leaves, literal_checks }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        ob_smoke();
        return;
    }
    let prefixes = Arc::new(ob_prefixes());
    let pairs = Arc::new(ob_pairs());
    let mut handles = Vec::new();
    for id in 0..OB_THREADS {
        let start = id * prefixes.len() / OB_THREADS;
        let end = (id + 1) * prefixes.len() / OB_THREADS;
        let prefix_rows = Arc::clone(&prefixes);
        let pair_rows = Arc::clone(&pairs);
        handles.push(thread::spawn(move || ob_worker(id, start, end, prefix_rows, pair_rows)));
    }
    let mut results: Vec<OBResult> = handles.into_iter()
        .map(|handle| handle.join().expect("worker panic"))
        .collect();
    results.sort_by_key(|row| row.id);
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for row in results {
        for index in 0..5 { counts[index] += row.counts[index]; }
        unseen += row.unseen;
        literal_checks += row.literal_checks;
        coefficient_master.update(&row.coefficient_leaves);
        finite_master.update(&row.finite_leaves);
    }
    assert_eq!(counts, [5_445_468, 4_950_075, 14_223_523, 1, 14_223_524]);
    assert_eq!(unseen, 56_894_096);
    let raw = format!(
        "PASS_I256_FOUR_CUBIC_PATH_OUTER_BRANCH_PRODUCER\nCOUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_SPOT_CHECKS {}\nCOEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n",
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_path_outer_branch_i256_raw_root_20260823.txt",
        raw.as_bytes(),
    ).expect("raw write");
    print!("{}", raw);
}
