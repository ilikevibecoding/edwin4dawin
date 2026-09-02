// Exact all-root Delta0/Delta1 census for one order of the e=3 cubic skeleton.
//
// Suppressing degree-two vertices leaves three degree-three vertices in a
// path, with two leaves at each outer branch and one leaf at the middle.
// The seven positive edge lengths below recover every subdivision.  The
// canonical inequalities quotient exactly by the leaf-pair swaps and the
// left-right reflection.

use std::env;

#[derive(Clone, Copy)]
struct State {
    excluded: [i128; 9],
    included: [i128; 9],
}

fn add_i(left: i128, right: i128) -> i128 {
    left.checked_add(right).expect("i128 addition overflow")
}

fn sub_i(left: i128, right: i128) -> i128 {
    left.checked_sub(right).expect("i128 subtraction overflow")
}

fn mul_i(left: i128, right: i128) -> i128 {
    left.checked_mul(right).expect("i128 multiplication overflow")
}

fn scale(value: i128, multiplier: i128) -> i128 {
    mul_i(value, multiplier)
}

fn one() -> [i128; 9] {
    let mut out = [0; 9];
    out[0] = 1;
    out
}

fn x() -> [i128; 9] {
    let mut out = [0; 9];
    out[1] = 1;
    out
}

fn add(left: [i128; 9], right: [i128; 9]) -> [i128; 9] {
    let mut out = [0; 9];
    for rank in 0..9 {
        out[rank] = add_i(left[rank], right[rank]);
    }
    out
}

fn multiply(left: [i128; 9], right: [i128; 9]) -> [i128; 9] {
    let mut out = [0; 9];
    for i in 0..9 {
        for j in 0..(9 - i) {
            out[i + j] = add_i(out[i + j], mul_i(left[i], right[j]));
        }
    }
    out
}

fn directed(
    vertex: usize,
    parent: usize,
    adjacency: &[Vec<usize>],
    memo: &mut [Option<State>],
) -> State {
    let order = adjacency.len();
    let key = vertex * order + parent;
    if let Some(state) = memo[key] {
        return state;
    }
    let mut excluded = one();
    let mut included = x();
    for &child_vertex in &adjacency[vertex] {
        if child_vertex == parent {
            continue;
        }
        let child = directed(child_vertex, vertex, adjacency, memo);
        excluded = multiply(excluded, add(child.excluded, child.included));
        included = multiply(included, child.excluded);
    }
    let state = State { excluded, included };
    memo[key] = Some(state);
    state
}

fn whole(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; 9] {
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[root] {
        let child = directed(neighbor, root, adjacency, memo);
        excluded = multiply(excluded, add(child.excluded, child.included));
        included = multiply(included, child.excluded);
    }
    add(excluded, included)
}

fn deletion(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; 9] {
    let mut out = one();
    for &neighbor in &adjacency[root] {
        let child = directed(neighbor, root, adjacency, memo);
        out = multiply(out, add(child.excluded, child.included));
    }
    out
}

fn choose_small(n: usize, k: usize) -> i128 {
    if k > n {
        return 0;
    }
    let mut value = 1_i128;
    for index in 0..k {
        value = value * (n - index) as i128 / (index + 1) as i128;
    }
    value
}

fn residual(core: &[i128; 9], deleted: &[i128; 9], siblings: usize) -> i128 {
    let mut smooth7 = 0_i128;
    let mut smooth8 = 0_i128;
    let mut open9 = 0_i128;
    for index in 0..=7 {
        smooth7 = add_i(smooth7, scale(core[7 - index], choose_small(siblings, index)));
    }
    for index in 0..=8 {
        smooth8 = add_i(smooth8, scale(core[8 - index], choose_small(siblings, index)));
    }
    for index in 1..=9 {
        open9 = add_i(open9, scale(core[9 - index], choose_small(siblings, index)));
    }
    let p7 = add_i(smooth7, deleted[6]);
    let p8 = add_i(smooth8, deleted[7]);
    let q8 = sub_i(
        sub_i(scale(mul_i(p8, p8), 16), mul_i(p7, p8)),
        scale(mul_i(p7, open9), 18),
    );
    let core_q_open = sub_i(scale(mul_i(core[8], core[8]), 16), mul_i(core[7], core[8]));
    let deleted_q_open = sub_i(scale(mul_i(deleted[7], deleted[7]), 14), mul_i(deleted[6], deleted[7]));
    let first = scale(mul_i(mul_i(core[7], deleted[6]), q8), 8);
    let second = scale(mul_i(mul_i(deleted[6], p7), core_q_open), 8);
    let third = scale(mul_i(mul_i(core[7], p7), deleted_q_open), 9);
    sub_i(sub_i(first, second), third)
}

fn deltas(core: &[i128; 9], deleted: &[i128; 9]) -> (i128, i128) {
    let first = residual(core, deleted, 1);
    let second = residual(core, deleted, 2);
    (first, sub_i(second, first))
}

