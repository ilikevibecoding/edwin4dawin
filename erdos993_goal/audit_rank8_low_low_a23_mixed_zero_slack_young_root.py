#!/usr/bin/env python3
"""Independent exact audit of the mixed-face zero-slack Young certificate."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "search_rank8_low_low_a23_mixed_zero_slack_young_agent.py"
REPORT = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json"
DIAGNOSTIC = ROOT / "diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root.py"
OUTPUT = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_root_independent_audit_20260822.json"
EXPECTED = {
    SOURCE.name: "933F373A2ABE515E5344C85C724AA6C59FE0A0B9E3D5CCB4945738D55D48F024",
    REPORT.name: "D1111D2667D14ABA2795C873A63059EA3E132FDEE56850AEB12233C7AF6F2A71",
    DIAGNOSTIC.name: "1B53E43CC365C47EB4715C61A1958E48AB11D718350AFFE4CA135E5B7B37812B",
}
EXPECTED_ROWS = {
    "0,1": {
        "curvature_middle_times_4": (3185, 0, 0),
        "curvature_far": (3164, 60, 107),
        "strong_middle_times_4": (4433, 6, 11),
        "strong_far": (4409, 77, 138),
    },
    "1,0": {
        "curvature_middle_times_4": (3309, 0, 0),
        "curvature_far": (3282, 2, 2),
        "strong_middle_times_4": (4334, 96, 186),
        "strong_far": (4304, 100, 189),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rational(value) -> Fraction:
    assert isinstance(value, list) and len(value) == 2
    return Fraction(int(value[0]), int(value[1]))


def main() -> None:
    assert {path.name: sha256(path) for path in (SOURCE, REPORT, DIAGNOSTIC)} == EXPECTED
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM"
    assert report["immutable_inputs"] == {DIAGNOSTIC.name: EXPECTED[DIAGNOSTIC.name]}
    assert report["source_sha256"] == EXPECTED[SOURCE.name]

    audited_rows = []
    total_negative = 0
    total_allocations = 0
    for face_name, expected_labels in EXPECTED_ROWS.items():
        face = tuple(map(int, face_name.split(",")))
        exact = build(face)
        assert set(report["faces"][face_name]) == set(expected_labels) == set(exact)
        for label, (expected_terms, expected_negative, expected_allocations) in expected_labels.items():
            polynomial_terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in exact[label].terms()
            }
            positive = {key: value for key, value in polynomial_terms.items() if value > 0}
            negative = {key: -value for key, value in polynomial_terms.items() if value < 0}
            row = report["faces"][face_name][label]
            assert len(polynomial_terms) == row["terms"] == expected_terms
            assert len(negative) == row["negative_terms"] == expected_negative
            allocations = row["allocations"]
            assert len(allocations) == expected_allocations
            if not negative:
                assert row["status"] == "COEFFICIENTWISE_NONNEGATIVE"
                assert not allocations
            else:
                assert row["status"] == "PASS_EXACT_SHARED_SOURCE_YOUNG_AMGM"

            paid = {target: Fraction(0) for target in negative}
            used = {source: Fraction(0) for source in positive}
            for allocation in allocations:
                target = tuple(map(int, allocation["target"]))
                low = tuple(map(int, allocation["source_low"]))
                high = tuple(map(int, allocation["source_high"]))
                payment = rational(allocation["payment"])
                ratio = rational(allocation["ratio_r"])
                low_cost = rational(allocation["low_cost"])
                high_cost = rational(allocation["high_cost"])
                assert target in negative and low in positive and high in positive
                assert payment > 0 and ratio > 0
                assert low != high
                assert tuple(low[i] + high[i] for i in range(5)) == tuple(
                    2 * target[i] for i in range(5)
                )
                assert low_cost == payment * ratio / 2
                assert high_cost == payment / (2 * ratio)
                assert 4 * low_cost * high_cost == payment * payment
                paid[target] += payment
                used[low] += low_cost
                used[high] += high_cost

            assert all(paid[target] >= demand for target, demand in negative.items())
            assert all(used[source] <= capacity for source, capacity in positive.items())
            total_negative += len(negative)
            total_allocations += len(allocations)
            audited_rows.append({
                "face": face_name,
                "label": label,
                "terms": len(polynomial_terms),
                "negative_terms": len(negative),
                "allocations": len(allocations),
                "paid_targets": sum(value > 0 for value in paid.values()),
                "used_positive_sources": sum(value > 0 for value in used.values()),
            })

    assert total_negative == 341
    assert total_allocations == 633
    payload = {
        "schema": "rank8-low-low-a23-mixed-zero-slack-young-root-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM_AUDIT",
        "immutable_inputs": EXPECTED,
        "rows": audited_rows,
        "total_negative_monomials_paid": total_negative,
        "total_exact_rational_allocations": total_allocations,
        "identity_rechecked": (
            "For every allocation L+H=2T and 4*low_cost*high_cost=payment^2, "
            "so weighted AM-GM pays payment*x^T. Target demand and shared source "
            "capacity inequalities were recomputed with Fraction exactly."
        ),
        "scope_warning": (
            "This independently closes only the ten-slack-zero restrictions of "
            "the two mixed endpoint faces. Arbitrary gap slacks still require a lift."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("NEGATIVE_MONOMIALS", total_negative)
    print("ALLOCATIONS", total_allocations)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
