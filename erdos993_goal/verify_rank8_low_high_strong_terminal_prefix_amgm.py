#!/usr/bin/env python3
"""Exact disjoint AM-GM proof on the terminal/early-prefix direct-H face.

Face:
  a0=a2=a3=...=a7=b3=...=b7=0,
  h,ta,tb,b0,b1,b2 >= 0.

This is a bounded complementary face theorem, not the full low/high cone.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_terminal_prefix_amgm_exact_20260820.json"
NAMES = ("h", "ta", "tb", "b0", "b1", "b2")
ZERO_INPUTS = {
    "verify_rank8_low_high_strong_zero_slack_amgm.py":
        "4019956D18632024F0E35B25BAE84DDE48CAD24576F7EE81AFFE101874C3D288",
    "rank8_low_high_strong_zero_slack_amgm_exact_20260820.json":
        "830CB8FF350A59447D14AA1176C9EE22A613ABF57CD091579BBD7A8EA1CFFAE6",
    "audit_rank8_low_high_strong_zero_slack_amgm.py":
        "96E4D898103571C0D8AD34571E78C9BB4BBB5D129040BD32F0B963A5207CA28A",
    "rank8_low_high_strong_zero_slack_amgm_independent_audit_20260820.json":
        "6D6E4A67B3B972B736910C4D5CD6E65C5F229601E0B775F976DECB409CB61FF6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal, gaps):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    row = [sp.Integer(1)]
    for ratio in ratios:
        row.append(sp.expand(row[-1] * ratio))
    return ratios, row


def convolution(left, right, rank):
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def build_terms():
    h, ta, tb, b0, b1, b2 = sp.symbols("h ta tb b0 b1 b2", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h + b0, h + b1, h + b2] + [h] * 5)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank) for rank in (7, 8, 9)}
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    strong = sp.Poly(sp.expand(left_ratios[2] * margin + h * derivative),
                     h, ta, tb, b0, b1, b2)
    return {tuple(map(int, monomial)): int(coefficient)
            for monomial, coefficient in strong.terms()}


def candidates(positive, negative):
    positive_keys = tuple(positive)
    out = {}
    for target, demand in negative.items():
        rows = []
        for low in positive_keys:
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high:
                continue
            high_capacity = positive.get(high)
            if high_capacity is None:
                continue
            four_product = 4 * positive[low] * high_capacity
            if four_product >= demand * demand:
                rows.append((low, high, four_product - demand * demand))
        out[target] = tuple(sorted(rows, key=lambda row: (row[2], row[0], row[1])))
    return out


def disjoint_matching(candidate_rows):
    """Deterministic seeded restarts; the returned rows are then checked exactly."""
    targets = tuple(candidate_rows)
    rng = random.Random(8_993_820)
    for attempt in range(20_000):
        # Constrained targets remain first; random tie breaks and source choices
        # avoid the single collision of the canonical greedy ordering.
        tie = {target: rng.random() for target in targets}
        order = sorted(targets, key=lambda target: (len(candidate_rows[target]), tie[target]))
        used = set()
        selected = {}
        success = True
        for target in order:
            available = [row for row in candidate_rows[target]
                         if row[0] not in used and row[1] not in used]
            if not available:
                success = False
                break
            # Prefer low-slack certificates most of the time, but explore all.
            window = min(len(available), 1 + attempt % 11)
            row = available[rng.randrange(window)]
            selected[target] = row
            used.update(row[:2])
        if success:
            return attempt, selected
    raise AssertionError("no disjoint matching found in deterministic bounded search")


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in ZERO_INPUTS}
    assert actual_inputs == ZERO_INPUTS
    terms = build_terms()
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 5227 and len(negative) == 279
    candidate_rows = candidates(positive, negative)
    assert set(candidate_rows) == set(negative)
    assert all(candidate_rows.values())
    attempt, selected = disjoint_matching(candidate_rows)

    used = set()
    allocations = []
    for target in sorted(negative):
        low, high, slack = selected[target]
        assert low not in used and high not in used and low != high
        used.update((low, high))
        assert tuple(low[i] + high[i] for i in range(len(NAMES))) == tuple(
            2 * target[i] for i in range(len(NAMES))
        )
        four_product = 4 * positive[low] * positive[high]
        demand_squared = negative[target] ** 2
        assert four_product - demand_squared == slack >= 0
        allocations.append({
            "negative_monomial": list(target),
            "demand": negative[target],
            "source_low": {"monomial": list(low), "capacity": positive[low]},
            "source_high": {"monomial": list(high), "capacity": positive[high]},
            "four_product": four_product,
            "demand_squared": demand_squared,
        })
    assert len(used) == 2 * len(negative) == 558

    payload = {
        "schema": "rank8-low-high-strong-terminal-prefix-amgm-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_TERMINAL_PREFIX_AMGM",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,tb,b0,b1,b2>=0 "
            "when a0=a2=a3=...=a7=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "terms": len(terms),
        "negative_terms": len(negative),
        "disjoint_positive_sources": len(used),
        "candidate_count_minimum": min(map(len, candidate_rows.values())),
        "candidate_count_maximum": max(map(len, candidate_rows.values())),
        "matching_attempt": attempt,
        "allocations": allocations,
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a direct-H face theorem only. It leaves a0,a2,a3..a7 "
            "and b3..b7 fixed at zero, so it does not prove the full low/high "
            "cone, low/low cone, Q8, PGC, or Problem 993."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "SOURCES", len(used))
    print("MATCHING_ATTEMPT", attempt)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
