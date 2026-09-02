#!/usr/bin/env python3
"""Exact low-memory Bernstein probe for rank-eight terminal Delta^4 boxes.

The rational cone map is shared with the audited Delta^5 probe.  This wrapper
replaces only the requested Newton coefficient and emits separate artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import probe_rank8_q8_terminal_delta5_qd5_intersection as base


def build_delta4(threshold: int, k: int, piece: str):
    original = base.newton_coefficients

    def select_delta4(expression):
        coefficients = original(expression)
        coefficients[5] = coefficients[4]
        return coefficients

    base.newton_coefficients = select_delta4
    try:
        return base.build(threshold, k, "low", piece, "q7")
    finally:
        base.newton_coefficients = original


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=23)
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("l0", "lcross", "ucap", "full"), required=True)
    parser.add_argument("--backend", choices=("flint", "sympy"), default="sympy")
    parser.add_argument("--max-depth", type=int, default=20)
    parser.add_argument("--no-split", action="store_true")
    args = parser.parse_args()

    numerator, denominator, box, num_deg, den_deg, num_terms, den_terms = build_delta4(
        args.order, args.k, args.piece
    )
    transform = base.tensor_bernstein_flint if args.backend == "flint" else base.tensor_bernstein_fast
    minimum = base.minimum_flint if args.backend == "flint" else base.minimum_with_index
    denominator_degrees, denominator_coefficients = transform(denominator, box)
    denominator_minimum, denominator_index = minimum(denominator_coefficients)
    assert denominator_minimum >= 0
    del denominator_coefficients
    degrees, coefficients = transform(numerator, box)
    initial_minimum, initial_index = minimum(coefficients)
    if args.no_split:
        certificate = {
            "status": "PASS" if initial_minimum >= 0 else "UNRESOLVED_NO_SPLIT",
            "leaves": 1 if initial_minimum >= 0 else 0,
            "deepest": 0,
            "worst": (initial_minimum, tuple(int(value) for value in initial_index), 0),
            "splits_by_axis": [0] * len(box),
        }
    else:
        certificate = base.certify(coefficients, args.max_depth)
    payload = {
        "status": certificate["status"],
        "Newton_rank": 4,
        "threshold": args.order,
        "D6_k": args.k,
        "capacity_piece": args.piece,
        "c8_bound": "Q7",
        "bernstein_backend": args.backend,
        "q_range": "full D5-induced q interval; low-piece formulas are safe supersets when q>6/7",
        "box": [str(value) for value in box],
        "source_numerator_terms": num_terms,
        "source_numerator_degrees": list(num_deg),
        "source_denominator_terms": den_terms,
        "source_denominator_degrees": list(den_deg),
        "cleared_degrees": list(degrees),
        "initial_coefficients": int(coefficients.size),
        "initial_minimum": str(initial_minimum),
        "initial_minimum_index": [int(value) for value in initial_index],
        "denominator_degrees": list(denominator_degrees),
        "denominator_minimum": str(denominator_minimum),
        "denominator_minimum_index": [int(value) for value in denominator_index],
        "certificate": certificate,
    }
    output = Path(__file__).with_name(
        f"rank8_q8_terminal_delta4_qd5_n{args.order}_k{args.k}_{args.piece}_q7_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    print("DELTA4_QD5", args.order, args.k, args.piece)
    print("CLEARED", degrees, coefficients.size, initial_minimum, initial_index)
    print("CERTIFICATE", certificate)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"] != "PASS":
        raise SystemExit(2)
    print("PASS_EXACT_RANK8_DELTA4_QD5_INTERSECTION_BRANCH")


if __name__ == "__main__":
    main()
