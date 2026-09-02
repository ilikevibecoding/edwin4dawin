#!/usr/bin/env python3
"""Exact replay of the two rank-seven convolution hard faces.

This is a rigorous reduction certificate, not a full convolution theorem.
It reconstructs the low/high and low/low boundary polynomials, verifies
their exact linear factors, and pays every negative quotient monomial by
an exact AM-GM block.  A full theorem additionally has to certify that no
negative coefficient occurs off these faces.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_rank7_convolution_hard_faces import low_high_hard, low_low_hard
from verify_rank6_three_halves_convolution_cones import (
    build_and_verify_amgm,
    poly_stats,
)
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_three_halves_hard_faces_exact_20260813.json"


def to_sympy(polynomial, variables: tuple[sp.Symbol, ...]) -> sp.Poly:
    return sp.Poly.from_dict(
        {
            tuple(int(value) for value in monomial): int(coefficient)
            for monomial, coefficient in polynomial.terms()
        },
        variables,
        domain=sp.ZZ,
    )


def certify_low_high() -> tuple[dict, sp.Poly]:
    margin, _ = low_high_hard()
    statistics = polynomial_statistics(margin)
    assert statistics == {
        "terms": 81_335,
        "negative": 210,
        "minimum": -925_616,
        "maximum": 42_636_954_083_328,
    }
    variables = sp.symbols("b ta a3 a4 a5 a6 tb b0", nonnegative=True)
    hard = to_sympy(margin, variables)
    b, ta, a3, a4, a5, a6, _, _ = variables
    linear = 8 * b + ta + a3 + a4 + a5 + a6
    quotient, remainder = sp.div(hard, sp.Poly(linear, *variables))
    assert remainder.is_zero
    quotient_statistics = poly_stats(quotient)
    assert quotient_statistics == {
        "terms": 55_536,
        "negative": 100,
        "minimum": -115_702,
        "maximum": 4_061_912_712_192,
    }
    amgm = build_and_verify_amgm(quotient)
    assert amgm["negative_terms"] == amgm["blocks"] == 100
    return {
        "variables": [str(value) for value in variables],
        "hard": statistics,
        "linear_factor": str(linear),
        "quotient": quotient_statistics,
        "amgm": amgm,
    }, quotient


def certify_low_low(low_high_quotient: sp.Poly) -> dict:
    margin, _ = low_low_hard()
    statistics = polynomial_statistics(margin)
    assert statistics == {
        "terms": 240_082,
        "negative": 594,
        "minimum": -2_693_056,
        "maximum": 69_959_380_187_676_672,
    }
    variables = sp.symbols("b c ta a3 a4 a5 a6 tb b0", nonnegative=True)
    hard = to_sympy(margin, variables)
    b, c, ta, a3, a4, a5, a6, _, _ = variables
    linear = 8 * b + 8 * c + ta + a3 + a4 + a5 + a6
    quotient, remainder = sp.div(hard, sp.Poly(linear, *variables))
    assert remainder.is_zero
    quotient_statistics = poly_stats(quotient)
    assert quotient_statistics == {
        "terms": 156_302,
        "negative": 230,
        "minimum": -220_930,
        "maximum": 4_328_230_421_200_896,
    }

    # The c=0 boundary is exactly the mixed quotient, checked as integer maps
    # to avoid any symbolic simplification assumption.
    c_zero = {
        monomial[:1] + monomial[2:]: int(coefficient)
        for monomial, coefficient in quotient.terms()
        if monomial[1] == 0
    }
    mixed_map = {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in low_high_quotient.terms()
    }
    assert c_zero == mixed_map

    slice_statistics = {}
    for exponent in range(quotient.degree(c) + 1):
        values = [
            int(coefficient)
            for monomial, coefficient in quotient.terms()
            if monomial[1] == exponent
        ]
        slice_statistics[str(exponent)] = {
            "terms": len(values),
            "negative": sum(value < 0 for value in values),
            "minimum": min(values),
            "maximum": max(values),
        }

    amgm = build_and_verify_amgm(quotient)
    assert amgm["negative_terms"] == amgm["blocks"] == 230
    return {
        "variables": [str(value) for value in variables],
        "hard": statistics,
        "linear_factor": str(linear),
        "quotient": quotient_statistics,
        "c_zero_equals_low_high_quotient": True,
        "c_slices": slice_statistics,
        "amgm": amgm,
    }


def main() -> int:
    # k=7 is in k<floor((2 alpha+1)/3) iff alpha>=12.
    assert all(
        (7 < (2 * alpha + 1) // 3) == (alpha >= 12)
        for alpha in range(1, 100)
    )
    low_high, quotient = certify_low_high()
    low_low = certify_low_low(quotient)
    report = {
        "status": "PASS_EXACT_RANK7_CONVOLUTION_HARD_FACES_REDUCTION_NOT_FULL_CONE",
        "required_alpha_cutoff": 12,
        "reserve": "Q7=14*i7^2-i6*i7-16*i6*i8",
        "low_high": low_high,
        "low_low": low_low,
        "remaining": [
            "certify coefficientwise nonnegativity off the two hard faces",
            "certify the full high/high cone",
            "prove Q7 for every connected tree in the required range",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("low/high AM-GM blocks", low_high["amgm"]["blocks"])
    print("low/low AM-GM blocks", low_low["amgm"]["blocks"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
