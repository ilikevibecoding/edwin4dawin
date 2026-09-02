// Memory-bounded six-thread checked-i256 producer for
// four_cubic_path:middle_spine_internal.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const MSI_THREADS: usize = 6;
const MSI_BATCH_PREFIXES: usize = 24;

#[derive(Clone, Copy)]
struct MSIState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct MSIPair { first: MSIState, second: MSIState }

#[derive(Clone, Copy)]
struct MSIMessage { free: V, blocked: V }

#[derive(Clone, Copy)]
struct MSIHalf {
    root_gap: MSIState,
    inner_pendant: MSIState,
    outer_spine: MSIState,
    outer_pair: MSIPair,
    message: MSIMessage,
}

fn msi_gap(value: i32) -> MSIState { MSIState { value, long: value == 7 } }
fn msi_pendant(value: i32) -> MSIState { MSIState { value, long: value == 7 } }
fn msi_spine(value: i32) -> MSIState { MSIState { value, long: value == 8 } }

fn msi_pairs() -> Vec<MSIPair> {
    let mut out = Vec::with_capacity(28);
    for first in 1..=7_i32 {
        for second in first..=7_i32 {
            out.push(MSIPair { first: msi_pendant(first), second: msi_pendant(second) });
        }
    }
    assert_eq!(out.len(), 28);
    out
}

fn msi_edge_message(absent: &V, present: &V, length: i32) -> MSIMessage {
    MSIMessage {
        free: add(&mul(&path(length - 1), absent), &mul(&path(length - 2), present)),
        blocked: add(&mul(&path(length - 2), absent), &mul(&path(length - 3), present)),
    }
}

fn msi_half_message(gap: i32, inner: i32, spine: i32, first: i32, second: i32) -> MSIMessage {
    let outer_absent = mul(&path(first), &path(second));
    let outer_present = shifted(&mul(&path(first - 1), &path(second - 1)), 1);
    let outer_to_inner = msi_edge_message(&outer_absent, &outer_present, spine);
    let inner_absent = mul(&path(inner), &outer_to_inner.free);
    let inner_present = shifted(&mul(&path(inner - 1), &outer_to_inner.blocked), 1);
    msi_edge_message(&inner_absent, &inner_present, gap + 1)
}

fn msi_halves() -> Vec<MSIHalf> {
    let pairs = msi_pairs();
    let mut out = Vec::with_capacity(12_544);
    for gap_value in 0..=7_i32 {
        for inner_value in 1..=7_i32 {
            for spine_value in 1..=8_i32 {
                for &outer_pair in &pairs {
                    out.push(MSIHalf {
                        root_gap: msi_gap(gap_value),
                        inner_pendant: msi_pendant(inner_value),
                        outer_spine: msi_spine(spine_value),
                        outer_pair,
                        message: msi_half_message(
                            gap_value, inner_value, spine_value,
                            outer_pair.first.value, outer_pair.second.value,
                        ),
                    });
                }
            }
        }
    }
    assert_eq!(out.len(), 12_544);
    out
}

fn msi_states(left: MSIHalf, right: MSIHalf) -> [MSIState; 10] {
    [
        left.root_gap, left.inner_pendant, left.outer_spine,
        left.outer_pair.first, left.outer_pair.second,
        right.root_gap, right.inner_pendant, right.outer_spine,
        right.outer_pair.first, right.outer_pair.second,
    ]
}

fn msi_lengths(states: &[MSIState; 10]) -> [i32; 10] {
    std::array::from_fn(|index| states[index].value)
}

fn msi_values_messages(left: MSIMessage, right: MSIMessage) -> [Z; 4] {
    let root_absent = mul(&left.free, &right.free);
    let root_present = shifted(&mul(&left.blocked, &right.blocked), 1);
    deltas03(&add(&root_absent, &root_present), &root_absent)
}

fn msi_values_fixed(left: MSIHalf, right: MSIHalf) -> [Z; 4] {
    msi_values_messages(left.message, right.message)
}

fn msi_values_variable(
    lengths: &[i32; 10],
    varying: usize,
    left: MSIHalf,
    right: MSIHalf,
) -> [Z; 4] {
    let left_message = if varying < 5 {
        msi_half_message(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4])
    } else { left.message };
    let right_message = if varying >= 5 {
        msi_half_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9])
    } else { right.message };
    msi_values_messages(left_message, right_message)
}

