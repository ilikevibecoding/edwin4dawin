// Exact componentwise maximum-matching quotient cover for the full rank-eight
// boundary alpha(P)=13,14.
//
// Compile with --cfg rank8_boundary_library.  The included connected source
// supplies exact coefficient arithmetic and the audited WROM tree successor;
// its ordinary main is disabled by that cfg.

include!("verify_rank8_pgc_boundary_connected.rs");

const QMAX: usize = 14;

#[derive(Clone)]
struct QuotientTree {
    order: usize,
    adjacency: [u16; QMAX],
}

#[derive(Clone)]
struct ForestSummary {
    order: usize,
    alpha: usize,
    matching: usize,
    unmatched: usize,
    quotient_forests_total: u64,
    quotient_forests_processed: u64,
    independent_singleton_designations: u64,
    endpoint_coverings: u64,
    matching_valid_expansions: u64,
    support_states: u64,
    q_negative: u64,
    v_negative: u64,
    coupled_negative: u64,
    minimum_num: Option<i128>,
    minimum_den: i128,
    minimum_full: [u64; DEG],
    minimum_reduced: [u64; DEG],
    minimum_v: Option<i128>,
    minimum_v_num: Option<i128>,
    minimum_v_den: i128,
    minimum_v_full: [u64; DEG],
    minimum_v_reduced: [u64; DEG],
}

impl ForestSummary {
    fn new(order: usize, alpha: usize) -> Self {
        let matching = order-alpha;
        let unmatched = alpha-matching;
        Self {
            order, alpha, matching, unmatched,
            quotient_forests_total: 0, quotient_forests_processed: 0,
            independent_singleton_designations: 0, endpoint_coverings: 0,
            matching_valid_expansions: 0, support_states: 0,
            q_negative: 0, v_negative: 0, coupled_negative: 0,
            minimum_num: None, minimum_den: 1,
            minimum_full: [0; DEG], minimum_reduced: [0; DEG],
            minimum_v: None, minimum_v_num: None, minimum_v_den: 1,
            minimum_v_full: [0; DEG], minimum_v_reduced: [0; DEG],
        }
    }

    fn update_minimum(
        &mut self, numerator: i128, denominator: i128,
        full: [u64; DEG], reduced: [u64; DEG],
    ) {
        if self.minimum_num.is_none()
            || numerator*self.minimum_den < self.minimum_num.unwrap()*denominator
        {
            self.minimum_num = Some(numerator);
            self.minimum_den = denominator;
            self.minimum_full = full;
            self.minimum_reduced = reduced;
        }
    }

    fn update_v_minimum(
        &mut self, value_v: i128, numerator: i128, denominator: i128,
        full: [u64; DEG], reduced: [u64; DEG],
    ) {
        if self.minimum_v.is_none() || value_v < self.minimum_v.unwrap() {
            self.minimum_v = Some(value_v);
        }
        if self.minimum_v_num.is_none()
            || numerator*self.minimum_v_den < self.minimum_v_num.unwrap()*denominator
        {
            self.minimum_v_num = Some(numerator);
            self.minimum_v_den = denominator;
            self.minimum_v_full = full;
            self.minimum_v_reduced = reduced;
        }
    }
}

fn multiply_state_full(state: State) -> [u64; DEG] {
    add(state.excluded, state.included)
}

fn rooted_mask(
    vertex: usize, parent: usize, adjacency: &[u32; MAX_N], active: u32,
) -> State {
    let mut excluded = one();
    let mut included = x();
    let mut alpha_excluded = 0usize;
    let mut alpha_included = 1usize;
    let mut neighbors = adjacency[vertex] & active;
    if parent != usize::MAX { neighbors &= !(1u32 << parent); }
    while neighbors != 0 {
        let child = neighbors.trailing_zeros() as usize;
        neighbors &= neighbors-1;
        let state = rooted_mask(child, vertex, adjacency, active);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
        alpha_excluded += state.alpha_excluded.max(state.alpha_included);
        alpha_included += state.alpha_excluded;
    }
    State { excluded, included, alpha_excluded, alpha_included }
}

