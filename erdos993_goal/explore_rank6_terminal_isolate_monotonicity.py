#!/usr/bin/env python3
"""Explore isolate monotonicity of the terminal-broom rank-6 margin."""

from __future__ import annotations

import math

import sympy as sp


def reduced_margin(x, y, z, u, v):
    t = y + u
    total_next = z + v
    return sp.expand(
        x**2
        + t**2
        + 2 * x * (t + y)
        + (26 * x + 2 * t) * total_next
        - 22 * y * t
    )


def raw_forward_differences():
    c0, c1, c2, c3, c4, c5, u, v = sp.symbols(
        "c0 c1 c2 c3 c4 c5 u v", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def coefficient(rank, smoothing):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def margin(smoothing):
        x, y, z = (
            coefficient(rank, smoothing)
            for rank in (3, 4, 5)
        )
        return reduced_margin(x, y, z, u, v)

    values = [margin(smoothing) for smoothing in range(12)]
    differences = []
    for _ in range(1, 11):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        differences.append(values[0])
    eleventh = sp.expand(values[1] - values[0])
    assert eleventh == 0
    return differences, (c0, c1, c2, c3, c4, c5, u, v)


def main() -> int:
    differences, variables = raw_forward_differences()
    c0, c1, c2, c3, c4, c5, u, v = variables
    for order, difference in enumerate(differences, start=1):
        polynomial = sp.Poly(difference, *variables)
        negatives = [
            (monomial, coefficient)
            for monomial, coefficient in polynomial.terms()
            if coefficient < 0
        ]
        du = sp.Poly(sp.diff(difference, u), *variables)
        dv = sp.Poly(sp.diff(difference, v), *variables)
        dc5 = sp.Poly(sp.diff(difference, c5), *variables)
        print(
            f"Delta^{order}: terms={len(polynomial.terms())} "
            f"negative={len(negatives)} "
            f"du_negative={sum(1 for _, c in du.terms() if c < 0)} "
            f"dv_negative={sum(1 for _, c in dv.terms() if c < 0)} "
            f"dc5_negative={sum(1 for _, c in dc5.terms() if c < 0)}"
        )
        if negatives:
            print(f"  first negatives={negatives[:8]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
