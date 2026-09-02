#!/usr/bin/env python3
"""Symbolically verify the rank-2 leaf-curvature certificate."""

from __future__ import annotations

import sympy as sp


def tree_rank2_curvature(order, adjacent_edge_pairs):
    i2 = sp.binomial(order, 2) - (order - 1)
    i3 = (
        sp.binomial(order, 3)
        - (order - 1) * (order - 2)
        + adjacent_edge_pairs
    )
    return sp.expand_func(4 * i2**2 - 6 * order * i3)


def main() -> int:
    n, degree, S = sp.symbols(
        "n degree S", integer=True, nonnegative=True
    )
    old = sp.expand(tree_rank2_curvature(n, S))
    expected_old = 3 * n**3 - 7 * n**2 + 4 - 6 * n * S
    assert sp.expand(old - expected_old) == 0

    old_lower = sp.factor(
        old.subs(S, (n - 1) * (n - 2) / 2)
    )
    assert sp.expand(old_lower - 2 * (n - 1) * (n - 2)) == 0

    new = sp.expand(tree_rank2_curvature(n + 1, S + degree))
    delta = sp.factor(new - old)
    expected_delta = (
        9 * n**2
        - 5 * n
        - 4
        - 6 * S
        - 6 * degree * (n + 1)
    )
    assert sp.expand(delta - expected_delta) == 0

    delta_lower = sp.factor(
        delta.subs(
            {
                S: (n - 1) * (n - 2) / 2,
                degree: n - 1,
            }
        )
    )
    assert sp.expand(delta_lower - 4 * (n - 1)) == 0

    print("rank-2 leaf-curvature symbolic certificate: PASS")
    print("tree C2 lower bound:", old_lower)
    print("leaf-addition delta C2 lower bound:", delta_lower)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
