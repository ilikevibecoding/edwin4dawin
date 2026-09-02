#!/usr/bin/env python3
"""Exact minor probe for the diagonal lower-tail homotopy Bezout matrix.

Under z=t/(1+t), the Bernstein certificate for

    R_N(x,z)=T_3(x)+z A_2(x)

is the ordinary coefficient-positive discriminant of

    q_N(x,t)=T_3(x)+t H_N(x).

This program constructs Bez_x(q_N,q_N') and tests coefficientwise
nonnegativity of entries, leading minors, solid minors, and (at small sizes)
all minors.  A clean finite probe motivates a planar-network/Neville
factorization; it is not such an all-order factorization.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from certify_diagonal_component_tail_sturm import grouped_polynomials
from probe_equal_direction_bezout_certificate import bezout_matrix
from probe_quadratic_kernel_monomial_components import X


HERE = Path(__file__).resolve().parent
T = sp.symbols("T")


def coefficientwise_nonnegative(expression: sp.Expr) -> bool:
    return all(value >= 0 for value in sp.Poly(expression, T).all_coeffs())


def one_size(N: int, leading: bool, solid: bool, all_minors: bool) -> dict[str, object]:
    _, tails = grouped_polynomials(N)
    q = sp.Poly(tails[3].as_expr() + T * tails[2].as_expr(), X)
    matrix = bezout_matrix(q)
    entry_checks = matrix.rows * matrix.cols
    assert all(coefficientwise_nonnegative(value) for value in matrix)

    leading_records = []
    if leading:
        for size in range(1, matrix.rows + 1):
            determinant = matrix[:size, :size].det(method="domain-ge")
            passed = coefficientwise_nonnegative(determinant)
            assert passed
            leading_records.append({
                "size": size,
                "degree": sp.Poly(determinant, T).degree(),
            })
            print(f"N={N} leading {size}/{matrix.rows}", flush=True)

    solid_checks = 0
    if solid:
        for size in range(1, matrix.rows + 1):
            for row in range(matrix.rows - size + 1):
                for column in range(matrix.cols - size + 1):
                    determinant = matrix[
                        row:row + size, column:column + size
                    ].det(method="domain-ge")
                    assert coefficientwise_nonnegative(determinant)
                    solid_checks += 1
            print(f"N={N} solid size={size}", flush=True)

    all_minor_checks = 0
    if all_minors:
        for size in range(1, matrix.rows + 1):
            for rows in itertools.combinations(range(matrix.rows), size):
                for columns in itertools.combinations(range(matrix.cols), size):
                    determinant = matrix.extract(rows, columns).det(method="domain-ge")
                    assert coefficientwise_nonnegative(determinant)
                    all_minor_checks += 1
            print(f"N={N} all minors size={size}", flush=True)

    return {
        "N": N,
        "matrix_size": matrix.rows,
        "entry_checks": entry_checks,
        "all_entries_coefficientwise_nonnegative": True,
        "leading_minor_checks": len(leading_records),
        "leading_minor_records": leading_records,
        "solid_minor_checks": solid_checks,
        "all_minor_checks": all_minor_checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sizes", default="4,5,7,10,13")
    parser.add_argument("--leading-through", type=int, default=7)
    parser.add_argument("--solid-through", type=int, default=7)
    parser.add_argument("--all-minors-through", type=int, default=5)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "diagonal_homotopy_bezout_tp_probe_20260804.json",
    )
    args = parser.parse_args()
    sizes = [int(value) for value in args.sizes.split(",")]
    records = [
        one_size(
            N,
            leading=N <= args.leading_through,
            solid=N <= args.solid_through,
            all_minors=N <= args.all_minors_through,
        )
        for N in sizes
    ]
    report = {
        "status": "PASS_FINITE_DIAGONAL_HOMOTOPY_BEZOUT_TP_PROBE",
        "pencil": "q_N(X,T)=T_3(X)+T H_N(X)",
        "sizes": sizes,
        "records": records,
        "scope": (
            "All listed signs are exact.  The finite coefficientwise-TN "
            "pattern is evidence for, not a proof of, an all-order network."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