fn component_mask(start: usize, adjacency: &[u32; MAX_N], active: u32) -> u32 {
    let mut found = 0u32;
    let mut frontier = 1u32 << start;
    while frontier != 0 {
        let vertex = frontier.trailing_zeros() as usize;
        frontier &= frontier-1;
        let bit = 1u32 << vertex;
        if found & bit != 0 { continue; }
        found |= bit;
        frontier |= adjacency[vertex] & active & !found;
    }
    found
}

fn forest_polynomial_alpha(
    adjacency: &[u32; MAX_N], active: u32,
) -> ([u64; DEG], usize) {
    let mut unseen = active;
    let mut polynomial = one();
    let mut alpha = 0usize;
    while unseen != 0 {
        let root = unseen.trailing_zeros() as usize;
        let vertices = component_mask(root, adjacency, active);
        unseen &= !vertices;
        let state = rooted_mask(root, usize::MAX, adjacency, vertices);
        polynomial = multiply(polynomial, multiply_state_full(state));
        alpha += state.alpha_excluded.max(state.alpha_included);
    }
    (polynomial, alpha)
}

fn directed_state(
    vertex: usize, blocked: usize, adjacency: &[u32; MAX_N],
    memo: &mut [[Option<State>; MAX_N]; MAX_N],
) -> State {
    if let Some(state) = memo[vertex][blocked] { return state; }
    let mut excluded = one();
    let mut included = x();
    let mut alpha_excluded = 0usize;
    let mut alpha_included = 1usize;
    let mut neighbors = adjacency[vertex] & !(1u32 << blocked);
    while neighbors != 0 {
        let child = neighbors.trailing_zeros() as usize;
        neighbors &= neighbors-1;
        let state = directed_state(child, vertex, adjacency, memo);
        excluded = multiply(excluded, add(state.excluded, state.included));
        included = multiply(included, state.excluded);
        alpha_excluded += state.alpha_excluded.max(state.alpha_included);
        alpha_included += state.alpha_excluded;
    }
    let state = State { excluded, included, alpha_excluded, alpha_included };
    memo[vertex][blocked] = Some(state);
    state
}

fn divide_by_one_plus_x(polynomial: [u64; DEG]) -> [u64; DEG] {
    let mut quotient = [0u64; DEG];
    quotient[0] = polynomial[0];
    for rank in 1..DEG {
        assert!(polynomial[rank] >= quotient[rank-1]);
        quotient[rank] = polynomial[rank]-quotient[rank-1];
    }
    quotient
}

fn all_vertex_deleted_polynomials(
    adjacency: &[u32; MAX_N], order: usize,
) -> [[u64; DEG]; MAX_N] {
    let active = (1u32 << order)-1;
    let mut unseen = active;
    let mut component_masks = Vec::<u32>::new();
    let mut component_polynomials = Vec::<[u64; DEG]>::new();
    let mut component_of = [usize::MAX; MAX_N];
    while unseen != 0 {
        let root = unseen.trailing_zeros() as usize;
        let vertices = component_mask(root, adjacency, active);
        unseen &= !vertices;
        let index = component_masks.len();
        let mut bits = vertices;
        while bits != 0 {
            let vertex = bits.trailing_zeros() as usize;
            bits &= bits-1;
            component_of[vertex] = index;
        }
        let state = rooted_mask(root, usize::MAX, adjacency, vertices);
        component_masks.push(vertices);
        component_polynomials.push(multiply_state_full(state));
    }
    let mut common = vec![[0u64; DEG]; component_masks.len()];
    for index in 0..component_masks.len() {
        let mut product = one();
        for other in 0..component_masks.len() {
            if other != index { product = multiply(product, component_polynomials[other]); }
        }
        common[index] = product;
    }
    let mut memo = [[None::<State>; MAX_N]; MAX_N];
    let mut deleted = [[0u64; DEG]; MAX_N];
    for vertex in 0..order {
        let mut inside = one();
        let mut neighbors = adjacency[vertex];
        while neighbors != 0 {
            let child = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            let state = directed_state(child, vertex, adjacency, &mut memo);
            inside = multiply(inside, multiply_state_full(state));
        }
        deleted[vertex] = multiply(inside, common[component_of[vertex]]);
    }
    deleted
}

