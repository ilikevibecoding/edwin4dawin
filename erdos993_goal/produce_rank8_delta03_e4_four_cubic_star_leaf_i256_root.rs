// Six-thread checked-i256 producer for four_cubic_star:leaf.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const LF_THREADS: usize = 6;

#[derive(Clone, Copy)]
struct LFState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct LFModule { arm_a: LFState, arm_b: LFState, spine: LFState }

fn lf_arm(index: i32) -> LFState {
    if index == 6 { LFState { value: 7, long: true } }
    else { LFState { value: index + 1, long: false } }
}

fn lf_root_arm(index: i32) -> LFState {
    if index == 7 { LFState { value: 8, long: true } }
    else { LFState { value: index + 1, long: false } }
}

fn lf_spine(index: i32) -> LFState {
    if index == 7 { LFState { value: 8, long: true } }
    else { LFState { value: index + 1, long: false } }
}

fn lf_modules() -> Vec<LFModule> {
    let mut out = Vec::with_capacity(224);
    for arm_a in 0..7_i32 {
        for arm_b in arm_a..7_i32 {
            for spine in 0..8_i32 {
                out.push(LFModule { arm_a: lf_arm(arm_a), arm_b: lf_arm(arm_b), spine: lf_spine(spine) });
            }
        }
    }
    assert_eq!(out.len(), 224);
    out
}

fn lf_root_modules() -> Vec<LFModule> {
    let mut out = Vec::with_capacity(448);
    for root_arm in 0..8_i32 {
        for other_arm in 0..7_i32 {
            for spine in 0..8_i32 {
                out.push(LFModule {
                    arm_a: lf_root_arm(root_arm),
                    arm_b: lf_arm(other_arm),
                    spine: lf_spine(spine),
                });
            }
        }
    }
    assert_eq!(out.len(), 448);
    out
}

fn lf_states(root: LFModule, left: LFModule, right: LFModule) -> [LFState; 9] {
    [
        root.arm_a, root.arm_b, root.spine,
        left.arm_a, left.arm_b, left.spine,
        right.arm_a, right.arm_b, right.spine,
    ]
}

fn lf_lengths(states: &[LFState; 9]) -> [i32; 9] {
    std::array::from_fn(|index| states[index].value)
}

fn lf_module_poly(arm_a: i32, arm_b: i32, center_arm: i32) -> V {
    let excluded = product(&[path(arm_a), path(arm_b), path(center_arm)]);
    let included = shifted(
        &product(&[path(arm_a - 1), path(arm_b - 1), path(center_arm - 1)]),
        1,
    );
    add(&excluded, &included)
}

fn lf_core(lengths: &[i32; 9]) -> V {
    let free: [V; 3] = std::array::from_fn(|module| {
        let base = 3 * module;
        lf_module_poly(lengths[base], lengths[base + 1], lengths[base + 2] - 1)
    });
    let blocked: [V; 3] = std::array::from_fn(|module| {
        let base = 3 * module;
        lf_module_poly(lengths[base], lengths[base + 1], lengths[base + 2] - 2)
    });
    add(&product(&free), &shifted(&product(&blocked), 1))
}

fn lf_formula(lengths: &[i32; 9]) -> (V, V) {
    let core = lf_core(lengths);
    let mut reduced = *lengths;
    reduced[0] -= 1;
    (core, lf_core(&reduced))
}

fn lf_values(lengths: &[i32; 9]) -> [Z; 4] {
    let (core, deleted) = lf_formula(lengths);
    deltas03(&core, &deleted)
}

