// Exact all-root WROM verifier for the rank-seven terminal-broom Delta0.
// Usage: verify_rank7_terminal_broom_delta0_order.exe N EXPECTED_FREE_TREES
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");

    fn delta0(c: [i128; 9], h: [i128; 9]) -> i128 {
        // The exact residual R_t from the certified terminal-broom identity,
        // specialized to t=1.  This is Delta^0 R_1=R_1 itself.
        let p6 = c[6] + c[5] + h[5];
        let p7 = c[7] + c[6] + h[6];
        let p8o = c[7];
        7 * c[6] * h[5] * (14 * p7 * p7 - p6 * p7 - 16 * p6 * p8o)
            - 7 * h[5] * p6 * (14 * c[7] * c[7] - c[6] * c[7])
            - 8 * c[6] * p6 * (12 * h[6] * h[6] - h[5] * h[6])
    }

    pub fn run(n: usize, expected: u64) {
        assert!(n >= 2);
        let mut layout: Option<Vec<usize>> =
            Some((0..=n / 2).chain(1..((n + 1) / 2)).collect());
        let mut trees = 0u64;
        let mut roots = 0u64;
        let mut eligible_roots = 0u64;
        let mut minimum = i128::MAX;
        let mut witness_layout: Vec<usize> = Vec::new();
        let mut witness_root = 0usize;
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
                    let value = delta0(core, deleted);
                    if value < minimum {
                        minimum = value;
                        witness_layout = valid.clone();
                        witness_root = vertex;
                    }
                    if value < 0 {
                        println!(
                            "COUNTEREXAMPLE core_n={} tree_index={} root={} value={} layout={:?} core={:?} deleted={:?}",
                            n, trees, vertex, value, valid, core, deleted
                        );
                        std::process::exit(1);
                    }
                }
                roots += 1;
            }
            layout = next_rooted(&valid, None);
        }
        assert_eq!(trees, expected);
        assert_eq!(roots, expected * n as u64);
        assert!(minimum >= 0);
        println!(
            "core_n={} trees={} roots={} eligible_roots={} Delta0_minimum={} witness_root={} witness_layout={:?}",
            n, trees, roots, eligible_roots, minimum, witness_root, witness_layout
        );
        println!(
            "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA0_ALL_ROOTED_CORES_N{}",
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
