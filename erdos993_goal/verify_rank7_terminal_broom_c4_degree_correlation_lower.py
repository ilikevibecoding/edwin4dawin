#!/usr/bin/env python3
"""Exact replay for the degree-correlation lower bound on c4."""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)
from verify_rank7_terminal_broom_rooted_c4_moment import partitions


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_terminal_broom_c4_degree_correlation_lower_exact_20260817.json"


def degree_correlation_table(order: int):
    """Return exact fixed-B2 maxima of B3+M(n-2-M), with witnesses."""
    output = {}
    total = order - 2
    for part in partitions(total, total):
        beta = sum(comb(x, 2) for x in part)
        gamma = sum(comb(x, 3) for x in part)
        maximum = part[0] if part else 0
        statistic = gamma + maximum * (total - maximum)
        if beta not in output or statistic > output[beta][0]:
            output[beta] = (statistic, part, gamma, maximum)
    return output


def main() -> int:
    n, beta, gamma, edge, maximum = sp.symbols(
        "n beta gamma edge maximum", integer=True, nonnegative=True
    )
    c4 = sp.symbols("c4", positive=True)

    # Root the tree at a vertex with excess degree M.  Every other vertex
    # has one parent, so each oriented edge contributes
    # x_parent*x_child <= M*x_child.  Summing gives E<=M(n-2-M).
    edge_upper = maximum * (n - 2 - maximum)
    c4_identity = (
        sp.binomial(n - 3, 4)
        + (n - 5) * beta
        - gamma
        - (edge - (n - 3))
    )
    partition_c4_lower = sp.factor(
        c4_identity.subs(edge, edge_upper)
    )
    assert sp.simplify(
        partition_c4_lower
        - (
            sp.binomial(n - 3, 4)
            + (n - 5) * beta
            + (n - 3)
            - gamma
            - maximum * (n - 2 - maximum)
        )
    ) == 0

    summaries = []
    for order in range(23, 39):
        table = degree_correlation_table(order)
        summaries.append(
            {
                "n": order,
                "degree_partitions": len(partitions(order - 2, order - 2)),
                "B2_levels": len(table),
                "B2_min": min(table),
                "B2_max": max(table),
            }
        )

    # Exact abstract failure surviving the preceding c5/c4 lower but not the
    # new correlation lower.  This is an enclosure point, not a tree.
    nn, rr, mm, bb = 23, 1, 21, 50
    gamma_floor = 74
    c2 = sp.Integer(comb(nn - 1, 2))
    c3 = sp.Integer(comb(nn - 2, 3) + bb)
    c4_point = sp.Integer(5508)
    ccoef = 4 * nn**2 - 30 * nn + 34
    joint_margin = (
        -sp.Rational(5, 2) * (nn - 6) * (nn - 3) ** 2 * bb
        + 10 * (nn - 3) * gamma_floor
        - ccoef * (comb(nn - 3, 4) - c4_point)
    )
    c5 = sp.factor(
        ((nn - 7) * (nn - 8) * c4_point + joint_margin)
        / (5 * (nn - 3))
    )
    assert c5 == 14547
    old_c5_lower = sp.factor(
        (
            (nn - 7) * (nn - 8) * c4_point
            + sp.Rational(nn**3 - 8 * nn**2 - 19 * nn + 302, 6) * bb
        )
        / (5 * (nn - 3))
    )
    c5_upper = sp.factor(
        (1 - (2 + c3 / c4_point) / 10) * c4_point**2 / c3
    )
    assert old_c5_lower <= c5 <= c5_upper

    c6 = sp.factor((25 * c5**2 - 4 * c4_point * c5) / (39 * c4_point))
    c6_upper = sp.factor(
        (1 - (2 + c4_point / c5) / 12) * c5**2 / c4_point
    )
    assert c6 <= c6_upper
    c7 = sp.factor(
        (1 - (2 + c5 / c6) / 14) * c6**2 / c5
    )
    c7_lower = sp.factor((72 * c6**2 - 9 * c5 * c6) / (105 * c5))
    assert c7_lower <= c7

    edge_j = 17
    neighbor_mass = mm - edge_j
    assert neighbor_mass == 4
    single_neighbor = sp.Integer(comb(mm - neighbor_mass - 3, 4))
    assert single_neighbor == 1001
    a = sp.Rational(5, 22) * (c5 - single_neighbor)
    b = sp.factor(c5 - a - single_neighbor)
    assert a == sp.Rational(33865, 11)
    assert b == sp.Rational(115141, 11)
    defect4 = comb(mm, 4) - a
    edge_scale = comb(mm - 2, 2)
    assert defect4 <= edge_j * edge_scale <= 3 * defect4
    assert comb(rr - 1, 2) + comb(neighbor_mass, 2) <= bb

    lower_b = [
        sp.Rational((mm - 7) * (mm - 8), 5 * (mm - 3)) * a,
        comb(mm, 5) - sp.Rational(mm - 4, 3) * defect4,
        c6 - sp.Rational(nn - 6, 6) * (c5 - a),
        sp.Integer(0),
    ]
    upper_b = [
        sp.Rational(mm - 4, 5) * a,
        comb(mm, 5) - sp.Rational(mm - 4, 5) * defect4,
        c5 - a - single_neighbor,
        c6,
    ]
    assert all(b >= value for value in lower_b)
    assert all(b <= value for value in upper_b)

    old_c4_upper = comb(nn - 3, 4) + (nn - 5) * bb + (nn - 3) - gamma_floor
    assert c4_point <= old_c4_upper
    raw = newton_coefficients(exact_decomposition())[0]
    delta0 = sp.factor(
        raw.subs(
            {
                c[0]: 1,
                c[1]: nn,
                c[2]: c2,
                c[3]: c3,
                c[4]: c4_point,
                c[5]: c5,
                c[6]: c6,
                c[7]: c7,
                h[5]: c5 - a,
                h[6]: c6 - b,
            },
            simultaneous=True,
        )
    )
    assert delta0 < 0

    table23 = degree_correlation_table(nn)
    statistic, witness, witness_gamma, witness_maximum = table23[bb]
    assert (statistic, witness, witness_gamma, witness_maximum) == (
        231,
        (10, 3, 2, 2, 1, 1, 1, 1),
        121,
        10,
    )
    strengthened_c4_lower = (
        comb(nn - 3, 4)
        + (nn - 5) * bb
        + (nn - 3)
        - statistic
    )
    assert strengthened_c4_lower == 5534
    assert c4_point < strengthened_c4_lower

    report = {
        "status": "PASS_EXACT_C4_DEGREE_CORRELATION_LOWER_REDUCTION_ONLY",
        "warning": "The new bound removes the displayed abstract failure; endpoint positivity for B2>=6 remains open.",
        "edge_correlation_upper": "E<=M(n-2-M), where M=max_v(deg(v)-1)",
        "per_partition_c4_lower": str(partition_c4_lower),
        "fixed_B2_c4_lower": "C(n-3,4)+(n-5)B2+(n-3)-max_partitions[B3+M(n-2-M)]",
        "degree_partition_tables": summaries,
        "removed_abstract_failure": {
            "parameters": {
                "n": nn,
                "r": rr,
                "B2": bb,
                "B3_floor": gamma_floor,
                "c3": str(c3),
                "c4": str(c4_point),
                "c5": str(c5),
                "c6": str(c6),
                "c7": str(c7),
                "a": str(a),
                "b": str(b),
                "eJ": edge_j,
                "single_neighbor_floor": str(single_neighbor),
            },
            "Delta0": str(delta0),
            "classification": "exact failure of the preceding relaxed cone, not a tree counterexample",
            "maximizing_degree_partition": list(witness),
            "max_B3_plus_M_rest": int(statistic),
            "new_c4_lower": int(strengthened_c4_lower),
            "exclusion_gap": int(strengthened_c4_lower - c4_point),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
