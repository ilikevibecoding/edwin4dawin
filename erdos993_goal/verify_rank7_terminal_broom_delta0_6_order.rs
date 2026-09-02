// Exact all-root WROM verifier for rank-seven terminal-broom Delta0..Delta6.
// Usage: verify_rank7_terminal_broom_delta0_6_order.exe N EXPECTED_FREE_TREES
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");

    pub fn run(n: usize, expected: u64) {
        assert!(n >= 2);
        let mut layout: Option<Vec<usize>> =
            Some((0..=n / 2).chain(1..((n + 1) / 2)).collect());
        let mut trees = 0u64;
        let mut roots = 0u64;
        let mut eligible_roots = 0u64;
        let mut minima = [i128::MAX; 7];
        let mut witness_roots = [0usize; 7];
        while let Some(cand) = layout {
            layout = next_tree(&cand);
            let valid = match layout.clone() {
                Some(value) => value,
                None => break,
            };
            let adjacency = adjacency(&valid);
            let mut memo = vec![None; n * n];
            let state = root(0, &adjacency, &mut memo);
            let core = add(state.excluded, state.included);
            trees += 1;
            for vertex in 0..n {
                let deleted = root(vertex, &adjacency, &mut memo).excluded;
                if core[6] > 0 && deleted[5] > 0 {
                    eligible_roots += 1;
                    let mut values = [0i128; 8];
                    for index in 0..8 {
                        values[index] = residual(core, deleted, index + 1);
                    }
                    for rank in 0..7 {
                        let value = values[0];
                        if value < minima[rank] {
                            minima[rank] = value;
                            witness_roots[rank] = vertex;
                        }
                        if value < 0 {
                            println!(
                                "COUNTEREXAMPLE core_n={} tree_index={} root={} rank={} value={} layout={:?} core={:?} deleted={:?}",
                                n, trees, vertex, rank, value, valid, core, deleted
                            );
                            std::process::exit(1);
                        }
                        for index in 0..(7 - rank) {
                            values[index] = values[index + 1] - values[index];
                        }
                    }
                }
                roots += 1;
            }
            layout = next_rooted(&valid, None);
        }
        assert_eq!(trees, expected);
        assert_eq!(roots, expected * n as u64);
        assert!(minima.iter().all(|value| *value >= 0));
        println!(
            "core_n={} trees={} roots={} eligible_roots={} Delta0_6_minima={:?} witness_roots={:?}",
            n, trees, roots, eligible_roots, minima, witness_roots
        );
        println!(
            "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA0_6_ALL_ROOTED_CORES_N{}",
            n
        );
    }
}

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    let n: usize = arguments.get(1).expect("N").parse().expect("integer N");
    let expected: u64 = arguments
        .get(2)
        .expect("EXPECTED_FREE_TREES")
        .parse()
        .expect("integer expected count");
    base::run(n, expected);
}
