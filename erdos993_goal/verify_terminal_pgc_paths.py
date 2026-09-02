#!/usr/bin/env python3
"""Symbolic certificate for Terminal PGC on paths.

For the path P_N,

    i_j(P_N) = C(N-j+1,j).

Deleting a terminal leaf and its degree-two support leaves P_(N-2).
This script verifies the closed positive formula for

    H_k(P_N) - H_(k-1)(P_(N-2)).

It also verifies the sharper prefix inequality

    3 H_k(P_N) - 4 H_(k-1)(P_(N-2)) > 0,

equivalently H_(k-1)/H_k < 3/4.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp


def coefficient(order: int, rank: int) -> int:
    if rank < 0 or 2 * rank > order + 1:
        return 0
    return comb(order - rank + 1, rank)


def reserve(order: int, rank: int) -> int:
    return (
        rank * coefficient(order, rank) ** 2
        + coefficient(order, rank - 1) * coefficient(order, rank)
        - (rank + 1)
        * coefficient(order, rank - 1)
        * coefficient(order, rank + 1)
    )


def main() -> None:
    n, k, h = sp.symbols("N k h", integer=True, nonnegative=True)

    # Extension means for the path P_N around G_k.
    mu_previous = (n - 2 * k + 3) * (n - 2 * k + 2) / (n - k + 2)
    mu_current = (n - 2 * k + 1) * (n - 2 * k) / (n - k + 1)
    slack_new = sp.factor(1 + mu_previous - mu_current)

    old_order = n - 2
    old_rank = k - 1
    old_mu_previous = (
        (old_order - 2 * old_rank + 3)
        * (old_order - 2 * old_rank + 2)
        / (old_order - old_rank + 2)
    )
    old_mu_current = (
        (old_order - 2 * old_rank + 1)
        * (old_order - 2 * old_rank)
        / (old_order - old_rank + 1)
    )
    slack_old = sp.factor(1 + old_mu_previous - old_mu_current)

    # Divide both H terms by C(N-k,k-1).  The ratio
    # C(N-k+1,k)/C(N-k,k-1) is (N-k+1)/k.
    normalized_difference = sp.factor(
        (n - k + 1) * slack_new - (k - 1) * slack_old
    )

    positive_polynomial = (
        4 * h**4
        + 10 * h**3 * k
        + 20 * h**3
        + 7 * h**2 * k**2
        + 39 * h**2 * k
        + 34 * h**2
        + h * k**3
        + 19 * h * k**2
        + 50 * h * k
        + 20 * h
        + 2 * k**3
        + 12 * k**2
        + 22 * k
    )
    expected = positive_polynomial / (
        (n - k) * (n - k + 1) * (n - k + 2)
    )
    assert sp.factor(
        normalized_difference.subs(n, h + 2 * k)
        - expected.subs(n, h + 2 * k)
    ) == 0

    # The 3/4-strengthening.  In the required prefix h=N-2k >= k,
    # so write h=k+r.  Every coefficient of the resulting numerator is
    # positive.
    normalized_three_quarters = sp.factor(
        3 * (n - k + 1) * slack_new - 4 * (k - 1) * slack_old
    )
    strong_polynomial = (
        12 * h**4
        + 26 * h**3 * k
        + 64 * h**3
        + 11 * h**2 * k**2
        + 113 * h**2 * k
        + 116 * h**2
        - 4 * h * k**3
        + 39 * h * k**2
        + 163 * h * k
        + 72 * h
        - k**4
        - 2 * k**3
        + 31 * k**2
        + 80 * k
    )
    strong_expected = strong_polynomial / (
        (n - k) * (n - k + 1) * (n - k + 2)
    )
    assert sp.factor(
        normalized_three_quarters.subs(n, h + 2 * k)
        - strong_expected.subs(n, h + 2 * k)
    ) == 0
    r = sp.symbols("r", integer=True, nonnegative=True)
    shifted_strong = sp.Poly(
        sp.expand(strong_polynomial.subs(h, k + r)),
        r,
        k,
    )
    assert all(coefficient > 0 for _, coefficient in shifted_strong.terms())

    # Independent exact evaluation, including boundary ranks.
    for order in range(4, 80):
        alpha = (order + 1) // 2
        cutoff = (2 * alpha + 1) // 3
        for rank in range(2, cutoff):
            new_h = Fraction(
                rank * reserve(order, rank),
                coefficient(order, rank - 1),
            )
            old_h = Fraction(
                (rank - 1) * reserve(order - 2, rank - 1),
                coefficient(order - 2, rank - 2),
            )
            gap = order - 2 * rank
            assert gap >= 0
            polynomial_value = int(
                positive_polynomial.subs({h: gap, k: rank})
            )
            closed_form = Fraction(
                comb(order - rank, rank - 1) * polynomial_value,
                (order - rank)
                * (order - rank + 1)
                * (order - rank + 2),
            )
            assert new_h - old_h == closed_form
            assert closed_form > 0

            assert gap >= rank
            strong_polynomial_value = int(
                strong_polynomial.subs({h: gap, k: rank})
            )
            strong_closed_form = Fraction(
                comb(order - rank, rank - 1)
                * strong_polynomial_value,
                (order - rank)
                * (order - rank + 1)
                * (order - rank + 2),
            )
            assert 3 * new_h - 4 * old_h == strong_closed_form
            assert strong_closed_form > 0

    print("PASS")
    print(
        "H_k(P_N)-H_(k-1)(P_(N-2)) "
        "= C(N-k,k-1)*Phi(N-2k,k)/"
        "[(N-k)(N-k+1)(N-k+2)]"
    )
    print("Phi has 14 nonnegative monomials and is positive for k>=1.")
    print(
        "3H_k(P_N)-4H_(k-1)(P_(N-2)) is positive in the prefix: "
        "after h=k+r its numerator has 14 positive monomials."
    )


if __name__ == "__main__":
    main()
