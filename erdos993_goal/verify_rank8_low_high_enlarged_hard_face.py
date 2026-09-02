#!/usr/bin/env python3
"""Exact local AM-GM certificate for the rank-eight low/high enlarged face.

The hard face is the maximally exceptional low endpoint

    delta1=0, delta2=2h, d0=d2=0,

with only low d3..d7 and high d0,d1 retained.  This script divides out the
literal positive left A0 factor and searches exact midpoint AM-GM blocks
using only degree-preserving transfers of at most two exponent units.

The independent auditor re-derives the face polynomial and checks every
allocation row without invoking the allocation search.
"""

from __future__ import annotations

from collections import defaultdict
import hashlib
import json
from pathlib import Path

from explore_rank8_low_high_faces import build, stats
from verify_rank6_three_halves_convolution_cones import SCALE, allocation_for_pair


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_enlarged_hard_face_exact_20260820.json"
LIVE = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def weak_compositions(total: int, parts: int, prefix=()):
    if parts == 1:
        yield prefix + (total,)
        return
    for value in range(total + 1):
        yield from weak_compositions(total - value, parts - 1, prefix + (value,))


def local_shifts(parts: int, maximum_transfer: int = 2):
    shifts = set()
    for transfer in range(1, maximum_transfer + 1):
        compositions = list(weak_compositions(transfer, parts))
        for positive in compositions:
            for negative in compositions:
                shift = tuple(p - n for p, n in zip(positive, negative))
                if all(value == 0 for value in shift):
                    continue
                # Canonical orientation avoids checking both d and -d.
                first = next(value for value in shift if value)
                if first < 0:
                    shift = tuple(-value for value in shift)
                shifts.add(shift)
    return sorted(shifts)


def exact_local_amgm(coefficients, maximum_transfer: int = 2):
    remaining = {
        monomial: SCALE * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (SCALE * -coefficient, monomial)
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    shifts = local_shifts(len(next(iter(coefficients))), maximum_transfer)
    pair_map = {}
    incidence = defaultdict(int)
    for needed, middle in negatives:
        pairs = []
        for shift in shifts:
            left = tuple(m - d for m, d in zip(middle, shift))
            right = tuple(m + d for m, d in zip(middle, shift))
            if min(left) < 0 or min(right) < 0:
                continue
            if left not in remaining or right not in remaining:
                continue
            if left > right:
                left, right = right, left
            pairs.append((left, right))
        pairs = sorted(set(pairs))
        if not pairs:
            raise AssertionError(f"no local pair for negative monomial {middle}")
        pair_map[middle] = pairs
        for left, right in pairs:
            incidence[left] += 1
            incidence[right] += 1

    allocations = []
    coverage = {}
    usage = defaultdict(int)
    minimum_slack = None
    ordered = sorted(
        negatives,
        key=lambda item: (len(pair_map[item[1]]), -item[0], item[1]),
    )
    for needed, middle in ordered:
        choices = []
        for left, right in pair_map[middle]:
            result = allocation_for_pair(
                needed,
                remaining[left],
                remaining[right],
                max(1, incidence[left]) / remaining[left] if remaining[left] else float("inf"),
                max(1, incidence[right]) / remaining[right] if remaining[right] else float("inf"),
            )
            if result is None:
                continue
            score, left_use, right_use = result
            choices.append(
                (
                    score,
                    max(left_use / remaining[left], right_use / remaining[right]),
                    left,
                    right,
                    left_use,
                    right_use,
                )
            )
        if not choices:
            raise AssertionError(f"local sources exhausted at {middle}")
        _, _, left, right, left_use, right_use = min(choices)
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        remaining[left] -= left_use
        remaining[right] -= right_use
        assert remaining[left] >= 0 and remaining[right] >= 0
        incidence[left] = max(0, incidence[left] - 1)
        incidence[right] = max(0, incidence[right] - 1)
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        coverage[middle] = needed
        usage[left] += left_use
        usage[right] += right_use
        allocations.append((needed, middle, left_use, left, right_use, right))

    expected = {middle: needed for needed, middle in negatives}
    assert coverage == expected
    smallest_remainder = min(
        SCALE * coefficients[monomial] - used for monomial, used in usage.items()
    )
    assert smallest_remainder >= 0
    return {
        "negative_terms": len(negatives),
        "blocks": len(allocations),
        "maximum_transfer": maximum_transfer,
        "candidate_shift_count": len(shifts),
        "minimum_candidates_per_negative": min(len(pair_map[middle]) for _, middle in negatives),
        "maximum_candidates_per_negative": max(len(pair_map[middle]) for _, middle in negatives),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": smallest_remainder,
        "rows": [
            [needed, list(middle), left_use, list(left), right_use, list(right)]
            for needed, middle, left_use, left, right_use, right in sorted(
                allocations, key=lambda row: row[1]
            )
        ],
    }


def main() -> None:
    margin, context = build(LIVE)
    variables = dict((str(value), value) for value in context.gens())
    left_a0 = 9 * variables["h"] + variables["ta"]
    left_a0 += sum(variables[f"a{index}"] for index in range(3, 8))
    quotient, remainder = divmod(margin, left_a0)
    assert remainder == 0
    coefficients = {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in quotient.terms()
    }
    allocation = exact_local_amgm(coefficients, maximum_transfer=3)
    payload = {
        "schema": "rank8-low-high-enlarged-hard-face-local-amgm-v1",
        "status": "PASS_EXACT_RANK8_LOW_HIGH_ENLARGED_HARD_FACE_LOCAL_AMGM",
        "variables": list(LIVE),
        "face": "r=d0=d2=b3=b4=b5=b6=b7=0; h,ta,d3..d7,tb,b0,b1,b2>=0",
        "positive_factor": "A0=9h+ta+a3+a4+a5+a6+a7",
        "margin": stats(margin),
        "quotient": stats(quotient),
        "allocation": allocation,
        "scope_warning": "Hard face only; the full low/high cone is not yet certified.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("margin", payload["margin"])
    print("quotient", payload["quotient"])
    print(
        "AMGM",
        allocation["blocks"],
        allocation["minimum_quadratic_slack"],
        allocation["smallest_source_remainder"],
    )
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
