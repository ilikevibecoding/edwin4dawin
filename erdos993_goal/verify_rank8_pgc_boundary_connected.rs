// Exact low-memory WROM verifier for the connected part of the rank-eight
// pendant boundary alpha(P)=13,14.
//
// For every free tree P of a requested order and every distinct support of a
// pendant leaf, form B=P-{leaf,support}.  All leaves at the same support give
// the same B.  The verifier checks the literal integer numerator
//
//   8*b6*Q8(P) + 24*c7*p7*b6 + V8(B)*p7,
//
// where c7=p8-b7-b8.  Arithmetic is exact.  The WROM free-tree stream is
// asserted against the classical counts.  This is intentionally streaming:
// it does not retain trees or polynomials in memory.

use std::env;

const MAX_N: usize = 28;
const DEG: usize = 10; // coefficients i_0,...,i_9

const TREE_COUNTS: [u64; MAX_N + 1] = [
    0,
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
    7741, 19320, 48629, 123867, 317955, 823065, 2144505, 5623756,
    14828074, 39299897, 104636890, 279793450, 751065460, 2023443032,
];

#[derive(Clone, Copy)]
struct State {
    excluded: [u64; DEG],
    included: [u64; DEG],
    alpha_excluded: usize,
    alpha_included: usize,
}

fn one() -> [u64; DEG] {
    let mut out = [0u64; DEG];
    out[0] = 1;
    out
}

fn x() -> [u64; DEG] {
    let mut out = [0u64; DEG];
    out[1] = 1;
    out
}

fn add(left: [u64; DEG], right: [u64; DEG]) -> [u64; DEG] {
    let mut out = [0u64; DEG];
    for rank in 0..DEG {
        out[rank] = left[rank] + right[rank];
    }
    out
}

fn multiply(left: [u64; DEG], right: [u64; DEG]) -> [u64; DEG] {
    let mut out = [0u64; DEG];
    for first in 0..DEG {
        if left[first] == 0 { continue; }
        for second in 0..(DEG-first) {
            if right[second] == 0 { continue; }
            out[first+second] += left[first] * right[second];
        }
    }
    out
}

fn rooted(vertex: usize, parent: usize, adjacency: &[Vec<usize>]) -> State {
    let mut excluded = one();
    let mut included = x();
    let mut alpha_excluded = 0usize;
    let mut alpha_included = 1usize;
    for &child in &adjacency[vertex] {
        if child == parent { continue; }
        let state = rooted(child, vertex, adjacency);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
        alpha_excluded += state.alpha_excluded.max(state.alpha_included);
        alpha_included += state.alpha_excluded;
    }
    State { excluded, included, alpha_excluded, alpha_included }
}

fn adjacency_from_layout(layout: &[u8]) -> Vec<Vec<usize>> {
    let n = layout.len();
    let mut adjacency = vec![Vec::<usize>::new(); n];
    let mut stack = [0usize; MAX_N + 1];
    stack[0] = 0;
    for vertex in 1..n {
        let depth = layout[vertex] as usize;
        assert!(depth >= 1);
        let parent = stack[depth-1];
        adjacency[parent].push(vertex);
        adjacency[vertex].push(parent);
        stack[depth] = vertex;
    }
    adjacency
}

fn full_polynomial_and_alpha(adjacency: &[Vec<usize>]) -> ([u64; DEG], usize) {
    let state = rooted(0, usize::MAX, adjacency);
    (
        add(state.excluded, state.included),
        state.alpha_excluded.max(state.alpha_included),
    )
}

fn deletion_polynomial(
    adjacency: &[Vec<usize>], leaf: usize, support: usize,
) -> ([u64; DEG], usize) {
    let mut out = one();
    let mut alpha = 0usize;
    for &neighbor in &adjacency[support] {
        if neighbor == leaf { continue; }
        let branch = rooted(neighbor, support, adjacency);
        out = multiply(out, add(branch.excluded, branch.included));
        alpha += branch.alpha_excluded.max(branch.alpha_included);
    }
    (out, alpha)
}

