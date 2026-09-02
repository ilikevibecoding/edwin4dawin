#!/usr/bin/env python3
"""Verify the order-sensitive tail and pendant cutoff arithmetic."""

from __future__ import annotations

from fractions import Fraction

import sympy as sp


def ceiling(value: Fraction) -> int:
    return (
        value.numerator + value.denominator - 1
    ) // value.denominator


def cutoff(order: int, alpha: int) -> int:
    return ceiling(
        Fraction(alpha * (order - 1), alpha + order)
    )


def main() -> None:
    n, alpha = sp.symbols(
        "n alpha", positive=True, integer=True
    )
    a_g = alpha * (n - 1) / (alpha + n)
    a_f = (
        (alpha - 1) * (n - 3) / (alpha + n - 3)
    )
    a_t_same = alpha * (n - 2) / (alpha + n - 1)
    a_t_lower = (
        (alpha - 1) * (n - 2) / (alpha + n - 2)
    )

    assert sp.factor(
        a_g - 1 - a_f
        - alpha
        * (alpha - 2 * n + 3)
        / ((alpha + n) * (alpha + n - 3))
    ) == 0
    assert sp.factor(
        a_g
        - a_t_same
        - alpha
        * (alpha + 1)
        / ((alpha + n) * (alpha + n - 1))
    ) == 0
    assert sp.factor(
        a_g
        - a_t_lower
        - (alpha**2 + n**2 - 2 * n)
        / ((alpha + n) * (alpha + n - 2))
    ) == 0
    assert sp.factor(
        1
        - (a_g - a_t_lower)
        - 2
        * alpha
        * (n - 1)
        / ((alpha + n) * (alpha + n - 2))
    ) == 0

    # The forest endpoint n<=2 alpha recovers the familiar coarse
    # two-thirds tail, while stars receive an approximately one-half
    # cutoff.
    coarse = sp.Rational(2, 3) * alpha - sp.Rational(1, 3)
    assert sp.factor(
        a_g.subs(n, 2 * alpha) - coarse
    ) == 0
    star_cutoff = sp.factor(a_g.subs(n, alpha + 1))
    assert star_cutoff == alpha**2 / (2 * alpha + 1)

    audited = 0
    for order in range(3, 2001):
        for independence in range(
            (order + 1) // 2,
            order,
        ):
            full = cutoff(order, independence)
            pair_deleted = cutoff(
                order - 2, independence - 1
            )
            same_alpha_leaf_deleted = cutoff(
                order - 1, independence
            )
            lower_alpha_leaf_deleted = cutoff(
                order - 1, independence - 1
            )

            assert pair_deleted >= full - 1
            assert 0 <= (
                full - same_alpha_leaf_deleted
            ) <= 1
            assert 0 <= (
                full - lower_alpha_leaf_deleted
            ) <= 1
            if full >= 4:
                # The largest required value is rank=full-1.
                assert full - 2 < pair_deleted
            audited += 1

    print("PASS")
    print("audited (order, alpha) pairs:", audited)


if __name__ == "__main__":
    main()
