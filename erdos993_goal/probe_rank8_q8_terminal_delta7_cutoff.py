#!/usr/bin/env python3
"""Exact threshold probe for the four full-D5 rank-eight Delta7 branches."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
import probe_rank8_q8_terminal_delta7_d5_bernstein as base


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, required=True)
    parser.add_argument("--e", type=int, choices=(0, 1), required=True)
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--max-depth", type=int, default=28)
    parser.add_argument("--no-split", action="store_true")
    args = parser.parse_args()
    if args.order < 18:
        raise SystemExit("the capacity/D6 endpoint reduction is currently proved only for n>=18")

    base.CORE_ORDER = args.order
    (
        numerator,
        denominator,
        box,
        source_numerator_degrees,
        source_denominator_degrees,
        source_numerator_terms,
        source_denominator_terms,
    ) = base.build_cleared_branch(args.e, args.k)
    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(denominator, box)
    denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
    assert denominator_minimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    initial_minimum, initial_index = minimum_with_index(coefficients)
    certificate = (
        {
            "status": "PASS" if initial_minimum >= 0 else "UNRESOLVED_NO_SPLIT",
            "leaves": 1 if initial_minimum >= 0 else 0,
            "deepest": 0,
            "worst": (initial_minimum, tuple(int(x) for x in initial_index), 0),
            "splits_by_axis": [0] * len(box),
        }
        if args.no_split
        else base.certify(coefficients, args.max_depth)
    )
    payload = {
        "status": certificate["status"],
        "threshold": args.order,
        "branch": {"capacity_E": args.e, "D6_k": args.k},
        "domain": f"n>={args.order}, full D4 and full interior D5 intervals",
        "box": [str(variable) for variable in box],
        "source_numerator_terms": source_numerator_terms,
        "source_numerator_degrees": list(source_numerator_degrees),
        "source_denominator_terms": source_denominator_terms,
        "source_denominator_degrees": list(source_denominator_degrees),
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
        f"rank8_q8_terminal_delta7_cutoff_n{args.order}_e{args.e}_k{args.k}_exact_20260817.json"
    )
    output.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    print("THRESHOLD_BRANCH", args.order, args.e, args.k)
    print("CLEARED", degrees, coefficients.size, initial_minimum, initial_index)
    print("CERTIFICATE", certificate)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"] != "PASS":
        return 2
    print("PASS_EXACT_RANK8_DELTA7_THRESHOLD_BRANCH")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
