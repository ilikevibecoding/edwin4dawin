#!/usr/bin/env python3
"""Exact replay for the active-box curvature/deficit-bound reduction."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


def U(m, k):
    a = m + k - 1
    return sp.Rational(5, 8) * (4 * a - 1) / (a * (2 * a + 1))


def scalar_numerator(epsilon):
    h, c, e = sp.symbols("h c e", integer=True, nonnegative=True)
    s = 2 * h + 2 * c + epsilon
    j = 2 * c + epsilon
    degree = s - h
    N = 3 * s + 7 + 2 * e
    m = s + 4 + e
    xmin, xmax = N - 2, N + 2
    omega = 9 * (xmin - j - h + 1) / (5 * h + 6 * j - 2)
    p = sp.cancel(omega / (1 + omega))
    mu = j + h * p
    kappa = (
        mu / (xmax - (mu - 1) / 2) ** 2
        - h * p * (1 - p) / (xmin - degree) ** 2
    )
    curvature = 4 * kappa / (1 + 4 * kappa)
    rhs = sp.Rational(1, 2) * (
        c * U(m, h + 1) ** 2 + h * (U(m, h) / (1 - U(m, h))) ** 2
    )
    return sp.fraction(sp.factor(sp.together(curvature - rhs)))[0], (h, c, e)


def choose_polynomial(x, k):
    out = sp.Integer(1)
    for i in range(k):
        out *= x - i
    return sp.expand(out / sp.factorial(k))


def gamma_coefficient(R, s, h):
    j = s - 2 * h
    return sp.expand(
        choose_polynomial(R, j)
        * sum(
            choose_polynomial(R - j, k)
            * choose_polynomial(2 * R + h - k, h - k)
            for k in range(h + 1)
        )
    )


def top_margin(epsilon, h):
    R, e = sp.symbols("R e", integer=True, nonnegative=True)
    s = 2 * h + epsilon
    R0 = 3 * s + 9 + 2 * e
    lead = gamma_coefficient(R, s, h)
    prev = gamma_coefficient(R, s, h - 1)
    L = lambda shift: lead.subs(R, R + shift)
    P = lambda shift: prev.subs(R, R + shift)
    x = L(0) / L(-2)
    y = L(-2) / L(-4)
    yprev = P(-2) / P(-4)
    u = 1 - y / yprev
    v = 1 - x / y
    numerator, denominator = sp.fraction(
        sp.cancel(v - sp.Rational(h, 2) * (u / (1 - u)) ** 2)
    )
    return (
        sp.Poly(sp.expand(numerator.subs(R, R0)), e),
        sp.Poly(sp.expand(denominator.subs(R, R0)), e),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("active_box_curvature_deficit_reduction_exact_20260810.json"),
    )
    args = parser.parse_args()

    H, C, e = sp.symbols("H C e", integer=True, nonnegative=True)
    scalar_records = []
    scalar_coefficients = 0
    scalar_minimum = None
    for epsilon in (0, 1):
        numerator, (h, c, old_e) = scalar_numerator(epsilon)
        for region, substitutions, variables in (
            ("interior", {h: H + 4, c: C + 1, old_e: e}, (H, C, e)),
            ("top_h_ge_9", {h: H + 9, c: 0, old_e: e}, (H, e)),
        ):
            polynomial = sp.Poly(sp.expand(numerator.subs(substitutions)), *variables)
            coefficients = [int(value) for value in polynomial.coeffs()]
            assert all(value > 0 for value in coefficients)
            scalar_coefficients += len(coefficients)
            current_minimum = min(coefficients)
            scalar_minimum = (
                current_minimum
                if scalar_minimum is None
                else min(scalar_minimum, current_minimum)
            )
            scalar_records.append(
                {
                    "epsilon": epsilon,
                    "region": region,
                    "terms": len(coefficients),
                    "minimum_coefficient": current_minimum,
                }
            )

    top_records = []
    top_numerator_coefficients = 0
    top_denominator_coefficients = 0
    for epsilon in (0, 1):
        for h in range(4, 9):
            numerator, denominator = top_margin(epsilon, h)
            numerator_coefficients = [int(value) for value in numerator.all_coeffs()]
            denominator_coefficients = [int(value) for value in denominator.all_coeffs()]
            assert all(value > 0 for value in numerator_coefficients)
            assert all(value > 0 for value in denominator_coefficients)
            top_numerator_coefficients += len(numerator_coefficients)
            top_denominator_coefficients += len(denominator_coefficients)
            top_records.append(
                {
                    "epsilon": epsilon,
                    "h": h,
                    "numerator_degree": numerator.degree(),
                    "numerator_terms": len(numerator_coefficients),
                    "minimum_numerator_coefficient": min(numerator_coefficients),
                    "minimum_denominator_coefficient": min(denominator_coefficients),
                }
            )

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_ACTIVE_BOX_CURVATURE_DEFICIT_REDUCTION_REPLAY",
        "conditional_frontier": (
            "prove u_h <= (5/8)(4a-1)/(a(2a+1)); equivalently it is enough "
            "to prove the normalized effective-deficit increment bound"
        ),
        "scalar_positive_coefficients": scalar_coefficients,
        "scalar_minimum_coefficient": scalar_minimum,
        "scalar_records": scalar_records,
        "top_exact_families": len(top_records),
        "top_positive_numerator_coefficients": top_numerator_coefficients,
        "top_positive_denominator_coefficients": top_denominator_coefficients,
        "top_records": top_records,
        "source_sha256": source_hash,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                "scalar_positive_coefficients": scalar_coefficients,
                "top_exact_families": len(top_records),
                "top_positive_numerator_coefficients": top_numerator_coefficients,
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
