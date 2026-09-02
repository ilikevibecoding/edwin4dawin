#!/usr/bin/env python3
"""Verify the two observed extremal rank-6 spider families exactly.

This is a rigorous family theorem, not yet a proof that these spiders
minimize over all trees.
"""

from __future__ import annotations

import sympy as sp


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_coefficient(order, rank):
    if isinstance(order, (int, sp.Integer)):
        if rank < 0 or rank > (int(order) + 1) // 2:
            return sp.Integer(0)
    return choose(order - rank + 1, rank)


def product_coefficient(path_orders, rank):
    if rank < 0:
        return sp.Integer(0)
    if not path_orders:
        return sp.Integer(rank == 0)
    first, *rest = path_orders
    return sp.expand(
        sum(
            path_coefficient(first, j)
            * product_coefficient(rest, rank - j)
            for j in range(rank + 1)
        )
    )


def spider_coefficient(arms, rank):
    absent = product_coefficient(arms, rank)
    present = product_coefficient(
        [length - 1 for length in arms],
        rank - 1,
    )
    return sp.expand(absent + present)


def rooted_margin(arms, rooted_length):
    d = spider_coefficient(arms, 4)
    e = spider_coefficient(arms, 5)
    deleted = list(arms)
    deleted.remove(rooted_length)
    if rooted_length > 1:
        deleted.append(rooted_length - 1)
    h = spider_coefficient(deleted, 4)
    k = spider_coefficient(deleted, 5)
    return sp.factor(d * (2 * e + d) - 24 * (e * h - d * k))


def main() -> int:
    L, t = sp.symbols("L t", integer=True, nonnegative=True)

    family_a = rooted_margin([1, 1, 1, 1, L], 1)
    polynomial_a = (
        2 * L**8
        - 27 * L**7
        + 35 * L**6
        - 949 * L**5
        + 10575 * L**4
        - 21440 * L**3
        + 29372 * L**2
        - 501408 * L
        + 1267200
    )
    assert sp.factor(
        family_a - (L + 1) * polynomial_a / 2880
    ) == 0
    shifted_a = sp.Poly(sp.expand(polynomial_a.subs(L, t + 13)), t)
    assert shifted_a.all_coeffs() == [
        2,
        181,
        7042,
        152022,
        1959990,
        15057221,
        63839430,
        116484240,
        8474400,
    ]
    assert all(value > 0 for value in shifted_a.all_coeffs())
    assert family_a.subs(L, 13) == 41195
    increment_a = sp.factor(family_a.subs(L, L + 1) - family_a)
    shifted_increment_a = sp.Poly(
        sp.expand((2880 * increment_a).subs(L, t + 13)),
        t,
    )
    assert shifted_increment_a.all_coeffs() == [
        18,
        1744,
        73052,
        1716712,
        24550682,
        216230536,
        1123753208,
        3036396288,
        2970976320,
    ]
    assert all(
        value > 0 for value in shifted_increment_a.all_coeffs()
    )
    assert increment_a.subs(L, 13) == 1031589

    family_b = rooted_margin([1, 1, 1, 2, L], 1)
    polynomial_b = (
        2 * L**9
        - 7 * L**8
        - 120 * L**7
        - 1390 * L**6
        + 4602 * L**5
        + 7217 * L**4
        + 4060 * L**3
        - 571740 * L**2
        + 744576 * L
        + 2266560
    )
    assert sp.factor(family_b - polynomial_b / 2880) == 0
    shifted_b = sp.Poly(sp.expand(polynomial_b.subs(L, t + 12)), t)
    assert shifted_b.all_coeffs() == [
        2,
        209,
        9576,
        250610,
        4089738,
        42568361,
        275950924,
        1020567540,
        1665399840,
        90017280,
    ]
    assert all(value > 0 for value in shifted_b.all_coeffs())
    assert family_b.subs(L, 12) == 31256

    print("rank-6 extremal spider families: CERTIFIED")
    print("(1,1,1,1,L): positive for L >= 13")
    print("(1,1,1,2,L): positive for L >= 12")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
