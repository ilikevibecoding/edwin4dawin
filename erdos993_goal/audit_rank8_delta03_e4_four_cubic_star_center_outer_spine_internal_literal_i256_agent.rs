// Independent, memory-bounded exact audit for the internal root on a
// four-cubic-star center--outer spine.
//
// Independence safeguards:
//   * no producer source is included or called;
//   * branch-to-center messages are derived by a separate two-state edge
//     transfer, not by the producer's three-arm module formula;
//   * every eligible finite key and S=0, S=13, S=29 on every ray are also
//     rebuilt as expanded adjacency-list trees and evaluated by generic forest
//     DP (112,782,969 literal trees in total);
//   * every finite record and every 29-coefficient row is hashed in the same
//     public canonical record format for all-record comparison.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const FSIA_THREADS: usize = 6;
const FSIA_BATCH_ROOTS: usize = 24;

#[derive(Clone, Copy)]
struct FSIAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct FSIAModule {
    first_arm: FSIAState,
    second_arm: FSIAState,
    center_edge: FSIAState,
}

#[derive(Clone, Copy)]
struct FSIARootState {
    first_arm: FSIAState,
    second_arm: FSIAState,
    center_gap: FSIAState,
    outer_gap: FSIAState,
}

#[derive(Clone, Copy)]
struct FSIAMessage {
    free_if_parent_absent: V,
    free_if_parent_present: V,
}

#[derive(Clone, Copy)]
struct FSIARootMessages {
    full_free: V,
    full_blocked: V,
    root_outer_component: V,
    center_dangling_free: V,
    center_dangling_blocked: V,
}

