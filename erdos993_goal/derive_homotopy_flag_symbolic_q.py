#!/usr/bin/env python3
"""Factor small homotopy flag minors symbolically in the size q.

This is an exploratory exact-algebra program.  It uses the closed normalized
Jacobi row formula, the Catalan-square formula for the checker core, and a
finite universal beta inverse.  For fixed (c,r), all sums are confined to
indices at most r, so the resulting flag minor is a rational function of q.
"""

from __future__ import annotations

import argparse
from functools import cache
from math import comb

import sympy as sp

from fast_bottom_forward import catalan
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse


x, t = sp.symbols("q t")


def rising(a, k):
    return sp.rf(a, k)


def choose(a, k):
    if k < 0:
        return sp.S.Zero
    return sp.prod(a - h for h in range(k)) / sp.factorial(k)


@cache
def uj(i, j):
    """Jacobi upper entry after positive row normalization."""
    if j < i:
        return sp.S.Zero
    n, k = x - 1 - i, j - i
    return sp.cancel(
        4**k * choose(n, k)
        * rising(n + sp.Rational(7, 2) - k, k)
        / rising(2 * n + 4 - k, k)
    )


@cache
def rr(i, j):
    if j < i:
        return sp.S.Zero
    return sp.Integer((-1) ** (j - i) * catalan(j - i + 1))


@cache
def d0(i):
    return 1 / choose(x - 1, i)


@cache
def d1(i):
    return 1 / choose(x + 1, i + 1)


@cache
def middle(i, j):
    if j < i:
        return sp.S.Zero
    value = d0(i) if i == j else sp.S.Zero
    value -= sum(rr(i, k) * d1(k) * rr(k, j) for k in range(i, j + 1))
    return sp.cancel(value)


def vbar(size):
    raw = beta_checker_inverse(size)
    return [
        [sp.Rational(value.numerator, value.denominator) for value in row]
        for row in raw
    ]


def entry(i, j, v):
    value = sp.S.Zero
    for a in range(i, j + 1):
        for b in range(a, j + 1):
            m = middle(a, b)
            if a != b:
                m *= t
            value += uj(i, a) * m * v[b][j]
    return sp.cancel(value)


def flag(c, r):
    v = vbar(r + 1)
    matrix = [
        [entry(i, j, v) for j in range(r - c, r + 1)]
        for i in range(c + 1)
    ]
    return sp.factor(sp.cancel(sp.det(sp.Matrix(matrix))))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-c", type=int, default=3)
    parser.add_argument("--max-r", type=int, default=6)
    args = parser.parse_args()
    for c in range(args.max_c + 1):
        for r in range(c, args.max_r + 1):
            value = flag(c, r)
            print(f"c={c} r={r}")
            numerator, denominator = sp.fraction(sp.cancel(value))
            polynomial = sp.Poly(numerator, t)
            denominator = sp.factor(denominator)
            for degree in range(polynomial.degree() + 1):
                coefficient = sp.factor(sp.cancel(polynomial.nth(degree) / denominator))
                print(f"  t^{degree}: {coefficient}")
            print(f"  common denominator: {denominator}", flush=True)


if __name__ == "__main__":
    main()