fn audit_expanded_forest(
    adjacency: &[u32; MAX_N], summary: &mut ForestSummary,
) {
    let active = (1u32 << summary.order)-1;
    let (full, alpha) = forest_polynomial_alpha(adjacency, active);
    // The cheap exact augmenting-path filter is replayed by this independent
    // alpha computation on every retained expansion.
    assert_eq!(alpha, summary.alpha);
    summary.matching_valid_expansions += 1;
    let value_q = q8(&full);
    let vertex_deleted = all_vertex_deleted_polynomials(adjacency, summary.order);
    for support in 0..summary.order {
        let mut neighbors = adjacency[support] & active;
        let mut leaf = None;
        while neighbors != 0 {
            let vertex = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            if (adjacency[vertex] & active).count_ones() == 1 {
                leaf = Some(vertex);
                break;
            }
        }
        if leaf.is_none() { continue; }
        // Deleting the support alone leaves the chosen leaf as an isolated
        // K1, so I(F-support)=(1+x)I(F-{support,leaf}).
        let reduced = divide_by_one_plus_x(vertex_deleted[support]);
        let value_v = v8(&reduced);
        let p7 = full[7] as i128;
        let b6 = reduced[6] as i128;
        let c7 = full[8] as i128-reduced[7] as i128-reduced[8] as i128;
        assert!(p7 > 0 && b6 > 0 && c7 >= 0);
        let numerator = 8*b6*value_q + 24*c7*p7*b6 + value_v*p7;
        let denominator = 2*p7*b6;
        summary.support_states += 1;
        summary.q_negative += (value_q < 0) as u64;
        summary.v_negative += (value_v < 0) as u64;
        summary.coupled_negative += (numerator < 0) as u64;
        assert!(numerator >= 0,
            "negative forest quotient boundary order={} alpha={} numerator={} full={:?} reduced={:?}",
            summary.order, alpha, numerator, full, reduced);
        summary.update_minimum(numerator, denominator, full, reduced);
        if value_v < 0 {
            summary.update_v_minimum(value_v, numerator, denominator, full, reduced);
        }
    }
}

fn quotient_path(
    quotient: &[u16; QMAX], order: usize, start: usize, target: usize,
) -> Option<Vec<usize>> {
    let mut parent = [usize::MAX; QMAX];
    let mut stack = Vec::<usize>::new();
    parent[start] = start;
    stack.push(start);
    while let Some(vertex) = stack.pop() {
        if vertex == target { break; }
        let mut neighbors = quotient[vertex];
        while neighbors != 0 {
            let neighbor = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            if neighbor >= order || parent[neighbor] != usize::MAX { continue; }
            parent[neighbor] = vertex;
            stack.push(neighbor);
        }
    }
    if parent[target] == usize::MAX { return None; }
    let mut reverse = vec![target];
    let mut vertex = target;
    while vertex != start {
        vertex = parent[vertex];
        reverse.push(vertex);
    }
    reverse.reverse();
    Some(reverse)
}

