// Exact WROM audit of the joint (A,A-q,J) inequalities on rooted trees.
// This is a data audit of the proved inequalities, not the all-order proof.
mod base {
    include!("verify_rank7_terminal_broom_finite.rs");

    fn audit_order(n: usize) {
        let expected: [u64; 21] = [
            0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
            3159, 7741, 19320, 48629, 123867, 317955, 823065,
        ];
        let mut layout: Option<Vec<usize>> = Some(
            (0..=n / 2)
                .chain(1..((n + 1) / 2))
                .collect(),
        );
        let mut trees = 0u64;
        let mut roots = 0u64;
        let mut minimum_slacks = [i128::MAX; 11];
        while let Some(candidate) = layout {
            layout = next_tree(&candidate);
            let valid = match layout.clone() {
                Some(value) => value,
                None => break,
            };
            let adjacency_list = adjacency(&valid);
            let mut memo = vec![None; n * n];
            let state = root(0, &adjacency_list, &mut memo);
            let core = add(state.excluded, state.included);
            let b2: i128 = adjacency_list
                .iter()
                .map(|neighbors| {
                    let x = neighbors.len().saturating_sub(1) as i128;
                    x * (x - 1) / 2
                })
                .sum();
            let wedge2: i128 = adjacency_list
                .iter()
                .map(|neighbors| choose(neighbors.len(), 2))
                .sum();
            let degree3: i128 = adjacency_list
                .iter()
                .map(|neighbors| choose(neighbors.len(), 3))
                .sum();
            let edge_moment: i128 = adjacency_list
                .iter()
                .enumerate()
                .map(|(v, neighbors)| {
                    neighbors
                        .iter()
                        .filter(|u| v < **u)
                        .map(|u| {
                            (neighbors.len() as i128 - 1)
                                * (adjacency_list[*u].len() as i128 - 1)
                        })
                        .sum::<i128>()
                })
                .sum();
            assert_eq!(wedge2, b2 + n as i128 - 2);
            let c4_identity = choose(n, 4)
                - (n as i128 - 1) * choose(n - 2, 2)
                + choose(n - 1, 2)
                + (n as i128 - 4) * wedge2
                - degree3
                - edge_moment;
            assert_eq!(core[4], c4_identity);
            let kappa = ((n * n * n - 8 * n * n - 19 * n + 302) / 6) as i128;
            let core_slack = 5 * (n as i128 - 3) * core[5]
                - (n as i128 - 7) * (n as i128 - 8) * core[4]
                - kappa * b2;
            assert!(core_slack >= 0);
            minimum_slacks[0] = minimum_slacks[0].min(core_slack);
            trees += 1;
            for q in 0..n {
                let rooted = root(q, &adjacency_list, &mut memo);
                let h5 = rooted.excluded[5];
                let h6 = rooted.excluded[6];
                let a = rooted.included[5]; // x*i_4(J)
                let b = rooted.included[6]; // x*i_5(J)
                let m = n - adjacency_list[q].len() - 1;
                let neighbor_mass: usize = adjacency_list[q]
                    .iter()
                    .map(|u| adjacency_list[*u].len() - 1)
                    .sum();
                let e_j = m - neighbor_mass;
                let e4 = choose(m, 4) - a;
                let e5 = choose(m, 5) - b;

                // 3 E5 <= (m-4) E4 <= 5 E5.
                if m >= 5 {
                    let incidence = (m as i128 - 4) * e4;
                    let lower_slack = incidence - 3 * e5;
                    let upper_slack = 5 * e5 - incidence;
                    assert!(lower_slack >= 0 && upper_slack >= 0);
                    minimum_slacks[1] = minimum_slacks[1].min(lower_slack);
                    minimum_slacks[2] = minimum_slacks[2].min(upper_slack);
                }

                // Universal extension ceilings for J and H=A-q.
                if m >= 5 {
                    let slack = (m as i128 - 4) * a - 5 * b;
                    assert!(slack >= 0);
                    minimum_slacks[3] = minimum_slacks[3].min(slack);
                }
                let h_upper_slack = (n as i128 - 6) * h5 - 6 * h6;
                assert!(h_upper_slack >= 0);
                minimum_slacks[4] = minimum_slacks[4].min(h_upper_slack);

                // Sharp forest rank-(4,5) path-ratio lower bounds.
                if m >= 18 {
                    let slack = 5 * (m as i128 - 3) * b
                        - (m as i128 - 7) * (m as i128 - 8) * a;
                    assert!(slack >= 0);
                    minimum_slacks[5] = minimum_slacks[5].min(slack);
                }

                // Edge--bad-4-set incidence in the forest J.
                if m >= 4 {
                    let incidence = e_j as i128 * choose(m - 2, 2);
                    let edge_lower_slack = incidence - e4;
                    let edge_upper_slack = 3 * e4 - incidence;
                    assert!(edge_lower_slack >= 0 && edge_upper_slack >= 0);
                    minimum_slacks[6] = minimum_slacks[6].min(edge_lower_slack);
                    minimum_slacks[7] = minimum_slacks[7].min(edge_upper_slack);
                }

                // Root-neighbor branching decomposition, after dropping the
                // nonnegative deeper/J contributions.
                let root_term = {
                    let x = adjacency_list[q].len().saturating_sub(1) as i128;
                    x * (x - 1) / 2
                };
                let neighbor_term: i128 = adjacency_list[q]
                    .iter()
                    .map(|u| {
                        let x = adjacency_list[*u].len().saturating_sub(1) as i128;
                        x * (x - 1) / 2
                    })
                    .sum();
                let branch_slack = b2 - root_term - neighbor_term;
                assert!(branch_slack >= 0);
                minimum_slacks[8] = minimum_slacks[8].min(branch_slack);

                // Rooted lower bound for B3x+E.  Here
                // B3x=sum C(deg-1,3), while degree3=sum C(deg,3).
                let b3x = degree3 - b2;
                let root_b3_term = choose(adjacency_list[q].len().saturating_sub(1), 3);
                let neighbor_b3_term: i128 = adjacency_list[q]
                    .iter()
                    .map(|u| choose(adjacency_list[*u].len().saturating_sub(1), 3))
                    .sum();
                let forced_edge_term = (adjacency_list[q].len().saturating_sub(1) as i128)
                    * neighbor_mass as i128;
                let b3e_slack = b3x + edge_moment
                    - root_b3_term - neighbor_b3_term - forced_edge_term;
                assert!(b3e_slack >= 0);
                minimum_slacks[9] = minimum_slacks[9].min(b3e_slack);

                // Literal induced-subgraph containment J subset H.
                let containment_slack = h5 - b;
                assert!(containment_slack >= 0);
                minimum_slacks[10] = minimum_slacks[10].min(containment_slack);
                roots += 1;
            }
            layout = next_rooted(&valid, None);
        }
        assert_eq!(trees, expected[n]);
        assert_eq!(roots, trees * n as u64);
        println!(
            "order={n} trees={trees} roots={roots} minimum_slacks={:?}",
            minimum_slacks
        );
        // Preserve the exact obstruction to the tempting but false shifted
        // H rank-(5,6) path-ratio shortcut.
        if n == 19 {
            let h5 = 2232i128;
            let h6 = 2083i128;
            let false_ratio_slack = 5 * 15 * h6 - 11 * 10 * h5;
            assert_eq!(false_ratio_slack, -89295);
        }
    }

    pub fn run(first: usize, last: usize) {
        assert!(18 <= first && first <= last && last <= 20);
        for n in first..=last {
            audit_order(n);
        }
        println!("PASS_EXACT_JOINT_BRANCHING_SURPLUS_ROOTED_TREE_AUDIT");
    }
}

fn main() {
    let arguments: Vec<String> = std::env::args().collect();
    let first = arguments.get(1).and_then(|x| x.parse().ok()).unwrap_or(18);
    let last = arguments.get(2).and_then(|x| x.parse().ok()).unwrap_or(19);
    base::run(first, last);
}
