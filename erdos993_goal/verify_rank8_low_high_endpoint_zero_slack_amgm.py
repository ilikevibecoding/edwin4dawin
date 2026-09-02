#!/usr/bin/env python3
"""Exact disjoint AM-GM certificate for the low/high endpoint on zero slacks."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_endpoint_zero_slack_amgm_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal, gaps):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    coefficients = [sp.Integer(1)]
    for ratio in ratios:
        coefficients.append(sp.expand(coefficients[-1] * ratio))
    return ratios, coefficients


def convolution(left, right, rank):
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def midpoint_candidates(target, demand, positive):
    rows = []
    for low in itertools.product(*(range(2 * exponent + 1) for exponent in target)):
        high = tuple(2 * target[i] - low[i] for i in range(len(target)))
        if low >= high or low not in positive or high not in positive:
            continue
        a, b = positive[low], positive[high]
        if 4 * a * b >= demand * demand:
            rows.append((min(a, b), a * b, low, high, a, b))
    rows.sort(reverse=True)
    return rows


def main() -> None:
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h] + [h] * 7)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank) for rank in (7, 8, 9)}
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    q2 = sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8])
    C = left_ratios[2]
    endpoint = sp.Poly(
        sp.expand(C ** 2 * margin + h * C * derivative + h ** 2 * q2),
        h, ta, tb,
    )
    terms = {tuple(monomial): int(coefficient)
             for monomial, coefficient in endpoint.terms()}
    positive = {monomial: coefficient for monomial, coefficient in terms.items()
                if coefficient > 0}
    negative = {monomial: -coefficient for monomial, coefficient in terms.items()
                if coefficient < 0}
    assert len(terms) == 163 and len(negative) == 7

    candidates = {
        target: midpoint_candidates(target, demand, positive)
        for target, demand in negative.items()
    }
    assert all(candidates.values())
    ordered = sorted(negative, key=lambda target: (len(candidates[target]), -negative[target]))
    used = set()
    allocations = []
    for target in ordered:
        available = [row for row in candidates[target]
                     if row[2] not in used and row[3] not in used]
        assert available, f"no disjoint allocation for {target}"
        _, _, low, high, a, b = available[0]
        used.update((low, high))
        demand = negative[target]
        allocations.append({
            "negative_monomial_h_ta_tb": list(target),
            "demand": demand,
            "candidate_count": len(candidates[target]),
            "source_low": {"monomial": list(low), "capacity": a},
            "source_high": {"monomial": list(high), "capacity": b},
            "four_product": 4 * a * b,
            "demand_squared": demand * demand,
        })
    assert len(allocations) == 7 and len(used) == 14

    payload = {
        "schema": "rank8-low-high-endpoint-zero-slack-amgm-v1",
        "status": "PASS_EXACT_ENDPOINT_ZERO_SLACK_AMGM",
        "theorem": (
            "C^2*M0+h*C*d+h^2*q2 is nonnegative when all adjusted-gap "
            "slacks vanish."
        ),
        "variables": ["h", "ta", "tb"],
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "minimum_raw_coefficient": min(terms.values()),
        "maximum_raw_coefficient": max(terms.values()),
        "disjoint_positive_sources": len(used),
        "allocations": allocations,
        "scope_warning": (
            "Endpoint and zero-slack face only. This does not prove the full "
            "endpoint, full low/high cone, low/low cone, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("NEGATIVE", len(negative), "SOURCES", len(used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
