#!/usr/bin/env python3
"""Exact shared-capacity AM-GM proof on the a3/early-prefix direct-H face."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_a3_prefix_amgm_exact_20260820.json"
NAMES = ("h", "ta", "a3", "tb", "b0", "b1", "b2")
INPUTS = {
    "verify_rank8_low_high_strong_terminal_prefix_amgm.py":
        "E18BF68BF78F4D2F8D69049EE539BA8D9AEC23D06390F7C3C3E4D9DF2B2AB68F",
    "rank8_low_high_strong_terminal_prefix_amgm_exact_20260820.json":
        "EA6C6EC7B6E894A0A86565D355A0D51670EA370C12030767189359F374A61421",
    "audit_rank8_low_high_strong_terminal_prefix_amgm.py":
        "92257D37DA0978F845A07251632CCA13362A17212766075B38D866C5BB73A36C",
    "rank8_low_high_strong_terminal_prefix_amgm_independent_audit_20260820.json":
        "14D48CF84E41E042902D5304BEAA1EC86FB492246CF24AA892B8B159BAB3666A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    return sum((math.comb(rank, index) * left[index] * right[rank - index]
                for index in range(rank + 1)), zero)


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_ratios, left = factor(variables["ta"], [
        2 * h, h, h, h + variables["a3"], h, h, h, h,
    ], one)
    _, right = factor(variables["tb"], [
        2 * h + variables["b0"],
        h + variables["b1"],
        h + variables["b2"],
        h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return left_ratios[2] * margin + h * derivative


def ceil_div(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def exact_allocation(demand: int, low_remaining: int, high_remaining: int):
    """Choose small integer source portions; final inequality is exact."""
    if low_remaining <= 0 or high_remaining <= 0:
        return None
    seed = max(1, int(demand * math.sqrt(low_remaining / high_remaining) / 2))
    low_candidates = {1, low_remaining,
                      max(1, ceil_div(demand * demand, 4 * high_remaining))}
    for offset in range(-4, 6):
        if 1 <= seed + offset <= low_remaining:
            low_candidates.add(seed + offset)
    best = None
    for low_used in low_candidates:
        high_used = ceil_div(demand * demand, 4 * low_used)
        if high_used > high_remaining:
            continue
        score = max(low_used / low_remaining, high_used / high_remaining)
        score += 1e-6 * (low_used / low_remaining + high_used / high_remaining)
        row = (score, low_used, high_used)
        if best is None or row < best:
            best = row
    return best


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual_inputs == INPUTS
    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 28_404 and len(negative) == 810

    positive_keys = tuple(positive)
    candidates = {}
    for target, demand in negative.items():
        rows = []
        for low in positive_keys:
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high:
                continue
            high_capacity = positive.get(high)
            if high_capacity is not None and 4 * positive[low] * high_capacity >= demand * demand:
                rows.append((low, high))
        candidates[target] = tuple(rows)
    assert all(candidates.values())
    assert sum(map(len, candidates.values())) == 37_302

    rng = random.Random(33)
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
            "source_low": {
                "monomial": list(low),
                "capacity": positive[low],
                "allocated": low_used,
            },
            "source_high": {
                "monomial": list(high),
                "capacity": positive[high],
                "allocated": high_used,
            },
            "four_allocated_product": 4 * low_used * high_used,
            "demand_squared": demand * demand,
        })
    assert len(allocations) == len(negative)
    consumed = {key: positive[key] - remaining[key] for key in positive if remaining[key] != positive[key]}
    assert len(consumed) == 1112
    assert all(0 < consumed[key] <= positive[key] for key in consumed)

    payload = {
        "schema": "rank8-low-high-strong-a3-prefix-amgm-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_A3_PREFIX_AMGM",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,a3,tb,b0,b1,b2>=0 "
            "when a0=a2=a4=...=a7=b3=...=b7=0."
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
            "This is a direct-H face theorem only. It leaves a0,a2,a4..a7 "
            "and b3..b7 zero, so it does not prove the full low/high cone, "
            "low/low cone, Q8, PGC, or Problem 993."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "SOURCES", len(consumed))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
