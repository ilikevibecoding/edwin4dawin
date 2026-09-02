// Independent checked-i256 upward-message and literal-tree audit for
// quartic_center_two_cubic:cubic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const CBA_THREADS: usize = 6;
const CBA_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)]
struct CBAState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct CBAMessage { parent_absent: V, parent_present: V }

#[derive(Clone, Copy)]
struct CBAModule {
    arm0: CBAState,
    arm1: CBAState,
    spine: CBAState,
    at_quartic: CBAMessage,
}

#[derive(Clone, Copy)]
struct CBAPrefix {
    root_arm0: CBAState,
    root_arm1: CBAState,
    root_quartic_spine: CBAState,
    quartic_arm0: CBAState,
    quartic_arm1: CBAState,
}

fn cba_pendant(length: i32) -> CBAState {
    CBAState { length, is_long: length == 7 }
}

fn cba_spine(length: i32) -> CBAState {
    CBAState { length, is_long: length == 8 }
}

fn cba_propagate(far_absent: V, far_present: V, length: i32) -> CBAMessage {
    CBAMessage {
        parent_absent: add(
            &mul(&path(length - 1), &far_absent),
            &mul(&path(length - 2), &far_present),
        ),
        parent_present: add(
            &mul(&path(length - 2), &far_absent),
            &mul(&path(length - 3), &far_present),
        ),
    }
}

fn cba_pendant_message(length: i32) -> CBAMessage {
    CBAMessage { parent_absent: path(length), parent_present: path(length - 1) }
}

fn cba_far_module(arm0: i32, arm1: i32, spine: i32) -> CBAMessage {
    let cubic_absent = mul(&path(arm0), &path(arm1));
    let cubic_present = shifted(&mul(&path(arm0 - 1), &path(arm1 - 1)), 1);
    cba_propagate(cubic_absent, cubic_present, spine)
}

