#!/usr/bin/env python3
"""Read-only forest-lift integration of fixed/full progress through alpha=7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
LANE = ROOT / "rank8_forest_lift_lane_independent_audit_exact_20260820.json"
ALPHA1_HIGH = ROOT / "rank8_exceptional_fixed_high_exact_20260820_range_1_2.json"
ALPHA1_LOW = ROOT / "rank8_exceptional_fixed_low_exact_20260820_range_1_2.json"
AUDITS = {
    2: ROOT / "rank8_exceptional_fixed_alpha2_independent_audit_exact_20260820.json",
    3: ROOT / "rank8_exceptional_fixed_alpha3_independent_audit_exact_20260820.json",
    4: ROOT / "rank8_exceptional_fixed_alpha4_independent_audit_exact_20260820.json",
    5: ROOT / "rank8_exceptional_fixed_alpha5_independent_audit_exact_20260820.json",
    6: ROOT / "rank8_exceptional_fixed_alpha6_independent_audit_exact_20260820.json",
    7: ROOT / "rank8_exceptional_fixed_alpha7_independent_audit_exact_20260820.json",
}
OUTPUT = ROOT / "rank8_forest_lift_fixed_progress_through_alpha7_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    lane = json.loads(LANE.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert lane["status"] == "PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES"
    assert lane["exceptional_classification"]["distinct_jets"] == 1215
    assert lane["exceptional_classification"]["distinct_negative_Q8_jets"] == 268
    assert lane["exceptional_classification"]["distinct_by_alpha"] == classification["distinct_by_alpha"]

    counts = {int(alpha): int(count) for alpha, count in classification["distinct_by_alpha"].items()}
    assert counts == {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175, 7: 700, 8: 253, 9: 15}

    high1 = json.loads(ALPHA1_HIGH.read_text(encoding="utf-8"))
    low1 = json.loads(ALPHA1_LOW.read_text(encoding="utf-8"))
    for mode, report in (("high", high1), ("low", low1)):
        assert report["status"] == f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
        assert report["range_start"] == 1 and report["range_stop"] == 2 and report["cases"] == 2
        assert [row["index"] for row in report["rows"]] == [1, 2]
        assert all(row["alpha"] == 1 and row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
    assert lane["bounded_certificate"]["negative_coefficients"] == 0
    assert lane["bounded_certificate"]["minimum_coefficient"] == 1

    expected_ranges = {2: [3, 4], 3: [5, 9], 4: [10, 24], 5: [25, 72], 6: [73, 247], 7: [248, 947]}
    bands = [{
        "alpha": 1,
        "count": 2,
        "database_indices": [1, 2],
        "fixed_cone_cases": 4,
        "negative_coefficients": 0,
        "minimum_coefficient": 1,
        "audit": LANE.name,
        "audit_sha256": digest(LANE),
    }]
    coverage = [1, 2]
    for alpha, path in AUDITS.items():
        audit = json.loads(path.read_text(encoding="utf-8"))
        if alpha == 7:
            expected_status = "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA7_BOTH_FULL_CONES"
            range_value = audit["coverage"]["database_indices"]
            count_value = audit["coverage"]["classification_count"]
        else:
            expected_status = f"PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA{alpha}_BOTH_FULL_CONES"
            range_value = audit["no_gap"]["covered_database_indices"]
            count_value = audit["no_gap"][f"classification_alpha{alpha}_count"]
        assert audit["status"] == expected_status
        assert range_value == expected_ranges[alpha]
        assert count_value == counts[alpha]
        assert audit["totals"]["fixed_cone_cases"] == 2 * counts[alpha]
        assert audit["totals"]["negative_coefficients"] == 0
        assert audit["totals"]["minimum_coefficient"] == 1
        coverage.extend(range(range_value[0], range_value[1] + 1))
        bands.append({
            "alpha": alpha,
            "count": counts[alpha],
            "database_indices": range_value,
            "fixed_cone_cases": audit["totals"]["fixed_cone_cases"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "audit": path.name,
            "audit_sha256": digest(path),
        })

    assert coverage == list(range(1, 948))
    assert len(coverage) == len(set(coverage)) == 947
    remaining = counts[8] + counts[9]
    assert remaining == 268
    assert classification["distinct_negative_Q8_jets"] == remaining
    assert sum(counts[alpha] for alpha in range(1, 8)) == 947

    payload = {
        "schema": "rank8-forest-lift-fixed-progress-through-alpha7-v1",
        "status": "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_THROUGH_ALPHA7",
        "input_policy": "All existing forest-lift, classification, and cone certificates were read-only inputs; no master theorem file was edited.",
        "fixed_full_progress": {
            "closed_alpha_bands": [1, 7],
            "closed_exceptional_jets": 947,
            "closed_database_indices": [1, 947],
            "closed_fixed_cone_cases": 1894,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "bands": bands,
        },
        "remaining_fixed_full": {
            "exceptional_jets": remaining,
            "alpha_counts": {"8": counts[8], "9": counts[9]},
            "database_indices": [948, 1215],
            "classification_property": "These 268 jets are exactly all distinct exceptional jets with negative Q8.",
        },
        "forest_lift_dependencies_after_alpha7": [
            "connected Q8 for every tree with alpha>=14",
            "lower all-forest gaps through rank seven, including forest Q7",
            "full/full rank8 high/high, low/high, and low/low convolution cones",
            "fixed-exceptional/high and fixed-exceptional/low for the remaining 268 alpha8/9 jets",
            "exceptional-only first-crossing certificate for total alpha 14 through overshoot 22",
        ],
        "scope_warning": "The integrated fixed/full progress is exact but does not by itself prove connected Q8, all full/full cones, first crossing, forest Q8, PGC, or Delta4.",
        "hashes": {
            CLASSIFICATION.name: digest(CLASSIFICATION),
            LANE.name: digest(LANE),
            ALPHA1_HIGH.name: digest(ALPHA1_HIGH),
            ALPHA1_LOW.name: digest(ALPHA1_LOW),
            **{path.name: digest(path) for path in AUDITS.values()},
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    assert payload["fixed_full_progress"]["closed_fixed_cone_cases"] == 2 * payload["fixed_full_progress"]["closed_exceptional_jets"]
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
