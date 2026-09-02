// Six-thread checked-i256 producer for
// quartic_center_two_cubic:cubic_branch.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

use std::sync::Arc;
use std::thread;

const CBP_THREADS: usize = 6;
const CBP_BENCH_RAYS: usize = 1_024;

#[derive(Clone, Copy)]
struct CBPState { length: i32, is_long: bool }

#[derive(Clone, Copy)]
struct CBPTransfer { free: V, blocked: V }

#[derive(Clone, Copy)]
struct CBPModule {
    low: CBPState,
    high: CBPState,
    spine: CBPState,
    at_quartic: CBPTransfer,
}

#[derive(Clone, Copy)]
struct CBPPrefix {
    root_low: CBPState,
    root_high: CBPState,
    root_spine: CBPState,
    quartic_low: CBPState,
    quartic_high: CBPState,
}

fn cbp_pendant(length: i32) -> CBPState {
    CBPState { length, is_long: length == 7 }
}

fn cbp_spine(length: i32) -> CBPState {
    CBPState { length, is_long: length == 8 }
}

fn cbp_cross(far_absent: V, far_present: V, length: i32) -> CBPTransfer {
    CBPTransfer {
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

fn cbp_far_module(low: i32, high: i32, spine: i32) -> CBPTransfer {
    let far_absent = mul(&path(low), &path(high));
    let far_present = shifted(&mul(&path(low - 1), &path(high - 1)), 1);
    cbp_cross(far_absent, far_present, spine)
}

fn cbp_modules() -> Vec<CBPModule> {
    let mut modules = Vec::with_capacity(224);
    for low in 1..=7_i32 {
        for high in low..=7_i32 {
            for spine in 1..=8_i32 {
                modules.push(CBPModule {
                    low: cbp_pendant(low),
                    high: cbp_pendant(high),
                    spine: cbp_spine(spine),
                    at_quartic: cbp_far_module(low, high, spine),
                });
            }
        }
    }
    assert_eq!(modules.len(), 224);
    modules
}

fn cbp_prefixes() -> Vec<CBPPrefix> {
    let mut prefixes = Vec::with_capacity(6_272);
    for root_low in 1..=7_i32 {
        for root_high in root_low..=7_i32 {
            for root_spine in 1..=8_i32 {
                for quartic_low in 1..=7_i32 {
                    for quartic_high in quartic_low..=7_i32 {
                        prefixes.push(CBPPrefix {
                            root_low: cbp_pendant(root_low),
                            root_high: cbp_pendant(root_high),
                            root_spine: cbp_spine(root_spine),
                            quartic_low: cbp_pendant(quartic_low),
                            quartic_high: cbp_pendant(quartic_high),
                        });
                    }
                }
            }
        }
    }
    assert_eq!(prefixes.len(), 6_272);
    prefixes
}

fn cbp_states(prefix: CBPPrefix, module: CBPModule) -> [CBPState; 8] {
    [
        prefix.root_low,
        prefix.root_high,
        prefix.root_spine,
        prefix.quartic_low,
        prefix.quartic_high,
        module.low,
        module.high,
        module.spine,
    ]
}

fn cbp_lengths(states: &[CBPState; 8]) -> [i32; 8] {
    std::array::from_fn(|index| states[index].length)
}

fn cbp_polynomials_from_far(lengths: &[i32; 8], far: CBPTransfer) -> (V, V) {
    let quartic_absent = product(&[
        path(lengths[3]),
        path(lengths[4]),
        far.free,
    ]);
    let quartic_present = shifted(
        &product(&[
            path(lengths[3] - 1),
            path(lengths[4] - 1),
            far.blocked,
        ]),
        1,
    );
    let at_root = cbp_cross(quartic_absent, quartic_present, lengths[2]);
    let deleted = product(&[
        path(lengths[0]),
        path(lengths[1]),
        at_root.free,
    ]);
    let selected = shifted(
        &product(&[
            path(lengths[0] - 1),
            path(lengths[1] - 1),
            at_root.blocked,
        ]),
        1,
    );
    (add(&deleted, &selected), deleted)
}

fn cbp_formula_polynomials(lengths: &[i32; 8]) -> (V, V) {
    cbp_polynomials_from_far(
        lengths,
        cbp_far_module(lengths[5], lengths[6], lengths[7]),
    )
}

fn cbp_values(
    lengths: &[i32; 8],
    module: CBPModule,
    varying: Option<usize>,
) -> [Z; 4] {
    let far = if varying.is_some_and(|index| index >= 5) {
        cbp_far_module(lengths[5], lengths[6], lengths[7])
    } else {
        module.at_quartic
    };
    let (core, deleted) = cbp_polynomials_from_far(lengths, far);
    deltas03(&core, &deleted)
}

fn cbp_literal_tree(lengths: &[i32; 8]) -> (Vec<Vec<usize>>, usize) {
    let root = 0_usize;
    let mut adjacency = vec![Vec::new()];
    audit_attach(&mut adjacency, root, lengths[0]);
    audit_attach(&mut adjacency, root, lengths[1]);
    let quartic = audit_attach(&mut adjacency, root, lengths[2]);
    audit_attach(&mut adjacency, quartic, lengths[3]);
    audit_attach(&mut adjacency, quartic, lengths[4]);
    let far = audit_attach(&mut adjacency, quartic, lengths[7]);
    audit_attach(&mut adjacency, far, lengths[5]);
    audit_attach(&mut adjacency, far, lengths[6]);
    assert_eq!(adjacency.len(), 1 + lengths.iter().sum::<i32>() as usize);
    assert_eq!(adjacency.iter().map(Vec::len).sum::<usize>(), 2 * (adjacency.len() - 1));
    assert_eq!(adjacency[root].len(), 3);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 4).count(), 1);
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 2);
    (adjacency, root)
}

