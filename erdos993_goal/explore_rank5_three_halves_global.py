#!/usr/bin/env python3
"""Explore a global rank-5 Q certificate from edge-subforest counts."""

from __future__ import annotations

import sympy as sp


def choose(a, k):
    return sp.prod(a - j for j in range(k)) / sp.factorial(k)


def build_lower_bound(include_five_star: bool = True):
    n = sp.symbols("n", positive=True)
    S, R, H, W, Wt, Ws, X, V = sp.symbols(
        "S R H W Wt Ws X V", nonnegative=True
    )
    e = n - 1

    # Counts of edge subsets by (number of edges, number of nontrivial
    # components), retaining only categories whose vertex union has at
    # most six vertices.
    N22 = choose(e, 2) - S
    N32 = S * (e - 2) - 2 * R - H
    N33 = choose(e, 3) - R - N32
    N42 = (
        R * (e - 4)
        + choose(S, 2)
        - 2 * H
        - 3 * W
        - Wt
        - 4 * Ws
    )

    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 3)
        + N22
        - R
    )
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + N22 * (n - 4)
        - R * (n - 4)
        - N32
        + W
    )
    i6 = (
        choose(n, 6)
        - e * choose(n - 2, 4)
        + S * choose(n - 3, 3)
        + N22 * choose(n - 4, 2)
        - R * choose(n - 4, 2)
        - N32 * (n - 5)
        - N33
        + W * (n - 5)
        + N42
        - V
    )
    reserve = sp.expand(10 * i5**2 - i4 * i5 - 12 * i4 * i6)
    assert sp.expand(sp.diff(reserve, V) - 12 * i4) == 0
    u = sp.symbols("u", positive=True)
    A2, A3, A4, A5, C5, B, Tc, P5 = sp.symbols(
        "A2 A3 A4 A5 C5 B Tc P5", nonnegative=True
    )
    N = 1 / u
    five_star = (
        N**5 * A5
        - 5 * N**4 * A4
        + 5 * N**3 * A3
        + 5 * N**2 * A2
        - 6 * (N - 2)
    ) / 120
    lower = sp.expand(
        reserve.subs(
            V,
            (five_star + N**4 * C5)
            if include_five_star
            else N**4 * C5,
        )
    )
    normalized = sp.cancel(
        lower.subs(
            {
                n: N,
                S: (N**2 * A2 + N - 2) / 2,
                H: (N**3 * A3 - (N - 2)) / 6,
                R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
                Ws: (
                    N**4 * A4
                    - 2 * N**3 * A3
                    - N**2 * A2
                    + 2 * (N - 2)
                )
                / 24,
                Wt: N**3 * Tc,
                W: (
                    N**4 * A4
                    - 2 * N**3 * A3
                    - N**2 * A2
                    + 2 * (N - 2)
                )
                / 24
                + N**3 * Tc
                + N**2 * P5,
            }
        )
        * u**9
    )
    assert sp.denom(normalized) == 1
    return sp.expand(normalized), (
        u,
        A2,
        A3,
        A4,
        A5,
        C5,
        B,
        Tc,
        P5,
    )


def main():
    polynomial, variables = build_lower_bound()
    print("degrees", sp.Poly(polynomial, *variables).degree_list())
    for variable in variables[1:]:
        derivative = sp.factor(sp.diff(polynomial, variable))
        print("derivative", variable, derivative)


if __name__ == "__main__":
    main()
