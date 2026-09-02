#!/usr/bin/env python3
"""Symbolic proof certificate for rank-2 PGC on every forest."""

from __future__ import annotations

import sympy as sp


def main() -> None:
    n, e, z, d = sp.symbols(
        "n e z d", integer=True, nonnegative=True
    )
    c = sp.symbols("c", integer=True, positive=True)

    i2 = n * (n - 1) / 2 - e
    i3 = n * (n - 1) * (n - 2) / 6 - e * (n - 2) + z
    g2 = sp.factor(2 * i2**2 + n * i2 - 3 * n * i3)
    assert g2 == 2 * e**2 + e * n**2 - 5 * e * n + n**3 - n**2 - 3 * n * z

    # F=G-{leaf,p} has n-2 vertices and e-d edges, and
    # G_1(F)=2(|V(F)|+|E(F)|).
    cleared = sp.factor(2 * g2 - 2 * n * ((n - 2) + (e - d)))
    expected = 2 * (
        d * n
        + 2 * e**2
        + e * n**2
        - 6 * e * n
        + n**3
        - 2 * n**2
        - 3 * n * z
        + 2 * n
    )
    assert sp.factor(cleared - expected) == 0

    # A forest has c=n-e components.  Also z=sum_v C(deg(v),2)
    # counts pairs of incident edges, so z <= C(e,2).
    lower = sp.factor(
        expected.subs({n: e + c, z: e * (e - 1) / 2})
    )
    positivity_polynomial = (
        e**3
        + 7 * e**2 * c
        - 9 * e**2
        + 8 * e * c**2
        - 17 * e * c
        + 4 * e
        + 2 * c**3
        - 4 * c**2
        + 4 * c
        + 2 * d * (e + c)
    )
    assert sp.factor(lower - positivity_polynomial) == 0

    # For c>=2 the polynomial increases with c and is minimized at
    # c=2,d=1.
    increment_c = sp.factor(
        positivity_polynomial.subs(c, c + 1)
        - positivity_polynomial
    )
    assert increment_c == (
        6 * c**2
        + 16 * c * e
        - 2 * c
        + 2 * d
        + 7 * e**2
        - 9 * e
        + 2
    )
    base_disconnected = sp.factor(
        positivity_polynomial.subs({c: 2, d: 1})
    )
    assert base_disconnected == e**3 + 5 * e**2 + 4 * e + 12

    # For c=1,e>=2, the neighbour of a leaf has d>=2.  The minimum is
    # (e-2)(e^2-1)+4.
    base_tree = sp.factor(
        positivity_polynomial.subs({c: 1, d: 2})
    )
    assert sp.expand(base_tree - ((e - 2) * (e**2 - 1) + 4)) == 0

    # Sharper 3/4 cascade at rank two:
    #
    #     H_1(F)/H_2(G) <= 3/4
    #     <=> 3 H_2(G) - 4 H_1(F) >= 0.
    #
    # Multiplication by n clears the sole denominator.
    strong_cleared = sp.factor(
        6 * g2 - 8 * n * ((n - 2) + (e - d))
    )
    strong_lower = sp.factor(
        strong_cleared.subs(
            {n: e + c, z: e * (e - 1) / 2}
        )
    )
    strong_polynomial = (
        3 * e**3
        + 21 * e**2 * c
        - 31 * e**2
        + 24 * e * c**2
        - 57 * e * c
        + 8 * e * d
        + 16 * e
        + 6 * c**3
        - 14 * c**2
        + 8 * c * d
        + 16 * c
    )
    assert sp.factor(strong_lower - strong_polynomial) == 0

    strong_increment_c = sp.factor(
        strong_polynomial.subs(c, c + 1) - strong_polynomial
    )
    assert strong_increment_c == (
        18 * c**2
        + 48 * c * e
        - 10 * c
        + 8 * d
        + 21 * e**2
        - 33 * e
        + 8
    )
    strong_disconnected = sp.factor(
        strong_polynomial.subs({c: 2, d: 1})
    )
    assert strong_disconnected == (e + 4) * (
        3 * e**2 - e + 10
    )

    strong_tree = sp.factor(
        strong_polynomial.subs({c: 1, d: 2})
    )
    assert strong_tree == 3 * e**3 - 10 * e**2 - e + 24
    assert strong_tree.subs(e, 2) == 6
    assert sp.factor(strong_tree.subs(e, e + 1) - strong_tree) == (
        9 * e**2 - 11 * e - 8
    )

    print("PASS")
    print("rank-2 PGC holds for every forest")
    print("disconnected lower bound: e^3+5e^2+4e+12")
    print("connected lower bound: (e-2)(e^2-1)+4 for e>=2")
    print("the sharper rank-2 ratio H_1(F)/H_2(G) <= 3/4 also holds")
    print("strong disconnected bound: (e+4)(3e^2-e+10)")
    print("strong connected bound: 3e^3-10e^2-e+24 for e>=2")


if __name__ == "__main__":
    main()
