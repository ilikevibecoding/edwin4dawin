#!/usr/bin/env python3
"""Explore a rooted-moment proof of the rank-5 cross-drop bound.

For a rooted tree (T,p), write

    d=i_3(T), e=i_4(T),
    h=i_3(T-p), k=i_4(T-p).

The fixed-rank inequality explored here is

    d(2e+d) - 20(eh-dk) >= 0.

Together with Q_4(T)>=0 it implies the sharper cross-drop inequality
needed by the normalized rank-5 leaf-payment lemma.
"""

from __future__ import annotations

import argparse

import sympy as sp


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def independent_3(order, edges, wedges):
    return choose(order, 3) - edges * (order - 2) + wedges


def independent_4(order, edges, wedges, triples):
    return (
        choose(order, 4)
        - edges * choose(order - 2, 2)
        + wedges * (order - 4)
        + choose(edges, 2)
        - triples
    )


def build_expression():
    n, S, R, degree, Z, Y = sp.symbols(
        "n S R degree Z Y", real=True
    )
    d = independent_3(n, n - 1, S)
    e = independent_4(n, n - 1, S, R)
    h = independent_3(n - 1, n - 1 - degree, S - Z)
    k = independent_4(
        n - 1,
        n - 1 - degree,
        S - Z,
        R - Y,
    )
    margin = sp.expand(d * (2 * e + d) - 20 * (e * h - d * k))

    u = sp.symbols("u", positive=True)
    A2, A3, t, B, q1, q2, qd = sp.symbols(
        "A2 A3 t B q1 q2 qd", nonnegative=True
    )
    N = 1 / u
    stars = (N**3 * A3 - (N - 2)) / 6
    normalized = sp.cancel(
        margin.subs(
            {
                n: N,
                S: (N**2 * A2 + N - 2) / 2,
                R: stars + N**2 * B,
                degree: N * t + 1,
                Z: (N**2 * t**2 + N * t) / 2 + N * q1,
                Y: (
                    (N**3 * t**3 - N * t) / 6
                    + (N**2 * q2 - N * q1) / 2
                    + N**2 * t * q1
                    + N * qd
                ),
            }
        )
        * u**7
    )
    assert sp.denom(normalized) == 1
    return sp.expand(normalized), (
        u,
        A2,
        A3,
        t,
        B,
        q1,
        q2,
        qd,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--derivatives", action="store_true")
    args = parser.parse_args()
    polynomial, variables = build_expression()
    print("degrees", sp.Poly(polynomial, *variables).degree_list())
    if args.derivatives:
        for variable in variables[1:]:
            derivative = sp.factor(sp.diff(polynomial, variable))
            print("derivative", variable, derivative)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
