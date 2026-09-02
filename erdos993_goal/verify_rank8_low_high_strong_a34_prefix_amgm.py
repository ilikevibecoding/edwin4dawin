#!/usr/bin/env python3
"""Exact shared-capacity AM-GM proof on the a3,a4/early-prefix H_str face."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import random
from pathlib import Path

from flint import fmpz_mpoly_ctx

from verify_rank8_low_high_strong_a3_prefix_amgm import (
    exact_allocation,
    factor,
    convolution,
)


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json"
NAMES = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")
INPUTS = {
    "verify_rank8_low_high_strong_a3_prefix_amgm.py":
        "E66F84CD45F917D60558660F543D05E9408E75A8AE223FE2FFEA2C67ED1F71DC",
    "rank8_low_high_strong_a3_prefix_amgm_exact_20260820.json":
        "924EFF3C3E1C9CC55F94AE183375B92B39560018595252FFBAA85E2EF46B5A5E",
    "audit_rank8_low_high_strong_a3_prefix_amgm.py":
        "433C180E611BF6775C4A2DA89FD3E34D3962CFCFA03717F7FF6489D3669166EF",
    "rank8_low_high_strong_a3_prefix_amgm_independent_audit_20260820.json":
        "C978FD414065B1383A10D58AE912F46683C8F53F477BEE56C8191F208D744D32",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), variables["h"]
    left_ratios, left = factor(variables["ta"], [
        2 * h, h, h, h + variables["a3"], h + variables["a4"], h, h, h,
    ], one)
    _, right = factor(variables["tb"], [
        2 * h + variables["b0"], h + variables["b1"],
        h + variables["b2"], h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
                  - h * (v[7] * c[8] + c[7] * v[8]))
    return left_ratios[2] * margin + h * derivative


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual_inputs == INPUTS
    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 125_842 and len(negative) == 1_950

    candidates = {}
    for target, demand in negative.items():
        rows = []
        for low in itertools.product(*(range(2 * exponent + 1) for exponent in target)):
            high = tuple(2 * target[index] - low[index] for index in range(len(NAMES)))
            if low >= high:
                continue
            low_capacity, high_capacity = positive.get(low), positive.get(high)
            if (low_capacity is not None and high_capacity is not None
                    and 4 * low_capacity * high_capacity >= demand * demand):
                rows.append((low, high))
        candidates[target] = tuple(rows)
    assert all(candidates.values())
    assert sum(map(len, candidates.values())) == 111_222

    rng = random.Random(44)
    tie = {target: rng.random() for target in negative}
    order = sorted(negative, key=lambda target: (len(candidates[target]), tie[target]))
    remaining = dict(positive)
    allocations = []
    for target in order:
        demand = negative[target]
        choices = []
        for low, high in candidates[target]:
            allocation = exact_allocation(demand, remaining[low], remaining[high])
            if allocation is not None:
                score, low_used, high_used = allocation
                choices.append((score, rng.random(), low, high, low_used, high_used))
        assert choices
        _, _, low, high, low_used, high_used = min(choices)
        assert 4 * low_used * high_used >= demand * demand
        remaining[low] -= low_used
        remaining[high] -= high_used
        assert remaining[low] >= 0 and remaining[high] >= 0
        allocations.append({
            "negative_monomial": list(target),
            "demand": demand,
            "source_low": {"monomial": list(low), "capacity": positive[low],
                           "allocated": low_used},
            "source_high": {"monomial": list(high), "capacity": positive[high],
                            "allocated": high_used},
            "four_allocated_product": 4 * low_used * high_used,
            "demand_squared": demand * demand,
        })
    consumed = {key: positive[key] - remaining[key]
                for key in positive if remaining[key] != positive[key]}
    assert len(allocations) == len(negative) and consumed
    assert all(0 < consumed[key] <= positive[key] for key in consumed)

    payload = {
        "schema": "rank8-low-high-strong-a34-prefix-amgm-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_A34_PREFIX_AMGM",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,a3,a4,tb,b0,b1,b2>=0 "
            "when a0=a2=a5=a6=a7=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "terms": len(terms),
        "negative_terms": len(negative),
        "candidate_midpoint_pairs": sum(map(len, candidates.values())),
        "allocated_negative_rows": len(allocations),
        "used_positive_sources": len(consumed),
        "minimum_remaining_source_capacity": min(remaining.values()),
        "allocations": allocations,
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a direct-H face theorem only. It leaves a0,a2,a5..a7 "
            "and b3..b7 zero; no full low/high cone, low/low cone, Q8, PGC, "
            "or Problem 993 claim."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "SOURCES", len(consumed))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