fn msi_formula_polys(lengths: &[i32; 10]) -> (V, V) {
    let left = msi_half_message(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]);
    let right = msi_half_message(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9]);
    let deleted = mul(&left.free, &right.free);
    let selected = shifted(&mul(&left.blocked, &right.blocked), 1);
    (add(&deleted, &selected), deleted)
}

fn msi_build_literal(lengths: &[i32; 10]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let root = 0_usize;
    for offset in [0_usize, 5_usize] {
        let inner = audit_attach(&mut adjacency, root, lengths[offset] + 1);
        audit_attach(&mut adjacency, inner, lengths[offset + 1]);
        let outer = audit_attach(&mut adjacency, inner, lengths[offset + 2]);
        audit_attach(&mut adjacency, outer, lengths[offset + 3]);
        audit_attach(&mut adjacency, outer, lengths[offset + 4]);
    }
    assert_eq!(adjacency.len(), 3 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    assert_eq!(adjacency[root].len(), 2);
    (adjacency, root)
}

fn msi_smoke() {
    let mut state = 0xDB4F0B9175AE2165_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 10];
        for (index, value) in lengths.iter_mut().enumerate() {
            state ^= state >> 12; state ^= state << 25; state ^= state >> 27;
            state = state.wrapping_mul(0x2545F4914F6CDD1D);
            *value = if index == 0 || index == 5 { (state % 17) as i32 }
                else { 1 + (state % 17) as i32 };
        }
        let (adjacency, root) = msi_build_literal(&lengths);
        let (literal, literal_core, literal_deleted) = audit_deltas(&adjacency, root);
        let (core, deleted) = msi_formula_polys(&lengths);
        assert_eq!(literal_core, core, "smoke core mismatch {}", sample);
        assert_eq!(literal_deleted, deleted, "smoke deleted mismatch {}", sample);
        assert_eq!(literal, deltas03(&core, &deleted), "smoke delta mismatch {}", sample);
    }
    println!("PASS_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_512_LITERAL_FORMULA_SMOKE");
}

fn msi_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
    let bits = hash.bytes.checked_mul(8).expect("sha length overflow");
    hash.buffer[hash.used] = 0x80; hash.used += 1;
    if hash.used > 56 {
        for index in hash.used..64 { hash.buffer[index] = 0; }
        let block = hash.buffer; hash.block(&block); hash.buffer = [0; 64]; hash.used = 0;
    }
    for index in hash.used..56 { hash.buffer[index] = 0; }
    hash.buffer[56..64].copy_from_slice(&bits.to_be_bytes());
    let block = hash.buffer; hash.block(&block);
    let mut out = [0_u8; 32];
    for index in 0..8 { out[4 * index..4 * index + 4].copy_from_slice(&hash.state[index].to_be_bytes()); }
    out
}

fn msi_hash_state(hash: &mut AuditSha256, state: MSIState) {
    hash.update(&[state.long as u8]); hash.update(&state.value.to_le_bytes());
}

fn msi_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn msi_coefficient_leaf(
    states: &[MSIState; 10], baseline: i32, shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-middle-spine-internal-coefficient-v1\0");
    for &state in states { msi_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes()); hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { msi_hash_z(&mut hash, value); } }
    msi_sha_bytes(hash)
}

fn msi_finite_leaf(states: &[MSIState; 10], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"four-cubic-path-middle-spine-internal-finite-v1\0");
    for &state in states { msi_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { msi_hash_z(&mut hash, value); }
    msi_sha_bytes(hash)
}

