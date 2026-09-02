// Exact low-memory WROM census of Delta^0 through Delta^3 at core order 27.
// The tree generator and polynomial arithmetic are inherited verbatim from
// the audited finite rank-eight checker.

mod base {
    include!("verify_rank8_terminal_delta5_finite.rs");

    fn deltas03(c: [i128; 10], h: [i128; 10]) -> [i128; 4] {
        let mut values: Vec<i128> = (1..=4).map(|t| residual(c, h, t)).collect();
        let mut out = [0i128; 4];
        out[0] = values[0];
        for rank in 1..=3 {
            values = values.windows(2).map(|pair| pair[1] - pair[0]).collect();
            out[rank] = values[0];
        }
        out
    }

    pub fn scan() {
        let n: usize = 27;
        let expected: u64 = 751_065_460;
        let mut layout: Option<Vec<usize>> =
            Some((0..=n / 2).chain(1..((n + 1) / 2)).collect());
        let mut trees = 0u64;
        let mut roots = 0u64;
        let mut active = 0u64;
        let mut minima = [i128::MAX; 4];
        let mut minimum_witnesses: [Option<(Vec<usize>, usize)>; 4] =
            std::array::from_fn(|_| None);
        let mut active_minima = [i128::MAX; 4];
        let mut negative_counts = [0u64; 4];
        let mut first_negative: [Option<(Vec<usize>, usize, i128)>; 4] =
            std::array::from_fn(|_| None);

        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
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
                let values = deltas03(core, deleted);
                for rank in 0..=3 {
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
                    for rank in 0..=3 {
                        active_minima[rank] = active_minima[rank].min(values[rank]);
                    }
                }
                roots += 1;
            }
            layout = next_rooted(&valid, None);
        }

        assert_eq!(trees, expected);
        assert_eq!(roots, expected * n as u64);
        for rank in 0..=3 {
            if let Some((ref bad_layout, bad_root, bad_value)) = first_negative[rank] {
                eprintln!(
                    "FIRST_NEGATIVE n={n} layout={bad_layout:?} root={bad_root} delta={rank} value={bad_value}"
                );
            }
            if minima[rank] < 0 {
                let (ref witness_layout, witness_root) = minimum_witnesses[rank]
                    .as_ref()
                    .expect("a negative minimum has a witness");
                eprintln!(
                    "MINIMUM_WITNESS n={n} layout={witness_layout:?} root={witness_root} delta={rank} value={}",
                    minima[rank]
                );
            }
        }
        let active_text: Vec<String> = if active == 0 {
            (0..4).map(|_| "NA".to_string()).collect()
        } else {
            active_minima.iter().map(|value| value.to_string()).collect()
        };
        println!(
            "core_n={n} trees={trees} roots={roots} active={active} minima={minima:?} active_minima={active_text:?} negative_counts={negative_counts:?}"
        );
        println!("PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27");
    }
}

fn main() {
    base::scan();
}

