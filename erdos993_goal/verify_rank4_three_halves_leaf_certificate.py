#!/usr/bin/env python3
"""Exact large-order certificate for rank-4 three-halves leaf growth.

For every tree T of order n>=20 and every vertex p, adjoining a leaf at
p does not decrease

    Q4(I(T)) = 8 i4^2 - i3 i4 - 10 i3 i5.

The script reconstructs the exact normalized increment, checks all
monotone reductions used in the grouped rooted-moment proof, and proves
the final seven-variable polynomial nonnegative by exact adaptive tensor
Bernstein subdivision.
"""

from __future__ import annotations

from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    build_expression,
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)


def reconstruct_normalized_increment():
    u = sp.symbols("u", nonnegative=True)
    A2, A3, A4, t = sp.symbols("A2 A3 A4 t", nonnegative=True)
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)
    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", real=True
    )

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    e = n - 1
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    disconnected_pair_plus_edge = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - disconnected_pair_plus_edge
        + W
    )
    reserve = sp.expand(8 * i4**2 - i3 * i4 - 10 * i3 * i5)
    delta = sp.expand(
        reserve.xreplace(
            {
                n: n + 1,
                S: S + d,
                R: R + Z,
                H: H + choose(d, 2),
                W: W + Y,
            }
        )
        - reserve
    )
    N = 1 / u
    F = sp.cancel(
        delta.subs(
            {
                n: N,
                S: (N**2 * A2 + N - 2) / 2,
                H: (N**3 * A3 - (N - 2)) / 6,
                R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
                W: (
                    N**4 * A4
                    - 2 * N**3 * A3
                    - N**2 * A2
                    + 2 * (N - 2)
                )
                / 24
                + N**3 * Tc
                + N**2 * P5,
                d: N * t + 1,
                Z: (N**2 * t**2 + N * t) / 2 + N * q1,
                Y: (
                    (N**3 * t**3 - N * t) / 6
                    + (N**2 * q2 - N * q1) / 2
                    + N**2 * t * q1
                    + N * qd
                ),
            }
        )
        * u**6
    )
    assert sp.denom(F) == 1
    symbols = {
        "u": u,
        "A2": A2,
        "A3": A3,
        "A4": A4,
        "t": t,
        "B": B,
        "Tc": Tc,
        "P5": P5,
        "q1": q1,
        "q2": q2,
        "qd": qd,
    }
    return F, symbols


def check_monotone_reductions(F, x) -> None:
    u = x["u"]
    A2, A3, A4, t = x["A2"], x["A3"], x["A4"], x["t"]
    B, Tc, P5 = x["B"], x["Tc"], x["P5"]
    q1, q2, qd = x["q1"], x["q2"], x["qd"]
    M = 1 - 2 * u
    m = M - t
    positive = 1 - 5 * u + 6 * u**2 + 2 * t * u
    local_positive = (
        1 - 6 * u + 8 * u**2 + 3 * A2 * u + 6 * t * u**2
    )
    assert sp.expand(sp.diff(F, A4) + 5 * positive / 24) == 0
    assert sp.expand(sp.diff(F, P5) + 5 * u**2 * positive) == 0
    assert sp.expand(sp.diff(F, q2) + 5 * u * local_positive / 6) == 0
    assert sp.expand(
        sp.diff(F, qd) + 5 * u**2 * local_positive / 3
    ) == 0
    assert sp.expand(sp.diff(F, Tc) + 5 * u * positive) == 0
    assert 1 - 5 * sp.Rational(1, 20) > 0
    assert 1 - 6 * sp.Rational(1, 20) > 0

    # After A4 <= t^4+m(A3-t^3), the A3 derivative is J/24.
    J = (
        -12 * A2 * u
        + 64 * q1 * u**2
        + 42 * t**2 * u
        + 58 * t * u**2
        - 59 * t * u
        + 5 * t
        - 196 * u**3
        + 264 * u**2
        - 105 * u
        + 11
    )
    assert sp.expand(
        sp.diff(F, A3) + m * sp.diff(F, A4) - J / 24
    ) == 0
    # On u<=1/20, A2<=1 and the complete t term is nonnegative.
    assert 5 - 59 * sp.Rational(1, 20) > 0
    assert (
        11
        - 117 * sp.Rational(1, 20)
        - 196 * sp.Rational(1, 20) ** 3
        > 0
    )

    # Tc <= (1-4u)B/2.  The effective B derivative is u K/2.
    K = (
        -6 * A2 * u
        + 32 * q1 * u**2
        + 16 * t**2 * u
        + 54 * t * u**2
        - 22 * t * u
        + 22 * u**3
        + 17 * u**2
        - 20 * u
        + 3
    )
    assert sp.expand(
        sp.diff(F, B)
        + (1 - 4 * u) * sp.diff(F, Tc) / 2
        - u * K / 2
    ) == 0
    assert 3 - 48 * sp.Rational(1, 20) > 0

    # B >= t q1+u qd.  Along both correlation boundaries F still
    # decreases in qd.
    correlated = sp.expand(
        F.subs(
            {
                B: t * q1 + u * qd,
                Tc: (1 - 4 * u) * (t * q1 + u * qd) / 2,
            }
        )
    )
    E = (
        -48 * A2 * u
        + 96 * q1 * u**2
        + 48 * t**2 * u
        + 102 * t * u**2
        - 66 * t * u
        + 66 * u**3
        - 29 * u**2
        - 1
    )
    assert sp.expand(sp.diff(correlated, qd) - u**2 * E / 6) == 0
    assert 48 + 102 * sp.Rational(1, 20) - 66 < 0
    assert (
        -1
        + 67 * sp.Rational(1, 20) ** 2
        + 66 * sp.Rational(1, 20) ** 3
        < 0
    )


