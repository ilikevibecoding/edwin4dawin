#!/usr/bin/env python3
"""Symbolic rank-6 strong cross margin in edge-subforest counts."""

from __future__ import annotations

import sympy as sp


def choose(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(
        rank
    )


def independent_4(order, edges, wedges, triples):
    return (
        choose(order, 4)
        - edges * choose(order - 2, 2)
        + wedges * (order - 4)
        + choose(edges, 2)
        - triples
    )


def independent_5(
    order,
    edges,
    wedges,
    triples,
    wedge_edge,
    connected_four,
):
    return (
        choose(order, 5)
        - edges * choose(order - 2, 3)
        + wedges * choose(order - 3, 2)
        + (choose(edges, 2) - wedges) * (order - 4)
        - triples * (order - 4)
        - wedge_edge
        + connected_four
    )


def build_expression():
    n, W, R, L, U = sp.symbols("n W R L U", real=True)
    degree, Z, Y, V, P = sp.symbols(
        "degree Z Y V P", real=True
    )
    d = independent_4(n, n - 1, W, R)
    e = independent_5(n, n - 1, W, R, L, U)
    h = independent_4(
        n - 1, n - 1 - degree, W - Z, R - Y
    )
    k = independent_5(
        n - 1,
        n - 1 - degree,
        W - Z,
        R - Y,
        L - V,
        U - P,
    )
    margin = sp.expand(d * (2 * e + d) - 24 * (e * h - d * k))
    return margin, (n, W, R, L, U, degree, Z, Y, V, P)


def main() -> int:
    margin, variables = build_expression()
    print("degrees", sp.Poly(margin, *variables).degree_list())
    for variable in variables[1:]:
        print(
            "derivative",
            variable,
            sp.factor(sp.diff(margin, variable)),
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
