// Independent six-thread literal-tree audit for four_cubic_star:leaf.
//
// This engine deliberately does not call the producer's module formula.  It
// rebuilds each subdivided tree as an adjacency list and deletes the literal
// terminal root before generic forest DP.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const LFA_THREADS: usize = 6;

#[derive(Clone, Copy)]
struct LFAState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct LFAModule { first_arm: LFAState, second_arm: LFAState, center_path: LFAState }

fn lfa_arm(index: i32) -> LFAState {
    if index == 6 { LFAState { length: 7, is_long: true } }
    else { LFAState { length: index + 1, is_long: false } }
}

fn lfa_root_arm(index: i32) -> LFAState {
    if index == 7 { LFAState { length: 8, is_long: true } }
    else { LFAState { length: index + 1, is_long: false } }
}

fn lfa_spine(index: i32) -> LFAState {
    if index == 7 { LFAState { length: 8, is_long: true } }
    else { LFAState { length: index + 1, is_long: false } }
}

fn lfa_modules() -> Vec<LFAModule> {
    let mut out = Vec::with_capacity(224);
    for first in 0..7_i32 {
        for second in first..7_i32 {
            for spine in 0..8_i32 {
                out.push(LFAModule {
                    first_arm: lfa_arm(first),
                    second_arm: lfa_arm(second),
                    center_path: lfa_spine(spine),
                });
            }
        }
    }
    assert_eq!(out.len(), 224);
    out
}

fn lfa_root_modules() -> Vec<LFAModule> {
    let mut out = Vec::with_capacity(448);
    for root_arm in 0..8_i32 {
        for other_arm in 0..7_i32 {
            for spine in 0..8_i32 {
                out.push(LFAModule {
                    first_arm: lfa_root_arm(root_arm),
                    second_arm: lfa_arm(other_arm),
                    center_path: lfa_spine(spine),
                });
            }
        }
    }
    assert_eq!(out.len(), 448);
    out
}

fn lfa_states(root: LFAModule, first: LFAModule, second: LFAModule) -> [LFAState; 9] {
    [
        root.first_arm, root.second_arm, root.center_path,
        first.first_arm, first.second_arm, first.center_path,
        second.first_arm, second.second_arm, second.center_path,
    ]
}

fn lfa_lengths(states: &[LFAState; 9]) -> [i32; 9] {
    std::array::from_fn(|index| states[index].length)
}

fn lfa_literal_tree(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let center = 0_usize;
    let mut literal_root = usize::MAX;
    for module in 0..3 {
        let offset = 3 * module;
        let outer = audit_attach(&mut adjacency, center, lengths[offset + 2]);
        let first_end = audit_attach(&mut adjacency, outer, lengths[offset]);
        if module == 0 { literal_root = first_end; }
        audit_attach(&mut adjacency, outer, lengths[offset + 1]);
    }
    assert_ne!(literal_root, usize::MAX);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|neighbors| neighbors.len() == 3).count(), 4);
    assert_eq!(adjacency[literal_root].len(), 1);
    (adjacency, literal_root)
}

fn lfa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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
    for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); }
    out
}

fn lfa_hash_state(hash: &mut AuditSha256, state: LFAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn lfa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn lfa_coefficient_leaf(
    states: &[LFAState; 9],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-leaf-coefficient-v1\0");
    for &state in states { lfa_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { lfa_hash_z(&mut hash, value); } }
    lfa_sha_bytes(hash)
}

fn lfa_finite_leaf(states: &[LFAState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-leaf-finite-v1\0");
    for &state in states { lfa_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { lfa_hash_z(&mut hash, value); }
    lfa_sha_bytes(hash)
}

struct LFAResult {
    id: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn lfa_worker(
    id: usize,
    start: usize,
    end: usize,
    root_modules: Arc<Vec<LFAModule>>,
    modules: Arc<Vec<LFAModule>>,
) -> LFAResult {
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for root_index in start..end {
        let root_module = root_modules[root_index];
        for first_index in 0..modules.len() {
            for second_index in first_index..modules.len() {
                let states = lfa_states(root_module, modules[first_index], modules[second_index]);
                let flags: [bool; 9] = std::array::from_fn(|index| states[index].is_long);
                let long_count = flags.iter().filter(|&&flag| flag).count();
                let mut lengths = lfa_lengths(&states);
                if long_count == 0 {
                    counts[0] += 1;
                    let order = 1 + lengths.iter().sum::<i32>();
                    if order < 27 { continue; }
                    let (adjacency, root_vertex) = lfa_literal_tree(&lengths);
                    let (values, _, _) = audit_deltas(&adjacency, root_vertex);
                    assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
                    finite_leaves.extend_from_slice(&lfa_finite_leaf(&states, order, &values));
                    counts[1] += 1;
                    literal_trees += 1;
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
                    let (adjacency, root_vertex) = lfa_literal_tree(&lengths);
                    let (values, _, _) = audit_deltas(&adjacency, root_vertex);
                    for rank in 0..4 { samples[rank][sample] = values[rank]; }
                    literal_trees += 1;
                }
                let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
                    std::array::from_fn(|rank| audit_differences(&samples[rank]));
                audit_assert_gate(&coefficients);
                coefficient_leaves.extend_from_slice(
                    &lfa_coefficient_leaf(&states, baseline, shift, &coefficients),
                );
                lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
                let (adjacency, root_vertex) = lfa_literal_tree(&lengths);
                let (unseen_values, _, _) = audit_deltas(&adjacency, root_vertex);
                for rank in 0..4 {
                    assert_eq!(
                        unseen_values[rank],
                        audit_newton_at_29(&coefficients[rank]),
                        "independent unseen S=29 mismatch",
                    );
                    unseen += 1;
                }
                literal_trees += 1;
                counts[4] += 1;
            }
        }
        eprintln!("AUDIT WORKER {} ROOT {}/{}", id, root_index + 1, end);
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    LFAResult { id, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn main() {
    audit_sha_self_test();
    let root_modules = Arc::new(lfa_root_modules());
    let modules = Arc::new(lfa_modules());
    let mut handles = Vec::new();
    for id in 0..LFA_THREADS {
        let start = id * root_modules.len() / LFA_THREADS;
        let end = (id + 1) * root_modules.len() / LFA_THREADS;
        let roots = Arc::clone(&root_modules);
        let others = Arc::clone(&modules);
        handles.push(thread::spawn(move || lfa_worker(id, start, end, roots, others)));
    }
    let mut results: Vec<LFAResult> = handles.into_iter()
        .map(|handle| handle.join().expect("audit worker panic"))
        .collect();
    results.sort_by_key(|row| row.id);
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for row in results {
        for index in 0..5 { counts[index] += row.counts[index]; }
        unseen += row.unseen;
        literal_trees += row.literal_trees;
        coefficient_master.update(&row.coefficient_leaves);
        finite_master.update(&row.finite_leaves);
    }
    assert_eq!(counts, [3_198_132, 2_939_106, 8_091_467, 1, 8_091_468]);
    assert_eq!(unseen, 32_365_872);
    assert_eq!(literal_trees, 2_939_106 + 30 * 8_091_468);
    let raw = format!(
        "PASS_LITERAL_I256_FOUR_CUBIC_STAR_LEAF\nCOUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_TREES {}\nCOEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n",
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_trees, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_star_leaf_literal_i256_raw_root_20260823.txt",
        raw.as_bytes(),
    ).expect("literal raw write");
    print!("{}", raw);
}
