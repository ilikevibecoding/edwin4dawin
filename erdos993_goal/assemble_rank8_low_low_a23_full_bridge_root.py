#!/usr/bin/env python3
"""Assemble the complete rank-eight low/low a2/a3 redistribution bridge."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = {
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
}
FIXED = {
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json": (
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183"
    ),
    "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json": (
        "784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE"
    ),
    "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json": (
        "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD"
    ),
    "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json": (
        "51EF34F786D4E472C2392766EDF5007EE5CCE5636C53EF81D2426B569D732A79"
    ),
    "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json": (
        "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041"
    ),
    "rank8_low_low_a23_probe_replay_agent_20260822.json": (
        "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB"
    ),
    "rank8_low_low_a23_fast_equivalence_agent_20260822.json": (
        "5B86012EB36F5C007715736921A0B204802340AD37F7484BFD068EBAAF6D1617"
    ),
    "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json": (
        "DF2AE35AD9F3627DA949E5ADE8F36C50D922679A1AF2DF40DA2E00A3F221F0F4"
    ),
    "rank8_low_low_a23_redistribution_interior_complete_independent_audit_root_20260823.json": (
        "9DC856937822DEC180E5F2AF8ACFC6B8E56FF5F41897123BE24A4B59BF098992"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def validate_immutable_inputs(report: dict) -> None:
    for name, expected in report.get("immutable_inputs", {}).items():
        path = ROOT / name
        assert path.is_file(), name
        assert sha256(path) == expected, name


def validate_statistics(statistics: dict) -> None:
    assert statistics["negative"] == 0
    assert statistics.get("first_negative") is None
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mixed-theorem", required=True)
    parser.add_argument("--expected-mixed-theorem-sha256", required=True)
    parser.add_argument("--mixed-audit", required=True)
    parser.add_argument("--expected-mixed-audit-sha256", required=True)
    parser.add_argument(
        "--output",
        default="rank8_low_low_a23_full_bridge_root_20260826.json",
    )
    args = parser.parse_args()

    fixed = {
        name: load_pinned(ROOT / name, expected)
        for name, expected in FIXED.items()
    }
    early = fixed[
        "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"
    ]
    early_audit = fixed[
        "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json"
    ]
    gap0 = fixed[
        "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"
    ]
    gap0_audit = fixed[
        "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json"
    ]
    identity = fixed[
        "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
    ]
    replay = fixed["rank8_low_low_a23_probe_replay_agent_20260822.json"]
    equivalence = fixed["rank8_low_low_a23_fast_equivalence_agent_20260822.json"]
    interior = fixed[
        "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"
    ]
    interior_audit = fixed[
        "rank8_low_low_a23_redistribution_interior_complete_independent_audit_root_20260823.json"
    ]

    assert early["status"] == (
        "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID"
    )
    assert "a3=b3=0" in early["theorem"]
    assert early["outer_cells"] == len(early["rows"]) == 182
    assert all(row["pass"] is True for row in early["rows"])
    assert early_audit["status"] == "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT"
    assert early_audit["negative_coefficients"] == 0
    assert gap0["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE"
    assert gap0["support"] == {
        "a0": [0, 2], "b0": [0, 2],
        "a0_plus_a3": [0, 9], "b0_plus_b3": [0, 8],
    }
    assert gap0["inherited_suffix_cells"] == 90
    assert gap0["computed_positive_early_support_cells"] == 558
    assert gap0["total_disjoint_outer_cells"] == 648
    assert gap0_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT"
    )
    assert gap0_audit["complete_target_universe"] == 558
    assert gap0_audit["total_disjoint_outer_cells"] == 648
    assert gap0_audit["recomputed_total_exact_coefficients"] == gap0["total_exact_coefficients"]

    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["raw_auxiliary_redistribution_degree"] == [2, 2]
    assert identity["support"]["P_exponents"] == [0, 9]
    assert identity["support"]["Q_exponents"] == [0, 8]
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    assert replay["row_builder_replay"]["exact_equalities"] == 126
    assert replay["bernstein_conversion_replay"]["exact_position_equalities"] == 18
    assert equivalence["status"] == "PASS_EXACT_A23_FAST_PROBE_EQUIVALENCE_AUDIT"
    assert all(row["exact_parsed_output_match"] for row in equivalence["sealed_output_replays"])

    assert interior["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED"
    assert interior["universe"] == {
        "outer_expansion_units": 89,
        "cached_prefix_units": 85,
        "streamed_tail_units": 4,
        "both_positive_units": 72,
        "axis_units": 17,
        "retained_positions": 377,
        "separate_mixed_face_positions": 144,
        "original_position_universe": 521,
    }
    assert interior["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
    for statistics in interior["global_aggregates"].values():
        validate_statistics(statistics)
    assert interior_audit["status"] == "PASS_INDEPENDENT_A23_377_POSITION_ASSEMBLY_AUDIT"
    assert interior_audit["coverage"] == {
        "outer_expansion_units_reconstructed": 89,
        "retained_positions_reconstructed": 377,
        "mixed_positions_excluded": 144,
        "all_statistics_reaggregated": True,
        "scanner_sealed_axis_cells": 4,
        "scanner_exact_label_replays": 16,
    }
    assert interior_audit["assembled_report_sha256"] == FIXED[
        "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"
    ]
    validate_immutable_inputs(interior_audit)

    mixed_path = Path(args.mixed_theorem).resolve()
    mixed = load_pinned(mixed_path, args.expected_mixed_theorem_sha256)
    assert mixed["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_BOTH_MIXED_ENDPOINT_FACES_"
        "ALL_FOUR_AUXILIARIES_ARBITRARY_NONNEGATIVE_SLACKS"
    )
    assert mixed["coverage"]["bridge_positions"] == [[0, 2], [2, 0]]
    assert set(mixed["coverage"]["auxiliaries"]) == LABELS
    assert mixed["coverage"]["mixed_Bernstein_position_instances"] == 144
    validate_immutable_inputs(mixed)
    mixed_audit_path = Path(args.mixed_audit).resolve()
    mixed_audit = load_pinned(mixed_audit_path, args.expected_mixed_audit_sha256)
    assert mixed_audit["status"] == (
        "PASS_INDEPENDENT_FAIL_CLOSED_Z_EA_EB_X_PARTITION_"
        "BOTH_MIXED_FACES_NO_ROW_OR_GRADE_GAP"
    )
    assert mixed_audit["theorem_sha256"] == args.expected_mixed_theorem_sha256.upper()
    assert mixed_audit["checks"]["mixed_Bernstein_position_instances"] == 144

    assert 377 + 144 == 521
    payload = {
        "schema": "rank8-low-low-a23-full-bridge-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_LOW_LOW_FULL_CONVOLUTION_CONE",
        "theorem": (
            "All four rank-eight low/low auxiliary polynomials are nonnegative "
            "for arbitrary nonnegative h,ta,tb and all adjusted gap slacks."
        ),
        "proof_partition": {
            "redistribution_coordinates": identity["coordinates"],
            "tensor_Bernstein_degree": [2, 2],
            "diagonal_endpoint_0_0": early["theorem"],
            "diagonal_endpoint_2_2": "a2=b2=0 suffix-3/gap-zero face",
            "new_position_universe": 521,
            "mixed_positions": 144,
            "complement_positions": 377,
            "position_partition_disjoint_and_exhaustive": True,
        },
        "coverage": {
            "auxiliaries": sorted(LABELS),
            "P_exponents": [0, 9],
            "Q_exponents": [0, 8],
            "outer_expansion_units": 89,
            "new_Bernstein_positions": 521,
            "negative_coefficients_or_unpaid_targets": 0,
        },
        "immutable_inputs": {
            **FIXED,
            mixed_path.name: args.expected_mixed_theorem_sha256.upper(),
            mixed_audit_path.name: args.expected_mixed_audit_sha256.upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the rank-eight low/low convolution cone. Connected-Q8, "
            "forest-Q8, rank-eight PGC integration, and higher ranks are separate "
            "theorem steps."
        ),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", output, sha256(output), flush=True)


if __name__ == "__main__":
    main()
