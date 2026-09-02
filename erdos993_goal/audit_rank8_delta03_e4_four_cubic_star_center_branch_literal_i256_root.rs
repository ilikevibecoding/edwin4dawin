// Independent checked-i256 literal audit for the e=4 four-cubic-star center root.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

#[derive(Clone, Copy)]
struct StarState { value: i32, long: bool }

#[derive(Clone, Copy)]
struct StarModule { arm_a: StarState, arm_b: StarState, spine: StarState }

fn star_arm(index: i32) -> StarState {
    if index == 6 { StarState { value: 7, long: true } }
    else { StarState { value: index + 1, long: false } }
}

fn star_spine(index: i32) -> StarState {
    if index == 7 { StarState { value: 8, long: true } }
    else { StarState { value: index + 1, long: false } }
}

fn star_state_json(state: StarState) -> String {
    if state.long { "\"L\"".to_string() } else { state.value.to_string() }
}

fn star_module_json(module: StarModule) -> String {
    format!(
        "[{},{},{}]",
        star_state_json(module.arm_a),
        star_state_json(module.arm_b),
        star_state_json(module.spine),
    )
}

fn star_key_json(modules: &[StarModule; 3]) -> String {
    format!(
        "[{},{},{}]",
        star_module_json(modules[0]),
        star_module_json(modules[1]),
        star_module_json(modules[2]),
    )
}

fn star_build_tree(lengths: &[i32; 9]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let center = 0;
    for module in 0..3 {
        let base = 3 * module;
        let outer = audit_attach(&mut adjacency, center, lengths[base + 2]);
        audit_attach(&mut adjacency, outer, lengths[base]);
        audit_attach(&mut adjacency, outer, lengths[base + 1]);
    }
    let expected = 1 + lengths.iter().sum::<i32>() as usize;
    assert_eq!(adjacency.len(), expected, "literal order mismatch");
    assert_eq!(adjacency.iter().map(|row| row.len()).sum::<usize>(), 2 * (expected - 1));
    assert_eq!(adjacency.iter().filter(|row| row.len() == 3).count(), 4);
    (adjacency, center)
}

fn star_module_poly(arm_a: i32, arm_b: i32, center_arm: i32) -> V {
    let excluded = product(&[path(arm_a), path(arm_b), path(center_arm)]);
    let included = shifted(
        &product(&[path(arm_a - 1), path(arm_b - 1), path(center_arm - 1)]),
        1,
    );
    add(&excluded, &included)
}

fn star_formula(lengths: &[i32; 9]) -> (V, V) {
    let free: [V; 3] = std::array::from_fn(|module| {
        let base = 3 * module;
        star_module_poly(lengths[base], lengths[base + 1], lengths[base + 2] - 1)
    });
    let blocked: [V; 3] = std::array::from_fn(|module| {
        let base = 3 * module;
        star_module_poly(lengths[base], lengths[base + 1], lengths[base + 2] - 2)
    });
    let deleted = product(&free);
    let core = add(&deleted, &shifted(&product(&blocked), 1));
    (core, deleted)
}

fn star_evaluate(lengths: &[i32; 9]) -> [Z; 4] {
    let (adjacency, root) = star_build_tree(lengths);
    let (values, literal_c, literal_h) = audit_deltas(&adjacency, root);
    let (formula_c, formula_h) = star_formula(lengths);
    assert_eq!(literal_c, formula_c, "core formula mismatch");
    assert_eq!(literal_h, formula_h, "deleted formula mismatch");
    values
}

fn star_lengths(modules: &[StarModule; 3]) -> [i32; 9] {
    [
        modules[0].arm_a.value, modules[0].arm_b.value, modules[0].spine.value,
        modules[1].arm_a.value, modules[1].arm_b.value, modules[1].spine.value,
        modules[2].arm_a.value, modules[2].arm_b.value, modules[2].spine.value,
    ]
}

