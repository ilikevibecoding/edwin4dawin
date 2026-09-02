#!/usr/bin/env python3
"""Exact disjoint AM-GM certificate for the strong zero-slack face."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_low_high_derivative_reserve_zero_slack import factor, convolution


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_zero_slack_amgm_exact_20260820.json"
ALLOCATIONS = {
    (5, 1, 11): ((4, 0, 13), (6, 2, 9)),
    (4, 2, 11): ((3, 1, 13), (5, 3, 9)),
    (3, 3, 11): ((2, 2, 13), (4, 4, 9)),
    (3, 2, 12): ((3, 0, 14), (3, 4, 10)),
    (2, 3, 12): ((2, 1, 14), (2, 5, 10)),
    (1, 4, 12): ((1, 2, 14), (1, 6, 10)),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h] + [h] * 7)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    margin = sp.expand(c8**2 - c7 * c9 - h * c7 * c8)
    derivative = sp.expand(
        2 * c8 * v8 - v7 * c9 - c7 * v9 - h * (v7 * c8 + c7 * v8)
    )
    strong = sp.expand(ratios[2] * margin + h * derivative)
    terms = {tuple(m): int(c) for m, c in sp.Poly(strong, h, ta, tb).terms()}
    negatives = {monomial: -coefficient for monomial, coefficient in terms.items() if coefficient < 0}
    assert set(negatives) == set(ALLOCATIONS)
    used_sources = set()
    rows = []
    for target, (low, high) in ALLOCATIONS.items():
        assert tuple(low[i] + high[i] for i in range(3)) == tuple(2 * target[i] for i in range(3))
        assert low not in used_sources and high not in used_sources and low != high
        used_sources.update((low, high))
        low_capacity, high_capacity = terms[low], terms[high]
        demand = negatives[target]
        assert low_capacity > 0 and high_capacity > 0
        assert 4 * low_capacity * high_capacity >= demand * demand
        rows.append({
            "negative_monomial_h_ta_tb": list(target),
            "demand": demand,
            "source_low": {"monomial": list(low), "capacity": low_capacity},
            "source_high": {"monomial": list(high), "capacity": high_capacity},
            "amgm_check": {
                "four_product": 4 * low_capacity * high_capacity,
                "demand_squared": demand * demand,
            },
        })
    assert len(used_sources) == 12
    payload = {
        "schema": "rank8-low-high-strong-zero-slack-amgm-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_ZERO_SLACK_AMGM",
        "theorem": "C*M0+h*d>=0 when all adjusted-gap slacks vanish",
        "variables": ["h", "ta", "tb"],
        "terms": len(terms),
        "negative_terms": len(negatives),
        "disjoint_positive_sources": len(used_sources),
        "allocations": rows,
        "scope_warning": (
            "This certifies only the zero-slack terminal face.  It does not "
            "prove the full strong auxiliary, low/high cone, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("NEGATIVE", len(negatives), "DISJOINT_SOURCES", len(used_sources))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
