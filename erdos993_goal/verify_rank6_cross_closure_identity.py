#!/usr/bin/env python3
"""Verify the exact normalized closure identity for the rank-6 cross margin.

For a rooted state A=(d,e,f,h,k), write

    C(A) = d(e^2-df)-2e(eh-dk).

The second state U is the one-rank-shifted deletion state arising when
a leaf is attached at a vertex different from the distinguished root.
This script verifies an exact decomposition of C(A+U) into the two
individual cross reserves and one mixed-deletion compatibility term.
"""

from __future__ import annotations

import sympy as sp


def cross(d, e, f, h, k):
    return d * (e**2 - d * f) - 2 * e * (e * h - d * k)


def main() -> int:
    x, s, c = sp.symbols("x s c", positive=True)
    D, E, r, q, R, S = sp.symbols(
        "D E r q R S", real=True
    )

    A = (
        1,
        x,
        x**2 * (1 - D),
        r,
        x * q,
    )
    U = (
        s,
        s * c * x,
        s * c**2 * x**2 * (1 - E),
        s * R,
        s * c * x * S,
    )
    total = tuple(A[index] + U[index] for index in range(5))

    g = D - 2 * (r - q)
    G = E - 2 * (R - S)
    compatibility = (
        (1 + s) * (1 - D - c * (1 - E))
        + 2 * (1 + c * s) * (R - r)
    )
    decomposition = (
        (1 + s) * (1 + c * s) * (g + c * s * G)
        + s * (c - 1) * compatibility
    )
    assert sp.factor(cross(*total) / x**2 - decomposition) == 0

    # At the two sharp cross boundaries, the leaf increment itself
    # collapses to the mixed compatibility term.
    boundary = {
        q: r - D / 2,
        S: R - E / 2,
    }
    increment = sp.expand(cross(*total) - cross(*A))
    assert sp.factor(
        increment.subs(boundary)
        - s * x**2 * (c - 1) * compatibility
    ) == 0

    print("rank-6 cross closure identity: PASS")
    print(
        "C(A+U)/x^2 = "
        "(1+s)(1+cs)(g+csG) + s(c-1)K"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
