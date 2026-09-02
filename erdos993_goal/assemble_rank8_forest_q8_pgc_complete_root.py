#!/usr/bin/env python3
"""Assemble forest Q8 and the rank-eight pendant PGC step."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FIXED = {
    "rank7_integration_readonly_20260820.json": (
        "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
        "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER",
    ),
    "rank7_final_integration_independent_audit_exact_20260820.json": (
        "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
        "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP",
    ),
    "rank8_connected_q8_complete_root_20260826.json": (
        "6E7820CD50171C3A24D33F4F0050BFBD8C4EEDBE1374387691AA3646EC1475DD",
        "PASS_EXACT_AND_INDEPENDENT_RANK8_CONNECTED_Q8_ALL_TREES_ALPHA_AT_LEAST_14",
    ),
    "rank8_connected_q8_complete_independent_audit_root_20260826.json": (
        "F66F4EB0D37320968A357484AC70656C55F073106D578E810539F682C5566EE5",
        "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_CONNECTED_Q8_NO_ORDER_OR_RANK_GAP",
    ),
    "rank8_forest_lift_lane_independent_audit_exact_20260820.json": (
        "6DC960E80727BF64941C9F0C02AC37E459F5444DB986DD780B8A22829F371FA0",
        "PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES",
    ),
    "rank8_high_high_mlr_convolution_exact_20260820.json": (
        "B3C617BB8B46E7C4C830882F12A1A6000388588F759B35FC53AD4FF300C9B6FF",
        "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json": (
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
        "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_low_high_full_cone_direct_h_exact_20260821.json": (
        "DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5",
        "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json": (
        "EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5",
        "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json": (
        "591A2793682BF79D0E1241258DB1F0F385B94219577FDFC00C3705DA3FA6E2EF",
        "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_COMPLETE",
    ),
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json": (
        "7CF5B21D18CD0D9B208F1D36ABC2E8FEF4947F942CBC291872705B99AB1E5768",
        "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_COMPLETE",
    ),
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json": (
        "9B9CA836AB13AE52D969F681C6DFF8E0CD9FB01B74E85E32E7165076E80F2E0E",
        "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_ASSEMBLY_AUDIT",
    ),
    "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json": (
        "E0BE16DFDC987E0886C79AF7AC844A1E854DE11C27B434629BF6A14C9DAF23AD",
        "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
    ),
    "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json": (
        "CF029B8CA26AC83FB86C8222F4852B30A8FC95596B181DE20AE411B0F8925168",
        "PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
    ),
    "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json": (
        "528175C118497AE27B8BC3C2B1F065DFC4D9A9DC6C78EB18F9D8C6B1A3169887",
        "PASS_EXACT_HASH_PINNED_INDEPENDENT_AGGREGATE_REPLAY_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALL_2159_CLOSURE_AUDIT_AGENT",
    ),
    "rank8_v8_alpha14_finite_reduction_exact_20260816.json": (
        "6E7706445F2AB7161880489E8EDA56AE5F6395620545B813DE0D6E83D6133BF3",
        "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS",
    ),
    "rank8_pgc_matching_quotient_boundary_exact_20260817.json": (
        "E61C51E0D37569C617DBE23AC3E88BA1A89DD188B3FC629264303714D1679A85",
        "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS",
    ),
    "general_pgc_qv_decomposition_exact_root_20260826.json": (
        "959D7D85D41482AF7F8EF091C42837602197297AFC6104A7862A4E5C2F9F9DCE",
        "PASS_EXACT_ALL_RANK_PENDANT_PGC_Q_V_DECOMPOSITION",
    ),
    "general_pgc_qv_decomposition_independent_audit_root_20260826.json": (
        "03F85DCBFB100BA1EC7C87729F094AD514EA76EC6E7C742EF513F985BBA1A782",
        "PASS_INDEPENDENT_CLEARED_NUMERATOR_ALL_RANK_PGC_Q_V_IDENTITY_AUDIT",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path, expected_hash: str, expected_status: str) -> dict:
    assert sha256(path) == expected_hash, path.name
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["status"] == expected_status, path.name
    return report


def validate_immutable_inputs(report: dict) -> None:
    for name, expected in report.get("immutable_inputs", {}).items():
        path = ROOT / name
        assert path.is_file(), name
        assert sha256(path) == expected, name


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--low-low-theorem", required=True)
    parser.add_argument("--expected-low-low-theorem-sha256", required=True)
    parser.add_argument("--low-low-audit", required=True)
    parser.add_argument("--expected-low-low-audit-sha256", required=True)
    parser.add_argument(
        "--output", default="rank8_forest_q8_pgc_complete_root_20260826.json"
    )
    args = parser.parse_args()
    docs = {
        name: load(ROOT / name, expected_hash, status)
        for name, (expected_hash, status) in FIXED.items()
    }

    rank7 = docs["rank7_integration_readonly_20260820.json"]
    rank7_audit = docs["rank7_final_integration_independent_audit_exact_20260820.json"]
    assert "no remaining order or scope gap" in rank7["conclusion"]
    assert rank7_audit["dependency_chain"] and all(rank7_audit["dependency_chain"].values())

    connected = docs["rank8_connected_q8_complete_root_20260826.json"]
    connected_audit = docs[
        "rank8_connected_q8_complete_independent_audit_root_20260826.json"
    ]
    validate_immutable_inputs(connected)
    assert connected_audit["assembly"]["sha256"] == FIXED[
        "rank8_connected_q8_complete_root_20260826.json"
    ][0]

    lane = docs["rank8_forest_lift_lane_independent_audit_exact_20260820.json"]
    assert lane["full_factor_cones"]["pair_cases"] == [
        "high/high", "low/high", "low/low"
    ]
    assert lane["exceptional_classification"]["distinct_jets"] == 1215
    assert lane["exceptional_classification"]["maximum_exceptional_alpha"] == 9
    fixed_full = docs[
        "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json"
    ]
    assert fixed_full["fixed_full_obligation"]["status"] == "COMPLETE"
    assert fixed_full["fixed_full_obligation"]["remaining_fixed_full_jets"] == 0

    low_low_path = Path(args.low_low_theorem).resolve()
    assert sha256(low_low_path) == args.expected_low_low_theorem_sha256.upper()
    low_low = json.loads(low_low_path.read_text(encoding="utf-8"))
    assert low_low["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_RANK8_LOW_LOW_FULL_CONVOLUTION_CONE"
    )
    validate_immutable_inputs(low_low)
    low_low_audit_path = Path(args.low_low_audit).resolve()
    assert sha256(low_low_audit_path) == args.expected_low_low_audit_sha256.upper()
    low_low_audit = json.loads(low_low_audit_path.read_text(encoding="utf-8"))
    assert low_low_audit["status"] == (
        "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_LOW_LOW_"
        "FULL_BRIDGE_EXACT_521_POSITION_UNIVERSE"
    )
    assert low_low_audit["theorem_sha256"] == args.expected_low_low_theorem_sha256.upper()

    alpha7 = docs[
        "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json"
    ]
    alpha7_audit = docs[
        "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json"
    ]
    assert alpha7["coverage"]["source_terminal_cells"] == 4900
    assert alpha7_audit["remaining_scope"]["exceptional_first_crossing_terminal_alpha"] == [8, 9]
    design = docs[
        "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"
    ]
    assert design["aggregate"]["remaining_source_type_cells"] == 2159
    closure = docs[
        "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json"
    ]
    assert closure["coverage"]["source_type_cells"] == 2159
    assert closure["coverage"]["terminal_alpha8_cells"] == 2024
    assert closure["coverage"]["terminal_alpha9_cells"] == 135
    assert closure["independent_aggregate_replay"]["negative_Q8"] == 0
    assert closure["independent_aggregate_replay"]["zero_Q8"] == 0
    assert 4900 + 2159 == 7059

    v8 = docs["rank8_v8_alpha14_finite_reduction_exact_20260816.json"]
    assert v8["remaining_exact_band"] is None
    assert v8["large_order"]["n30_normalized_V8_margin"] == "7787/12921"
    boundary = docs["rank8_pgc_matching_quotient_boundary_exact_20260817.json"]
    assert boundary["finite_scope"]["no_gap"] is True
    assert boundary["finite_scope"]["matrix_cell_count"] == 18
    assert boundary["coverage_totals_above_order18"]["coupled_negative_states"] == 0
    qv = docs["general_pgc_qv_decomposition_exact_root_20260826.json"]
    qv_audit = docs[
        "general_pgc_qv_decomposition_independent_audit_root_20260826.json"
    ]
    assert qv["rank8_specialization"]["identity"] == (
        "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)"
    )
    assert qv_audit["primary_sha256"] == FIXED[
        "general_pgc_qv_decomposition_exact_root_20260826.json"
    ][0]

    payload = {
        "schema": "rank8-forest-q8-pgc-complete-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_FOREST_Q8_AND_PGC_COMPLETE",
        "forest_Q8_theorem": (
            "Q8(F)>=0 for every forest F with independence number at least 14."
        ),
        "forest_Q8_partition": {
            "connected_input": "complete",
            "lower_rank_forest_gaps_through_Q7": "complete",
            "full_full_cones": {
                "high/high": "complete",
                "low/high": "complete",
                "low/low": "complete",
            },
            "fixed_full_exceptional_jets": 1215,
            "exceptional_first_crossing_cells": 7059,
            "gaps": 0,
            "overlaps": 0,
        },
        "rank8_PGC_theorem": (
            "The pendant GSB/PGC step H8>=0 holds for every forest in its "
            "required independence-number range."
        ),
        "rank8_PGC_partition": {
            "alpha_13_14": "exact coupled boundary theorem",
            "alpha_at_least_15": (
                "rank7 H7 plus forest Q8(G), V8(G-{leaf,parent}), and c7>=0 "
                "in the exact pendant Q+V identity"
            ),
            "pendant_deletion_alpha_relation": (
                "alpha(G-{leaf,parent})=alpha(G)-1; replace parent by leaf in "
                "a maximum independent set when necessary"
            ),
            "edgeless_forests": "binomial independence polynomial, immediate",
        },
        "proof_booleans": {
            "connected_Q8_complete": True,
            "forest_Q8_complete": True,
            "rank8_PGC_complete": True,
            "higher_rank_PGC_complete": False,
            "problem_993_solved": False,
        },
        "immutable_inputs": {
            **{name: value[0] for name, value in FIXED.items()},
            low_low_path.name: args.expected_low_low_theorem_sha256.upper(),
            low_low_audit_path.name: args.expected_low_low_audit_sha256.upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This completes rank eight only. A uniform higher-rank PGC/cascade "
            "argument or a counterexample is still required to resolve Erdos "
            "Problem 993."
        ),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"])
    print("REPORT", output, sha256(output))


if __name__ == "__main__":
    main()
