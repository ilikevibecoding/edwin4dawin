#!/usr/bin/env python3
"""Symbolic probes for order-three minors of the Catalan--Racah kernel.

Each case divides the determinant by the appropriate positive Vandermonde
gap factors and tests whether the resulting numerator and denominator are
coefficientwise positive in nonnegative base and gap variables.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_connection import rational_racah_value


OUT = Path("racah_kernel_order3_20260803.json")


def det3(matrix):
    a, b, c = matrix[0]
    d, e, f = matrix[1]
    g, h, i = matrix[2]
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)


def coefficientwise_certificate(name, rows, cols, variables, gap_factor):
    matrix = [
        [rational_racah_value(row, col) for col in cols]
        for row in rows
    ]
    quotient = sp.cancel(det3(matrix) / gap_factor)
    numerator, denominator = sp.fraction(quotient)
    numerator_poly = sp.Poly(sp.expand(numerator), *variables)
    denominator_poly = sp.Poly(sp.expand(denominator), *variables)
    numerator_coeffs = numerator_poly.coeffs()
    denominator_coeffs = denominator_poly.coeffs()
    result = {
        "case": name,
        "status": (
            "PASS"
            if numerator_coeffs
            and denominator_coeffs
            and all(value > 0 for value in numerator_coeffs)
            and all(value > 0 for value in denominator_coeffs)
            else "FAIL"
        ),
        "numerator_terms": len(numerator_poly.terms()),
        "numerator_total_degree": numerator_poly.total_degree(),
        "numerator_min_coefficient": str(min(numerator_coeffs)),
        "denominator_terms": len(denominator_poly.terms()),
        "denominator_total_degree": denominator_poly.total_degree(),
        "denominator_min_coefficient": str(min(denominator_coeffs)),
        "gap_factor": str(gap_factor),
    }
    print(name, result, flush=True)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case",
        choices=("unit", "row-gaps", "column-gaps", "full-gaps", "all"),
        default="unit",
    )
    args = parser.parse_args()

    m, r = sp.symbols("m r", nonnegative=True)
    a, c = sp.symbols("a c", positive=True)
    b, d = sp.symbols("b d", positive=True)
    cases = []

    if args.case in ("unit", "all"):
        cases.append(
            coefficientwise_certificate(
                "unit-consecutive",
                (r, r + 1, r + 2),
                (m, m + 1, m + 2),
                (m, r),
                sp.S.One,
            )
        )
    if args.case in ("row-gaps", "all"):
        cases.append(
            coefficientwise_certificate(
                "arbitrary-row-gaps",
                (r, r + b, r + b + d),
                (m, m + 1, m + 2),
                (m, r, b, d),
                b * d * (b + d),
            )
        )
    if args.case in ("column-gaps", "all"):
        cases.append(
            coefficientwise_certificate(
                "arbitrary-column-gaps",
                (r, r + 1, r + 2),
                (m, m + a, m + a + c),
                (m, r, a, c),
                a * c * (a + c),
            )
        )
    if args.case in ("full-gaps", "all"):
        cases.append(
            coefficientwise_certificate(
                "arbitrary-row-and-column-gaps",
                (r, r + b, r + b + d),
                (m, m + a, m + a + c),
                (m, r, a, b, c, d),
                a * b * c * d * (a + c) * (b + d),
            )
        )

    previous = []
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8")).get("cases", [])
    by_name = {entry["case"]: entry for entry in previous}
    by_name.update({entry["case"]: entry for entry in cases})
    report = {
        "status": "PASS" if all(e["status"] == "PASS" for e in by_name.values()) else "FAIL",
        "cases": list(by_name.values()),
        "scope": (
            "Each passing case is an all-order proof for the indicated "
            "order-three minor family. Full TP in order three requires "
            "the arbitrary-row-and-column-gaps case."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
