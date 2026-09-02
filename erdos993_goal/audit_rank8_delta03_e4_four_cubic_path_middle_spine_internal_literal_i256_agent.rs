// Independent checked-i256 audit for four_cubic_path:middle_spine_internal.
// It propagates from the left outer cubic through the selected root to the
// right outer cubic, and expands every finite tree plus S=0,13,29 per ray.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MSA_THREADS: usize = 6;
const MSA_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct MSAState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct MSAPair { low: MSAState, high: MSAState }

#[derive(Clone, Copy)]
struct MSATransfer { parent_absent: V, parent_present: V }

#[derive(Clone, Copy)]
struct MSAHalf {
    root_gap: MSAState,
    inner_pendant: MSAState,
    outer_spine: MSAState,
    outer_pair: MSAPair,
    to_root: MSATransfer,
}

fn msa_gap(length: i32) -> MSAState { MSAState { length, is_long: length == 7 } }
fn msa_pendant(length: i32) -> MSAState { MSAState { length, is_long: length == 7 } }
fn msa_spine(length: i32) -> MSAState { MSAState { length, is_long: length == 8 } }

fn msa_pairs() -> Vec<MSAPair> {
    let mut out = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            out.push(MSAPair { low: msa_pendant(low), high: msa_pendant(high) });
        }
    }
    assert_eq!(out.len(), 28); out
}

fn msa_transfer(child_absent: V, child_present: V, length: i32) -> MSATransfer {
    MSATransfer {
        parent_absent: add(&mul(&path(length - 1), &child_absent), &mul(&path(length - 2), &child_present)),
        parent_present: add(&mul(&path(length - 2), &child_absent), &mul(&path(length - 3), &child_present)),
    }
}

fn msa_half_to_root(gap: i32, inner: i32, spine: i32, low: i32, high: i32) -> MSATransfer {
    let outer_absent = mul(&path(low), &path(high));
    let outer_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    let outer_to_inner = msa_transfer(outer_absent, outer_present, spine);
    let inner_absent = mul(&path(inner), &outer_to_inner.parent_absent);
    let inner_present = shifted(&mul(&path(inner - 1), &outer_to_inner.parent_present), 1);
    msa_transfer(inner_absent, inner_present, gap + 1)
}

fn msa_halves() -> Vec<MSAHalf> {
    let pairs = msa_pairs(); let mut out = Vec::with_capacity(12_544);
    for gap in 0..=7_i32 {
        for inner in 1..=7_i32 {
            for spine in 1..=8_i32 {
                for &pair in &pairs {
                    out.push(MSAHalf {
                        root_gap: msa_gap(gap), inner_pendant: msa_pendant(inner),
                        outer_spine: msa_spine(spine), outer_pair: pair,
                        to_root: msa_half_to_root(gap, inner, spine, pair.low.length, pair.high.length),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544); out
}

fn msa_states(left: MSAHalf, right: MSAHalf) -> [MSAState; 10] {
    [left.root_gap, left.inner_pendant, left.outer_spine, left.outer_pair.low, left.outer_pair.high,
     right.root_gap, right.inner_pendant, right.outer_spine, right.outer_pair.low, right.outer_pair.high]
}

fn msa_lengths(states: &[MSAState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].length)
}

fn msa_full_forward(left_to_root: MSATransfer, lengths: &[i32; 10]) -> V {
    let root_absent = left_to_root.parent_absent;
    let root_present = shifted(&left_to_root.parent_present, 1);
    let root_to_inner = msa_transfer(root_absent, root_present, lengths[5] + 1);
    let inner_absent = mul(&path(lengths[6]), &root_to_inner.parent_absent);
    let inner_present = shifted(&mul(&path(lengths[6] - 1), &root_to_inner.parent_present), 1);
    let inner_to_outer = msa_transfer(inner_absent, inner_present, lengths[7]);
    let outer_absent = product(&[path(lengths[8]), path(lengths[9]), inner_to_outer.parent_absent]);
    let outer_present = shifted(&product(&[path(lengths[8] - 1), path(lengths[9] - 1), inner_to_outer.parent_present]), 1);
    add(&outer_absent, &outer_present)
}

fn msa_polys(lengths: &[i32; 10], cached_left: Option<MSATransfer>) -> (V, V) {
    let left = cached_left.unwrap_or_else(|| msa_half_to_root(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]));
    let right = msa_half_to_root(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]);
    (msa_full_forward(left, lengths), mul(&left.parent_absent, &right.parent_absent))
}

fn msa_values(lengths: &[i32; 10], left: MSAHalf, varying: Option<usize>) -> [Z; 4] {
    let cached = if varying.is_some_and(|index| index < 5) { None } else { Some(left.to_root) };
    let (core, deleted) = msa_polys(lengths, cached);
    deltas03(&core, &deleted)
}

fn msa_append(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut previous = start;
    for _ in 0..length {
        let vertex = adjacency.len(); adjacency.push(Vec::new());
        adjacency[previous].push(vertex); adjacency[vertex].push(previous); previous = vertex;
    }
    previous
}

fn msa_expanded_tree(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()]; let root = 0_usize;
    for offset in [0_usize, 5_usize] {
        let inner = msa_append(&mut adjacency, root, lengths[offset] + 1);
        msa_append(&mut adjacency, inner, lengths[offset + 1]);
        let outer = msa_append(&mut adjacency, inner, lengths[offset + 2]);
        msa_append(&mut adjacency, outer, lengths[offset + 3]);
        msa_append(&mut adjacency, outer, lengths[offset + 4]);
    }
    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2); (adjacency, root)
}

