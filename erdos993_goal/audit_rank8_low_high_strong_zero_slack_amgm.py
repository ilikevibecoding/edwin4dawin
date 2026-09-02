#!/usr/bin/env python3
"""Independent exact audit of the strong zero-slack AM-GM certificate."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "rank8_low_high_strong_zero_slack_amgm_exact_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_zero_slack_amgm_independent_audit_20260820.json"
EXPECTED_SOURCE = "4019956D18632024F0E35B25BAE84DDE48CAD24576F7EE81AFFE101874C3D288"
EXPECTED_INPUT = "830CB8FF350A59447D14AA1176C9EE22A613ABF57CD091579BBD7A8EA1CFFAE6"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row(terminal: sp.Expr, h: sp.Expr) -> tuple[list[sp.Expr], list[sp.Expr]]:
    # Independent closed recurrence for zero-slack ratios A_i=terminal+(8-i)h,
    # except A_0 has the extra unit h required by delta0=2h.
    ratios = [sp.expand(terminal + (8 - index) * h) for index in range(9)]
    ratios[0] += h
    coefficients = [sp.Integer(1)]
    for ratio in ratios:
        coefficients.append(sp.expand(coefficients[-1] * ratio))
    return ratios, coefficients


def conv(left: list[sp.Expr], right: list[sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def main() -> None:
    assert sha256(ROOT / "verify_rank8_low_high_strong_zero_slack_amgm.py") == EXPECTED_SOURCE
    assert sha256(INPUT) == EXPECTED_INPUT
    stored = json.loads(INPUT.read_text(encoding="utf-8"))
    assert stored["status"] == "PASS_EXACT_STRONG_AUXILIARY_ZERO_SLACK_AMGM"

    h, x, y = sp.symbols("h x y", nonnegative=True)
    ratios, left = row(x, h)
    _, right = row(y, h)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c = {rank: conv(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: conv(tail, right, rank) for rank in (7, 8, 9)}
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    strong = sp.Poly(sp.expand(ratios[2] * margin + h * derivative), h, x, y)
    terms = {tuple(m): int(coefficient) for m, coefficient in strong.terms()}
    negative = {monomial: -coefficient for monomial, coefficient in terms.items() if coefficient < 0}
    assert len(terms) == stored["terms"] == 148
    assert len(negative) == stored["negative_terms"] == 6

    used = set()
    for allocation in stored["allocations"]:
        target = tuple(allocation["negative_monomial_h_ta_tb"])
        low = tuple(allocation["source_low"]["monomial"])
        high = tuple(allocation["source_high"]["monomial"])
        demand = allocation["demand"]
        assert negative[target] == demand
        assert tuple(low[i] + high[i] for i in range(3)) == tuple(2 * target[i] for i in range(3))
        assert low not in used and high not in used
        used.update((low, high))
        assert terms[low] == allocation["source_low"]["capacity"] > 0
        assert terms[high] == allocation["source_high"]["capacity"] > 0
        assert 4 * terms[low] * terms[high] >= demand * demand
    assert len(used) == stored["disjoint_positive_sources"] == 12

    payload = {
        "schema": "rank8-low-high-strong-zero-slack-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_STRONG_ZERO_SLACK_AMGM",
        "checks": {
            "independent_ratio_recurrence": True,
            "polynomial_terms": len(terms),
            "negative_terms": len(negative),
            "disjoint_sources": len(used),
            "midpoint_equalities": 6,
            "exact_amgm_capacity_checks": 6,
        },
        "scope_warning": "Zero-slack face only; no full low/high cone claim.",
        "immutable_inputs": {
            "verify_rank8_low_high_strong_zero_slack_amgm.py": EXPECTED_SOURCE,
            INPUT.name: EXPECTED_INPUT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
