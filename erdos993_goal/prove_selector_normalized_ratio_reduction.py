#!/usr/bin/env python3
"""Exact replay for the normalized P_h ratio reduction.

This file separates all proved identities from the still-finite positivity evidence.
Put M=r+s and write

    [t^h]G_(M,s)(t)=g_(M,s,h).

The Catalan/Whipple coefficient S_h admits the polynomial normalization

    P_h(r,s)=2^(h+floor(h/2))*h!*S_h.

The adjacent-size coefficient ratio is then

    g_h(r)/g_h(r-1)
      = A_h(r,s) P_h(r,s)/P_h(r-1,s),

    A_h(r,s)=((2r+s-1)(2r+s-2))
             /(2(r+h-1)(2r+2h-1)).

The elementary factor A_h is decreasing on the forest cone r>=s+5,
0<=2h<=s.  Thus column log-concavity reduces to discrete log-concavity
of P_h.  The mixed adjacent-layer comparison reduces to one second
explicit P-minor.  We verify coefficient positivity of the shifted minors
through a user-selectable finite layer; this is evidence, not the missing
all-order induction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from functools import reduce
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_normalized_ratio_reduction_exact_20260809.json"

r, s, q, y = sp.symbols("r s q y", integer=True, nonnegative=True)


def polynomial_p_derivative(h: int) -> sp.Expr:
    """Return P_h from the original differentiated Lagrange formula."""
    if h == 0:
        return sp.Integer(1)
    coefficient = sp.Integer(0)
    for j in range(h):
        k = h - 1 - j
        coefficient += (
            2
            * r
            * sp.binomial(2 * r + 2 * h - 1, j)
            * sp.binomial(4 * r + 2 * s + k - 1, k)
        )
        coefficient += (
            (4 * r + 2 * s)
            * sp.binomial(2 * r + 2 * h, j)
            * sp.binomial(4 * r + 2 * s + k, k)
        )
    scale = sp.Rational(2 ** (h // 2), 2**h) * sp.factorial(h - 1)
    return sp.Poly(sp.expand_func(coefficient) * scale, r, s).as_expr().expand()


def polynomial_p(h: int) -> sp.Expr:
    """Return P_h from the integrated binomial/negative-binomial formula."""
    coefficient = sp.Integer(0)
    positive_exponent = 2 * r + 2 * h - 1
    negative_exponent = 4 * r + 2 * s - 1
    for j in range(h + 1):
        coefficient += sp.binomial(positive_exponent, j) * sp.binomial(
            negative_exponent + h - j - 1, h - j
        )
    scale = sp.Rational(2 ** (h // 2), 2**h) * sp.factorial(h)
    return sp.Poly(sp.expand_func(coefficient) * scale, r, s).as_expr().expand()


def all_coefficients_nonnegative(poly: sp.Poly) -> bool:
    return all(coefficient >= 0 for coefficient in poly.coeffs())


def all_coefficients_positive(poly: sp.Poly) -> bool:
    return all(coefficient > 0 for coefficient in poly.coeffs())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=12)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.max_layer < 2:
        raise ValueError("--max-layer must be at least 2")

    polynomials = [polynomial_p(h) for h in range(args.max_layer + 1)]
    integration_by_parts_checks = 0
    for h in range(args.max_layer + 1):
        assert sp.expand(polynomials[h] - polynomial_p_derivative(h)) == 0
        integration_by_parts_checks += 1

    # The Lagrange formula implies the all-order three-term recurrence for S_h.
    # Symbolic replay through max_layer guards every normalization and index.
    recurrence_checks = 0
    for h in range(args.max_layer):
        S_previous = (
            sp.Integer(0)
            if h == 0
            else polynomials[h - 1]
            / (2 ** (h - 1 + ((h - 1) // 2)) * sp.factorial(h - 1))
        )
        S_current = polynomials[h] / (
            2 ** (h + (h // 2)) * sp.factorial(h)
        )
        S_next = polynomials[h + 1] / (
            2 ** (h + 1 + ((h + 1) // 2)) * sp.factorial(h + 1)
        )
        M = r + s
        C = (
            6 * M**2
            - 4 * M * s
            - 3 * M
            - 4 * h**2
            + 4 * h * s
            - h
            + 2 * s
        )
        residual = sp.factor(
            2 * (h + 1) * (2 * M - h - 1) * S_next
            - C * S_current
            - 2 * (r + h - sp.Rational(1, 2)) * (r + h - 1) * S_previous
        )
        assert residual == 0
        recurrence_checks += 1

    # In the mean coordinate y=3r+s, every tested P_h has nonnegative
    # coefficients.  Odd h has the exact reflection-symmetry factor y+h-1.
    mean_coordinate_records: list[dict[str, object]] = []
    for h, P in enumerate(polynomials):
        Q = sp.Poly(sp.expand(P.subs(r, (y - s) / 3)), y, s)
        assert all_coefficients_nonnegative(Q)
        odd_factor = h % 2 == 1
        if odd_factor:
            assert sp.factor(Q.as_expr().subs(y, -(h - 1))) == 0
        denominators = [int(sp.denom(value)) for value in Q.coeffs()]
        common_denominator = reduce(sp.ilcm, denominators, 1)
        mean_coordinate_records.append(
            {
                "h": h,
                "terms": len(Q.terms()),
                "common_denominator": common_denominator,
                "nonnegative_coefficients": True,
                "odd_factor_y_plus_h_minus_1": odd_factor,
            }
        )

    # The exact g_h/g_0 normalization and adjacent-size ratio identity.
    ratio_identity_checks = 0
    for h, P in enumerate(polynomials):
        falling_s = sp.prod(s - j for j in range(2 * h))
        denominator = (
            2 ** (h // 2)
            * sp.factorial(h)
            * sp.prod(r + j for j in range(h))
            * sp.prod(2 * r + 2 * j + 1 for j in range(h))
        )
        normalized = sp.cancel(falling_s * P / denominator)
        if h == 0:
            assert normalized == 1
        else:
            previous = sp.cancel(normalized.subs(r, r - 1))
            size_ratio = sp.cancel(normalized / previous)
            R0 = sp.cancel(
                (2 * r + s - 1)
                * (2 * r + s - 2)
                / ((2 * r - 1) * (2 * r - 2))
            )
            K = sp.cancel(
                (r - 1)
                * (2 * r - 1)
                / ((r + h - 1) * (2 * r + 2 * h - 1))
            )
            expected_normalized = sp.cancel(K * P / P.subs(r, r - 1))
            assert sp.cancel(size_ratio - expected_normalized) == 0
            full_size_ratio = sp.cancel(R0 * size_ratio)
            expected_full = sp.cancel(R0 * K * P / P.subs(r, r - 1))
            assert sp.cancel(full_size_ratio - expected_full) == 0
        ratio_identity_checks += 1

    # The scalar factor is decreasing in r on r>=s+5 and 2h<=s.
    h_symbol, k = sp.symbols("h k", integer=True, nonnegative=True)
    A = lambda rr: sp.cancel(
        (2 * rr + s - 1)
        * (2 * rr + s - 2)
        / (2 * (rr + h_symbol - 1) * (2 * rr + 2 * h_symbol - 1))
    )
    scalar_numerator = sp.factor(
        sp.together(A(r - 1) - A(r)).as_numer_denom()[0]
    )
    expected_scalar_numerator = sp.factor(
        (s - 2 * h_symbol)
        * (
            8 * h_symbol * r
            + 4 * h_symbol * s
            - 10 * h_symbol
            + 8 * r**2
            + 4 * r * s
            - 20 * r
            - 5 * s
            + 11
        )
    )
    assert scalar_numerator == expected_scalar_numerator
    scalar_shift = sp.Poly(
        sp.expand(
            (expected_scalar_numerator / (s - 2 * h_symbol)).subs(
                {r: s + 5 + q, s: 2 * h_symbol + k}
            )
        ),
        q,
        h_symbol,
        k,
    )
    assert all_coefficients_positive(scalar_shift)

    column_records: list[dict[str, object]] = []
    for h in range(1, args.max_layer + 1):
        P = polynomials[h]
        minor = sp.expand(
            P.subs(r, r - 1) ** 2 - P * P.subs(r, r - 2)
        )
        shifted = sp.Poly(sp.expand(minor.subs(r, s + 5 + q)), q, s)
        assert all_coefficients_positive(shifted)
        column_records.append(
            {
                "h": h,
                "terms": len(shifted.terms()),
                "minimum_coefficient": str(min(shifted.coeffs())),
            }
        )

    mixed_records: list[dict[str, object]] = []
    for h in range(args.max_layer):
        P = polynomials[h]
        P_next = polynomials[h + 1]
        minor = sp.expand(
            (2 * r + s - 1)
            * (2 * r + s - 2)
            * P
            * P_next.subs(r, r - 2)
            - (2 * r + s - 3)
            * (2 * r + s - 4)
            * P.subs(r, r - 1)
            * P_next.subs(r, r - 1)
        )
        shifted = sp.Poly(sp.expand(minor.subs(r, s + 5 + q)), q, s)
        assert all_coefficients_positive(shifted)
        mixed_records.append(
            {
                "h": h,
                "terms": len(shifted.terms()),
                "minimum_coefficient": str(min(shifted.coeffs())),
            }
        )

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_NORMALIZED_P_RATIO_REDUCTION_REPLAY",
        "all_order_identities": [
            "Lagrange coefficient formula for P_h",
            "integration by parts gives one binomial/negative-binomial coefficient",
            "three-term recurrence for S_h",
            "closed normalization of g_h/g_0",
            "adjacent-size ratio equals elementary scalar times P_h(r)/P_h(r-1)",
            "elementary scalar decreases throughout the forest cone",
            "binomial moment representation follows from A^r B^s and the binomial theorem",
        ],
        "finite_symbolic_scope": {
            "maximum_h": args.max_layer,
            "integration_by_parts_checks": integration_by_parts_checks,
            "recurrence_checks": recurrence_checks,
            "ratio_identity_checks": ratio_identity_checks,
            "mean_coordinate_layers": len(mean_coordinate_records),
            "column_minors": len(column_records),
            "mixed_minors": len(mixed_records),
        },
        "finite_symbolic_conclusions": {
            "P_h_has_nonnegative_y_s_coefficients": True,
            "odd_P_h_has_factor_y_plus_h_minus_1": True,
            "forest_shifted_column_minors_have_positive_coefficients": True,
            "forest_shifted_mixed_minors_have_positive_coefficients": True,
        },
        "remaining_target": (
            "Prove the two shifted P-minor coefficient inequalities in all h; then "
            "derive strict positive-axis Turan positivity and the unsigned root chain."
        ),
        "source_sha256": source_hash,
        "mean_coordinate_records": mean_coordinate_records,
        "column_records": column_records,
        "mixed_records": mixed_records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                "maximum_h": args.max_layer,
                "column_minors": len(column_records),
                "mixed_minors": len(mixed_records),
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
