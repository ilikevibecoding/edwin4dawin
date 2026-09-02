// Checked-i256 Delta0..3 census for one exact e=5, n=27 rooted-skeleton case.
//
// Skeleton: a central quartic Q joined to two cubic vertices C0,C1 and
// two leaves; each cubic has two further leaves.  The root is an internal
// vertex of a Q--leaf edge, mapped to the first such edge.  Splitting that edge
// at the root gives nine positive segments modulo the rooted stabilizer.

mod wide {
    include!("rank8_delta01_e3_cubic_exact_i256_core_agent.rs");
}

use wide::Z;

const ORDER: usize = 27;
const RANKS: usize = 9;
const NODE_COUNT: usize = 9;
const EDGES: [(usize, usize); 8] = [
    (0, 1), (0, 2), // Q--C0, Q--C1
    (0, 3), (0, 4), // two Q leaves
    (1, 5), (1, 6), // two C0 leaves
    (2, 7), (2, 8), // two C1 leaves
];

#[derive(Clone, Copy)]
struct State {
    excluded: [i128; RANKS],
    included: [i128; RANKS],
}

fn ai(a: i128, b: i128) -> i128 { a.checked_add(b).expect("i128 add overflow") }
fn mi(a: i128, b: i128) -> i128 { a.checked_mul(b).expect("i128 mul overflow") }
fn one() -> [i128; RANKS] { let mut out = [0; RANKS]; out[0] = 1; out }
fn x() -> [i128; RANKS] { let mut out = [0; RANKS]; out[1] = 1; out }

fn add(left: [i128; RANKS], right: [i128; RANKS]) -> [i128; RANKS] {
    let mut out = [0; RANKS];
    for k in 0..RANKS { out[k] = ai(left[k], right[k]); }
    out
}

fn multiply(left: [i128; RANKS], right: [i128; RANKS]) -> [i128; RANKS] {
    let mut out = [0; RANKS];
    for i in 0..RANKS {
        for j in 0..(RANKS - i) {
            out[i + j] = ai(out[i + j], mi(left[i], right[j]));
        }
    }
    out
}

