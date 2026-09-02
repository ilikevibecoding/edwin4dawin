#!/usr/bin/env python3
"""Test whether splitting star branches makes normalized PIRD harder.

For fixed total leaf count M, replacing a branch a>=2 by (1,a-1)
refines the leaf partition and increases K coefficientwise.  The
all-one partition is the maximal refinement.  This script compares

  Delta_k / K_k^2

before and after each elementary refinement.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from find_min_star_root_pird_failure import (
    build,
    partitions_with_cost,
)


def coeff(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def minor(b: list[int], k_poly: list[int], rank: int) -> int:
    k = rank - 1
    return (
        coeff(b, rank) * coeff(k_poly, k)
        - coeff(b, k) * coeff(k_poly, rank)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=35)
    parser.add_argument("--prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = checks = 0
    first_normalized_increase = None
    first_normalized_decrease = None
    for order in range(3, args.n_max + 1):
        for branches in partitions_with_cost(order - 1):
            old_k, _, old_b = build(branches)
            for position, a in enumerate(branches):
                if a < 2:
                    continue
                instances += 1
                refined = list(branches)
                refined.pop(position)
                refined.extend([1, a - 1])
                refined.sort()
                new_k, _, new_b = build(tuple(refined))
                for rank in range(1, max(len(old_b), len(new_b))):
                    if args.prefix_only and (
                        coeff(old_b, rank) < coeff(old_b, rank - 1)
                        or coeff(new_b, rank) < coeff(new_b, rank - 1)
                    ):
                        continue
                    old_den = coeff(old_k, rank - 1)
                    new_den = coeff(new_k, rank - 1)
                    if not old_den or not new_den:
                        continue
                    old_delta = minor(old_b, old_k, rank)
                    new_delta = minor(new_b, new_k, rank)
                    checks += 1
                    left = new_delta * old_den * old_den
                    right = old_delta * new_den * new_den
                    item = {
                        "old_order": order,
                        "old_branches": list(branches),
                        "refined_branches": refined,
                        "rank": rank,
                        "old_delta": old_delta,
                        "new_delta": new_delta,
                        "cleared_normalized_difference": left - right,
                    }
                    if left > right and first_normalized_increase is None:
                        first_normalized_increase = item
                    if left < right and first_normalized_decrease is None:
                        first_normalized_decrease = item

    report = {
        "status": "MIXED",
        "n_max": args.n_max,
        "prefix_only": args.prefix_only,
        "instances": instances,
        "checks": checks,
        "first_normalized_increase": first_normalized_increase,
        "first_normalized_decrease": first_normalized_decrease,
    }
    if first_normalized_increase is None:
        report["status"] = "NONINCREASING_PASS_NOT_PROOF"
    elif first_normalized_decrease is None:
        report["status"] = "NONDECREASING_PASS_NOT_PROOF"
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
