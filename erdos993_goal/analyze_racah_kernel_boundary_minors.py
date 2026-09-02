#!/usr/bin/env python3
"""Find formulas for the initial minors of the Catalan--Racah kernel.

For a square truncation of a positive matrix, the Gasca--Pena criterion
requires only solid minors touching the first row or the first column.
This script computes and factors the two resulting one-parameter families:

    top(k,m)  = det[T(i,m+j)]       (0 <= i,j < k),
    left(k,r) = det[T(r+i,j)]       (0 <= i,j < k).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_connection import rational_racah_value


OUT = Path("racah_kernel_boundary_minors_20260803.json")


def summarize_factor(expression, variable):
    value = sp.factor(sp.cancel(expression))
    numerator, denominator = sp.fraction(value)
    numerator_poly = sp.Poly(sp.expand(numerator), variable)
    denominator_poly = sp.Poly(sp.expand(denominator), variable)
    return {
        "expression": str(value),
        "numerator_degree": numerator_poly.degree(),
        "denominator_degree": denominator_poly.degree(),
        "numerator_coefficients_positive": all(
            coefficient > 0 for coefficient in numerator_poly.coeffs()
        ),
        "denominator_coefficients_positive": all(
            coefficient > 0 for coefficient in denominator_poly.coeffs()
        ),
        "numerator_factor_list": [
            [str(factor), int(exponent)]
            for factor, exponent in sp.factor_list(numerator, variable)[1]
        ],
        "denominator_factor_list": [
            [str(factor), int(exponent)]
            for factor, exponent in sp.factor_list(denominator, variable)[1]
        ],
    }


def minor(rows, cols):
    matrix = sp.Matrix(
        [
            [rational_racah_value(row, col) for col in cols]
            for row in rows
        ]
    )
    return matrix.det(method="domain-ge")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-k", type=int, default=6)
    args = parser.parse_args()

    m, r = sp.symbols("m r", nonnegative=True)
    top = []
    left = []
    for k in range(1, args.max_k + 1):
        top_value = minor(range(k), [m + j for j in range(k)])
        top_entry = {"k": k, **summarize_factor(top_value, m)}
        top.append(top_entry)
        print(
            f"top k={k}: degrees "
            f"{top_entry['numerator_degree']}/{top_entry['denominator_degree']}",
            flush=True,
        )

        left_value = minor([r + i for i in range(k)], range(k))
        left_entry = {"k": k, **summarize_factor(left_value, r)}
        left.append(left_entry)
        print(
            f"left k={k}: degrees "
            f"{left_entry['numerator_degree']}/{left_entry['denominator_degree']}",
            flush=True,
        )

    report = {
        "status": "PASS",
        "max_k": args.max_k,
        "top_initial_minors": top,
        "left_initial_minors": left,
        "scope": (
            "Formula discovery and exact symbolic factorization only. An "
            "all-k formula plus proof is required to invoke the initial-minor "
            "criterion for the infinite kernel."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
