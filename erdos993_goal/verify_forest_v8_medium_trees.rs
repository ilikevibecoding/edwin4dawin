// Exact exhaustive V8 census for forests of orders 21--29 with alpha>=14.
// Reuse the already-audited WROM generator and exact polynomial routines from
// the V7 verifier inside one private module; the checks below are rank-eight.

mod engine {
    include!("verify_forest_v7_medium_trees.rs");

    // V8 needs i8, so use a separate nine-coefficient state.  The WROM tree
    // layouts and alpha recursion above remain unchanged.  u32 is exact here:
    // for every state used below the underlying graph has at most 29 vertices,
    // and every coefficient through i8 is at most C(29,8)=4,292,145.  All
    // addends/products in add9 and multiply9 count disjoint subfamilies of the
    // final independent sets, so every nonnegative partial sum has the same
    // bound.  The signed V8 products themselves are evaluated in i128.
    #[derive(Clone, Copy)]
    struct State9 {
        excluded: [u32; 9],
        included: [u32; 9],
    }

    #[derive(Clone)]
    struct Item9 {
        polynomial: [u32; 9],
        order: usize,
        alpha: usize,
    }

    fn one9() -> [u32; 9] {
        let mut out = [0; 9];
        out[0] = 1;
        out
    }

    fn x9() -> [u32; 9] {
        let mut out = [0; 9];
        out[1] = 1;
        out
    }

    fn add9(left: [u32; 9], right: [u32; 9]) -> [u32; 9] {
        let mut out = [0; 9];
        for rank in 0..9 { out[rank] = left[rank] + right[rank]; }
        out
    }

    fn multiply9(left: [u32; 9], right: [u32; 9]) -> [u32; 9] {
        let mut out = [0; 9];
        for first in 0..9 {
            if left[first] == 0 { continue; }
            for second in 0..(9-first) {
                if right[second] == 0 { continue; }
                out[first+second] += left[first] * right[second];
            }
        }
        out
    }

    fn rooted9(vertex: usize, parent: usize, adjacency: &[Vec<usize>]) -> State9 {
        let mut excluded = one9();
        let mut included = x9();
        for &child in &adjacency[vertex] {
            if child == parent { continue; }
            let state = rooted9(child, vertex, adjacency);
            excluded = multiply9(excluded, add9(state.excluded, state.included));
            included = multiply9(included, state.excluded);
        }
        State9 { excluded, included }
    }

    fn item9_from_layout(layout: &[u8]) -> Item9 {
        // The level sequence is preorder.  Accumulate every completed child
        // directly into its parent while traversing in reverse.  This avoids
        // one heap allocation per adjacency list and is important for the
        // billion-row high-band replay.
        assert!(layout.len() <= 32);
        let mut parent = [usize::MAX; 32];
        let mut stack = [0usize; 32];
        let mut depth = 0usize;
        for index in 0..layout.len() {
            while depth > 0 && layout[stack[depth-1]] >= layout[index] {
                depth -= 1;
            }
            if depth > 0 { parent[index] = stack[depth-1]; }
            stack[depth] = index;
            depth += 1;
        }
        let blank = State9 { excluded: one9(), included: x9() };
        let mut states = [blank; 32];
        let mut ae = [0usize; 32];
        let mut ai = [1usize; 32];
        for index in (1..layout.len()).rev() {
            let p = parent[index];
            states[p].excluded = multiply9(
                states[p].excluded,
                add9(states[index].excluded, states[index].included),
            );
            states[p].included = multiply9(
                states[p].included, states[index].excluded,
            );
            ae[p] += ae[index].max(ai[index]);
            ai[p] += ae[index];
        }
        Item9 {
            polynomial: add9(states[0].excluded, states[0].included),
            order: layout.len(),
            alpha: ae[0].max(ai[0]),
        }
    }

    fn value8(p: [u32; 9]) -> i128 {
        let p6 = p[6] as i128;
        let p7 = p[7] as i128;
        let p8 = p[8] as i128;
        10*p6*p7 + 136*p6*p8 - 98*p7*p7
    }

    fn combine9(left: &Item9, right: &Item9) -> Item9 {
        Item9 {
            polynomial: multiply9(left.polynomial, right.polynomial),
            order: left.order + right.order,
            alpha: left.alpha + right.alpha,
        }
    }