fn msi_smoke_stream() {
    let halves = msi_halves();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    for sample in 0..512_usize {
        let left_index = (sample * 7919 + 17) % halves.len();
        let right_index = left_index + (sample * 104729 + 23) % (halves.len() - left_index);
        let left = halves[left_index]; let right = halves[right_index];
        let states = msi_states(left, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let mut lengths = msi_lengths(&states);
        if !flags.iter().any(|&flag| flag) {
            let order = 3 + lengths.iter().sum::<i32>();
            if order >= 27 {
                let values = msi_values_fixed(left, right);
                finite_stream.update(&msi_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let baseline = 3 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for point in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + point as i32;
            let values = msi_values_variable(&lengths, varying, left, right);
            for rank in 0..4 { samples[rank][point] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_stream.update(&msi_coefficient_leaf(&states, baseline, shift, &coefficients));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

struct MSIResult {
    prefix_index: usize, counts: [u64; 5], unseen: u64,
    coefficient_leaves: Vec<u8>, finite_leaves: Vec<u8>, literal_checks: u64,
}

fn msi_prefix_worker(prefix_index: usize, halves: Arc<Vec<MSIHalf>>) -> MSIResult {
    let left = halves[prefix_index];
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64;
    let mut coefficient_leaves = Vec::new(); let mut finite_leaves = Vec::new();
    let mut literal_checks = 0_u64; let mut checked_finite = false; let mut checked_ray = false;
    for right_index in prefix_index..halves.len() {
        let right = halves[right_index];
        let states = msi_states(left, right);
        let flags: [bool; 10] = std::array::from_fn(|index| states[index].long);
        let long_count = flags.iter().filter(|&&flag| flag).count();
        let mut lengths = msi_lengths(&states);
        if long_count == 0 {
            counts[0] += 1;
            let order = 3 + lengths.iter().sum::<i32>();
            if order < 27 { continue; }
            let values = msi_values_fixed(left, right);
            assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
            finite_leaves.extend_from_slice(&msi_finite_leaf(&states, order, &values));
            if !checked_finite {
                let (adjacency, root) = msi_build_literal(&lengths);
                assert_eq!(audit_deltas(&adjacency, root).0, values, "finite literal mismatch");
                checked_finite = true; literal_checks += 1;
            }
            counts[1] += 1; continue;
        }
        if long_count == 10 { counts[3] += 1; } else { counts[2] += 1; }
        let baseline = 3 + lengths.iter().sum::<i32>();
        let shift = (27 - baseline).max(0);
        let varying = flags.iter().position(|&flag| flag).unwrap();
        let initial = lengths[varying];
        let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
        for sample in 0..AUDIT_SAMPLES {
            lengths[varying] = initial + shift + sample as i32;
            let values = msi_values_variable(&lengths, varying, left, right);
            for rank in 0..4 { samples[rank][sample] = values[rank]; }
        }
        let coefficients: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&msi_coefficient_leaf(&states, baseline, shift, &coefficients));
        lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
        let next = msi_values_variable(&lengths, varying, left, right);
        for rank in 0..4 {
            assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen mismatch"); unseen += 1;
        }
        if !checked_ray {
            let (adjacency, root) = msi_build_literal(&lengths);
            assert_eq!(audit_deltas(&adjacency, root).0, next, "ray literal mismatch");
            checked_ray = true; literal_checks += 1;
        }
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    MSIResult { prefix_index, counts, unseen, coefficient_leaves, finite_leaves, literal_checks }
}

fn main() {
    audit_sha_self_test();
    if std::env::args().nth(1).as_deref() == Some("smoke") {
        msi_smoke(); msi_smoke_stream(); return;
    }
    let halves = Arc::new(msi_halves());
    let mut counts = [0_u64; 5]; let mut unseen = 0_u64; let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new(); let mut finite_master = AuditSha256::new();
    for batch_start in (0..halves.len()).step_by(MSI_BATCH_PREFIXES) {
        let batch_end = (batch_start + MSI_BATCH_PREFIXES).min(halves.len());
        let mut handles = Vec::new();
        for worker in 0..MSI_THREADS {
            let half_copy = Arc::clone(&halves);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new(); let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(msi_prefix_worker(prefix_index, Arc::clone(&half_copy)));
                    prefix_index += MSI_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<MSIResult> = handles.into_iter().map(|handle| handle.join().expect("producer worker panic")).flatten().collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen; literal_checks += result.literal_checks;
            coefficient_master.update(&result.coefficient_leaves); finite_master.update(&result.finite_leaves);
        }
        eprintln!("PRODUCER PREFIXES {}/{}", batch_end, halves.len());
    }
    assert_eq!(counts, [19_062_225, 18_574_731, 59_620_014, 1, 59_620_015]);
    assert_eq!(unseen, 238_480_060); assert_eq!(literal_checks, 18_718);
    let raw = format!(
        concat!("PASS_I256_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_PRODUCER\n",
            "COUNTS {} {} {} {} {}\nUNSEEN {}\nLITERAL_SPOT_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\nFINITE_MERKLE_STREAM {}\n"),
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        literal_checks, coefficient_master.hex(), finite_master.hex());
    std::fs::write("rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_raw_agent_20260823.txt", raw.as_bytes()).expect("producer raw write");
    print!("{}", raw);
}
