#!/usr/bin/env python3
"""Independent exact replay of the shared-capacity a3/prefix AM-GM proof."""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank8_low_high_strong_a3_prefix_amgm.py"
INPUT = ROOT / "rank8_low_high_strong_a3_prefix_amgm_exact_20260820.json"
OUTPUT = ROOT / "rank8_low_high_strong_a3_prefix_amgm_independent_audit_20260820.json"
PRODUCER_SHA = "E66F84CD45F917D60558660F543D05E9408E75A8AE223FE2FFEA2C67ED1F71DC"
INPUT_SHA = "924EFF3C3E1C9CC55F94AE183375B92B39560018595252FFBAA85E2EF46B5A5E"
NAMES = ("h", "ta", "a3", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build():
    ctx = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    var = dict(zip(NAMES, ctx.gens()))
    zero, one, h = ctx.constant(0), ctx.constant(1), var["h"]

    def factor(terminal, gaps):
        ratios = [None] * 9
        ratios[8] = terminal
        for index in range(7, -1, -1):
            ratios[index] = ratios[index + 1] + gaps[index]
        row = [one]
        for ratio in ratios:
            row.append(row[-1] * ratio)
        return ratios, row

    def convolve(left, right, rank):
        return sum((math.comb(rank, index) * left[index] * right[rank - index]
                    for index in range(rank + 1)), zero)

    ratios, left = factor(var["ta"], [2 * h, h, h, h + var["a3"], h, h, h, h])
    _, right = factor(var["tb"], [2 * h + var["b0"], h + var["b1"],
                                  h + var["b2"], h, h, h, h, h])
    tail = [zero] * 3 + left[3:]
    c = {rank: convolve(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolve(tail, right, rank) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
                  - h * (v[7] * c[8] + c[7] * v[8]))
    return ratios[2] * margin + h * derivative


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    require(sha256(PRODUCER) == PRODUCER_SHA, "producer hash changed")
    require(sha256(INPUT) == INPUT_SHA, "report hash changed")
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    require(report["status"] == "PASS_EXACT_STRONG_AUXILIARY_A3_PREFIX_AMGM",
            "producer is not PASS")
    require(tuple(report["variables"]) == NAMES, "variable order changed")
    require(report["source_sha256"] == PRODUCER_SHA, "source self-pin changed")
    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    negative = {key: -value for key, value in terms.items() if value < 0}
    require(len(terms) == report["terms"] == 28_404, "term count changed")
    require(len(negative) == report["negative_terms"] == 810, "negative count changed")
    rows = {tuple(row["negative_monomial"]): row for row in report["allocations"]}
    require(set(rows) == set(negative), "negative support has a gap")
    require(len(rows) == len(report["allocations"]) == 810, "duplicate allocation")

    consumed = defaultdict(int)
    minimum_slack = None
    for target, demand in negative.items():
        row = rows[target]
        require(row["demand"] == demand, "demand changed")
        low = tuple(row["source_low"]["monomial"])
        high = tuple(row["source_high"]["monomial"])
        low_used = row["source_low"]["allocated"]
        high_used = row["source_high"]["allocated"]
        require(tuple(low[i] + high[i] for i in range(len(NAMES))) ==
                tuple(2 * target[i] for i in range(len(NAMES))), "midpoint failed")
        require(row["source_low"]["capacity"] == terms[low] > 0,
                "low source capacity changed")
        require(row["source_high"]["capacity"] == terms[high] > 0,
                "high source capacity changed")
        require(low_used > 0 and high_used > 0, "nonpositive allocation")
        four_product = 4 * low_used * high_used
        demand_squared = demand * demand
        require(row["four_allocated_product"] == four_product and
                row["demand_squared"] == demand_squared and
                four_product >= demand_squared, "exact AM-GM allocation failed")
        consumed[low] += low_used
        consumed[high] += high_used
        slack = four_product - demand_squared
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
    require(len(consumed) == report["used_positive_sources"] == 1112,
            "used source count changed")
    require(all(consumed[key] <= terms[key] for key in consumed),
            "aggregate source allocation exceeds capacity")

    payload = {
        "schema": "rank8-low-high-strong-a3-prefix-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_STRONG_AUXILIARY_A3_PREFIX_AMGM",
        "producer_sha256": PRODUCER_SHA,
        "input_sha256": INPUT_SHA,
        "audit_source_sha256": sha256(Path(__file__)),
        "independent_reconstruction": {
            "terms": len(terms),
            "negative_terms": len(negative),
            "midpoint_capacity_checks": len(rows),
            "aggregate_source_capacity_checks": len(consumed),
            "minimum_amgm_slack": minimum_slack,
        },
        "scope_warning": (
            "This audits only h,ta,a3,tb,b0,b1,b2 with a0,a2,a4..a7,b3..b7 "
            "zero. It is not the full strong auxiliary, low/high cone, low/low "
            "cone, Q8, PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["audit_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        raise SystemExit(f"FAIL_CLOSED: {exc}")
