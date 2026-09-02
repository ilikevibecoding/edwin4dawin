#!/usr/bin/env python3
"""Symbolically derive q3(T)-q3(G plus t isolates) for a terminal bundle."""

from __future__ import annotations

import sympy as sp


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def rank3_coordinates(
    order: sp.Expr, edges: sp.Expr, wedges: sp.Expr, connected_four: sp.Expr
) -> tuple[sp.Expr, sp.Expr]:
    i3 = choose(order, 3) - edges * (order - 2) + wedges
    matchings = choose(edges, 2) - wedges
    s3 = (
        edges * choose(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.expand(i3), sp.expand(s3)


def main() -> None:
    n, t, d, p, v4, neighbor_excess = sp.symbols(
        "n t d p v4 neighbor_excess", integer=True, nonnegative=True
    )
    iq, sq = rank3_coordinates(n + t, n - 1, p, v4)
    p_t = p + d + choose(t + 1, 2)
    v4_t = (
        v4
        + choose(d, 2)
        + choose(t + 1, 3)
        + neighbor_excess
        + d * t
    )
    it, st = rank3_coordinates(n + t + 1, n + t, p_t, v4_t)
    cross = sp.factor(sp.expand(st * iq - sq * it))
    print("i3_Q =", sp.factor(iq))
    print("s3_Q =", sp.factor(sq))
    print("i3_T =", sp.factor(it))
    print("s3_T =", sp.factor(st))
    print("cross =", cross)
    print("degree in t =", sp.Poly(cross, t).degree())
    shifted = sp.Poly(sp.expand(cross.subs(t, t + 1)), t)
    print("shifted coefficients (high to low):")
    for coefficient in shifted.all_coeffs():
        print(sp.factor(coefficient))


if __name__ == "__main__":
    main()
