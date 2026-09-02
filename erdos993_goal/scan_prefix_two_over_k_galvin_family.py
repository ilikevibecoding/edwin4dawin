#!/usr/bin/env python3
"""Exact boundary scan of V2/k on the two-level Galvin tree family.

The tree T(m,t) has a central vertex, m support neighbours, and t leaves
at every support.  Its independence polynomial is

    ((1+x)^t + x)^m + x(1+x)^(mt).

Only a configurable window below the prefix cutoff is evaluated.  Direct
positive binomial sums avoid expanding the full high-degree polynomial.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path


def coefficient(m: int, t: int, rank: int) -> int:
    if rank < 0:
        return 0
    total = comb(m * t, rank - 1) if 0 <= rank - 1 <= m * t else 0
    # Choose s occupied support vertices.  Their leaves are unavailable;
    # every other leaf is independently optional.
    for s in range(0, min(m, rank) + 1):
        leaf_count = t * (m - s)
        leaf_rank = rank - s
        if 0 <= leaf_rank <= leaf_count:
            total += comb(m, s) * comb(leaf_count, leaf_rank)
    return total


def reserve(pm: int, p0: int, pp: int, rank: int) -> int:
    return rank * p0 * p0 + pm * p0 - (rank + 1) * pm * pp


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-m", type=int, default=500)
    parser.add_argument("--max-t", type=int, default=40)
    parser.add_argument("--window", type=int, default=8)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    checks = 0
    failure = None
    three_halves_failure = None
    three_halves_failure_above_rank_two = None
    ordered_lc_failure = None
    closest_ratio: Fraction | None = None
    closest = None
    smallest_sigma: Fraction | None = None
    smallest_sigma_item = None
    smallest_sigma_above_rank_two: Fraction | None = None
    smallest_sigma_above_rank_two_item = None

    for t in range(1, args.max_t + 1):
        for m in range(1, args.max_m + 1):
            alpha = m * t + 1
            cutoff = (2 * alpha + 1) // 3
            first_rank = max(2, cutoff - args.window)
            if first_rank >= cutoff:
                continue

            # Cache the short consecutive coefficient window once.
            values = {
                rank: coefficient(m, t, rank)
                for rank in range(first_rank - 1, cutoff + 1)
            }
            for rank in range(first_rank, cutoff):
                checks += 1
                pm = values[rank - 1]
                p0 = values[rank]
                pp = values[rank + 1]
                g = reserve(pm, p0, pp, rank)
                left = rank * g
                right = 2 * (rank - 1) * pm * p0
                item = {
                    "m": m,
                    "t": t,
                    "order": 1 + m * (t + 1),
                    "alpha": alpha,
                    "rank": rank,
                    "cutoff": cutoff,
                    "left": left,
                    "right": right,
                    "gap": left - right,
                }
                if left < right and failure is None:
                    failure = item
                ratio = Fraction(left, right)
                if closest_ratio is None or ratio < closest_ratio:
                    closest_ratio = ratio
                    closest = item | {
                        "left_over_right": float(ratio),
                        "ratio_numerator": ratio.numerator,
                        "ratio_denominator": ratio.denominator,
                    }
                sigma = Fraction(g, pm * p0)
                sigma_item = item | {
                    "sigma": float(sigma),
                    "sigma_numerator": sigma.numerator,
                    "sigma_denominator": sigma.denominator,
                }
                if (
                    2 * g < 3 * pm * p0
                    and three_halves_failure is None
                ):
                    three_halves_failure = sigma_item
                if (
                    rank >= 3
                    and 2 * g < 3 * pm * p0
                    and three_halves_failure_above_rank_two is None
                ):
                    three_halves_failure_above_rank_two = sigma_item
                if g < pm * p0 and ordered_lc_failure is None:
                    ordered_lc_failure = sigma_item
                if smallest_sigma is None or sigma < smallest_sigma:
                    smallest_sigma = sigma
                    smallest_sigma_item = sigma_item
                if rank >= 3 and (
                    smallest_sigma_above_rank_two is None
                    or sigma < smallest_sigma_above_rank_two
                ):
                    smallest_sigma_above_rank_two = sigma
                    smallest_sigma_above_rank_two_item = sigma_item

        print(
            f"t={t}: m<= {args.max_m}, checks={checks:,}, "
            f"closest={float(closest_ratio):.12f}",
            flush=True,
        )

    report = {
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "parameters": {
            "max_m": args.max_m,
            "max_t": args.max_t,
            "window": args.window,
        },
        "checks": checks,
        "failure": failure,
        "three_halves_failure": three_halves_failure,
        "three_halves_failure_above_rank_two":
            three_halves_failure_above_rank_two,
        "ordered_lc_failure": ordered_lc_failure,
        "closest": closest,
        "smallest_sigma": smallest_sigma_item,
        "smallest_sigma_above_rank_two":
            smallest_sigma_above_rank_two_item,
    }
    if args.output:
        args.output.write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps(report, indent=2), flush=True)
    raise SystemExit(1 if failure else 0)


if __name__ == "__main__":
    main()
