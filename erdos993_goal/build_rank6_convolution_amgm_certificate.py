#!/usr/bin/env python3
"""Greedily build an exact midpoint AM-GM certificate for rank six."""

from __future__ import annotations

import argparse
import gzip
import json
import math
from pathlib import Path

from explore_rank6_convolution_amgm_pairs import monomial_text


COEFFICIENT_FILES = {
    "low-high": Path(__file__).with_name("rank6_hard_quotient_coefficients.json.gz"),
    "low-low": Path(__file__).with_name("rank6_low_low_quotient_coefficients.json.gz"),
}


def coefficient_map(source: Path) -> dict[tuple[int, ...], int]:
    with gzip.open(source, "rt", encoding="utf-8") as handle:
        rows = json.load(handle)
    return {
        tuple(int(value) for value in exponents): int(coefficient)
        for exponents, coefficient in rows
    }


def allocation_for_pair(
    needed: int,
    left_available: int,
    right_available: int,
    left_weight: float,
    right_weight: float,
) -> tuple[int, int, float] | None:
    if left_available <= 0 or right_available <= 0:
        return None
    ideal = needed * math.sqrt(right_weight / left_weight) / 2
    candidates = {1, left_available, max(1, int(ideal)), max(1, math.ceil(ideal))}
    center = round(ideal)
    candidates.update(range(max(1, center - 40), center + 41))
    for numerator, denominator in ((999, 1000), (99, 100), (9, 10), (3, 4), (1, 2)):
        target_right = max(1, right_available * numerator // denominator)
        candidates.add((needed * needed + 4 * target_right - 1) // (4 * target_right))
    best = None
    for left_use in candidates:
        if not 1 <= left_use <= left_available:
            continue
        right_use = (needed * needed + 4 * left_use - 1) // (4 * left_use)
        if right_use > right_available:
            continue
        score = left_weight * left_use + right_weight * right_use
        candidate = (left_use, right_use, score)
        if best is None or candidate[2] < best[2]:
            best = candidate
    return best


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=1_000_000)
    parser.add_argument("--case", choices=tuple(COEFFICIENT_FILES), default="low-high")
    args = parser.parse_args()
    coefficients = coefficient_map(COEFFICIENT_FILES[args.case])
    remaining = {
        monomial: args.scale * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (args.scale * -coefficient, monomial)
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    pair_map: dict[tuple[int, ...], list[tuple[tuple[int, ...], tuple[int, ...]]]] = {}
    incidence = {monomial: 0 for monomial in remaining}
    for needed, middle in negatives:
        pairs = []
        for left in remaining:
            right = tuple(2 * m - l for m, l in zip(middle, left))
            if left > right or right not in remaining:
                continue
            pairs.append((left, right))
            incidence[left] += 1
            incidence[right] += 1
        if not pairs:
            raise AssertionError(f"no midpoint pair for {needed} {middle}")
        pair_map[middle] = pairs
    ordered = sorted(negatives, key=lambda item: (len(pair_map[item[1]]), -item[0]))
    allocations = []
    for needed, middle in ordered:
        choices = []
        for left, right in pair_map[middle]:
            left_available = remaining[left]
            right_available = remaining[right]
            result = allocation_for_pair(
                needed,
                left_available,
                right_available,
                max(1, incidence[left]) / left_available if left_available else math.inf,
                max(1, incidence[right]) / right_available if right_available else math.inf,
            )
            if result is None:
                continue
            left_use, right_use, score = result
            choices.append(
                (
                    score,
                    max(left_use / left_available, right_use / right_available),
                    left,
                    right,
                    left_use,
                    right_use,
                )
            )
        if not choices:
            print("FAILED", needed, middle, "pairs", len(pair_map[middle]), flush=True)
            return 1
        _, _, left, right, left_use, right_use = min(choices)
        assert 4 * left_use * right_use >= needed * needed
        remaining[left] -= left_use
        remaining[right] -= right_use
        assert remaining[left] >= 0 and remaining[right] >= 0
        incidence[left] = max(0, incidence[left] - 1)
        incidence[right] = max(0, incidence[right] - 1)
        allocations.append((needed, middle, left_use, left, right_use, right))
    print(f"PASS case={args.case} allocations={len(allocations)} scale={args.scale}")
    print("ROWS = (")
    for row in sorted(allocations, key=lambda item: item[1]):
        print(f"    {row},")
    print(")")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