    fn next_rooted_fixed(
        predecessor: [u8; 32], order: usize, specified_p: Option<usize>,
    ) -> Option<[u8; 32]> {
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

    fn split_index_fixed(layout: &[u8; 32], order: usize) -> usize {
        let mut one_found = false;
        for index in 0..order {
            if layout[index] == 1 {
                if one_found { return index; }
                one_found = true;
            }
        }
        order
    }

    fn left_le_rest_fixed(layout: &[u8; 32], order: usize, split: usize) -> bool {
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

    fn next_tree_fixed(candidate: [u8; 32], order: usize) -> Option<[u8; 32]> {
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
            for offset in 0..suffix_length { out[start+offset] = (offset+1) as u8; }
        }
        Some(out)
    }

    fn for_each_tree9<F: FnMut(Item9)>(order: usize, expected: u64, mut visit: F) {
        if order == 1 {
            assert_eq!(expected, 1);
            visit(Item9 { polynomial: [1,1,0,0,0,0,0,0,0], order: 1, alpha: 1 });
            return;
        }
        let mut initial = [0u8; 32];
        for (index, level) in (0..=(order/2)).chain(1..((order+1)/2)).enumerate() {
            initial[index] = level as u8;
        }
        let mut layout: Option<[u8; 32]> = Some(initial);
        let mut count = 0u64;
        while let Some(candidate) = layout {
            layout = next_tree_fixed(candidate, order);
            if let Some(valid) = layout {
                visit(item9_from_layout(&valid[..order]));
                count += 1;
                layout = next_rooted_fixed(valid, order, None);
            }
        }
        assert_eq!(count, expected);
    }

    fn tree_items9(order: usize, expected: u64) -> Vec<Item9> {
        let mut out = Vec::new();
        for_each_tree9(order, expected, |item| out.push(item));
        out
    }

    fn verify_tree_order(order: usize, expected: u64) -> (u64, i128, [u32; 9]) {
        let mut eligible = 0u64;
        let mut minimum: Option<i128> = None;
        let mut witness = [0; 9];
        for_each_tree9(order, expected, |item| {
            if item.alpha < 14 { return; }
            eligible += 1;
            let value = value8(item.polynomial);
            assert!(value >= 0,
                "negative V8 tree order={} alpha={} value={} polynomial={:?}",
                order, item.alpha, value, item.polynomial);
            if minimum.is_none() || value < minimum.unwrap() {
                minimum = Some(value);
                witness = item.polynomial;
            }
        });
        let m = minimum.expect("eligible tree exists");
        println!("TREE order={} total={} eligible={} minimum={} polynomial={:?}",
                 order, expected, eligible, m, witness);
        (eligible, m, witness)
    }

    fn build_small_forests9(
        components: &[Item9], start: usize, current: &Item9,
        maximum_order: usize, lists: &mut [Vec<Item9>],
    ) {
        for index in start..components.len() {
            let component = &components[index];
            let next_order = current.order + component.order;
            if next_order > maximum_order { break; }
            let next = combine9(current, component);
            lists[next_order].push(next.clone());
            build_small_forests9(components, index, &next, maximum_order, lists);
        }
    }

    fn audit_all_small9(
        components: &[Item9], start: usize, current: &Item9,
        eligible: &mut [u64; 25], minima: &mut [Option<i128>; 25],
    ) {
        for index in start..components.len() {
            let component = &components[index];
            let next_order = current.order + component.order;
            if next_order > 24 { break; }
            let next = combine9(current, component);
            if next_order >= 21 && next.alpha >= 14 {
                eligible[next_order] += 1;
                let value = value8(next.polynomial);
                assert!(value >= 0,
                    "negative V8 all-small forest order={} alpha={} value={} polynomial={:?}",
                    next_order, next.alpha, value, next.polynomial);
                if minima[next_order].is_none() || value < minima[next_order].unwrap() {
                    minima[next_order] = Some(value);
                }
            }
            // Even making every remaining vertex independent cannot reach 14.
            if next.alpha + (24-next_order) >= 14 {
                audit_all_small9(components, index, &next, eligible, minima);
            }
        }
    }

    fn verify_disconnected(expected: &[u64; 24]) -> [(u64, i128); 4] {
        let mut components = Vec::new();
        for order in 1..=12 {
            components.extend(tree_items9(order, expected[order-1]));
        }
        components.sort_by_key(|item| item.order);
        assert_eq!(components.len(), 987);
        let identity = Item9 { polynomial: [1,0,0,0,0,0,0,0,0], order: 0, alpha: 0 };
        let mut small_forests: Vec<Vec<Item9>> = (0..=11).map(|_| Vec::new()).collect();
        small_forests[0].push(identity.clone());
        build_small_forests9(&components, 0, &identity, 11, &mut small_forests);

        let mut all_eligible = [0u64; 25];
        let mut all_minima = [None; 25];
        audit_all_small9(&components, 0, &identity, &mut all_eligible, &mut all_minima);

        let mut large_eligible = [0u64; 25];
        let mut large_minima = [None; 25];
        for tree_order in 13..=23 {
            for_each_tree9(tree_order, expected[tree_order-1], |tree| {
                for total in 21..=24 {
                    if total <= tree_order { continue; }
                    let remainder = total-tree_order;
                    if remainder > 11 { continue; }
                    for rest in &small_forests[remainder] {
                        let forest = combine9(&tree, rest);
                        if forest.alpha < 14 { continue; }
                        large_eligible[total] += 1;
                        let value = value8(forest.polynomial);
                        assert!(value >= 0,
                            "negative V8 large-component forest order={} alpha={} value={} polynomial={:?}",
                            total, forest.alpha, value, forest.polynomial);
                        if large_minima[total].is_none() || value < large_minima[total].unwrap() {
                            large_minima[total] = Some(value);
                        }
                    }
                }
            });
        }

        let mut out = [(0u64, 0i128); 4];
        for total in 21..=24 {
            let minimum = match (all_minima[total], large_minima[total]) {
                (Some(a), Some(b)) => a.min(b),
                (Some(a), None) => a,
                (None, Some(b)) => b,
                _ => panic!("no eligible forests at order {}", total),
            };
            let count = all_eligible[total] + large_eligible[total];
            println!("DISCONNECTED order={} eligible={} minimum={}", total, count, minimum);
            out[total-21] = (count, minimum);
        }
        out
    }

    pub fn run() {
        let expected: [u64; 24] = [
            1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,
            48629,123867,317955,823065,2144505,5623756,14828074,39299897,
        ];
        let mut tree_results = Vec::new();
        for order in 21..=24 {
            tree_results.push(verify_tree_order(order, expected[order-1]));
        }
        let disconnected = verify_disconnected(&expected);
        for order in 21..=24 {
            let t = &tree_results[order-21];
            let d = disconnected[order-21];
            println!("TOTAL order={} eligible={} minimum={}",
                     order, t.0+d.0, t.1.min(d.1));
        }
        println!("PASS_EXACT_FOREST_V8_ALPHA14_ORDERS21_24");
    }

    fn audit_all_small_target(
        components: &[Item9], start: usize, current: &Item9, target: usize,
        eligible: &mut u64, minimum: &mut Option<i128>,
    ) {
        for index in start..components.len() {
            let component = &components[index];
            let next_order = current.order + component.order;
            if next_order > target { break; }
            let next = combine9(current, component);
            if next_order == target {
                if next.alpha >= 14 {
                    *eligible += 1;
                    let value = value8(next.polynomial);
                    assert!(value >= 0,
                        "negative V8 all-small target={} alpha={} value={} polynomial={:?}",
                        target, next.alpha, value, next.polynomial);
                    if minimum.is_none() || value < minimum.unwrap() {
                        *minimum = Some(value);
                    }
                }
            } else if next.alpha + (target-next_order) >= 14 {
                audit_all_small_target(
                    components, index, &next, target, eligible, minimum,
                );
            }
        }
    }

    fn verify_high_target(target: usize) {
        let expected: [u64; 29] = [
            1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,
            48629,123867,317955,823065,2144505,5623756,14828074,39299897,
            104636890,279793450,751065460,2023443032,5469566585,
        ];
        assert!((25..=29).contains(&target));
        let tree_result = verify_tree_order(target, expected[target-1]);
        let maximum_small = target/2;
        let mut components = Vec::new();
        for order in 1..=maximum_small {
            components.extend(tree_items9(order, expected[order-1]));
        }
        components.sort_by_key(|item| item.order);
        let identity = Item9 { polynomial: [1,0,0,0,0,0,0,0,0], order: 0, alpha: 0 };
        let mut small_forests: Vec<Vec<Item9>> =
            (0..=maximum_small).map(|_| Vec::new()).collect();
        small_forests[0].push(identity.clone());
        build_small_forests9(
            &components, 0, &identity, maximum_small, &mut small_forests,
        );

        let mut all_small_eligible = 0u64;
        let mut all_small_minimum = None;
        audit_all_small_target(
            &components, 0, &identity, target,
            &mut all_small_eligible, &mut all_small_minimum,
        );
        println!("HIGH_ALL_SMALL target={} eligible={} minimum={}",
                 target, all_small_eligible, all_small_minimum.unwrap());

        let mut large_eligible = 0u64;
        let mut large_minimum: Option<i128> = None;
        for tree_order in (maximum_small+1)..target {
            let remainder = target-tree_order;
            for_each_tree9(tree_order, expected[tree_order-1], |tree| {
                for rest in &small_forests[remainder] {
                    let forest = combine9(&tree, rest);
                    if forest.alpha < 14 { continue; }
                    large_eligible += 1;
                    let value = value8(forest.polynomial);
                    assert!(value >= 0,
                        "negative V8 large target={} alpha={} value={} polynomial={:?}",
                        target, forest.alpha, value, forest.polynomial);
                    if large_minimum.is_none() || value < large_minimum.unwrap() {
                        large_minimum = Some(value);
                    }
                }
            });
        }
        let disconnected_count = all_small_eligible + large_eligible;
        let disconnected_minimum = all_small_minimum.unwrap().min(large_minimum.unwrap());
        println!("HIGH_DISCONNECTED target={} eligible={} minimum={}",
                 target, disconnected_count, disconnected_minimum);
        println!("HIGH_TOTAL target={} eligible={} minimum={}",
                 target, tree_result.0+disconnected_count,
                 tree_result.1.min(disconnected_minimum));
        println!("PASS_EXACT_FOREST_V8_ALPHA14_ORDER_{}", target);
    }

    fn high_expected() -> [u64; 29] {
        [
            1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320,
            48629,123867,317955,823065,2144505,5623756,14828074,39299897,
            104636890,279793450,751065460,2023443032,5469566585,
        ]
    }

    fn phase_small_data(target: usize, expected: &[u64; 29]) -> (Vec<Item9>, Vec<Vec<Item9>>, Item9) {
        let maximum_small = target/2;
        let mut components = Vec::new();
        for order in 1..=maximum_small {
            components.extend(tree_items9(order, expected[order-1]));
        }
        components.sort_by_key(|item| item.order);
        let identity = Item9 { polynomial: [1,0,0,0,0,0,0,0,0], order: 0, alpha: 0 };
        let mut small_forests: Vec<Vec<Item9>> =
            (0..=maximum_small).map(|_| Vec::new()).collect();
        small_forests[0].push(identity.clone());
        build_small_forests9(
            &components, 0, &identity, maximum_small, &mut small_forests,
        );
        (components, small_forests, identity)
    }

    fn run_high_phase(target: usize, phase: &str, large_order: Option<usize>) {
        let expected = high_expected();
        assert!((25..=29).contains(&target));
        if phase == "tree" {
            let result = verify_tree_order(target, expected[target-1]);
            println!("PHASE_TREE target={} eligible={} minimum={}", target, result.0, result.1);
            return;
        }
        let (components, small_forests, identity) = phase_small_data(target, &expected);
        if phase == "all-small" {
            let mut eligible = 0u64;
            let mut minimum = None;
            audit_all_small_target(
                &components, 0, &identity, target, &mut eligible, &mut minimum,
            );
            println!("PHASE_ALL_SMALL target={} eligible={} minimum={}",
                     target, eligible, minimum.unwrap());
            return;
        }
        assert_eq!(phase, "large");
        let tree_order = large_order.unwrap();
        assert!(tree_order > target/2 && tree_order < target);
        let remainder = target-tree_order;
        let mut eligible = 0u64;
        let mut minimum: Option<i128> = None;
        for_each_tree9(tree_order, expected[tree_order-1], |tree| {
            for rest in &small_forests[remainder] {
                let forest = combine9(&tree, rest);
                if forest.alpha < 14 { continue; }
                eligible += 1;
                let value = value8(forest.polynomial);
                assert!(value >= 0,
                    "negative V8 phase-large target={} tree_order={} alpha={} value={} polynomial={:?}",
                    target, tree_order, forest.alpha, value, forest.polynomial);
                if minimum.is_none() || value < minimum.unwrap() { minimum = Some(value); }
            }
        });
        println!("PHASE_LARGE target={} tree_order={} eligible={} minimum={}",
                 target, tree_order, eligible, minimum.unwrap());
    }

    // Exact embarrassingly-parallel tree partition.  Each shard independently
    // replays the cheap canonical WROM successor stream, but evaluates the
    // polynomial only for accepted-tree indices congruent to its shard index.
    // The congruence classes are disjoint and their asserted sizes sum to the
    // classical free-tree count.
    fn run_tree_shard(target: usize, shard_index: u64, shard_count: u64) {
        let expected = high_expected()[target-1];
        assert!((25..=29).contains(&target));
        assert!(shard_count > 0 && shard_index < shard_count);
        let mut initial = [0u8; 32];
        for (index, level) in (0..=(target/2)).chain(1..((target+1)/2)).enumerate() {
            initial[index] = level as u8;
        }
        let mut layout: Option<[u8; 32]> = Some(initial);
        let mut accepted_total = 0u64;
        let mut shard_accepted = 0u64;
        let mut eligible = 0u64;
        let mut minimum: Option<i128> = None;
        let mut witness = [0u32; 9];
        while let Some(candidate) = layout {
            layout = next_tree_fixed(candidate, target);
            if let Some(valid) = layout {
                if accepted_total % shard_count == shard_index {
                    shard_accepted += 1;
                    let item = item9_from_layout(&valid[..target]);
                    if item.alpha >= 14 {
                        eligible += 1;
                        let value = value8(item.polynomial);
                        assert!(value >= 0,
                            "negative V8 tree shard target={} shard={}/{} alpha={} value={} polynomial={:?}",
                            target, shard_index, shard_count, item.alpha, value, item.polynomial);
                        if minimum.is_none() || value < minimum.unwrap() {
                            minimum = Some(value);
                            witness = item.polynomial;
                        }
                    }
                }
                accepted_total += 1;
                layout = next_rooted_fixed(valid, target, None);
            }
        }
        assert_eq!(accepted_total, expected);
        let expected_shard = if expected <= shard_index { 0 }
            else { (expected - 1 - shard_index) / shard_count + 1 };
        assert_eq!(shard_accepted, expected_shard);
        println!(
            "PHASE_TREE_SHARD target={} shard_index={} shard_count={} accepted={} eligible={} minimum={} polynomial={:?}",
            target, shard_index, shard_count, shard_accepted, eligible,
            minimum.expect("eligible tree exists in shard"), witness,
        );
    }

    // Jointly certify order-28 trees and the order-29 disconnected class
    // consisting of one order-28 tree plus one isolated vertex.  Sharing the
    // expensive tree-polynomial computation makes the two exact phases cheap
    // to replay in parallel.
    fn run_tree_isolate_shard(base_target: usize, shard_index: u64, shard_count: u64) {
        assert_eq!(base_target, 28);
        let expected = high_expected()[base_target-1];
        assert!(shard_count > 0 && shard_index < shard_count);
        let isolated = Item9 {
            polynomial: [1,1,0,0,0,0,0,0,0], order: 1, alpha: 1,
        };
        let mut initial = [0u8; 32];
        for (index, level) in (0..=(base_target/2)).chain(1..((base_target+1)/2)).enumerate() {
            initial[index] = level as u8;
        }
        let mut layout: Option<[u8; 32]> = Some(initial);
        let mut accepted_total = 0u64;
        let mut shard_accepted = 0u64;
        let mut base_minimum: Option<i128> = None;
        let mut isolate_minimum: Option<i128> = None;
        let mut base_witness = [0u32; 9];
        let mut isolate_witness = [0u32; 9];
        while let Some(candidate) = layout {
            layout = next_tree_fixed(candidate, base_target);
            if let Some(valid) = layout {
                if accepted_total % shard_count == shard_index {
                    shard_accepted += 1;
                    let item = item9_from_layout(&valid[..base_target]);
                    assert!(item.alpha >= 14);
                    let base_value = value8(item.polynomial);
                    assert!(base_value >= 0,
                        "negative V8 base tree-isolate shard value={} polynomial={:?}",
                        base_value, item.polynomial);
                    if base_minimum.is_none() || base_value < base_minimum.unwrap() {
                        base_minimum = Some(base_value);
                        base_witness = item.polynomial;
                    }
                    let extension = combine9(&item, &isolated);
                    let isolate_value = value8(extension.polynomial);
                    assert!(isolate_value >= 0,
                        "negative V8 isolate extension shard value={} polynomial={:?}",
                        isolate_value, extension.polynomial);
                    if isolate_minimum.is_none() || isolate_value < isolate_minimum.unwrap() {
                        isolate_minimum = Some(isolate_value);
                        isolate_witness = extension.polynomial;
                    }
                }
                accepted_total += 1;
                layout = next_rooted_fixed(valid, base_target, None);
            }
        }
        assert_eq!(accepted_total, expected);
        let expected_shard = (expected - 1 - shard_index) / shard_count + 1;
        assert_eq!(shard_accepted, expected_shard);
        println!(
            "PHASE_TREE_ISOLATE_SHARD base_target=28 isolate_target=29 shard_index={} shard_count={} accepted={} base_minimum={} base_polynomial={:?} isolate_minimum={} isolate_polynomial={:?}",
            shard_index, shard_count, shard_accepted,
            base_minimum.unwrap(), base_witness,
            isolate_minimum.unwrap(), isolate_witness,
        );
    }

    pub fn dispatch() {
        let args: Vec<String> = std::env::args().collect();
        if let Some(position) = args.iter().position(|arg| arg == "--debug-compare") {
            let order: usize = args[position+1].parse().unwrap();
            let mut old: Option<Vec<usize>> = Some(
                (0..=(order/2)).chain(1..((order+1)/2)).collect(),
            );
            let mut fixed_initial = [0u8; 32];
            for (index, level) in (0..=(order/2)).chain(1..((order+1)/2)).enumerate() {
                fixed_initial[index] = level as u8;
            }
            let mut fixed = Some(fixed_initial);
            let mut steps = 0u64;
            loop {
                let old_next = old.as_ref().and_then(|x| next_tree(x));
                let fixed_next = fixed.and_then(|x| next_tree_fixed(x, order));
                let fixed_vec = fixed_next.map(|x| x[..order].iter().map(|&y| y as usize).collect::<Vec<_>>());
                assert_eq!(old_next, fixed_vec, "successor mismatch at step {}", steps);
                if old_next.is_none() { break; }
                old = old_next.as_ref().and_then(|x| next_rooted_tree_clean(x, None));
                fixed = fixed_next.and_then(|x| next_rooted_fixed(x, order, None));
                let rooted_fixed_vec = fixed.map(|x| x[..order].iter().map(|&y| y as usize).collect::<Vec<_>>());
                assert_eq!(old, rooted_fixed_vec, "rooted mismatch at step {}", steps);
                steps += 1;
            }
            println!("DEBUG_COMPARE_PASS order={} accepted={}", order, steps);
            return;
        }
        if let Some(position) = args.iter().position(|arg| arg == "--target") {
            let target: usize = args[position+1].parse().unwrap();
            if let Some(phase_position) = args.iter().position(|arg| arg == "--phase") {
                let phase = &args[phase_position+1];
                if phase == "tree-shard" {
                    let shard_index: u64 = args[args.iter().position(|arg| arg == "--shard-index").unwrap()+1]
                        .parse().unwrap();
                    let shard_count: u64 = args[args.iter().position(|arg| arg == "--shard-count").unwrap()+1]
                        .parse().unwrap();
                    run_tree_shard(target, shard_index, shard_count);
                    return;
                }
                if phase == "tree-isolate-shard" {
                    let shard_index: u64 = args[args.iter().position(|arg| arg == "--shard-index").unwrap()+1]
                        .parse().unwrap();
                    let shard_count: u64 = args[args.iter().position(|arg| arg == "--shard-count").unwrap()+1]
                        .parse().unwrap();
                    run_tree_isolate_shard(target, shard_index, shard_count);
                    return;
                }
                let large_order = args.iter().position(|arg| arg == "--tree-order")
                    .map(|p| args[p+1].parse().unwrap());
                run_high_phase(target, phase, large_order);
                return;
            }
            verify_high_target(target);
        } else {
            run();
        }
    }
}

fn main() { engine::dispatch(); }