fn cbp_literal_values(lengths: &[i32; 8]) -> [Z; 4] {
    let (adjacency, root) = cbp_literal_tree(lengths);
    audit_deltas(&adjacency, root).0
}

fn cbp_formula_smoke() {
    let mut random = 0x8EBC6AF09C88C6E3_u64;
    for sample in 0..512_usize {
        let mut lengths = [0_i32; 8];
        for length in &mut lengths {
            random ^= random >> 12;
            random ^= random << 25;
            random ^= random >> 27;
            random = random.wrapping_mul(0x2545F4914F6CDD1D);
            *length = 1 + (random % 23) as i32;
        }
        let (core, deleted) = cbp_formula_polynomials(&lengths);
        assert_eq!(
            deltas03(&core, &deleted),
            cbp_literal_values(&lengths),
            "primary cubic-branch formula mismatch {}",
            sample,
        );
    }
    println!("PASS_E5_CUBIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE");
}

fn cbp_sha_bytes(mut hash: AuditSha256) -> [u8; 32] {
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

fn cbp_hash_state(hash: &mut AuditSha256, state: CBPState) {
    hash.update(&[state.is_long as u8]);
    hash.update(&state.length.to_le_bytes());
}

fn cbp_hash_z(hash: &mut AuditSha256, value: Z) {
    hash.update(&[value.negative as u8]);
    for limb in value.limbs { hash.update(&limb.to_le_bytes()); }
}

fn cbp_coefficient_leaf(
    states: &[CBPState; 8],
    baseline: i32,
    shift: i32,
    rows: &[[Z; AUDIT_SAMPLES]; 4],
) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-cubic-branch-coefficient-v1\0");
    for &state in states { cbp_hash_state(&mut hash, state); }
    hash.update(&baseline.to_le_bytes());
    hash.update(&shift.to_le_bytes());
    for row in rows {
        for &value in row { cbp_hash_z(&mut hash, value); }
    }
    cbp_sha_bytes(hash)
}

fn cbp_finite_leaf(states: &[CBPState; 8], order: i32, values: &[Z; 4]) -> [u8; 32] {
    let mut hash = AuditSha256::new();
    hash.update(b"e5-quartic-center-cubic-branch-finite-v1\0");
    for &state in states { cbp_hash_state(&mut hash, state); }
    hash.update(&order.to_le_bytes());
    for &value in values { cbp_hash_z(&mut hash, value); }
    cbp_sha_bytes(hash)
}

fn cbp_degree_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        for power in (AUDIT_DEGREES[rank] + 1)..AUDIT_SAMPLES {
            if !rows[rank][power].is_zero() { return false; }
        }
    }
    true
}

