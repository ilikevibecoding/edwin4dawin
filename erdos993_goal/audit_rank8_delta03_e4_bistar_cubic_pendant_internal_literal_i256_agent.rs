// Independent checked-i256 literal audit for the e=4 bistar cubic-pendant root.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

#[derive(Clone, Copy)]
struct CPState { value: i32, long: bool }

fn cp_ordinary(index: i32) -> CPState {
    if index == 6 { CPState { value: 7, long: true } }
    else { CPState { value: index + 1, long: false } }
}

fn cp_near(index: i32) -> CPState {
    if index == 7 { CPState { value: 7, long: true } }
    else { CPState { value: index, long: false } }
}

fn cp_spine(index: i32) -> CPState {
    if index == 7 { CPState { value: 8, long: true } }
    else { CPState { value: index + 1, long: false } }
}

fn cp_state_json(state: CPState) -> String {
    if state.long { "\"L\"".to_string() } else { state.value.to_string() }
}

fn cp_key_json(states: &[CPState; 7]) -> String {
    format!(
        "[[{},{},{}],{},{},{},{}]",
        cp_state_json(states[0]), cp_state_json(states[1]), cp_state_json(states[2]),
        cp_state_json(states[3]), cp_state_json(states[4]), cp_state_json(states[5]), cp_state_json(states[6]),
    )
}

fn cp_build_tree(lengths: &[i32; 7]) -> (Vec<Vec<usize>>, usize) {
    let mut adjacency = vec![Vec::new()];
    let quartic = 0;
    let cubic = audit_attach(&mut adjacency, quartic, lengths[6]);
    for index in 0..3 { audit_attach(&mut adjacency, quartic, lengths[index]); }
    audit_attach(&mut adjacency, cubic, lengths[3]);
    let root = audit_attach(&mut adjacency, cubic, lengths[4] + 1);
    audit_attach(&mut adjacency, root, lengths[5]);
    let expected = 2 + lengths.iter().sum::<i32>() as usize;
    assert_eq!(adjacency.len(), expected, "literal order mismatch");
    assert_eq!(adjacency.iter().map(|row| row.len()).sum::<usize>(), 2 * (expected - 1));
    (adjacency, root)
}

fn cp_branch_states(arms: &[i32]) -> (V, V) {
    let excluded: Vec<V> = arms.iter().map(|&length| path(length)).collect();
    let included: Vec<V> = arms.iter().map(|&length| path(length - 1)).collect();
    (product(&excluded), shifted(&product(&included), 1))
}

fn cp_bistar(q: &[i32; 3], carms: &[i32; 2], spine: i32) -> V {
    let (q0, q1) = cp_branch_states(q);
    let (c0, c1) = cp_branch_states(carms);
    let mut out = zero();
    for (left, qstate) in [(0_i32, q0), (1_i32, q1)] {
        for (right, cstate) in [(0_i32, c0), (1_i32, c1)] {
            out = add(&out, &product(&[qstate, cstate, path(spine - 1 - left - right)]));
        }
    }
    out
}

fn cp_formula(lengths: &[i32; 7]) -> (V, V) {
    let q = [lengths[0], lengths[1], lengths[2]];
    let core = cp_bistar(&q, &[lengths[3], lengths[4] + 1 + lengths[5]], lengths[6]);
    let remainder = cp_bistar(&q, &[lengths[3], lengths[4]], lengths[6]);
    (core, mul(&path(lengths[5]), &remainder))
}

fn cp_evaluate(lengths: &[i32; 7]) -> [Z; 4] {
    let (adjacency, root) = cp_build_tree(lengths);
    let (values, literal_c, literal_h) = audit_deltas(&adjacency, root);
    let (formula_c, formula_h) = cp_formula(lengths);
    assert_eq!(literal_c, formula_c, "core formula mismatch");
    assert_eq!(literal_h, formula_h, "deleted formula mismatch");
    values
}

fn cp_process(
    states: &[CPState; 7],
    coefficient_hash: &mut AuditSha256,
    finite_hash: &mut AuditSha256,
    counts: &mut [u64; 5],
    unseen: &mut u64,
) {
    let flags: [bool; 7] = std::array::from_fn(|index| states[index].long);
    let long_count = flags.iter().filter(|&&value| value).count();
    let key = cp_key_json(states);
    let mut lengths: [i32; 7] = std::array::from_fn(|index| states[index].value);
    if long_count == 0 {
        counts[0] += 1;
        let order = 2 + lengths.iter().sum::<i32>();
        if order < 27 { return; }
        let values = cp_evaluate(&lengths);
        assert!(values.iter().all(|value| value.is_positive()), "finite nonpositive");
        audit_hash_line(finite_hash, format!("[{},{},{}]", key, order, audit_values_json(&values)));
        counts[1] += 1;
        return;
    }
    if long_count == 7 { counts[3] += 1; } else { counts[2] += 1; }
    let baseline = 2 + lengths.iter().sum::<i32>();
    let shift = (27 - baseline).max(0);
    let first = flags.iter().position(|&value| value).unwrap();
    let mut samples = [[Z::zero(); AUDIT_SAMPLES]; 4];
    for sample in 0..AUDIT_SAMPLES {
        lengths[first] = states[first].value + shift + sample as i32;
        let values = cp_evaluate(&lengths);
        for rank in 0..4 { samples[rank][sample] = values[rank]; }
    }
    let coefficients: [[Z; AUDIT_SAMPLES]; 4] = std::array::from_fn(|rank| audit_differences(&samples[rank]));
    audit_assert_gate(&coefficients);
    audit_hash_line(coefficient_hash, format!("[{},{},{},{}]", key, baseline, shift, audit_coefficients_json(&coefficients)));
    lengths[first] = states[first].value + shift + AUDIT_SAMPLES as i32;
    let next = cp_evaluate(&lengths);
    for rank in 0..4 {
        assert_eq!(next[rank], audit_newton_at_29(&coefficients[rank]), "unseen S29 mismatch");
        *unseen += 1;
    }
    counts[4] += 1;
}

fn main() {
    audit_sha_self_test();
    let mut coefficient_hash = AuditSha256::new();
    let mut finite_hash = AuditSha256::new();
    let mut counts = [0_u64; 5];
    let mut unseen = 0_u64;
    for a in 0..7_i32 { for b in a..7 { for c in b..7 {
        for other in 0..7_i32 { for near in 0..8_i32 { for tail in 0..7_i32 { for spine in 0..8_i32 {
            let states = [cp_ordinary(a),cp_ordinary(b),cp_ordinary(c),cp_ordinary(other),cp_near(near),cp_ordinary(tail),cp_spine(spine)];
            cp_process(&states, &mut coefficient_hash, &mut finite_hash, &mut counts, &mut unseen);
        }}}}
    }}}
    assert_eq!(counts, [98_784,49_392,164_639,1,164_640]);
    assert_eq!(unseen, 658_560);
    println!("PASS_LITERAL_I256_CUBIC_PENDANT_INTERNAL");
    println!("COUNTS {} {} {} {} {}", counts[0],counts[1],counts[2],counts[3],counts[4]);
    println!("UNSEEN {}", unseen);
    println!("COEFFICIENT_STREAM {}", coefficient_hash.hex());
    println!("FINITE_STREAM {}", finite_hash.hex());
}
