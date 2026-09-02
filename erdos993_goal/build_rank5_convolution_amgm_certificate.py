#!/usr/bin/env python3
"""Build an exact integer AM-GM certificate for quotient coefficient slices."""

from __future__ import annotations

import argparse
import math

from explore_rank5_convolution_amgm_pairs import (
    monomial_text,
    quotient_slice,
)


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
    candidates = {
        1,
        left_available,
        max(1, int(math.floor(ideal))),
        max(1, int(math.ceil(ideal))),
    }
    for numerator, denominator in (
        (999, 1000),
        (99, 100),
        (19, 20),
        (9, 10),
        (3, 4),
        (1, 2),
    ):
        target_right = max(
            1, right_available * numerator // denominator
        )
        candidates.add(
            (needed * needed + 4 * target_right - 1)
            // (4 * target_right)
        )
    # Add a modest neighborhood to absorb integer rounding.
    center = int(round(ideal))
    candidates.update(
        value
        for value in range(max(1, center - 20), center + 21)
        if value <= left_available
    )
    best = None
    for left_use in candidates:
        if not 1 <= left_use <= left_available:
            continue
        right_use = (needed * needed + 4 * left_use - 1) // (
            4 * left_use
        )
        if right_use > right_available:
            continue
        score = left_weight * left_use + right_weight * right_use
        candidate = (left_use, right_use, score)
        if best is None or candidate[2] < best[2]:
            best = candidate
    return best


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--a-power", type=int, default=0)
    parser.add_argument("--scale", type=int, default=1_000_000)
    args = parser.parse_args()
    variables, coefficients = quotient_slice(args.a_power)
    remaining = {
        monomial: args.scale * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (
            args.scale * -coefficient,
            monomial,
        )
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    pair_map = {}
    incidence = {monomial: 0 for monomial in remaining}
    for needed, middle in negatives:
        pairs = []
        for left in remaining:
            right = tuple(
                2 * middle_index - left_index
                for middle_index, left_index in zip(middle, left)
            )
            if left > right or right not in remaining:
                continue
            pairs.append((left, right))
            incidence[left] += 1
            incidence[right] += 1
        pair_map[middle] = pairs
    allocations = []
    ordered_negatives = sorted(
        negatives,
        key=lambda item: (len(pair_map[item[1]]), -item[0]),
    )
    for needed, middle in ordered_negatives:
        choices = []
        for left, right in pair_map[middle]:
            left_available = remaining[left]
            right_available = remaining[right]
            if left_available <= 0 or right_available <= 0:
                continue
            left_weight = max(1, incidence[left]) / left_available
            right_weight = max(1, incidence[right]) / right_available
            allocation = allocation_for_pair(
                needed,
                left_available,
                right_available,
                left_weight,
                right_weight,
            )
            if allocation is None:
                continue
            left_use, right_use, score = allocation
            choices.append(
                (
                    score,
                    max(
                        left_use / left_available,
                        right_use / right_available,
                    ),
                    left,
                    right,
                    left_use,
                    right_use,
                )
            )
        if not choices:
            raise AssertionError(
                f"no feasible pair for {needed} "
                f"{monomial_text(variables, middle)}"
            )
        (
            score,
            utilization,
            left,
            right,
            left_use,
            right_use,
        ) = min(choices)
        assert 4 * left_use * right_use >= needed * needed
        remaining[left] -= left_use
        remaining[right] -= right_use
        incidence[left] = max(0, incidence[left] - 1)
        incidence[right] = max(0, incidence[right] - 1)
        assert remaining[left] >= 0 and remaining[right] >= 0
        allocations.append(
            (
                needed,
                middle,
                left_use,
                left,
                right_use,
                right,
                utilization,
            )
        )
        print(
            "ALLOC",
            needed,
            monomial_text(variables, middle),
            left_use,
            monomial_text(variables, left),
            right_use,
            monomial_text(variables, right),
            flush=True,
        )

    print(
        f"a_power={args.a_power} scale={args.scale} "
        f"negative_terms={len(negatives)} "
        f"allocations={len(allocations)} PASS"
    )
    for (
        needed,
        middle,
        left_use,
        left,
        right_use,
        right,
        score,
    ) in allocations:
        print(
            f"{left_use}*({monomial_text(variables, left)}) + "
            f"{right_use}*({monomial_text(variables, right)}) "
            f"- {needed}*({monomial_text(variables, middle)}) "
            f">= 0; utilization={score:.6f}"
        )
    used_sources = sum(
        args.scale * coefficients[monomial]
        - remaining.get(monomial, 0)
        for monomial in remaining
    )
    print(
        f"positive_sources={len(remaining)} "
        f"total_allocated_coefficient={used_sources} "
        f"smallest_remainder={min(remaining.values())}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
