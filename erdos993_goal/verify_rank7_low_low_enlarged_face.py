#!/usr/bin/env python3
"""Exact AM-GM certificate for the enlarged rank-seven low/low face.

The face is a=a2=b2=0.  It retains a0 and b3,b4,b5,b6 in addition to the
old hard-face variables.  We dehomogenise at b=1 only for injective storage,
then certify every a0-exponent slice independently.
"""

from __future__ import annotations

import gc
import hashlib
import json
import threading
import time
from collections import defaultdict
from itertools import product
from pathlib import Path

from verify_rank6_three_halves_convolution_cones import SCALE, allocation_for_pair
from verify_rank7_low_convolution_sliced import (
    Construction,
    TOTAL_DEGREE,
    private_bytes,
    target_product,
)


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_low_low_enlarged_face_exact_20260816.json"
CHECKPOINT = ROOT / "rank7_low_low_enlarged_face_checkpoint_20260816.json"
HARD_REPORT = ROOT / "rank7_three_halves_hard_faces_exact_20260813.json"
GIB = 1024**3
OFF_INTERNAL = ("b3", "b4", "b5", "b6")


def margin_slice(construction: Construction, q6, q7, q8, h, target):
    margin = target_product(q7, q7, target, construction.zero)
    margin -= target_product(q6, q8, target, construction.zero)
    for hkey, hvalue in h.items():
        residual = tuple(t - x for t, x in zip(target, hkey))
        if min(residual) >= 0:
            margin -= hvalue * target_product(q6, q7, residual, construction.zero)
    return margin


def certify_slice(margin, construction: Construction, a0_exponent: int) -> tuple[dict, list]:
    remaining_degree = TOTAL_DEGREE - a0_exponent
    off_positions = tuple(construction.remaining_names.index(name) for name in OFF_INTERNAL)
    term_count = negative_count = 0
    minimum = maximum = None
    negatives = []
    for monomial_raw, coefficient_raw in margin.terms():
        monomial = tuple(map(int, monomial_raw))
        coefficient = int(coefficient_raw)
        term_count += 1
        negative_count += coefficient < 0
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        maximum = coefficient if maximum is None else max(maximum, coefficient)
        if coefficient >= 0:
            continue
        # At a0=0 the 594 old hard-face negatives are certified by the
        # pre-existing exact theorem.  Only the 61 genuinely new negatives
        # are allocated here.  For a0>0 every term is off the old face.
        if a0_exponent == 0 and not any(monomial[index] for index in off_positions):
            continue
        b_exponent = remaining_degree - sum(monomial)
        assert b_exponent >= 0
        negatives.append((SCALE * -coefficient, (b_exponent,) + monomial))

    pair_map = {}
    source_coefficients = {}
    incidence = defaultdict(int)
    for needed, middle in negatives:
        pairs = set()
        for left_full in product(*(range(2 * value + 1) for value in middle)):
            if sum(left_full) != remaining_degree:
                continue
            right_full = tuple(2 * m - l for m, l in zip(middle, left_full))
            if left_full > right_full:
                continue
            left = left_full[1:]
            right = right_full[1:]
            if a0_exponent == 0:
                # Disjointness from the hard certificate is enforced at both
                # endpoints, including after restoring the omitted b exponent.
                if not any(left[index] for index in off_positions):
                    continue
                if not any(right[index] for index in off_positions):
                    continue
            left_coefficient = int(margin[left])
            right_coefficient = int(margin[right])
            if left_coefficient <= 0 or right_coefficient <= 0:
                continue
            pair = (left_full, right_full)
            pairs.add(pair)
            source_coefficients[left_full] = left_coefficient
            source_coefficients[right_full] = right_coefficient
        assert pairs, (a0_exponent, needed, middle)
        pair_map[middle] = sorted(pairs)
        for left, right in pairs:
            incidence[left] += 1
            incidence[right] += 1

    remaining = {monomial: SCALE * coefficient for monomial, coefficient in source_coefficients.items()}
    allocations = []
    minimum_slack = None
    ordered = sorted(negatives, key=lambda item: (len(pair_map[item[1]]), -item[0], item[1]))
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
            choices.append((score, max(left_use / remaining[left], right_use / remaining[right]), left, right, left_use, right_use))
        assert choices, (a0_exponent, needed, middle, len(pair_map[middle]))
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

    used = {monomial for _, _, _, left, _, right in allocations for monomial in (left, right)}
    smallest_remainder = min((remaining[monomial] for monomial in used), default=None)
    stats = {
        "a0_exponent": a0_exponent,
        "terms": term_count,
        "negative": negative_count,
        "new_negative_certified_here": len(negatives),
        "minimum": minimum,
        "maximum": maximum,
        "minimum_candidate_pairs": min((len(pair_map[middle]) for _, middle in negatives), default=None),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": smallest_remainder,
    }
    rows = [
        [needed, list(middle), left_use, list(left), right_use, list(right)]
        for needed, middle, left_use, left, right_use, right in sorted(allocations, key=lambda row: row[1])
    ]
    return stats, rows


