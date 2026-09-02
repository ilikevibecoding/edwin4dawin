// Exact low-memory WROM census of Delta^0 through Delta^4 for the
// rank-eight terminal-broom residual.  The audited generator and polynomial
// arithmetic are included verbatim from the Delta^5 finite checker; this
// wrapper changes only the finite-difference ranks reported.

mod base {
    include!("verify_rank8_terminal_delta5_finite.rs");

    fn deltas04(c: [i128; 10], h: [i128; 10]) -> [i128; 5] {
        let mut values: Vec<i128> = (1..=5).map(|t| residual(c, h, t)).collect();
        let mut out = [0i128; 5];
        out[0] = values[0];
        for rank in 1..=4 {
            values = values.windows(2).map(|pair| pair[1] - pair[0]).collect();
            out[rank] = values[0];
        }
        out
    }

    pub fn scan() {
        let args: Vec<String> = std::env::args().collect();
        let first: usize = args.get(1).and_then(|value| value.parse().ok()).unwrap_or(1);
        let last: usize = args.get(2).and_then(|value| value.parse().ok()).unwrap_or(17);
        let expected: [u64; 23] = [
            0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
            3159, 7741, 19320, 48629, 123867, 317955, 823065, 2144505, 5623756,
        ];
        assert!(1 <= first && first <= last && last <= 22);
        let mut total_trees = 0u64;
        let mut total_roots = 0u64;
        let mut total_active = 0u64;
        for n in first..=last {
            let mut layout: Option<Vec<usize>> = if n == 1 {
                Some(vec![0])
            } else {
                Some((0..=n / 2).chain(1..((n + 1) / 2)).collect())
            };
            let mut trees = 0u64;
            let mut roots = 0u64;
            let mut active = 0u64;
            let mut minima = [i128::MAX; 5];
            let mut minimum_witnesses: [Option<(Vec<usize>, usize)>; 5] =
                std::array::from_fn(|_| None);
            let mut active_minima = [i128::MAX; 5];
            let mut negative_counts = [0u64; 5];
            let mut first_negative: [Option<(Vec<usize>, usize, i128)>; 5] =
                std::array::from_fn(|_| None);
            while let Some(candidate) = layout {
                layout = if n == 1 { None } else { next_tree(&candidate) };
                let valid = if n == 1 {
                    candidate
                } else {
                    match layout.clone() {
                        Some(value) => value,
                        None => break,
                    }
                };
                let adjacency = adjacency(&valid);
                let mut memo = vec![None; n * n];
                let state = root(0, &adjacency, &mut memo);
                let core = add(state.excluded, state.included);
                trees += 1;
                for vertex in 0..n {
                    let deleted = root(vertex, &adjacency, &mut memo).excluded;
                    let values = deltas04(core, deleted);
                    for rank in 0..=4 {
                        if values[rank] < minima[rank] {
                            minima[rank] = values[rank];
                            minimum_witnesses[rank] = Some((valid.clone(), vertex));
                        }
                        if values[rank] < 0 {
                            negative_counts[rank] += 1;
                            if first_negative[rank].is_none() {
                                first_negative[rank] = Some((valid.clone(), vertex, values[rank]));
                            }
                        }
                    }
                    if core[7] > 0 && deleted[6] > 0 {
                        active += 1;
                        for rank in 0..=4 {
                            active_minima[rank] = active_minima[rank].min(values[rank]);
                        }
                    }
                    roots += 1;
                }
                if n > 1 {
                    layout = next_rooted(&valid, None);
                }
            }
            assert_eq!(trees, expected[n]);
            assert_eq!(roots, expected[n] * n as u64);
            for rank in 0..=4 {
                if let Some((ref bad_layout, bad_root, bad_value)) = first_negative[rank] {
                    eprintln!(
                        "FIRST_NEGATIVE n={n} layout={bad_layout:?} root={bad_root} delta={rank} value={bad_value}"
                    );
                }
                if minima[rank] < 0 {
                    let (ref layout, root) = minimum_witnesses[rank]
                        .as_ref()
                        .expect("a negative minimum has a witness");
                    eprintln!(
                        "MINIMUM_WITNESS n={n} layout={layout:?} root={root} delta={rank} value={}",
                        minima[rank]
                    );
                }
            }
            let active_text: Vec<String> = if active == 0 {
                (0..5).map(|_| "NA".to_string()).collect()
            } else {
                active_minima.iter().map(|value| value.to_string()).collect()
            };
            println!(
                "core_n={n} trees={trees} roots={roots} active={active} minima={minima:?} active_minima={active_text:?} negative_counts={negative_counts:?}"
            );
            total_trees += trees;
            total_roots += roots;
            total_active += active;
        }
        println!("totals trees={total_trees} roots={total_roots} active={total_active}");
        println!("PASS_EXACT_RANK8_TERMINAL_DELTA0_4_CENSUS_N{first}_THROUGH_N{last}");
    }
}

fn main() {
    base::scan();
}
