// Independent, memory-bounded exact audit for four_cubic_path:inner_branch.
//
// This source is independently transcribed and orients its full-tree dynamic
// program from the left outer cubic through the selected inner cubic toward
// the far outer cubic.  It also expands every eligible finite tree and
// S=0,S=13,S=29 on every ray as literal adjacency lists.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const IBA_THREADS: usize = 6;
const IBA_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct IBAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct IBAPair {
    low: IBAState,
    high: IBAState,
}

#[derive(Clone, Copy)]
struct IBATransfer {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct IBAPrefix {
    root_pendant: IBAState,
    left_pair: IBAPair,
    left_spine: IBAState,
    left_to_root: IBATransfer,
    root_absent: V,
    root_present: V,
}

#[derive(Clone, Copy)]
struct IBARight {
    other_inner_pendant: IBAState,
    middle_spine: IBAState,
    far_pair: IBAPair,
    far_spine: IBAState,
    deleted_right_component: V,
}

fn iba_pendant(length: i32) -> IBAState {
    IBAState { length, is_long: length == 7 }
}

fn iba_spine(length: i32) -> IBAState {
    IBAState { length, is_long: length == 8 }
}

fn iba_pairs() -> Vec<IBAPair> {
    let mut pairs = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            pairs.push(IBAPair {
                low: iba_pendant(low),
                high: iba_pendant(high),
            });
        }
    }
    assert_eq!(pairs.len(), 28);
    pairs
}

fn iba_outer_pair(low: i32, high: i32) -> (V, V) {
    let absent = product(&[path(low), path(high)]);
    let present = shifted(&product(&[path(low - 1), path(high - 1)]), 1);
    (absent, present)
}