fn degree(poly: &[u64; DEG]) -> usize {
    (0..DEG).rev().find(|&rank| poly[rank] != 0).unwrap()
}

fn q8(poly: &[u64; DEG]) -> i128 {
    let p7 = poly[7] as i128;
    let p8 = poly[8] as i128;
    let p9 = poly[9] as i128;
    16*p8*p8 - p7*p8 - 18*p7*p9
}

fn v8(poly: &[u64; DEG]) -> i128 {
    let b6 = poly[6] as i128;
    let b7 = poly[7] as i128;
    let b8 = poly[8] as i128;
    10*b6*b7 + 136*b6*b8 - 98*b7*b7
}

fn next_rooted_fixed(
    predecessor: [u8; MAX_N], order: usize, specified_p: Option<usize>,
) -> Option<[u8; MAX_N]> {
    let p = match specified_p {
        Some(value) => value,
        None => {
            let mut value = order-1;
            while predecessor[value] == 1 { value -= 1; }
            value
        }
    };
    if p == 0 { return None; }
    let mut q = p-1;
    while predecessor[q] != predecessor[p]-1 { q -= 1; }
    let mut result = predecessor;
    for index in p..order {
        result[index] = result[index-p+q];
    }
    Some(result)
}

fn split_index_fixed(layout: &[u8; MAX_N], order: usize) -> usize {
    let mut one_found = false;
    for index in 0..order {
        if layout[index] == 1 {
            if one_found { return index; }
            one_found = true;
        }
    }
    order
}

fn left_le_rest_fixed(
    layout: &[u8; MAX_N], order: usize, split: usize,
) -> bool {
    let left_len = split-1;
    let rest_len = 1+order-split;
    if left_len != rest_len { return left_len < rest_len; }
    for offset in 0..left_len {
        let left = layout[1+offset]-1;
        let rest = if offset == 0 { 0 } else { layout[split+offset-1] };
        if left != rest { return left < rest; }
    }
    true
}

fn next_tree_fixed(
    candidate: [u8; MAX_N], order: usize,
) -> Option<[u8; MAX_N]> {
    let split = split_index_fixed(&candidate, order);
    let left_height = candidate[1..split].iter().copied().max().unwrap()-1;
    let rest_height = candidate[split..order].iter().copied().max().unwrap_or(0);
    let valid = rest_height > left_height
        || (rest_height == left_height
            && left_le_rest_fixed(&candidate, order, split));
    if valid { return Some(candidate); }
    let p = split-1;
    let mut out = next_rooted_fixed(candidate, order, Some(p))?;
    if candidate[p] > 2 {
        let new_split = split_index_fixed(&out, order);
        let new_left_height = out[1..new_split].iter().copied().max().unwrap()-1;
        let suffix_length = new_left_height as usize+1;
        let start = order-suffix_length;
        for offset in 0..suffix_length {
            out[start+offset] = (offset+1) as u8;
        }
    }
    Some(out)
}

#[derive(Clone)]
struct Summary {
    order: usize,
    total_trees: u64,
    processed_trees: u64,
    eligible_trees_13: u64,
    eligible_trees_14: u64,
    support_states_13: u64,
    support_states_14: u64,
    q_negative: u64,
    v_negative: u64,
    v_negative_13: u64,
    v_negative_14: u64,
    coupled_negative: u64,
    minimum_num: Option<i128>,
    minimum_den: i128,
    minimum_alpha: usize,
    minimum_full: [u64; DEG],
    minimum_reduced: [u64; DEG],
    minimum_v: Option<i128>,
    minimum_v_num: Option<i128>,
    minimum_v_den: i128,
    minimum_v_alpha: usize,
    minimum_v_full: [u64; DEG],
    minimum_v_reduced: [u64; DEG],
}

