// Checked-i256 primary engine for
// quartic_center_two_cubic:central_quartic.
//
// The producer splits at the quartic root.  It caches the two symmetric
// cubic modules, then combines those messages with the two direct quartic
// pendant arms.  `smoke` and `bench` are bounded; the default mode is the
// later full census and is intentionally not invoked by the preflight.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCP_THREADS: usize = 6;
const QCP_BATCH_PREFIXES: usize = 12;
const QCP_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)]
struct QCPState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct QCPTransfer {
    free: V,
    blocked: V,
}

#[derive(Clone, Copy)]
struct QCPModule {
    low: QCPState,
    high: QCPState,
    spine: QCPState,
    parts: QCPTransfer,
}

#[derive(Clone, Copy)]
struct QCPModulePair {
    first: QCPModule,
    second: QCPModule,
    free_product: V,
    blocked_product: V,
}

#[derive(Clone, Copy)]
struct QCPPrefix {
    low: QCPState,
    high: QCPState,
}

fn qcp_pendant(length: i32) -> QCPState {
    QCPState { length, is_long: length == 7 }
}

fn qcp_spine(length: i32) -> QCPState {
    QCPState { length, is_long: length == 8 }
}

fn qcp_cross_path(far_absent: V, far_present: V, length: i32) -> QCPTransfer {
    QCPTransfer {
        free: add(
            &mul(&path(length - 1), &far_absent),
            &mul(&path(length - 2), &far_present),
        ),
        blocked: add(
            &mul(&path(length - 2), &far_absent),
            &mul(&path(length - 3), &far_present),
        ),
    }
}

fn qcp_module_parts(low: i32, high: i32, spine: i32) -> QCPTransfer {
    let cubic_absent = mul(&path(low), &path(high));
    let cubic_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    qcp_cross_path(cubic_absent, cubic_present, spine)
}