fn lf_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn lf_hash_state(hash: &mut AuditSha256, state: LFState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn lf_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn lf_coefficient_leaf(
    states: &[LFState; 9],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-leaf-coefficient-v1\0");
    for &state in states { lf_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { lf_hash_z(&mut hash, value); } }
    lf_sha_bytes(hash)
}

fn lf_finite_leaf(states: &[LFState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-leaf-finite-v1\0");
    for &state in states { lf_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { lf_hash_z(&mut hash, value); }
    lf_sha_bytes(hash)
}

fn lf_build_literal(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let center = 0;
    let mut root = usize::MAX;
    for module in 0..3 {
        let base = 3 * module;
        let outer = audit_attach(&mut adjacency, center, lengths[base + 2]);
        let first_end = audit_attach(&mut adjacency, outer, lengths[base]);
        if module == 0 { root = first_end; }
        audit_attach(&mut adjacency, outer, lengths[base + 1]);
    }
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency[root].len(), 1);
    (adjacency, root)
}

struct LFResult {
    id: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn lf_worker(
    id: usize,
    start: usize,
    end: usize,
    root_modules: Arc<Vec<LFModule>>,
    modules: Arc<Vec<LFModule>>,
) -> LFResult {
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    for root_index in start..end {
        let root_module = root_modules[root_index];
        for left_index in 0..modules.len() {
            for right_index in left_index..modules.len() {
                let states = lf_states(root_module, modules[left_index], modules[right_index]);
                let flags: [bool; 9] = std::array::from_fn(|index| states[index].long);
                let long_count = flags.iter().filter(|&&value| value).count();
                let mut lengths = lf_lengths(&states);
                if long_count == 0 {
                    counts[0] += 1;
                    let order = 1 + lengths.iter().sum::<i32>();
                    if order < 27 { continue; }
                    let values = lf_values(&lengths);
                    assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
                    finite_leaves.extend_from_slice(&lf_finite_leaf(&states, order, &values));
                    if literal_checks < 16 {
                        let (adjacency, root_vertex) = lf_build_literal(&lengths);
                        let (literal, literal_c, literal_h) = audit_deltas(&adjacency, root_vertex);
                        let (formula_c, formula_h) = lf_formula(&lengths);
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
                    let values = lf_values(&lengths);
                    for rank in 0..4 { samples[rank][sample] = values[rank]; }
                }
                let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
                    std::array::from_fn(|rank| audit_differences(&samples[rank]));
                audit_assert_gate(&coefficients);
                coefficient_leaves.extend_from_slice(
                    &lf_coefficient_leaf(&states, baseline, shift, &coefficients),
                );
                lengths[first] = base_first + shift + AUDIT_SAMPLES as i32;
                let next = lf_values(&lengths);
                for rank in 0..4 {
                    assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
                    unseen += 1;
                }
                if literal_checks < 32 {
                    let (adjacency, root_vertex) = lf_build_literal(&lengths);
                    let (literal, literal_c, literal_h) = audit_deltas(&adjacency, root_vertex);
                    let (formula_c, formula_h) = lf_formula(&lengths);
                    assert_eq!(literal_c, formula_c, "ray core formula mismatch");
                    assert_eq!(literal_h, formula_h, "ray deleted formula mismatch");
                    assert_eq!(literal, next, "ray literal value mismatch");
                    literal_checks += 1;
                }
                counts[4] += 1;
            }
        }
        eprintln!("WORKER {} ROOT {}/{}", id, root_index + 1, end);
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    LFResult { id, counts, unseen, coefficient_leaves, finite_leaves, literal_checks }
}

fn main() {
    audit_sha_self_test();
    let root_modules = Arc::new(lf_root_modules());
    let modules = Arc::new(lf_modules());
    let mut handles = Vec::new();
    for id in 0..LF_THREADS {
        let start = id * root_modules.len() / LF_THREADS;
        let end = (id + 1) * root_modules.len() / LF_THREADS;
        let roots = Arc::clone(&root_modules);
        let others = Arc::clone(&modules);
        handles.push(thread::spawn(move || lf_worker(id, start, end, roots, others)));
    }
    let mut results: Vec<LFResult> = handles.into_iter()
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
    assert_eq!(counts, [3_198_132, 2_939_106, 8_091_467, 1, 8_091_468]);
    assert_eq!(unseen, 32_365_872);
    let raw = format!(
        "PASS_I256_FOUR_CUBIC_STAR_LEAF_PRODUCER\nCOUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_SPOT_CHECKS {}\nCOEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n",
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_star_leaf_i256_raw_root_20260823.txt",
        raw.as_bytes(),
    ).expect("raw write");
    print!("{}", raw);
}
