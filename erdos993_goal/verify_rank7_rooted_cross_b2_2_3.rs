// Exact structural census of rooted C7 for all trees with B2=2 or 3.
//
// Suppress every degree-two vertex.  Since
// B2=sum_v binom(deg(v)-1,2), the only homeomorphically irreducible
// skeletons are:
//   B2=2: two degree-three vertices joined, with two leaves at each;
//   B2=3: a degree-four star, or three degree-three vertices in a path.
// Every original tree is recovered by assigning a positive integer length
// to each skeleton edge.  The canonical ordering conditions below quotient
// exactly by each skeleton's automorphism group.

#[derive(Clone, Copy)]
struct State {
    excluded: [i128; 8],
    included: [i128; 8],
}

fn one() -> [i128; 8] {
    let mut out = [0; 8];
    out[0] = 1;
    out
}

fn x() -> [i128; 8] {
    let mut out = [0; 8];
    out[1] = 1;
    out
}

fn add(left: [i128; 8], right: [i128; 8]) -> [i128; 8] {
    let mut out = [0; 8];
    for rank in 0..8 {
        out[rank] = left[rank] + right[rank];
    }
    out
}

fn multiply(left: [i128; 8], right: [i128; 8]) -> [i128; 8] {
    let mut out = [0; 8];
    for i in 0..8 {
        for j in 0..(8 - i) {
            out[i + j] += left[i] * right[j];
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
    for &neighbor in &adjacency[vertex] {
        if neighbor == parent {
            continue;
        }
        let child = directed(neighbor, vertex, adjacency, memo);
        excluded = multiply(excluded, add(child.excluded, child.included));
        included = multiply(included, child.excluded);
    }
    let state = State { excluded, included };
    memo[key] = Some(state);
    state
}

fn whole(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; 8] {
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[root] {
        let child = directed(neighbor, root, adjacency, memo);
        excluded = multiply(excluded, add(child.excluded, child.included));
        included = multiply(included, child.excluded);
    }
    add(excluded, included)
}

fn deletion(root: usize, adjacency: &[Vec<usize>], memo: &mut [Option<State>]) -> [i128; 8] {
    let mut out = one();
    for &neighbor in &adjacency[root] {
        let child = directed(neighbor, root, adjacency, memo);
        out = multiply(out, add(child.excluded, child.included));
    }
    out
}

fn c7(polynomial: [i128; 8], deleted: [i128; 8]) -> i128 {
    let (d, e, f) = (polynomial[5], polynomial[6], polynomial[7]);
    let (h, k) = (deleted[5], deleted[6]);
    d * (e * e - d * f) - 2 * e * (e * h - d * k)
}

fn subdivision(
    skeleton_vertices: usize,
    skeleton_edges: &[(usize, usize)],
    lengths: &[usize],
) -> Vec<Vec<usize>> {
    assert_eq!(skeleton_edges.len(), lengths.len());
    let order = skeleton_vertices + lengths.iter().sum::<usize>() - lengths.len();
    let mut adjacency = vec![Vec::new(); order];
    let mut next_vertex = skeleton_vertices;
    for ((left, right), &length) in skeleton_edges.iter().zip(lengths) {
        assert!(length >= 1);
        let mut previous = *left;
        for step in 1..length {
            let vertex = if step == length { *right } else { next_vertex };
            // The branch is retained for clarity; step<length always here.
            adjacency[previous].push(vertex);
            adjacency[vertex].push(previous);
            previous = vertex;
            next_vertex += 1;
        }
        adjacency[previous].push(*right);
        adjacency[*right].push(previous);
    }
    assert_eq!(next_vertex, order);
    adjacency
}

fn b2(adjacency: &[Vec<usize>]) -> usize {
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
    negative: u64,
    minimum: i128,
    initialized: bool,
    witness_lengths: Vec<usize>,
    witness_root: usize,
    witness_polynomial: [i128; 8],
    witness_deleted: [i128; 8],
}

impl Audit {
    fn check(&mut self, adjacency: &[Vec<usize>], lengths: &[usize], expected_b2: usize) {
        assert_eq!(b2(adjacency), expected_b2);
        let order = adjacency.len();
        let mut memo = vec![None; order * order];
        let polynomial = whole(0, adjacency, &mut memo);
        self.trees += 1;
        for root in 0..order {
            let deleted = deletion(root, adjacency, &mut memo);
            let value = c7(polynomial, deleted);
            self.roots += 1;
            if value <= 0 {
                self.negative += 1;
            }
            if !self.initialized || value < self.minimum {
                self.initialized = true;
                self.minimum = value;
                self.witness_lengths = lengths.to_vec();
                self.witness_root = root;
                self.witness_polynomial = polynomial;
                self.witness_deleted = deleted;
            }
        }
    }
}

fn compositions<F: FnMut(&[usize])>(total: usize, parts: usize, callback: &mut F) {
    fn visit<F: FnMut(&[usize])>(
        remaining: usize,
        slots: usize,
        prefix: &mut Vec<usize>,
        callback: &mut F,
    ) {
        if slots == 1 {
            if remaining >= 1 {
                prefix.push(remaining);
                callback(prefix);
                prefix.pop();
            }
            return;
        }
        for first in 1..=(remaining - slots + 1) {
            prefix.push(first);
            visit(remaining - first, slots - 1, prefix, callback);
            prefix.pop();
        }
    }
    visit(total, parts, &mut Vec::with_capacity(parts), callback);
}

fn verify_order(order: usize) {
    let total_length = order - 1;
    let mut b2_two = Audit::default();
    let mut b2_three_star = Audit::default();
    let mut b2_three_chain = Audit::default();

    // Length order: central, A-leaf-1, A-leaf-2, B-leaf-1, B-leaf-2.
    let two_edges = [(0, 1), (0, 2), (0, 3), (1, 4), (1, 5)];
    compositions(total_length, 5, &mut |lengths| {
        let (central, a1, a2, b1, b2_length) =
            (lengths[0], lengths[1], lengths[2], lengths[3], lengths[4]);
        if a1 > a2 || b1 > b2_length || (a1, a2) > (b1, b2_length) {
            return;
        }
        let adjacency = subdivision(6, &two_edges, lengths);
        assert_eq!(adjacency.len(), order);
        let _ = central;
        b2_two.check(&adjacency, lengths, 2);
    });

    // One degree-four vertex: unordered positive arm lengths.
    let star_edges = [(0, 1), (0, 2), (0, 3), (0, 4)];
    compositions(total_length, 4, &mut |lengths| {
        if !(lengths[0] <= lengths[1]
            && lengths[1] <= lengths[2]
            && lengths[2] <= lengths[3])
        {
            return;
        }
        let adjacency = subdivision(5, &star_edges, lengths);
        assert_eq!(adjacency.len(), order);
        b2_three_star.check(&adjacency, lengths, 3);
    });

    // Three degree-three vertices in a path.  Length order:
    // A--M, M--B, A leaves, M leaf, B leaves.
    let chain_edges = [
        (0, 1),
        (1, 2),
        (0, 3),
        (0, 4),
        (1, 5),
        (2, 6),
        (2, 7),
    ];
    compositions(total_length, 7, &mut |lengths| {
        let (u, v, a1, a2, middle, b1, b2_length) = (
            lengths[0],
            lengths[1],
            lengths[2],
            lengths[3],
            lengths[4],
            lengths[5],
            lengths[6],
        );
        if a1 > a2 || b1 > b2_length || (a1, a2, u) > (b1, b2_length, v) {
            return;
        }
        let adjacency = subdivision(8, &chain_edges, lengths);
        assert_eq!(adjacency.len(), order);
        let _ = middle;
        b2_three_chain.check(&adjacency, lengths, 3);
    });

    assert!(b2_two.initialized && b2_three_star.initialized && b2_three_chain.initialized);
    assert_eq!(b2_two.negative + b2_three_star.negative + b2_three_chain.negative, 0);
    let b2_three_trees = b2_three_star.trees + b2_three_chain.trees;
    let b2_three_roots = b2_three_star.roots + b2_three_chain.roots;
    let (minimum, family, witness) = if b2_three_star.minimum <= b2_three_chain.minimum {
        (b2_three_star.minimum, "degree4_star", &b2_three_star)
    } else {
        (b2_three_chain.minimum, "degree3_chain", &b2_three_chain)
    };
    println!(
        "order={order} b2=2 trees={} roots={} minimum={} witness_lengths={:?} witness_root={} polynomial={:?} deletion={:?}",
        b2_two.trees,
        b2_two.roots,
        b2_two.minimum,
        b2_two.witness_lengths,
        b2_two.witness_root,
        b2_two.witness_polynomial,
        b2_two.witness_deleted,
    );
    println!(
        "order={order} b2=3 trees={} star_trees={} chain_trees={} roots={} minimum={} witness_family={} witness_lengths={:?} witness_root={} polynomial={:?} deletion={:?}",
        b2_three_trees,
        b2_three_star.trees,
        b2_three_chain.trees,
        b2_three_roots,
        minimum,
        family,
        witness.witness_lengths,
        witness.witness_root,
        witness.witness_polynomial,
        witness.witness_deleted,
    );
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let first = args.get(1).and_then(|value| value.parse().ok()).unwrap_or(23);
    let last = args.get(2).and_then(|value| value.parse().ok()).unwrap_or(38);
    for order in first..=last {
        verify_order(order);
    }
    println!("PASS_EXACT_RANK7_ROOTED_CROSS_B2_2_3_ORDERS_{first}_THROUGH_{last}");
}
