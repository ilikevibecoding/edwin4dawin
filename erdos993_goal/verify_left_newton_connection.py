#!/usr/bin/env python3
"""Exact audit of the odd-to-even Newton connection for the left factor.

Let X_m(n)=n^(falling m)(n+4)_m and let G_m(n) be the normalized odd
column called ``h_column(m)`` in verify_left_newton_wronskian.py.  The
all-order Newton expansion is

    G_m(n) = sum_{r=0}^{n-m-1} c(r,m) X_{m+1+r}(n),

    c(r,m) = (-1)^r (5/2)_r /
             ((4)_r (m+2)_r (m+9/2)_r).

Equivalently, at n=m+1+R the quotient by X_{m+1}(n) is a terminating
balanced 4F3 (a Racah-polynomial value).  This program checks both forms
exactly over a finite range and also verifies the all-order proof: the
rational closed form has zero residual in the standard Racah three-term
recurrence and has the correct initial values.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_wronskian import h_column, n, x_column


OUT = Path("left_newton_connection_20260803.json")


def connection_coefficient(r, m):
    return sp.cancel(
        (-1) ** r * sp.rf(sp.Rational(5, 2), r)
        / (
            sp.rf(4, r)
            * sp.rf(m + 2, r)
            * sp.rf(m + sp.Rational(9, 2), r)
        )
    )


def catalan_form(r, m):
    catalan = sp.Rational(sp.binomial(2 * r + 4, r + 2), r + 3)
    odd_product = sp.prod(2 * m + 9 + 2 * j for j in range(r))
    return sp.cancel(
        (-1) ** r * catalan
        / (2 ** (r + 1) * sp.rf(m + 2, r) * odd_product)
    )


def hypergeometric_value(R, m):
    return sp.cancel(
        sum(
            sp.rf(-R, r)
            * sp.rf(sp.Rational(5, 2), r)
            * sp.rf(2 * m + R + 6, r)
            /
            (
                sp.rf(4, r)
                * sp.rf(m + 2, r)
                * sp.rf(m + sp.Rational(9, 2), r)
            )
            for r in range(R + 1)
        )
    )


def rational_racah_value(R, m):
    R, m = sp.sympify(R), sp.sympify(m)
    phi = (
        4 * (m + 1) * R**3
        + 24 * (m + 1) * (m + 2) * R**2
        + (36 * m**3 + 204 * m**2 + 371 * m + 203) * R
        + 16 * m**4 + 136 * m**3 + 428 * m**2 + 590 * m + 300
    )
    return sp.cancel(
        (2 * m + 7) * phi
        /
        (
            (R + 2 * m + 3)
            * (R + 2 * m + 4)
            * (R + 2 * m + 5)
            * (2 * R + 2 * m + 5)
            * (2 * R + 2 * m + 7)
        )
    )


def prove_racah_evaluation():
    """Verify the standard Racah recurrence and its initial values."""
    R, m = sp.symbols("R m", integer=True, nonnegative=True)
    value = rational_racah_value(R, m)

    # alpha=3, beta=2m+2, gamma=m+1, delta=3/2-m, evaluated
    # at x=-1, so lambda=x(x+gamma+delta+1)=-5/2.
    a_r = sp.cancel(
        (R + 4)
        * (R + m + 2)
        * (R + 2 * m + 6)
        * (2 * R + 2 * m + 9)
        / (4 * (R + m + 3) * (2 * R + 2 * m + 7))
    )
    c_r = sp.cancel(
        R
        * (R + m + 4)
        * (R + 2 * m + 2)
        * (2 * R + 2 * m + 3)
        / (4 * (R + m + 3) * (2 * R + 2 * m + 5))
    )
    residual = sp.factor(
        sp.cancel(
            a_r * value.subs(R, R + 1)
            - (a_r + c_r - sp.Rational(5, 2)) * value
            + c_r * value.subs(R, R - 1)
        )
    )
    assert residual == 0
    assert sp.factor(value.subs(R, 0) - 1) == 0
    assert sp.factor(value.subs(R, 1) - hypergeometric_value(1, m)) == 0
    return {
        "recurrence_residual": "0",
        "initial_R0": "PASS",
        "initial_R1": "PASS",
        "racah_argument": "lambda(-1)=-5/2",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=35)
    args = parser.parse_args()

    symbolic_proof = prove_racah_evaluation()
    coefficient_checks = 0
    reconstruction_checks = 0
    hypergeometric_checks = 0
    catalan_checks = 0

    for m in range(args.max_q - 1):
        reconstructed = sp.S.Zero
        for nn in range(m + 1, args.max_q):
            r = nn - m - 1
            coefficient = connection_coefficient(r, m)
            assert sp.cancel(coefficient - catalan_form(r, m)) == 0
            catalan_checks += 1

            # Newton interpolation is triangular: at the new node nn, the
            # coefficient is the residual divided by the new pivot.
            actual = sp.cancel(
                (h_column(m).subs(n, nn) - reconstructed.subs(n, nn))
                / x_column(m + 1 + r).subs(n, nn)
            )
            assert sp.cancel(actual - coefficient) == 0
            coefficient_checks += 1

            reconstructed += coefficient * x_column(m + 1 + r)
            assert sp.cancel(
                reconstructed.subs(n, nn) - h_column(m).subs(n, nn)
            ) == 0
            reconstruction_checks += 1

            quotient = sp.cancel(
                h_column(m).subs(n, nn) / x_column(m + 1).subs(n, nn)
            )
            assert sp.cancel(quotient - hypergeometric_value(r, m)) == 0
            hypergeometric_checks += 1

    report = {
        "status": "PASS",
        "max_q": args.max_q,
        "coefficient_checks": coefficient_checks,
        "reconstruction_checks": reconstruction_checks,
        "hypergeometric_checks": hypergeometric_checks,
        "catalan_checks": catalan_checks,
        "coefficient": (
            "(-1)^r*(5/2)_r/((4)_r*(m+2)_r*(m+9/2)_r)"
        ),
        "hypergeometric": (
            "4F3(-R,5/2,2m+R+6,1;4,m+2,m+9/2;1)"
        ),
        "symbolic_proof": symbolic_proof,
        "scope": (
            "All-order proof by the standard Racah recurrence, plus an "
            "independent exact finite audit of the Newton reconstruction."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS", report)


if __name__ == "__main__":
    main()
