#!/usr/bin/env python3
"""Cross-check an all-order Jacobi tail and certify base cases."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp
from flint import fmpq

from analyze_group_arbitrary_layer_schur_pattern import (
    derive_selector,
    derive_tail as derive_upper_tail,
    upper_selector,
)
from analyze_group_fifth_homogeneous_tail_schur import recurrence_data
import analyze_group_ninth_homogeneous_boundaries as boundary_audit
from derive_group_fifth_homogeneous_tail_schur_flint import Rat
from verify_group_general_homogeneous_layers import (
    gamma_coefficients,
    residual_formula_row,
    t,
    y,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_ninth_homogeneous_tail_verification_20260804.json"
LAYER = 8
TAIL_ORDER = 6


def sympy_value(value) -> sp.Rational:
    return sp.Rational(str(value))


def evaluated(values, alpha_value: int, slack_value: int) -> list[sp.Rational]:
    return [
        sympy_value(value.evaluate(alpha_value, slack_value)) for value in values
    ]


def exact_tail(N: int, d: int) -> tuple[list[sp.Rational], list[sp.Rational]]:
    r = N - d
    row = residual_formula_row(N, d, LAYER)
    p = N - abs(r - LAYER)
    alpha = abs(r - LAYER)
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    gamma = gamma_coefficients(row, p)
    F = sum(coefficient * t**k for k, coefficient in enumerate(gamma))
    K = sp.Poly(
        sp.cancel((1 - y) ** degree * F.subs(t, -y / (4 * (1 - y)))),
        y,
        domain=sp.QQ,
    )
    K = sp.Poly(K.as_expr() / K.LC(), y, domain=sp.QQ)
    diagonals, subdiagonals, basis = recurrence_data(degree, alpha, beta)
    remainder = K
    coefficients: list[sp.Expr] = []
    for k in range(degree, degree - TAIL_ORDER - 1, -1):
        coefficient = sp.factor(remainder.LC())
        coefficients.append(coefficient)
        remainder = sp.Poly(
            remainder.as_expr() - coefficient * basis[k].as_expr(),
            y,
            domain=sp.QQ,
        )
    assert remainder.is_zero and coefficients[0] == 1
    m = degree - TAIL_ORDER
    U_previous, U = sp.Poly(0, y), sp.Poly(1, y)
    V_previous, V = sp.Poly(-1, y), sp.Poly(0, y)
    U_values, V_values = [U], [V]
    for step in range(TAIL_ORDER):
        diagonal = diagonals[m + step]
        subdiagonal = subdiagonals[m + step - 1]
        U_next = sp.Poly(
            (y - diagonal) * U.as_expr()
            - subdiagonal * U_previous.as_expr(),
            y,
            domain=sp.QQ,
        )
        V_next = sp.Poly(
            (y - diagonal) * V.as_expr()
            - subdiagonal * V_previous.as_expr(),
            y,
            domain=sp.QQ,
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    A = sp.Poly(
        sum(
            coefficients[j] * U_values[TAIL_ORDER - j].as_expr()
            for j in range(TAIL_ORDER + 1)
        ),
        y,
        domain=sp.QQ,
    )
    B = sp.Poly(
        sum(
            coefficients[j] * V_values[TAIL_ORDER - j].as_expr()
            for j in range(TAIL_ORDER + 1)
        ),
        y,
        domain=sp.QQ,
    )
    assert sp.Poly(
        K.as_expr()
        - A.as_expr() * basis[m].as_expr()
        + B.as_expr() * basis[m - 1].as_expr(),
        y,
        domain=sp.QQ,
    ).is_zero
    assert A.degree() == TAIL_ORDER and B.degree() == TAIL_ORDER - 1
    assert B.LC() > 0
    B = sp.Poly(B.as_expr() / B.LC(), y, domain=sp.QQ)
    return list(reversed(A.all_coeffs())), list(reversed(B.all_coeffs()))


def main() -> None:
    global LAYER, TAIL_ORDER
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", type=int, default=LAYER)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    LAYER = args.layer
    if LAYER < 0:
        parser.error("layer must be nonnegative")
    TAIL_ORDER = LAYER // 2 + 2
    boundary_audit.LAYER = LAYER
    boundary_audit.TAIL_ORDER = TAIL_ORDER
    boundary_audit.BANDWIDTH = TAIL_ORDER + 1
    comparisons = []
    selector = upper_selector(LAYER)
    upper_tails = {
        parity: derive_upper_tail(LAYER, selector, parity)
        for parity in ("even", "odd")
    }
    for d in range(LAYER + 9, LAYER + 14):
        parity = "even" if (d + LAYER) % 2 == 0 else "odd"
        tail_A, tail_B = upper_tails[parity]
        for r in range(LAYER, d - 4):
            N = d + r
            alpha = r - LAYER
            slack = d - r - 5
            predicted_A = evaluated(tail_A, alpha, slack)
            predicted_B = evaluated(tail_B, alpha, slack)
            actual_A, actual_B = exact_tail(N, d)
            assert predicted_A == actual_A and predicted_B == actual_B
            comparisons.append(
                {"kind": "upper", "N": N, "d": d, "r": r, "parity": parity}
            )

    symbolic_selector = derive_selector(LAYER)
    for r in range(LAYER):
        for parity in ("even", "odd"):
            minimum = boundary_audit.boundary_minimum(r, parity)
            p, n_symbol, alpha, shifted_selector = boundary_audit.shifted_boundary_selector(
                r, parity, minimum, symbolic_selector
            )
            beta = Rat(fmpq(-1, 2) if parity == "even" else fmpq(1, 2))
            tail_A, tail_B = boundary_audit.derive_tail(
                p, n_symbol, alpha, beta, shifted_selector
            )
            for n in (minimum, minimum + 1):
                p0 = 2 * n + (parity == "odd")
                d = p0 - 2 * r + LAYER
                N = d + r
                assert d - r >= 5
                predicted_A = evaluated(tail_A, 0, n - minimum)
                predicted_B = evaluated(tail_B, 0, n - minimum)
                actual_A, actual_B = exact_tail(N, d)
                assert predicted_A == actual_A and predicted_B == actual_B
                comparisons.append(
                    {
                        "kind": "boundary",
                        "N": N,
                        "d": d,
                        "r": r,
                        "parity": parity,
                    }
                )

    base_cases = []
    for r in range(LAYER):
        d = max(r + 5, LAYER - 2 * r)
        while True:
            N = d + r
            p0 = N - abs(r - LAYER)
            degree = p0 // 2
            if degree >= TAIL_ORDER + 1:
                break
            row = residual_formula_row(N, d, LAYER)
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
        "status": f"PASS_EXACT_S{LAYER}_TAIL_THEOREM_CROSSCHECK",
        "layer_deficit": LAYER,
        "symbolic_to_row_comparisons": comparisons,
        "comparison_count": len(comparisons),
        "small_base_cases": base_cases,
        "small_base_case_count": len(base_cases),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "comparison_count": len(comparisons),
                "small_base_case_count": len(base_cases),
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
