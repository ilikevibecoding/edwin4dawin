#!/usr/bin/env python3
"""Verify the exact terminal-broom reduction for the rank-7 reserve.

Let A be a rooted tree, H=A-root, and form G_t by adjoining a new
support vertex at the root of A together with t pendant leaves:

    I(G_t;x) = (1+x)^t I(A;x) + x I(H;x).

This script proves the symbolic identity which splits Q_7(G_t) into
Q_7(A), the proved rank-6 reserve Q_6(H), and a residual R_t involving
coefficients only through rank seven.  It also constructs the exact
Newton expansion of R_t at t=1.
"""

from __future__ import annotations

import math

import sympy as sp


c = sp.symbols("c0:9", nonnegative=True)
h = sp.symbols("h0:8", nonnegative=True)
t = sp.symbols("t", integer=True, positive=True)


def falling_choose(variable, rank: int):
    return sp.prod(variable - offset for offset in range(rank)) / sp.factorial(rank)


def smoothed(rank: int):
    return sum(falling_choose(t, offset) * c[rank - offset] for offset in range(rank + 1))


def q7(p6, p7, p8):
    return 14 * p7**2 - p6 * p7 - 16 * p6 * p8


def q6(p5, p6, p7):
    return 12 * p6**2 - p5 * p6 - 14 * p5 * p7


def residual():
    p6 = smoothed(6) + h[5]
    p7 = smoothed(7) + h[6]
    # The c8 and h7 terms are paid separately by Q7(A) and Q6(H).
    p8_without_boundaries = sum(
        falling_choose(t, offset) * c[8 - offset]
        for offset in range(1, 9)
    )
    return sp.expand(
        7
        * c[6]
        * h[5]
        * (14 * p7**2 - p6 * p7 - 16 * p6 * p8_without_boundaries)
        - 7 * h[5] * p6 * (14 * c[7] ** 2 - c[6] * c[7])
        - 8 * c[6] * p6 * (12 * h[6] ** 2 - h[5] * h[6])
    )


def exact_decomposition() -> sp.Expr:
    p6 = smoothed(6) + h[5]
    p7 = smoothed(7) + h[6]
    p8 = smoothed(8) + h[7]
    identity = sp.expand(
        7 * c[6] * h[5] * q7(p6, p7, p8)
        - residual()
        - 7 * h[5] * p6 * q7(c[6], c[7], c[8])
        - 8 * c[6] * p6 * q6(h[5], h[6], h[7])
    )
    assert identity == 0
    return residual()


def newton_coefficients(expression: sp.Expr):
    degree = sp.Poly(expression, t).degree()
    values = [sp.expand(expression.subs(t, value)) for value in range(1, degree + 3)]
    coefficients = [values[0]]
    for _ in range(1, degree + 1):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        coefficients.append(values[0])
    values = [
        sp.expand(values[index + 1] - values[index])
        for index in range(len(values) - 1)
    ]
    assert values[0] == 0
    return coefficients


def numerical_integer_replay(expression: sp.Expr, coefficients) -> None:
    reconstructed = sum(
        falling_choose(t - 1, rank) * value
        for rank, value in enumerate(coefficients)
    )
    assert sp.expand(expression - reconstructed) == 0
    for value in (1, 2, 3, 7, 20):
        assert sp.expand(
            expression.subs(t, value)
            - sum(
                math.comb(value - 1, rank) * coefficient
                for rank, coefficient in enumerate(coefficients)
                if rank <= value - 1
            )
        ) == 0


def main() -> int:
    expression = exact_decomposition()
    coefficients = newton_coefficients(expression)
    numerical_integer_replay(expression, coefficients)
    print("rank-7 terminal-broom decomposition: PASS")
    print(f"residual degree in sibling leaves: {sp.Poly(expression, t).degree()}")
    print(f"Newton coefficients required from t=1: {len(coefficients)}")
    for rank, coefficient in enumerate(coefficients):
        polynomial = sp.Poly(coefficient, *c[:8], h[5], h[6])
        negatives = sum(1 for _, value in polynomial.terms() if value < 0)
        print(
            f"Delta^{rank} R_1: terms={len(polynomial.terms())} "
            f"negative_raw_coefficients={negatives} "
            f"factor={sp.factor(coefficient) if rank >= len(coefficients)-3 else '-'}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