fn valid_matching_patterns(
    quotient: &[u16; QMAX], order: usize, singleton_mask: u16,
    edges: &[(usize, usize)], first_bit: &[Option<usize>],
    second_bit: &[Option<usize>], free: usize,
) -> Vec<bool> {
    // Berge's lemma: the designated matching is maximum iff there is no
    // augmenting path between unmatched singleton blocks.  In a forest the
    // quotient path is unique.  At each internal pair block an alternating
    // path must enter and leave through opposite endpoints.
    let singletons: Vec<usize> = (0..order)
        .filter(|&v| singleton_mask & (1u16 << v) != 0)
        .collect();
    let edge_index = |u: usize, v: usize| -> usize {
        edges.iter().position(|&(a, b)| (a == u && b == v) || (a == v && b == u)).unwrap()
    };
    let endpoint_bit = |index: usize, vertex: usize| -> Option<usize> {
        if edges[index].0 == vertex { first_bit[index] }
        else { assert_eq!(edges[index].1, vertex); second_bit[index] }
    };
    let mut path_constraints = Vec::<Vec<(Option<usize>, Option<usize>)>>::new();
    for first_index in 0..singletons.len() {
        for second_index in (first_index+1)..singletons.len() {
            let path = match quotient_path(
                quotient, order, singletons[first_index], singletons[second_index],
            ) {
                Some(path) => path,
                None => continue,
            };
            if path[1..path.len()-1].iter()
                .any(|&v| singleton_mask & (1u16 << v) != 0)
            {
                continue;
            }
            let mut constraints = Vec::new();
            for position in 1..path.len()-1 {
                let vertex = path[position];
                let incoming = edge_index(path[position-1], vertex);
                let outgoing = edge_index(vertex, path[position+1]);
                constraints.push((
                    endpoint_bit(incoming, vertex),
                    endpoint_bit(outgoing, vertex),
                ));
            }
            // A direct singleton--singleton edge is excluded before this
            // function because U is independent, so every path has a pair
            // constraint.
            assert!(!constraints.is_empty());
            path_constraints.push(constraints);
        }
    }
    let value = |coordinate: Option<usize>, pattern: u64| -> u64 {
        coordinate.map(|bit| (pattern >> bit) & 1).unwrap_or(0)
    };
    let mut valid = vec![true; 1usize << free];
    for pattern in 0u64..(1u64 << free) {
        let augmenting = path_constraints.iter().any(|constraints| {
            constraints.iter().all(|&(left, right)| {
                value(left, pattern) != value(right, pattern)
            })
        });
        valid[pattern as usize] = !augmenting;
    }
    valid
}

fn collect_quotient_trees(maximum: usize) -> Vec<QuotientTree> {
    let mut trees = Vec::<QuotientTree>::new();
    for order in 1..=maximum {
        if order == 1 {
            trees.push(QuotientTree { order, adjacency: [0; QMAX] });
            continue;
        }
        let mut initial = [0u8; MAX_N];
        for (index, level) in (0..=(order/2))
            .chain(1..((order+1)/2)).enumerate()
        {
            initial[index] = level as u8;
        }
        let mut layout: Option<[u8; MAX_N]> = Some(initial);
        let mut count = 0u64;
        while let Some(candidate) = layout {
            layout = next_tree_fixed(candidate, order);
            if let Some(valid) = layout {
                let graph = adjacency_from_layout(&valid[..order]);
                let mut adjacency = [0u16; QMAX];
                for vertex in 0..order {
                    for &neighbor in &graph[vertex] {
                        adjacency[vertex] |= 1u16 << neighbor;
                    }
                }
                trees.push(QuotientTree { order, adjacency });
                count += 1;
                layout = next_rooted_fixed(valid, order, None);
            }
        }
        assert_eq!(count, TREE_COUNTS[order]);
    }
    trees.sort_by_key(|tree| tree.order);
    trees
}

fn build_quotient_forest(
    chosen: &[usize], trees: &[QuotientTree], order: usize,
) -> [u16; QMAX] {
    let mut out = [0u16; QMAX];
    let mut offset = 0usize;
    for &index in chosen {
        let tree = &trees[index];
        for vertex in 0..tree.order {
            let mut neighbors = tree.adjacency[vertex];
            while neighbors != 0 {
                let neighbor = neighbors.trailing_zeros() as usize;
                neighbors &= neighbors-1;
                out[offset+vertex] |= 1u16 << (offset+neighbor);
            }
        }
        offset += tree.order;
    }
    assert_eq!(offset, order);
    out
}