impl Summary {
    fn new(order: usize) -> Summary {
        Summary {
            order, total_trees: 0, processed_trees: 0,
            eligible_trees_13: 0, eligible_trees_14: 0,
            support_states_13: 0, support_states_14: 0,
            q_negative: 0, v_negative: 0, v_negative_13: 0,
            v_negative_14: 0, coupled_negative: 0,
            minimum_num: None, minimum_den: 1, minimum_alpha: 0,
            minimum_full: [0; DEG], minimum_reduced: [0; DEG],
            minimum_v: None, minimum_v_num: None, minimum_v_den: 1,
            minimum_v_alpha: 0, minimum_v_full: [0; DEG],
            minimum_v_reduced: [0; DEG],
        }
    }

    fn update_v_negative_minimum(
        &mut self, value_v: i128, numerator: i128, denominator: i128,
        alpha: usize, full: [u64; DEG], reduced: [u64; DEG],
    ) {
        if self.minimum_v.is_none() || value_v < self.minimum_v.unwrap() {
            self.minimum_v = Some(value_v);
        }
        if self.minimum_v_num.is_none()
            || numerator*self.minimum_v_den
                < self.minimum_v_num.unwrap()*denominator
        {
            self.minimum_v_num = Some(numerator);
            self.minimum_v_den = denominator;
            self.minimum_v_alpha = alpha;
            self.minimum_v_full = full;
            self.minimum_v_reduced = reduced;
        }
    }

    fn update_minimum(
        &mut self, numerator: i128, denominator: i128, alpha: usize,
        full: [u64; DEG], reduced: [u64; DEG],
    ) {
        if self.minimum_num.is_none()
            || numerator*self.minimum_den < self.minimum_num.unwrap()*denominator
        {
            self.minimum_num = Some(numerator);
            self.minimum_den = denominator;
            self.minimum_alpha = alpha;
            self.minimum_full = full;
            self.minimum_reduced = reduced;
        }
    }
}

fn verify_order(order: usize, shard_index: u64, shard_count: u64) -> Summary {
    assert!((2..=MAX_N).contains(&order));
    assert!(shard_count >= 1 && shard_index < shard_count);
    let mut summary = Summary::new(order);
    let mut initial = [0u8; MAX_N];
    for (index, level) in (0..=(order/2)).chain(1..((order+1)/2)).enumerate() {
        initial[index] = level as u8;
    }
    let mut layout: Option<[u8; MAX_N]> = Some(initial);
    let mut accepted_index = 0u64;
    while let Some(candidate) = layout {
        layout = next_tree_fixed(candidate, order);
        if let Some(valid) = layout {
            let tree_index = accepted_index;
            accepted_index += 1;
            if tree_index % shard_count == shard_index {
                summary.processed_trees += 1;
                let adjacency = adjacency_from_layout(&valid[..order]);
                let (full, alpha) = full_polynomial_and_alpha(&adjacency);
                if alpha == 13 || alpha == 14 {
                    if alpha == 13 { summary.eligible_trees_13 += 1; }
                    else { summary.eligible_trees_14 += 1; }
                    assert_eq!(degree(&full), alpha.min(DEG-1));
                    let value_q = q8(&full);
                    // All leaves at a common support have the same deletion.
                    for support in 0..order {
                        let leaf = adjacency[support].iter().copied()
                            .find(|&vertex| adjacency[vertex].len() == 1);
                        if leaf.is_none() { continue; }
                        let (reduced, reduced_alpha) =
                            deletion_polynomial(&adjacency, leaf.unwrap(), support);
                        assert_eq!(reduced_alpha, alpha-1);
                        let value_v = v8(&reduced);
                        let p7 = full[7] as i128;
                        let b6 = reduced[6] as i128;
                        let c7 = full[8] as i128-reduced[7] as i128-reduced[8] as i128;
                        assert!(p7 > 0 && b6 > 0 && c7 >= 0);
                        let numerator = 8*b6*value_q
                            + 24*c7*p7*b6 + value_v*p7;
                        let denominator = 2*p7*b6;
                        if alpha == 13 { summary.support_states_13 += 1; }
                        else { summary.support_states_14 += 1; }
                        summary.q_negative += (value_q < 0) as u64;
                        summary.v_negative += (value_v < 0) as u64;
                        if value_v < 0 {
                            if alpha == 13 { summary.v_negative_13 += 1; }
                            else { summary.v_negative_14 += 1; }
                            summary.update_v_negative_minimum(
                                value_v, numerator, denominator, alpha,
                                full, reduced,
                            );
                        }
                        summary.coupled_negative += (numerator < 0) as u64;
                        assert!(numerator >= 0,
                            "negative coupled boundary order={} alpha={} numerator={} full={:?} reduced={:?}",
                            order, alpha, numerator, full, reduced);
                        summary.update_minimum(
                            numerator, denominator, alpha, full, reduced,
                        );
                    }
                }
            }
            layout = next_rooted_fixed(valid, order, None);
        }
    }
    assert_eq!(accepted_index, TREE_COUNTS[order]);
    summary.total_trees = accepted_index;
    summary
}

