// Independent checked-i256 audit for
// four_cubic_star:pendant_internal.
//
// Unlike the root-split producer, this engine starts with the selected-root
// tail states, propagates forward through the distinguished outer cubic to
// the center, and only then attaches the two symmetric outer modules.  The
// root-deleted forest is built independently from a detached tail and a
// truncated pendant at the distinguished outer cubic.  A full run expands
// every eligible finite tree and S=0,13,29 on every Newton ray.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const PSA_THREADS: usize = 6;
const PSA_BATCH_PREFIXES: usize = 12;

#[derive(Clone, Copy)]
struct PSAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct PSABranchState {
    parent_absent: V,
    parent_present: V,
}

#[derive(Clone, Copy)]
struct PSAModule {
    low: PSAState,
    high: PSAState,
    spine: PSAState,
    at_center: PSABranchState,
}

#[derive(Clone, Copy)]
struct PSAModulePair {
    first: PSAModule,
    second: PSAModule,
}

#[derive(Clone, Copy)]
struct PSAPrefix {
    near_gap: PSAState,
    tail: PSAState,
    sibling: PSAState,
    distinguished_spine: PSAState,
}

fn psa_gap(length: i32) -> PSAState {
    PSAState { length, is_long: length == 7 }
}

fn psa_pendant(length: i32) -> PSAState {
    PSAState { length, is_long: length == 7 }
}

fn psa_spine(length: i32) -> PSAState {
    PSAState { length, is_long: length == 8 }
}

