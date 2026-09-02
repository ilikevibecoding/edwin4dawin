#!/usr/bin/env python3
"""Exact coefficient probe for one high-tail slack over the proved hard face.

For a selected b_j, j=3..7, rebuild the proposed base-payment polynomial with
all cumulative-X hard-face variables live and count every negative coefficient
that actually contains b_j.  A zero count proves that one-variable extension
coefficientwise, but not mixed products of two different high-tail slacks.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from explore_rank8_low_high_base_margin_payment_faces import build


ROOT = Path(__file__).resolve().parent
BASE = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--right-slack", type=int, choices=range(3, 8), required=True)
    args = parser.parse_args()
    extension = f"b{args.right_slack}"
    polynomial, names = build((*BASE, extension))
    assert extension in names
    extension_index = names.index(extension)
    term_count = 0
    negative_count = 0
    base_negative_count = 0
    extension_negative_count = 0
    minimum_extension_coefficient = None
    examples = []
    for monomial, coefficient in polynomial.terms():
        exponent = int(monomial[extension_index])
        value = int(coefficient)
        term_count += 1
        if value < 0:
            negative_count += 1
            if exponent:
                extension_negative_count += 1
                if len(examples) < 20:
                    examples.append({"monomial": list(monomial), "coefficient": value})
            else:
                base_negative_count += 1
        if exponent:
            minimum_extension_coefficient = (
                value
                if minimum_extension_coefficient is None
                else min(minimum_extension_coefficient, value)
            )
    status = (
        "PASS_EXACT_COEFFICIENTWISE_SINGLE_HIGH_TAIL_EXTENSION"
        if extension_negative_count == 0
        else "OBSTRUCTION_NEGATIVE_SINGLE_HIGH_TAIL_EXTENSION_COEFFICIENT"
    )
    payload = {
        "schema": "rank8-low-high-base-payment-single-high-tail-extension-v1",
        "status": status,
        "extension": extension,
        "variables": list(names),
        "term_count": term_count,
        "negative_count": negative_count,
        "base_negative_count": base_negative_count,
        "extension_negative_count": extension_negative_count,
        "minimum_extension_coefficient": minimum_extension_coefficient,
        "negative_examples": examples,
        "scope_warning": (
            "This checks one high-tail slack at a time. Mixed products among "
            "different b3..b7 slacks are not covered."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = ROOT / f"rank8_low_high_base_payment_{extension}_extension_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(
        extension,
        "terms",
        term_count,
        "negative",
        negative_count,
        "extension_negative",
        extension_negative_count,
        "minimum_extension",
        minimum_extension_coefficient,
    )
    print("REPORT", hashlib.sha256(output.read_bytes()).hexdigest().upper())
    return 0 if extension_negative_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