fn cba_modules() -> Vec<CBAModule> {
    let mut modules = Vec::with_capacity(224);
    for arm0 in 1..=7_i32 {
        for arm1 in arm0..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(CBAModule {
                    arm0: cba_pendant(arm0),
                    arm1: cba_pendant(arm1),
                    spine: cba_spine(spine),
                    at_quartic: cba_far_module(arm0, arm1, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn cba_prefixes() -> Vec<CBAPrefix> {
    let mut prefixes = Vec::with_capacity(6_272);
    for root_arm0 in 1..=7_i32 {
        for root_arm1 in root_arm0..=7_i32 {
            for root_quartic_spine in 1..=8_i32 {
                for quartic_arm0 in 1..=7_i32 {
                    for quartic_arm1 in quartic_arm0..=7_i32 {
                        prefixes.push(CBAPrefix {
                            root_arm0: cba_pendant(root_arm0),
                            root_arm1: cba_pendant(root_arm1),
                            root_quartic_spine: cba_spine(root_quartic_spine),
                            quartic_arm0: cba_pendant(quartic_arm0),
                            quartic_arm1: cba_pendant(quartic_arm1),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(prefixes.len(), 6_272);
    prefixes
}

fn cba_states(prefix: CBAPrefix, module: CBAModule) -> [CBAState; 8] {
    [
        prefix.root_arm0,
        prefix.root_arm1,
        prefix.root_quartic_spine,
        prefix.quartic_arm0,
        prefix.quartic_arm1,
        module.arm0,
        module.arm1,
        module.spine,
    ]
}

fn cba_lengths(states: &[CBAState; 8]) -> [i32; 8] {
    std::array::from_fn(|index| states[index].length)
}

fn cba_quartic_to_root(
    lengths: &[i32; 8],
    far: CBAMessage,
) -> CBAMessage {
    let q0 = cba_pendant_message(lengths[3]);
    let q1 = cba_pendant_message(lengths[4]);
    let quartic_absent = product(&[
        q0.parent_absent,
        q1.parent_absent,
        far.parent_absent,
    ]);
    let quartic_present = shifted(
        &product(&[
            q0.parent_present,
            q1.parent_present,
            far.parent_present,
        ]),
        1,
    );
    cba_propagate(quartic_absent, quartic_present, lengths[2])
}

fn cba_finish_root(lengths: &[i32; 8], incoming: CBAMessage) -> (V, V) {
    let arm0 = cba_pendant_message(lengths[0]);
    let arm1 = cba_pendant_message(lengths[1]);
    let deleted = product(&[
        arm0.parent_absent,
        arm1.parent_absent,
        incoming.parent_absent,
    ]);
    let selected = shifted(
        &product(&[
            arm0.parent_present,
            arm1.parent_present,
            incoming.parent_present,
        ]),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn cba_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    let far = cba_far_module(lengths[5], lengths[6], lengths[7]);
    cba_finish_root(lengths, cba_quartic_to_root(lengths, far))
}

fn cba_values(
    lengths: &[i32; 8],
    module: CBAModule,
    varying: Option<usize>,
) -> [Z; 4] {
    let far = if varying.is_some_and(|index| index >= 5) {
        cba_far_module(lengths[5], lengths[6], lengths[7])
    } else {
        module.at_quartic
    };
    let incoming = cba_quartic_to_root(lengths, far);
    let (core, deleted) = cba_finish_root(lengths, incoming);
    deltas03(&core, &deleted)
}

fn cba_extend(adjacency: &mut Vec<Vec<usize>>, start: usize, length: i32) -> usize {
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

fn cba_expanded_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    cba_extend(&mut adjacency, root, lengths[0]);
    cba_extend(&mut adjacency, root, lengths[1]);
    let quartic = cba_extend(&mut adjacency, root, lengths[2]);
    cba_extend(&mut adjacency, quartic, lengths[3]);
    cba_extend(&mut adjacency, quartic, lengths[4]);
    let far = cba_extend(&mut adjacency, quartic, lengths[7]);
    cba_extend(&mut adjacency, far, lengths[5]);
    cba_extend(&mut adjacency, far, lengths[6]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 3);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}

fn cba_literal_values(lengths: &[i32; 8]) -> [Z; 4] {
    let (adjacency, root) = cba_expanded_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn cba_independent_smoke() {
    let mut random = 0x589965CC75374CC3_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = cba_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            cba_literal_values(&lengths),
            "independent formula mismatch {}",
            sample,
        );
    }
    let prefixes = cba_prefixes();
    let modules = cba_modules();
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
        let module = modules[random as usize % modules.len()];
        let mut lengths = cba_lengths(&cba_states(prefix, module));
        let varying = random as usize % 8;
        lengths[varying] += (random % 19) as i32;
        assert_eq!(
            cba_values(&lengths, module, Some(varying)),
            cba_literal_values(&lengths),
            "cached upward-message mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_CUBIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE");
}

fn cba_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn cba_hash_state(hash: &mut AuditSha256, state: CBAState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn cba_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn cba_coefficient_leaf(
    states: &[CBAState; 8], baseline: i32, shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-cubic-branch-coefficient-v1\0");
    for &state in states { cba_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows { for &value in row { cba_hash_z(&mut hash, value); } }
    cba_sha_bytes(hash)
}

fn cba_finite_leaf(states: &[CBAState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-cubic-branch-finite-v1\0");
    for &state in states { cba_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { cba_hash_z(&mut hash, value); }
    cba_sha_bytes(hash)
}

fn cba_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn cba_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    cba_degree_ok(rows)
}

fn cba_formula_coefficients(
    states: &[CBAState; 8], module: CBAModule, literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let mut lengths = cba_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_trees = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = cba_values(&lengths, module, Some(varying));
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, cba_literal_values(&lengths));
            literal_trees += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(cba_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = cba_values(&lengths, module, Some(varying));
    if literal_points {
        assert_eq!(unseen, cba_literal_values(&lengths));
        literal_trees += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows, literal_trees)
}

fn cba_literal_coefficients(states: &[CBAState; 8]) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4]) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let mut lengths = cba_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = cba_literal_values(&lengths);
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let rows: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(cba_degree_ok(&rows));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = cba_literal_values(&lengths);
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&rows[rank])); }
    (baseline, shift, rows)
}

fn cba_smoke_stream() {
    let prefixes = cba_prefixes();
    let modules = cba_modules();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7_919 + 17) % prefixes.len()];
        let module = modules[(sample * 101 + 23) % modules.len()];
        let states = cba_states(prefix, module);
        if !states.iter().any(|state| state.is_long) {
            let lengths = cba_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = cba_literal_values(&lengths);
                finite_stream.update(&cba_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows) = cba_literal_coefficients(&states);
        if !cba_gate_ok(&rows) { gate_failures += 1; }
        coefficient_stream.update(&cba_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

fn cba_bench() {
    let prefixes = cba_prefixes();
    let modules = cba_modules();
    let mut stream = AuditSha256::new();
    let mut rays = 0_usize;
    let mut candidate = 0_usize;
    while rays < CBA_BENCH_RAYS {
        let prefix = prefixes[(candidate * 7_919 + 29) % prefixes.len()];
        let module = modules[(candidate * 101 + 31) % modules.len()];
        candidate += 1;
        let states = cba_states(prefix, module);
        if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, checked) = cba_formula_coefficients(&states, module, true);
        assert_eq!(checked, 3);
        stream.update(&cba_coefficient_leaf(&states, baseline, shift, &rows));
        rays += 1;
    }
    println!("BENCH_RAYS {}", rays);
    println!("BENCH_STREAM {}", stream.hex());
    println!(
        "RESOURCE_TABLE_BYTES {} {}",
        prefixes.len() * std::mem::size_of::<CBAPrefix>(),
        modules.len() * std::mem::size_of::<CBAModule>(),
    );
    println!("RESOURCE_FULL_LEAF_BYTES {}", 1_259_077_usize * 32);
}

struct CBAResult {
    worker: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_trees: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn cba_worker(
    worker: usize,
    prefixes: Arc<Vec<CBAPrefix>>,
    modules: Arc<Vec<CBAModule>>,
) -> CBAResult {
    let start = prefixes.len() * worker / CBA_THREADS;
    let end = prefixes.len() * (worker + 1) / CBA_THREADS;
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    for prefix_index in start..end {
        let prefix = prefixes[prefix_index];
        for &module in modules.iter() {
            let states = cba_states(prefix, module);
            let long_count = states.iter().filter(|state| state.is_long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = cba_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = cba_values(&lengths, module, None);
                assert_eq!(values, cba_literal_values(&lengths));
                assert!(values.iter().all(|value| value.is_positive()));
                finite_leaves.extend_from_slice(&cba_finite_leaf(&states, order, &values));
                counts[1] += 1;
                literal_trees += 1;
                continue;
            }
            if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) =
                cba_formula_coefficients(&states, module, true);
            audit_assert_gate(&rows);
            coefficient_leaves.extend_from_slice(&cba_coefficient_leaf(
                &states, baseline, shift, &rows,
            ));
            counts[4] += 1;
            unseen += 4;
            literal_trees += checked;
        }
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    CBAResult { worker, counts, unseen, literal_trees, coefficient_leaves, finite_leaves }
}

fn cba_full() {
    let prefixes = Arc::new(cba_prefixes());
    let modules = Arc::new(cba_modules());
    let mut handles = Vec::new();
    for worker in 0..CBA_THREADS {
        let prefix_copy = Arc::clone(&prefixes);
        let module_copy = Arc::clone(&modules);
        handles.push(thread::spawn(move || cba_worker(worker, prefix_copy, module_copy)));
    }
    let mut results: Vec<CBAResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("audit worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_trees = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for result in results {
        for index in 0..5 { counts[index] += result.counts[index]; }
        unseen += result.unseen;
        literal_trees += result.literal_trees;
        coefficient_master.update(&result.coefficient_leaves);
        finite_master.update(&result.finite_leaves);
    }
    assert_eq!(counts, [453_789, 307_938, 951_138, 1, 951_139]);
    assert_eq!(unseen, 3_804_556);
    assert_eq!(literal_trees, 3_161_355);
    let raw = format!(
        concat!(
            "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH\n",
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
        "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("audit raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { cba_independent_smoke(); cba_smoke_stream(); }
        Some("bench") => cba_bench(),
        Some(value) => panic!("unknown mode {}", value),
        None => cba_full(),
    }
}