fn psa_propagate(
    child_absent: V,
    child_present: V,
    edge_length: i32,
) -> PSABranchState {
    PSABranchState {
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

fn psa_module_at_center(low: i32, high: i32, spine: i32) -> PSABranchState {
    let outer_absent = mul(&path(low), &path(high));
    let outer_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    psa_propagate(outer_absent, outer_present, spine)
}

fn psa_modules() -> Vec<PSAModule> {
    let mut modules = Vec::with_capacity(224);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(PSAModule {
                    low: psa_pendant(low),
                    high: psa_pendant(high),
                    spine: psa_spine(spine),
                    at_center: psa_module_at_center(low, high, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn psa_module_pairs() -> Vec<PSAModulePair> {
    let modules = psa_modules();
    let mut pairs = Vec::with_capacity(25_200);
    for first_index in 0..modules.len() {
        for second_index in first_index..modules.len() {
            pairs.push(PSAModulePair {
                first: modules[first_index],
                second: modules[second_index],
            });
        }
    }
    assert_eq!(pairs.len(), 25_200);
    pairs
}

fn psa_prefixes() -> Vec<PSAPrefix> {
    let mut prefixes = Vec::with_capacity(3_136);
    for near_gap in 0..=7_i32 {
        for tail in 1..=7_i32 {
            for sibling in 1..=7_i32 {
                for distinguished_spine in 1..=8_i32 {
                    prefixes.push(PSAPrefix {
                        near_gap: psa_gap(near_gap),
                        tail: psa_pendant(tail),
                        sibling: psa_pendant(sibling),
                        distinguished_spine: psa_spine(distinguished_spine),
                    });
                }
            }
        }
    }
    assert_eq!(prefixes.len(), 3_136);
    prefixes
}

fn psa_states(prefix: PSAPrefix, pair: PSAModulePair) -> [PSAState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.sibling,
        prefix.distinguished_spine,
        pair.first.low,
        pair.first.high,
        pair.first.spine,
        pair.second.low,
        pair.second.high,
        pair.second.spine,
    ]
}

fn psa_lengths(states: &[PSAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn psa_finish_at_center(
    incoming: PSABranchState,
    first: PSABranchState,
    second: PSABranchState,
) -> V {
    let center_absent = product(&[
        incoming.parent_absent,
        first.parent_absent,
        second.parent_absent,
    ]);
    let center_present = shifted(
        &product(&[
            incoming.parent_present,
            first.parent_present,
            second.parent_present,
        ]),
        1,
    );
    add(&center_absent, &center_present)
}

fn psa_polynomials_from_modules(
    lengths: &[i32; 10],
    first: PSABranchState,
    second: PSABranchState,
) -> (V, V) {
    // Full tree: begin at the selected root, including its tail, then move
    // forward to the distinguished outer cubic and center.
    let root_absent = path(lengths[1]);
    let root_present = shifted(&path(lengths[1] - 1), 1);
    let at_outer = psa_propagate(root_absent, root_present, lengths[0] + 1);
    let outer_absent = mul(&path(lengths[2]), &at_outer.parent_absent);
    let outer_present = shifted(
        &mul(&path(lengths[2] - 1), &at_outer.parent_present),
        1,
    );
    let at_center = psa_propagate(
        outer_absent,
        outer_present,
        lengths[3],
    );
    let core = psa_finish_at_center(at_center, first, second);

    // Deleted root: its tail is detached.  The near-gap vertices become an
    // ordinary pendant at the distinguished outer cubic.
    let deleted_outer_absent = mul(&path(lengths[0]), &path(lengths[2]));
    let deleted_outer_present = shifted(
        &mul(&path(lengths[0] - 1), &path(lengths[2] - 1)),
        1,
    );
    let deleted_at_center = psa_propagate(
        deleted_outer_absent,
        deleted_outer_present,
        lengths[3],
    );
    let deleted_remainder = psa_finish_at_center(
        deleted_at_center,
        first,
        second,
    );
    (core, mul(&path(lengths[1]), &deleted_remainder))
}

fn psa_formula_polynomials(lengths: &[i32; 10]) -> (V, V) {
    let first = psa_module_at_center(lengths[4], lengths[5], lengths[6]);
    let second = psa_module_at_center(lengths[7], lengths[8], lengths[9]);
    psa_polynomials_from_modules(lengths, first, second)
}

fn psa_values(
    lengths: &[i32; 10],
    pair: PSAModulePair,
    varying: Option<usize>,
) -> [Z; 4] {
    let first = if varying.is_some_and(|index| (4..7).contains(&index)) {
        psa_module_at_center(lengths[4], lengths[5], lengths[6])
    } else {
        pair.first.at_center
    };
    let second = if varying.is_some_and(|index| index >= 7) {
        psa_module_at_center(lengths[7], lengths[8], lengths[9])
    } else {
        pair.second.at_center
    };
    let (core, deleted) = psa_polynomials_from_modules(lengths, first, second);
    deltas03(&core, &deleted)
}

fn psa_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut endpoint = start;
    for _ in 0..length {
        let next = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[endpoint].push(next);
        adjacency[next].push(endpoint);
        endpoint = next;
    }
    endpoint
}

fn psa_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    psa_extend(&mut adjacency, root, lengths[1]);
    let distinguished_outer = psa_extend(&mut adjacency, root, lengths[0] + 1);
    psa_extend(&mut adjacency, distinguished_outer, lengths[2]);
    let center = psa_extend(&mut adjacency, distinguished_outer, lengths[3]);
    let first_outer = psa_extend(&mut adjacency, center, lengths[6]);
    psa_extend(&mut adjacency, first_outer, lengths[4]);
    psa_extend(&mut adjacency, first_outer, lengths[5]);
    let second_outer = psa_extend(&mut adjacency, center, lengths[9]);
    psa_extend(&mut adjacency, second_outer, lengths[7]);
    psa_extend(&mut adjacency, second_outer, lengths[8]);
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (adjacency.len() - 1),
    );
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn psa_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = psa_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn psa_smoke() {
    let mut random = 0xD1B54A32D192ED03_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = if index == 0 {
                (random % 19) as i32
            } else {
                1 + (random % 19) as i32
            };
        }
        let (core, deleted) = psa_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            psa_literal_values(&lengths),
            "forward formula mismatch {}",
            sample,
        );
    }

    let prefixes = psa_prefixes();
    let pairs = psa_module_pairs();
    for sample in 0..512_usize {
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let prefix = prefixes[random as usize % prefixes.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let pair = pairs[random as usize % pairs.len()];
        let mut lengths = psa_lengths(&psa_states(prefix, pair));
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = random as usize % 10;
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            psa_values(&lengths, pair, Some(varying)),
            psa_literal_values(&lengths),
            "cached formula mismatch {}",
            sample,
        );
    }
    println!("PASS_INDEPENDENT_FOUR_CUBIC_STAR_PENDANT_INTERNAL_1024_LITERAL_SMOKE");
}

fn psa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn psa_hash_state(hash: &mut AuditSha256, state: PSAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn psa_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs {
        hash.update(&limb.to_le_bytes());
    }
}

fn psa_coefficient_leaf(
    states: &[PSAState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-pendant-internal-coefficient-v1\0");
    for &state in states {
        psa_hash_state(&mut hash, state);
    }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row {
            psa_hash_z(&mut hash, value);
        }
    }
    psa_sha_bytes(hash)
}

fn psa_finite_leaf(
    states: &[PSAState; 10],
    order: i32,
    values: &[Z; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-pendant-internal-finite-v1\0");
    for &state in states {
        psa_hash_state(&mut hash, state);
    }
    hash.update(&order.to_le_bytes());
    for &value in values {
        psa_hash_z(&mut hash, value);
    }
    psa_sha_bytes(hash)
}

fn psa_smoke_stream() {
    let prefixes = psa_prefixes();
    let pairs = psa_module_pairs();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let pair = pairs[(sample * 104729 + 23) % pairs.len()];
        let states = psa_states(prefix, pair);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let mut lengths = psa_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = psa_values(&lengths, pair, None);
                finite_stream.update(&psa_finite_leaf(&states, order, &values));
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
            let values = psa_values(&lengths, pair, Some(varying));
            for rank in 0..4 {
                samples[rank][point] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(&psa_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!(
        "SMOKE_STREAM {} {}",
        coefficient_stream.hex(),
        finite_stream.hex(),
    );
}

struct PSAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn psa_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<PSAPrefix>>,
    pairs: Arc<Vec<PSAModulePair>>,
) -> PSAResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();

    for &pair in pairs.iter() {
        let states = psa_states(prefix, pair);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = psa_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 {
                continue;
            }
            let values = psa_values(&lengths, pair, None);
            assert_eq!(values, psa_literal_values(&lengths), "finite literal mismatch");
            assert!(values.iter().all(|value| value.is_positive()));
            finite_leaves.extend_from_slice(&psa_finite_leaf(&states, order, &values));
            literal_trees += 1;
            counts[1] += 1;
            continue;
        }

        if long_count == 10 {
            counts[3] += 1;
        } else {
            counts[2] += 1;
        }
        let baseline = 2 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32;
            let values = psa_values(&lengths, pair, Some(varying));
            if sample == 0 || sample == 13 {
                assert_eq!(values, psa_literal_values(&lengths), "ray literal mismatch");
                literal_trees += 1;
            }
            for rank in 0..4 {
                samples[rank][sample] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&psa_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = psa_values(&lengths, pair, Some(varying));
        assert_eq!(next, psa_literal_values(&lengths), "unseen literal mismatch");
        literal_trees += 1;
        for rank in 0..4 {
            assert_eq!(
                next[rank],
                audit_newton_at_29(&coefficients[rank]),
                "unseen Newton mismatch",
            );
            unseen += 1;
        }
        counts[4] += 1;
    }

    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    PSAResult {
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
        psa_smoke();
        psa_smoke_stream();
        return;
    }

    let prefixes = Arc::new(psa_prefixes());
    let pairs = Arc::new(psa_module_pairs());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(PSA_BATCH_PREFIXES) {
        let batch_end = (batch_start + PSA_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..PSA_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let pair_copy = Arc::clone(&pairs);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(psa_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&pair_copy),
                    ));
                    prefix_index += PSA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<PSAResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("audit worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 {
                counts[index] += result.counts[index];
            }
            unseen += result.unseen;
            literal_trees += result.literal_trees;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("AUDIT PREFIXES {}/{}", batch_end, prefixes.len());
    }

    assert_eq!(
        counts,
        [19_188_792, 18_693_172, 59_838_407, 1, 59_838_408],
    );
    assert_eq!(unseen, 239_353_632);
    assert_eq!(literal_trees, 198_208_396);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_STAR_PENDANT_INTERNAL\n",
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
        "rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    )
    .expect("audit raw write");
    print!("{}", raw);
}
