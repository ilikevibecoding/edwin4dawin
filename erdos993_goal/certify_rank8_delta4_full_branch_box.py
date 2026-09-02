#!/usr/bin/env python3
"""Exact low-memory sign certificate for a full-root Delta4 branch.

For the full-root capacity branch the reduced numerator is independent of n
before the cone coordinates w and x are constrained.  We certify it on the
larger rectangle 0<w<=33/190 and 4/3<=x/w<=760/471, which contains every
n>=23 cone slice.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from probe_rank8_delta4_source_curvatures import build
from probe_rank8_q8_terminal_delta7_d5_bernstein import certify


W_MAX = sp.Rational(33, 190)
R_LOW = sp.Rational(4, 3)
R_HIGH = sp.Rational(760, 471)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--max-depth", type=int, default=24)
    parser.add_argument("--no-split", action="store_true")
    args = parser.parse_args()

    value, (n, w, x, U, V, Z) = build(args.k, "full")
    numerator, denominator = sp.fraction(sp.cancel(value))
    if n in numerator.free_symbols or n in denominator.free_symbols:
        raise AssertionError("full-root expression unexpectedly depends on n")

    W, A = sp.symbols("W A", nonnegative=True)
    ratio = R_LOW + (R_HIGH - R_LOW) * A
    variables = (W, A, U, V)
    substitutions = {w: W_MAX * W, x: W_MAX * W * ratio}
    mapped_numerator = sp.Poly(sp.expand(numerator.subs(substitutions)), *variables, domain=sp.QQ)
    mapped_denominator = sp.Poly(sp.expand(denominator.subs(substitutions)), *variables, domain=sp.QQ)

    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
        mapped_denominator.as_expr(), variables
    )
    denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
    if denominator_minimum < 0:
        raise AssertionError((denominator_minimum, denominator_index))

    degrees, coefficients = tensor_bernstein_fast(mapped_numerator.as_expr(), variables)
    initial_minimum, initial_index = minimum_with_index(coefficients)
    flat_coefficients = list(coefficients.flat)
    negative_count = sum(bool(coefficient < 0) for coefficient in flat_coefficients)
    zero_count = sum(bool(coefficient == 0) for coefficient in flat_coefficients)
    positive_coefficients = [coefficient for coefficient in flat_coefficients if coefficient > 0]
    minimum_positive = min(positive_coefficients) if positive_coefficients else None
    print("INITIAL", degrees, coefficients.size, initial_minimum, initial_index, flush=True)
    if args.no_split:
        certificate = {
            "status": "PASS" if initial_minimum >= 0 else "UNRESOLVED_NO_SPLIT",
            "leaves": 1 if initial_minimum >= 0 else 0,
            "deepest": 0,
            "worst": (initial_minimum, tuple(int(entry) for entry in initial_index), 0),
            "splits_by_axis": [0] * len(variables),
        }
    else:
        certificate = certify(coefficients, args.max_depth)
    payload = {
        "status": certificate["status"],
        "scope": "exact Delta4>=0 for the full-root branch at one D6 endpoint, n>=23, conditional on the Q7(alpha>=12) c8 endpoint",
        "D6_k": args.k,
        "capacity_piece": "full-root",
        "Q7_dependency": "c8=c7(14c7-c6)/(16c6), valid after the audited Q7(alpha>=12) reserve",
        "enlarged_box": {
            "w": "0 < w <= 33/190",
            "x_over_w": "4/3 <= x/w <= 760/471",
            "U_V": "[0,1]^2",
            "contains_n_ge_23_cone": True,
            "containment_checks": [
                "w <= 3*(23-1)/((23-3)*(23-4)) = 33/190",
                "x/w >= 8/(6-w) >= 4/3",
                "x/w <= 4/(3*(1-w)) <= 760/471",
            ],
        },
        "source_numerator_terms": len(sp.Poly(sp.expand(numerator), w, x, U, V, domain=sp.QQ).terms()),
        "mapped_numerator_terms": len(mapped_numerator.terms()),
        "source_denominator_factor": str(sp.factor(denominator)),
        "mapped_degrees": list(degrees),
        "initial_coefficients": int(coefficients.size),
        "initial_minimum": str(initial_minimum),
        "initial_minimum_index": [int(entry) for entry in initial_index],
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": len(positive_coefficients),
        },
        "minimum_positive_coefficient": str(minimum_positive),
        "denominator_degrees": list(denominator_degrees),
        "denominator_minimum": str(denominator_minimum),
        "denominator_minimum_index": [int(entry) for entry in denominator_index],
        "certificate": certificate,
        "warning": "This closes only the full-root branch for the selected k; it is not the complete Delta4 theorem.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_full_branch_k{args.k}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_FULL_BRANCH", args.k)
    print("CERTIFICATE", certificate)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"] != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA4_FULL_BRANCH_ENLARGED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
