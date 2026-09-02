#!/usr/bin/env python3
"""Independent replay audit for the scoped joint base-margin AM-GM proof."""

from __future__ import annotations

from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from verify_rank6_three_halves_convolution_cones import SCALE


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "probe_rank8_low_high_base_margin_joint_amgm.py"
INPUT = ROOT / "rank8_low_high_base_margin_joint_amgm_probe_20260820.json"
OUTPUT = ROOT / "rank8_low_high_base_margin_joint_amgm_independent_audit_20260820.json"
NAMES = ("h", "ta", "a3", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cumulative_coefficients(terminal, gaps, one):
    ratios = [None] * 9
    running = terminal
    for index in range(8, -1, -1):
        ratios[index] = running
        if index:
            running += gaps[index - 1]
    values = [one]
    for ratio in ratios:
        values.append(values[-1] * ratio)
    return values


def convolve(left, right, rank, zero):
    answer = zero
    for index in range(rank + 1):
        answer += math.comb(rank, index) * left[index] * right[rank - index]
    return answer


def rebuild():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    h, ta, a3, tb, b0, b1, b2 = context.gens()
    one = context.constant(1)
    zero = context.constant(0)
    # Only a3 is live among the left tail slacks; all omitted slacks are zero.
    left_gaps = [2 * h, h, h, h + a3, h, h, h, h]
    right_gaps = [2 * h + b0, h + b1, h + b2, h, h, h, h, h]
    left = cumulative_coefficients(ta, left_gaps, one)
    right = cumulative_coefficients(tb, right_gaps, one)
    c7 = convolve(left, right, 7, zero)
    c8 = convolve(left, right, 8, zero)
    c9 = convolve(left, right, 9, zero)
    margin = c8 * c8 - c7 * c9 - h * c7 * c8
    payment = h * left[1] * left[2] * (
        196 * right[6] * right[6] - 168 * right[5] * right[7]
    )
    polynomial = margin - payment
    return {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }


def stats(coefficients):
    values = list(coefficients.values())
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "positive": sum(value > 0 for value in values),
        "minimum": min(values),
        "maximum": max(values),
    }


def main() -> int:
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    assert payload["status"] == "PASS_EXACT_SCOPED_RANK8_LOW_HIGH_BASE_MARGIN_JOINT_AMGM"
    assert tuple(payload["variables"]) == NAMES
    assert payload["source_sha256"] == sha256(PRODUCER)

    coefficients = rebuild()
    rebuilt_stats = stats(coefficients)
    assert rebuilt_stats == payload["statistics"]

    negative_need = {
        monomial: SCALE * -coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    }
    usage = defaultdict(int)
    covered = {}
    minimum_slack = None
    rows = payload["allocation"]["rows"]
    for row in rows:
        needed, middle, left_use, left, right_use, right = row
        middle = tuple(middle)
        left = tuple(left)
        right = tuple(right)
        assert middle not in covered
        assert negative_need[middle] == needed
        assert coefficients[left] > 0 and coefficients[right] > 0
        assert tuple(l + r for l, r in zip(left, right)) == tuple(2 * m for m in middle)
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        usage[left] += left_use
        usage[right] += right_use
        covered[middle] = needed

    assert covered == negative_need
    assert len(rows) == len(negative_need) == 256
    source_remainders = {
        monomial: SCALE * coefficients[monomial] - amount
        for monomial, amount in usage.items()
    }
    assert min(source_remainders.values()) >= 0
    assert minimum_slack == payload["allocation"]["minimum_quadratic_slack"]
    assert min(source_remainders.values()) == payload["allocation"]["smallest_source_remainder"]

    audit = {
        "schema": "rank8-low-high-base-margin-joint-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_SCOPED_RANK8_LOW_HIGH_BASE_MARGIN_JOINT_AMGM",
        "input_sha256": sha256(INPUT),
        "producer_sha256": sha256(PRODUCER),
        "audit_source_sha256": sha256(Path(__file__)),
        "variables": list(NAMES),
        "statistics": rebuilt_stats,
        "allocation_rows": len(rows),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": min(source_remainders.values()),
        "scope_warning": (
            "Independent proof of the seven-variable joint face only; the full "
            "low/high cone still requires a uniform cumulative-slack lift."
        ),
    }
    OUTPUT.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(audit["status"])
    print("ROWS", len(rows), "MIN_SLACK", minimum_slack)
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