fn process_singleton_designation(
    quotient: &[u16; QMAX], singleton_mask: u16,
    summary: &mut ForestSummary,
) {
    summary.independent_singleton_designations += 1;
    let q = summary.alpha;
    let mut first = [usize::MAX; QMAX];
    let mut second = [usize::MAX; QMAX];
    let mut next = 0usize;
    for vertex in 0..q {
        if singleton_mask & (1u16 << vertex) != 0 {
            first[vertex] = next;
            next += 1;
        } else {
            first[vertex] = next;
            second[vertex] = next+1;
            next += 2;
        }
    }
    assert_eq!(next, summary.order);

    let mut edges = Vec::<(usize, usize)>::new();
    for first_vertex in 0..q {
        let mut neighbors = quotient[first_vertex];
        while neighbors != 0 {
            let second_vertex = neighbors.trailing_zeros() as usize;
            neighbors &= neighbors-1;
            if first_vertex < second_vertex {
                edges.push((first_vertex, second_vertex));
            }
        }
    }
    // One gauge flip per nonisolated paired block sets its first endpoint
    // incidence bit to zero.  Every later incidence is an independent bit.
    let mut seen_incidence = [false; QMAX];
    let mut first_bit = vec![None::<usize>; edges.len()];
    let mut second_bit = vec![None::<usize>; edges.len()];
    let mut free = 0usize;
    for (edge_index, &(u, v)) in edges.iter().enumerate() {
        if singleton_mask & (1u16 << u) == 0 {
            if seen_incidence[u] { first_bit[edge_index] = Some(free); free += 1; }
            else { seen_incidence[u] = true; }
        }
        if singleton_mask & (1u16 << v) == 0 {
            if seen_incidence[v] { second_bit[edge_index] = Some(free); free += 1; }
            else { seen_incidence[v] = true; }
        }
    }
    assert!(free <= QMAX-2 || edges.is_empty());
    let valid_patterns = valid_matching_patterns(
        quotient, q, singleton_mask, &edges, &first_bit, &second_bit, free,
    );
    for pattern in 0u64..(1u64 << free) {
        summary.endpoint_coverings += 1;
        if !valid_patterns[pattern as usize] { continue; }
        let mut adjacency = [0u32; MAX_N];
        for vertex in 0..q {
            if second[vertex] != usize::MAX {
                adjacency[first[vertex]] |= 1u32 << second[vertex];
                adjacency[second[vertex]] |= 1u32 << first[vertex];
            }
        }
        for (edge_index, &(u, v)) in edges.iter().enumerate() {
            let u_bit = first_bit[edge_index]
                .map(|bit| ((pattern >> bit) & 1) as usize).unwrap_or(0);
            let v_bit = second_bit[edge_index]
                .map(|bit| ((pattern >> bit) & 1) as usize).unwrap_or(0);
            let eu = if u_bit == 0 { first[u] } else { second[u] };
            let ev = if v_bit == 0 { first[v] } else { second[v] };
            assert!(eu != usize::MAX && ev != usize::MAX);
            adjacency[eu] |= 1u32 << ev;
            adjacency[ev] |= 1u32 << eu;
        }
        audit_expanded_forest(&adjacency, summary);
    }
}

fn choose_singletons(
    quotient: &[u16; QMAX], start: usize, left: usize,
    selected: u16, summary: &mut ForestSummary,
) {
    if left == 0 {
        process_singleton_designation(quotient, selected, summary);
        return;
    }
    let q = summary.alpha;
    if q-start < left { return; }
    for vertex in start..=(q-left) {
        if quotient[vertex] & selected != 0 { continue; }
        choose_singletons(
            quotient, vertex+1, left-1,
            selected | (1u16 << vertex), summary,
        );
    }
}

