#!/usr/bin/env python3
"""Prepare the irreducible continued-fraction sign factor for LP search."""

import argparse
import json
from pathlib import Path


def negate(value: str) -> str:
    return value[1:] if value.startswith("-") else "-" + value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    invariant = json.loads(
        Path(f"combined_ground_root_invariant_{args.parity}_exact_20260806.json").read_text()
    )
    moment_path = Path(f"{args.parity}_symbolic_reduced_moment_numerator_20260806.json")
    if args.parity == "odd" and not moment_path.exists():
        moment_path = Path("odd_symbolic_reduced_moment_numerator_20260806.json")
    moment = json.loads(moment_path.read_text())
    sign_factor = max(
        invariant["numerator_factorization"]["factors"], key=lambda item: item["terms"]
    )
    report = {
        "parity": args.parity,
        "target": "negative_invariant_sign_factor",
        "moment_reduced_numerator": [
            [exponent, negate(coefficient)]
            for exponent, coefficient in sign_factor["polynomial"]
        ],
        "condition_numerator": moment["condition_numerator"],
        "numerator_degrees": sign_factor["degrees_r_u_v_c"],
        "condition_degrees": moment["condition_degrees"],
        "identity": "invariant has sign -P; target=-P",
    }
    output = args.output or Path(
        f"invariant_conditional_{args.parity}_input_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(output)


if __name__ == "__main__":
    main()
