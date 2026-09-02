#!/usr/bin/env python3
"""Exact symbolic bridge comparisons for a marked isolated terminal root.

The first lane treats R=K disjoint_union K1(v) and compares the marked-root
base K+2K1 against K+K2 with the root at an endpoint of K2.  All symbols are
literal independence/one-edge rows of K; the output is route diagnostics for
finding a positive all-order decomposition.
"""

from __future__ import annotations

import sympy as sp


def terminal_m1(rows, j):
    p0, p1, r0, r1, u0, u1, a, b, c0, e0 = rows
    A0 = p0*c0-a*r0
    A1 = p0*a+p1*c0+p1*a-a*r1
    Q0 = (j+1)*b*(c0+r0)-3*(p0+a)*e0
    Q1 = (j+1)*b*(a+r1)-3*p1*e0-3*b*(p0+a+p1)
    return sp.expand(
        (j+1)*a*(A0*u1+A1*u0+A1*u1)
        + a*(p0*Q1+p1*Q0+p1*Q1)
    )


def isolate_bridge():
    j = sp.symbols("j", integer=True, positive=True)
    n, i2, i3 = sp.symbols("n i2 i3", nonnegative=True)
    s2, s3, s4 = sp.symbols("s2 s3 s4", nonnegative=True)
    im3, im2, im1, ij, ip1 = sp.symbols(
        "im3 im2 im1 ij ip1", nonnegative=True
    )
    sj, sp1 = sp.symbols("sj sp1", nonnegative=True)

    # Joined base G1=K disjoint_union K2, root at an endpoint of K2.
    a = i2+n
    b = ij+im1
    joined = (
        i3+3*i2+2*n,
        i2+3*n+2,
        s4+3*s3+2*s2+i2+n,
        s3+3*s2+n+1,
        ip1+3*ij+2*im1,
        ij+3*im1+2*im2,
        a,
        b,
        s3+s2+2*i2+n,
        sp1+sj+2*ij+im1,
    )

    # Isolated-root base G0=K disjoint_union 2K1.
    isolated = (
        i3+3*i2+3*n+1,
        i2+3*n+3,
        s4+3*s3+3*s2,
        s3+3*s2,
        ip1+3*ij+3*im1+im2,
        ij+3*im1+3*im2+im3,
        a,
        b,
        s3+s2+2*i2+2*n,
        sp1+sj+2*ij+2*im1,
    )

    difference = sp.factor(terminal_m1(isolated, j)-terminal_m1(joined, j))
    variables = (j, n, i2, i3, s2, s3, s4, im3, im2, im1, ij, ip1, sj, sp1)
    polynomial = sp.Poly(sp.expand(difference), *variables)
    print("ISOLATE_BRIDGE_TERMS", len(polynomial.terms()))
    print("ISOLATE_BRIDGE_MIN_COEFFICIENT", min(polynomial.coeffs()))
    print("ISOLATE_BRIDGE_FACTOR", difference)


def main():
    isolate_bridge()


if __name__ == "__main__":
    main()