fn qcp_modules() -> Vec<QCPModule> {
    let mut modules = Vec::with_capacity(224);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(QCPModule {
                    low: qcp_pendant(low),
                    high: qcp_pendant(high),
                    spine: qcp_spine(spine),
                    parts: qcp_module_parts(low, high, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn qcp_module_pairs() -> Vec<QCPModulePair> {
    let modules = qcp_modules();
    let mut pairs = Vec::with_capacity(25_200);
    for first_index in 0..modules.len() {
        for second_index in first_index..modules.len() {
            let first = modules[first_index];
            let second = modules[second_index];
            pairs.push(QCPModulePair {
                first,
                second,
                free_product: mul(&first.parts.free, &second.parts.free),
                blocked_product: mul(&first.parts.blocked, &second.parts.blocked),
            });
        }
    }
    assert_eq!(pairs.len(), 25_200);
    pairs
}

fn qcp_prefixes() -> Vec<QCPPrefix> {
    let mut prefixes = Vec::with_capacity(28);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            prefixes.push(QCPPrefix {
                low: qcp_pendant(low),
                high: qcp_pendant(high),
            });
        }
    }
    assert_eq!(prefixes.len(), 28);
    prefixes
}

fn qcp_states(prefix: QCPPrefix, pair: QCPModulePair) -> [QCPState; 8] {
    [
        prefix.low,
        prefix.high,
        pair.first.low,
        pair.first.high,
        pair.first.spine,
        pair.second.low,
        pair.second.high,
        pair.second.spine,
    ]
}

fn qcp_lengths(states: &[QCPState; 8]) -> [i32; 8] {
    std::array::from_fn(|index| states[index].length)
}

fn qcp_polynomials_from_parts(
    lengths: &[i32; 8],
    first: QCPTransfer,
    second: QCPTransfer,
) -> (V, V) {
    let deleted = product(&[
        path(lengths[0]),
        path(lengths[1]),
        first.free,
        second.free,
    ]);
    let selected = shifted(
        &product(&[
            path(lengths[0] - 1),
            path(lengths[1] - 1),
            first.blocked,
            second.blocked,
        ]),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn qcp_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qcp_polynomials_from_parts(
        lengths,
        qcp_module_parts(lengths[2], lengths[3], lengths[4]),
        qcp_module_parts(lengths[5], lengths[6], lengths[7]),
    )
}

fn qcp_polynomials_from_products(
    lengths: &[i32; 8],
    free_product: V,
    blocked_product: V,
) -> (V, V) {
    let deleted = product(&[
        path(lengths[0]),
        path(lengths[1]),
        free_product,
    ]);
    let selected = shifted(
        &product(&[
            path(lengths[0] - 1),
            path(lengths[1] - 1),
            blocked_product,
        ]),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn qcp_values(
    lengths: &[i32; 8],
    pair: QCPModulePair,
    varying: Option<usize>,
) -> [Z; 4] {
    if varying.is_none_or(|index| index < 2) {
        let (core, deleted) = qcp_polynomials_from_products(
            lengths,
            pair.free_product,
            pair.blocked_product,
        );
        return deltas03(&core, &deleted);
    }
    let first = if varying.is_some_and(|index| (2..5).contains(&index)) {
        qcp_module_parts(lengths[2], lengths[3], lengths[4])
    } else {
        pair.first.parts
    };
    let second = if varying.is_some_and(|index| index >= 5) {
        qcp_module_parts(lengths[5], lengths[6], lengths[7])
    } else {
        pair.second.parts
    };
    let (core, deleted) = qcp_polynomials_from_parts(lengths, first, second);
    deltas03(&core, &deleted)
}

fn qcp_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, root, lengths[1]);
    for offset in [2_usize, 5_usize] {
        let cubic = audit_attach(&mut adjacency, root, lengths[offset + 2]);
        audit_attach(&mut adjacency, cubic, lengths[offset]);
        audit_attach(&mut adjacency, cubic, lengths[offset + 1]);
    }
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (adjacency.len() - 1),
    );
    assert_eq!(adjacency[root].len(), 4);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}

fn qcp_literal_values(lengths: &[i32; 8]) -> [Z; 4] {
    let (adjacency, root) = qcp_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn qcp_formula_smoke() {
    let mut random = 0xA0761D6478BD642F_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for (index, length) in lengths.iter_mut().enumerate() {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % if index == 4 || index == 7 { 23 } else { 19 }) as i32;
        }
        let (core, deleted) = qcp_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            qcp_literal_values(&lengths),
            "primary formula/literal mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_CENTRAL_QUARTIC_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn qcp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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
        out[4 * index..4 * index + 4]
            .copy_from_slice(&hash.state[index].to_be_bytes());
    }
    out
}

fn qcp_hash_state(hash: &mut AuditSha256, state: QCPState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn qcp_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn qcp_coefficient_leaf(
    states: &[QCPState; 8],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-central-quartic-coefficient-v1\0");
    for &state in states { qcp_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row { qcp_hash_z(&mut hash, value); }
    }
    qcp_sha_bytes(hash)
}

fn qcp_finite_leaf(
    states: &[QCPState; 8],
    order: i32,
    values: &[Z; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-central-quartic-finite-v1\0");
    for &state in states { qcp_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { qcp_hash_z(&mut hash, value); }
    qcp_sha_bytes(hash)
}

fn qcp_degree_ok(coefficients: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !coefficients[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn qcp_gate_ok(coefficients: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !coefficients[rank][0].is_positive()
            || !coefficients[rank][1].is_positive()
        {
            return false;
        }
        for power in 2..=AUDIT_DEGREES[rank] {
            if coefficients[rank][power].is_negative() { return false; }
        }
    }
    qcp_degree_ok(coefficients)
}

fn qcp_coefficients(
    states: &[QCPState; 8],
    pair: QCPModulePair,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], [Z; 4]) {
    let flags: [bool; 8] = std::array::from_fn(|index| states[index].is_long);
    let varying = flags.iter().position(|&flag| flag).expect("ray expected");
    let mut lengths = qcp_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = qcp_values(&lengths, pair, Some(varying));
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, qcp_literal_values(&lengths));
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(qcp_degree_ok(&coefficients), "exact degree bound failed");
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = qcp_values(&lengths, pair, Some(varying));
    for rank in 0..4 {
        assert_eq!(unseen[rank], audit_newton_at_29(&coefficients[rank]));
    }
    if literal_points { assert_eq!(unseen, qcp_literal_values(&lengths)); }
    (baseline, shift, coefficients, unseen)
}

fn qcp_smoke_stream() {
    let prefixes = qcp_prefixes();
    let pairs = qcp_module_pairs();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 17 + 3) % prefixes.len()];
        let pair = pairs[(sample * 104_729 + 23) % pairs.len()];
        let states = qcp_states(prefix, pair);
        if !states.iter().any(|state| state.is_long) {
            let lengths = qcp_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = qcp_values(&lengths, pair, None);
                finite_stream.update(&qcp_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, coefficients, _) = qcp_coefficients(&states, pair, false);
        if !qcp_gate_ok(&coefficients) { gate_failures += 1; }
        coefficient_stream.update(&qcp_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!(
        "SMOKE_STREAM {} {}",
        coefficient_stream.hex(),
        finite_stream.hex(),
    );
}

fn qcp_bench() {
    let prefixes = qcp_prefixes();
    let pairs = qcp_module_pairs();
    let mut stream = AuditSha256::new();
    let mut rays = 0_usize;
    let mut candidate = 0_usize;
    while rays < QCP_BENCH_RAYS {
        let prefix = prefixes[(candidate * 17 + 5) % prefixes.len()];
        let pair = pairs[(candidate * 104_729 + 31) % pairs.len()];
        candidate += 1;
        let states = qcp_states(prefix, pair);
        if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, coefficients, _) = qcp_coefficients(&states, pair, false);
        stream.update(&qcp_coefficient_leaf(&states, baseline, shift, &coefficients));
        rays += 1;
    }
    println!("BENCH_RAYS {}", rays);
    println!("BENCH_STREAM {}", stream.hex());
    println!(
        "RESOURCE_TABLE_BYTES {} {}",
        prefixes.len() * std::mem::size_of::<QCPPrefix>(),
        pairs.len() * std::mem::size_of::<QCPModulePair>(),
    );
    println!(
        "RESOURCE_MAX_BATCH_LEAF_BYTES {}",
        QCP_BATCH_PREFIXES * pairs.len() * 32,
    );
}

struct QCPResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_checks: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn qcp_prefix_worker(
    prefix_index: usize,
    prefixes: Arc<Vec<QCPPrefix>>,
    pairs: Arc<Vec<QCPModulePair>>,
) -> QCPResult {
    let prefix = prefixes[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut checked_finite = false;
    let mut checked_ray = false;
    for &pair in pairs.iter() {
        let states = qcp_states(prefix, pair);
        let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 {
            counts[0] += 1;
            let lengths = qcp_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order < 28 { continue; }
            let values = qcp_values(&lengths, pair, None);
            assert!(values.iter().all(|value| value.is_positive()));
            finite_leaves.extend_from_slice(&qcp_finite_leaf(&states, order, &values));
            if !checked_finite {
                assert_eq!(values, qcp_literal_values(&lengths));
                checked_finite = true;
                literal_checks += 1;
            }
            counts[1] += 1;
            continue;
        }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
        let (baseline, shift, coefficients, unseen_values) =
            qcp_coefficients(&states, pair, !checked_ray);
        audit_assert_gate(&coefficients);
        if !checked_ray {
            checked_ray = true;
            literal_checks += 3;
        }
        coefficient_leaves.extend_from_slice(&qcp_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        let _ = unseen_values;
        unseen += 4;
        counts[4] += 1;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    QCPResult {
        prefix_index,
        counts,
        unseen,
        literal_checks,
        coefficient_leaves,
        finite_leaves,
    }
}

fn qcp_full() {
    let prefixes = Arc::new(qcp_prefixes());
    let pairs = Arc::new(qcp_module_pairs());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..prefixes.len()).step_by(QCP_BATCH_PREFIXES) {
        let batch_end = (batch_start + QCP_BATCH_PREFIXES).min(prefixes.len());
        let mut handles = Vec::new();
        for worker in 0..QCP_THREADS {
            let prefix_copy = Arc::clone(&prefixes);
            let pair_copy = Arc::clone(&pairs);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(qcp_prefix_worker(
                        prefix_index,
                        Arc::clone(&prefix_copy),
                        Arc::clone(&pair_copy),
                    ));
                    prefix_index += QCP_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<QCPResult> = handles
            .into_iter()
            .map(|handle| handle.join().expect("primary worker panic"))
            .flatten()
            .collect();
        results.sort_by_key(|result| result.prefix_index);
        for result in results {
            for index in 0..5 { counts[index] += result.counts[index]; }
            unseen += result.unseen;
            literal_checks += result.literal_checks;
            coefficient_master.update(&result.coefficient_leaves);
            finite_master.update(&result.finite_leaves);
        }
        eprintln!("PRIMARY PREFIXES {}/{}", batch_end, prefixes.len());
    }
    assert_eq!(counts, [228_438, 154_941, 477_161, 1, 477_162]);
    assert_eq!(unseen, 1_908_648);
    let raw = format!(
        concat!(
            "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CENTRAL_QUARTIC\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4],
        unseen,
        literal_checks,
        coefficient_master.hex(),
        finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => {
            qcp_formula_smoke();
            qcp_smoke_stream();
        }
        Some("bench") => qcp_bench(),
        Some(value) => panic!("unknown mode {}", value),
        None => qcp_full(),
    }
}
