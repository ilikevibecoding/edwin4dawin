#!/usr/bin/env python3
"""Exact tail counterexample to global GSB leaf monotonicity."""

from __future__ import annotations

from flint import fmpz_poly as Poly


X = Poly([0, 1])
ONE_PLUS_X = Poly([1, 1])
ONE_PLUS_2X = Poly([1, 2])


def coefficient(poly: Poly, k: int) -> int:
    return int(poly[k]) if 0 <= k < len(poly) else 0


def reserve(poly: Poly, k: int) -> int:
    return (
        k * coefficient(poly, k) ** 2
        + coefficient(poly, k - 1) * coefficient(poly, k)
        - (k + 1)
        * coefficient(poly, k - 1)
        * coefficient(poly, k + 1)
    )


def main() -> int:
    m, t = 14, 8
    branch = ONE_PLUS_2X**t + X * ONE_PLUS_X**t
    new = branch**m + X * ONE_PLUS_2X ** (t * m)

    # Remove a far leaf from one of the t length-two arms in one branch.
    shortened_branch = (
        ONE_PLUS_X * ONE_PLUS_2X ** (t - 1)
        + X * ONE_PLUS_X ** (t - 1)
    )
    old = (
        branch ** (m - 1) * shortened_branch
        + X * ONE_PLUS_X * ONE_PLUS_2X ** (t * m - 1)
    )

    alpha = len(new) - 1
    cutoff = (2 * alpha + 1) // 3
    negative = []
    for k in range(1, len(new)):
        delta = reserve(new, k) - reserve(old, k)
        if delta < 0:
            negative.append((k, delta))

    assert 1 + m * (1 + 2 * t) == 239
    assert alpha == 126
    assert cutoff == 84
    assert [k for k, _ in negative] == [114]
    assert negative[0][0] >= cutoff
    assert all(
        reserve(new, k) - reserve(old, k) >= 0
        for k in range(1, cutoff)
    )
    assert reserve(new, 114) < 0

    print("Galvin T_(14,8) order: 239")
    print("alpha: 126")
    print("prefix cutoff: 84")
    print("unique negative GSB leaf increment rank: 114")
    print("all prefix GSB leaf increments: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
