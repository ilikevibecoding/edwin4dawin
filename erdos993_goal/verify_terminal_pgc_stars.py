#!/usr/bin/env python3
"""Exact Terminal-PGC certificate for stars."""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp


def coeff_star(leaves: int, rank: int) -> int:
    if rank < 0:
        return 0
    return (comb(leaves, rank) if rank <= leaves else 0) + (
        1 if rank == 1 else 0
    )


def coeff_edgeless(vertices: int, rank: int) -> int:
    return comb(vertices, rank) if 0 <= rank <= vertices else 0


def reserve(coeff, rank: int) -> int:
    return (
        rank * coeff(rank) ** 2
        + coeff(rank - 1) * coeff(rank)
        - (rank + 1) * coeff(rank - 1) * coeff(rank + 1)
    )


def main() -> None:
    m = sp.symbols("m", integer=True, positive=True)
    q1 = m + 1
    q2 = m * (m - 1) / 2
    q3 = m * (m - 1) * (m - 2) / 6
    g2 = 2 * q2**2 + q1 * q2 - 3 * q1 * q3
    rank_two_gap = sp.factor(2 * g2 / q1 - 2 * (m - 1))
    assert rank_two_gap == (m - 1) ** 2 * (m + 2) / (m + 1)
    rank_two_three_quarters_gap = sp.factor(
        3 * rank_two_gap - 2 * (m - 1)
    )
    assert rank_two_three_quarters_gap == (
        (m - 1) * (3 * m**2 + m - 8) / (m + 1)
    )

    for leaves in range(1, 200):
        alpha = leaves
        cutoff = (2 * alpha + 1) // 3
        for k in range(2, cutoff):
            new_reserve = reserve(
                lambda j: coeff_star(leaves, j),
                k,
            )
            old_reserve = reserve(
                lambda j: coeff_edgeless(leaves - 1, j),
                k - 1,
            )
            gap = Fraction(
                k * new_reserve,
                coeff_star(leaves, k - 1),
            ) - Fraction(
                (k - 1) * old_reserve,
                coeff_edgeless(leaves - 1, k - 2),
            )
            if k == 2:
                expected = Fraction(
                    (leaves - 1) ** 2 * (leaves + 2),
                    leaves + 1,
                )
            else:
                expected = (
                    2
                    * (leaves - k + 1)
                    * comb(leaves - 1, k - 1)
                )
            assert gap == expected
            assert gap > 0

            new_h = gap + Fraction(
                (k - 1) * old_reserve,
                coeff_edgeless(leaves - 1, k - 2),
            )
            old_h = Fraction(
                (k - 1) * old_reserve,
                coeff_edgeless(leaves - 1, k - 2),
            )
            strong_gap = 3 * new_h - 4 * old_h
            if k == 2:
                strong_expected = Fraction(
                    (leaves - 1)
                    * (3 * leaves**2 + leaves - 8),
                    leaves + 1,
                )
            else:
                strong_expected = (
                    2
                    * (3 * leaves - 4 * (k - 1))
                    * comb(leaves - 1, k - 1)
                )
            assert strong_gap == strong_expected
            assert strong_gap > 0

    print("PASS")
    print("k=2 gap: (m-1)^2(m+2)/(m+1)")
    print("k>=3 gap: 2(m-k+1) C(m-1,k-1)")
    print("The sharper prefix ratio H_old/H_new < 3/4 also holds.")


if __name__ == "__main__":
    main()
