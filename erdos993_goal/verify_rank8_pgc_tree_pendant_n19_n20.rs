// Exact WROM audit of the literal rank-eight pendant margin on every tree
// pendant pair at orders 19 and 20.  This is finite evidence, not a theorem.

#[derive(Clone, Copy)]
struct State { excluded: [i128; 10], included: [i128; 10] }

fn one() -> [i128; 10] { let mut a = [0; 10]; a[0] = 1; a }
fn x() -> [i128; 10] { let mut a = [0; 10]; a[1] = 1; a }
fn add(a: [i128; 10], b: [i128; 10]) -> [i128; 10] {
    let mut z = [0; 10];
    for j in 0..10 { z[j] = a[j] + b[j]; }
    z
}
fn mul(a: [i128; 10], b: [i128; 10]) -> [i128; 10] {
    let mut z = [0; 10];
    for i in 0..10 { for j in 0..(10-i) { z[i+j] += a[i] * b[j]; } }
    z
}

fn split_tree(layout: &[usize]) -> (Vec<usize>, Vec<usize>) {
    let mut seen = false; let mut split = layout.len();
    for (i, level) in layout.iter().enumerate() {
        if *level == 1 { if seen { split = i; break; } seen = true; }
    }
    let left = layout[1..split].iter().map(|level| level-1).collect();
    let mut rest = vec![0]; rest.extend_from_slice(&layout[split..]);
    (left, rest)
}
fn next_rooted(pre: &[usize], specified: Option<usize>) -> Option<Vec<usize>> {
    let p = match specified {
        Some(value) => value,
        None => { let mut value = pre.len()-1; while pre[value] == 1 { value -= 1; } value }
    };
    if p == 0 { return None; }
    let mut q = p-1; while pre[q] != pre[p]-1 { q -= 1; }
    let mut out = pre.to_vec();
    for i in p..out.len() { out[i] = out[i-p+q]; }
    Some(out)
}
fn next_tree(current: &[usize]) -> Option<Vec<usize>> {
    let (left, rest) = split_tree(current);
    let left_height = *left.iter().max().unwrap();
    let right_height = *rest.iter().max().unwrap();
    let valid = right_height > left_height ||
        (right_height == left_height &&
         (left.len() < rest.len() || (left.len() == rest.len() && left <= rest)));
    if valid { return Some(current.to_vec()); }
    let p = left.len(); let mut out = next_rooted(current, Some(p))?;
    if current[p] > 2 {
        let (new_left, _) = split_tree(&out);
        let height = *new_left.iter().max().unwrap(); let len = height+1;
        let start = out.len()-len; for k in 0..len { out[start+k] = k+1; }
    }
    Some(out)
}
fn adjacency(layout: &[usize]) -> Vec<Vec<usize>> {
    let n = layout.len(); let mut adjacency = vec![Vec::new(); n];
    let mut stack: Vec<usize> = Vec::new();
    for i in 0..n {
        let level = layout[i];
        if let Some(&last) = stack.last() {
            let mut parent = last;
            while layout[parent] >= level { stack.pop(); parent = *stack.last().unwrap(); }
            adjacency[i].push(parent); adjacency[parent].push(i);
        }
        stack.push(i);
    }
    adjacency
}
fn directed(v: usize, parent: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> State {
    let n = adjacency.len(); let key = v*n+parent;
    if let Some(state) = memo[key] { return state; }
    let mut excluded = one(); let mut included = x();
    for &u in &adjacency[v] {
        if u == parent { continue; }
        let state = directed(u, v, adjacency, memo);
        excluded = mul(excluded, add(state.excluded, state.included));
        included = mul(included, state.excluded);
    }
    let state = State { excluded, included }; memo[key] = Some(state); state
}
fn root(v: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> State {
    let mut excluded = one(); let mut included = x();
    for &u in &adjacency[v] {
        let state = directed(u, v, adjacency, memo);
        excluded = mul(excluded, add(state.excluded, state.included));
        included = mul(included, state.excluded);
    }
    State { excluded, included }
}

fn mis_directed(v: usize, parent: usize, adjacency: &[Vec<usize>]) -> (usize, usize) {
    let mut excluded = 0usize; let mut included = 1usize;
    for &u in &adjacency[v] {
        if u == parent { continue; }
        let (child_excluded, child_included) = mis_directed(u, v, adjacency);
        excluded += child_excluded.max(child_included);
        included += child_excluded;
    }
    (excluded, included)
}
fn independence_number(adjacency: &[Vec<usize>]) -> usize {
    let (excluded, included) = mis_directed(0, adjacency.len(), adjacency);
    excluded.max(included)
}

fn q8(p: [i128; 10]) -> i128 {
    16*p[8]*p[8] - p[7]*p[8] - 18*p[7]*p[9]
}
fn v8(b: [i128; 10]) -> i128 {
    10*b[6]*b[7] + 136*b[6]*b[8] - 98*b[7]*b[7]
}
fn reduced_for_support(
    support: usize,
    leaf: usize,
    adjacency: &[Vec<usize>],
    memo: &mut [Option<State>],
) -> [i128; 10] {
    let mut b = one();
    for &u in &adjacency[support] {
        if u == leaf { continue; }
        let state = directed(u, support, adjacency, memo);
        b = mul(b, add(state.excluded, state.included));
    }
    b
}

#[derive(Clone)]
struct Minimum {
    numerator: i128,
    denominator: i128,
    n: usize,
    alpha: usize,
    layout: Vec<usize>,
    support: usize,
    p: [i128; 10],
    b: [i128; 10],
}
fn is_better(num: i128, den: i128, old: &Option<Minimum>) -> bool {
    match old { None => true, Some(value) => num*value.denominator < value.numerator*den }
}

fn main() {
    let expected: [u64; 21] = [0,1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,48629,123867,317955,823065];
    let mut total_trees = 0u64; let mut total_supports = 0u64; let mut total_required = 0u64;
    let mut by_alpha = [0u64; 21]; let mut q_negative = 0u64; let mut v_negative = 0u64;
    let mut coupled_negative = 0u64; let mut global_minimum: Option<Minimum> = None;

    for n in 19..=20 {
        let mut layout: Option<Vec<usize>> = Some((0..=n/2).chain(1..((n+1)/2)).collect());
        let mut trees = 0u64; let mut supports = 0u64; let mut required = 0u64;
        let mut local_minimum: Option<Minimum> = None;
        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
            let valid = match layout.clone() { Some(value) => value, None => break };
            let adjacency = adjacency(&valid); let mut memo = vec![None; n*n];
            let state = root(0, &adjacency, &mut memo); let p = add(state.excluded, state.included);
            let alpha = independence_number(&adjacency);
            trees += 1;

            for support in 0..n {
                let leaf = match adjacency[support].iter().find(|&&u| adjacency[u].len() == 1) {
                    Some(value) => *value,
                    None => continue,
                };
                supports += 1;
                if alpha < 13 { continue; }
                let b = reduced_for_support(support, leaf, &adjacency, &mut memo);
                assert!(p[7] > 0 && b[6] > 0);
                let c7 = p[8] - b[8] - b[7]; assert!(c7 >= 0);
                let q = q8(p); let v = v8(b);
                let numerator = 8*b[6]*q + 24*c7*p[7]*b[6] + v*p[7];
                let denominator = 2*p[7]*b[6];
                required += 1; by_alpha[alpha] += 1;
                q_negative += (q < 0) as u64;
                v_negative += (v < 0) as u64;
                coupled_negative += (numerator < 0) as u64;
                let item = Minimum { numerator, denominator, n, alpha, layout: valid.clone(), support, p, b };
                if is_better(numerator, denominator, &local_minimum) { local_minimum = Some(item.clone()); }
                if is_better(numerator, denominator, &global_minimum) { global_minimum = Some(item); }
                if numerator < 0 {
                    eprintln!("NEGATIVE n={n} alpha={alpha} layout={:?} support={support} numerator={numerator} denominator={denominator}", valid);
                    std::process::exit(2);
                }
            }
            layout = next_rooted(&valid, None);
        }
        assert_eq!(trees, expected[n]);
        let minimum = local_minimum.unwrap();
        println!("order={n} trees={trees} pendant_supports={supports} required={required} min_num={} min_den={} min_alpha={} negative=0", minimum.numerator, minimum.denominator, minimum.alpha);
        total_trees += trees; total_supports += supports; total_required += required;
    }
    let minimum = global_minimum.unwrap();
    println!("totals trees={total_trees} pendant_supports={total_supports} required={total_required} q_negative={q_negative} v_negative={v_negative} coupled_negative={coupled_negative}");
    for alpha in 13..=20 { if by_alpha[alpha] > 0 { println!("alpha={alpha} required={}", by_alpha[alpha]); } }
    println!("global_min num={} den={} order={} alpha={} support={} layout={:?}", minimum.numerator, minimum.denominator, minimum.n, minimum.alpha, minimum.support, minimum.layout);
    println!("global_min_p={:?}", minimum.p);
    println!("global_min_b={:?}", minimum.b);
    println!("PASS_EXACT_RANK8_TREE_PENDANT_PGC_N19_N20_NOT_ALL_FORESTS");
}
