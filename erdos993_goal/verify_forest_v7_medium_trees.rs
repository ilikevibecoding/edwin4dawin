// Exact exhaustive V7 census for every free tree of orders 21--24.
// Uses the WROM canonical level-sequence successor generator.

#[derive(Clone, Copy, Debug)]
struct State {
    excluded: [i128; 8],
    included: [i128; 8],
}

#[derive(Clone, Debug)]
struct Item {
    polynomial: [i128; 8],
    order: usize,
    alpha: usize,
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
    for first in 0..8 {
        for second in 0..(8-first) {
            out[first+second] += left[first] * right[second];
        }
    }
    out
}

fn split_tree(layout: &[usize]) -> (Vec<usize>, Vec<usize>) {
    let mut one_found = false;
    let mut split = layout.len();
    for (index, level) in layout.iter().enumerate() {
        if *level == 1 {
            if one_found { split = index; break; }
            one_found = true;
        }
    }
    let left = layout[1..split].iter().map(|level| level-1).collect();
    let mut rest = vec![0];
    rest.extend_from_slice(&layout[split..]);
    (left, rest)
}

fn next_rooted_tree_clean(predecessor: &[usize], specified_p: Option<usize>) -> Option<Vec<usize>> {
    let p = match specified_p {
        Some(value) => value,
        None => {
            let mut value = predecessor.len()-1;
            while predecessor[value] == 1 { value -= 1; }
            value
        }
    };
    if p == 0 { return None; }
    let mut q = p-1;
    while predecessor[q] != predecessor[p]-1 { q -= 1; }
    let mut result = predecessor.to_vec();
    for index in p..result.len() {
        result[index] = result[index-p+q];
    }
    Some(result)
}

