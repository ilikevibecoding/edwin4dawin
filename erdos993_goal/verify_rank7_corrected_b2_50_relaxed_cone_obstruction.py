#!/usr/bin/env python3
"""Preserve an exact failure of the corrected higher-B2 relaxed cone.

This is not a tree counterexample.  It is a rational point satisfying the
currently retained scalar bounds (including the new c5 moment lower bound
and c4 degree-correlation floor) at which Delta^0 R_1 is negative.
"""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    h,
    exact_decomposition,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_corrected_b2_50_relaxed_cone_obstruction_exact_20260817.json"


def main() -> int:
    n, r, m, beta, gamma_floor = 23, 1, 21, 50, 74
    c2 = sp.Integer(comb(n - 1, 2))
    c3 = sp.Integer(comb(n - 2, 3) + beta)
    c4 = sp.Integer(5534)
    c5 = sp.Integer(14989)
    c6 = sp.factor((25 * c5**2 - 4 * c4 * c5) / (39 * c4))
    c7 = sp.factor((12 * c6**2 - c5 * c6) / (14 * c5))
    a = sp.Rational(1889550, 583)
    b = sp.Rational(17, 5) * a

    # Core ratio box and the two c5 lower bounds.
    w = c2 / c3
    x = c3 / c4
    x_lo = 8 * w / (6 - w)
    x_hi = 4 * w / (3 * (1 - w))
    assert x_lo <= x <= x_hi
    kappa = sp.Rational(n**3 - 8 * n**2 - 19 * n + 302, 6)
    path_c5_lower = ((n - 7) * (n - 8) * c4 + kappa * beta) / (5 * (n - 3))
    coefficient_edge = 4 * n**2 - 30 * n + 34
    joint_margin = (
        -sp.Rational(5, 2) * (n - 6) * (n - 3) ** 2 * beta
        + 10 * (n - 3) * gamma_floor
        - coefficient_edge * (comb(n - 3, 4) - c4)
    )
    joint_c5_lower = (
        (n - 7) * (n - 8) * c4 + joint_margin
    ) / (5 * (n - 3))
    assert path_c5_lower < joint_c5_lower == c5
    c5_upper = (1 - (2 + x) / 10) * c4**2 / c3
    assert c5 <= c5_upper

    # Rank-six and rank-seven coefficient intervals.
    c6_upper = (1 - (2 + c4 / c5) / 12) * c5**2 / c4
    assert c6 <= c6_upper
    c7_lower = (72 * c6**2 - 9 * c5 * c6) / (105 * c5)
    c7_upper = (1 - (2 + c5 / c6) / 14) * c6**2 / c5
    assert c7_lower <= c7 == c7_upper

    # Exact c4 partition-correlation floor: the maximum tail statistic at
    # (n,B2)=(23,50) is 231.  The rooted c4 upper uses B3>=74.
    c4_lower = comb(n - 3, 4) + (n - 5) * beta + (n - 3) - 231
    c4_upper = comb(n - 3, 4) + (n - 5) * beta + (n - 3) - gamma_floor
    assert c4_lower == c4 <= c4_upper

    # Fixed-a edge--bad-four incidence and rooted branching enlargement.
    c4_j = sp.Integer(comb(m, 4))
    edge_scale = sp.Integer(comb(m - 2, 2))
    bad4 = c4_j - a
    e_lower = bad4 / edge_scale
    e_upper = min(sp.Integer(m - 1), 3 * bad4 / edge_scale)
    assert 0 <= e_lower <= e_upper <= m - 1
    split_mass_min = m - e_upper
    assert split_mass_min == 1
    assert comb(r - 1, 2) <= beta

    # On 4<=s<=5 the exact linear convex envelope of the single-neighbor
    # floor joins C(14,4)=1001 and C(13,4)=715.
    split_mass_max = m - e_lower
    assert 4 <= split_mass_max <= 5
    single_neighbor = (
        (5 - split_mass_max) * comb(14, 4)
        + (split_mass_max - 4) * comb(13, 4)
    )
    b_lower = max(
        sp.Rational((m - 7) * (m - 8), 5 * (m - 3)) * a,
        comb(m, 5) - sp.Rational(m - 4, 3) * bad4,
        c6 - sp.Rational(n - 6, 6) * (c5 - a),
        sp.Integer(0),
    )
    upper_capacity = sp.Rational(m - 4, 5) * a
    upper_single = c5 - a - single_neighbor
    b_upper = min(upper_capacity, upper_single, c6)
    assert b_lower <= b == upper_capacity == upper_single == b_upper

    raw = newton_coefficients(exact_decomposition())[0]
    delta0 = sp.factor(
        raw.subs(
            {
                c[0]: 1,
                c[1]: n,
                c[2]: c2,
                c[3]: c3,
                c[4]: c4,
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

    report = {
        "status": "PASS_EXACT_RELAXED_CONE_OBSTRUCTION_NOT_A_TREE",
        "warning": "This is an exact failure of the current scalar enclosure, not a tree counterexample.",
        "parameters": {"n": n, "r": r, "m": m, "B2": beta, "B3_floor": gamma_floor},
        "coefficients": {
            "c2": str(c2), "c3": str(c3), "c4": str(c4), "c5": str(c5),
            "c6": str(c6), "c7": str(c7), "a": str(a), "b": str(b),
        },
        "active_boundaries": [
            "c4=degree-partition correlation floor 5534",
            "c5=joint c5/c4/B3 lower 14989",
            "c6=V6 lower endpoint",
            "c7=Q6 upper endpoint",
            "b=(m-4)a/5=c5-a-single_neighbor",
        ],
        "delta0_R1": str(delta0),
        "delta0_decimal": float(delta0),
        "next_missing_coupling": "The c4 and c5 degree-partition extrema are still optimized independently of the rooted J/H profile.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
