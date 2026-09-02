#!/usr/bin/env python3
"""Probe three star-sharp sufficient lemmas for terminal block payment."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

import networkx as nx


def add(first: list[int], second: list[int]) -> list[int]:
    size = max(len(first), len(second))
    return [
        (first[index] if index < len(first) else 0)
        + (second[index] if index < len(second) else 0)
        for index in range(size)
    ]


def multiply(first: list[int], second: list[int]) -> list[int]:
    answer = [0] * (len(first) + len(second) - 1)
    for left, a in enumerate(first):
        for right, b in enumerate(second):
            answer[left + right] += a * b
    return answer


def shift(first: list[int]) -> list[int]:
    return [0] + first


def independence_polynomial(graph: nx.Graph) -> list[int]:
    """Exact forest DP, with a defensive cycle assertion."""
    if graph.number_of_nodes() == 0:
        return [1]
    assert nx.is_forest(graph)
    total = [1]
    seen: set[int] = set()

    def component(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in graph.neighbors(vertex):
            if child == parent:
                continue
            child_excluded, child_included = component(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, included

    for vertex in graph:
        if vertex in seen:
            continue
        excluded, included = component(vertex, None)
        total = multiply(total, add(excluded, included))
    return total


def one_edge_sequence(graph: nx.Graph) -> list[int]:
    """s_r: (r+1)-subsets inducing exactly one edge."""
    result = [0] * (graph.number_of_nodes() + 1)
    all_vertices = set(graph)
    for left, right in graph.edges():
        forbidden = (
            {left, right}
            | set(graph.neighbors(left))
            | set(graph.neighbors(right))
        )
        residual = graph.subgraph(all_vertices - forbidden).copy()
        polynomial = independence_polynomial(residual)
        for rank_minus_one, count in enumerate(polynomial):
            result[rank_minus_one + 1] += count
    return result


def coefficient(values: list[int], rank: int) -> int:
    return values[rank] if 0 <= rank < len(values) else 0


def isolate_transform(values: list[int], isolates: int) -> list[int]:
    return multiply(values, [comb(isolates, k) for k in range(isolates + 1)])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=2)
    parser.add_argument("--max-order", type=int, default=11)
    parser.add_argument("--min-t", type=int, default=1)
    parser.add_argument("--max-t", type=int, default=5)
    parser.add_argument("--min-j", type=int, default=3)
    parser.add_argument("--tree-start", type=int, default=0)
    parser.add_argument("--tree-stop", type=int)
    parser.add_argument("--adverse-only", action="store_true")
    args = parser.parse_args()

    names = (
        "A_weight_shadow",
        "B_anchor_upper_A3_plus_f2",
        "B_strong_anchor_upper_A3",
        "C_included_slack_lower",
        "AB_pair",
        "AC_pair",
        "BC_pair",
        "ABC_full_payment",
        "ABC_star_ratio_strengthening",
        "D_anchor_K2_upper",
        "E_combined_slack_K2_floor",
        "F_q3_induction_plus_rooted_reserve_payment",
        "G_q3_induction_only_payment",
        "H_coarse_high_coefficient_elimination",
        "I_h_shadow_high_coefficient_elimination",
        "J_exact_fjp1_full_shadow_elimination",
        "K_component_full_shadow_elimination",
        "L_rooted_endpoint_full_shadow_elimination",
        "M_containment_rooted_endpoint_full_shadow_elimination",
        "N_root_deletion_rank2_ratio",
        "O_rank2_endpoint_full_shadow_elimination",
        "P_incidence_full_shadow_elimination",
        "Q_incidence_rooted_endpoint_full_shadow_elimination",
        "R_coupled_incidence_full_shadow_elimination",
        "S_coupled_incidence_rooted_endpoint_elimination",
    )
    failures = {name: None for name in names}
    failure_counts = {name: 0 for name in names}
    failure_rank_ranges: dict[str, list[int] | None] = {name: None for name in names}
    minima: dict[str, tuple[Fraction, tuple] | None] = {name: None for name in names}
    checks = 0

    for order in range(args.min_order, args.max_order + 1):
        tree_count = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            if tree_index < args.tree_start:
                continue
            if args.tree_stop is not None and tree_index >= args.tree_stop:
                break
            tree_count += 1
            g_poly = independence_polynomial(tree)
            g_s = one_edge_sequence(tree)
            for root in tree:
                f_graph = tree.copy()
                f_graph.remove_node(root)
                h_graph = tree.copy()
                h_graph.remove_nodes_from({root, *tree.neighbors(root)})
                f = independence_polynomial(f_graph)
                h = independence_polynomial(h_graph)
                z = one_edge_sequence(f_graph)
                f2 = coefficient(f, 2)
                if not f2:
                    continue
                z2 = coefficient(z, 2)
                h2 = coefficient(h, 2)
                for t in range(args.min_t, args.max_t + 1):
                    a = isolate_transform(g_poly, t)
                    c0_sequence = isolate_transform(g_s, t)
                    a3 = coefficient(a, 3)
                    c0 = coefficient(c0_sequence, 3)
                    c1 = z2 + h2 + t * f2
                    u = a3 * c1 - f2 * c0
                    assert u >= 0
                    for j in range(args.min_j, len(f)):
                        fj = coefficient(f, j)
                        if not fj:
                            continue
                        aj1 = coefficient(a, j + 1)
                        zj = coefficient(z, j)
                        hj = coefficient(h, j)
                        c_target = zj + hj + t * fj
                        m1 = (j + 1) * c1 * fj - 3 * f2 * c_target
                        v = a3 * fj - f2 * aj1
                        k2 = 2 * f2 - z2
                        q_slack = j * z2 * fj - 2 * f2 * zj
                        f3 = coefficient(f, 3)
                        z3 = coefficient(z, 3)
                        rank3_q_margin = 3 * z2 * f3 - 2 * f2 * z3
                        p_weight = a3 * (a3 + f2)
                        q_weight = 2 * (j + 1) * u
                        low_l_without_rank3 = (
                            2 * (j + 1) * h2
                            + (j - 2) * k2
                            + 2 * (j - 2) * (t - 1) * f2
                        )
                        coarse_high_margin = (
                            p_weight
                            * (
                                j * rank3_q_margin
                                + f3 * low_l_without_rank3
                            )
                            + f3 * q_weight * (t * f2 - a3)
                        )
                        if q_weight < 6 * p_weight:
                            coarse_high_margin += (
                                f3 * f2 * (q_weight - 6 * p_weight)
                            )
                        h_order = h_graph.number_of_nodes()
                        h_shadow_margin = Fraction(
                            p_weight
                            * (
                                j * rank3_q_margin
                                + f3 * low_l_without_rank3
                            )
                            + f3 * q_weight * (t * f2 - a3),
                            1,
                        )
                        if j <= h_order:
                            h_factor = Fraction(
                                h_order - j + 1 + t * j,
                                h_order - j + 1,
                            )
                            h_coefficient = (
                                f3
                                * f2
                                * (q_weight * h_factor - 6 * p_weight)
                            )
                            if h_coefficient < 0:
                                h_shadow_margin += h_coefficient
                        forest_order = f_graph.number_of_nodes()
                        components = nx.number_connected_components(f_graph)

                        # Every lower layer of a simplicial complex is bounded
                        # below by double-counting containments with its j-layer.
                        # Retain f_(j+1) exactly in the first bound, then replace
                        # it in the second by the forest edge floor
                        #   (j+1) f_(j+1) >= (components-j)_+ f_j.
                        f_down = Fraction(0)
                        for isolates_used in range(1, min(t, j + 1) + 1):
                            lower_rank = j + 1 - isolates_used
                            f_down += Fraction(
                                comb(t, isolates_used)
                                * comb(j, lower_rank),
                                comb(
                                    forest_order - lower_rank,
                                    j - lower_rank,
                                ),
                            ) * fj
                        h_shadow_factor = Fraction(0)
                        if j <= h_order:
                            for isolates_used in range(0, min(t, j) + 1):
                                lower_rank = j - isolates_used
                                h_shadow_factor += Fraction(
                                    comb(t, isolates_used)
                                    * comb(j, lower_rank),
                                    comb(
                                        h_order - lower_rank,
                                        j - lower_rank,
                                    ),
                                )
                        h_down = h_shadow_factor * hj
                        fjp1 = coefficient(f, j + 1)
                        a_lower_exact_fjp1 = Fraction(fjp1) + f_down + h_down
                        a_lower_component = (
                            Fraction(max(components - j, 0), j + 1) * fj
                            + f_down
                            + h_down
                        )
                        extension_floor = max(
                            components - j,
                            forest_order - 3 * j,
                            0,
                        )
                        a_lower_incidence = (
                            Fraction(extension_floor, j + 1) * fj
                            + f_down
                            + h_down
                        )
                        a_lower_coupled_incidence = (
                            Fraction(forest_order - 3 * j + 2, j + 1) * fj
                            - Fraction(2, j + 1) * hj
                            + f_down
                            + h_down
                        )
                        rooted_reserve = (
                            (2 * (j + 1) * h2 + (j - 2) * k2) * fj
                            - 6 * hj * f2
                        )
                        q3_reduced_core = (
                            j * rank3_q_margin * fj
                            + f3 * rooted_reserve
                            + 2 * (j - 2) * (t - 1) * f2 * fj * f3
                        )
                        exact_fjp1_shadow_margin = (
                            p_weight * q3_reduced_core
                            - 2 * f3 * (j + 1) * u
                            * (a3 * fj - f2 * a_lower_exact_fjp1)
                        )
                        component_shadow_margin = (
                            p_weight * q3_reduced_core
                            - 2 * f3 * (j + 1) * u
                            * (a3 * fj - f2 * a_lower_component)
                        )
                        incidence_shadow_margin = (
                            p_weight * q3_reduced_core
                            - 2 * f3 * (j + 1) * u
                            * (a3 * fj - f2 * a_lower_incidence)
                        )
                        coupled_incidence_shadow_margin = (
                            p_weight * q3_reduced_core
                            - 2 * f3 * (j + 1) * u
                            * (
                                a3 * fj
                                - f2 * a_lower_coupled_incidence
                            )
                        )
                        rooted_budget = (
                            2 * (j + 1) * h2 + (j - 2) * k2
                        )
                        f_shadow_factor = (
                            Fraction(max(components - j, 0), j + 1)
                            + f_down / fj
                        )
                        f_incidence_shadow_factor = (
                            Fraction(extension_floor, j + 1)
                            + f_down / fj
                        )
                        f_coupled_shadow_factor = (
                            Fraction(forest_order - 3 * j + 2, j + 1)
                            + f_down / fj
                        )
                        h_coupled_shadow_factor = (
                            h_shadow_factor - Fraction(2, j + 1)
                        )
                        endpoint_zero = (
                            p_weight
                            * (
                                j * rank3_q_margin
                                + f3 * rooted_budget
                                + 2 * (j - 2) * (t - 1) * f2 * f3
                            )
                            - 2 * f3 * (j + 1) * u
                            * (a3 - f2 * f_shadow_factor)
                        )
                        if j <= h_order:
                            h_ratio_upper = Fraction(rooted_budget, 6 * f2)
                            endpoint_reserve_zero = endpoint_zero + (
                                2 * f2 * f3
                                * (
                                    (j + 1) * u * h_shadow_factor
                                    - 3 * p_weight
                                )
                                * h_ratio_upper
                            )
                            rooted_endpoint_margin = min(
                                endpoint_zero, endpoint_reserve_zero
                            )
                            containment_ratio_upper = min(
                                Fraction(1), h_ratio_upper
                            )
                            endpoint_containment = endpoint_zero + (
                                2 * f2 * f3
                                * (
                                    (j + 1) * u * h_shadow_factor
                                    - 3 * p_weight
                                )
                                * containment_ratio_upper
                            )
                            containment_endpoint_margin = min(
                                endpoint_zero, endpoint_containment
                            )
                            rank2_ratio_upper = min(
                                containment_ratio_upper,
                                Fraction(h2, f2),
                            )
                            endpoint_rank2 = endpoint_zero + (
                                2 * f2 * f3
                                * (
                                    (j + 1) * u * h_shadow_factor
                                    - 3 * p_weight
                                )
                                * rank2_ratio_upper
                            )
                            rank2_endpoint_margin = min(
                                endpoint_zero, endpoint_rank2
                            )
                            incidence_endpoint_zero = (
                                endpoint_zero
                                + 2 * f3 * (j + 1) * u * f2
                                * (
                                    f_incidence_shadow_factor
                                    - f_shadow_factor
                                )
                            )
                            incidence_endpoint_reserve_zero = (
                                incidence_endpoint_zero
                                + 2 * f2 * f3
                                * (
                                    (j + 1) * u * h_shadow_factor
                                    - 3 * p_weight
                                )
                                * h_ratio_upper
                            )
                            incidence_rooted_endpoint_margin = min(
                                incidence_endpoint_zero,
                                incidence_endpoint_reserve_zero,
                            )
                            coupled_endpoint_zero = (
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                )
                                - 2 * f3 * (j + 1) * u
                                * (
                                    a3
                                    - f2 * f_coupled_shadow_factor
                                )
                            )
                            coupled_endpoint_reserve_zero = (
                                coupled_endpoint_zero
                                + 2 * f2 * f3
                                * (
                                    (j + 1) * u
                                    * h_coupled_shadow_factor
                                    - 3 * p_weight
                                )
                                * h_ratio_upper
                            )
                            coupled_rooted_endpoint_margin = min(
                                coupled_endpoint_zero,
                                coupled_endpoint_reserve_zero,
                            )
                        else:
                            rooted_endpoint_margin = endpoint_zero
                            containment_endpoint_margin = endpoint_zero
                            rank2_endpoint_margin = endpoint_zero
                            incidence_endpoint_zero = (
                                endpoint_zero
                                + 2 * f3 * (j + 1) * u * f2
                                * (
                                    f_incidence_shadow_factor
                                    - f_shadow_factor
                                )
                            )
                            incidence_rooted_endpoint_margin = (
                                incidence_endpoint_zero
                            )
                            coupled_endpoint_zero = (
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                )
                                - 2 * f3 * (j + 1) * u
                                * (
                                    a3
                                    - f2 * f_coupled_shadow_factor
                                )
                            )
                            coupled_rooted_endpoint_margin = (
                                coupled_endpoint_zero
                            )
                        if args.adverse_only and not (u > 0 and v > 0):
                            continue
                        checks += 1

                        margins = {
                            "A_weight_shadow":
                                (j - 2) * a3 * fj - (j + 1) * v,
                            "B_anchor_upper_A3_plus_f2":
                                (a3 + f2) * f2 - u,
                            "B_strong_anchor_upper_A3": a3 * f2 - u,
                            "C_included_slack_lower":
                                m1 - (j - 2) * f2 * fj,
                            "AB_pair":
                                (j - 2) * a3 * fj * (a3 + f2) * f2
                                - (j + 1) * u * v,
                            "AC_pair":
                                a3 * m1 - (j + 1) * v * f2,
                            "BC_pair":
                                (a3 + f2) * m1 - (j - 2) * u * fj,
                            "ABC_full_payment":
                                a3 * (a3 + f2) * m1 - (j + 1) * u * v,
                            "ABC_star_ratio_strengthening":
                                order * a3 * (a3 + f2) * m1
                                - (order + 3) * (j + 1) * u * v,
                            "D_anchor_K2_upper":
                                (a3 + f2) * k2 - 2 * u,
                            "E_combined_slack_K2_floor":
                                3 * q_slack + rooted_reserve
                                - (j - 2) * k2 * fj,
                            "F_q3_induction_plus_rooted_reserve_payment":
                                a3 * (a3 + f2)
                                * (
                                    j * rank3_q_margin * fj
                                    + f3 * rooted_reserve
                                    + 2 * (j - 2) * (t - 1) * f2 * fj * f3
                                )
                                - 2 * f3 * (j + 1) * u * v,
                            "G_q3_induction_only_payment":
                                a3 * (a3 + f2)
                                * (
                                    j * rank3_q_margin * fj
                                    + 2 * (j - 2) * (t - 1) * f2 * fj * f3
                                )
                                - 2 * f3 * (j + 1) * u * v,
                            "H_coarse_high_coefficient_elimination":
                                coarse_high_margin,
                            "I_h_shadow_high_coefficient_elimination":
                                h_shadow_margin,
                            "J_exact_fjp1_full_shadow_elimination":
                                exact_fjp1_shadow_margin,
                            "K_component_full_shadow_elimination":
                                component_shadow_margin,
                            "L_rooted_endpoint_full_shadow_elimination":
                                rooted_endpoint_margin,
                            "M_containment_rooted_endpoint_full_shadow_elimination":
                                containment_endpoint_margin,
                            "N_root_deletion_rank2_ratio":
                                h2 * fj - f2 * hj,
                            "O_rank2_endpoint_full_shadow_elimination":
                                rank2_endpoint_margin,
                            "P_incidence_full_shadow_elimination":
                                incidence_shadow_margin,
                            "Q_incidence_rooted_endpoint_full_shadow_elimination":
                                incidence_rooted_endpoint_margin,
                            "R_coupled_incidence_full_shadow_elimination":
                                coupled_incidence_shadow_margin,
                            "S_coupled_incidence_rooted_endpoint_elimination":
                                coupled_rooted_endpoint_margin,
                        }
                        scales = {
                            "A_weight_shadow": max(1, (j - 2) * a3 * fj),
                            "B_anchor_upper_A3_plus_f2": max(1, (a3 + f2) * f2),
                            "B_strong_anchor_upper_A3": max(1, a3 * f2),
                            "C_included_slack_lower": max(1, (j - 2) * f2 * fj),
                            "AB_pair": max(
                                1, (j - 2) * a3 * fj * (a3 + f2) * f2
                            ),
                            "AC_pair": max(1, a3 * m1),
                            "BC_pair": max(1, (a3 + f2) * m1),
                            "ABC_full_payment": max(1, a3 * (a3 + f2) * m1),
                            "ABC_star_ratio_strengthening": max(
                                1, order * a3 * (a3 + f2) * m1
                            ),
                            "D_anchor_K2_upper": max(1, (a3 + f2) * k2),
                            "E_combined_slack_K2_floor": max(
                                1, (j - 2) * k2 * fj
                            ),
                            "F_q3_induction_plus_rooted_reserve_payment": max(
                                1,
                                a3 * (a3 + f2)
                                * (
                                    j * rank3_q_margin * fj
                                    + f3 * rooted_reserve
                                    + 2 * (j - 2) * (t - 1) * f2 * fj * f3
                                ),
                            ),
                            "G_q3_induction_only_payment": max(
                                1,
                                a3 * (a3 + f2)
                                * (
                                    j * rank3_q_margin * fj
                                    + 2 * (j - 2) * (t - 1) * f2 * fj * f3
                                ),
                            ),
                            "H_coarse_high_coefficient_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * low_l_without_rank3
                                )
                                + f3 * q_weight * max(0, t * f2 - a3),
                            ),
                            "I_h_shadow_high_coefficient_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * low_l_without_rank3
                                ),
                            ),
                            "J_exact_fjp1_full_shadow_elimination": max(
                                1, p_weight * q3_reduced_core
                            ),
                            "K_component_full_shadow_elimination": max(
                                1, p_weight * q3_reduced_core
                            ),
                            "L_rooted_endpoint_full_shadow_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                ),
                            ),
                            "M_containment_rooted_endpoint_full_shadow_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                ),
                            ),
                            "N_root_deletion_rank2_ratio": max(1, h2 * fj),
                            "O_rank2_endpoint_full_shadow_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                ),
                            ),
                            "P_incidence_full_shadow_elimination": max(
                                1, p_weight * q3_reduced_core
                            ),
                            "Q_incidence_rooted_endpoint_full_shadow_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                ),
                            ),
                            "R_coupled_incidence_full_shadow_elimination": max(
                                1, p_weight * q3_reduced_core
                            ),
                            "S_coupled_incidence_rooted_endpoint_elimination": max(
                                1,
                                p_weight
                                * (
                                    j * rank3_q_margin
                                    + f3 * rooted_budget
                                    + 2 * (j - 2) * (t - 1) * f2 * f3
                                ),
                            ),
                        }
                        witness = (
                            order, tree_index, root, t, j,
                            nx.to_graph6_bytes(tree, header=False).decode().strip(),
                        )
                        for name, margin in margins.items():
                            ratio = Fraction(margin, scales[name])
                            if minima[name] is None or ratio < minima[name][0]:
                                minima[name] = (ratio, witness + (margin, scales[name]))
                            if margin < 0 and failures[name] is None:
                                failures[name] = witness + (margin, scales[name])
                            if margin < 0:
                                failure_counts[name] += 1
                                if failure_rank_ranges[name] is None:
                                    failure_rank_ranges[name] = [j, j]
                                else:
                                    failure_rank_ranges[name][0] = min(
                                        failure_rank_ranges[name][0], j
                                    )
                                    failure_rank_ranges[name][1] = max(
                                        failure_rank_ranges[name][1], j
                                    )
        print(f"n={order}: trees={tree_count:,} checks={checks:,}", flush=True)

    print("failures:")
    for name in names:
        print(
            name,
            failures[name],
            "count=", failure_counts[name],
            "rank_range=", failure_rank_ranges[name],
        )
    print("minima:")
    for name in names:
        print(name, minima[name])


if __name__ == "__main__":
    main()