fn msa_literal_values(lengths: &[i32; 10]) -> [Z; 4] {
    let (adjacency, root) = msa_expanded_tree(lengths); audit_deltas(&adjacency, root).0
}

fn msa_smoke() {
    let mut state = 0xA4093822299F31D0_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12; state ^= state << 25; state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 || index == 5 { (state % 19) as i32 } else { 1 + (state % 19) as i32 };
        }
        let (core, deleted) = msa_polys(&lengths, None);
        assert_eq!(deltas03(&core, &deleted), msa_literal_values(&lengths), "formula smoke mismatch {}", sample);
    }
    let halves = msa_halves();
    for sample in 0..512_usize {
        state ^= state >> 12; state ^= state << 25; state ^= state >> 27; state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let left_index = state as usize % halves.len();
        state ^= state >> 12; state ^= state << 25; state ^= state >> 27; state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let right_index = left_index + state as usize % (halves.len() - left_index);
        let left = halves[left_index]; let right = halves[right_index];
        let mut lengths = msa_lengths(&msa_states(left, right));
        state ^= state >> 12; state ^= state << 25; state ^= state >> 27; state = state.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = state as usize % 10;
        state ^= state >> 12; state ^= state << 25; state ^= state >> 27; state = state.wrapping_mul(0x2545F4914F6CDD1D);
        lengths[varying] += (state % 19) as i32;
        assert_eq!(msa_values(&lengths, left, Some(varying)), msa_literal_values(&lengths), "cached smoke mismatch {}", sample);
    }
    println!("PASS_INDEPENDENT_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_1024_LITERAL_SMOKE");
}

fn msa_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow"); hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 { for index in hash.used..64 { hash.buffer[index] = 0; } let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0; }
    for index in hash.used..56 { hash.buffer[index] = 0; } hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block = hash.buffer; hash.block(&block); let mut out = [0_u8; 32];
    for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); } out
}

fn msa_hash_state(hash: &mut AuditSha256, state: MSAState) { hash.update(&[state.is_long as u8]); hash.update(&state.length.to_le_bytes()); }
fn msa_hash_z(hash: &mut AuditSha256, value: Z) { hash.update(&[value.negative as u8]); for limb in value.limbs { hash.update(&limb.to_le_bytes()); } }

fn msa_coefficient_leaf(states: &[MSAState; 10], baseline: i32, shift: i32, rows: &[[Z; AUDIT_SAMPLES]; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"four-cubic-path-middle-spine-internal-coefficient-v1\0");
    for &state in states { msa_hash_state(&mut hash, state); } hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { msa_hash_z(&mut hash, value); } } msa_sha_bytes(hash)
}