fn fsia_modules() -> Vec<FSIAModule> {
    let mut modules = Vec::with_capacity(224);
    for first_arm in 1..=7_i32 {
        for second_arm in first_arm..=7_i32 {
            for center_edge in 1..=8_i32 {
                modules.push(FSIAModule {
                    first_arm: FSIAState {
                        length: first_arm,
                        is_long: first_arm == 7,
                    },
                    second_arm: FSIAState {
                        length: second_arm,
                        is_long: second_arm == 7,
                    },
                    center_edge: FSIAState {
                        length: center_edge,
                        is_long: center_edge == 8,
                    },
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn fsia_root_states() -> Vec<FSIARootState> {
    let mut roots = Vec::with_capacity(1792);
    for first_arm in 1..=7_i32 {
        for second_arm in first_arm..=7_i32 {
            for center_gap in 0..=7_i32 {
                for outer_gap in 0..=7_i32 {
                    roots.push(FSIARootState {
                        first_arm: FSIAState {
                            length: first_arm,
                            is_long: first_arm == 7,
                        },
                        second_arm: FSIAState {
                            length: second_arm,
                            is_long: second_arm == 7,
                        },
                        center_gap: FSIAState {
                            length: center_gap,
                            is_long: center_gap == 7,
                        },
                        outer_gap: FSIAState {
                            length: outer_gap,
                            is_long: outer_gap == 7,
                        },
                    });
                }
            }
        }
    }
    assert_eq!(roots.len(), 1792);
    roots
}

fn fsia_states(
    root: FSIARootState,
    left: FSIAModule,
    right: FSIAModule,
) -> [FSIAState; 10] {
    [
        root.first_arm,
        root.second_arm,
        root.center_gap,
        root.outer_gap,
        left.first_arm,
        left.second_arm,
        left.center_edge,
        right.first_arm,
        right.second_arm,
        right.center_edge,
    ]
}

fn fsia_lengths(states: &[FSIAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

// Independently derived two-state message for a cubic branch after its two
// pendant paths have been processed.
fn fsia_branch_pair(first_arm: i32, second_arm: i32) -> (V, V) {
    let branch_absent = mul(&path(first_arm), &path(second_arm));
    let branch_present = shifted(
        &mul(&path(first_arm - 1), &path(second_arm - 1)),
        1,
    );
    (branch_absent, branch_present)
}

// Transfer that pair across an edge subdivided to the given positive length.
// The two outputs are the factors seen when the parent endpoint is absent or
// present.  This is a different grouping from the producer's module formula.
fn fsia_edge_message(
    branch_absent: &V,
    branch_present: &V,
    edge_length: i32,
) -> FSIAMessage {
    let free_if_parent_absent = add(
        &mul(&path(edge_length - 1), branch_absent),
        &mul(&path(edge_length - 2), branch_present),
    );
    let free_if_parent_present = add(
        &mul(&path(edge_length - 2), branch_absent),
        &mul(&path(edge_length - 3), branch_present),
    );
    FSIAMessage {
        free_if_parent_absent,
        free_if_parent_present,
    }
}

fn fsia_module_message(first_arm: i32, second_arm: i32, edge_length: i32) -> FSIAMessage {
    let (branch_absent, branch_present) = fsia_branch_pair(first_arm, second_arm);
    fsia_edge_message(&branch_absent, &branch_present, edge_length)
}

fn fsia_root_messages(
    first_arm: i32,
    second_arm: i32,
    center_gap: i32,
    outer_gap: i32,
) -> FSIARootMessages {
    let (branch_absent, branch_present) = fsia_branch_pair(first_arm, second_arm);
    let full = fsia_edge_message(
        &branch_absent,
        &branch_present,
        center_gap + outer_gap + 2,
    );
    let root_outer_component = add(
        &mul(&path(outer_gap), &branch_absent),
        &mul(&path(outer_gap - 1), &branch_present),
    );
    FSIARootMessages {
        full_free: full.free_if_parent_absent,
        full_blocked: full.free_if_parent_present,
        root_outer_component,
        center_dangling_free: path(center_gap),
        center_dangling_blocked: path(center_gap - 1),
    }
}

fn fsia_values_from_messages(
    root: FSIARootMessages,
    left: FSIAMessage,
    right: FSIAMessage,
) -> [Z; 4] {
    let center_absent = product(&[
        root.full_free,
        left.free_if_parent_absent,
        right.free_if_parent_absent,
    ]);
    let center_present = shifted(
        &product(&[
            root.full_blocked,
            left.free_if_parent_present,
            right.free_if_parent_present,
        ]),
        1,
    );
    let core = add(&center_absent, &center_present);

    let deleted_center_absent = product(&[
        root.center_dangling_free,
        left.free_if_parent_absent,
        right.free_if_parent_absent,
    ]);
    let deleted_center_present = shifted(
        &product(&[
            root.center_dangling_blocked,
            left.free_if_parent_present,
            right.free_if_parent_present,
        ]),
        1,
    );
    let deleted_center_component = add(&deleted_center_absent, &deleted_center_present);
    let deleted = mul(&root.root_outer_component, &deleted_center_component);
    deltas03(&core, &deleted)
}

fn fsia_values_with_variable(
    lengths: &[i32; 10],
    varying: usize,
    root_base: FSIARootMessages,
    left_base: FSIAMessage,
    right_base: FSIAMessage,
) -> [Z; 4] {
    let root = if varying < 4 {
        fsia_root_messages(lengths[0], lengths[1], lengths[2], lengths[3])
    } else {
        root_base
    };
    let left = if (4..7).contains(&varying) {
        fsia_module_message(lengths[4], lengths[5], lengths[6])
    } else {
        left_base
    };
    let right = if varying >= 7 {
        fsia_module_message(lengths[7], lengths[8], lengths[9])
    } else {
        right_base
    };
    fsia_values_from_messages(root, left, right)
}

fn fsia_append_path(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> Vec<usize> {
    let mut vertices = Vec::with_capacity(length as usize);
    let mut previous = start;
    for _ in 0..length {
        let vertex = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[previous].push(vertex);
        adjacency[vertex].push(previous);
        vertices.push(vertex);
        previous = vertex;
    }
    vertices
}

// Fully expanded adjacency construction, independent of the message evaluator.
fn fsia_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let center = 0_usize;
    let root_path = fsia_append_path(
        &mut adjacency,
        center,
        lengths[2] + lengths[3] + 2,
    );
    let literal_root = root_path[lengths[2] as usize];
    let root_outer = *root_path.last().unwrap();
    fsia_append_path(&mut adjacency, root_outer, lengths[0]);
    fsia_append_path(&mut adjacency, root_outer, lengths[1]);

    for offset in [4_usize, 7_usize] {
        let center_path = fsia_append_path(&mut adjacency, center, lengths[offset + 2]);
        let outer = *center_path.last().unwrap();
        fsia_append_path(&mut adjacency, outer, lengths[offset]);
        fsia_append_path(&mut adjacency, outer, lengths[offset + 1]);
    }
    assert_eq!(adjacency.len(), (3 + lengths.iter().sum::<i32>()) as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[literal_root].len(), 2);
    (adjacency, literal_root)
}

fn fsia_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = fsia_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn fsia_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn fsia_hash_state(hash: &mut AuditSha256, state: FSIAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn fsia_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs {
        hash.update(&limb.to_le_bytes());
    }
}

fn fsia_coefficient_leaf(
    states: &[FSIAState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"center-outer-spine-internal-coefficient-v1\0");
    for &state in states {
        fsia_hash_state(&mut hash, state);
    }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row {
            fsia_hash_z(&mut hash, value);
        }
    }
    fsia_sha_bytes(hash)
}

fn fsia_finite_leaf(states: &[FSIAState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"center-outer-spine-internal-finite-v1\0");
    for &state in states {
        fsia_hash_state(&mut hash, state);
    }
    hash.update(&order.to_le_bytes());
    for &value in values {
        fsia_hash_z(&mut hash, value);
    }
    fsia_sha_bytes(hash)
}

struct FSIAResult {
    root_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn fsia_root_worker(
    root_index: usize,
    roots: Arc<Vec<FSIARootState>>,
    root_messages: Arc<Vec<FSIARootMessages>>,
    modules: Arc<Vec<FSIAModule>>,
    module_messages: Arc<Vec<FSIAMessage>>,
) -> FSIAResult {
    let root_state = roots[root_index];
    let root_base = root_messages[root_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();

    for left_index in 0..modules.len() {
        for right_index in left_index..modules.len() {
            let states = fsia_states(root_state, modules[left_index], modules[right_index]);
            let flags: [bool; 10] =
                std::array::from_fn(|index| states[index].is_long);
            let long_count = flags.iter().filter(|&&flag| flag).count();
            let mut lengths = fsia_lengths(&states);
            let left_base = module_messages[left_index];
            let right_base = module_messages[right_index];

            if long_count == 0 {
                counts[0] += 1;
                let order = 3 + lengths.iter().sum::<i32>();
                if order < 27 {
                    continue;
                }
                let values = fsia_values_from_messages(root_base, left_base, right_base);
                let literal = fsia_literal_values(&lengths);
                assert_eq!(literal, values, "finite literal/message mismatch");
                assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
                finite_leaves.extend_from_slice(&fsia_finite_leaf(&states, order, &values));
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
                let values = fsia_values_with_variable(
                    &lengths,
                    varying,
                    root_base,
                    left_base,
                    right_base,
                );
                if sample == 0 || sample == 13 {
                    let literal = fsia_literal_values(&lengths);
                    assert_eq!(literal, values, "ray literal/message mismatch");
                    literal_trees += 1;
                }
                for rank in 0..4 {
                    samples[rank][sample] = values[rank];
                }
            }
            let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
                std::array::from_fn(|rank| audit_differences(&samples[rank]));
            audit_assert_gate(&coefficients);
            coefficient_leaves.extend_from_slice(&fsia_coefficient_leaf(
                &states,
                baseline,
                shift,
                &coefficients,
            ));

            lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
            let unseen_values = fsia_values_with_variable(
                &lengths,
                varying,
                root_base,
                left_base,
                right_base,
            );
            let literal_unseen = fsia_literal_values(&lengths);
            assert_eq!(
                literal_unseen,
                unseen_values,
                "unseen literal/message mismatch"
            );
            literal_trees += 1;
            for rank in 0..4 {
                assert_eq!(
                    unseen_values[rank],
                    audit_newton_at_29(&coefficients[rank]),
                    "unseen Newton mismatch"
                );
                unseen += 1;
            }
            counts[4] += 1;
        }
    }

    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    FSIAResult {
        root_index,
        counts,
        unseen,
        literal_trees,
        coefficient_leaves,
        finite_leaves,
    }
}

fn main() {
    audit_sha_self_test();
    let roots = Arc::new(fsia_root_states());
    let modules = Arc::new(fsia_modules());
    let root_messages = Arc::new(
        roots
            .iter()
            .map(|state| {
                fsia_root_messages(
                    state.first_arm.length,
                    state.second_arm.length,
                    state.center_gap.length,
                    state.outer_gap.length,
                )
            })
            .collect::<Vec<_>>(),
    );
    let module_messages = Arc::new(
        modules
            .iter()
            .map(|module| {
                fsia_module_message(
                    module.first_arm.length,
                    module.second_arm.length,
                    module.center_edge.length,
                )
            })
            .collect::<Vec<_>>(),
    );

    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..roots.len()).step_by(FSIA_BATCH_ROOTS) {
        let batch_end = (batch_start + FSIA_BATCH_ROOTS).min(roots.len());
        let mut handles = Vec::new();
        for worker in 0..FSIA_THREADS {
            let roots_copy = Arc::clone(&roots);
            let root_messages_copy = Arc::clone(&root_messages);
            let modules_copy = Arc::clone(&modules);
            let module_messages_copy = Arc::clone(&module_messages);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut root_index = batch_start + worker;
                while root_index < batch_end {
                    local.push(fsia_root_worker(
                        root_index,
                        Arc::clone(&roots_copy),
                        Arc::clone(&root_messages_copy),
                        Arc::clone(&modules_copy),
                        Arc::clone(&module_messages_copy),
                    ));
                    root_index += FSIA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<FSIAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("audit worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.root_index);
        for result in results {
            for index in 0..5 {
                counts[index] += result.counts[index];
            }
            unseen += result.unseen;
            literal_trees += result.literal_trees;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("AUDIT ROOTS {}/{}", batch_end, roots.len());
    }

    assert_eq!(
        counts,
        [11_193_462, 10_888_155, 33_964_937, 1, 33_964_938]
    );
    assert_eq!(unseen, 135_859_752);
    assert_eq!(literal_trees, 10_888_155 + 3 * 33_964_938);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_STAR_CENTER_OUTER_SPINE_INTERNAL\n",
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
        "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    )
    .expect("audit raw write");
    print!("{}", raw);
}
