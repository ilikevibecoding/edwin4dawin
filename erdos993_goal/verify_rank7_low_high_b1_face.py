#!/usr/bin/env python3
"""Exact AM-GM certificate for the enlarged rank-seven low/high b1 face."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_rank7_convolution_extended_faces import low_high_b1_face
from verify_rank6_three_halves_convolution_cones import (
    build_and_verify_amgm,
    poly_stats,
)
from verify_rank7_three_halves_hard_faces import to_sympy
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_low_high_b1_face_exact_20260816.json"


def main() -> int:
    margin, context = low_high_b1_face()
    statistics = polynomial_statistics(margin)
    assert statistics == {
        "terms": 204_518,
        "negative": 774,
        "minimum": -925_616,
        "maximum": 42_636_954_083_328,
    }
    variables = sp.symbols("b ta a3 a4 a5 a6 tb b0 b1", nonnegative=True)
    b, ta, a3, a4, a5, a6, _, _, b1 = variables
    exact = to_sympy(margin, variables)
    linear = 8 * b + ta + a3 + a4 + a5 + a6
    quotient, remainder = sp.div(exact, sp.Poly(linear, *variables))
    assert remainder.is_zero
    quotient_statistics = poly_stats(quotient)
    assert quotient_statistics == {
        "terms": 136_451,
        "negative": 316,
        "minimum": -115_702,
        "maximum": 4_061_912_712_192,
    }

    margin_slices = {}
    for exponent in range(exact.degree(b1) + 1):
        values = [
            int(coefficient)
            for monomial, coefficient in exact.terms()
            if monomial[-1] == exponent
        ]
        margin_slices[str(exponent)] = {
            "terms": len(values),
            "negative": sum(value < 0 for value in values),
            "minimum": min(values),
            "maximum": max(values),
        }
    assert margin_slices == {
        "0": {"terms": 81_335, "negative": 210, "minimum": -925_616, "maximum": 42_636_954_083_328},
        "1": {"terms": 56_937, "negative": 203, "minimum": -242_560, "maximum": 33_606_417_014_400},
        "2": {"terms": 38_331, "negative": 181, "minimum": -281_216, "maximum": 8_948_474_195_904},
        "3": {"terms": 20_056, "negative": 120, "minimum": -180_288, "maximum": 993_570_460_992},
        "4": {"terms": 7_859, "negative": 60, "minimum": -41_344, "maximum": 39_634_758_144},
    }

    amgm = build_and_verify_amgm(quotient)
    assert amgm["negative_terms"] == amgm["blocks"] == 316
    assert amgm["minimum_quadratic_slack"] == 2_560
    assert amgm["smallest_source_remainder"] == 121_476

    report = {
        "status": "PASS_EXACT_RANK7_LOW_HIGH_ENLARGED_B1_FACE",
        "variables": [str(value) for value in variables],
        "face_definition": "a=a0=a2=b2=b3=b4=b5=b6=0; b1 remains free",
        "margin": statistics,
        "b1_slices": margin_slices,
        "linear_factor": str(linear),
        "quotient": quotient_statistics,
        "amgm": amgm,
        "conclusion": "the complete enlarged b1 face is nonnegative for all nonnegative parameters",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("margin", statistics)
    print("quotient", quotient_statistics)
    print(
        "AM-GM",
        amgm["blocks"],
        amgm["minimum_quadratic_slack"],
        amgm["smallest_source_remainder"],
    )
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
