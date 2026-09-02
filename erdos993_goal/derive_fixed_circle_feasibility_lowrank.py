#!/usr/bin/env python3
"""Derive exact fixed-circle feasibility numerators in low rank.

This is a symbolic exploration helper, not a proof certificate.  It expresses
the unique real symmetric parameters (s,p) for which

    T00 + s (T10-T00) + p (T00-2*T10+T11) = 0

at z=x+iy on |z|^2=N(N-1)/16.  Every cross product is divided by y and then
y^2 is eliminated using the circle equation.
"""

from __future__ import annotations

import argparse
import sympy as sp


x, y, z, q = sp.symbols("x y z q", real=True)
d1, d2 = sp.symbols("d1 d2", positive=True)


def falling(variable: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((variable - j for j in range(order)), start=sp.Integer(1))


def rising(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((value + j for j in range(order)), start=sp.Integer(1))


def structured_h(B: sp.Expr, ds: list[sp.Expr]) -> sp.Expr:
    source = sp.Poly(sp.prod((4 * q - d for d in ds), start=sp.Integer(1)), q)
    return sp.expand(sum(
        source.nth(k) * falling(z, k) / rising(B + 2, k)
        for k in range(len(ds) + 1)
    ))


def append(poly: sp.Expr, parameter: int, C: sp.Expr) -> sp.Expr:
    return sp.expand(
        parameter * (z + C) * poly + (4 - parameter) * z * poly.subs(z, z - 1)
    )


def corners(B: sp.Expr, H: sp.Expr) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
    return (
        append(append(H, 0, B + 1), 0, B),
        append(append(H, 1, B + 1), 0, B),
        append(append(H, 1, B + 1), 1, B),
    )


def cross(left: sp.Expr, right: sp.Expr) -> sp.Expr:
    point = x + sp.I * y
    value = sp.expand_complex(
        left.subs(z, point) * sp.conjugate(right.subs(z, point))
    )
    return sp.expand(sp.im(value))


def eliminate_circle(odd: sp.Expr, radius_squared: sp.Expr) -> sp.Expr:
    quotient = sp.cancel(odd / y)
    polynomial = sp.Poly(sp.expand(quotient), y)
    result = sp.Integer(0)
    for (power,), coefficient in polynomial.terms():
        if power % 2:
            raise AssertionError((power, coefficient))
        result += coefficient * (radius_squared - x**2) ** (power // 2)
    return sp.factor(sp.cancel(result))


def derive(rank: int) -> None:
    B = sp.symbols("B", positive=True, integer=True)
    ds = [d1, d2][:rank]
    N = B + rank + 1
    radius_squared = sp.expand(N * (N - 1) / 16)
    H = structured_h(B, ds)
    t00, t10, t11 = corners(B, H)
    A = sp.expand(t10 - t00)
    D = sp.expand(t00 - 2 * t10 + t11)

    den = eliminate_circle(cross(A, D), radius_squared)
    snum = eliminate_circle(-cross(t00, D), radius_squared)
    pnum = eliminate_circle(cross(t00, A), radius_squared)
    disc = sp.factor(snum**2 - 4 * pnum * den)

    print(f"rank={rank}")
    for label, value in (
        ("Den", den),
        ("Snum", snum),
        ("Pnum", pnum),
        ("Den-Pnum", sp.factor(den - pnum)),
        ("Den+Pnum-Snum", sp.factor(den + pnum - snum)),
        ("Disc", disc),
    ):
        print(f"\n{label} degree_x={sp.Poly(value, x).degree()}")
        print(sp.factor(value))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("rank", type=int, choices=(0, 1, 2))
    args = parser.parse_args()
    derive(args.rank)


if __name__ == "__main__":
    main()
