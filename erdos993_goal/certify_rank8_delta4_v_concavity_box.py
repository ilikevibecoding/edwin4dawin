#!/usr/bin/env python3
"""Exact low-memory superseding-box certificate for Delta4 V-concavity.

This deliberately enlarges the (n,w,x) cone valid for n>=23 to

    0 < w <= 33/190,
    4/3 <= x/w <= 760/471.

Thus a nonpositive second V derivative on this box is enough for every
audited Q8 Delta4 branch.  It is only a curvature certificate, not a Delta4
sign certificate.
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
    parser.add_argument("--piece", choices=("l0", "lcross", "ucap", "full"), required=True)
    parser.add_argument("--max-depth", type=int, default=24)
    parser.add_argument("--no-split", action="store_true")
    args = parser.parse_args()

    value, (_, w, x, U, V, Z) = build(args.k, args.piece)
    curvature = sp.cancel(-sp.diff(value, V, 2))
    numerator, denominator = sp.fraction(curvature)

    W, A = sp.symbols("W A", nonnegative=True)
    ratio = R_LOW + (R_HIGH - R_LOW) * A
    variables = (W, A, U, V, Z)
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
        "scope": "exact certificate that d2 Delta4/dV2 <= 0 on an enlarged box; not Delta4>=0",
        "D6_k": args.k,
        "capacity_piece": args.piece,
        "enlarged_box": {
            "w": "0 < w <= 33/190",
            "x_over_w": "4/3 <= x/w <= 760/471",
            "U_V_Z": "[0,1]^3",
            "contains_n_ge_23_cone": True,
        },
        "source_numerator_terms": len(sp.Poly(sp.expand(numerator), w, x, U, V, Z, domain=sp.QQ).terms()),
        "mapped_numerator_terms": len(mapped_numerator.terms()),
        "mapped_degrees": list(degrees),
        "initial_coefficients": int(coefficients.size),
        "initial_minimum": str(initial_minimum),
        "initial_minimum_index": [int(entry) for entry in initial_index],
        "denominator_degrees": list(denominator_degrees),
        "denominator_minimum": str(denominator_minimum),
        "denominator_minimum_index": [int(entry) for entry in denominator_index],
        "certificate": certificate,
        "warning": "This proves only concavity in the D5-link parameter V. Endpoint signs remain separate obligations.",
    }
    output = Path(__file__).with_name(
        f"rank8_delta4_v_concavity_k{args.k}_{args.piece}_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    print("RANK8_DELTA4_V_CONCAVITY", args.k, args.piece)
    print("MAPPED", degrees, coefficients.size, initial_minimum, initial_index)
    print("CERTIFICATE", certificate)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"] != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA4_V_CONCAVITY_ENLARGED_BOX")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