fn subdivision(lengths: &[usize; 7]) -> Vec<Vec<usize>> {
    // Edge order: A--M, M--B, A leaves, M leaf, B leaves.
    let edges = [
        (0_usize, 1_usize),
        (1, 2),
        (0, 3),
        (0, 4),
        (1, 5),
        (2, 6),
        (2, 7),
    ];
    let order = 8 + lengths.iter().sum::<usize>() - 7;
    let mut adjacency = vec![Vec::new(); order];
    let mut next_vertex = 8;
    for ((left, right), &length) in edges.iter().zip(lengths.iter()) {
        assert!(length >= 1);
        let mut previous = *left;
        for _ in 1..length {
            let vertex = next_vertex;
            next_vertex += 1;
            adjacency[previous].push(vertex);
            adjacency[vertex].push(previous);
            previous = vertex;
        }
        adjacency[previous].push(*right);
        adjacency[*right].push(previous);
    }
    assert_eq!(next_vertex, order);
    adjacency
}

fn surplus(adjacency: &[Vec<usize>]) -> usize {
    adjacency
        .iter()
        .map(|neighbors| {
            let excess = neighbors.len().saturating_sub(1);
            excess * excess.saturating_sub(1) / 2
        })
        .sum()
}

#[derive(Default)]
struct Audit {
    trees: u64,
    roots: u64,
    negative0: u64,
    negative1: u64,
    minimum0: Option<i128>,
    minimum1: Option<i128>,
    witness0_lengths: [usize; 7],
    witness1_lengths: [usize; 7],
    witness0_root: usize,
    witness1_root: usize,
    witness0_core: [i128; 9],
    witness1_core: [i128; 9],
    witness0_deleted: [i128; 9],
    witness1_deleted: [i128; 9],
}

impl Audit {
    fn check(&mut self, adjacency: &[Vec<usize>], lengths: &[usize; 7]) {
        assert_eq!(surplus(adjacency), 3);
        let order = adjacency.len();
        let mut memo = vec![None; order * order];
        let core = whole(0, adjacency, &mut memo);
        self.trees += 1;
        for root in 0..order {
            let deleted = deletion(root, adjacency, &mut memo);
            let (delta0, delta1) = deltas(&core, &deleted);
            self.roots += 1;
            if delta0 <= 0 {
                self.negative0 += 1;
            }
            if delta1 <= 0 {
                self.negative1 += 1;
            }
            if self.minimum0.map_or(true, |minimum| delta0 < minimum) {
                self.minimum0 = Some(delta0);
                self.witness0_lengths = *lengths;
                self.witness0_root = root;
                self.witness0_core = core;
                self.witness0_deleted = deleted;
            }
            if self.minimum1.map_or(true, |minimum| delta1 < minimum) {
                self.minimum1 = Some(delta1);
                self.witness1_lengths = *lengths;
                self.witness1_root = root;
                self.witness1_core = core;
                self.witness1_deleted = deleted;
            }
        }
    }
}

fn compositions<F: FnMut(&[usize; 7])>(total: usize, callback: &mut F) {
    fn visit<F: FnMut(&[usize; 7])>(
        remaining: usize,
        slot: usize,
        current: &mut [usize; 7],
        callback: &mut F,
    ) {
        if slot == 6 {
            if remaining >= 1 {
                current[slot] = remaining;
                callback(current);
            }
            return;
        }
        let remaining_slots = 7 - slot;
        for value in 1..=(remaining - remaining_slots + 1) {
            current[slot] = value;
            visit(remaining - value, slot + 1, current, callback);
        }
    }
    visit(total, 0, &mut [0; 7], callback);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let order: usize = args.get(1).expect("order argument").parse().expect("integer order");
    assert!(order >= 8);
    let mut audit = Audit::default();
    compositions(order - 1, &mut |lengths| {
        let (u, v, a1, a2, b1, b2) = (
            lengths[0], lengths[1], lengths[2], lengths[3], lengths[5], lengths[6]
        );
        if a1 > a2 || b1 > b2 || (a1, a2, u) > (b1, b2, v) {
            return;
        }
        let adjacency = subdivision(lengths);
        assert_eq!(adjacency.len(), order);
        audit.check(&adjacency, lengths);
    });
    assert!(audit.minimum0.is_some() && audit.minimum1.is_some());
    println!(
        "{{\"order\":{},\"trees\":{},\"roots\":{},\"negative0\":{},\"negative1\":{},\"minimum0\":\"{}\",\"minimum1\":\"{}\",\"witness0\":{{\"lengths\":{:?},\"root\":{},\"core\":{:?},\"deleted\":{:?}}},\"witness1\":{{\"lengths\":{:?},\"root\":{},\"core\":{:?},\"deleted\":{:?}}}}}",
        order,
        audit.trees,
        audit.roots,
        audit.negative0,
        audit.negative1,
        audit.minimum0.unwrap(),
        audit.minimum1.unwrap(),
        audit.witness0_lengths,
        audit.witness0_root,
        audit.witness0_core,
        audit.witness0_deleted,
        audit.witness1_lengths,
        audit.witness1_root,
        audit.witness1_core,
        audit.witness1_deleted,
    );
    assert_eq!(audit.negative0, 0);
    assert_eq!(audit.negative1, 0);
    println!("PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ORDER_{}", order);
}
