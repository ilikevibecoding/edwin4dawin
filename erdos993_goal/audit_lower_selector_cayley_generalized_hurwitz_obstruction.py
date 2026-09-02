"""Exact obstruction to a generic generalized-Hurwitz shortcut for lower M1.

The Cayley transform maps the exterior of the target disk to the right half
plane and the negative exterior ray to the positive real axis.  Thus it is
tempting to prove that the transformed polynomial is generalized Hurwitz in
the sense of Tyaglov.  The exact cell below already has the required equality
between right-half-plane and positive-real root counts, but violates the
alternating Hurwitz-minor criterion.  Hence that standard theorem is strictly
stronger than the path-selector statement we need.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from audit_lower_selector_m1_schur_sturm_indices import (
    primitive_integer_coefficients,
    rational_schur_cohn_matrix,
    sign_changes,
)
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_cayley_generalized_hurwitz_obstruction_exact_20260812.json"
W = sp.symbols("w")


def hurwitz_leading_minors(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    degree = len(coefficients) - 1
    matrix = sp.zeros(degree, degree)
    for row in range(degree):
        for column in range(degree):
            index = 2 * column + 1 - row
            if 0 <= index <= degree:
                matrix[row, column] = coefficients[index]
    return [
        sp.factor(matrix[:order, :order].det(method="domain-ge"))
        for order in range(1, degree + 1)
    ]


def main() -> None:
    d, r, row_s = 19, 3, 8
    path_n = d + r
    gamma = selector_gamma(path_n, row_s)
    forced = max(0, row_s - path_n + 1)
    gamma_hat = gamma[forced:]
    degree = len(gamma_hat) - 1
    assert degree == 6

    outer_p = d + row_s
    effective_p = outer_p - 2 * forced
    half_p = effective_p // 2
    epsilon = effective_p % 2
    beta = sp.Rational(2 * epsilon - 1, 2)
    duran_s = half_p - degree + 2
    radius_squared = sp.Rational((duran_s - 1) * (duran_s + beta - 1))
    assert radius_squared == 68

    q = duran_polynomial(outer_p - forced, gamma_hat)
    integer_coefficients = primitive_integer_coefficients(q)
    schur = rational_schur_cohn_matrix(integer_coefficients, radius_squared)
    schur_determinants = [sp.Integer(1)] + [
        sp.factor(schur[:order, :order].det(method="domain-ge"))
        for order in range(1, degree + 1)
    ]
    schur_signs = [1 if value > 0 else -1 for value in schur_determinants]
    exterior_count = sign_changes(schur_signs)
    assert exterior_count == 2

    radius = sp.sqrt(radius_squared)
    cayley_expression = sp.cancel(
        (W - 1) ** degree
        * q.as_expr().subs(q.gens[0], radius * (W + 1) / (W - 1))
    )
    cayley = sp.Poly(cayley_expression, W, extension=radius)
    positive_count = int(cayley.count_roots(0, sp.oo))
    assert positive_count == exterior_count == 2

    hurwitz_minors = hurwitz_leading_minors(cayley.all_coeffs())
    alternating_orders = list(range(degree - 1, 0, -2))
    alternating_signs = [
        1 if hurwitz_minors[order - 1] > 0 else -1
        for order in alternating_orders
    ]
    assert alternating_orders == [5, 3, 1]
    assert alternating_signs == [-1, 1, 1]

    payload = {
        "kind": "lower_selector_cayley_generalized_hurwitz_obstruction_exact",
        "status": "PASS_EXACT_GENERALIZED_HURWITZ_SHORTCUT_OBSTRUCTED",
        "cell": {"d": d, "r": r, "row_s": row_s, "degree": degree},
        "radius_squared": str(radius_squared),
        "schur_exterior_count": exterior_count,
        "cayley_positive_real_root_count": positive_count,
        "alternating_hurwitz_orders": alternating_orders,
        "alternating_hurwitz_signs": alternating_signs,
        "conclusion": (
            "The desired half-plane/positive-ray count equality holds, but "
            "Tyaglov's generalized-Hurwitz criterion fails at order 5."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report_hash = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
    print(payload["status"])
    print("source_sha256", source_hash)
    print("report_sha256", report_hash)


if __name__ == "__main__":
    main()
