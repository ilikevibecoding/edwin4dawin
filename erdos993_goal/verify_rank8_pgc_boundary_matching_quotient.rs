// Boundary-specific exact covering verifier for connected orders 25--28.
// Compile with:
//   rustc -O --cfg rank8_boundary_library --target x86_64-pc-windows-gnu \
//     verify_rank8_pgc_boundary_matching_quotient.rs -o ...exe
//
// The included file supplies exact polynomial arithmetic, the audited WROM
// quotient-tree stream, and the literal rank-eight margin.  Its ordinary main
// is disabled by the cfg above.

include!("verify_rank8_pgc_boundary_connected.rs");

#[derive(Clone)]
struct QuotientSummary {
    order: usize,
    alpha: usize,
    quotient_order: usize,
    quotient_total: u64,
    quotient_processed: u64,
    covering_expanded_trees: u64,
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

impl QuotientSummary {
    fn new(order: usize, alpha: usize, quotient_order: usize) -> Self {
        Self {
            order, alpha, quotient_order, quotient_total: 0,
            quotient_processed: 0, covering_expanded_trees: 0,
            support_states: 0, q_negative: 0, v_negative: 0,
            coupled_negative: 0, minimum_num: None, minimum_den: 1,
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

fn add_edge(adjacency: &mut [Vec<usize>], first: usize, second: usize) {
    adjacency[first].push(second);
    adjacency[second].push(first);
}

fn audit_expanded(adjacency: &[Vec<usize>], summary: &mut QuotientSummary) {
    summary.covering_expanded_trees += 1;
    let (full, alpha) = full_polynomial_and_alpha(adjacency);
    assert_eq!(adjacency.len(), summary.order);
    assert_eq!(alpha, summary.alpha);
    let value_q = q8(&full);
    for support in 0..adjacency.len() {
        let leaf = adjacency[support].iter().copied()
            .find(|&vertex| adjacency[vertex].len() == 1);
        if leaf.is_none() { continue; }
        let (reduced, reduced_alpha) =
            deletion_polynomial(adjacency, leaf.unwrap(), support);
        assert_eq!(reduced_alpha, alpha-1);
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
            "negative matching-quotient boundary order={} alpha={} numerator={} full={:?} reduced={:?}",
            summary.order, alpha, numerator, full, reduced);
        summary.update_minimum(numerator, denominator, full, reduced);
        if value_v < 0 {
            summary.update_v_minimum(value_v, numerator, denominator, full, reduced);
        }
    }
}

fn quotient_edges_from_root(
    quotient: &[Vec<usize>], root: usize,
) -> Vec<(usize, usize)> {
    let mut edges = Vec::<(usize, usize)>::new();
    let mut stack = vec![(root, usize::MAX)];
    while let Some((vertex, parent)) = stack.pop() {
        for &child in quotient[vertex].iter().rev() {
            if child == parent { continue; }
            edges.push((vertex, child));
            stack.push((child, vertex));
        }
    }
    assert_eq!(edges.len()+1, quotient.len());
    edges
}

fn audit_perfect_quotient(
    quotient: &[Vec<usize>], summary: &mut QuotientSummary,
) {
    let pairs = quotient.len();
    let edges = quotient_edges_from_root(quotient, 0);
    assert_eq!(pairs*2, summary.order);
    // Normalize every child's endpoint on its parent edge to zero.  The one
    // remaining root swap is fixed by making the first root-edge endpoint
    // zero.  The other |Q|-2 parent endpoint bits are free.
    assert_eq!(edges[0].0, 0);
    let free = pairs-2;
    for mask in 0u64..(1u64 << free) {
        let mut adjacency = vec![Vec::<usize>::new(); pairs*2];
        for vertex in 0..pairs {
            add_edge(&mut adjacency, 2*vertex, 2*vertex+1);
        }
        for (edge_index, &(parent, child)) in edges.iter().enumerate() {
            let parent_bit = if edge_index == 0 { 0usize }
                else { ((mask >> (edge_index-1)) & 1) as usize };
            add_edge(&mut adjacency, 2*parent+parent_bit, 2*child);
        }
        audit_expanded(&adjacency, summary);
    }
}

fn audit_near_perfect_quotient(
    quotient: &[Vec<usize>], singleton: usize,
    summary: &mut QuotientSummary,
) {
    let quotient_order = quotient.len();
    let pairs = quotient_order-1;
    assert_eq!(pairs*2+1, summary.order);
    let singleton_expanded = pairs*2;
    let mut first = [usize::MAX; MAX_N];
    let mut second = [usize::MAX; MAX_N];
    let mut next = 0usize;
    for vertex in 0..quotient_order {
        if vertex == singleton { continue; }
        first[vertex] = next;
        second[vertex] = next+1;
        next += 2;
    }
    assert_eq!(next, pairs*2);
    let edges = quotient_edges_from_root(quotient, singleton);
    let free = edges.iter().filter(|(parent, _)| *parent != singleton).count();
    for mask in 0u64..(1u64 << free) {
        let mut adjacency = vec![Vec::<usize>::new(); pairs*2+1];
        for vertex in 0..quotient_order {
            if vertex == singleton { continue; }
            add_edge(&mut adjacency, first[vertex], second[vertex]);
        }
        let mut bit_index = 0usize;
        for &(parent, child) in &edges {
            assert_ne!(child, singleton);
            let parent_expanded = if parent == singleton {
                singleton_expanded
            } else {
                let bit = ((mask >> bit_index) & 1) as usize;
                bit_index += 1;
                if bit == 0 { first[parent] } else { second[parent] }
            };
            add_edge(&mut adjacency, parent_expanded, first[child]);
        }
        assert_eq!(bit_index, free);
        audit_expanded(&adjacency, summary);
    }
}

fn verify_matching_quotient(
    order: usize, shard_index: u64, shard_count: u64,
) -> QuotientSummary {
    assert!((25..=28).contains(&order));
    assert!(shard_count >= 1 && shard_index < shard_count);
    let alpha = (order+1)/2;
    let perfect = order % 2 == 0;
    let pairs = order-alpha;
    let quotient_order = if perfect { pairs } else { pairs+1 };
    let mut summary = QuotientSummary::new(order, alpha, quotient_order);

    let mut initial = [0u8; MAX_N];
    for (index, level) in (0..=(quotient_order/2))
        .chain(1..((quotient_order+1)/2)).enumerate()
    {
        initial[index] = level as u8;
    }
    let mut layout: Option<[u8; MAX_N]> = Some(initial);
    let mut accepted_index = 0u64;
    while let Some(candidate) = layout {
        layout = next_tree_fixed(candidate, quotient_order);
        if let Some(valid) = layout {
            let tree_index = accepted_index;
            accepted_index += 1;
            if tree_index % shard_count == shard_index {
                summary.quotient_processed += 1;
                let quotient = adjacency_from_layout(&valid[..quotient_order]);
                if perfect {
                    audit_perfect_quotient(&quotient, &mut summary);
                } else {
                    for singleton in 0..quotient_order {
                        audit_near_perfect_quotient(
                            &quotient, singleton, &mut summary,
                        );
                    }
                }
            }
            layout = next_rooted_fixed(valid, quotient_order, None);
        }
    }
    assert_eq!(accepted_index, TREE_COUNTS[quotient_order]);
    summary.quotient_total = accepted_index;
    summary
}

fn main() {
    let arguments: Vec<String> = env::args().collect();
    let mut target = 26usize;
    let mut shard_index = 0u64;
    let mut shard_count = 1u64;
    let mut index = 1usize;
    while index < arguments.len() {
        match arguments[index].as_str() {
            "--target" => { index += 1; target = arguments[index].parse().unwrap(); }
            "--shard-index" => { index += 1; shard_index = arguments[index].parse().unwrap(); }
            "--shard-count" => { index += 1; shard_count = arguments[index].parse().unwrap(); }
            other => panic!("unknown argument {}", other),
        }
        index += 1;
    }
    println!(
        "CONFIG target={} shard_index={} shard_count={}",
        target, shard_index, shard_count,
    );
    let s = verify_matching_quotient(target, shard_index, shard_count);
    println!(
        "QMATCH order={} alpha={} quotient_order={} quotient_total={} quotient_processed={} covering_trees={} support_states={} q_negative={} v_negative={} coupled_negative={} min_num={} min_den={} full={} reduced={} min_v={} min_v_margin_num={} min_v_margin_den={} min_v_full={} min_v_reduced={}",
        s.order, s.alpha, s.quotient_order, s.quotient_total,
        s.quotient_processed, s.covering_expanded_trees, s.support_states,
        s.q_negative, s.v_negative, s.coupled_negative,
        s.minimum_num.unwrap_or(0), s.minimum_den,
        array_text(&s.minimum_full), array_text(&s.minimum_reduced),
        s.minimum_v.unwrap_or(0), s.minimum_v_num.unwrap_or(0),
        s.minimum_v_den, array_text(&s.minimum_v_full),
        array_text(&s.minimum_v_reduced),
    );
    assert_eq!(s.coupled_negative, 0);
    println!(
        "PASS_EXACT_RANK8_PGC_MATCHING_QUOTIENT_BOUNDARY_ORDER_{}_SHARD_{}_OF_{}",
        target, shard_index, shard_count,
    );
}
