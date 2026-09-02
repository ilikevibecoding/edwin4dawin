// Independently transcribed checked-i256 audit for
// quartic_center_two_cubic:central_quartic.
//
// This engine propagates four child messages upward into the quartic root,
// derives the root-deleted forest as the product of the four root-absent
// messages, and builds literal expanded trees independently.  The bounded
// smoke stream is evaluated literally at every Newton sample.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const QCA_THREADS: usize = 6;
const QCA_BATCH_PREFIXES: usize = 12;
const QCA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)]
struct QCAState {
    length: i32,
    is_long: bool,
}

#[derive(Clone, Copy)]
struct QCABranchMessage {
    root_absent: V,
    root_present: V,
}

#[derive(Clone, Copy)]
struct QCAModule {
    arm0: QCAState,
    arm1: QCAState,
    spine: QCAState,
    at_root: QCABranchMessage,
}

#[derive(Clone, Copy)]
struct QCAModulePair {
    module0: QCAModule,
    module1: QCAModule,
}

#[derive(Clone, Copy)]
struct QCAPendantPair {
    arm0: QCAState,
    arm1: QCAState,
}

fn qca_pendant(length: i32) -> QCAState {
    QCAState { length, is_long: length == 7 }
}

fn qca_spine(length: i32) -> QCAState {
    QCAState { length, is_long: length == 8 }
}

fn qca_propagate(
    far_absent: V,
    far_present: V,
    edge_length: i32,
) -> QCABranchMessage {
    QCABranchMessage {
        root_absent: add(
            &mul(&path(edge_length - 1), &far_absent),
            &mul(&path(edge_length - 2), &far_present),
        ),
        root_present: add(
            &mul(&path(edge_length - 2), &far_absent),
            &mul(&path(edge_length - 3), &far_present),
        ),
    }
}

fn qca_module_message(arm0: i32, arm1: i32, spine: i32) -> QCABranchMessage {
    let cubic_absent = mul(&path(arm0), &path(arm1));
    let cubic_present = shifted(&mul(&path(arm0 - 1), &path(arm1 - 1)), 1);
    qca_propagate(cubic_absent, cubic_present, spine)
}

