// Memory-bounded checked-i256 producer for
// four_cubic_star:pendant_internal.
//
// The core is split at the selected degree-two root.  The tail is one side;
// the other side is evaluated by messages from the two symmetric outer
// modules through the center and distinguished outer branch to the root.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const PSP_THREADS: usize = 6;
const PSP_BATCH_PREFIXES: usize = 12;

#[derive(Clone, Copy)]
struct PSPState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct PSPTransfer {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct PSPModule {
    low: PSPState,
    high: PSPState,
    spine: PSPState,
    parts: PSPTransfer,
}

#[derive(Clone, Copy)]
struct PSPModulePair {
    left: PSPModule,
    right: PSPModule,
    center_absent: V,
    center_present_without_x: V,
}

#[derive(Clone, Copy)]
struct PSPPrefix {
    near_gap: PSPState,
    tail: PSPState,
    sibling: PSPState,
    distinguished_spine: PSPState,
}

fn psp_gap(length: i32) -> PSPState {
    PSPState { length, is_long: length == 7 }
}

fn psp_pendant(length: i32) -> PSPState {
    PSPState { length, is_long: length == 7 }
}

fn psp_spine(length: i32) -> PSPState {
    PSPState { length, is_long: length == 8 }
}

fn psp_cross_path(far_absent: V, far_present: V, edge_length: i32) -> PSPTransfer {
    PSPTransfer {
        free: add(
            &mul(&path(edge_length - 1), &far_absent),
            &mul(&path(edge_length - 2), &far_present),
        ),
        blocked: add(
            &mul(&path(edge_length - 2), &far_absent),
            &mul(&path(edge_length - 3), &far_present),
        ),
    }
}

fn psp_module_parts(low: i32, high: i32, spine: i32) -> PSPTransfer {
    let outer_absent = mul(&path(low), &path(high));
    let outer_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    psp_cross_path(outer_absent, outer_present, spine)
}

fn psp_modules() -> Vec<PSPModule> {
    let mut modules = Vec::with_capacity(224);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(PSPModule {
                    low: psp_pendant(low),
                    high: psp_pendant(high),
                    spine: psp_spine(spine),
                    parts: psp_module_parts(low, high, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn psp_module_pairs() -> Vec<PSPModulePair> {
    let modules = psp_modules();
    let mut pairs = Vec::with_capacity(25_200);
    for left_index in 0..modules.len() {
        for right_index in left_index..modules.len() {
            let left = modules[left_index];
            let right = modules[right_index];
            pairs.push(PSPModulePair {
                left,
                right,
                center_absent: mul(&left.parts.free, &right.parts.free),
                center_present_without_x: mul(
                    &left.parts.blocked,
                    &right.parts.blocked,
                ),
            });
        }
    }
    assert_eq!(pairs.len(), 25_200);
    pairs
}

fn psp_prefixes() -> Vec<PSPPrefix> {
    let mut prefixes = Vec::with_capacity(3_136);
    for near_gap in 0..=7_i32 {
        for tail in 1..=7_i32 {
            for sibling in 1..=7_i32 {
                for distinguished_spine in 1..=8_i32 {
                    prefixes.push(PSPPrefix {
                        near_gap: psp_gap(near_gap),
                        tail: psp_pendant(tail),
                        sibling: psp_pendant(sibling),
                        distinguished_spine: psp_spine(distinguished_spine),
                    });
                }
            }
        }
    }
    assert_eq!(prefixes.len(), 3_136);
    prefixes
}

fn psp_states(prefix: PSPPrefix, pair: PSPModulePair) -> [PSPState; 10] {
    [
        prefix.near_gap,
        prefix.tail,
        prefix.sibling,
        prefix.distinguished_spine,
        pair.left.low,
        pair.left.high,
        pair.left.spine,
        pair.right.low,
        pair.right.high,
        pair.right.spine,
    ]
}

fn psp_lengths(states: &[PSPState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn psp_polynomials_from_center(
    lengths: &[i32; 10],
    center_absent: V,
    center_present_without_x: V,
) -> (V, V) {
    let center_present = shifted(&center_present_without_x, 1);
    let center_at_outer = psp_cross_path(
        center_absent,
        center_present,
        lengths[3],
    );
    let outer_absent = mul(&path(lengths[2]), &center_at_outer.free);
    let outer_present = shifted(
        &mul(&path(lengths[2] - 1), &center_at_outer.blocked),
        1,
    );
    let outer_at_root = psp_cross_path(
        outer_absent,
        outer_present,
        lengths[0] + 1,
    );
    let deleted = mul(&path(lengths[1]), &outer_at_root.free);
    let selected_root = shifted(
        &mul(&path(lengths[1] - 1), &outer_at_root.blocked),
        1,
    );
    (add(&deleted, &selected_root), deleted)
}

fn psp_formula_polynomials(lengths: &[i32; 10]) -> (V, V) {
    let left = psp_module_parts(lengths[4], lengths[5], lengths[6]);
    let right = psp_module_parts(lengths[7], lengths[8], lengths[9]);
    psp_polynomials_from_center(
        lengths,
        mul(&left.free, &right.free),
        mul(&left.blocked, &right.blocked),
    )
}

fn psp_values_fixed(lengths: &[i32; 10], pair: PSPModulePair) -> [Z; 4] {
    let (core, deleted) = psp_polynomials_from_center(
        lengths,
        pair.center_absent,
        pair.center_present_without_x,
    );
    deltas03(&core, &deleted)
}

fn psp_values_variable(
    lengths: &[i32; 10],
    varying: usize,
    pair: PSPModulePair,
) -> [Z; 4] {
    let (center_absent, center_present_without_x) = if varying >= 4 {
        let left = if varying < 7 {
            psp_module_parts(lengths[4], lengths[5], lengths[6])
        } else {
            pair.left.parts
        };
        let right = if varying >= 7 {
            psp_module_parts(lengths[7], lengths[8], lengths[9])
        } else {
            pair.right.parts
        };
        (
            mul(&left.free, &right.free),
            mul(&left.blocked, &right.blocked),
        )
    } else {
        (pair.center_absent, pair.center_present_without_x)
    };
    let (core, deleted) = psp_polynomials_from_center(
        lengths,
        center_absent,
        center_present_without_x,
    );
    deltas03(&core, &deleted)
}

fn psp_literal_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    audit_attach(&mut adjacency, root, lengths[1]);
    let distinguished_outer = audit_attach(&mut adjacency, root, lengths[0] + 1);
    audit_attach(&mut adjacency, distinguished_outer, lengths[2]);
    let center = audit_attach(
        &mut adjacency,
        distinguished_outer,
        lengths[3],
    );
    for offset in [4_usize, 7_usize] {
        let outer = audit_attach(&mut adjacency, center, lengths[offset + 2]);
        audit_attach(&mut adjacency, outer, lengths[offset]);
        audit_attach(&mut adjacency, outer, lengths[offset + 1]);
    }
    assert_eq!(adjacency.len(), 2 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (adjacency.len() - 1),
    );
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn psp_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = psp_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn psp_smoke() {
    let mut random = 0x9E3779B97F4A7C15_u64;
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
        let (core, deleted) = psp_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            psp_literal_values(&lengths),
            "literal/formula mismatch {}",
            sample,
        );
    }
    println!("PASS_FOUR_CUBIC_STAR_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE");
}

fn psp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn psp_hash_state(hash: &mut AuditSha256, state: PSPState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn psp_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs {
        hash.update(&limb.to_le_bytes());
    }
}

fn psp_coefficient_leaf(
    states: &[PSPState; 10],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-pendant-internal-coefficient-v1\0");
    for &state in states {
        psp_hash_state(&mut hash, state);
    }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row {
            psp_hash_z(&mut hash, value);
        }
    }
    psp_sha_bytes(hash)
}

fn psp_finite_leaf(
    states: &[PSPState; 10],
    order: i32,
    values: &[Z; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-star-pendant-internal-finite-v1\0");
    for &state in states {
        psp_hash_state(&mut hash, state);
    }
    hash.update(&order.to_le_bytes());
    for &value in values {
        psp_hash_z(&mut hash, value);
    }
    psp_sha_bytes(hash)
}

fn psp_smoke_stream() {
    let prefixes = psp_prefixes();
    let pairs = psp_module_pairs();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7919 + 17) % prefixes.len()];
        let pair = pairs[(sample * 104729 + 23) % pairs.len()];
        let states = psp_states(prefix, pair);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let mut lengths = psp_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 2 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = psp_values_fixed(&lengths, pair);
                finite_stream.update(&psp_finite_leaf(&states, order, &values));
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
            let values = psp_values_variable(&lengths, varying, pair);
            for rank in 0..4 {
                samples[rank][point] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(&psp_coefficient_leaf(
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

struct PSPResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_checks: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn psp_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<PSPPrefix>>,
    pairs: Arc<Vec<PSPModulePair>>,
) -> PSPResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut checked_finite = false;
    let mut checked_ray = false;

    for &pair in pairs.iter() {
        let states = psp_states(prefix, pair);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = psp_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 2 + lengths.iter().sum::<i32>();
            if order < 27 {
                continue;
            }
            let values = psp_values_fixed(&lengths, pair);
            assert!(values.iter().all(|value| value.is_positive()));
            finite_leaves.extend_from_slice(&psp_finite_leaf(&states, order, &values));
            if !checked_finite {
                assert_eq!(values, psp_literal_values(&lengths));
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
        let baseline = 2 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = psp_values_variable(&lengths, varying, pair);
            for rank in 0..4 {
                samples[rank][point] = values[rank];
            }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
            std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&psp_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = psp_values_variable(&lengths, varying, pair);
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]));
            unseen += 1;
        }
        if !checked_ray {
            assert_eq!(next, psp_literal_values(&lengths));
            checked_ray = true;
            literal_checks += 1;
        }
        counts[4] += 1;
    }

    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    PSPResult {
        prefix_index,
        counts,
        unseen,
        literal_checks,
        coefficient_leaves,
        finite_leaves,
    }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        psp_smoke();
        psp_smoke_stream();
        return;
    }

    let prefixes = Arc::new(psp_prefixes());
    let pairs = Arc::new(psp_module_pairs());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(PSP_BATCH_PREFIXES) {
        let batch_end = (batch_start + PSP_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..PSP_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let pair_copy = Arc::clone(&pairs);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(psp_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&pair_copy),
                    ));
                    prefix_index += PSP_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<PSPResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("producer worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 {
                counts[index] += result.counts[index];
            }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("PRODUCER PREFIXES {}/{}", batch_end, prefixes.len());
    }

    assert_eq!(
        counts,
        [19_188_792, 18_693_172, 59_838_407, 1, 59_838_408],
    );
    assert_eq!(unseen, 239_353_632);
    assert_eq!(literal_checks, 4_900);
    let raw = format!(
        concat!(
            "PASS_I256_FOUR_CUBIC_STAR_PENDANT_INTERNAL_PRODUCER\n",
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
        "rank8_delta03_e4_four_cubic_star_pendant_internal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    )
    .expect("producer raw write");
    print!("{}", raw);
}
