// Empirical obstruction probe only.  Exhaustively scan free trees of selected
// small orders to test the naive claim that adjoining any leaf increases each
// Delta0..Delta3 value at every old root and is positive at the new root.

include!("rank8_delta03_e4_literal_i256_audit_common_agent.rs");

mod wrom {
    include!("verify_rank8_terminal_delta5_finite.rs");

    pub fn scan<F>(order: usize, mut callback: F) -> u64
    where
        F: FnMut(&[Vec<usize>], &[usize]) -> bool,
    {
        let mut layout: Option<Vec<usize>> =
            Some((0..=order / 2).chain(1..((order + 1) / 2)).collect());
        let mut count = 0_u64;
        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
            let valid = match layout.clone() { Some(value) => value, None => break };
            let graph = adjacency(&valid);
            count += 1;
            if !callback(&graph, &valid) { return count; }
            layout = next_rooted(&valid, None);
        }
        count
    }
}

fn add_leaf(source: &[Vec<usize>], attach: usize) -> Vec<Vec<usize>> {
    let mut out = source.to_vec();
    let leaf = out.len();
    out.push(vec![attach]);
    out[attach].push(leaf);
    out
}

fn check_tree(adjacency: &[Vec<usize>], layout: &[usize]) -> bool {
    let n = adjacency.len();
    let source: Vec<[Z; 4]> = (0..n)
        .map(|root| audit_deltas(adjacency, root).0)
        .collect();
    for attach in 0..n {
        let extended = add_leaf(adjacency, attach);
        for root in 0..n {
            let values = audit_deltas(&extended, root).0;
            for rank in 0..4 {
                let increment = values[rank].sub(source[root][rank]);
                if increment.is_negative() {
                    println!(
                        "NEGATIVE_OLD_ROOT_INCREMENT order={} layout={:?} attach={} root={} rank={} value={}",
                        n, layout, attach, root, rank, increment.decimal(),
                    );
                    return false;
                }
            }
        }
        let leaf_values = audit_deltas(&extended, n).0;
        for rank in 0..4 {
            if !leaf_values[rank].is_positive() {
                println!(
                    "NONPOSITIVE_NEW_LEAF order={} layout={:?} attach={} rank={} value={}",
                    n, layout, attach, rank, leaf_values[rank].decimal(),
                );
                return false;
            }
        }
    }
    true
}

fn main() {
    let expected = [
        0_u64, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
        3159, 7741, 19320, 48629, 123867, 317955, 823065,
    ];
    let arguments: Vec<String> = std::env::args().collect();
    let first: usize = arguments.get(1).and_then(|value| value.parse().ok()).unwrap_or(10);
    let last: usize = arguments.get(2).and_then(|value| value.parse().ok()).unwrap_or(17);
    assert!(10 <= first && first <= last && last <= 20);
    for order in first..=last {
        let mut good = true;
        let count = wrom::scan(order, |adjacency, layout| {
            good = check_tree(adjacency, layout);
            good
        });
        if !good { return; }
        assert_eq!(count, expected[order]);
        eprintln!("EXHAUSTIVE ORDER {} TREES {} PASS", order, count);
    }
    println!("NO_OBSTRUCTION_ALL_FREE_TREES_ORDERS_{}_THROUGH_{}", first, last);
}
