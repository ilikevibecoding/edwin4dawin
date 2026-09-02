#!/usr/bin/env python3
"""Lift the audited a3,a4 direct-H AM-GM certificate through a5,a6,a7."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from explore_rank8_low_high_strong_aux_faces import build


ROOT = Path(__file__).resolve().parent
BASE_REPORT = ROOT / "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json"
BASE_AUDIT = ROOT / "rank8_low_high_strong_a34_prefix_amgm_independent_audit_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_core_a3_a7_binomial_lift_exact_20260820.json"
EXPECTED_BASE_REPORT = "795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8"
EXPECTED_BASE_AUDIT = "C7BCA108DF5111227B313563AD49E148E108830A8B0CD4A2A368AFD5BB0CED11"
FULL_NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def compositions4(total: int):
    for ta in range(total + 1):
        for a5 in range(total - ta + 1):
            for a6 in range(total - ta - a5 + 1):
                a7 = total - ta - a5 - a6
                coefficient = math.factorial(total) // (
                    math.factorial(ta) * math.factorial(a5)
                    * math.factorial(a6) * math.factorial(a7)
                )
                yield ta, a5, a6, a7, coefficient


def lift_monomial(base, scale: int, target: dict) -> None:
    h, ta_degree, a3, a4, tb, b0, b1, b2 = map(int, base)
    for ta, a5, a6, a7, multinomial in compositions4(ta_degree):
        monomial = (h, ta, a3, a4, a5, a6, a7, tb, b0, b1, b2)
        target[monomial] = target.get(monomial, 0) + scale * multinomial


def main() -> None:
    assert sha256(BASE_REPORT) == EXPECTED_BASE_REPORT
    assert sha256(BASE_AUDIT) == EXPECTED_BASE_AUDIT
    base = json.loads(BASE_REPORT.read_text(encoding="utf-8"))
    audit = json.loads(BASE_AUDIT.read_text(encoding="utf-8"))
    assert base["status"] == "PASS_EXACT_STRONG_AUXILIARY_A34_PREFIX_AMGM"
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_AUXILIARY_A34_PREFIX_AMGM"
    assert base["allocated_negative_rows"] == len(base["allocations"]) == 1950

    predicted_negative = {}
    required_positive = {}
    base_source_allocated = {}
    for row in base["allocations"]:
        demand = int(row["demand"])
        low = row["source_low"]
        high = row["source_high"]
        assert 4 * int(low["allocated"]) * int(high["allocated"]) >= demand * demand
        lift_monomial(row["negative_monomial"], demand, predicted_negative)
        for source in (low, high):
            key = tuple(map(int, source["monomial"]))
            allocated = int(source["allocated"])
            base_source_allocated[key] = base_source_allocated.get(key, 0) + allocated
    for monomial, allocated in base_source_allocated.items():
        lift_monomial(monomial, allocated, required_positive)

    polynomial, names = build(FULL_NAMES, "strong")
    assert names == FULL_NAMES
    terms = negative = 0
    minimum = maximum = None
    actual_negative = {}
    selected_positive = {}
    for monomial, coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        value = int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative += 1
            actual_negative[monomial] = -value
        if monomial in required_positive:
            selected_positive[monomial] = value

    assert terms == 4975819
    assert negative == 11883
    assert actual_negative == predicted_negative
    assert set(selected_positive) == set(required_positive)
    deficits = {
        monomial: required_positive[monomial] - selected_positive[monomial]
        for monomial in required_positive
        if selected_positive[monomial] < required_positive[monomial]
    }
    assert not deficits
    residuals = [
        selected_positive[monomial] - required_positive[monomial]
        for monomial in required_positive
    ]

    payload = {
        "schema": "rank8-low-high-strong-core-a3-a7-binomial-lift-v1",
        "status": "PASS_EXACT_STRONG_CORE_A3_A7_BINOMIAL_LIFT",
        "theorem": (
            "H_str=C*M0+h*d is nonnegative for arbitrary "
            "a3,a4,a5,a6,a7,b0,b1,b2 with a0=a2=b3=...=b7=0."
        ),
        "substitution": "ta -> ta+a5+a6+a7 in the audited a3,a4 AM-GM certificate",
        "full_variables": list(FULL_NAMES),
        "full_polynomial": {
            "terms": terms,
            "negative_terms": negative,
            "minimum_raw_coefficient": minimum,
            "maximum_raw_coefficient": maximum,
        },
        "negative_support": {
            "predicted_rows": len(predicted_negative),
            "actual_rows": len(actual_negative),
            "exact_match": True,
        },
        "positive_capacity": {
            "base_sources": len(base_source_allocated),
            "lifted_source_monomials": len(required_positive),
            "deficits": 0,
            "minimum_residual": min(residuals),
            "maximum_residual": max(residuals),
        },
        "logic": (
            "Each audited three-term AM-GM inequality remains nonnegative "
            "after substituting the nonnegative sum ta+a5+a6+a7. The lifted "
            "negative part equals the full core negative part exactly, and "
            "the actual positive coefficients dominate every lifted source "
            "allocation; all residual coefficients are nonnegative."
        ),
        "scope_warning": (
            "Core face only. The separately certified a0/a2 lift and a "
            "future b3..b7 lift are still required for the full direct-H cone."
        ),
        "immutable_inputs": {
            BASE_REPORT.name: EXPECTED_BASE_REPORT,
            BASE_AUDIT.name: EXPECTED_BASE_AUDIT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", terms, "NEGATIVE", negative, "LIFTED_SOURCES", len(required_positive))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
