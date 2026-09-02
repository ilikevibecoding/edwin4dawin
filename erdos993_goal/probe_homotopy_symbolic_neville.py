#!/usr/bin/env python3
"""Inspect symbolic Neville multipliers of the affine checker sandwich."""

from __future__ import annotations

import argparse

import sympy as sp

from verify_newton_checker_offdiag_homotopy import (
    bareiss_determinant,
    constant_and_linear,
    poly,
)


def to_sympy(p, t):
    return sum(sp.Rational(p[i].p, p[i].q) * t**i for i in range(p.degree() + 1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=8)
    args = parser.parse_args()
    q = args.q
    a, b = constant_and_linear(q)
    t = sp.symbols("t")
    delta = {}
    for c in range(q):
        for r in range(c, q):
            cols = range(r - c, r + 1)
            matrix = [
                [poly(a[i][j], b[i][j]) for j in cols]
                for i in range(c + 1)
            ]
            delta[c, r] = sp.factor(to_sympy(bareiss_determinant(matrix), t))

    for c in range(q - 1):
        for r in range(c + 1, q):
            numerator = delta[c, r]
            denominator = delta[c, r - 1]
            if c:
                numerator *= delta[c - 1, r - 2]
                denominator *= delta[c - 1, r - 1]
            multiplier = sp.cancel(numerator / denominator)
            num, den = map(sp.factor, sp.fraction(multiplier))
            print(f"c={c} r={r}\n  num={num}\n  den={den}")


if __name__ == "__main__":
    main()
