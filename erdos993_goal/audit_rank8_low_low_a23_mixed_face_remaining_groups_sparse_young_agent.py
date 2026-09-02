#!/usr/bin/env python3
"""Independent exact replay of the six remaining A/B mixed-face groups."""

from __future__ import annotations

import gc
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
REPORT = ROOT / (
    "rank8_low_low_a23_mixed_face_remaining_groups_"
    "sparse_young_independent_audit_agent_20260822.json"
)
GROUP_A = ("a0", "b4", "b5", "b6", "b7")
GROUP_B = ("a4", "a5", "a6", "a7", "b0")
ROWS = (
    (
        (0, 1), GROUP_A, "curvature_far",
        "rank8_low_low_a23_mixed_face_01_groupA_curvature_far_sparse_young_certificate_agent_20260822.json",
        "466246E230B8D2FF9BAD31D655457656B0451284F5D083BF42D3286EE835E948",
    ),
    (
        (0, 1), GROUP_A, "strong_far",
        "rank8_low_low_a23_mixed_face_01_groupA_strong_far_sparse_young_r3_certificate_agent_20260822.json",
        "F6574DAA47B4AD85BB62EF1EB3871A514B9F3BDF59269054FA4DA8F915B508F8",
    ),
    (
        (0, 1), GROUP_B, "strong_middle_times_4",
        "rank8_low_low_a23_mixed_face_01_groupB_strong_middle_sparse_young_certificate_agent_20260822.json",
        "41C82B40ED96BFF11D99786FB4A089649E8D4D0DBA9D70E9DC181FBB0F534508",
    ),
    (
        (0, 1), GROUP_B, "strong_far",
        "rank8_low_low_a23_mixed_face_01_groupB_strong_far_sparse_young_certificate_agent_20260822.json",
        "33728A6ED419EF4456B545D094923F1676425FF8E43F37AF48695E8FEC7D3089",
    ),
    (
        (1, 0), GROUP_A, "curvature_far",
        "rank8_low_low_a23_mixed_face_10_groupA_curvature_far_sparse_young_certificate_agent_20260822.json",
        "40B95B360D914E43784A24F75B57071680F7369097F5D139ED88D19AAE67FAB8",
    ),
    (
        (1, 0), GROUP_A, "strong_far",
        "rank8_low_low_a23_mixed_face_10_groupA_strong_far_sparse_young_certificate_agent_20260822.json",
        "A7988E55730A563641A7576B435749883F163DB01BD33E073F04DAF39C094FFE",
    ),
)
EXPECTED_CORE = {
    BUILDER.name: "C1BFFC3E28EC8F484A490C454F4B7EBBF6C2D4E633E9A81349F789B50BB6D31D",
    PROBE.name: "C201FB030C3E03A748DEAA585FEC8B48B48C4A378D7286DC418A45957B1A0A07",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction(pair):
    return Fraction(int(pair[0]), int(pair[1]))


def audit_one(face, group, label, filename, expected_hash):
    path = ROOT / filename
    assert sha256(path) == expected_hash
    certificate = json.loads(path.read_text(encoding="utf-8"))
    assert certificate["schema"] == "rank8-low-low-a23-mixed-group-sparse-young-agent-v1"
    assert certificate["status"] == "PASS_EXACT_SPARSE_POSITIVE_SUPPORT_YOUNG_AMGM"
    assert tuple(certificate["face"]) == face
    assert tuple(certificate["ordinary_slack_group"]) == group
    assert certificate["auxiliary"] == label
    assert certificate["builder_sha256"] == EXPECTED_CORE[BUILDER.name]
    assert certificate["source_sha256"] == EXPECTED_CORE[PROBE.name]

    names, rows = build(face, group, only_label=label)
    polynomial = rows[label]
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
    assert group_terms == certificate["group_terms"]
    assert positive_terms == certificate["positive_terms"]
    assert len(negative) == certificate["negative_terms"]

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
    assert len(certificate["allocations"]) == certificate["allocations_used"]
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
    result = {
        "face": list(face),
        "ordinary_slack_group": list(group),
        "auxiliary": label,
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
        "certificate": filename,
        "certificate_sha256": expected_hash,
    }
    del polynomial, rows
    gc.collect()
    return result


def main():
    assert {path.name: sha256(path) for path in (BUILDER, PROBE)} == EXPECTED_CORE
    audited = []
    for index, row in enumerate(ROWS, 1):
        result = audit_one(*row)
        audited.append(result)
        print(
            "AUDITED", index, len(ROWS), result["face"],
            result["auxiliary"], result["allocations_replayed"], flush=True,
        )
    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-face-remaining-groups-"
            "sparse-young-independent-audit-agent-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_RATIONAL_PAYMENT_REPLAY_ALL_SIX_GROUP_ROWS",
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "rows": audited,
        "total_negative_terms": sum(row["negative_terms"] for row in audited),
        "total_allocations_replayed": sum(
            row["allocations_replayed"] for row in audited
        ),
        "all_sources_disjoint_from_zero_support": True,
        "immutable_inputs": {
            **EXPECTED_CORE,
            **{filename: expected for *_, filename, expected in ROWS},
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audits the six nonzero A/B group rows. Full mixed-face "
            "coverage additionally requires the zero-support certificates, "
            "the two separately audited face-(1,0) group-B rows, and a proof "
            "that support meeting both A and B is coefficientwise nonnegative."
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