fn star_flags(modules: &[StarModule; 3]) -> [bool; 9] {
    [
        modules[0].arm_a.long, modules[0].arm_b.long, modules[0].spine.long,
        modules[1].arm_a.long, modules[1].arm_b.long, modules[1].spine.long,
        modules[2].arm_a.long, modules[2].arm_b.long, modules[2].spine.long,
    ]
}

fn star_process(
    modules: &[StarModule; 3],
    coefficient_hash: &mut AuditSha256,
    finite_hash: &mut AuditSha256,
    counts: &mut [u64; 5],
    unseen: &mut u64,
) {
    let flags = star_flags(modules);
    let long_count = flags.iter().filter(|&&value| value).count();
    let key = star_key_json(modules);
    let mut lengths = star_lengths(modules);
    if long_count == 0 {
        counts[0] += 1;
        let order = 1 + lengths.iter().sum::<i32>();
        if order < 27 { return; }
        let values = star_evaluate(&lengths);
        assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
        audit_hash_line(finite_hash, format!("[{},{},{}]", key, order, audit_values_json(&values)));
        counts[1] += 1;
        return;
    }
    if long_count == 9 { counts[3] += 1; } else { counts[2] += 1; }
    let baseline = 1 + lengths.iter().sum::<i32>();
    let shift = (27 - baseline).max(0);
    let first = flags.iter().position(|&value| value).unwrap();
    let base_first = lengths[first];
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for sample in 0..AUDIT_SAMPLES {
        lengths[first] = base_first + shift + sample as i32;
        let values = star_evaluate(&lengths);
        for rank in 0..4 { samples[rank][sample] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] =
        std::array::from_fn(|rank| audit_differences(&samples[rank]));
    audit_assert_gate(&coefficients);
    audit_hash_line(
        coefficient_hash,
        format!("[{},{},{},{}]", key, baseline, shift, audit_coefficients_json(&coefficients)),
    );
    lengths[first] = base_first + shift + AUDIT_SAMPLES as i32;
    let next = star_evaluate(&lengths);
    for rank in 0..4 {
        assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen S29 mismatch");
        *unseen += 1;
    }
    counts[4] += 1;
}

fn main() {
    audit_sha_self_test();
    let mut module_states: Vec<StarModule> = Vec::with_capacity(224);
    for arm_a in 0..7_i32 {
        for arm_b in arm_a..7_i32 {
            for spine in 0..8_i32 {
                module_states.push(StarModule {
                    arm_a: star_arm(arm_a),
                    arm_b: star_arm(arm_b),
                    spine: star_spine(spine),
                });
            }
        }
    }
    assert_eq!(module_states.len(), 224);
    let mut coefficient_hash = AuditSha256::new();
    let mut finite_hash = AuditSha256::new();
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    let mut processed = 0_u64;
    for first in 0..module_states.len() {
        for second in first..module_states.len() {
            for third in second..module_states.len() {
                let modules = [module_states[first], module_states[second], module_states[third]];
                star_process(&modules, &mut coefficient_hash, &mut finite_hash, &mut counts, &mut unseen);
                processed += 1;
                if processed % 50_000 == 0 {
                    eprintln!("PROGRESS {}/1898400", processed);
                }
            }
        }
    }
    assert_eq!(processed, 1_898_400);
    assert_eq!(counts, [540_274, 488_801, 1_358_125, 1, 1_358_126]);
    assert_eq!(unseen, 5_432_504);
    let coefficient_stream = coefficient_hash.hex();
    let finite_stream = finite_hash.hex();
    let raw = format!(
        "PASS_LITERAL_I256_FOUR_CUBIC_STAR_CENTER_BRANCH\nCOUNTS {} {} {} {} {}\nUNSEEN {}\nCOEFFICIENT_STREAM {}\nFINITE_STREAM {}\n",
        counts[0], counts[1], counts[2], counts[3], counts[4], unseen,
        coefficient_stream, finite_stream,
    );
    std::fs::write(
        "rank8_delta03_e4_four_cubic_star_center_branch_literal_i256_raw_root_20260823.txt",
        raw.as_bytes(),
    ).expect("raw audit output write failed");
    print!("{}", raw);
}
