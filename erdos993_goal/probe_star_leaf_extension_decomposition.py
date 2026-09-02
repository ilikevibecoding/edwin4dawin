#!/usr/bin/env python3
"""Test the correction in a one-leaf extension of a star branch.

If one branch size a is increased to a+1, with H the product of all
other star factors, then

  K' = (1+x)K - x^2 H,
  B' = (1+x)B - x^2(1+x)H.

This script compares the new ratio minor with the common-convolution
minor of ((1+x)B,(1+x)K), looking for a nonnegative correction or a
quantified compensation inequality.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from find_min_star_root_pird_failure import (
    build,
    conv,
    partitions_with_cost,
    star,
)


def coeff(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def minor(p: list[int], q: list[int], k: int) -> int:
    return (
        coeff(p, k + 1) * coeff(q, k)
        - coeff(p, k) * coeff(q, k + 1)
    )


def shift(poly: list[int], amount: int) -> list[int]:
    return [0] * amount + poly


def subtract(left: list[int], right: list[int]) -> list[int]:
    size = max(len(left), len(right))
    return [
        coeff(left, i) - coeff(right, i)
        for i in range(size)
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=35)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = checks = 0
    first_negative_correction = None
    first_failed_compensation = None
    minimum_compensation_ratio = None
    minimum_item = None

    for order in range(3, args.n_max + 1):
        for branches in partitions_with_cost(order - 1):
            if not branches:
                continue
            for position in sorted(set(range(len(branches))), key=branches.__getitem__):
                # Equal branch sizes produce isomorphic extensions; retain
                # only the first occurrence of each value.
                if position and branches[position] == branches[position - 1]:
                    continue
                instances += 1
                old_k, _, old_b = build(branches)
                others = branches[:position] + branches[position + 1 :]
                h = [1]
                for leaves in others:
                    h = conv(h, star(leaves))

                p = conv(old_b, [1, 1])
                q = conv(old_k, [1, 1])
                r = shift(conv(h, [1, 1]), 2)
                s = shift(h, 2)
                new_b = subtract(p, r)
                new_k = subtract(q, s)

                incremented = list(branches)
                incremented[position] += 1
                expected_k, _, expected_b = build(tuple(sorted(incremented)))
                if new_k != expected_k or new_b != expected_b:
                    raise AssertionError("leaf-extension identity failed")

                for k in range(max(len(new_b), len(new_k))):
                    rank = k + 1
                    if rank < args.min_rank:
                        continue
                    if (
                        args.prefix_only
                        and coeff(new_b, rank) < coeff(new_b, rank - 1)
                    ):
                        continue
                    common = minor(p, q, k)
                    target = minor(new_b, new_k, k)
                    correction = target - common
                    checks += 1
                    item = {
                        "old_order": order,
                        "old_branches": list(branches),
                        "incremented_position": position,
                        "new_branches": sorted(incremented),
                        "k": k,
                        "rank_r": rank,
                        "new_on_prefix":
                            coeff(new_b, rank) >= coeff(new_b, rank - 1),
                        "common_minor": common,
                        "target_minor": target,
                        "correction": correction,
                    }
                    if correction < 0:
                        if first_negative_correction is None:
                            first_negative_correction = item
                        if common + correction < 0 and first_failed_compensation is None:
                            first_failed_compensation = item
                        if common > 0:
                            ratio = (common, -correction)
                            if (
                                minimum_compensation_ratio is None
                                or ratio[0] * minimum_compensation_ratio[1]
                                <
                                minimum_compensation_ratio[0] * ratio[1]
                            ):
                                minimum_compensation_ratio = ratio
                                minimum_item = item

    report = {
        "status": (
            "TARGET_FAILURE"
            if first_failed_compensation
            else "PASS_NOT_PROOF"
        ),
        "n_max": args.n_max,
        "instances": instances,
        "checks": checks,
        "first_negative_correction": first_negative_correction,
        "first_failed_compensation": first_failed_compensation,
        "minimum_common_to_debt_ratio": (
            None
            if minimum_compensation_ratio is None
            else {
                "exact":
                    f"{minimum_compensation_ratio[0]}/"
                    f"{minimum_compensation_ratio[1]}",
                **minimum_item,
            }
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failed_compensation else 0


if __name__ == "__main__":
    raise SystemExit(main())
