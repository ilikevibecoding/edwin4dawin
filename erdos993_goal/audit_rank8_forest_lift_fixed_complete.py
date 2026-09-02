#!/usr/bin/env python3
"""Read-only forest-lift integration after completing all fixed/full cones."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
THROUGH8 = ROOT / "rank8_forest_lift_fixed_progress_through_alpha8_exact_20260820.json"
ALPHA9 = ROOT / "rank8_exceptional_fixed_alpha9_independent_audit_exact_20260820.json"
COMPLETE = ROOT / "rank8_exceptional_fixed_complete_independent_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    through8 = json.loads(THROUGH8.read_text(encoding="utf-8"))
    alpha9 = json.loads(ALPHA9.read_text(encoding="utf-8"))
    complete = json.loads(COMPLETE.read_text(encoding="utf-8"))
    assert through8["status"] == "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_THROUGH_ALPHA8"
    assert alpha9["status"] == "PASS_INDEPENDENT_EXACT_TERMINAL_RANK8_EXCEPTIONAL_FIXED_ALPHA9_BOTH_FULL_CONES"
    assert complete["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_FULL_DATABASE_COMPLETE"
    assert through8["fixed_full_progress"]["closed_exceptional_jets"] == 1200
    assert through8["remaining_fixed_full"]["exceptional_jets"] == 15
    assert alpha9["coverage"]["database_indices"] == [1201, 1215]
    assert alpha9["totals"]["fixed_cone_cases"] == 30
    assert complete["coverage"]["database_indices"] == [1, 1215]
    assert complete["coverage"]["unique_exceptional_jets"] == 1215
    assert complete["totals"]["fixed_cone_cases"] == 2430
    assert complete["totals"]["negative_coefficients"] == 0
    assert complete["totals"]["minimum_coefficient"] == 1
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["distinct_negative_Q8_jets"] == 268

    payload = {
        "schema": "rank8-forest-lift-fixed-full-complete-integration-v1",
        "status": "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_COMPLETE",
        "input_policy": "Existing classification and certificate artifacts were read-only inputs; no master theorem file was edited.",
        "fixed_full_obligation": {
            "status": "COMPLETE",
            "alpha_bands": [1, 9],
            "database_indices": [1, 1215],
            "distinct_exceptional_jets": 1215,
            "fixed_cone_cases": 2430,
            "negative_fixed_Q8_jets_absorbed": 268,
            "negative_symbolic_coefficients": 0,
            "minimum_symbolic_coefficient": 1,
            "remaining_fixed_full_jets": 0,
        },
        "remaining_forest_lift_dependencies": [
            "connected Q8 for every tree with alpha>=14",
            "lower all-forest gaps through rank seven, including forest Q7",
            "full/full rank8 high/high, low/high, and low/low convolution cones",
            "exceptional-only first-crossing certificate for total alpha 14 through overshoot 22",
        ],
        "removed_dependency": "fixed-exceptional/high and fixed-exceptional/low preservation is now complete for every classified exceptional jet",
        "scope_warning": "Completing fixed/full does not prove full/full cones, first crossing, connected Q8, forest Q8, PGC, or Delta4.",
        "hashes": {
            CLASSIFICATION.name: digest(CLASSIFICATION),
            THROUGH8.name: digest(THROUGH8),
            ALPHA9.name: digest(ALPHA9),
            COMPLETE.name: digest(COMPLETE),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
