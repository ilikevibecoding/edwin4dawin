// Exact low-memory WROM audit of the literal terminal-family Q8 polynomial.
// Each family is expanded in the Newton basis at the first sibling count t0
// for which alpha(G_t)=alpha(A)+t is at least 14.

mod base {
    include!("verify_rank8_terminal_delta5_finite.rs");

    fn alpha_dfs(v: usize, parent: usize, adjacency: &[Vec<usize>]) -> (usize, usize) {
        let mut excluded = 0usize;
        let mut included = 1usize;
        for &u in &adjacency[v] {
            if u == parent { continue; }
            let (child_excluded, child_included) = alpha_dfs(u, v, adjacency);
            excluded += child_excluded.max(child_included);
            included += child_excluded;
        }
        (excluded, included)
    }

    fn alpha(adjacency: &[Vec<usize>]) -> usize {
        let sentinel = adjacency.len();
        let (excluded, included) = alpha_dfs(0, sentinel, adjacency);
        excluded.max(included)
    }

    fn full_q8(c: [i128; 10], h: [i128; 10], t: usize) -> i128 {
        let p7 = smooth(c, 7, t) + h[6];
        let p8 = smooth(c, 8, t) + h[7];
        let p9 = smooth(c, 9, t) + h[8];
        16 * p8 * p8 - p7 * p8 - 18 * p7 * p9
    }

    fn shifted_coefficients(c: [i128; 10], h: [i128; 10], t0: usize) -> [i128; 16] {
        let mut values: Vec<i128> = (t0..=(t0 + 17)).map(|t| full_q8(c, h, t)).collect();
        let mut out = [0i128; 16];
        out[0] = values[0];
        for rank in 1..=16 {
            values = values.windows(2).map(|pair| pair[1] - pair[0]).collect();
            if rank < 16 { out[rank] = values[0]; }
        }
        assert_eq!(values[0], 0, "literal Q8 terminal polynomial has degree at most 15");
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
        let mut total_negative = [0u64; 16];
        for n in first..=last {
            let mut layout: Option<Vec<usize>> = if n == 1 {
                Some(vec![0])
            } else {
                Some((0..=n / 2).chain(1..((n + 1) / 2)).collect())
            };
            let mut trees = 0u64;
            let mut roots = 0u64;
            let mut minima = [i128::MAX; 16];
            let mut negative = [0u64; 16];
            let mut first_negative: [Option<(Vec<usize>, usize, usize, i128)>; 16] =
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
                let core_alpha = alpha(&adjacency);
                let t0 = 1usize.max(14usize.saturating_sub(core_alpha));
                let mut memo = vec![None; n * n];
                let state = root(0, &adjacency, &mut memo);
                let core = add(state.excluded, state.included);
                trees += 1;
                for vertex in 0..n {
                    let deleted = root(vertex, &adjacency, &mut memo).excluded;
                    let values = shifted_coefficients(core, deleted, t0);
                    for rank in 0..16 {
                        minima[rank] = minima[rank].min(values[rank]);
                        if values[rank] < 0 {
                            negative[rank] += 1;
                            if first_negative[rank].is_none() {
                                first_negative[rank] = Some((valid.clone(), vertex, t0, values[rank]));
                            }
                        }
                    }
                    roots += 1;
                }
                if n > 1 { layout = next_rooted(&valid, None); }
            }
            assert_eq!(trees, expected[n]);
            assert_eq!(roots, expected[n] * n as u64);
            for rank in 0..16 {
                if let Some((ref bad_layout, bad_root, t0, bad_value)) = first_negative[rank] {
                    eprintln!(
                        "FIRST_NEGATIVE n={n} layout={bad_layout:?} root={bad_root} t0={t0} delta={rank} value={bad_value}"
                    );
                }
                total_negative[rank] += negative[rank];
            }
            println!(
                "core_n={n} trees={trees} roots={roots} minima={minima:?} negative_counts={negative:?}"
            );
            total_trees += trees;
            total_roots += roots;
        }
        println!(
            "totals trees={total_trees} roots={total_roots} negative_counts={total_negative:?}"
        );
        println!("PASS_EXACT_RANK8_TERMINAL_FULL_SHIFTED_Q8_CENSUS_N{first}_THROUGH_N{last}");
    }
}

fn main() {
    base::scan();
}
