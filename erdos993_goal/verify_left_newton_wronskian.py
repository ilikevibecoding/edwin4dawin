#!/usr/bin/env python3
"""Exact checks for the Newton/co-recursive model of the left branch factor.

The checks are finite evidence for two all-order identities used in the
prospective proof:

* after reversal and positive diagonal scaling, the even columns are the
  Newton basis X_m(n)=n^(falling m)(n+4)_m;
* after clearing a common positive row denominator, the initial Wronskians
  are two explicit terminating 2F1 polynomials.

No finite range is presented as a proof of either identity.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from math import factorial
from pathlib import Path

import sympy as sp

from probe_left_production import coefficient_arrays


OUT = Path("left_newton_wronskian_20260803.json")
n, x = sp.symbols("n x")


def falling(a, k):
    return sp.prod((a - j for j in range(k)), start=sp.S.One)


def rising(a, k):
    return sp.prod((a + j for j in range(k)), start=sp.S.One)


def p_cubic(m):
    return (
        n**3
        + 3 * (m + 3) * n**2
        + sp.Rational(48 * m + 119, 4) * n
        + sp.Rational(3 * (15 * m * m + 56 * m + 47), 4 * (m + 1))
    )


def dscale(m):
    return 4**m * factorial(m) * sp.rf(sp.Rational(7, 2), m)


def x_column(m):
    return falling(n, m) * rising(n + 4, m)


def h_column(m):
    # Gamma-ratio interpretation of (n+4)_(m-2), including m=0,1.
    if m == 0:
        shifted = 1 / ((n + 2) * (n + 3))
    elif m == 1:
        shifted = 1 / (n + 3)
    else:
        shifted = rising(n + 4, m - 2)
    return sp.cancel(
        4 * (m + 1) * (2 * m + 7)
        * falling(n, m + 1) * shifted * p_cubic(m)
        / ((2 * n + 3) * (2 * n + 5))
    )


def polynomial_columns(count):
    rho = (n + 2) * (2 * n + 3) * (2 * n + 5)
    result = []
    for m in range((count + 1) // 2):
        result.append(sp.expand(rho * x_column(m)))
        if len(result) < count:
            # Omit the harmless positive column scale in h_column.
            result.append(sp.cancel(rho * h_column(m)
                                    / (4 * (m + 1) * (2 * m + 7))))
    return [sp.expand(value) for value in result]


def even_hyper(r):
    y = x**2
    value = sp.S.Zero
    for k in range(r + 1):
        value -= (
            sp.rf(-r, k) * sp.rf(-r - sp.Rational(1, 2), k)
            / (sp.rf(-sp.Rational(1, 2), k) * factorial(k))
            * (4 * y) ** k
        )
    return sp.expand(value)


def odd_hyper(r):
    y = x**2
    value = sp.S.Zero
    for k in range(r + 2):
        value += (
            sp.rf(-r - 1, k) * sp.rf(-r - sp.Rational(3, 2), k)
            / (sp.rf(-sp.Rational(3, 2), k) * factorial(k))
            * (4 * y) ** k
        )
    return sp.expand(value)


def proportional(a, b):
    pa, pb = sp.Poly(a, x), sp.Poly(b, x)
    ratio = sp.cancel(pa.LC() / pb.LC())
    assert sp.expand(a - ratio * b) == 0
    assert ratio > 0
    return ratio


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=40)
    parser.add_argument("--max-r", type=int, default=7)
    args = parser.parse_args()

    u, h = coefficient_arrays(args.max_q + 1)
    entry_checks = 0
    for nn in range(args.max_q + 1):
        lead = sp.Rational(u[nn][nn].numerator, u[nn][nn].denominator)
        for m in range(nn + 1):
            actual = sp.Rational(u[nn][nn - m].numerator,
                                 u[nn][nn - m].denominator)
            predicted = lead * x_column(m).subs(n, nn) / dscale(m)
            assert sp.cancel(actual - predicted) == 0
            entry_checks += 1
        for m in range(nn):
            actual = sp.Rational(h[nn][nn - m - 1].numerator,
                                 h[nn][nn - m - 1].denominator)
            predicted = lead * h_column(m).subs(n, nn) / dscale(m + 1)
            assert sp.cancel(actual - predicted) == 0
            entry_checks += 1

    columns = polynomial_columns(2 * args.max_r + 1)
    wronskian_checks = 0
    constants = []
    for r in range(1, args.max_r + 1):
        size = 2 * r
        wronskian = sp.Matrix([
            [sp.diff(columns[j], n, i) for j in range(size)]
            for i in range(size)
        ]).det(method="bareiss")
        shifted = sp.expand(wronskian.subs(n, x - 2))
        constants.append([size, str(proportional(shifted, even_hyper(r)))])
        wronskian_checks += 1

        size += 1
        wronskian = sp.Matrix([
            [sp.diff(columns[j], n, i) for j in range(size)]
            for i in range(size)
        ]).det(method="bareiss")
        shifted = sp.expand(wronskian.subs(n, x - 2))
        constants.append([size, str(proportional(shifted, x * odd_hyper(r)))])
        wronskian_checks += 1

    report = {
        "status": "PASS",
        "max_q": args.max_q,
        "entry_checks": entry_checks,
        "max_r": args.max_r,
        "wronskian_checks": wronskian_checks,
        "positive_proportionality_constants": constants,
        "scope": (
            "Exact finite verification of proposed all-order identities. "
            "A symbolic derivation and the generalized Neville/ECT argument "
            "are still required for a proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS", report)


if __name__ == "__main__":
    main()