def main() -> int:
    started = time.time()
    peak = private_bytes()
    stop = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop.wait(0.1):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        construction = Construction("low-low")
        q6, q7, q8 = construction.product_coefficients()
        h = construction.h()
        hard = json.loads(HARD_REPORT.read_text(encoding="utf-8"))["low_low"]
        assert hard["hard"]["negative"] == 594
        assert hard["amgm"]["negative_terms"] == hard["amgm"]["blocks"] == 230

        slices = []
        allocation_rows = {}
        for exponent in range(TOTAL_DEGREE + 1):
            target = (0, exponent, 0, 0)
            margin = margin_slice(construction, q6, q7, q8, h, target)
            stats, rows = certify_slice(margin, construction, exponent)
            slices.append(stats)
            allocation_rows[str(exponent)] = rows
            del margin
            gc.collect()
            checkpoint = {
                "status": "IN_PROGRESS_EXACT_RANK7_LOW_LOW_ENLARGED_FACE",
                "completed_a0_exponent": exponent,
                "slices": slices,
                "allocation_rows": allocation_rows,
                "peak_private_GiB": peak / GIB,
                "elapsed_seconds": time.time() - started,
            }
            CHECKPOINT.write_text(json.dumps(checkpoint, indent=2) + "\n", encoding="utf-8")
            print(
                f"a0^{exponent}: terms={stats['terms']} neg={stats['negative']} "
                f"new={stats['new_negative_certified_here']} private_GiB={private_bytes()/GIB:.3f}",
                flush=True,
            )

        assert slices[0]["negative"] == 655
        assert slices[0]["new_negative_certified_here"] == 61
        assert sum(row["new_negative_certified_here"] for row in slices) == sum(len(rows) for rows in allocation_rows.values())
        total_new = sum(row["new_negative_certified_here"] for row in slices)
        result = {
            "status": "PASS_EXACT_RANK7_LOW_LOW_ENLARGED_FACE",
            "face_definition": "a=a2=b2=0",
            "dehomogenised_variable": "b",
            "injectivity_reason": "homogeneity recovers b exponent from total degree 14",
            "variables": ["b"] + list(construction.remaining_names),
            "slices": slices,
            "raw_statistics": {
                "terms": sum(row["terms"] for row in slices),
                "negative": sum(row["negative"] for row in slices),
                "minimum": min(row["minimum"] for row in slices if row["minimum"] is not None),
                "maximum": max(row["maximum"] for row in slices if row["maximum"] is not None),
            },
            "old_hard_face_certificate": {
                "raw_negative": 594,
                "quotient_amgm_blocks": hard["amgm"]["blocks"],
                "report_sha256": hashlib.sha256(HARD_REPORT.read_bytes()).hexdigest().upper(),
            },
            "new_amgm": {
                "negative_terms": total_new,
                "blocks": total_new,
                "sources_disjoint_from_old_hard_certificate": True,
                "rows_by_a0_exponent": allocation_rows,
            },
            "memory_bound": {
                "required_cap_GiB": 12,
                "observed_peak_less_than_GiB": 5,
            },
            "conclusion": "the complete enlarged face is nonnegative",
        }
        assert peak / GIB < result["memory_bound"]["observed_peak_less_than_GiB"]
        REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(result["status"])
        print("raw", result["raw_statistics"])
        print("new AM-GM blocks", total_new)
        print("peak_private_GiB", f"{peak/GIB:.3f}")
        print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
        print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
        return 0
    finally:
        stop.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
