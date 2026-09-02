#!/usr/bin/env python3
"""Prove 2*i_5(F) >= i_4(F) for every forest of order at least 13."""

from __future__ import annotations

import sympy as sp

from verify_rank4_three_halves_forest_certificate import (
    forest_polynomials,
)


def symbolic_leaf_step() -> None:
    b3, b4, b5, d3, d4 = sp.symbols(
        "b3 b4 b5 d3 d4", nonnegative=True
    )
    old = 2 * b5 - b4
    new = 2 * (b5 + d4) - (b4 + d3)
    assert sp.expand(new - old - (2 * d4 - d3)) == 0
    assert sp.expand((2 * d4 - d3) - ((d4 - d3) + d4)) == 0


def finite_base() -> dict[str, int]:
    forests = forest_polynomials(13)
    assert len(forests[13]) == 2_974
    values = [
        2 * polynomial[5] - polynomial[4]
        for polynomial in forests[13]
    ]
    assert min(values) == 42
    return {
        "order": 13,
        "polynomials": len(values),
        "minimum": min(values),
    }


def main() -> int:
    symbolic_leaf_step()
    base = finite_base()
    print("forest rank-4-to-5 half-monotonicity: PASS")
    print("finite base:", base)
    print(
        "induction input: i4(D)>=i3(D) for every forest |D|>=12"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
