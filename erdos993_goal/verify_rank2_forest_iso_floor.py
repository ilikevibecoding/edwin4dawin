#!/usr/bin/env python3
"""Symbolically verify the sharp rising rank-two ISO floor for forests."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("rank2_forest_iso_floor_certificate_20260729.json")


def main() -> None:
    n, m, s = sp.symbols(
        "n m S", integer=True, nonnegative=True
    )
    p1 = n
    p2 = sp.binomial(n, 2) - m
    p3 = sp.binomial(n, 3) - m * (n - 2) + s
    reserve = sp.expand_func(
        sp.expand(p1**2 + 2 * p2**2 - 3 * p1 * p3)
    )
    expected = (
        -6 * s * n
        + 4 * m**2
        + 2 * m * n**2
        - 8 * m * n
        + n**3
        + n**2
    ) / 2
    assert sp.factor(reserve - expected) == 0

    # In a forest S=sum_v binom(deg(v),2) counts incident edge
    # pairs, so S <= binom(m,2).  The resulting lower bound is
    # concave in m.
    lower = sp.factor(
        expected.subs(s, m * (m - 1) / 2)
    )
    assert sp.factor(sp.diff(lower, m, 2) - (4 - 3 * n)) == 0
    lower_at_zero = sp.factor(lower.subs(m, 0))
    lower_at_tree = sp.factor(lower.subs(m, n - 1))
    lower_n4_m1 = sp.factor(lower.subs({n: 4, m: 1}))
    assert lower_at_zero == n**2 * (n + 1) / 2
    assert lower_at_tree == 2 * n**2 - 3 * n + 2
    assert lower_n4_m1 == 42

    floor = sp.Rational(37, 25)
    assert sp.factor(lower_at_zero - n**2) == (
        n**2 * (n - 1) / 2
    )
    assert sp.factor(lower_at_tree - n**2) == (
        (n - 1) * (n - 2)
    )
    tree_endpoint_gap = sp.factor(
        lower_at_tree - floor * n**2
    )
    assert tree_endpoint_gap == (
        (n - 5) * (13 * n - 10) / 25
    )
    assert sp.factor(
        lower_at_zero - floor * n**2
    ) == n**2 * (25 * n - 49) / 50

    c = sp.symbols("c", integer=True, positive=True)
    component_lower = sp.factor(
        lower.subs(m, n - c) / n**2
    )
    expected_component_lower = (
        c * (4 * n**2 - 3 * n * (c + 1) + 4 * c)
        / (2 * n**2)
    )
    assert sp.factor(
        component_lower - expected_component_lower
    ) == 0
    disjoint_edge_pair_reserve = sp.factor(
        reserve.subs(m, n - c) / n**2
        - component_lower
    )
    assert sp.factor(
        disjoint_edge_pair_reserve
        - 3
        * ((n - c) * (n - c - 1) / 2 - s)
        / n
    ) == 0
    component_half_gap = sp.factor(
        component_lower - c / 2
    )
    assert sp.factor(
        component_half_gap
        - c
        * (3 * n * (n - c - 1) + 4 * c)
        / (2 * n**2)
    ) == 0

    report = {
        "status": "PASS_SYMBOLIC_SHARP_RANK2_THEOREM",
        "theorem": (
            "If F is a forest and i_2(F)>i_1(F), then "
            "{i_1^2+2i_2^2-3i_1 i_3}/i_1^2 >= 37/25."
        ),
        "unconditional_companion": (
            "For every nonempty forest the same normalized reserve "
            "is at least 1."
        ),
        "component_sensitive_companion": (
            "For a forest with n vertices and c components, the "
            "normalized reserve is at least "
            "c{4n^2-3n(c+1)+4c}/(2n^2), hence at least c/2."
        ),
        "equality": (
            "Equality holds for K_{1,4}; equality in the proof forces "
            "n=5, m=4, and every pair of edges incident, hence K_{1,4}."
        ),
        "coefficient_identities": {
            "i1": "n",
            "i2": "binom(n,2)-m",
            "i3": "binom(n,3)-m(n-2)+S",
            "S": "sum_v binom(deg(v),2)",
        },
        "reserve_numerator": str(expected),
        "forest_lower_bound": str(lower),
        "concavity_second_derivative": "4-3n",
        "endpoint_values": {
            "m=0": str(lower_at_zero),
            "m=n-1": str(lower_at_tree),
            "n=4,m=1": str(lower_n4_m1),
        },
        "endpoint_gap_over_37_25": str(tree_endpoint_gap),
        "component_sensitive_lower_bound": str(
            component_lower
        ),
        "extra_disjoint_edge_pair_reserve": str(
            disjoint_edge_pair_reserve
        ),
        "small_orders": (
            "For n<=3 rank two is not strictly rising. For n=4, "
            "strict rise forces m<=1 and both concavity endpoints "
            "are above 37/25. For n>=5 every forest has m<=n-1 "
            "and the two displayed endpoints prove the bound."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