fn msa_finite_leaf(states: &[MSAState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new(); hash.update(b"four-cubic-path-middle-spine-internal-finite-v1\0");
    for &state in states { msa_hash_state(&mut hash, state); } hash.update(&order.to_le_bytes());
    for &value in values { msa_hash_z(&mut hash, value); } msa_sha_bytes(hash)
}

fn msa_smoke_stream() {
    let halves = msa_halves(); let mut coefficient_stream = AuditSha256::new(); let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64; let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let left_index = (sample * 7919 + 17) % halves.len();
        let right_index = left_index + (sample * 104729 + 23) % (halves.len() - left_index);
        let left = halves[left_index]; let right = halves[right_index]; let states = msa_states(left, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long); let mut lengths = msa_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 27 { let values = msa_values(&lengths, left, None); finite_stream.update(&msa_finite_leaf(&states, order, &values)); finite_records += 1; }
            continue;
        }
        let baseline = 3 + lengths.iter().sum::<i32>(); let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap(); let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES { lengths[varying] = initial + shift + point as i32; let values = msa_values(&lengths, left, Some(varying)); for rank in 0..4 { samples[rank][point] = values[rank]; } }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); audit_assert_gate(&coefficients);
        coefficient_stream.update(&msa_coefficient_leaf(&states, baseline, shift, &coefficients)); ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records); println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

struct MSAResult { prefix_index: usize, counts: [u64; 5], unseen: u64, literal_trees: u64, coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8> }

fn msa_prefix_worker(prefix_index: usize, halves: Arc<Vec<MSAHalf>>) -> MSAResult {
    let left = halves[prefix_index]; let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    for right_index in prefix_index..halves.len() {
        let right = halves[right_index]; let states = msa_states(left, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].is_long); let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = msa_lengths(&states);
        if long_count == 0 {
            counts[0] += 1; let order = 3 + lengths.iter().sum::<i32>(); if order < 27 { continue; }
            let values = msa_values(&lengths, left, None); assert_eq!(values, msa_literal_values(&lengths), "finite literal mismatch");
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive"); finite_leaves.extend_from_slice(&msa_finite_leaf(&states, order, &values));
            literal_trees += 1; counts[1] += 1; continue;
        }
        if long_count == 10 { counts[3] += 1; } else { counts[2] += 1; }
        let baseline = 3 + lengths.iter().sum::<i32>(); let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap(); let initial = lengths[varying]; let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32; let values = msa_values(&lengths, left, Some(varying));
            if sample == 0 || sample == 13 { assert_eq!(values, msa_literal_values(&lengths), "ray literal mismatch"); literal_trees += 1; }
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank])); audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&msa_coefficient_leaf(&states, baseline, shift, &coefficients));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32; let next = msa_values(&lengths, left, Some(varying));
        assert_eq!(next, msa_literal_values(&lengths), "unseen literal mismatch"); literal_trees += 1;
        for rank in 0..4 { assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch"); unseen += 1; } counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32); assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    MSAResult { prefix_index, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn main() {
    audit_sha_self_test(); if std::env::args().nth(1).as_deref() == Some("smoke") { msa_smoke(); msa_smoke_stream(); return; }
    let halves = Arc::new(msa_halves()); let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new(); let mut finite_master = AuditSha256::new();
    for batch_start in (0..halves.len()).step_by(MSA_BATCH_PREFIXES) {
        let batch_end = (batch_start + MSA_BATCH_PREFIXES).min(halves.len()); let mut handles = Vec::new();
        for worker in 0..MSA_THREADS { let half_copy = Arc::clone(&halves); handles.push(thread::spawn(move || { let mut local = Vec::new(); let mut prefix_index = batch_start + worker; while prefix_index < batch_end { local.push(msa_prefix_worker(prefix_index, Arc::clone(&half_copy))); prefix_index += MSA_THREADS; } local })); }
        let mut results: Vec<MSAResult> = handles.into_iter().map(|handle| handle.join().expect("audit worker panic")).flatten().collect(); results.sort_by_key(|result| result.prefix_index);
        for result in results { for index in 0..5 { counts[index] += result.counts[index]; } unseen += result.unseen; literal_trees += result.literal_trees; coefficient_master.update(&result.coefficient_leaves); finite_master.update(&result.finite_leaves); }
        eprintln!("AUDIT PREFIXES {}/{}", batch_end, halves.len());
    }
    assert_eq!(counts, [19_062_225, 18_574_731, 59_620_014, 1, 59_620_015]); assert_eq!(unseen, 238_480_060); assert_eq!(literal_trees, 197_434_776);
    let raw = format!(concat!("PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL\n",
        "COUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_TREES {}\nLITERAL_RAY_POINTS 0 13 29\n",
        "COEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n"), counts[0], counts[1], counts[2], counts[3], counts[4], unseen, literal_trees, coefficient_master.hex(), finite_master.hex());
    std::fs::write("rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("audit raw write"); print!("{}", raw);
}
