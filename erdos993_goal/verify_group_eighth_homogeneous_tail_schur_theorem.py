#!/usr/bin/env python3
"""Cross-check the all-order s=7 tail formulas and certify small base cases."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_group_seventh_homogeneous_tail_schur import bezout_matrix, one_cell, y
from derive_group_seventh_homogeneous_tail_schur_flint import (
    boundary_minimum,
    derive,
)
from verify_group_general_homogeneous_layers import residual_formula_row


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_eighth_homogeneous_tail_schur_verification_20260804.json"


def sympy_value(value) -> sp.Rational:
    return sp.Rational(str(value))


def evaluated_coefficients(values, alpha_value: int, slack_value: int) -> list[sp.Rational]:
    return [sympy_value(value.evaluate(alpha_value, slack_value)) for value in values]


def evaluated_matrix(values, alpha_value: int, slack_value: int) -> sp.Matrix:
    return sp.Matrix(
        [
            [sympy_value(value.evaluate(alpha_value, slack_value)) for value in row]
            for row in values
        ]
    )


def exact_tail(
    N: int, d: int
) -> tuple[list[sp.Rational], list[sp.Rational], sp.Matrix]:
    record = one_cell(N, d, 7)
    A = sp.Poly(sp.sympify(record["A5"]), y, domain=sp.QQ)
    B = sp.Poly(sp.sympify(record["B4"]), y, domain=sp.QQ)
    B = sp.Poly(B.as_expr() / B.LC(), y, domain=sp.QQ)
    matrix = bezout_matrix(A, B)
    if matrix[0, 0] < 0:
        matrix = -matrix
    return (
        list(reversed(A.all_coeffs())),
        list(reversed(B.all_coeffs())),
        matrix,
    )


def main() -> None:
    comparisons = []

    for d in range(14, 19):
        parity = "even" if (d + 7) % 2 == 0 else "odd"
        tail_A, tail_B, tail_matrix, _ = derive(parity, layer=7)
        for r in range(7, d - 4):
            N = d + r
            alpha = r - 7
            slack = d - r - 5
            predicted_A = evaluated_coefficients(tail_A, alpha, slack)
            predicted_B = evaluated_coefficients(tail_B, alpha, slack)
            predicted_matrix = evaluated_matrix(tail_matrix, alpha, slack)
            actual_A, actual_B, actual_matrix = exact_tail(N, d)
            assert (
                predicted_A == actual_A
                and predicted_B == actual_B
                and predicted_matrix == actual_matrix
            )
            comparisons.append(
                {"kind": "upper", "N": N, "d": d, "r": r, "parity": parity}
            )

    for r in range(7):
        for parity in ("even", "odd"):
            minimum = boundary_minimum(r, parity, 7)
            tail_A, tail_B, tail_matrix, derived_minimum = derive(
                parity, r, layer=7
            )
            assert minimum == derived_minimum
            for n in (minimum, minimum + 1):
                p0 = 2 * n + (parity == "odd")
                d = p0 - 2 * r + 7
                N = d + r
                assert d - r >= 5
                predicted_A = evaluated_coefficients(tail_A, 0, n - minimum)
                predicted_B = evaluated_coefficients(tail_B, 0, n - minimum)
                predicted_matrix = evaluated_matrix(tail_matrix, 0, n - minimum)
                actual_A, actual_B, actual_matrix = exact_tail(N, d)
                assert (
                    predicted_A == actual_A
                    and predicted_B == actual_B
                    and predicted_matrix == actual_matrix
                )
                comparisons.append(
                    {"kind": "boundary", "N": N, "d": d, "r": r, "parity": parity}
                )

    base_cases = []
    for r in range(7):
        d = max(r + 5, 7 - 2 * r)
        while True:
            N = d + r
            p0 = N - abs(r - 7)
            degree = p0 // 2
            if degree >= 6:
                break
            row = residual_formula_row(N, d, 7)
            real = int(row.count_roots(-sp.oo, sp.oo))
            negative = int(row.count_roots(-sp.oo, 0))
            assert real == row.degree() and negative == row.degree()
            base_cases.append(
                {
                    "N": N,
                    "d": d,
                    "r": r,
                    "residual_degree": row.degree(),
                    "negative_roots": negative,
                }
            )
            d += 1

    report = {
        "status": "PASS_EXACT_S7_TAIL_THEOREM_CROSSCHECK",
        "layer_deficit": 7,
        "symbolic_to_row_comparisons": comparisons,
        "comparison_count": len(comparisons),
        "small_base_cases": base_cases,
        "small_base_case_count": len(base_cases),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "comparison_count": len(comparisons),
        "small_base_case_count": len(base_cases),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
