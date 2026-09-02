#!/usr/bin/env python3
"""Independent audit of the rank-eight low/high enlarged-face AM-GM proof."""

from __future__ import annotations

from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "verify_rank8_low_high_enlarged_hard_face.py"
PRIMARY_REPORT = ROOT / "rank8_low_high_enlarged_hard_face_exact_20260820.json"
AUDIT_REPORT = ROOT / "rank8_low_high_enlarged_hard_face_independent_audit_exact_20260820.json"
SCALE = 1_000_000
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratio_coefficients(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def reconstruct():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    values = list(context.gens())
    variables = {NAMES[index]: values[index] for index in range(len(NAMES))}
    zero = context.constant(0)
    one = context.constant(1)
    h = variables["h"]
    left_gaps = [2 * h, zero, 2 * h]
    left_gaps.extend(h + variables[f"a{index}"] for index in range(3, 8))
    right_gaps = [2 * h + variables["b0"], h + variables["b1"], h + variables["b2"]]
    right_gaps.extend(h for _ in range(3, 8))
    left = ratio_coefficients(variables["ta"], left_gaps, one)
    right = ratio_coefficients(variables["tb"], right_gaps, one)
    coefficients = []
    for rank in range(10):
        coefficients.append(
            sum(
                (
                    math.comb(rank, index) * left[index] * right[rank - index]
                    for index in range(rank + 1)
                ),
                zero,
            )
        )
    margin = (
        coefficients[8] ** 2
        - coefficients[7] * coefficients[9]
        - h * coefficients[7] * coefficients[8]
    )
    left_a0 = 9 * h + variables["ta"]
    left_a0 += sum(variables[f"a{index}"] for index in range(3, 8))
    quotient, remainder = divmod(margin, left_a0)
    assert remainder == 0
    return margin, quotient


def statistics(polynomial):
    terms = negative = 0
    minimum = maximum = None
    for _, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
    return {
        "terms": terms,
        "negative": negative,
        "zero": 0,
        "minimum": minimum,
        "maximum": maximum,
    }


def audit_allocation(quotient, report):
    coefficients = {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in quotient.terms()
    }
    negative = {monomial: -value * SCALE for monomial, value in coefficients.items() if value < 0}
    rows = report["allocation"]["rows"]
    assert len(rows) == len(negative) == report["allocation"]["negative_terms"]
    coverage = {}
    usage = defaultdict(int)
    minimum_slack = None
    for needed_raw, middle_raw, left_use_raw, left_raw, right_use_raw, right_raw in rows:
        needed = int(needed_raw)
        middle = tuple(int(value) for value in middle_raw)
        left_use = int(left_use_raw)
        right_use = int(right_use_raw)
        left = tuple(int(value) for value in left_raw)
        right = tuple(int(value) for value in right_raw)
        assert middle not in coverage
        assert negative[middle] == needed
        assert tuple(l + r for l, r in zip(left, right)) == tuple(2 * value for value in middle)
        assert coefficients[left] > 0 and coefficients[right] > 0
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        usage[left] += left_use
        usage[right] += right_use
        coverage[middle] = needed
    assert coverage == negative
    source_remainders = {
        monomial: SCALE * coefficients[monomial] - used
        for monomial, used in usage.items()
    }
    assert min(source_remainders.values()) >= 0
    return {
        "negative_terms_replayed": len(negative),
        "allocation_rows_replayed": len(rows),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": min(source_remainders.values()),
        "all_midpoints_exact": True,
        "all_negative_demands_covered_once": True,
        "no_positive_source_overdraw": True,
    }


def main() -> None:
    report = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_LOW_HIGH_ENLARGED_HARD_FACE_LOCAL_AMGM"
    assert report["variables"] == list(NAMES)
    assert report["source_sha256"] == sha256(PRIMARY)
    margin, quotient = reconstruct()
    margin_stats = statistics(margin)
    quotient_stats = statistics(quotient)
    assert margin_stats == report["margin"]
    assert quotient_stats == report["quotient"]
    allocation = audit_allocation(quotient, report)
    assert allocation["minimum_quadratic_slack"] == report["allocation"]["minimum_quadratic_slack"]
    assert allocation["smallest_source_remainder"] == report["allocation"]["smallest_source_remainder"]
    payload = {
        "schema": "rank8-low-high-enlarged-hard-face-independent-audit-v1",
        "status": "PASS_INDEPENDENT_RANK8_LOW_HIGH_ENLARGED_HARD_FACE_AMGM_AUDIT",
        "primary_source_sha256": sha256(PRIMARY),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "independent_reconstruction": {
            "margin": margin_stats,
            "quotient": quotient_stats,
            "positive_factor": "A0=9h+ta+a3+a4+a5+a6+a7",
        },
        "allocation_replay": allocation,
        "scope_warning": "This audits only the enlarged hard face, not the full low/high cone.",
        "audit_source_sha256": sha256(Path(__file__)),
    }
    AUDIT_REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", sha256(AUDIT_REPORT))


if __name__ == "__main__":
    main()
