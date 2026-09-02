#!/usr/bin/env python3
"""Exact coefficient probe for a subset of high-tail slacks b3..b7.

The cumulative-X hard variables stay live.  The result is a scoped
coefficient theorem for the chosen subset only; omitted high-tail slacks and
mixed products involving them are not covered.
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
    parser.add_argument("--right-slacks", required=True)
    args = parser.parse_args()
    indices = tuple(sorted({int(value) for value in args.right_slacks.split(",")}))
    if not indices or any(index not in range(3, 8) for index in indices):
        raise SystemExit("right slacks must be a nonempty subset of 3,4,5,6,7")
    extensions = tuple(f"b{index}" for index in indices)
    polynomial, names = build((*BASE, *extensions))
    extension_indices = tuple(names.index(name) for name in extensions)

    term_count = negative_count = base_negative_count = extension_negative_count = 0
    extension_term_count = 0
    minimum_extension_coefficient = None
    examples = []
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        outside = any(int(monomial[index]) for index in extension_indices)
        term_count += 1
        extension_term_count += outside
        if outside:
            minimum_extension_coefficient = (
                value
                if minimum_extension_coefficient is None
                else min(minimum_extension_coefficient, value)
            )
        if value < 0:
            negative_count += 1
            if outside:
                extension_negative_count += 1
                if len(examples) < 20:
                    examples.append({"monomial": list(monomial), "coefficient": value})
            else:
                base_negative_count += 1

    status = (
        "PASS_EXACT_COEFFICIENTWISE_HIGH_TAIL_SUBSET_EXTENSION"
        if extension_negative_count == 0
        else "OBSTRUCTION_NEGATIVE_HIGH_TAIL_SUBSET_EXTENSION_COEFFICIENT"
    )
    suffix = "_".join(extensions)
    output = ROOT / f"rank8_low_high_base_payment_{suffix}_subset_exact_20260820.json"
    payload = {
        "schema": "rank8-low-high-base-payment-high-tail-subset-v1",
        "status": status,
        "extensions": list(extensions),
        "variables": list(names),
        "term_count": term_count,
        "extension_term_count": extension_term_count,
        "negative_count": negative_count,
        "base_negative_count": base_negative_count,
        "extension_negative_count": extension_negative_count,
        "minimum_extension_coefficient": minimum_extension_coefficient,
        "negative_examples": examples,
        "scope_warning": "Only the stated high-tail subset over the cumulative-X hard face is covered.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(
        extensions,
        "terms",
        term_count,
        "extension_terms",
        extension_term_count,
        "extension_negative",
        extension_negative_count,
        "minimum_extension",
        minimum_extension_coefficient,
    )
    print("REPORT", hashlib.sha256(output.read_bytes()).hexdigest().upper())
    return 0 if extension_negative_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
