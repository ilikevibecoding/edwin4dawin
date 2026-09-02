#!/usr/bin/env python3
"""Independent exact replay of the mixed zero-slack Young/AM-GM certificate."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "search_rank8_low_low_a23_mixed_zero_slack_young_agent.py"
CERTIFICATE = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_agent_audit_20260822.json"
EXPECTED = {
    PRODUCER.name: "933F373A2ABE515E5344C85C724AA6C59FE0A0B9E3D5CCB4945738D55D48F024",
    CERTIFICATE.name: "D1111D2667D14ABA2795C873A63059EA3E132FDEE56850AEB12233C7AF6F2A71",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction(pair):
    return Fraction(int(pair[0]), int(pair[1]))


def main():
    assert {path.name: sha256(path) for path in (PRODUCER, CERTIFICATE)} == EXPECTED
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM"
    audited_rows = []
    total_allocations = 0
    total_negatives = 0
    for face in ((0, 1), (1, 0)):
        face_name = ",".join(map(str, face))
        actual_polynomials = build(face)
        for label, polynomial in actual_polynomials.items():
            row = certificate["faces"][face_name][label]
            terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in polynomial.terms()
            }
            positive = {key: value for key, value in terms.items() if value > 0}
            negative = {key: -value for key, value in terms.items() if value < 0}
            assert row["terms"] == len(terms)
            assert row["negative_terms"] == len(negative)
            total_negatives += len(negative)
            if not negative:
                assert row["status"] == "COEFFICIENTWISE_NONNEGATIVE"
                assert row["allocations"] == []
                audited_rows.append({
                    "face": list(face), "label": label,
                    "negative_terms": 0, "allocations": 0,
                })
                continue
            assert row["status"] == "PASS_EXACT_SHARED_SOURCE_YOUNG_AMGM"
            source_used = {key: Fraction(0) for key in positive}
            target_paid = {key: Fraction(0) for key in negative}
            for allocation in row["allocations"]:
                target = tuple(allocation["target"])
                low = tuple(allocation["source_low"])
                high = tuple(allocation["source_high"])
                payment = fraction(allocation["payment"])
                ratio = fraction(allocation["ratio_r"])
                low_cost = fraction(allocation["low_cost"])
                high_cost = fraction(allocation["high_cost"])
                assert payment > 0 and ratio > 0
                assert low in positive and high in positive and target in negative
                assert tuple(a + b for a, b in zip(low, high)) == tuple(
                    2 * value for value in target
                )
                assert low_cost == payment * ratio / 2
                assert high_cost == payment / (2 * ratio)
                assert low_cost * high_cost == payment * payment / 4
                source_used[low] += low_cost
                source_used[high] += high_cost
                target_paid[target] += payment
            assert all(target_paid[key] >= value for key, value in negative.items())
            assert all(source_used[key] <= value for key, value in positive.items())
            reported_targets = {
                tuple(item["monomial"]): fraction(item["paid"])
                for item in row["target_audit"]
            }
            reported_sources = {
                tuple(item["monomial"]): fraction(item["used"])
                for item in row["source_audit"]
            }
            assert reported_targets == target_paid
            assert reported_sources == {
                key: value for key, value in source_used.items() if value
            }
            total_allocations += len(row["allocations"])
            audited_rows.append({
                "face": list(face), "label": label,
                "negative_terms": len(negative),
                "allocations": len(row["allocations"]),
                "minimum_target_surplus": [
                    min(target_paid[key] - value for key, value in negative.items()).numerator,
                    min(target_paid[key] - value for key, value in negative.items()).denominator,
                ],
                "minimum_source_reserve": [
                    min(Fraction(value) - source_used[key] for key, value in positive.items()).numerator,
                    min(Fraction(value) - source_used[key] for key, value in positive.items()).denominator,
                ],
            })
    assert total_negatives == 341
    assert total_allocations == 633
    payload = {
        "schema": "rank8-low-low-a23-mixed-zero-slack-young-agent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_MIXED_ZERO_SLACK_YOUNG_AUDIT",
        "audited_rows": audited_rows,
        "negative_terms_paid": total_negatives,
        "allocations_exactly_replayed": total_allocations,
        "checks": [
            "all midpoint identities",
            "all rational Young product identities",
            "all target demands",
            "all shared positive-source capacities",
            "producer row counts against rebuilt exact polynomials",
        ],
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Independent audit of the ten-slack-zero mixed faces only; the "
            "arbitrary-slack factored lift remains open."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("NEGATIVES", total_negatives, "ALLOCATIONS", total_allocations)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
