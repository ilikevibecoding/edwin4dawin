#!/usr/bin/env python3
"""Exact AM-GM certificate for the 61 negatives outside the low/low hard face."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from itertools import product
from pathlib import Path

from verify_rank6_three_halves_convolution_cones import SCALE, allocation_for_pair
from verify_rank7_low_convolution_sliced import Construction, target_product


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_low_low_slice0_outside_amgm_exact_20260816.json"
OFF_NAMES = ("b3", "b4", "b5", "b6")


def build_margin():
    construction = Construction("low-low")
    q6, q7, q8 = construction.product_coefficients()
    target = (0, 0, 0, 0)
    margin = target_product(q7, q7, target, construction.zero)
    margin -= target_product(q6, q8, target, construction.zero)
    for hkey, hvalue in construction.h().items():
        residual = tuple(t - x for t, x in zip(target, hkey))
        if min(residual) >= 0:
            margin -= hvalue * target_product(q6, q7, residual, construction.zero)
    return margin, construction


def main() -> int:
    margin, construction = build_margin()
    off_positions = tuple(construction.remaining_names.index(name) for name in OFF_NAMES)

    negatives = []
    for monomial, coefficient_raw in margin.terms():
        monomial = tuple(map(int, monomial))
        coefficient = int(coefficient_raw)
        if coefficient < 0 and any(monomial[index] for index in off_positions):
            negatives.append((SCALE * -coefficient, monomial))
    assert len(negatives) == 61

    pair_map: dict[tuple[int, ...], list[tuple[tuple[int, ...], tuple[int, ...]]]] = {}
    source_coefficients: dict[tuple[int, ...], int] = {}
    incidence: defaultdict[tuple[int, ...], int] = defaultdict(int)
    for needed, middle in negatives:
        pairs = set()
        # If middle=(left+right)/2, then each endpoint exponent is between
        # zero and twice the middle exponent.  These outside negatives have
        # sparse support, so enumerating that exact finite box is tiny and
        # finds every possible midpoint pair, not merely coordinate shifts.
        for left_key in product(*(range(2 * value + 1) for value in middle)):
            if sum(left_key) != sum(middle):
                continue
            right_key = tuple(2 * m - l for m, l in zip(middle, left_key))
            if left_key > right_key:
                continue
            # Keep this certificate disjoint from the pre-existing hard-face
            # certificate: both positive endpoints contain an off variable.
            if not any(left_key[index] for index in off_positions):
                continue
            if not any(right_key[index] for index in off_positions):
                continue
            left_coefficient = int(margin[left_key])
            right_coefficient = int(margin[right_key])
            if left_coefficient <= 0 or right_coefficient <= 0:
                continue
            pairs.add((left_key, right_key))
            source_coefficients[left_key] = left_coefficient
            source_coefficients[right_key] = right_coefficient
        assert pairs, (needed, middle)
        pair_map[middle] = sorted(pairs)
        for left, right in pairs:
            incidence[left] += 1
            incidence[right] += 1

    remaining = {
        monomial: SCALE * coefficient
        for monomial, coefficient in source_coefficients.items()
    }
    allocations = []
    minimum_slack = None
    ordered = sorted(negatives, key=lambda item: (len(pair_map[item[1]]), -item[0], item[1]))
    for needed, middle in ordered:
        choices = []
        for left, right in pair_map[middle]:
            left_available = remaining[left]
            right_available = remaining[right]
            result = allocation_for_pair(
                needed,
                left_available,
                right_available,
                max(1, incidence[left]) / left_available if left_available else float("inf"),
                max(1, incidence[right]) / right_available if right_available else float("inf"),
            )
            if result is None:
                continue
            score, left_use, right_use = result
            choices.append((score, max(left_use / left_available, right_use / right_available), left, right, left_use, right_use))
        assert choices, (needed, middle, len(pair_map[middle]))
        _, _, left, right, left_use, right_use = min(choices)
        assert tuple(l + r for l, r in zip(left, right)) == tuple(2 * m for m in middle)
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        remaining[left] -= left_use
        remaining[right] -= right_use
        assert remaining[left] >= 0 and remaining[right] >= 0
        incidence[left] = max(0, incidence[left] - 1)
        incidence[right] = max(0, incidence[right] - 1)
        allocations.append((needed, middle, left_use, left, right_use, right))

    used_sources = {monomial for _, _, _, left, _, right in allocations for monomial in (left, right)}
    smallest_remainder = min(remaining[monomial] for monomial in used_sources)
    assert smallest_remainder >= 0
    result = {
        "status": "PASS_EXACT_RANK7_LOW_LOW_SLICE0_OUTSIDE_HARD_FACE_AMGM",
        "scale": SCALE,
        "variables": list(construction.remaining_names),
        "negative_terms": len(negatives),
        "blocks": len(allocations),
        "minimum_candidate_pairs": min(len(pair_map[middle]) for _, middle in negatives),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": smallest_remainder,
        "sources_disjoint_from_hard_face": True,
        "rows": [
            [needed, list(middle), left_use, list(left), right_use, list(right)]
            for needed, middle, left_use, left, right_use, right in sorted(allocations, key=lambda row: row[1])
        ],
    }
    assert result["negative_terms"] == result["blocks"] == 61
    REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print("AM-GM", result["blocks"], result["minimum_quadratic_slack"], result["smallest_source_remainder"])
    print("minimum_candidate_pairs", result["minimum_candidate_pairs"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