fn iba_transfer(child_absent: V, child_present: V, edge_length: i32) -> IBATransfer {
    IBATransfer {
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

fn iba_left_to_root(low: i32, high: i32, spine: i32) -> IBATransfer {
    let (absent, present) = iba_outer_pair(low, high);
    iba_transfer(absent, present, spine)
}

fn iba_deleted_right(
    inner_pendant: i32,
    middle_spine: i32,
    far_low: i32,
    far_high: i32,
    far_spine: i32,
) -> V {
    let (far_absent, far_present) = iba_outer_pair(far_low, far_high);
    let far_to_inner = iba_transfer(far_absent, far_present, far_spine);
    let inner_absent = mul(&path(inner_pendant), &far_to_inner.parent_absent);
    let inner_present = shifted(
        &mul(&path(inner_pendant - 1), &far_to_inner.parent_present),
        1,
    );
    iba_transfer(inner_absent, inner_present, middle_spine).parent_absent
}

fn iba_prefixes() -> Vec<IBAPrefix> {
    let pairs = iba_pairs();
    let mut prefixes = Vec::with_capacity(1568);
    for root_length in 1..=7_i32 {
        let root_pendant = iba_pendant(root_length);
        for &left_pair in &pairs {
            for left_length in 1..=8_i32 {
                let left_spine = iba_spine(left_length);
                let left_to_root = iba_left_to_root(
                    left_pair.low.length,
                    left_pair.high.length,
                    left_length,
                );
                prefixes.push(IBAPrefix {
                    root_pendant,
                    left_pair,
                    left_spine,
                    left_to_root,
                    root_absent: mul(&path(root_length), &left_to_root.parent_absent),
                    root_present: shifted(
                        &mul(&path(root_length - 1), &left_to_root.parent_present),
                        1,
                    ),
                });
            }
        }
    }
    assert_eq!(prefixes.len(), 1568);
    prefixes
}

fn iba_rights() -> Vec<IBARight> {
    let pairs = iba_pairs();
    let mut rights = Vec::with_capacity(12544);
    for inner_length in 1..=7_i32 {
        let other_inner_pendant = iba_pendant(inner_length);
        for middle_length in 1..=8_i32 {
            let middle_spine = iba_spine(middle_length);
            for &far_pair in &pairs {
                for far_length in 1..=8_i32 {
                    let far_spine = iba_spine(far_length);
                    rights.push(IBARight {
                        other_inner_pendant,
                        middle_spine,
                        far_pair,
                        far_spine,
                        deleted_right_component: iba_deleted_right(
                            inner_length,
                            middle_length,
                            far_pair.low.length,
                            far_pair.high.length,
                            far_length,
                        ),
                    });
                }
            }
        }
    }
    assert_eq!(rights.len(), 12544);
    rights
}

fn iba_states(prefix: IBAPrefix, right: IBARight) -> [IBAState; 9] {
    [
        prefix.root_pendant,
        prefix.left_pair.low,
        prefix.left_pair.high,
        prefix.left_spine,
        right.other_inner_pendant,
        right.middle_spine,
        right.far_pair.low,
        right.far_pair.high,
        right.far_spine,
    ]
}

fn iba_lengths(states: &[IBAState; 9]) -> [i32; 9] {
    std::array::from_fn(|index| states[index].length)
}

fn iba_prefix_parts(lengths: &[i32; 9]) -> (IBATransfer, V, V) {
    let left = iba_left_to_root(lengths[1], lengths[2], lengths[3]);
    let root_absent = mul(&path(lengths[0]), &left.parent_absent);
    let root_present = shifted(&mul(&path(lengths[0] - 1), &left.parent_present), 1);
    (left, root_absent, root_present)
}

// Full tree is evaluated in a forward chain: B0 -> selected B1 -> B2 -> B3.
fn iba_values(
    lengths: &[i32; 9],
    prefix: IBAPrefix,
    right: IBARight,
    varying: Option<usize>,
) -> [Z; 4] {
    let (left, root_absent, root_present) = if varying.is_some_and(|index| index <= 3) {
        iba_prefix_parts(lengths)
    } else {
        (prefix.left_to_root, prefix.root_absent, prefix.root_present)
    };

    let root_to_other_inner = iba_transfer(root_absent, root_present, lengths[5]);
    let other_inner_absent = mul(
        &path(lengths[4]),
        &root_to_other_inner.parent_absent,
    );
    let other_inner_present = shifted(
        &mul(
            &path(lengths[4] - 1),
            &root_to_other_inner.parent_present,
        ),
        1,
    );
    let inner_to_far = iba_transfer(other_inner_absent, other_inner_present, lengths[8]);
    let far_absent = product(&[
        path(lengths[6]),
        path(lengths[7]),
        inner_to_far.parent_absent,
    ]);
    let far_present = shifted(
        &product(&[
            path(lengths[6] - 1),
            path(lengths[7] - 1),
            inner_to_far.parent_present,
        ]),
        1,
    );
    let core = add(&far_absent, &far_present);

    let right_deleted = if varying.is_some_and(|index| index >= 4) {
        iba_deleted_right(
            lengths[4],
            lengths[5],
            lengths[6],
            lengths[7],
            lengths[8],
        )
    } else {
        right.deleted_right_component
    };
    let root_path = if varying == Some(0) {
        path(lengths[0])
    } else {
        path(prefix.root_pendant.length)
    };
    let deleted = product(&[root_path, left.parent_absent, right_deleted]);
    deltas03(&core, &deleted)
}

fn iba_append(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
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

fn iba_expanded_tree(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let selected_root = 0_usize;
    iba_append(&mut adjacency, selected_root, lengths[0]);
    let left_outer = iba_append(&mut adjacency, selected_root, lengths[3]);
    iba_append(&mut adjacency, left_outer, lengths[1]);
    iba_append(&mut adjacency, left_outer, lengths[2]);
    let next_inner = iba_append(&mut adjacency, selected_root, lengths[5]);
    iba_append(&mut adjacency, next_inner, lengths[4]);
    let far_outer = iba_append(&mut adjacency, next_inner, lengths[8]);
    iba_append(&mut adjacency, far_outer, lengths[6]);
    iba_append(&mut adjacency, far_outer, lengths[7]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[selected_root].len(), 3);
    (adjacency, selected_root)
}

fn iba_literal_values(lengths: &[i32; 9]) -> [Z; 4] {
    let (adjacency, root) = iba_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn iba_smoke() {
    let prefixes = iba_prefixes();
    let rights = iba_rights();
    let mut state = 0x94D049BB133111EB_u64;
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
        let mut lengths = iba_lengths(&iba_states(prefix, right));
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = state as usize % 9;
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        state = state.wrapping_mul(0x2545F4914F6CDD1D);
        lengths[varying] += (state % 19) as i32;
        let values = iba_values(&lengths, prefix, right, Some(varying));
        assert_eq!(values, iba_literal_values(&lengths), "smoke mismatch {}", sample);
    }
    println!("PASS_INDEPENDENT_FOUR_CUBIC_PATH_INNER_BRANCH_512_LITERAL_SMOKE");
}

fn iba_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn iba_hash_state(hash: &mut AuditSha256, state: IBAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn iba_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn iba_coefficient_leaf(
    states: &[IBAState; 9], baseline: i32, shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-branch-coefficient-v1\0");
    for &state in states { iba_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { iba_hash_z(&mut hash, value); } }
    iba_sha_bytes(hash)
}

fn iba_finite_leaf(states: &[IBAState; 9], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-inner-branch-finite-v1\0");
    for &state in states { iba_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { iba_hash_z(&mut hash, value); }
    iba_sha_bytes(hash)
}

struct IBAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn iba_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<IBAPrefix>>,
    rights: Arc<Vec<IBARight>>,
) -> IBAResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for &right in rights.iter() {
        let states = iba_states(prefix, right);
        let flags: [bool; 9] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = iba_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 1 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = iba_values(&lengths, prefix, right, None);
            assert_eq!(values, iba_literal_values(&lengths), "finite literal mismatch");
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&iba_finite_leaf(&states, order, &values));
            literal_trees += 1;
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
            let values = iba_values(&lengths, prefix, right, Some(varying));
            if sample == 0 || sample == 13 {
                assert_eq!(values, iba_literal_values(&lengths), "ray literal mismatch");
                literal_trees += 1;
            }
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(
            &iba_coefficient_leaf(&states, baseline, shift, &coefficients),
        );
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = iba_values(&lengths, prefix, right, Some(varying));
        assert_eq!(next, iba_literal_values(&lengths), "unseen literal mismatch");
        literal_trees += 1;
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch");
            unseen += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    IBAResult {
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
        iba_smoke();
        return;
    }
    let prefixes = Arc::new(iba_prefixes());
    let rights = Arc::new(iba_rights());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(IBA_BATCH_PREFIXES) {
        let batch_end = (batch_start + IBA_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..IBA_THREADS {
            let prefixes_copy = Arc::clone(&prefixes);
            let rights_copy = Arc::clone(&rights);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(iba_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefixes_copy),
                        Arc::clone(&rights_copy),
                    ));
                    prefix_index += IBA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<IBAResult> = handles
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
    assert_eq!(counts, [5_445_468, 4_950_075, 14_223_523, 1, 14_223_524]);
    assert_eq!(unseen, 56_894_096);
    assert_eq!(literal_trees, 4_950_075 + 3 * 14_223_524);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_INNER_BRANCH\n",
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
        "rank8_delta03_e4_four_cubic_path_inner_branch_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}
