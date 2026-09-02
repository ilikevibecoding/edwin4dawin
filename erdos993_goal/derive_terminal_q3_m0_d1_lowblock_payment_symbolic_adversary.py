#!/usr/bin/env python3
"""Symbolic scratchpad for the d=1 low-block terminal-m0 payment cone."""

from __future__ import annotations

import sympy as sp


R, T, Y, j = sp.symbols("R T Y j", integer=True, nonnegative=True)
S = R + T
N = S + 1
C2 = lambda x: x * (x - 1) / 2
C3 = lambda x: x * (x - 1) * (x - 2) / 6

a = sp.expand(C2(N) - S)
W = sp.expand(S + C2(R))
wedges_f = sp.expand(W - R)
z2 = sp.expand(S * (N - 2) - 2 * wedges_f)
h2 = sp.expand(C2(S) - T)
c0 = sp.factor(a + z2 + h2)
f3 = sp.factor(C3(N) - S * (N - 2) + wedges_f)

n = N + 1
B2 = C2(R)
tau = C3(R) + (R - 1) * (Y - 1)
v4 = sp.expand(n - 3 + B2 + tau)


def rank3_counts(order, edges, wedges, connected_four):
    independent = C3(order) - edges * (order - 2) + wedges
    matchings = C2(edges) - wedges
    one_edge = (
        edges * C2(order - 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.factor(independent), sp.factor(one_edge)


P, R0 = rank3_counts(n + 1, n - 1, W, v4)
A0 = sp.factor(P * c0 - a * R0)


def main() -> None:
    for name, value in (
        ("a", a),
        ("c0", c0),
        ("f3", f3),
        ("P", P),
        ("R0", R0),
        ("A0", A0),
    ):
        print(name, sp.factor(value))


if __name__ == "__main__":
    main()