def check_star_center() -> None:
    leaves = sp.symbols("leaves", integer=True, nonnegative=True)

    def q4(number):
        return (
            8 * sp.binomial(number, 4) ** 2
            - sp.binomial(number, 3) * sp.binomial(number, 4)
            - 10 * sp.binomial(number, 3) * sp.binomial(number, 5)
        )

    increment = sp.factor(sp.combsimp(q4(leaves + 1) - q4(leaves)))
    expected = (
        leaves**2
        * (leaves - 2)
        * (leaves - 1) ** 2
        * (7 * leaves - 5)
        / 144
    )
    assert sp.expand(increment - expected) == 0


def check_bernstein_certificate():
    G, variables = build_expression()
    v = sp.symbols("v", nonnegative=True)
    box_variables = (v,) + variables[1:]
    box_poly = sp.expand(G.subs(variables[0], v / 20))
    degrees, coefficients = tensor_bernstein_fast(
        box_poly, box_variables
    )
    assert degrees == (6, 5, 5, 5, 3, 3, 3)
    assert minimum_with_index(coefficients) == (
        sp.Rational(-1, 48),
        (0, 0, 0, 0, 0, 0, 2),
    )

    stack = [(coefficients, 0, ())]
    certified = 0
    maximum_depth = 0
    depth_counts = {}
    smallest = None
    unresolved = []
    while stack:
        patch, depth, address = stack.pop()
        minimum = minimum_with_index(patch)
        if minimum[0] >= 0:
            certified += 1
            maximum_depth = max(maximum_depth, depth)
            depth_counts[depth] = depth_counts.get(depth, 0) + 1
            candidate = (minimum[0], minimum[1], address)
            if smallest is None or candidate[0] < smallest[0]:
                smallest = candidate
            continue
        if depth >= 14:
            unresolved.append((minimum, address))
            continue
        axis = depth % len(box_variables)
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((left, depth + 1, address + ((axis, 0),)))
        stack.append((right, depth + 1, address + ((axis, 1),)))

    assert not unresolved
    assert certified == 108
    assert maximum_depth == 14
    assert depth_counts == {
        2: 2,
        5: 8,
        6: 6,
        7: 12,
        8: 8,
        9: 8,
        10: 8,
        11: 8,
        13: 16,
        14: 32,
    }
    assert smallest is not None
    assert smallest[0] == sp.Rational(5006347, 3686400000)
    return certified, maximum_depth, smallest[0]


def main() -> int:
    F, symbols = reconstruct_normalized_increment()
    check_monotone_reductions(F, symbols)
    check_star_center()
    certified, depth, smallest = check_bernstein_certificate()
    print("rank-4 three-halves large-order leaf certificate: PASS")
    print("large-order domain: n >= 20")
    print(f"certified Bernstein patches: {certified}")
    print(f"maximum subdivision depth: {depth}")
    print(f"smallest terminal Bernstein coefficient: {smallest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
