#!/usr/bin/env python3
"""Independent exact replay of the face-(1,0) group-B strong-far payment."""

from __future__ import annotations

import hashlib
import json
import os
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from analyze_rank8_low_low_a23_mixed_slack_slices_agent import BASE_NAMES, build


ROOT = Path(__file__).resolve().parent
BUILDER = ROOT / "analyze_rank8_low_low_a23_mixed_slack_slices_agent.py"
PROBE = ROOT / "probe_rank8_low_low_a23_mixed_group_sparse_young_agent.py"
CERTIFICATE = ROOT / (
    "rank8_low_low_a23_mixed_face_10_groupB_strong_far_"
    "sparse_young_certificate_agent_20260822.json"
)
REPORT = ROOT / (
    "rank8_low_low_a23_mixed_face_10_groupB_strong_far_"
    "sparse_young_independent_audit_agent_20260822.json"
)
EXPECTED = {
    BUILDER.name: "C1BFFC3E28EC8F484A490C454F4B7EBBF6C2D4E633E9A81349F789B50BB6D31D",
    PROBE.name: "C201FB030C3E03A748DEAA585FEC8B48B48C4A378D7286DC418A45957B1A0A07",
    CERTIFICATE.name: "68E0E7E7694810BC60FD805C93E323E894649BBFA16C09AFC62BD0774C3B3AAD",
}
FACE = (1, 0)
GROUP = ("a4", "a5", "a6", "a7", "b0")
LABEL = "strong_far"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction(pair):
    return Fraction(int(pair[0]), int(pair[1]))


def main():
    assert {path.name: sha256(path) for path in (BUILDER, PROBE, CERTIFICATE)} == EXPECTED
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["schema"] == "rank8-low-low-a23-mixed-group-sparse-young-agent-v1"
    assert certificate["status"] == "PASS_EXACT_SPARSE_POSITIVE_SUPPORT_YOUNG_AMGM"
    assert tuple(certificate["face"]) == FACE
    assert tuple(certificate["ordinary_slack_group"]) == GROUP
    assert certificate["auxiliary"] == LABEL
    assert certificate["builder_sha256"] == EXPECTED[BUILDER.name]
    assert certificate["source_sha256"] == EXPECTED[PROBE.name]

    names, rows = build(FACE, GROUP, only_label=LABEL)
    polynomial = rows[LABEL]
    slack_start = len(BASE_NAMES)

    def in_positive_support(monomial):
        return any(int(value) > 0 for value in monomial[slack_start:])

    negative = {}
    group_terms = positive_terms = 0
    for monomial, raw_coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        if not in_positive_support(monomial):
            continue
        coefficient = int(raw_coefficient)
        group_terms += 1
        if coefficient > 0:
            positive_terms += 1
        elif coefficient < 0:
            negative[monomial] = -coefficient
    assert group_terms == certificate["group_terms"] == 2_119_968
    assert positive_terms == certificate["positive_terms"] == 2_116_152
    assert len(negative) == certificate["negative_terms"] == 3_816

    target_paid = defaultdict(Fraction)
    source_used = defaultdict(Fraction)
    source_capacity = {}
    for allocation in certificate["allocations"]:
        target = tuple(map(int, allocation["target"]))
        low = tuple(map(int, allocation["source_low"]))
        high = tuple(map(int, allocation["source_high"]))
        payment = fraction(allocation["payment"])
        ratio = fraction(allocation["ratio_r"])
        low_cost = fraction(allocation["low_cost"])
        high_cost = fraction(allocation["high_cost"])
        assert target in negative
        assert int(allocation["demand"]) == negative[target]
        assert tuple(a + b for a, b in zip(low, high)) == tuple(
            2 * value for value in target
        )
        assert low != high
        assert in_positive_support(low) and in_positive_support(high)
        actual_low = int(polynomial[low])
        actual_high = int(polynomial[high])
        assert actual_low == int(allocation["low_capacity"]) > 0
        assert actual_high == int(allocation["high_capacity"]) > 0
        assert low_cost == payment * ratio / 2
        assert high_cost == payment / (2 * ratio)
        target_paid[target] += payment
        source_used[low] += low_cost
        source_used[high] += high_cost
        assert source_capacity.setdefault(low, actual_low) == actual_low
        assert source_capacity.setdefault(high, actual_high) == actual_high

    assert len(certificate["allocations"]) == certificate["allocations_used"] == 4_675
    assert set(target_paid) == set(negative)
    target_surplus = {
        target: target_paid[target] - demand for target, demand in negative.items()
    }
    source_reserve = {
        source: Fraction(source_capacity[source]) - used
        for source, used in source_used.items()
    }
    assert min(target_surplus.values()) >= 0
    assert min(source_reserve.values()) >= 0
    assert [
        min(target_surplus.values()).numerator,
        min(target_surplus.values()).denominator,
    ] == certificate["minimum_target_surplus"]
    assert [
        min(source_reserve.values()).numerator,
        min(source_reserve.values()).denominator,
    ] == certificate["minimum_source_reserve"]
    assert certificate["all_sources_have_positive_group_support"] is True

    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-face-10-groupB-strong-far-"
            "sparse-young-independent-audit-agent-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_RATIONAL_PAYMENT_REPLAY",
        "face": list(FACE),
        "ordinary_slack_group": list(GROUP),
        "auxiliary": LABEL,
        "variables": list(names),
        "group_terms": group_terms,
        "positive_terms": positive_terms,
        "negative_terms": len(negative),
        "allocations_replayed": len(certificate["allocations"]),
        "distinct_sources_used": len(source_used),
        "all_midpoint_identities_exact": True,
        "all_reported_coefficients_match_rebuilt_polynomial": True,
        "all_target_demands_paid_exactly_or_better": True,
        "all_source_capacities_respected": True,
        "all_sources_disjoint_from_zero_support": True,
        "minimum_target_surplus": certificate["minimum_target_surplus"],
        "minimum_source_reserve": certificate["minimum_source_reserve"],
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audits one positive-support strong-far group on the mixed "
            "face (1,0); it is not yet the complete mixed-face theorem."
        ),
    }
    encoded = json.dumps(payload, indent=2) + "\n"
    temporary = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temporary.write_text(encoded, encoding="utf-8")
    os.replace(temporary, REPORT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(REPORT), flush=True)


if __name__ == "__main__":
    main()