fn directed(vertex: usize, parent: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> State {
    let order = adjacency.len();
    let key = vertex * order + parent;
    if let Some(state) = memo[key] { return state; }
    let mut excluded = one();
    let mut included = x();
    for &child in &adjacency[vertex] {
        if child == parent { continue; }
        let state = directed(child, vertex, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
    }
    let state = State { excluded, included };
    memo[key] = Some(state);
    state
}

fn whole(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; RANKS] {
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[root] {
        let state = directed(neighbor, root, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
    }
    add(excluded, included)
}

fn deletion(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; RANKS] {
    let mut out = one();
    for &neighbor in &adjacency[root] {
        let state = directed(neighbor, root, adjacency, memo);
        out = multiply(out, add(state.excluded, state.included));
    }
    out
}

fn choose_small(n: usize, k: usize) -> i128 {
    if k > n { return 0; }
    let mut out = 1_i128;
    for j in 0..k { out = out * (n - j) as i128 / (j + 1) as i128; }
    out
}

fn zterm(constant: i128, factors: &[i128]) -> Z {
    let mut out = Z::from_i128(constant);
    for &factor in factors { out = out.mul_i128(factor); }
    out
}

fn residual(core: &[i128; RANKS], deleted: &[i128; RANKS], siblings: usize) -> Z {
    let mut smooth7 = 0_i128;
    let mut smooth8 = 0_i128;
    let mut open9 = 0_i128;
    for index in 0..=7 { smooth7 = ai(smooth7, mi(core[7 - index], choose_small(siblings, index))); }
    for index in 0..=8 { smooth8 = ai(smooth8, mi(core[8 - index], choose_small(siblings, index))); }
    for index in 1..=9 { open9 = ai(open9, mi(core[9 - index], choose_small(siblings, index))); }
    let p7 = ai(smooth7, deleted[6]);
    let p8 = ai(smooth8, deleted[7]);
    let q8 = ai(ai(mi(16, mi(p8, p8)), -mi(p7, p8)), -mi(18, mi(p7, open9)));
    let core_q = ai(mi(16, mi(core[8], core[8])), -mi(core[7], core[8]));
    let deleted_q = ai(mi(14, mi(deleted[7], deleted[7])), -mi(deleted[6], deleted[7]));
    zterm(8, &[core[7], deleted[6], q8])
        .sub(zterm(8, &[deleted[6], p7, core_q]))
        .sub(zterm(9, &[core[7], p7, deleted_q]))
}

fn deltas(core: &[i128; RANKS], deleted: &[i128; RANKS]) -> [Z; 4] {
    let r1 = residual(core, deleted, 1);
    let r2 = residual(core, deleted, 2);
    let r3 = residual(core, deleted, 3);
    let r4 = residual(core, deleted, 4);
    [
        r1,
        r2.sub(r1),
        r3.sub(r2).sub(r2).add(r1),
        r4.sub(r3).sub(r3).sub(r3).add(r2).add(r2).add(r2).sub(r1),
    ]
}

fn subdivision(lengths: &[usize]) -> Vec<Vec<usize>> {
    assert_eq!(lengths.len(), EDGES.len());
    let order = NODE_COUNT + lengths.iter().sum::<usize>() - lengths.len();
    assert_eq!(order, ORDER);
    let mut adjacency = vec![Vec::new(); order];
    let mut next = NODE_COUNT;
    for (&(left, right), &length) in EDGES.iter().zip(lengths.iter()) {
        assert!(length >= 1);
        let mut previous = left;
        for _ in 1..length {
            let vertex = next;
            next += 1;
            adjacency[previous].push(vertex);
            adjacency[vertex].push(previous);
            previous = vertex;
        }
        adjacency[previous].push(right);
        adjacency[right].push(previous);
    }
    assert_eq!(next, order);
    adjacency
}

fn surplus(adjacency: &[Vec<usize>]) -> usize {
    adjacency.iter().map(|row| {
        let x = row.len().saturating_sub(1);
        x * x.saturating_sub(1) / 2
    }).sum()
}

fn canonical(s: &[usize]) -> bool {
    // Slots are Q--root, root--leaf, Q--C0, Q--C1, the other Q--leaf,
    // the C0-leaf pair, and the C1-leaf pair.  The split pendant is oriented
    // by endpoints of degrees four and one.  The cubic modules remain unordered.
    assert_eq!(s.len(), EDGES.len() + 1);
    if s[5] > s[6] || s[7] > s[8] { return false; }
    (s[5], s[6], s[2]) <= (s[7], s[8], s[3])
}

fn compositions<F: FnMut(&[usize])>(total: usize, slots: usize, callback: &mut F) {
    fn visit<F: FnMut(&[usize])>(remaining: usize, slot: usize, current: &mut [usize], callback: &mut F) {
        if slot + 1 == current.len() {
            if remaining >= 1 { current[slot] = remaining; callback(current); }
            return;
        }
        let left = current.len() - slot;
        for value in 1..=(remaining - left + 1) {
            current[slot] = value;
            visit(remaining - value, slot + 1, current, callback);
        }
    }
    let mut current = vec![0; slots];
    visit(total, 0, &mut current, callback);
}

#[derive(Clone)]
struct Minimum {
    value: Z,
    root_segments: Vec<usize>,
    lengths: Vec<usize>,
    root: usize,
    core: [i128; RANKS],
    deleted: [i128; RANKS],
}

fn json_i128_array(row: &[i128; RANKS]) -> String {
    format!("[{}]", row.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(","))
}

fn main() {
    let mut canonical_subdivisions = 0_u64;
    let mut nonpositive = [0_u64; 4];
    let mut minima: [Option<Minimum>; 4] = [None, None, None, None];
    compositions(ORDER - 1, EDGES.len() + 1, &mut |segments| {
        if !canonical(segments) { return; }
        let lengths = vec![
            segments[2], segments[3], segments[0] + segments[1], segments[4],
            segments[5], segments[6], segments[7], segments[8],
        ];
        let adjacency = subdivision(&lengths);
        assert_eq!(surplus(&adjacency), 5);
        let root = NODE_COUNT + (segments[2] - 1) + (segments[3] - 1) + (segments[0] - 1);
        assert!(root >= NODE_COUNT && root < ORDER);
        assert_eq!(adjacency[root].len(), 2);
        let mut memo = vec![None; ORDER * ORDER];
        let core = whole(root, &adjacency, &mut memo);
        let deleted = deletion(root, &adjacency, &mut memo);
        let values = deltas(&core, &deleted);
        canonical_subdivisions += 1;
        for rank in 0..4 {
            if !values[rank].is_positive() { nonpositive[rank] += 1; }
            if minima[rank].as_ref().map_or(true, |row| values[rank].cmp(row.value).is_lt()) {
                minima[rank] = Some(Minimum {
                    value: values[rank],
                    root_segments: segments.to_vec(),
                    lengths: lengths.clone(),
                    root,
                    core,
                    deleted,
                });
            }
        }
    });
    let any_nonpositive = nonpositive.iter().any(|&x| x != 0);
    let mut minima_json = Vec::new();
    for rank in 0..4 {
        let row = minima[rank].as_ref().expect("nonempty exact case");
        minima_json.push(format!(
            "\"{}\":{{\"value\":\"{}\",\"root_segments\":{:?},\"lengths\":{:?},\"root\":{},\"core\":{},\"deleted\":{}}}",
            rank, row.value.decimal(), row.root_segments, row.lengths, row.root, json_i128_array(&row.core), json_i128_array(&row.deleted)
        ));
    }
    let status = if any_nonpositive {
        "OBSTRUCTION_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_ORDER27"
    } else {
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_ORDER27"
    };
    println!(
        "{{\"schema\":\"rank8-delta03-e5-quartic-center-two-cubic-quartic-pendant-internal-order27-i256-agent-v1\",\"status\":\"{}\",\"order\":27,\"degree_surplus\":5,\"suppressed_skeleton\":\"quartic_center_two_cubic\",\"root_orbit\":\"quartic_pendant_internal\",\"rooted_automorphism_group_order\":8,\"suppressed_edges\":8,\"root_split_slots\":9,\"canonical_subdivisions\":{},\"literal_root_checks\":{},\"nonpositive\":[{},{},{},{}],\"minima\":{{{}}},\"scope_guard\":\"One finite rooted-skeleton orbit only; no other e=5, all-order, forest, PGC, or Problem 993 claim.\"}}",
        status, canonical_subdivisions, canonical_subdivisions,
        nonpositive[0], nonpositive[1], nonpositive[2], nonpositive[3], minima_json.join(",")
    );
    println!("{}", status);
    if any_nonpositive { std::process::exit(2); }
}