fn next_tree(candidate: &[usize]) -> Option<Vec<usize>> {
    let (left, rest) = split_tree(candidate);
    let left_height = *left.iter().max().unwrap();
    let rest_height = *rest.iter().max().unwrap();
    let mut valid = rest_height >= left_height;
    if valid && rest_height == left_height {
        if left.len() > rest.len() || (left.len() == rest.len() && left > rest) {
            valid = false;
        }
    }
    if valid { return Some(candidate.to_vec()); }
    let p = left.len();
    let mut new_candidate = next_rooted_tree_clean(candidate, Some(p))?;
    if candidate[p] > 2 {
        let (new_left, _) = split_tree(&new_candidate);
        let suffix_length = new_left.iter().max().unwrap()+1;
        let start = new_candidate.len()-suffix_length;
        for offset in 0..suffix_length { new_candidate[start+offset] = offset+1; }
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

fn rooted(vertex: usize, parent: usize, adjacency: &[Vec<usize>]) -> State {
    let mut excluded = one();
    let mut included = x();
    for &child in &adjacency[vertex] {
        if child == parent { continue; }
        let state = rooted(child, vertex, adjacency);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
    }
    State { excluded, included }
}

fn independence_number(vertex: usize, parent: usize, adjacency: &[Vec<usize>]) -> (usize, usize) {
    let mut excluded = 0usize;
    let mut included = 1usize;
    for &child in &adjacency[vertex] {
        if child == parent { continue; }
        let (child_excluded, child_included) = independence_number(child, vertex, adjacency);
        excluded += child_excluded.max(child_included);
        included += child_excluded;
    }
    (excluded, included)
}

fn item_from_layout(layout: &[usize]) -> Item {
    let adjacency = layout_to_adjacency(layout);
    let state = rooted(0, usize::MAX, &adjacency);
    let (alpha_excluded, alpha_included) = independence_number(0, usize::MAX, &adjacency);
    Item {
        polynomial: add(state.excluded, state.included),
        order: layout.len(),
        alpha: alpha_excluded.max(alpha_included),
    }
}

fn v7(polynomial: [i128; 8]) -> i128 {
    9*polynomial[5]*polynomial[6]
        + 105*polynomial[5]*polynomial[7]
        - 72*polynomial[6]*polynomial[6]
}

fn verify_order(
    order: usize,
    expected_trees: u64,
    expected_eligible: u64,
    expected_eligible_minimum: i128,
) {
    let mut layout: Option<Vec<usize>> = Some(
        (0..=(order/2)).chain(1..((order+1)/2)).collect(),
    );
    let mut tree_count: u64 = 0;
    let mut minimum: Option<i128> = None;
    let mut witness_layout = Vec::new();
    let mut witness = [0; 8];
    let mut alpha_at_least_12 = 0u64;
    let mut eligible_minimum: Option<i128> = None;
    let mut eligible_witness_layout = Vec::new();
    let mut eligible_witness = [0; 8];

    while let Some(candidate) = layout {
        layout = next_tree(&candidate);
        if let Some(valid_layout) = layout.clone() {
            let item = item_from_layout(&valid_layout);
            let whole = item.polynomial;
            let value = v7(whole);

            // Every tree of order at least 23 has alpha>=12.  At orders
            // 21,22 we avoid a separate alpha recursion: the complete
            // census value is asserted positive for every tree, which is
            // stronger than the required alpha-restricted statement.
            if item.alpha >= 12 {
                alpha_at_least_12 += 1;
                if eligible_minimum.is_none() || value < eligible_minimum.unwrap() {
                    eligible_minimum = Some(value);
                    eligible_witness_layout = valid_layout.clone();
                    eligible_witness = whole;
                }
            }
            assert!(value >= 0,
                "negative order={} layout={:?} value={} polynomial={:?}",
                order, valid_layout, value, whole);
            if minimum.is_none() || value < minimum.unwrap() {
                minimum = Some(value);
                witness_layout = valid_layout.clone();
                witness = whole;
            }
            tree_count += 1;
            layout = next_rooted_tree_clean(&valid_layout, None);
        }
    }

    assert_eq!(tree_count, expected_trees);
    assert_eq!(alpha_at_least_12, expected_eligible);
    assert_eq!(eligible_minimum.unwrap(), expected_eligible_minimum);
    println!(
        "order {}: trees={} minimum={} layout={:?} polynomial={:?} automatic_alpha12={}",
        order, tree_count, minimum.unwrap(), witness_layout, witness,
        alpha_at_least_12,
    );
    println!(
        "order {} required alpha>=12: eligible={} minimum={} layout={:?} polynomial={:?}",
        order, alpha_at_least_12, eligible_minimum.unwrap(),
        eligible_witness_layout, eligible_witness,
    );
}

fn enumerate_tree_items(order: usize, expected_trees: u64) -> Vec<Item> {
    if order == 1 {
        assert_eq!(expected_trees, 1);
        return vec![Item { polynomial: [1,1,0,0,0,0,0,0], order: 1, alpha: 1 }];
    }
    let mut layout: Option<Vec<usize>> = Some(
        (0..=(order/2)).chain(1..((order+1)/2)).collect(),
    );
    let mut items = Vec::new();
    while let Some(candidate) = layout {
        layout = next_tree(&candidate);
        if let Some(valid_layout) = layout.clone() {
            items.push(item_from_layout(&valid_layout));
            layout = next_rooted_tree_clean(&valid_layout, None);
        }
    }
    assert_eq!(items.len() as u64, expected_trees);
    items
}

fn for_each_tree_item<F: FnMut(Item)>(order: usize, expected_trees: u64, mut visit: F) {
    if order == 1 {
        assert_eq!(expected_trees, 1);
        visit(Item { polynomial: [1,1,0,0,0,0,0,0], order: 1, alpha: 1 });
        return;
    }
    let mut layout: Option<Vec<usize>> = Some(
        (0..=(order/2)).chain(1..((order+1)/2)).collect(),
    );
    let mut count = 0u64;
    while let Some(candidate) = layout {
        layout = next_tree(&candidate);
        if let Some(valid_layout) = layout.clone() {
            visit(item_from_layout(&valid_layout));
            count += 1;
            layout = next_rooted_tree_clean(&valid_layout, None);
        }
    }
    assert_eq!(count, expected_trees);
}

fn combine(left: &Item, right: &Item) -> Item {
    Item {
        polynomial: multiply(left.polynomial, right.polynomial),
        order: left.order + right.order,
        alpha: left.alpha + right.alpha,
    }
}

fn build_small_forests(
    components: &[Item],
    start: usize,
    current: &Item,
    maximum_order: usize,
    lists: &mut [Vec<Item>],
) {
    for index in start..components.len() {
        let component = &components[index];
        let next_order = current.order + component.order;
        if next_order > maximum_order { break; }
        let next = combine(current, component);
        lists[next_order].push(next.clone());
        build_small_forests(components, index, &next, maximum_order, lists);
    }
}

fn audit_all_small_forests(
    components: &[Item],
    start: usize,
    current: &Item,
    counts: &mut [u64; 25],
    eligible: &mut [u64; 25],
    minima: &mut [Option<i128>; 25],
) {
    for index in start..components.len() {
        let component = &components[index];
        let next_order = current.order + component.order;
        if next_order > 24 { break; }
        let next = combine(current, component);
        if next_order >= 21 {
            counts[next_order] += 1;
            if next.alpha >= 12 {
                eligible[next_order] += 1;
                let value = v7(next.polynomial);
                assert!(value >= 0,
                    "negative all-small forest order={} alpha={} value={} polynomial={:?}",
                    next_order, next.alpha, value, next.polynomial);
                if minima[next_order].is_none() || value < minima[next_order].unwrap() {
                    minima[next_order] = Some(value);
                }
            }
        }
        audit_all_small_forests(components, index, &next, counts, eligible, minima);
    }
}

fn verify_disconnected_forests() {
    let expected: [u64; 24] = [
        1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,
        48629,123867,317955,823065,2144505,5623756,14828074,39299897,
    ];
    let mut small_components = Vec::new();
    for order in 1..=12 {
        small_components.extend(enumerate_tree_items(order, expected[order-1]));
    }
    small_components.sort_by_key(|item| item.order);
    assert_eq!(small_components.len(), 987);

    let identity = Item { polynomial: [1,0,0,0,0,0,0,0], order: 0, alpha: 0 };
    let mut small_forests: Vec<Vec<Item>> = (0..=11).map(|_| Vec::new()).collect();
    small_forests[0].push(identity.clone());
    build_small_forests(&small_components, 0, &identity, 11, &mut small_forests);

    let mut all_small_counts = [0u64; 25];
    let mut all_small_eligible = [0u64; 25];
    let mut all_small_minima = [None; 25];
    audit_all_small_forests(
        &small_components, 0, &identity,
        &mut all_small_counts, &mut all_small_eligible, &mut all_small_minima,
    );

    let mut large_counts = [0u64; 25];
    let mut large_eligible = [0u64; 25];
    let mut large_minima = [None; 25];
    for tree_order in 13..=23 {
        for_each_tree_item(tree_order, expected[tree_order-1], |tree| {
            for total_order in 21..=24 {
                if total_order <= tree_order { continue; }
                let remainder = total_order-tree_order;
                if remainder > 11 { continue; }
                for rest in &small_forests[remainder] {
                    let forest = combine(&tree, rest);
                    large_counts[total_order] += 1;
                    if forest.alpha < 12 { continue; }
                    large_eligible[total_order] += 1;
                    let value = v7(forest.polynomial);
                    assert!(value >= 0,
                        "negative large-component forest order={} alpha={} value={} polynomial={:?}",
                        total_order, forest.alpha, value, forest.polynomial);
                    if large_minima[total_order].is_none() || value < large_minima[total_order].unwrap() {
                        large_minima[total_order] = Some(value);
                    }
                }
            }
        });
    }

    for order in 21..=24 {
        let minimum = match (all_small_minima[order], large_minima[order]) {
            (Some(a), Some(b)) => a.min(b),
            (Some(a), None) => a,
            (None, Some(b)) => b,
            (None, None) => panic!("no eligible forests at order {}", order),
        };
        println!(
            "disconnected order {}: all_small={} all_small_eligible={} large_component={} large_eligible={} minimum={}",
            order, all_small_counts[order], all_small_eligible[order],
            large_counts[order], large_eligible[order], minimum,
        );
        let expected = match order {
            21 => (2_942_133u64, 2_862_162u64, 203_613_771i128),
            22 => (7_560_400, 7_535_727, 509_518_680),
            23 => (19_574_858, 19_574_858, 1_355_764_956),
            24 => (51_028_777, 51_028_777, 3_644_347_392),
            _ => unreachable!(),
        };
        assert_eq!(all_small_counts[order] + large_counts[order], expected.0);
        assert_eq!(all_small_eligible[order] + large_eligible[order], expected.1);
        assert_eq!(minimum, expected.2);
    }
}

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    let disconnected_only = arguments.iter().any(|value| value == "--disconnected-only");
    let trees_only = arguments.iter().any(|value| value == "--trees-only");
    if !disconnected_only {
        verify_order(21, 2_144_505, 2_007_623, 139_197_240);
        verify_order(22, 5_623_756, 5_569_192, 343_390_824);
        verify_order(23, 14_828_074, 14_828_074, 874_809_936);
        verify_order(24, 39_299_897, 39_299_897, 2_590_346_304);
        println!("V7 on every tree, orders 21--24: CERTIFIED");
    }
    if !trees_only {
        verify_disconnected_forests();
        println!("V7 on every alpha>=12 forest, orders 21--24: CERTIFIED");
    }
}
