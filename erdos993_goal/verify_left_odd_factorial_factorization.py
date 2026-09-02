#!/usr/bin/env python3
"""Falling-factorial factorization of shifted odd Racah columns.

After a common positive row denominator is cleared, the normalized column
with offset j is a polynomial F_j(R;c) of degree 2j+3.  Expand

    F_j(R;c) = sum_l A[l,j](c) R^(falling l).

Evaluation on consecutive integral rows factors through the totally
nonnegative Pascal/falling-factorial collocation matrix.  This script checks
the exact expansion, coefficientwise positivity of every A entry, and total
nonnegativity of finite coefficient-matrix truncations.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from analyze_left_odd_solid_minors import normalized_entry


OUT = Path("left_odd_factorial_factorization_20260803.json")


def falling_coefficient(polynomial, R, order):
    return sp.factor(
        sum(
            (-1) ** (order - h)
            * sp.binomial(order, h)
            * polynomial.subs(R, h)
            for h in range(order + 1)
        )
        / sp.factorial(order)
    )


def coefficient_matrix(q, a):
    R = sp.symbols("R")
    c = a + 1
    common_denominator = (
        (R + 2 * c + 1)
        * (R + 2 * c + 2)
        * (R + 2 * c + 3)
        * (2 * R + 2 * c + 3)
        * (2 * R + 2 * c + 5)
    )
    rows = 2 * q + 2
    matrix = [[sp.S.Zero for _ in range(q)] for _ in range(rows)]
    reconstruction_checks = 0
    entry_checks = 0
    for j in range(q):
        polynomial = sp.cancel(
            common_denominator * normalized_entry(R, c, j)
        )
        degree = sp.Poly(polynomial, R).degree()
        reconstructed = sp.S.Zero
        for ell in range(degree + 1):
            value = falling_coefficient(polynomial, R, ell)
            matrix[ell][j] = value
            reconstructed += value * sp.prod(R - h for h in range(ell))
            if value != 0:
                coefficients = sp.Poly(sp.expand(value), a).coeffs()
                assert coefficients and all(x > 0 for x in coefficients)
                entry_checks += 1
        assert sp.expand(reconstructed - polynomial) == 0
        reconstruction_checks += 1
    return matrix, reconstruction_checks, entry_checks


def audit_all_minors(matrix, a):
    row_count = len(matrix)
    col_count = len(matrix[0])
    positive = zero = negative = 0
    coefficientwise_positive = 0
    first_failure = None
    for order in range(1, col_count + 1):
        for rows in itertools.combinations(range(row_count), order):
            for cols in itertools.combinations(range(col_count), order):
                value = sp.factor(
                    sp.Matrix(
                        [[matrix[i][j] for j in cols] for i in rows]
                    ).det(method="domain-ge")
                )
                if value == 0:
                    zero += 1
                    continue
                coefficients = sp.Poly(sp.expand(value), a).coeffs()
                if coefficients and all(x > 0 for x in coefficients):
                    positive += 1
                    coefficientwise_positive += 1
                else:
                    negative += 1
                    if first_failure is None:
                        first_failure = {
                            "rows": rows,
                            "cols": cols,
                            "value": str(value),
                        }
        print(f"minor order {order}: cumulative {positive}/{zero}/{negative}", flush=True)
    return {
        "positive": positive,
        "zero": zero,
        "negative_or_mixed": negative,
        "coefficientwise_positive": coefficientwise_positive,
        "first_failure": first_failure,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=4)
    args = parser.parse_args()

    a = sp.symbols("a", nonnegative=True)
    matrix, reconstructions, entries = coefficient_matrix(args.q, a)
    audit = audit_all_minors(matrix, a)
    assert audit["negative_or_mixed"] == 0
    report = {
        "status": "PASS",
        "q": args.q,
        "rows": len(matrix),
        "columns": len(matrix[0]),
        "reconstruction_checks": reconstructions,
        "nonzero_entry_positivity_checks": entries,
        "all_minor_audit": audit,
        "scope": (
            "Exact coefficientwise TN certificate for the stated finite "
            "coefficient matrix. A uniform planar-network or production-"
            "matrix proof in q is still required."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS", report)


if __name__ == "__main__":
    main()
