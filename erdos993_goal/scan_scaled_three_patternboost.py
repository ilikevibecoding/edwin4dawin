#!/usr/bin/env python3
"""Audit scaled coefficient prefixes in an exact PatternBoost corpus.

The corpus contains one exact polynomial and one Prüfer certificate for
each distinct 60-vertex tree polynomial.  This scanner checks

    i_{k-1} <= 3 i_k,  k <= floor(2 alpha/3),

and also records the first failure of the deliberately stronger factor-two
variant, if present.  The scan is evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from pathlib import Path


def item(record: dict, k: int, factor: int) -> dict:
    poly = record["polynomial"]
    ratio = Fraction(poly[k - 1], factor * poly[k])
    return {
        "first_line": record["first_line"],
        "prufer_code_one_based": record["prufer_code_one_based"],
        "order": record["order"],
        "alpha": record["alpha"],
        "rank": k,
        "previous": poly[k - 1],
        "factor_current": factor * poly[k],
        "difference": factor * poly[k] - poly[k - 1],
        "previous_over_factor_current": float(ratio),
    }


def gsb_reserve(poly: list[int], k: int) -> int:
    previous = poly[k - 1] if k - 1 >= 0 else 0
    current = poly[k] if k < len(poly) else 0
    following = poly[k + 1] if k + 1 < len(poly) else 0
    return (
        k * current * current
        + previous * current
        - (k + 1) * previous * following
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()
    payload = json.loads(args.corpus.read_text(encoding="utf-8"))

    checks = 0
    ceil_checks = 0
    failure_three = None
    failure_three_ceil = None
    failure_two = None
    closest_three_ratio: Fraction | None = None
    closest_three = None
    closest_two_ratio: Fraction | None = None
    closest_two = None
    cutoff_gsb_failure = None
    smallest_cutoff_gsb_ratio: Fraction | None = None
    smallest_cutoff_gsb_item = None

    for record in payload["records"]:
        poly = record["polynomial"]
        alpha = record["alpha"]
        for k in range(1, (2 * alpha) // 3 + 1):
            checks += 1
            if (
                poly[k - 1] > 3 * poly[k]
                and failure_three is None
            ):
                failure_three = item(record, k, 3)
            if (
                poly[k - 1] > 2 * poly[k]
                and failure_two is None
            ):
                failure_two = item(record, k, 2)

            ratio_three = Fraction(poly[k - 1], 3 * poly[k])
            if (
                closest_three_ratio is None
                or ratio_three > closest_three_ratio
            ):
                closest_three_ratio = ratio_three
                closest_three = item(record, k, 3)

            ratio_two = Fraction(poly[k - 1], 2 * poly[k])
            if (
                closest_two_ratio is None
                or ratio_two > closest_two_ratio
            ):
                closest_two_ratio = ratio_two
                closest_two = item(record, k, 2)

        for k in range(1, (2 * alpha + 2) // 3 + 1):
            ceil_checks += 1
            if (
                poly[k - 1] > 3 * poly[k]
                and failure_three_ceil is None
            ):
                failure_three_ceil = item(record, k, 3)

        cutoff_rank = (2 * alpha + 1) // 3
        cutoff_reserve = gsb_reserve(poly, cutoff_rank)
        cutoff_scale = poly[cutoff_rank] ** 2
        cutoff_item = {
            "first_line": record["first_line"],
            "prufer_code_one_based": record["prufer_code_one_based"],
            "order": record["order"],
            "alpha": alpha,
            "rank": cutoff_rank,
            "GSB_reserve": cutoff_reserve,
            "current_squared": cutoff_scale,
        }
        if cutoff_reserve < 0 and cutoff_gsb_failure is None:
            cutoff_gsb_failure = cutoff_item
        if cutoff_scale > 0:
            cutoff_ratio = Fraction(cutoff_reserve, cutoff_scale)
            if (
                smallest_cutoff_gsb_ratio is None
                or cutoff_ratio < smallest_cutoff_gsb_ratio
            ):
                smallest_cutoff_gsb_ratio = cutoff_ratio
                smallest_cutoff_gsb_item = cutoff_item | {
                    "reserve_over_current_squared":
                        float(cutoff_ratio)
                }

    report = {
        "status": (
            "PASS_NOT_PROOF" if failure_three is None else "FAIL"
        ),
        "source": str(args.corpus),
        "source_status": payload["status"],
        "exact_integer_arithmetic": True,
        "records": len(payload["records"]),
        "checks": checks,
        "ceil_two_thirds_checks": ceil_checks,
        "scaled_three_failure": failure_three,
        "ceil_two_thirds_scaled_three_failure": failure_three_ceil,
        "closest_scaled_three": closest_three,
        "scaled_two_failure": failure_two,
        "closest_scaled_two": closest_two,
        "cutoff_GSB_failure": cutoff_gsb_failure,
        "smallest_cutoff_GSB_ratio": smallest_cutoff_gsb_item,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 0 if failure_three is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
