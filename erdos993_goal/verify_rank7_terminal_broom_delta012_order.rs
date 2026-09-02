// Exact all-root WROM verifier for rank-seven terminal-broom Delta0..Delta2.
// Usage: verify_rank7_terminal_broom_delta012_order.exe N EXPECTED_FREE_TREES
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");

    fn residual_small_t(c: [i128; 9], h: [i128; 9], t: usize) -> i128 {
        let (p6, p7, p8o) = match t {
            1 => (c[6] + c[5] + h[5], c[7] + c[6] + h[6], c[7]),
            2 => (
                c[6] + 2 * c[5] + c[4] + h[5],
                c[7] + 2 * c[6] + c[5] + h[6],
                2 * c[7] + c[6],
            ),
            3 => (
                c[6] + 3 * c[5] + 3 * c[4] + c[3] + h[5],
                c[7] + 3 * c[6] + 3 * c[5] + c[4] + h[6],
                3 * c[7] + 3 * c[6] + c[5],
            ),
            _ => unreachable!(),
        };
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
        let mut minima = [i128::MAX; 3];
        let mut witness_layouts: [Vec<usize>; 3] = [Vec::new(), Vec::new(), Vec::new()];
        let mut witness_roots = [0usize; 3];
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
                    let r1 = residual_small_t(core, deleted, 1);
                    let r2 = residual_small_t(core, deleted, 2);
                    let r3 = residual_small_t(core, deleted, 3);
                    let values = [r1, r2 - r1, r3 - 2 * r2 + r1];
                    for rank in 0..3 {
                        if values[rank] < minima[rank] {
                            minima[rank] = values[rank];
                            witness_layouts[rank] = valid.clone();
                            witness_roots[rank] = vertex;
                        }
                        if values[rank] < 0 {
                            println!(
                                "COUNTEREXAMPLE core_n={} tree_index={} root={} rank={} value={} layout={:?} core={:?} deleted={:?}",
                                n, trees, vertex, rank, values[rank], valid, core, deleted
                            );
                            std::process::exit(1);
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
            "core_n={} trees={} roots={} eligible_roots={} Delta0_2_minima={:?} witness_roots={:?} witness_layouts={:?}",
            n, trees, roots, eligible_roots, minima, witness_roots, witness_layouts
        );
        println!(
            "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_ALL_ROOTED_CORES_N{}",
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