fn enumerate_quotient_forests(
    trees: &[QuotientTree], start: usize, remaining: usize,
    chosen: &mut Vec<usize>, quotient_index: &mut u64,
    shard_index: u64, shard_count: u64, summary: &mut ForestSummary,
) {
    if remaining == 0 {
        let index = *quotient_index;
        *quotient_index += 1;
        if index % shard_count != shard_index { return; }
        summary.quotient_forests_processed += 1;
        let quotient = build_quotient_forest(chosen, trees, summary.alpha);
        choose_singletons(
            &quotient, 0, summary.unmatched, 0, summary,
        );
        return;
    }
    for index in start..trees.len() {
        let order = trees[index].order;
        if order > remaining { break; }
        chosen.push(index);
        enumerate_quotient_forests(
            trees, index, remaining-order, chosen, quotient_index,
            shard_index, shard_count, summary,
        );
        chosen.pop();
    }
}

fn expected_forest_count(order: usize) -> u64 {
    const COUNTS: [u64; 15] = [
        1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599,
    ];
    COUNTS[order]
}

fn main() {
    let arguments: Vec<String> = env::args().collect();
    let mut target = 26usize;
    let mut alpha = 13usize;
    let mut shard_index = 0u64;
    let mut shard_count = 1u64;
    let mut index = 1usize;
    while index < arguments.len() {
        match arguments[index].as_str() {
            "--target" => { index += 1; target = arguments[index].parse().unwrap(); }
            "--alpha" => { index += 1; alpha = arguments[index].parse().unwrap(); }
            "--shard-index" => { index += 1; shard_index = arguments[index].parse().unwrap(); }
            "--shard-count" => { index += 1; shard_count = arguments[index].parse().unwrap(); }
            other => panic!("unknown argument {}", other),
        }
        index += 1;
    }
    assert!((13..=14).contains(&alpha));
    assert!(alpha <= target && target <= 2*alpha);
    assert!(shard_count >= 1 && shard_index < shard_count);
    let mut summary = ForestSummary::new(target, alpha);
    let trees = collect_quotient_trees(alpha);
    let mut chosen = Vec::<usize>::new();
    let mut quotient_index = 0u64;
    enumerate_quotient_forests(
        &trees, 0, alpha, &mut chosen, &mut quotient_index,
        shard_index, shard_count, &mut summary,
    );
    assert_eq!(quotient_index, expected_forest_count(alpha));
    summary.quotient_forests_total = quotient_index;
    println!(
        "QFOREST order={} alpha={} matching={} unmatched={} quotient_total={} quotient_processed={} singleton_designations={} endpoint_coverings={} valid_expansions={} support_states={} q_negative={} v_negative={} coupled_negative={} min_num={} min_den={} full={} reduced={} min_v={} min_v_margin_num={} min_v_margin_den={} min_v_full={} min_v_reduced={}",
        summary.order, summary.alpha, summary.matching, summary.unmatched,
        summary.quotient_forests_total, summary.quotient_forests_processed,
        summary.independent_singleton_designations, summary.endpoint_coverings,
        summary.matching_valid_expansions, summary.support_states,
        summary.q_negative, summary.v_negative, summary.coupled_negative,
        summary.minimum_num.unwrap_or(0), summary.minimum_den,
        array_text(&summary.minimum_full), array_text(&summary.minimum_reduced),
        summary.minimum_v.unwrap_or(0), summary.minimum_v_num.unwrap_or(0),
        summary.minimum_v_den, array_text(&summary.minimum_v_full),
        array_text(&summary.minimum_v_reduced),
    );
    assert_eq!(summary.coupled_negative, 0);
    println!(
        "PASS_EXACT_RANK8_PGC_MATCHING_FOREST_QUOTIENT_ORDER_{}_ALPHA_{}_SHARD_{}_OF_{}",
        target, alpha, shard_index, shard_count,
    );
}
