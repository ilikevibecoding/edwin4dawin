#!/usr/bin/env python3
"""Independent audit of the zero-slack far-curvature AM-GM certificate."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json"
PRODUCER = "verify_rank8_low_low_tail_curvature_far_zero_slack_amgm.py"
CERTIFICATE = "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
EXPECTED = {
    PRODUCER: "FAA568665348ADAF9918A9EE9D77F76C42652CCAFD32551D51076B4D9723A167",
    CERTIFICATE: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_row(ratios: list[sp.Expr]) -> list[sp.Expr]:
    row = [sp.Integer(1)]
    for ratio in ratios:
        row.append(sp.expand(row[-1] * ratio))
    return row


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    certificate = json.loads((ROOT / CERTIFICATE).read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert certificate["source_sha256"] == actual_inputs[PRODUCER]

    # Construct the t=h endpoint directly, without importing the producer or
    # forming the four-variable t-polynomial used by the earlier probe.
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    left_ratios = [ta + 9 * h, ta + 7 * h, ta + 6 * h, ta + 5 * h,
                   ta + 4 * h, ta + 3 * h, ta + 2 * h, ta + h, ta]
    right_ratios = [tb + 9 * h, tb + 7 * h, tb + 7 * h, tb + 5 * h,
                    tb + 4 * h, tb + 3 * h, tb + 2 * h, tb + h, tb]
    left = coefficient_row(left_ratios)
    right = coefficient_row(right_ratios)

    def tail_convolution(rank: int) -> sp.Expr:
        return sp.expand(sum(
            math.comb(rank, index) * left[index] * right[rank - index]
            for index in range(3, rank + 1)
        ))

    v7, v8, v9 = (tail_convolution(rank) for rank in (7, 8, 9))
    polynomial = sp.Poly(sp.expand(v8**2 - v7 * v9 - h * v7 * v8), h, ta, tb)
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 125
    assert negative == {(2, 12, 2): 217, (1, 12, 3): 7}

    allocations = certificate["allocations"]
    assert len(allocations) == 2
    used = set()
    audited = []
    for allocation in allocations:
        target = tuple(allocation["negative_monomial"])
        demand = int(allocation["demand"])
        low = tuple(allocation["source_low"]["monomial"])
        high = tuple(allocation["source_high"]["monomial"])
        low_capacity = int(allocation["source_low"]["capacity"])
        high_capacity = int(allocation["source_high"]["capacity"])
        assert demand == negative[target]
        assert low_capacity == positive[low]
        assert high_capacity == positive[high]
        assert low not in used and high not in used and low != high
        used.update((low, high))
        assert tuple(low[i] + high[i] for i in range(3)) == tuple(2 * x for x in target)
        four_product = 4 * low_capacity * high_capacity
        assert four_product == allocation["four_product"]
        assert demand * demand == allocation["demand_squared"]
        assert four_product - demand * demand == allocation["slack"] >= 0
        audited.append({
            "target": list(target),
            "midpoint_identity": True,
            "capacity_inequality": True,
        })
    assert len(used) == 4

    payload = {
        "schema": "rank8-low-low-tail-curvature-far-zero-slack-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM",
        "independent_reconstruction": (
            "Direct t=h ratio rows and tail convolutions; producer code was not imported."
        ),
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "disjoint_sources": len(used),
        "audited_allocations": audited,
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": certificate["scope_warning"],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "SOURCES", len(used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
