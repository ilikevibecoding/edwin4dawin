#!/usr/bin/env python3
"""Verify the exact terminal-broom reduction for the rank-6 reserve.

Let A be a rooted tree, H=A-root, and form G_t by adjoining a new
support vertex at the root of A together with t pendant leaves:

    I(G_t;x) = (1+x)^t I(A;x) + x I(H;x).

The identity below splits Q_6(G_t) into the old Q_6(A), the known
rank-5 reserve Q_5(H), and a residual R_t involving coefficients only
through rank six.  The residual is a polynomial of degree exactly 11
in t, so twelve Newton coefficients suffice for every t>=1.
"""

from __future__ import annotations

import math

import sympy as sp


c = sp.symbols("c0:8", nonnegative=True)
h = sp.symbols("h0:7", nonnegative=True)
t = sp.symbols("t", integer=True, positive=True)


def falling_choose(variable, rank: int):
    return (
        sp.prod(variable - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def smoothed(rank: int):
    return sum(
        falling_choose(t, offset) * c[rank - offset]
        for offset in range(rank + 1)
    )


def q6(p5, p6, p7):
    return 12 * p6**2 - p5 * p6 - 14 * p5 * p7


def q5(p4, p5, p6):
    return 10 * p5**2 - p4 * p5 - 12 * p4 * p6


def residual():
    p5 = smoothed(5) + h[4]
    p6 = smoothed(6) + h[5]
    # The c7 and h6 terms are paid separately by Q6(A) and Q5(H).
    p7_without_boundaries = (
        sum(
            falling_choose(t, offset) * c[7 - offset]
            for offset in range(1, 8)
        )
    )
    return sp.expand(
        6
        * c[5]
        * h[4]
        * (
            12 * p6**2
            - p5 * p6
            - 14 * p5 * p7_without_boundaries
        )
        - 6
        * h[4]
        * p5
        * (12 * c[6] ** 2 - c[5] * c[6])
        - 7
        * c[5]
        * p5
        * (10 * h[5] ** 2 - h[4] * h[5])
    )


def exact_decomposition() -> sp.Expr:
    p5 = smoothed(5) + h[4]
    p6 = smoothed(6) + h[5]
    p7 = smoothed(7) + h[6]
    old_q6 = q6(c[5], c[6], c[7])
    deleted_q5 = q5(h[4], h[5], h[6])
    remainder = residual()
    identity = sp.expand(
        6 * c[5] * h[4] * q6(p5, p6, p7)
        - remainder
        - 6 * h[4] * p5 * old_q6
        - 7 * c[5] * p5 * deleted_q5
    )
    assert identity == 0
    return remainder


def newton_coefficients(expression: sp.Expr):
    degree = sp.Poly(expression, t).degree()
    assert degree == 11
    values = [
        sp.expand(expression.subs(t, value))
        for value in range(1, 14)
    ]
    coefficients = [values[0]]
    for _ in range(1, 12):
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
    assert sp.factor(coefficients[-1]) == (
        2772 * c[0] ** 2 * c[5] * h[4]
    )
    return coefficients


def numerical_integer_replay(expression: sp.Expr) -> None:
    # Verify Newton reconstruction at several integer leaf counts.
    coefficients = newton_coefficients(expression)
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
    numerical_integer_replay(expression)
    print("rank-6 terminal-bundle decomposition: PASS")
    print("residual degree in sibling leaves: 11")
    print("Newton coefficients required from t=1: 12")
    for rank, coefficient in enumerate(coefficients):
        polynomial = sp.Poly(
            coefficient,
            *c[:7],
            h[4],
            h[5],
        )
        negatives = sum(
            1 for _, value in polynomial.terms() if value < 0
        )
        print(
            f"Delta^{rank} R_1: terms={len(polynomial.terms())} "
            f"negative_raw_coefficients={negatives}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
