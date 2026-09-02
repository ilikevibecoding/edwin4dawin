#!/usr/bin/env python3
"""Exact replay for the joint c5/c4/degree-moment lower bound.

This is a structural reduction for the remaining rank-seven terminal-broom
band.  It does not by itself certify positivity of all low coefficients.
"""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_rooted_c4_moment import degree_table


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_terminal_broom_c5_c4_moment_lower_exact_20260817.json"


def main() -> int:
    n, beta, gamma, edge, connected_four = sp.symbols(
        "n beta gamma edge connected_four", integer=True, nonnegative=True
    )
    c4, c5 = sp.symbols("c4 c5", positive=True)

    path_coefficient = (n - 7) * (n - 8)
    edge_excess = edge - (n - 3)
    coefficient_beta = (
        sp.Rational(3, 2) * n**3
        - 20 * n**2
        + sp.Rational(133, 2) * n
        - 20
    )
    coefficient_gamma = 4 * n**2 - 35 * n + 49
    coefficient_edge = 4 * n**2 - 30 * n + 34

    # Exact rank-(4,5) motif identity from the certified path-ratio theorem.
    exact_margin = (
        coefficient_beta * beta
        - coefficient_gamma * gamma
        - coefficient_edge * edge_excess
        + 5 * (n - 3) * (connected_four - (n - 4))
    )

    # Exact c4 identity for a tree, solved for E-(n-3).
    edge_excess_from_c4 = (
        sp.binomial(n - 3, 4) + (n - 5) * beta - gamma - c4
    )
    # The proved connected-four-subtree inequality is
    # connected_four-(n-4) >= beta+gamma.
    lower_raw = sp.expand(
        exact_margin.subs(
            {
                edge_excess: edge_excess_from_c4,
                connected_four: n - 4 + beta + gamma,
            },
            simultaneous=True,
        )
    )
    lower_factored = (
        -sp.Rational(5, 2) * (n - 6) * (n - 3) ** 2 * beta
        + 10 * (n - 3) * gamma
        - coefficient_edge * (sp.binomial(n - 3, 4) - c4)
    )
    assert sp.simplify(sp.expand_func(lower_raw - lower_factored)) == 0

    c5_lower = sp.factor(
        (path_coefficient * c4 + lower_factored) / (5 * (n - 3))
    )

    # The coefficient of gamma is positive throughout the target band, so
    # the exact degree-partition floor gamma >= g_n(beta) can be substituted.
    assert sp.diff(lower_factored, gamma) == 10 * (n - 3)
    assert sp.diff(lower_factored, gamma).subs(n, 23) > 0

    degree_summaries = []
    for order in range(23, 39):
        table = degree_table(order)
        degree_summaries.append(
            {
                "n": order,
                "B2_levels": len(table),
                "B2_min": min(table),
                "B2_max": max(table),
                "B3_at_B2_5": table.get(5),
                "B3_at_B2_6": table.get(6),
            }
        )

    # Recheck the exact abstract point preserved by the previous c4-moment
    # reduction.  It violates this stronger necessary c5 lower bound.
    nn = 23
    bb = 20
    gamma_floor = degree_table(nn)[bb]
    assert gamma_floor == 8
    obstruction_c4 = sp.Rational(660405825, 126742)
    obstruction_c5 = sp.Rational(808963450, 63371)
    strengthened_lower = sp.factor(
        c5_lower.subs(
            {n: nn, beta: bb, gamma: gamma_floor, c4: obstruction_c4}
        )
    )
    strengthened_gap = sp.factor(strengthened_lower - obstruction_c5)
    assert strengthened_gap > 0
    assert strengthened_lower == sp.Rational(1832655243, 126742)
    assert strengthened_gap == sp.Rational(214728343, 126742)

    report = {
        "status": "PASS_EXACT_C5_C4_MOMENT_LOWER_REDUCTION_ONLY",
        "warning": "This removes the preserved abstract obstruction but does not yet prove all endpoint coefficients positive.",
        "definitions": {
            "beta": "sum_v C(deg(v)-1,2)",
            "gamma": "sum_v C(deg(v)-1,3)",
            "edge": "sum_uv (deg(u)-1)(deg(v)-1)",
            "connected_four": "number of connected four-edge subtrees",
        },
        "dependencies": {
            "exact_c4": "c4=C(n-3,4)+(n-5)beta-gamma-(edge-(n-3))",
            "exact_rank45_margin": "5(n-3)c5-(n-7)(n-8)c4=A beta-B gamma-C(edge-(n-3))+5(n-3)(connected_four-(n-4))",
            "connected_four_lower": "connected_four-(n-4)>=beta+gamma",
        },
        "new_lower_margin": str(lower_factored),
        "new_c5_lower": str(c5_lower),
        "gamma_coefficient": str(sp.diff(lower_factored, gamma)),
        "degree_partition_floors": degree_summaries,
        "removed_prior_obstruction": {
            "n": nn,
            "B2": bb,
            "B3_floor": gamma_floor,
            "c4": str(obstruction_c4),
            "old_point_c5": str(obstruction_c5),
            "strengthened_c5_lower": str(strengthened_lower),
            "exact_gap": str(strengthened_gap),
            "classification": "the old point is excluded from the strengthened cone; it was never a tree counterexample",
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