fn array_text(values: &[u64; DEG]) -> String {
    values.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(",")
}

#[cfg(not(rank8_boundary_library))]
fn main() {
    let arguments: Vec<String> = env::args().collect();
    let mut start = 19usize;
    let mut end = 22usize;
    let mut shard_index = 0u64;
    let mut shard_count = 1u64;
    let mut index = 1usize;
    while index < arguments.len() {
        match arguments[index].as_str() {
            "--start" => { index += 1; start = arguments[index].parse().unwrap(); }
            "--end" => { index += 1; end = arguments[index].parse().unwrap(); }
            "--target" => {
                index += 1;
                start = arguments[index].parse().unwrap();
                end = start;
            }
            "--shard-index" => { index += 1; shard_index = arguments[index].parse().unwrap(); }
            "--shard-count" => { index += 1; shard_count = arguments[index].parse().unwrap(); }
            other => panic!("unknown argument {}", other),
        }
        index += 1;
    }
    assert!(start <= end && end <= MAX_N);
    println!(
        "CONFIG start={} end={} shard_index={} shard_count={}",
        start, end, shard_index, shard_count,
    );
    let mut all_negative = 0u64;
    for order in start..=end {
        let s = verify_order(order, shard_index, shard_count);
        all_negative += s.coupled_negative;
        let min_num = s.minimum_num.unwrap_or(0);
        println!(
            "ORDER order={} total_trees={} processed_trees={} eligible13={} eligible14={} states13={} states14={} q_negative={} v_negative={} v_negative13={} v_negative14={} coupled_negative={} min_num={} min_den={} min_alpha={} full={} reduced={} min_v={} min_v_margin_num={} min_v_margin_den={} min_v_alpha={} min_v_full={} min_v_reduced={}",
            s.order, s.total_trees, s.processed_trees,
            s.eligible_trees_13, s.eligible_trees_14,
            s.support_states_13, s.support_states_14,
            s.q_negative, s.v_negative, s.v_negative_13, s.v_negative_14,
            s.coupled_negative,
            min_num, s.minimum_den, s.minimum_alpha,
            array_text(&s.minimum_full), array_text(&s.minimum_reduced),
            s.minimum_v.unwrap_or(0), s.minimum_v_num.unwrap_or(0),
            s.minimum_v_den, s.minimum_v_alpha,
            array_text(&s.minimum_v_full), array_text(&s.minimum_v_reduced),
        );
    }
    assert_eq!(all_negative, 0);
    println!(
        "PASS_EXACT_RANK8_PGC_CONNECTED_BOUNDARY_ORDERS_{}_{}_SHARD_{}_OF_{}",
        start, end, shard_index, shard_count,
    );
}
