#!/usr/bin/env python3
"""Exact replay for the root-conditioned excess-degree partition reduction."""
from __future__ import annotations

import json
from collections import Counter
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
REPORT = HERE / "rank7_terminal_broom_root_conditioned_degree_partition_exact_20260817.json"


def contains_multiset(partition, forced):
    available = Counter(partition)
    required = Counter(value for value in forced if value > 0)
    return all(available[value] >= multiplicity for value, multiplicity in required.items())


def compatible_rows(order, beta, forced):
    total = order - 2
    rows = []
    for part in partitions(total, total):
        if sum(comb(value, 2) for value in part) != beta:
            continue
        if not contains_multiset(part, forced):
            continue
        gamma = sum(comb(value, 3) for value in part)
        maximum = part[0] if part else 0
        edge_cap = maximum * (total - maximum)
        statistic = gamma + edge_cap
        c4_lower = (
            comb(order - 3, 4)
            + (order - 5) * beta
            + (order - 3)
            - statistic
        )
        rows.append(
            {
                "partition": part,
                "gamma": gamma,
                "maximum": maximum,
                "edge_cap": edge_cap,
                "statistic": statistic,
                "c4_lower": c4_lower,
            }
        )
    return rows


def main() -> int:
    # The local vertices q and N(q) are distinct, so their positive excess
    # degrees occur with multiplicity in the global excess-degree partition.
    assert contains_multiset((9, 4, 4, 2, 2), (0, 4))
    assert not contains_multiset((10, 3, 2, 2, 1, 1, 1, 1), (0, 4))
    assert contains_multiset((6, 4, 4, 2), (4, 4))
    assert not contains_multiset((6, 4, 2, 2), (4, 4))

    nn, rr, mm, beta = 23, 1, 21, 50
    edge_j = 17
    neighbor_excess = (mm - edge_j,)
    assert neighbor_excess == (4,)
    forced = (rr - 1,) + neighbor_excess

    all_rows = compatible_rows(nn, beta, ())
    rooted_rows = compatible_rows(nn, beta, forced)
    assert len(all_rows) == 7
    assert len(rooted_rows) == 3
    global_best = min(all_rows, key=lambda row: row["c4_lower"])
    rooted_best = min(rooted_rows, key=lambda row: row["c4_lower"])
    assert global_best == {
        "partition": (10, 3, 2, 2, 1, 1, 1, 1),
        "gamma": 121,
        "maximum": 10,
        "edge_cap": 110,
        "statistic": 231,
        "c4_lower": 5534,
    }
    assert rooted_best == {
        "partition": (9, 4, 4, 2, 2),
        "gamma": 92,
        "maximum": 9,
        "edge_cap": 108,
        "statistic": 200,
        "c4_lower": 5565,
    }

    # An exact fixed-e point surviving the separate global floors but excluded
    # by the root-conditioned table.
    gamma_floor = 74
    c2 = sp.Integer(comb(nn - 1, 2))
    c3 = sp.Integer(comb(nn - 2, 3) + beta)
    c4_point = sp.Integer(5534)
    coefficient_edge = 4 * nn**2 - 30 * nn + 34
    c5_margin = (
        -sp.Rational(5, 2) * (nn - 6) * (nn - 3) ** 2 * beta
        + 10 * (nn - 3) * gamma_floor
        - coefficient_edge * (comb(nn - 3, 4) - c4_point)
    )
    c5 = sp.factor(
        ((nn - 7) * (nn - 8) * c4_point + c5_margin)
        / (5 * (nn - 3))
    )
    assert c5 == 14989
    c5_upper = sp.factor(
        (1 - (2 + c3 / c4_point) / 10) * c4_point**2 / c3
    )
    assert c5 <= c5_upper
    c6 = sp.factor((25 * c5**2 - 4 * c4_point * c5) / (39 * c4_point))
    c6_upper = sp.factor(
        (1 - (2 + c4_point / c5) / 12) * c5**2 / c4_point
    )
    assert c6 <= c6_upper
    c7 = sp.factor((1 - (2 + c5 / c6) / 14) * c6**2 / c5)
    c7_lower = sp.factor((72 * c6**2 - 9 * c5 * c6) / (105 * c5))
    assert c7_lower <= c7

    single_neighbor = sp.Integer(comb(mm - neighbor_excess[0] - 3, 4))
    assert single_neighbor == 1001
    a = sp.Rational(5, 22) * (c5 - single_neighbor)
    b = sp.factor(c5 - a - single_neighbor)
    assert a == sp.Rational(34970, 11)
    defect4 = comb(mm, 4) - a
    edge_scale = comb(mm - 2, 2)
    assert defect4 <= edge_j * edge_scale <= 3 * defect4
    assert comb(rr - 1, 2) + comb(neighbor_excess[0], 2) <= beta

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
    assert c4_point >= global_best["c4_lower"]
    assert c4_point < rooted_best["c4_lower"]

    report = {
        "status": "PASS_EXACT_ROOT_CONDITIONED_DEGREE_PARTITION_REDUCTION_ONLY",
        "warning": "The root-conditioned table removes the displayed abstract failure; B2>=6 endpoint positivity remains open.",
        "forced_multiset": "The global positive excess-degree partition contains {r-1 if positive} union {x_u=deg(u)-1:u in N(q)} with multiplicity.",
        "root_profile": {
            "n": nn,
            "r": rr,
            "m": mm,
            "eJ": edge_j,
            "neighbor_excess": list(neighbor_excess),
            "forced_positive_multiset": [value for value in forced if value > 0],
            "B2": beta,
        },
        "unconditioned_best": global_best,
        "root_conditioned_rows": rooted_rows,
        "root_conditioned_best": rooted_best,
        "removed_abstract_failure": {
            "parameters": {
                "c3": str(c3),
                "c4": str(c4_point),
                "c5": str(c5),
                "c6": str(c6),
                "c7": str(c7),
                "a": str(a),
                "b": str(b),
            },
            "Delta0": str(delta0),
            "classification": "exact failure of the separately minimized relaxed cone, not a tree counterexample",
            "global_c4_floor": global_best["c4_lower"],
            "root_conditioned_c4_floor": rooted_best["c4_lower"],
            "exclusion_gap": rooted_best["c4_lower"] - int(c4_point),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
