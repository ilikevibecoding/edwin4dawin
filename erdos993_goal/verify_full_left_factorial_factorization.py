#!/usr/bin/env python3
"""Falling-factorial factorization of the full interleaved left sequence.

Clear the common positive row denominator from

    X_0, G_0, X_1, G_1, X_2, G_2, ...

using ``polynomial_columns`` from the Wronskian verifier, and expand every
polynomial in the basis n^(falling ell).  Exact total nonnegativity of the
coefficient matrix would combine with the Pascal collocation matrix to prove
total nonnegativity of the full left factor.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_wronskian import n, polynomial_columns


OUT = Path("full_left_factorial_factorization_20260803.json")


def falling_coefficient(polynomial, order):
    return sp.factor(
        sum(
            (-1) ** (order - h)
            * sp.binomial(order, h)
            * polynomial.subs(n, h)
            for h in range(order + 1)
        )
        / sp.factorial(order)
    )


def coefficient_matrix(column_count):
    columns = polynomial_columns(column_count)
    max_degree = max(sp.Poly(column, n).degree() for column in columns)
    matrix = [[sp.S.Zero for _ in columns] for _ in range(max_degree + 1)]
    for j, column in enumerate(columns):
        degree = sp.Poly(column, n).degree()
        reconstruction = sp.S.Zero
        for ell in range(degree + 1):
            value = falling_coefficient(column, ell)
            matrix[ell][j] = value
            reconstruction += value * sp.prod(n - h for h in range(ell))
        assert sp.expand(reconstruction - column) == 0
    return matrix


def audit_all_minors(matrix):
    rows = len(matrix)
    cols = len(matrix[0])
    positive = zero = negative = 0
    first_negative = None
    by_order = {}
    for order in range(1, cols + 1):
        order_positive = order_zero = order_negative = 0
        for row_set in itertools.combinations(range(rows), order):
            for col_set in itertools.combinations(range(cols), order):
                value = sp.Matrix(
                    [[matrix[i][j] for j in col_set] for i in row_set]
                ).det(method="domain-ge")
                if value > 0:
                    positive += 1
                    order_positive += 1
                elif value == 0:
                    zero += 1
                    order_zero += 1
                else:
                    negative += 1
                    order_negative += 1
                    if first_negative is None:
                        first_negative = {
                            "rows": row_set,
                            "cols": col_set,
                            "value": str(value),
                        }
        by_order[str(order)] = {
            "positive": order_positive,
            "zero": order_zero,
            "negative": order_negative,
        }
        print(
            f"order {order}: {order_positive}/{order_zero}/{order_negative}",
            flush=True,
        )
        if order_negative:
            break
    return {
        "positive": positive,
        "zero": zero,
        "negative": negative,
        "first_negative": first_negative,
        "by_order": by_order,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--columns", type=int, default=8)
    args = parser.parse_args()

    matrix = coefficient_matrix(args.columns)
    entry_negative = [
        (i, j, str(matrix[i][j]))
        for i in range(len(matrix))
        for j in range(len(matrix[0]))
        if matrix[i][j] < 0
    ]
    audit = audit_all_minors(matrix) if not entry_negative else None
    status = "PASS" if not entry_negative and audit["negative"] == 0 else "FAIL"
    report = {
        "status": status,
        "rows": len(matrix),
        "columns": args.columns,
        "negative_entries": entry_negative,
        "all_minor_audit": audit,
        "scope": (
            "Exact finite coefficient-matrix audit. A passing finite width "
            "is evidence; a uniform recurrence or planar network is required "
            "for the all-order left-factor proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status, {"columns": args.columns, "report": str(OUT)})


if __name__ == "__main__":
    main()
