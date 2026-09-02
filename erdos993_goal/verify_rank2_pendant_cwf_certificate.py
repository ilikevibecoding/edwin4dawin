#!/usr/bin/env python3
"""Exact symbolic certificate for rank-2 pendant-hub CWF closure.

Let an old planted root have Q children.  Deleting the root leaves a
Q-component forest B with N=Q+z vertices and z edges.  Let D=x I(H), where
H is obtained by also deleting the Q child roots.  Write

    W = number of unordered adjacent pairs among the z edges of B,
    c = number of edges of B incident with one of its Q component roots.

Then

    b1=N,
    b2=C(N,2)-z,
    b3=C(N,3)-z(N-2)+W,
    d1=1,
    d2=z,
    d3=C(z,2)-z+c.

Attach a new hub above the old root and give the hub R leaf children.
For

    P=(1+x)^R(B+D),  S=xB,

put p_k=k![x^k]P and s_k=k![x^k]S.  This script verifies that the
rank-2 child-weighted factorial reserve

    T=(R-1)(p_2^2-p_3 p_1)
      +(R+1)(2p_2 s_2-p_3 s_1-s_3 p_1)

is nonnegative whenever R,Q>=2.  Indeed T is decreasing in W+c, while

    W <= C(z,2),   c <= z.

After using those two elementary forest bounds and shifting
R=rr+2, Q=qq+2, the lower bound has coefficientwise positive monomials.
All calculations are exact SymPy integer/rational identities.
"""

from __future__ import annotations

import sympy as sp


def coefficient(poly: list[sp.Expr], index: int) -> sp.Expr:
    return poly[index] if 0 <= index < len(poly) else sp.Integer(0)


def convolution(
    left: list[sp.Expr], right: list[sp.Expr]
) -> list[sp.Expr]:
    result = [sp.Integer(0)] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return list(map(sp.expand, result))


def factorial_transform(poly: list[sp.Expr]) -> list[sp.Expr]:
    return [
        sp.factorial(index) * value
        for index, value in enumerate(poly)
    ]


def main() -> int:
    R, Q, z, W, c = sp.symbols("R Q z W c", nonnegative=True)
    rr, qq = sp.symbols("rr qq", nonnegative=True)
    N = Q + z

    B = [
        sp.Integer(1),
        N,
        sp.binomial(N, 2) - z,
        sp.binomial(N, 3) - z * (N - 2) + W,
    ]
    D = [
        sp.Integer(0),
        sp.Integer(1),
        z,
        sp.binomial(z, 2) - z + c,
    ]
    A = [sp.expand(B[i] + D[i]) for i in range(4)]
    kernel = [
        sp.Integer(1),
        R,
        R * (R - 1) / 2,
        R * (R - 1) * (R - 2) / 6,
    ]
    p = factorial_transform(convolution(kernel, A))
    s = factorial_transform([sp.Integer(0), *B])

    target = sp.expand_func(
        (R - 1) * (p[2] ** 2 - p[3] * p[1])
        + (R + 1)
        * (
            2 * p[2] * s[2]
            - p[3] * s[1]
            - s[3] * p[1]
        )
    )
    target = sp.expand(target)

    # T has the same strictly negative coefficient on W and c.
    wc_coefficient = sp.factor(sp.diff(target, W))
    assert sp.expand(sp.diff(target, c) - wc_coefficient) == 0
    expected_wc_coefficient = -6 * (
        Q * (R - 1) + R**2 + R + z * (R - 1)
    )
    assert sp.expand(wc_coefficient - expected_wc_coefficient) == 0

    # Every pair of adjacent edges is one of the C(z,2) pairs of edges,
    # and c is a subset of the z edges.  Since the common coefficient is
    # negative, substitute their respective upper bounds.
    lower_bound = sp.factor(
        target.subs({W: z * (z - 1) / 2, c: z})
    )
    shifted = sp.Poly(
        sp.expand(lower_bound.subs({R: rr + 2, Q: qq + 2})),
        rr,
        qq,
        z,
    )
    assert all(value > 0 for value in shifted.coeffs())

    print("coefficient of W and c:")
    print(wc_coefficient)
    print("\ncertified lower bound:")
    print(lower_bound)
    print("\nshifted coefficientwise-positive polynomial:")
    print(shifted.as_expr())
    print(
        "\nPASS: rank-2 pendant-hub CWF reserve is nonnegative "
        "for every R,Q>=2."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
