#!/usr/bin/env python3
"""Independent algebra and degree-partition audit of the new c5 floor."""
from __future__ import annotations

from functools import lru_cache
from fractions import Fraction
from math import comb

import sympy as sp


@lru_cache(None)
def partitions(total: int, cap: int) -> tuple[tuple[int, ...], ...]:
    if total == 0:
        return ((),)
    output = []
    for first in range(min(total, cap), 0, -1):
        for tail in partitions(total - first, first):
            output.append((first,) + tail)
    return tuple(output)


def degree_floor(order: int, beta: int) -> int:
    candidates = [
        sum(comb(x, 3) for x in part)
        for part in partitions(order - 2, order - 2)
        if sum(comb(x, 2) for x in part) == beta
    ]
    if not candidates:
        raise KeyError((order, beta))
    return min(candidates)


def main() -> int:
    n, beta, gamma, c4 = sp.symbols("n beta gamma c4")
    path4 = sp.binomial(n - 3, 4)
    x = path4 + (n - 5) * beta - gamma - c4
    a_coefficient = (
        sp.Rational(3, 2) * n**3
        - 20 * n**2
        + sp.Rational(133, 2) * n
        - 20
    )
    b_coefficient = 4 * n**2 - 35 * n + 49
    c_coefficient = 4 * n**2 - 30 * n + 34
    # Start independently from the exact motif identity and substitute only
    # W=V-(n-4) >= beta+gamma and the exact c4 solution for X=E-(n-3).
    substituted = sp.expand(
        a_coefficient * beta
        - b_coefficient * gamma
        - c_coefficient * x
        + 5 * (n - 3) * (beta + gamma)
    )
    target = (
        -sp.Rational(5, 2) * (n - 6) * (n - 3) ** 2 * beta
        + 10 * (n - 3) * gamma
        - c_coefficient * (path4 - c4)
    )
    assert sp.simplify(sp.expand_func(substituted - target)) == 0

    assert degree_floor(23, 20) == 8
    point_c4 = Fraction(660405825, 126742)
    point_c5 = Fraction(808963450, 63371)
    nn, bb, gg = 23, 20, 8
    cc = 4 * nn * nn - 30 * nn + 34
    margin = (
        -Fraction(5, 2) * (nn - 6) * (nn - 3) ** 2 * bb
        + 10 * (nn - 3) * gg
        - cc * (comb(nn - 3, 4) - point_c4)
    )
    lower = ((nn - 7) * (nn - 8) * point_c4 + margin) / (5 * (nn - 3))
    assert lower == Fraction(1832655243, 126742)
    assert lower - point_c5 == Fraction(214728343, 126742) > 0
    print("PASS independent c5-c4 moment algebra, B3 floor, and fake-point exclusion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
