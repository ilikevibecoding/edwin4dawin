// Memory-bounded six-thread checked-i256 producer for the internal root on a
// center--outer spine of the four-cubic star.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const FSI_THREADS: usize = 6;

#[derive(Clone, Copy)]
struct FSIState {
    value: i32,
    long: bool,
}

#[derive(Clone, Copy)]
struct FSIModule {
    arm_a: FSIState,
    arm_b: FSIState,
    spine: FSIState,
}

#[derive(Clone, Copy)]
struct FSIRootState {
    arm_a: FSIState,
    arm_b: FSIState,
    center_gap: FSIState,
    outer_gap: FSIState,
}

#[derive(Clone, Copy)]
struct FSIModuleParts {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct FSIRootParts {
    free: V,
    blocked: V,
    outer_component: V,
    center_path: V,
    center_blocked_path: V,
}

fn fsi_arm(value: i32) -> FSIState {
    FSIState { value, long: value == 7 }
}

fn fsi_spine(value: i32) -> FSIState {
    FSIState { value, long: value == 8 }
}

fn fsi_gap(value: i32) -> FSIState {
    FSIState { value, long: value == 7 }
}

fn fsi_modules() -> Vec<FSIModule> {
    let mut out = Vec::with_capacity(224);
    for arm_a in 1..=7_i32 {
        for arm_b in arm_a..=7_i32 {
            for spine in 1..=8_i32 {
                out.push(FSIModule {
                    arm_a: fsi_arm(arm_a),
                    arm_b: fsi_arm(arm_b),
                    spine: fsi_spine(spine),
                });
            }
        }
    }
    assert_eq!(out.len(), 224);
    out
}

fn fsi_root_states() -> Vec<FSIRootState> {
    let mut out = Vec::with_capacity(1792);
    for arm_a in 1..=7_i32 {
        for arm_b in arm_a..=7_i32 {
            for center_gap in 0..=7_i32 {
                for outer_gap in 0..=7_i32 {
                    out.push(FSIRootState {
                        arm_a: fsi_arm(arm_a),
                        arm_b: fsi_arm(arm_b),
                        center_gap: fsi_gap(center_gap),
                        outer_gap: fsi_gap(outer_gap),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 1792);
    out
}

fn fsi_states(root: FSIRootState, left: FSIModule, right: FSIModule) -> [FSIState; 10] {
    [
        root.arm_a,
        root.arm_b,
        root.center_gap,
        root.outer_gap,
        left.arm_a,
        left.arm_b,
        left.spine,
        right.arm_a,
        right.arm_b,
        right.spine,
    ]
}

fn fsi_lengths(states: &[FSIState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].value)
}

fn fsi_module_poly(a: i32, b: i32, third_arm: i32) -> V {
    let excluded = product(&[path(a), path(b), path(third_arm)]);
    let included = shifted(
        &product(&[path(a - 1), path(b - 1), path(third_arm - 1)]),
        1,
    );
    add(&excluded, &included)
}

fn fsi_module_parts(a: i32, b: i32, spine: i32) -> FSIModuleParts {
    FSIModuleParts {
        free: fsi_module_poly(a, b, spine - 1),
        blocked: fsi_module_poly(a, b, spine - 2),
    }
}

fn fsi_root_parts(a: i32, b: i32, center_gap: i32, outer_gap: i32) -> FSIRootParts {
    FSIRootParts {
        free: fsi_module_poly(a, b, center_gap + outer_gap + 1),
        blocked: fsi_module_poly(a, b, center_gap + outer_gap),
        outer_component: fsi_module_poly(a, b, outer_gap),
        center_path: path(center_gap),
        center_blocked_path: path(center_gap - 1),
    }
}

fn fsi_values_from_parts(
    root: FSIRootParts,
    left: FSIModuleParts,
    right: FSIModuleParts,
) -> [Z; 4] {
    let core = add(
        &product(&[root.free, left.free, right.free]),
        &shifted(&product(&[root.blocked, left.blocked, right.blocked]), 1),
    );
    let center_component = add(
        &product(&[root.center_path, left.free, right.free]),
        &shifted(
            &product(&[root.center_blocked_path, left.blocked, right.blocked]),
            1,
        ),
    );
    let deleted = mul(&root.outer_component, &center_component);
    deltas03(&core, &deleted)
}

fn fsi_values_with_variable(
    lengths: &[i32; 10],
    varying: usize,
    root_base: FSIRootParts,
    left_base: FSIModuleParts,
    right_base: FSIModuleParts,
) -> [Z; 4] {
    let root = if varying < 4 {
        fsi_root_parts(lengths[0], lengths[1], lengths[2], lengths[3])
    } else {
        root_base
    };
    let left = if (4..7).contains(&varying) {
        fsi_module_parts(lengths[4], lengths[5], lengths[6])
    } else {
        left_base
    };
    let right = if varying >= 7 {
        fsi_module_parts(lengths[7], lengths[8], lengths[9])
    } else {
        right_base
    };
    fsi_values_from_parts(root, left, right)
}

fn fsi_literal_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let center = 0_usize;

    let root_distance = lengths[2] + 1;
    let root_spine = lengths[2] + lengths[3] + 2;
    let mut previous = center;
    let mut literal_root = usize::MAX;
    for edge in 1..=root_spine {
        let vertex = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[previous].push(vertex);
        adjacency[vertex].push(previous);
        previous = vertex;
        if edge == root_distance {
            literal_root = vertex;
        }
    }
    let root_outer = previous;
    audit_attach(&mut adjacency, root_outer, lengths[0]);
    audit_attach(&mut adjacency, root_outer, lengths[1]);

    for offset in [4_usize, 7_usize] {
        let outer = audit_attach(&mut adjacency, center, lengths[offset + 2]);
        audit_attach(&mut adjacency, outer, lengths[offset]);
        audit_attach(&mut adjacency, outer, lengths[offset + 1]);
    }

    assert_ne!(literal_root, usize::MAX);
    assert_eq!(adjacency.len(), (3 + lengths.iter().sum::<i32>()) as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[literal_root].len(), 2);
    (adjacency, literal_root)
}

fn fsi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn fsi_hash_state(hash: &mut AuditSha256, state: FSIState) {
    hash.update(&[state.long as u8]);
    hash.update(&state.value.to_le_bytes());
}

fn fsi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs {
        hash.update(&limb.to_le_bytes());
    }
}

fn fsi_coefficient_leaf(
    states: &[FSIState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"center-outer-spine-internal-coefficient-v1\0");
    for &state in states {
        fsi_hash_state(&mut hash, state);
    }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row {
            fsi_hash_z(&mut hash, value);
        }
    }
    fsi_sha_bytes(hash)
}

fn fsi_finite_leaf(states: &[FSIState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"center-outer-spine-internal-finite-v1\0");
    for &state in states {
        fsi_hash_state(&mut hash, state);
    }
    hash.update(&order.to_le_bytes());
    for &value in values {
        fsi_hash_z(&mut hash, value);
    }
    fsi_sha_bytes(hash)
}

struct FSIResult {
    root_index: usize,
    counts: [u64; 5],
    unseen: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
    literal_checks: u64,
}

fn fsi_root_worker(
    root_index: usize,
    roots: Arc<Vec<FSIRootState>>,
    root_parts: Arc<Vec<FSIRootParts>>,
    modules: Arc<Vec<FSIModule>>,
    module_parts: Arc<Vec<FSIModuleParts>>,
) -> FSIResult {
    let root_state = roots[root_index];
    let root_base = root_parts[root_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64;
    let mut checked_finite = false;
    let mut checked_ray = false;

    for left_index in 0..modules.len() {
        for right_index in left_index..modules.len() {
            let states = fsi_states(root_state, modules[left_index], modules[right_index]);
            let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
            let long_count = flags.iter().filter(|&&flag| flag).count();
            let mut lengths = fsi_lengths(&states);
            let left_base = module_parts[left_index];
            let right_base = module_parts[right_index];

            if long_count == 0 {
                counts[0] += 1;
                let order = 3 + lengths.iter().sum::<i32>();
                if order < 27 {
                    continue;
                }
                let values = fsi_values_from_parts(root_base, left_base, right_base);
                assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
                finite_leaves.extend_from_slice(&fsi_finite_leaf(&states, order, &values));
                if !checked_finite {
                    let (adjacency, root_vertex) = fsi_literal_tree(&lengths);
                    let (literal, _, _) = audit_deltas(&adjacency, root_vertex);
                    assert_eq!(literal, values, "finite literal/formula mismatch");
                    checked_finite = true;
                    literal_checks += 1;
                }
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
                let values = fsi_values_with_variable(
                    &lengths,
                    varying,
                    root_base,
                    left_base,
                    right_base,
                );
                for rank in 0..4 {
                    samples[rank][sample] = values[rank];
                }
            }
            let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
                std::array::from_fn(|rank| audit_differences(&samples[rank]));
            audit_assert_gate(&coefficients);
            coefficient_leaves.extend_from_slice(&fsi_coefficient_leaf(
                &states,
                baseline,
                shift,
                &coefficients,
            ));

            lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
            let next = fsi_values_with_variable(
                &lengths,
                varying,
                root_base,
                left_base,
                right_base,
            );
            for rank in 0..4 {
                assert_eq!(
                    next[rank],
                    audit_newton_at_29(&coefficients[rank]),
                    "unseen S=29 mismatch"
                );
                unseen += 1;
            }
            if !checked_ray {
                let (adjacency, root_vertex) = fsi_literal_tree(&lengths);
                let (literal, _, _) = audit_deltas(&adjacency, root_vertex);
                assert_eq!(literal, next, "ray literal/formula mismatch");
                checked_ray = true;
                literal_checks += 1;
            }
            counts[4] += 1;
        }
    }

    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    FSIResult {
        root_index,
        counts,
        unseen,
        coefficient_leaves,
        finite_leaves,
        literal_checks,
    }
}

fn main() {
    audit_sha_self_test();
    let roots = Arc::new(fsi_root_states());
    let modules = Arc::new(fsi_modules());
    let root_parts = Arc::new(
        roots
            .iter()
            .map(|state| {
                fsi_root_parts(
                    state.arm_a.value,
                    state.arm_b.value,
                    state.center_gap.value,
                    state.outer_gap.value,
                )
            })
            .collect::<Vec<_>>(),
    );
    let module_parts = Arc::new(
        modules
            .iter()
            .map(|module| {
                fsi_module_parts(module.arm_a.value, module.arm_b.value, module.spine.value)
            })
            .collect::<Vec<_>>(),
    );

    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();

    for batch_start in (0..roots.len()).step_by(FSI_THREADS) {
        let batch_end = (batch_start + FSI_THREADS).min(roots.len());
        let mut handles = Vec::new();
        for root_index in batch_start..batch_end {
            let roots_copy = Arc::clone(&roots);
            let root_parts_copy = Arc::clone(&root_parts);
            let modules_copy = Arc::clone(&modules);
            let module_parts_copy = Arc::clone(&module_parts);
            handles.push(thread::spawn(move || {
                fsi_root_worker(
                    root_index,
                    roots_copy,
                    root_parts_copy,
                    modules_copy,
                    module_parts_copy,
                )
            }));
        }
        let mut results: Vec<FSIResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("producer worker panic"))
            .collect();
        results.sort_by_key(|result| result.root_index);
        for result in results {
            for index in 0..5 {
                counts[index] += result.counts[index];
            }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("PRODUCER ROOTS {}/{}", batch_end, roots.len());
    }

    assert_eq!(
        counts,
        [11_193_462, 10_888_155, 33_964_937, 1, 33_964_938]
    );
    assert_eq!(unseen, 135_859_752);
    assert_eq!(literal_checks, 2_821);
    let raw = format!(
        concat!(
            "PASS_I256_FOUR_CUBIC_STAR_CENTER_OUTER_SPINE_INTERNAL_PRODUCER\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_SPOT_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0],
        counts[1],
        counts[2],
        counts[3],
        counts[4],
        unseen,
        literal_checks,
        coefficient_master.hex(),
        finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    )
    .expect("producer raw write");
    print!("{}", raw);
}
