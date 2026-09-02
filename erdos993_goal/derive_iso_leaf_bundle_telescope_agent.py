#!/usr/bin/env python3
"""Derive and replay the exact all-at-once leaf-bundle telescope for N.

The algebraic identities are exact.  The final positivity test on forests is
finite evidence only; the general Bundle Payment Lemma remains conjectural.
"""

from __future__ import annotations

import itertools
import json
from fractions import Fraction
from math import comb

import networkx as nx
import sympy as sp

from derive_iso_nested_compact_operator_root import symbols, w, z
from derive_iso_third_leaf_compact_operator_root import defect_form, nested
from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6, poly_forest
from probe_iso_nested_near_diagonal_root import nested2


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def symbolic_common_factor_identity() -> dict[str, str]:
    value = tuple(symbols(f"C{name}") for name in "EUVW")
    hz, hw, dhz, dhw = sp.symbols("hz hw dhz dhw")

    def multiply(state: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
        az, aw, daz, daw = state
        return (
            hz * az,
            hw * aw,
            dhz * az + hz * daz,
            dhw * aw + hw * daw,
        )

    multiplied = tuple(multiply(state) for state in value)
    # Clearing the divided-difference denominator proves
    # N(hT)=h(z)h(w)N(T)-delta*H_h R(T)/2 exactly.
    cleared = sp.expand(
        (w - z) * (nested(multiplied) - hz * hw * nested(value))
        + (z - w) ** 2
        * (dhz * hw - hz * dhw)
        * defect_form(value)
        / 2
    )
    assert cleared == 0
    return {
        "common_factor_N": (
            "N(hT)=h(z)h(w)N(T)-(z-w)^2 H_h(z,w)R(T)/2, "
            "H_h=[h'(z)h(w)-h(z)h'(w)]/(w-z)"
        ),
        "common_factor_R": "R(hT)=h(z)h(w)R(T)",
        "isolate_power": (
            "For A=(1+z)(1+w), N((1+x)^tT)=A^tN(T)-"
            "t(z-w)^2A^(t-1)R(T)/2"
        ),
    }


def kernel_coefficient_proof(max_m: int = 50) -> dict[str, object]:
    minimum_p = None
    minimum_j = None
    checks = 0
    for m in range(1, max_m + 1):
        for i in range(0, m + 1):
            for j in range(0, m + 1):
                p_subtracted = sum(
                    choose(t, i - 1) * choose(t, j - 1)
                    for t in range(0, m)
                )
                # h_M=(1+x)^M-1 has zero constant coefficient.  Thus
                # h_M(z)h_M(w), and hence P_M, has no coefficient on either
                # coordinate axis.  The binomial formula below applies only
                # when both indices are positive.
                p = (
                    choose(m, i) * choose(m, j) - p_subtracted
                    if i >= 1 and j >= 1
                    else 0
                )
                assert p >= 0

                j_subtracted = (
                    sum(
                        t * choose(t - 1, i - 1) * choose(t - 1, j - 1)
                        for t in range(1, m)
                    )
                    if i >= 1 and j >= 1
                    else 0
                )
                j_value = m * (
                    choose(m - 1, i) * choose(m - 1, j)
                    + choose(m - 1, i + j + 1)
                ) - j_subtracted
                assert j_value >= 0
                minimum_p = p if minimum_p is None else min(minimum_p, p)
                minimum_j = j_value if minimum_j is None else min(minimum_j, j_value)
                checks += 1
    return {
        "checked_M": [1, max_m],
        "coefficient_pairs": checks,
        "minimum_P_coefficient": minimum_p,
        "minimum_J_coefficient": minimum_j,
        "P_formula": (
            "[z^i w^j]P_M=0 if i=0 or j=0; for i,j>=1 it is "
            "C(M,i)C(M,j)-sum_(t=0)^(M-1)C(t,i-1)C(t,j-1)>=0"
        ),
        "P_proof": (
            "C(t,j-1)<=C(M,j) and sum_t C(t,i-1)=C(M,i)"
        ),
        "J_formula": (
            "[z^i w^j]J_M=M[C(M-1,i)C(M-1,j)+C(M-1,i+j+1)]-"
            "sum_(t=1)^(M-1)tC(t-1,i-1)C(t-1,j-1)>=0"
        ),
        "J_proof": (
            "The subtracted sum is at most C(M-1,j)*i*C(M,i+1), "
            "which is at most M*C(M-1,i)C(M-1,j); the second positive "
            "Vandermonde term is unused."
        ),
    }


def unique_telescoping_weights(max_m: int = 20) -> dict[str, object]:
    """Prove that a complete-gap telescope has uniquely unit weights."""
    for number in range(1, max_m + 1):
        weights = sp.symbols(f"a1:{number + 1}")
        # If g_j=X_j-X_(j-1)-L_(j-1), matching
        # X_M-X_0-sum L_j gives the following coefficient equations.
        equations = [weights[-1] - 1, weights[0] - 1]
        equations.extend(weights[index] - weights[index + 1] for index in range(number - 1))
        equations.extend(weight - 1 for weight in weights)  # lower L coefficients
        solution = sp.solve(equations, weights, dict=True)
        assert solution == [{weight: 1 for weight in weights}]
    return {
        "identity": (
            "Gamma_M=sum_(j=1)^M G_j, where "
            "G_j=N(B_j)-N(B_(j-1))-zwN(C union (j-1)K1)"
        ),
        "uniqueness": (
            "In any linear combination sum a_j G_j that has endpoints "
            "N(B_M)-N(B_0), cancellation of each intermediate N(B_j) "
            "forces a_M=1 and a_j=a_(j+1), hence every a_j=1.  Matching "
            "the lower terms gives the same condition."
        ),
        "conclusion": (
            "The positive-weight complete-gap representation is exact but "
            "circular: it assumes precisely the individual FML gaps that the "
            "bundle telescope was meant to avoid."
        ),
        "nonnegative_state_residual": (
            "Even if Gamma-sum a_jG_j may be a nonnegative combination of "
            "all intermediate N(B_j) and lower N(C union jK1) states, its "
            "coefficients require a_M<=1, a_1>=1, "
            "a_(j+1)>=a_j, and a_j>=1.  Hence "
            "1>=a_M>=...>=a_1>=1, so all a_j=1 and every residual "
            "coefficient is zero."
        ),
        "symbolic_sizes_checked": [1, max_m],
    }


def minor_rows(graph: nx.Graph, marks: tuple[int, int]) -> tuple[tuple[int, ...], ...]:
    u, v = marks
    result = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(tuple(poly_forest(reduced)))
    return tuple(result)


def row_convolution(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return tuple(result)


def add_minor_rows(
    left: tuple[tuple[int, ...], ...], right: tuple[tuple[int, ...], ...]
) -> tuple[tuple[int, ...], ...]:
    result = []
    for a, b in zip(left, right):
        row = [0] * max(len(a), len(b))
        for index, value in enumerate(a):
            row[index] += value
        for index, value in enumerate(b):
            row[index] += value
        result.append(tuple(row))
    return tuple(result)


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def r_coefficient(rows: tuple[tuple[int, ...], ...], a: int, b: int) -> int:
    E, U, V, W = rows
    return (
        at(W, a - 2) * at(E, b)
        + at(E, a) * at(W, b - 2)
        + at(V, a - 1) * at(U, b - 1)
        + at(U, a - 1) * at(V, b - 1)
    )


def p_coefficient(number: int, i: int, j: int) -> int:
    if i == 0 or j == 0:
        return 0
    return choose(number, i) * choose(number, j) - sum(
        choose(t, i - 1) * choose(t, j - 1) for t in range(number)
    )


def j_coefficient(number: int, i: int, j: int) -> int:
    subtracted = (
        sum(
            t * choose(t - 1, i - 1) * choose(t - 1, j - 1)
            for t in range(1, number)
        )
        if i >= 1 and j >= 1
        else 0
    )
    return number * (
        choose(number - 1, i) * choose(number - 1, j)
        + choose(number - 1, i + j + 1)
    ) - subtracted


def weighted_r_coefficient(
    rows: tuple[tuple[int, ...], ...],
    kernel: dict[tuple[int, int], int],
    a: int,
    b: int,
) -> int:
    return sum(
        value * r_coefficient(rows, a - i, b - j)
        for (i, j), value in kernel.items()
    )


def bundle_components(
    base: nx.Graph,
    marks: tuple[int, int],
    support: int,
    number: int,
    rank: int,
) -> tuple[int, int, int]:
    """Return the exact diagonal (polar, P*N, J*R-curvature) pieces."""
    lower = base.copy()
    lower.remove_node(support)
    H = minor_rows(base, marks)
    C = minor_rows(lower, marks)
    h = (0, *(choose(number, index) for index in range(1, number + 1)))
    hC = tuple(row_convolution(h, row) for row in C)
    total = add_minor_rows(H, hC)

    # nested2 is twice the coefficient of N.  The displayed differences are
    # therefore twice the first two actual diagonal pieces.
    polar_twice = (
        nested2(total, rank, rank)
        - nested2(H, rank, rank)
        - nested2(hC, rank, rank)
    )
    P = {
        (i, j): p_coefficient(number, i, j)
        for i in range(number + 1)
        for j in range(number + 1)
        if p_coefficient(number, i, j)
    }
    pn_twice = sum(
        value * nested2(C, rank - i, rank - j)
        for (i, j), value in P.items()
    )
    assert polar_twice % 2 == 0 and pn_twice % 2 == 0

    J = {
        (i, j): j_coefficient(number, i, j)
        for i in range(number + 1)
        for j in range(number + 1)
        if j_coefficient(number, i, j)
    }
    # For symmetric S=J*R,
    # [z^r w^r](-(z-w)^2S/2)=S_(r-1,r-1)-S_(r-2,r).
    curvature = weighted_r_coefficient(C, J, rank - 1, rank - 1) - weighted_r_coefficient(
        C, J, rank - 2, rank
    )
    return polar_twice // 2, pn_twice // 2, curvature


def component_census(max_order: int = 7, max_bundle: int = 4) -> dict[str, object]:
    checks = 0
    negatives = {"polar": 0, "P_times_N": 0, "R_curvature": 0, "total": 0}
    minima: dict[str, dict | None] = {key: None for key in negatives}
    worst_debt_ratio: tuple[Fraction, dict] | None = None
    for order in range(3, max_order + 1):
        for base in nx.nonisomorphic_trees(order):
            vertices = list(base)
            for marks in itertools.combinations(vertices, 2):
                for support in vertices:
                    if support in marks:
                        continue
                    for number in range(1, max_bundle + 1):
                        bundled = add_bundle(base, support, number)
                        maximum_rank = len(poly_forest(bundled)) + 1
                        for rank in range(maximum_rank):
                            polar, pn, curvature = bundle_components(
                                base, marks, support, number, rank
                            )
                            values = {
                                "polar": polar,
                                "P_times_N": pn,
                                "R_curvature": curvature,
                                "total": polar + pn + curvature,
                            }
                            witness = {
                                "value": 0,
                                "base_order": order,
                                "M": number,
                                "rank": rank,
                                "marks": marks,
                                "support": support,
                                "graph6": graph6(base),
                            }
                            for key, value in values.items():
                                if value < 0:
                                    negatives[key] += 1
                                if minima[key] is None or value < minima[key]["value"]:
                                    minima[key] = {**witness, "value": value}
                            assert values["total"] >= 0
                            if polar < 0:
                                reserve = pn + curvature
                                assert reserve > 0 and -polar <= reserve
                                ratio = Fraction(-polar, reserve)
                                ratio_witness = {
                                    **witness,
                                    "polar_debt": -polar,
                                    "reserve": reserve,
                                    "ratio": str(ratio),
                                }
                                if worst_debt_ratio is None or ratio > worst_debt_ratio[0]:
                                    worst_debt_ratio = (ratio, ratio_witness)
                            checks += 1
    assert negatives["P_times_N"] == 0
    assert negatives["R_curvature"] == 0
    assert negatives["total"] == 0
    assert negatives["polar"] > 0
    return {
        "base_tree_orders": [3, max_order],
        "bundle_sizes": [1, max_bundle],
        "diagonal_checks": checks,
        "negative_counts": negatives,
        "minima": minima,
        "largest_observed_polar_debt_ratio": worst_debt_ratio[1],
        "scope": "finite exact component census only",
    }


def add_isolates(graph: nx.Graph, number: int) -> nx.Graph:
    result = graph.copy()
    start = max(result.nodes(), default=-1) + 1
    result.add_nodes_from(range(start, start + number))
    return result


def add_bundle(graph: nx.Graph, support: int, number: int) -> nx.Graph:
    result = graph.copy()
    start = max(result.nodes(), default=-1) + 1
    result.add_edges_from((support, start + offset) for offset in range(number))
    return result


def aggregate_vector(
    base: nx.Graph, marks: tuple[int, int], support: int, number: int
) -> list[int]:
    bundled = add_bundle(base, support, number)
    lower_core = base.copy()
    lower_core.remove_node(support)
    full = four_minor_vector(bundled, *marks)
    terminal = four_minor_vector(base, *marks)
    lowers = [
        four_minor_vector(add_isolates(lower_core, isolates), *marks)
        for isolates in range(number)
    ]
    length = max(len(full), len(terminal)) + 2
    return [
        (full[rank] if rank < len(full) else 0)
        - (terminal[rank] if rank < len(terminal) else 0)
        - sum(
            row[rank - 1] if 0 <= rank - 1 < len(row) else 0
            for row in lowers
        )
        for rank in range(length)
    ]


def bundled_spider(bundle_size: int) -> tuple[nx.Graph, dict[int, list[int]]]:
    tree = nx.Graph()
    tree.add_node(0)
    next_vertex = 4
    bundles: dict[int, list[int]] = {}
    for support in (1, 2, 3):
        tree.add_edge(0, support)
        leaves = []
        for _ in range(bundle_size):
            tree.add_edge(support, next_vertex)
            leaves.append(next_vertex)
            next_vertex += 1
        bundles[support] = leaves
    return tree, bundles


def family_audit(max_m: int = 40) -> dict[str, object]:
    checks = 0
    positive_minimum = None
    target_rows = []
    for m in range(1, max_m + 1):
        tree, bundles = bundled_spider(m)
        marks = (bundles[1][0], bundles[2][0])
        values = aggregate_vector(tree.copy().subgraph(
            [v for v in tree if v not in bundles[3]]
        ).copy(), marks, 3, m)
        # The base passed above is the tree after removing the whole third
        # bundle; add_bundle reconstructs the original bundled spider.
        assert all(value >= 0 for value in values)
        for value in values:
            checks += 1
            if value > 0:
                positive_minimum = (
                    value if positive_minimum is None else min(positive_minimum, value)
                )
        target_rank = 2 * m
        if m <= 10 or m in {20, 30, 40, 50, max_m}:
            target_rows.append(
                {
                    "M": m,
                    "target_rank": target_rank,
                    "aggregate_payment": values[target_rank],
                }
            )
    return {
        "bundle_sizes": [1, max_m],
        "all_rank_checks": checks,
        "negative_coefficients": 0,
        "minimum_positive_coefficient": positive_minimum,
        "selected_target_rows": target_rows,
        "scope": "finite exact family audit, not an all-M proof",
    }


def family_polar_debt_witness() -> dict[str, object]:
    number = 6
    tree, bundles = bundled_spider(number)
    marks = (bundles[1][0], bundles[2][0])
    base = tree.copy()
    base.remove_nodes_from(bundles[3])
    rank = 2 * number
    polar, pn, curvature = bundle_components(base, marks, 3, number, rank)
    assert (polar, pn, curvature) == (-8_502_232, 7_183_560_875, 1_150_115_288)
    assert polar + pn + curvature == 8_325_173_931
    return {
        "M": number,
        "rank": rank,
        "polar": polar,
        "P_times_N": pn,
        "R_curvature": curvature,
        "aggregate": polar + pn + curvature,
        "conclusion": (
            "Standalone positivity of the bundle polar term is false even "
            "on the connected obstruction family; the exact reserve must remain coupled."
        ),
    }


def small_tree_audit(max_order: int = 6, max_bundle: int = 3) -> dict[str, object]:
    instances = 0
    rank_checks = 0
    positive_minimum = None
    for order in range(3, max_order + 1):
        for base in nx.nonisomorphic_trees(order):
            nodes = list(base)
            for marks in itertools.combinations(nodes, 2):
                for support in nodes:
                    if support in marks:
                        continue
                    for number in range(1, max_bundle + 1):
                        values = aggregate_vector(base, marks, support, number)
                        assert all(value >= 0 for value in values)
                        instances += 1
                        rank_checks += len(values)
                        for value in values:
                            if value > 0:
                                positive_minimum = (
                                    value
                                    if positive_minimum is None
                                    else min(positive_minimum, value)
                                )
    return {
        "base_tree_orders": [3, max_order],
        "bundle_sizes": [1, max_bundle],
        "instances": instances,
        "all_rank_checks": rank_checks,
        "negative_coefficients": 0,
        "minimum_positive_coefficient": positive_minimum,
        "scope": "finite exact nonisomorphic-tree audit",
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_LEAF_BUNDLE_TELESCOPE_IDENTITY_AND_FINITE_AUDIT",
        "status": (
            "exact transform proved; general aggregate positivity remains conjectural"
        ),
        "common_factor": symbolic_common_factor_identity(),
        "bundle_identity": {
            "four_minor_tuple": (
                "F(B_M)=F(H)+[(1+x)^M-1]F(H-s)"
            ),
            "aggregate": (
                "Gamma_M=N(B_M)-N(H)-zw*sum_(t=0)^(M-1)N((H-s)+tK1)"
            ),
            "compact": (
                "Gamma_M=2B_N(H,h_M(H-s))+P_M N(H-s)-"
                "(z-w)^2 J_M R(H-s)/2"
            ),
            "P_M": (
                "h_M(z)h_M(w)-zw*sum_(t=0)^(M-1)A^t"
            ),
            "J_M": (
                "H_(h_M)-zw*sum_(t=1)^(M-1)tA^(t-1)"
            ),
            "definitions": "h_M=(1+x)^M-1, A=(1+z)(1+w)",
        },
        "positive_scalar_kernels": kernel_coefficient_proof(),
        "complete_gap_telescope": unique_telescoping_weights(),
        "bundled_spider_family": family_audit(),
        "family_polar_debt_witness": family_polar_debt_witness(),
        "small_tree_census": small_tree_audit(),
        "component_census": component_census(),
        "exact_quantitative_closure": (
            "For each rank r, put b=2[z^r w^r]B_N(H,h_M C), "
            "p=[z^r w^r]P_M N(C), and "
            "c=[z^(r-1)w^(r-1)]J_MR(C)-[z^(r-2)w^r]J_MR(C). "
            "Then Gamma_(M,r)=b+p+c.  The necessary-and-sufficient weaker "
            "bundle inequality is b>=-(p+c), i.e. polar debt <= weighted "
            "N plus weighted R-Schur reserve."
        ),
        "candidate_bundle_payment_lemma": (
            "For every marked forest H, unmarked support s, M>=1, and every "
            "rank, the diagonal coefficient Gamma_(M,r) is nonnegative. "
            "This statement is NOT proved by this script."
        ),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print("PASS_EXACT_ISO_LEAF_BUNDLE_TELESCOPE_IDENTITY_AND_FINITE_AUDIT")


if __name__ == "__main__":
    main()
