// Exact finite certificate for the remaining rooted rank-6 base orders.
//
// This implements the Wright-Richmond-Odlyzko-McKay free-tree
// generator (the same level-sequence algorithm used by NetworkX) and
// checks every root using rerooted independence-polynomial messages.

#[derive(Clone, Copy, Debug)]
struct State {
    excluded: [i128; 6],
    included: [i128; 6],
}

fn zero() -> [i128; 6] {
    [0; 6]
}

fn one() -> [i128; 6] {
    let mut out = zero();
    out[0] = 1;
    out
}

fn x() -> [i128; 6] {
    let mut out = zero();
    out[1] = 1;
    out
}

fn add(left: [i128; 6], right: [i128; 6]) -> [i128; 6] {
    let mut out = zero();
    for rank in 0..=5 {
        out[rank] = left[rank] + right[rank];
    }
    out
}

fn multiply(left: [i128; 6], right: [i128; 6]) -> [i128; 6] {
    let mut out = zero();
    for first in 0..=5 {
        for second in 0..=(5 - first) {
            out[first + second] += left[first] * right[second];
        }
    }
    out
}

fn split_tree(layout: &[usize]) -> (Vec<usize>, Vec<usize>) {
    let mut one_found = false;
    let mut split = layout.len();
    for (index, level) in layout.iter().enumerate() {
        if *level == 1 {
            if one_found {
                split = index;
                break;
            }
            one_found = true;
        }
    }
    let left = layout[1..split]
        .iter()
        .map(|level| level - 1)
        .collect();
    let mut rest = vec![0];
    rest.extend_from_slice(&layout[split..]);
    (left, rest)
}

fn next_rooted_tree_clean(
    predecessor: &[usize],
    specified_p: Option<usize>,
) -> Option<Vec<usize>> {
    let p = match specified_p {
        Some(value) => value,
        None => {
            let mut value = predecessor.len() - 1;
            while predecessor[value] == 1 {
                value -= 1;
            }
            value
        }
    };
    if p == 0 {
        return None;
    }
    let mut q = p - 1;
    while predecessor[q] != predecessor[p] - 1 {
        q -= 1;
    }
    let mut result = predecessor.to_vec();
    for index in p..result.len() {
        result[index] = result[index - p + q];
    }
    Some(result)
}

fn next_tree(candidate: &[usize]) -> Option<Vec<usize>> {
    let (left, rest) = split_tree(candidate);
    let left_height = *left.iter().max().unwrap();
    let rest_height = *rest.iter().max().unwrap();
    let mut valid = rest_height >= left_height;
    if valid && rest_height == left_height {
        if left.len() > rest.len() {
            valid = false;
        } else if left.len() == rest.len() && left > rest {
            valid = false;
        }
    }
    if valid {
        return Some(candidate.to_vec());
    }

    let p = left.len();
    let mut new_candidate = next_rooted_tree_clean(candidate, Some(p))?;
    if candidate[p] > 2 {
        let (new_left, _) = split_tree(&new_candidate);
        let new_left_height = *new_left.iter().max().unwrap();
        let suffix_length = new_left_height + 1;
        let start = new_candidate.len() - suffix_length;
        for offset in 0..suffix_length {
            new_candidate[start + offset] = offset + 1;
        }
    }
    Some(new_candidate)
}

fn layout_to_adjacency(layout: &[usize]) -> Vec<Vec<usize>> {
    let order = layout.len();
    let mut adjacency = vec![Vec::new(); order];
    let mut stack: Vec<usize> = Vec::new();
    for index in 0..order {
        let level = layout[index];
        if let Some(&last) = stack.last() {
            let mut parent = last;
            while layout[parent] >= level {
                stack.pop();
                parent = *stack.last().unwrap();
            }
            adjacency[index].push(parent);
            adjacency[parent].push(index);
        }
        stack.push(index);
    }
    adjacency
}

fn directed_state(
    vertex: usize,
    parent: usize,
    adjacency: &[Vec<usize>],
    memo: &mut [Option<State>],
) -> State {
    let order = adjacency.len();
    let key = vertex * order + parent;
    if let Some(value) = memo[key] {
        return value;
    }
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[vertex] {
        if neighbor == parent {
            continue;
        }
        let child = directed_state(neighbor, vertex, adjacency, memo);
        excluded = multiply(
            excluded,
            add(child.excluded, child.included),
        );
        included = multiply(included, child.excluded);
    }
    let value = State {
        excluded,
        included,
    };
    memo[key] = Some(value);
    value
}

fn root_state(
    root: usize,
    adjacency: &[Vec<usize>],
    memo: &mut [Option<State>],
) -> State {
    let mut excluded = one();
    let mut included = x();
    for &neighbor in &adjacency[root] {
        let child = directed_state(neighbor, root, adjacency, memo);
        excluded = multiply(
            excluded,
            add(child.excluded, child.included),
        );
        included = multiply(included, child.excluded);
    }
    State {
        excluded,
        included,
    }
}

fn strong(whole: [i128; 6], deleted: [i128; 6]) -> i128 {
    let i4 = whole[4];
    let i5 = whole[5];
    let h4 = deleted[4];
    let h5 = deleted[5];
    i4 * (2 * i5 + i4) - 24 * (i5 * h4 - i4 * h5)
}

fn verify_order(order: usize, expected_trees: u64) {
    let mut layout: Option<Vec<usize>> = Some(
        (0..=(order / 2))
            .chain(1..((order + 1) / 2))
            .collect(),
    );
    let mut tree_count: u64 = 0;
    let mut rooted_count: u64 = 0;
    let mut minimum: Option<i128> = None;
    let mut witness_layout = Vec::new();
    let mut witness_root = 0usize;
    let mut witness_whole = zero();
    let mut witness_deleted = zero();

    while let Some(candidate) = layout {
        layout = next_tree(&candidate);
        if let Some(valid_layout) = layout.clone() {
            let adjacency = layout_to_adjacency(&valid_layout);
            let mut memo = vec![None; order * order];
            let first_state = root_state(0, &adjacency, &mut memo);
            let whole = add(first_state.excluded, first_state.included);

            tree_count += 1;
            for root in 0..order {
                let state = root_state(root, &adjacency, &mut memo);
                let value = strong(whole, state.excluded);
                rooted_count += 1;
                if minimum.is_none() || value < minimum.unwrap() {
                    minimum = Some(value);
                    witness_layout = valid_layout.clone();
                    witness_root = root;
                    witness_whole = whole;
                    witness_deleted = state.excluded;
                }
                assert!(
                    value >= 0,
                    "negative order={} layout={:?} root={} value={}",
                    order,
                    valid_layout,
                    root,
                    value
                );
            }
            layout = next_rooted_tree_clean(&valid_layout, None);
        }
    }

    assert_eq!(tree_count, expected_trees);
    assert_eq!(rooted_count, expected_trees * order as u64);
    println!(
        "order {}: trees={} rooted={} minimum={} layout={:?} root={} \
         whole={:?} deleted={:?}",
        order,
        tree_count,
        rooted_count,
        minimum.unwrap(),
        witness_layout,
        witness_root,
        witness_whole,
        witness_deleted
    );
}

fn main() {
    // OEIS A000055 / the WROM generator's exact expected counts.
    verify_order(18, 123_867);
    verify_order(19, 317_955);
    verify_order(20, 823_065);
    verify_order(21, 2_144_505);
    println!(
        "strong rank-6 inequality at every root, orders 18--21: CERTIFIED"
    );
}