fn qca_modules() -> Vec<QCAModule> {
    let mut modules = Vec::with_capacity(224);
    for arm0 in 1..=7_i32 {
        for arm1 in arm0..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(QCAModule {
                    arm0: qca_pendant(arm0),
                    arm1: qca_pendant(arm1),
                    spine: qca_spine(spine),
                    at_root: qca_module_message(arm0, arm1, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn qca_module_pairs() -> Vec<QCAModulePair> {
    let modules = qca_modules();
    let mut pairs = Vec::with_capacity(25_200);
    for module0 in 0..modules.len() {
        for module1 in module0..modules.len() {
            pairs.push(QCAModulePair {
                module0: modules[module0],
                module1: modules[module1],
            });
        }
    }
    assert_eq!(pairs.len(), 25_200);
    pairs
}

fn qca_pendant_pairs() -> Vec<QCAPendantPair> {
    let mut pairs = Vec::with_capacity(28);
    for arm0 in 1..=7_i32 {
        for arm1 in arm0..=7_i32 {
            pairs.push(QCAPendantPair {
                arm0: qca_pendant(arm0),
                arm1: qca_pendant(arm1),
            });
        }
    }
    assert_eq!(pairs.len(), 28);
    pairs
}

fn qca_states(pendants: QCAPendantPair, modules: QCAModulePair) -> [QCAState; 8] {
    [
        pendants.arm0,
        pendants.arm1,
        modules.module0.arm0,
        modules.module0.arm1,
        modules.module0.spine,
        modules.module1.arm0,
        modules.module1.arm1,
        modules.module1.spine,
    ]
}

fn qca_lengths(states: &[QCAState; 8]) -> [i32; 8] {
    std::array::from_fn(|index| states[index].length)
}

fn qca_pendant_message(length: i32) -> QCABranchMessage {
    QCABranchMessage {
        root_absent: path(length),
        root_present: path(length - 1),
    }
}

fn qca_finish_root(messages: &[QCABranchMessage; 4]) -> (V, V) {
    let deleted = product(&[
        messages[0].root_absent,
        messages[1].root_absent,
        messages[2].root_absent,
        messages[3].root_absent,
    ]);
    let root_selected = shifted(
        &product(&[
            messages[0].root_present,
            messages[1].root_present,
            messages[2].root_present,
            messages[3].root_present,
        ]),
        1,
    );
    (add(&deleted, &root_selected), deleted)
}

fn qca_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    qca_finish_root(&[
        qca_pendant_message(lengths[0]),
        qca_pendant_message(lengths[1]),
        qca_module_message(lengths[2], lengths[3], lengths[4]),
        qca_module_message(lengths[5], lengths[6], lengths[7]),
    ])
}

fn qca_values(
    lengths: &[i32; 8],
    pair: QCAModulePair,
    varying: Option<usize>,
) -> [Z; 4] {
    let module0 = if varying.is_some_and(|index| (2..5).contains(&index)) {
        qca_module_message(lengths[2], lengths[3], lengths[4])
    } else {
        pair.module0.at_root
    };
    let module1 = if varying.is_some_and(|index| index >= 5) {
        qca_module_message(lengths[5], lengths[6], lengths[7])
    } else {
        pair.module1.at_root
    };
    let (core, deleted) = qca_finish_root(&[
        qca_pendant_message(lengths[0]),
        qca_pendant_message(lengths[1]),
        module0,
        module1,
    ]);
    deltas03(&core, &deleted)
}

fn qca_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
    let mut endpoint = start;
    for _ in 0..length {
        let child = adjacency.len();
        adjacency.push(Vec::new());
        adjacency[endpoint].push(child);
        adjacency[child].push(endpoint);
        endpoint = child;
    }
    endpoint
}

fn qca_expanded_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let quartic = 0_usize;
    let mut adjacency = vec![Vec::new()];
    qca_extend(&mut adjacency, quartic, lengths[0]);
    qca_extend(&mut adjacency, quartic, lengths[1]);
    let cubic0 = qca_extend(&mut adjacency, quartic, lengths[4]);
    qca_extend(&mut adjacency, cubic0, lengths[2]);
    qca_extend(&mut adjacency, cubic0, lengths[3]);
    let cubic1 = qca_extend(&mut adjacency, quartic, lengths[7]);
    qca_extend(&mut adjacency, cubic1, lengths[5]);
    qca_extend(&mut adjacency, cubic1, lengths[6]);
    let expected = 1 + lengths.iter().sum::<i32>() as usize;
    assert_eq!(adjacency.len(), expected);
    assert_eq!(
        adjacency.iter().map(Vec::len).sum::<usize>(),
        2 * (expected - 1),
    );
    assert_eq!(adjacency[quartic].len(), 4);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, quartic)
}

fn qca_literal_values(lengths: &[i32; 8]) -> [Z; 4] {
    let (adjacency, root) = qca_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn qca_independent_smoke() {
    let mut random = 0xE7037ED1A0B428DB_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = qca_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            qca_literal_values(&lengths),
            "independent upward formula mismatch {}",
            sample,
        );
    }

    let pendants = qca_pendant_pairs();
    let pairs = qca_module_pairs();
    for sample in 0..512_usize {
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let pendant_pair = pendants[random as usize % pendants.len()];
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let module_pair = pairs[random as usize % pairs.len()];
        let mut lengths = qca_lengths(&qca_states(pendant_pair, module_pair));
        random ^= random >> 12;
        random ^= random << 25;
        random ^= random >> 27;
        random = random.wrapping_mul(0x2545F4914F6CDD1D);
        let varying = random as usize % 8;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            qca_values(&lengths, module_pair, Some(varying)),
            qca_literal_values(&lengths),
            "independent cached message mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_CENTRAL_QUARTIC_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn qca_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn qca_hash_state(hash: &mut AuditSha256, state: QCAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn qca_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn qca_coefficient_leaf(
    states: &[QCAState; 8],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-central-quartic-coefficient-v1\0");
    for &state in states { qca_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row { qca_hash_z(&mut hash, value); }
    }
    qca_sha_bytes(hash)
}

fn qca_finite_leaf(
    states: &[QCAState; 8],
    order: i32,
    values: &[Z; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-central-quartic-finite-v1\0");
    for &state in states { qca_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { qca_hash_z(&mut hash, value); }
    qca_sha_bytes(hash)
}

fn qca_degree_ok(coefficients: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !coefficients[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn qca_gate_ok(coefficients: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
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
    qca_degree_ok(coefficients)
}

fn qca_formula_coefficients(
    states: &[QCAState; 8],
    pair: QCAModulePair,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], [Z; 4], u64) {
    let varying = states
        .iter()
        .position(|state| state.is_long)
        .expect("ray expected");
    let mut lengths = qca_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = qca_values(&lengths, pair, Some(varying));
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, qca_literal_values(&lengths));
            literal_trees += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(qca_degree_ok(&coefficients), "independent degree bound failed");
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = qca_values(&lengths, pair, Some(varying));
    if literal_points {
        assert_eq!(unseen, qca_literal_values(&lengths));
        literal_trees += 1;
    }
    for rank in 0..4 {
        assert_eq!(unseen[rank], audit_newton_at_29(&coefficients[rank]));
    }
    (baseline, shift, coefficients, unseen, literal_trees)
}

fn qca_literal_coefficients(
    states: &[QCAState; 8],
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], [Z; 4]) {
    let varying = states
        .iter()
        .position(|state| state.is_long)
        .expect("literal ray expected");
    let mut lengths = qca_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = qca_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(qca_degree_ok(&coefficients));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = qca_literal_values(&lengths);
    for rank in 0..4 {
        assert_eq!(unseen[rank], audit_newton_at_29(&coefficients[rank]));
    }
    (baseline, shift, coefficients, unseen)
}

fn qca_smoke_stream() {
    let pendants = qca_pendant_pairs();
    let pairs = qca_module_pairs();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let pendant_pair = pendants[(sample * 17 + 3) % pendants.len()];
        let module_pair = pairs[(sample * 104_729 + 23) % pairs.len()];
        let states = qca_states(pendant_pair, module_pair);
        if !states.iter().any(|state| state.is_long) {
            let lengths = qca_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = qca_literal_values(&lengths);
                finite_stream.update(&qca_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, coefficients, _) = qca_literal_coefficients(&states);
        if !qca_gate_ok(&coefficients) { gate_failures += 1; }
        coefficient_stream.update(&qca_coefficient_leaf(
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

fn qca_bench() {
    let pendants = qca_pendant_pairs();
    let pairs = qca_module_pairs();
    let mut stream = AuditSha256::new();
    let mut rays = 0_usize;
    let mut candidate = 0_usize;
    while rays < QCA_BENCH_RAYS {
        let pendant_pair = pendants[(candidate * 17 + 5) % pendants.len()];
        let module_pair = pairs[(candidate * 104_729 + 31) % pairs.len()];
        candidate += 1;
        let states = qca_states(pendant_pair, module_pair);
        if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, coefficients, _, literal_trees) =
            qca_formula_coefficients(&states, module_pair, true);
        assert_eq!(literal_trees, 3);
        stream.update(&qca_coefficient_leaf(&states, baseline, shift, &coefficients));
        rays += 1;
    }
    println!("BENCH_RAYS {}", rays);
    println!("BENCH_STREAM {}", stream.hex());
    println!(
        "RESOURCE_TABLE_BYTES {} {}",
        pendants.len() * std::mem::size_of::<QCAPendantPair>(),
        pairs.len() * std::mem::size_of::<QCAModulePair>(),
    );
    println!(
        "RESOURCE_MAX_BATCH_LEAF_BYTES {}",
        QCA_BATCH_PREFIXES * pairs.len() * 32,
    );
}

struct QCAResult {
    prefix_index: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn qca_prefix_worker(
    prefix_index: usize,
    pendants: Arc<Vec<QCAPendantPair>>,
    pairs: Arc<Vec<QCAModulePair>>,
) -> QCAResult {
    let pendant_pair = pendants[prefix_index];
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for &module_pair in pairs.iter() {
        let states = qca_states(pendant_pair, module_pair);
        let long_count = states.iter().filter(|state| state.is_long).count();
        if long_count == 0 {
            counts[0] += 1;
            let lengths = qca_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order < 28 { continue; }
            let values = qca_values(&lengths, module_pair, None);
            assert_eq!(values, qca_literal_values(&lengths));
            assert!(values.iter().all(|value| value.is_positive()));
            finite_leaves.extend_from_slice(&qca_finite_leaf(&states, order, &values));
            counts[1] += 1;
            literal_trees += 1;
            continue;
        }
        if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
        let (baseline, shift, coefficients, _, checked) =
            qca_formula_coefficients(&states, module_pair, true);
        audit_assert_gate(&coefficients);
        coefficient_leaves.extend_from_slice(&qca_coefficient_leaf(
            &states,
            baseline,
            shift,
            &coefficients,
        ));
        counts[4] += 1;
        unseen += 4;
        literal_trees += checked;
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    QCAResult {
        prefix_index,
        counts,
        unseen,
        literal_trees,
        coefficient_leaves,
        finite_leaves,
    }
}

fn qca_full() {
    let pendants = Arc::new(qca_pendant_pairs());
    let pairs = Arc::new(qca_module_pairs());
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for batch_start in (0..pendants.len()).step_by(QCA_BATCH_PREFIXES) {
        let batch_end = (batch_start + QCA_BATCH_PREFIXES).min(pendants.len());
        let mut handles = Vec::new();
        for worker in 0..QCA_THREADS {
            let pendant_copy = Arc::clone(&pendants);
            let pair_copy = Arc::clone(&pairs);
            handles.push(thread::spawn(move || {
                let mut local = Vec::new();
                let mut prefix_index = batch_start + worker;
                while prefix_index < batch_end {
                    local.push(qca_prefix_worker(
                        prefix_index,
                        Arc::clone(&pendant_copy),
                        Arc::clone(&pair_copy),
                    ));
                    prefix_index += QCA_THREADS;
                }
                local
            }));
        }
        let mut results: Vec<QCAResult> = handles
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
        eprintln!("AUDIT PREFIXES {}/{}", batch_end, pendants.len());
    }
    assert_eq!(counts, [228_438, 154_941, 477_161, 1, 477_162]);
    assert_eq!(unseen, 1_908_648);
    assert_eq!(literal_trees, 1_586_427);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CENTRAL_QUARTIC\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_TREES {}\n",
            "LITERAL_RAY_POINTS 0 13 29\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4],
        unseen,
        literal_trees,
        coefficient_master.hex(),
        finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => {
            qca_independent_smoke();
            qca_smoke_stream();
        }
        Some("bench") => qca_bench(),
        Some(value) => panic!("unknown mode {}", value),
        None => qca_full(),
    }
}
