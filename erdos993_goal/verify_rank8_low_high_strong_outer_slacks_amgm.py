#!/usr/bin/env python3
"""Exact AM-GM lift of H_str over the coefficientwise-safe outer slacks.

This proves the direct strong auxiliary only on the face
    a3=...=a7=b0=b1=b2=0,
while allowing a0,a2,b3,...,b7 to vary independently over R_{>=0}.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
ZERO_REPORT = ROOT / "rank8_low_high_strong_zero_slack_amgm_exact_20260820.json"
ZERO_AUDIT = ROOT / "rank8_low_high_strong_zero_slack_amgm_independent_audit_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_outer_slacks_amgm_exact_20260820.json"
NAMES = ("h", "ta", "a0", "a2", "tb", "b3", "b4", "b5", "b6", "b7")
EXPECTED_ZERO_REPORT = "830CB8FF350A59447D14AA1176C9EE22A613ABF57CD091579BBD7A8EA1CFFAE6"
EXPECTED_ZERO_AUDIT = "6D6E4A67B3B972B736910C4D5CD6E65C5F229601E0B775F976DECB409CB61FF6"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_gaps = [
        2 * h + variables["a0"],
        h,
        h + variables["a2"],
        h,
        h,
        h,
        h,
        h,
    ]
    right_gaps = [
        2 * h,
        h,
        h,
        h + variables["b3"],
        h + variables["b4"],
        h + variables["b5"],
        h + variables["b6"],
        h + variables["b7"],
    ]
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return left_ratios[2] * margin + h * derivative


def lift(triple):
    h_degree, ta_degree, tb_degree = map(int, triple)
    return (h_degree, ta_degree, 0, 0, tb_degree, 0, 0, 0, 0, 0)


def main() -> None:
    assert sha256(ZERO_REPORT) == EXPECTED_ZERO_REPORT
    assert sha256(ZERO_AUDIT) == EXPECTED_ZERO_AUDIT
    zero = json.loads(ZERO_REPORT.read_text(encoding="utf-8"))
    audit = json.loads(ZERO_AUDIT.read_text(encoding="utf-8"))
    assert zero["status"] == "PASS_EXACT_STRONG_AUXILIARY_ZERO_SLACK_AMGM"
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_ZERO_SLACK_AMGM"

    polynomial = build()
    terms = negative = 0
    minimum = maximum = None
    negative_rows = {}
    required = set()
    for allocation in zero["allocations"]:
        required.add(lift(allocation["negative_monomial_h_ta_tb"]))
        required.add(lift(allocation["source_low"]["monomial"]))
        required.add(lift(allocation["source_high"]["monomial"]))
    selected = {}
    for monomial, coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            negative_rows[monomial] = value
        if monomial in required:
            selected[monomial] = value
    assert required == set(selected)

    used = set()
    lifted_allocations = []
    expected_negative = {}
    for allocation in zero["allocations"]:
        target = lift(allocation["negative_monomial_h_ta_tb"])
        low = lift(allocation["source_low"]["monomial"])
        high = lift(allocation["source_high"]["monomial"])
        demand = int(allocation["demand"])
        expected_negative[target] = -demand
        assert low not in used and high not in used and low != high
        used.update((low, high))
        assert tuple(low[i] + high[i] for i in range(len(NAMES))) == tuple(
            2 * target[i] for i in range(len(NAMES))
        )
        low_capacity = selected[low]
        high_capacity = selected[high]
        assert low_capacity == allocation["source_low"]["capacity"] > 0
        assert high_capacity == allocation["source_high"]["capacity"] > 0
        assert selected[target] == -demand
        assert 4 * low_capacity * high_capacity >= demand * demand
        lifted_allocations.append({
            "negative_monomial": list(target),
            "demand": demand,
            "source_low": {"monomial": list(low), "capacity": low_capacity},
            "source_high": {"monomial": list(high), "capacity": high_capacity},
            "four_product": 4 * low_capacity * high_capacity,
            "demand_squared": demand * demand,
        })
    assert negative_rows == expected_negative
    assert negative == 6 and len(used) == 12

    payload = {
        "schema": "rank8-low-high-strong-outer-slacks-amgm-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_OUTER_SLACKS_AMGM",
        "theorem": (
            "H_str=C*M0+h*d is nonnegative for arbitrary a0,a2,b3,...,b7 "
            "when a3=...=a7=b0=b1=b2=0."
        ),
        "variables": list(NAMES),
        "terms": terms,
        "negative_terms": negative,
        "minimum_raw_coefficient": minimum,
        "maximum_raw_coefficient": maximum,
        "disjoint_positive_sources": len(used),
        "allocations": lifted_allocations,
        "scope_warning": (
            "This is a direct-H face theorem only. The left middle slacks "
            "a3..a7 and right early slacks b0..b2 remain zero; no full "
            "low/high cone or Problem 993 claim."
        ),
        "immutable_inputs": {
            ZERO_REPORT.name: EXPECTED_ZERO_REPORT,
            ZERO_AUDIT.name: EXPECTED_ZERO_AUDIT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", terms, "NEGATIVE", negative, "SOURCES", len(used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