fn cbp_gate_ok(rows: &[[Z; AUDIT_SAMPLES]; 4]) -> bool {
    for rank in 0..4 {
        if !rows[rank][0].is_positive() || !rows[rank][1].is_positive() { return false; }
        for power in 2..=AUDIT_DEGREES[rank] {
            if rows[rank][power].is_negative() { return false; }
        }
    }
    cbp_degree_ok(rows)
}

fn cbp_coefficients(
    states: &[CBPState; 8],
    module: CBPModule,
    literal_points: bool,
) -> (i32, i32, [[Z; AUDIT_SAMPLES]; 4], u64) {
    let varying = states.iter().position(|state| state.is_long).expect("ray expected");
    let mut lengths = cbp_lengths(states);
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (28 - baseline).max(0);
    let initial = lengths[varying];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    let mut literal_checks = 0_u64;
    for point in 0..AUDIT_SAMPLES {
        lengths[varying] = initial + shift + point as i32;
        let values = cbp_values(&lengths, module, Some(varying));
        if literal_points && (point == 0 || point == 13) {
            assert_eq!(values, cbp_literal_values(&lengths));
            literal_checks += 1;
        }
        for rank in 0..4 { samples[rank][point] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    assert!(cbp_degree_ok(&coefficients));
    lengths[varying] = initial + shift + AUDIT_SAMPLES as i32;
    let unseen = cbp_values(&lengths, module, Some(varying));
    if literal_points {
        assert_eq!(unseen, cbp_literal_values(&lengths));
        literal_checks += 1;
    }
    for rank in 0..4 { assert_eq!(unseen[rank], audit_newton_at_29(&coefficients[rank])); }
    (baseline, shift, coefficients, literal_checks)
}

fn cbp_smoke_stream() {
    let prefixes = cbp_prefixes();
    let modules = cbp_modules();
    let mut coefficient_stream = AuditSha256::new();
    let mut finite_stream = AuditSha256::new();
    let mut finite_records = 0_u64;
    let mut ray_records = 0_u64;
    let mut gate_failures = 0_u64;
    for sample in 0..512_usize {
        let prefix = prefixes[(sample * 7_919 + 17) % prefixes.len()];
        let module = modules[(sample * 101 + 23) % modules.len()];
        let states = cbp_states(prefix, module);
        if !states.iter().any(|state| state.is_long) {
            let lengths = cbp_lengths(&states);
            let order = 1 + lengths.iter().sum::<i32>();
            if order >= 28 {
                let values = cbp_values(&lengths, module, None);
                finite_stream.update(&cbp_finite_leaf(&states, order, &values));
                finite_records += 1;
            }
            continue;
        }
        let (baseline, shift, rows, _) = cbp_coefficients(&states, module, false);
        if !cbp_gate_ok(&rows) { gate_failures += 1; }
        coefficient_stream.update(&cbp_coefficient_leaf(&states, baseline, shift, &rows));
        ray_records += 1;
    }
    println!("SMOKE_RECORDS {} {}", finite_records, ray_records);
    println!("SMOKE_GATE_FAILURES {}", gate_failures);
    println!("SMOKE_STREAM {} {}", coefficient_stream.hex(), finite_stream.hex());
}

fn cbp_bench() {
    let prefixes = cbp_prefixes();
    let modules = cbp_modules();
    let mut stream = AuditSha256::new();
    let mut rays = 0_usize;
    let mut candidate = 0_usize;
    while rays < CBP_BENCH_RAYS {
        let prefix = prefixes[(candidate * 7_919 + 29) % prefixes.len()];
        let module = modules[(candidate * 101 + 31) % modules.len()];
        candidate += 1;
        let states = cbp_states(prefix, module);
        if !states.iter().any(|state| state.is_long) { continue; }
        let (baseline, shift, rows, _) = cbp_coefficients(&states, module, false);
        stream.update(&cbp_coefficient_leaf(&states, baseline, shift, &rows));
        rays += 1;
    }
    println!("BENCH_RAYS {}", rays);
    println!("BENCH_STREAM {}", stream.hex());
    println!(
        "RESOURCE_TABLE_BYTES {} {}",
        prefixes.len() * std::mem::size_of::<CBPPrefix>(),
        modules.len() * std::mem::size_of::<CBPModule>(),
    );
    println!("RESOURCE_FULL_LEAF_BYTES {}", 1_259_077_usize * 32);
}

struct CBPResult {
    worker: usize,
    counts: [u64; 5],
    unseen: u64,
    literal_checks: u64,
    coefficient_leaves: Vec<u8>,
    finite_leaves: Vec<u8>,
}

fn cbp_worker(
    worker: usize,
    prefixes: Arc<Vec<CBPPrefix>>,
    modules: Arc<Vec<CBPModule>>,
) -> CBPResult {
    let start = prefixes.len() * worker / CBP_THREADS;
    let end = prefixes.len() * (worker + 1) / CBP_THREADS;
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_leaves = Vec::new();
    let mut finite_leaves = Vec::new();
    let mut checked_finite = false;
    let mut checked_ray = false;
    for prefix_index in start..end {
        let prefix = prefixes[prefix_index];
        for &module in modules.iter() {
            let states = cbp_states(prefix, module);
            let long_count = states.iter().filter(|state| state.is_long).count();
            if long_count == 0 {
                counts[0] += 1;
                let lengths = cbp_lengths(&states);
                let order = 1 + lengths.iter().sum::<i32>();
                if order < 28 { continue; }
                let values = cbp_values(&lengths, module, None);
                assert!(values.iter().all(|value| value.is_positive()));
                finite_leaves.extend_from_slice(&cbp_finite_leaf(&states, order, &values));
                if !checked_finite {
                    assert_eq!(values, cbp_literal_values(&lengths));
                    checked_finite = true;
                    literal_checks += 1;
                }
                counts[1] += 1;
                continue;
            }
            if long_count == 8 { counts[3] += 1; } else { counts[2] += 1; }
            let (baseline, shift, rows, checked) =
                cbp_coefficients(&states, module, !checked_ray);
            audit_assert_gate(&rows);
            if !checked_ray { checked_ray = true; literal_checks += checked; }
            coefficient_leaves.extend_from_slice(&cbp_coefficient_leaf(
                &states, baseline, shift, &rows,
            ));
            counts[4] += 1;
            unseen += 4;
        }
    }
    assert_eq!(coefficient_leaves.len(), counts[4] as usize * 32);
    assert_eq!(finite_leaves.len(), counts[1] as usize * 32);
    CBPResult { worker, counts, unseen, literal_checks, coefficient_leaves, finite_leaves }
}

fn cbp_full() {
    let prefixes = Arc::new(cbp_prefixes());
    let modules = Arc::new(cbp_modules());
    let mut handles = Vec::new();
    for worker in 0..CBP_THREADS {
        let prefix_copy = Arc::clone(&prefixes);
        let module_copy = Arc::clone(&modules);
        handles.push(thread::spawn(move || cbp_worker(worker, prefix_copy, module_copy)));
    }
    let mut results: Vec<CBPResult> = handles
        .into_iter()
        .map(|handle| handle.join().expect("primary worker panic"))
        .collect();
    results.sort_by_key(|result| result.worker);
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut literal_checks = 0_u64;
    let mut coefficient_master = AuditSha256::new();
    let mut finite_master = AuditSha256::new();
    for result in results {
        for index in 0..5 { counts[index] += result.counts[index]; }
        unseen += result.unseen;
        literal_checks += result.literal_checks;
        coefficient_master.update(&result.coefficient_leaves);
        finite_master.update(&result.finite_leaves);
    }
    assert_eq!(counts, [453_789, 307_938, 951_138, 1, 951_139]);
    assert_eq!(unseen, 3_804_556);
    let raw = format!(
        concat!(
            "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_BRANCH\n",
            "COUNTS {} {} {} {} {}\n",
            "UNSEEN {}\n",
            "LITERAL_CHECKS {}\n",
            "COEFFICIENT_MERKLE_STREAM {}\n",
            "FINITE_MERKLE_STREAM {}\n"
        ),
        counts[0], counts[1], counts[2], counts[3], counts[4],
        unseen, literal_checks, coefficient_master.hex(), finite_master.hex(),
    );
    std::fs::write(
        "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_i256_raw_agent_20260823.txt",
        raw.as_bytes(),
    ).expect("primary raw write");
    print!("{}", raw);
}

fn main() {
    audit_sha_self_test();
    match std::env::args().nth(1).as_deref() {
        Some("smoke") => { cbp_formula_smoke(); cbp_smoke_stream(); }
        Some("bench") => cbp_bench(),
        Some(value) => panic!("unknown mode {}", value),
        None => cbp_full(),
    }
}
