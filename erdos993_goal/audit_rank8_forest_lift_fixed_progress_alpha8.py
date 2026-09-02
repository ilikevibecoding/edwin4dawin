#!/usr/bin/env python3
"""Read-only forest-lift integration of fixed/full progress through alpha=8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
THROUGH7 = ROOT / "rank8_forest_lift_fixed_progress_through_alpha7_exact_20260820.json"
ALPHA8 = ROOT / "rank8_exceptional_fixed_alpha8_independent_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_forest_lift_fixed_progress_through_alpha8_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    through7 = json.loads(THROUGH7.read_text(encoding="utf-8"))
    alpha8 = json.loads(ALPHA8.read_text(encoding="utf-8"))
    assert through7["status"] == "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_THROUGH_ALPHA7"
    assert alpha8["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA8_BOTH_FULL_CONES"
    assert through7["fixed_full_progress"]["closed_exceptional_jets"] == 947
    assert through7["fixed_full_progress"]["closed_database_indices"] == [1, 947]
    assert through7["fixed_full_progress"]["closed_fixed_cone_cases"] == 1894
    assert alpha8["coverage"]["classification_count"] == 253
    assert alpha8["coverage"]["database_indices"] == [948, 1200]
    assert alpha8["totals"]["fixed_cone_cases"] == 506
    assert alpha8["totals"]["negative_coefficients"] == 0
    assert alpha8["totals"]["minimum_coefficient"] == 1
    assert alpha8["totals"]["fixed_Q8_negative_jets"] == 253
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["distinct_by_alpha"]["9"] == 15
    assert classification["distinct_negative_Q8_jets"] == 268

    payload = {
        "schema": "rank8-forest-lift-fixed-progress-through-alpha8-v1",
        "status": "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_THROUGH_ALPHA8",
        "input_policy": "Existing certificates were read-only inputs; no master theorem file was edited.",
        "fixed_full_progress": {
            "closed_alpha_bands": [1, 8],
            "closed_exceptional_jets": 1200,
            "closed_database_indices": [1, 1200],
            "closed_fixed_cone_cases": 2400,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "negative_fixed_Q8_jets_absorbed": 253,
        },
        "remaining_fixed_full": {
            "exceptional_jets": 15,
            "alpha_counts": {"9": 15},
            "database_indices": [1201, 1215],
            "classification_property": "These are the remaining distinct exceptional jets with negative Q8.",
        },
        "forest_lift_dependencies_after_alpha8": [
            "connected Q8 for every tree with alpha>=14",
            "lower all-forest gaps through rank seven, including forest Q7",
            "full/full rank8 high/high, low/high, and low/low convolution cones",
            "fixed-exceptional/high and fixed-exceptional/low for the remaining 15 alpha9 jets",
            "exceptional-only first-crossing certificate for total alpha 14 through overshoot 22",
        ],
        "scope_warning": "This integration does not certify alpha=9 fixed/full, full/full cones, first crossing, connected Q8, forest Q8, PGC, or Delta4.",
        "hashes": {
            CLASSIFICATION.name: digest(CLASSIFICATION),
            THROUGH7.name: digest(THROUGH7),
            ALPHA8.name: digest(ALPHA8),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    assert payload["fixed_full_progress"]["closed_exceptional_jets"] + payload["remaining_fixed_full"]["exceptional_jets"] == 1215
    assert payload["fixed_full_progress"]["closed_fixed_cone_cases"] == 2 * payload["fixed_full_progress"]["closed_exceptional_jets"]
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
