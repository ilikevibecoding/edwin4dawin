#!/usr/bin/env python3
"""Independent fail-closed audit of forest Q8 and rank-eight PGC."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--theorem", required=True)
    parser.add_argument("--expected-theorem-sha256", required=True)
    parser.add_argument(
        "--output",
        default=(
            "rank8_forest_q8_pgc_complete_"
            "independent_audit_root_20260826.json"
        ),
    )
    args = parser.parse_args()
    theorem_path = Path(args.theorem).resolve()
    assert sha256(theorem_path) == args.expected_theorem_sha256.upper()
    theorem = json.loads(theorem_path.read_text(encoding="utf-8"))
    assert theorem["schema"] == "rank8-forest-q8-pgc-complete-root-v1"
    assert theorem["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_RANK8_FOREST_Q8_AND_PGC_COMPLETE"
    )
    docs = {}
    for name, expected in theorem["immutable_inputs"].items():
        path = ROOT / name
        assert path.is_file(), name
        assert sha256(path) == expected, name
        docs[name] = json.loads(path.read_text(encoding="utf-8"))

    assert docs["rank7_final_integration_independent_audit_exact_20260820.json"]["status"] == (
        "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP"
    )
    assert docs["rank8_connected_q8_complete_independent_audit_root_20260826.json"]["checks"][
        "remaining_connected_Q8_cases"
    ] == []
    lane = docs["rank8_forest_lift_lane_independent_audit_exact_20260820.json"]
    assert lane["remaining_exact_inputs"] == [
        "connected Q8 for every tree with alpha>=14",
        "the lower all-forest gaps through rank seven, including forest Q7",
        "full/full rank8 high/high, low/high, and low/low convolution cones",
        "fixed-exceptional/high and fixed-exceptional/low for the remaining 1213 jets",
        "the exceptional-only first-crossing DP, including overshoots through alpha22",
    ]
    assert docs["rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json"]["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    )
    assert docs["rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json"]["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"
    )
    low_low = next(
        report for report in docs.values()
        if report.get("schema") == "rank8-low-low-a23-full-bridge-root-v1"
    )
    low_low_audit = next(
        report for report in docs.values()
        if report.get("schema") == "rank8-low-low-a23-full-bridge-independent-audit-root-v1"
    )
    assert low_low["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_RANK8_LOW_LOW_FULL_CONVOLUTION_CONE"
    )
    assert low_low_audit["checks"]["new_position_universe"] == 521
    assert low_low_audit["checks"]["negative_coefficients_or_unpaid_targets"] == 0

    fixed = docs["rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json"]
    assert fixed["fixed_full_obligation"]["remaining_fixed_full_jets"] == 0
    alpha7 = docs[
        "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json"
    ]
    closure = docs[
        "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json"
    ]
    assert alpha7["coverage"]["source_terminal_cells"] + closure["coverage"]["source_type_cells"] == 7059
    assert closure["independent_aggregate_replay"]["negative_Q8"] == 0
    assert closure["independent_aggregate_replay"]["zero_Q8"] == 0

    forest_partition = theorem["forest_Q8_partition"]
    assert forest_partition["connected_input"] == "complete"
    assert forest_partition["lower_rank_forest_gaps_through_Q7"] == "complete"
    assert set(forest_partition["full_full_cones"]) == {
        "high/high", "low/high", "low/low"
    }
    assert all(value == "complete" for value in forest_partition["full_full_cones"].values())
    assert forest_partition["fixed_full_exceptional_jets"] == 1215
    assert forest_partition["exceptional_first_crossing_cells"] == 7059
    assert forest_partition["gaps"] == forest_partition["overlaps"] == 0

    v8 = docs["rank8_v8_alpha14_finite_reduction_exact_20260816.json"]
    boundary = docs["rank8_pgc_matching_quotient_boundary_exact_20260817.json"]
    identity = docs["general_pgc_qv_decomposition_exact_root_20260826.json"]
    identity_audit = docs[
        "general_pgc_qv_decomposition_independent_audit_root_20260826.json"
    ]
    assert v8["status"] == "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS"
    assert v8["remaining_exact_band"] is None
    assert boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"
    assert boundary["finite_scope"]["no_gap"] is True
    assert identity["rank8_specialization"]["identity"] == (
        "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)"
    )
    assert identity_audit["checks"]["generic_cleared_numerator"] == "0"

    assert theorem["proof_booleans"] == {
        "connected_Q8_complete": True,
        "forest_Q8_complete": True,
        "rank8_PGC_complete": True,
        "higher_rank_PGC_complete": False,
        "problem_993_solved": False,
    }
    payload = {
        "schema": "rank8-forest-q8-pgc-complete-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_FOREST_Q8_"
            "AND_PGC_NO_PARTITION_GAP"
        ),
        "theorem": theorem_path.name,
        "theorem_sha256": args.expected_theorem_sha256.upper(),
        "checks": {
            "full_full_cones": 3,
            "fixed_full_exceptional_jets": 1215,
            "exceptional_first_crossing_cells": 7059,
            "forest_lift_gaps": 0,
            "rank8_pgc_boundary_alpha": [13, 14],
            "rank8_pgc_separated_alpha_floor": 15,
            "higher_rank_scope_not_promoted": True,
        },
        "immutable_inputs_rehashed": len(theorem["immutable_inputs"]),
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print(payload["status"])
    print("REPORT", output, atomic_json(output, payload))


if __name__ == "__main__":
    main()
