// Exact WROM census of Delta^6 for the rank-eight terminal-broom residual.
// Every vertex of every free tree in the declared order range is checked.

#[derive(Clone, Copy)]
struct State { excluded: [i128; 10], included: [i128; 10] }

fn one() -> [i128; 10] { let mut a = [0; 10]; a[0] = 1; a }
fn x() -> [i128; 10] { let mut a = [0; 10]; a[1] = 1; a }
fn add(a: [i128; 10], b: [i128; 10]) -> [i128; 10] {
    let mut z = [0; 10]; for j in 0..10 { z[j] = a[j] + b[j]; } z
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
fn choose(n: usize, k: usize) -> i128 {
    if k > n { return 0; }
    let mut value = 1i128;
    for j in 0..k { value = value*(n-j) as i128/(j+1) as i128; }
    value
}
fn smooth(c: [i128; 10], rank: usize, t: usize) -> i128 {
    let mut value = 0;
    for j in 0..=rank.min(t) { value += choose(t, j)*c[rank-j]; }
    value
}
fn residual(c: [i128; 10], h: [i128; 10], t: usize) -> i128 {
    let p7 = smooth(c, 7, t) + h[6];
    let p8 = smooth(c, 8, t) + h[7];
    let mut p9_open = 0;
    for j in 1..=9.min(t) { p9_open += choose(t, j)*c[9-j]; }
    8*c[7]*h[6]*(16*p8*p8-p7*p8-18*p7*p9_open)
        - 8*h[6]*p7*(16*c[8]*c[8]-c[7]*c[8])
        - 9*c[7]*p7*(14*h[7]*h[7]-h[6]*h[7])
}
fn delta5(c: [i128; 10], h: [i128; 10]) -> i128 {
    let mut values: Vec<i128> = (1..=6).map(|t| residual(c, h, t)).collect();
    for _ in 0..5 { values = values.windows(2).map(|pair| pair[1]-pair[0]).collect(); }
    values[0]
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let first: usize = args.get(1).and_then(|value| value.parse().ok()).unwrap_or(1);
    let last: usize = args.get(2).and_then(|value| value.parse().ok()).unwrap_or(17);
    let expected: [u64; 23] = [0,1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,48629,123867,317955,823065,2144505,5623756];
    assert!(1 <= first && first <= last && last <= 22);
    let mut total_trees = 0u64; let mut total_roots = 0u64; let mut total_active = 0u64;
    for n in first..=last {
        let mut layout: Option<Vec<usize>> = if n == 1 { Some(vec![0]) }
            else { Some((0..=n/2).chain(1..((n+1)/2)).collect()) };
        let mut trees = 0u64; let mut roots = 0u64; let mut active = 0u64;
        let mut minimum = i128::MAX; let mut active_minimum = i128::MAX;
        let mut first_negative: Option<(Vec<usize>, usize, i128)> = None;
        while let Some(candidate) = layout {
            layout = if n == 1 { None } else { next_tree(&candidate) };
            let valid = if n == 1 { candidate } else { match layout.clone() { Some(value) => value, None => break } };
            let adjacency = adjacency(&valid); let mut memo = vec![None; n*n];
            let state = root(0, &adjacency, &mut memo); let core = add(state.excluded, state.included);
            trees += 1;
            for vertex in 0..n {
                let deleted = root(vertex, &adjacency, &mut memo).excluded;
                let value = delta5(core, deleted); minimum = minimum.min(value);
                if core[7] > 0 && deleted[6] > 0 {
                    active += 1; active_minimum = active_minimum.min(value);
                }
                if value < 0 && first_negative.is_none() {
                    first_negative = Some((valid.clone(), vertex, value));
                }
                roots += 1;
            }
            if n > 1 { layout = next_rooted(&valid, None); }
        }
        assert_eq!(trees, expected[n]); assert_eq!(roots, expected[n]*n as u64);
        if let Some((bad_layout, bad_root, bad_value)) = first_negative {
            eprintln!("NEGATIVE n={n} layout={:?} root={bad_root} value={bad_value}", bad_layout);
            std::process::exit(2);
        }
        let active_text = if active == 0 { "NA".to_string() } else { active_minimum.to_string() };
        println!("core_n={n} trees={trees} roots={roots} active={active} delta5_min={minimum} active_min={active_text} negative=0");
        total_trees += trees; total_roots += roots; total_active += active;
    }
    println!("totals trees={total_trees} roots={total_roots} active={total_active}");
    println!("PASS_EXACT_RANK8_TERMINAL_DELTA5_ALL_ROOTED_CORES_N{first}_THROUGH_N{last}");
}

