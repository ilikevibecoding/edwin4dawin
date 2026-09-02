#!/usr/bin/env python3
"""Symbolic checks for PREFIX_GSB_LEAF_INDUCTION_REDUCTION."""

from __future__ import annotations

import sympy as sp


def main() -> int:
    k, q = sp.symbols("k q", integer=True, positive=True)
    am, a, ap = sp.symbols("a_minus a a_plus")
    bmm, bm, b = sp.symbols("b_minusminus b_minus b")

    def g(left, middle, right):
        return k * middle**2 + left * middle - (k + 1) * left * right

    direct = sp.expand(
        g(am + bmm, a + bm, ap + b) - g(am, a, ap)
    )
    claimed = (
        2 * k * a * bm
        + k * bm**2
        + am * bm
        + bmm * a
        + bmm * bm
        - (k + 1) * (am * b + bmm * ap + bmm * b)
    )
    assert sp.expand(direct - claimed) == 0

    # G_k = k C_k/(k!)^2 + a_{k-1}a_k, where
    # C_k/(k!)^2 = a_k^2-(k+1)a_{k-1}a_{k+1}/k.
    normalized_curvature = a**2 - (k + 1) * am * ap / k
    assert sp.expand(
        g(am, a, ap) - (k * normalized_curvature + am * a)
    ) == 0

    # Star formulas.  SymPy verifies the generic ranges; the low ranks are
    # checked directly from a_0=1, a_1=q+1, a_j=binomial(q,j).
    g1 = (q + 1) ** 2 + (q + 1) - 2 * sp.binomial(q, 2)
    assert sp.simplify(g1 - (4 * q + 2)) == 0
    g2 = (
        2 * sp.binomial(q, 2) ** 2
        + (q + 1) * sp.binomial(q, 2)
        - 3 * (q + 1) * sp.binomial(q, 3)
    )
    assert sp.simplify(g2 - (q + 3) * sp.binomial(q, 2)) == 0

    print("GSB leaf-increment expansion: PASS")
    print("GSB/factorial-curvature relation: PASS")
    print("star base formulas: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
