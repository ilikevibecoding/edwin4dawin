#!/usr/bin/env python3
"""Fail-closed Z/EA/EB/X assembler for both rank-eight mixed faces."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = (
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
)
GROUPS = {
    "A": ("a0", "b4", "b5", "b6", "b7"),
    "B": ("a4", "a5", "a6", "a7", "b0"),
}
FIXED = {
    "RANK8_LOW_LOW_A23_MIXED_SUPPORT_PARTITION_LEMMA_AGENT_20260822.md": (
        "DF20D8019F2C8AB7CA2A9285524C124DD745C492E1E52D877D613649533D960E"
    ),
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md": (
        "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E"
    ),
    "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json": (
        "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041"
    ),
    "rank8_low_low_a23_probe_replay_agent_20260822.json": (
        "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB"
    ),
    "rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json": (
        "D1111D2667D14ABA2795C873A63059EA3E132FDEE56850AEB12233C7AF6F2A71"
    ),
    "rank8_low_low_a23_mixed_zero_slack_young_root_independent_audit_20260822.json": (
        "6C759DB724254197FAD8897955317ED0AB12CD831BD49A00954E7DF274A941C5"
    ),
    "rank8_low_low_a23_mixed_face_remaining_groups_sparse_young_independent_audit_agent_20260822.json": (
        "1E59A0396F96CFD3F1AFF7E5B267E9C1B9A30D859DEEE4495A6E10416EF60E4B"
    ),
    "rank8_low_low_a23_mixed_face_10_groupB_strong_far_sparse_young_independent_audit_agent_20260822.json": (
        "6899BED3A63884137DBA50985CE7153C54FB51363F2B1622332FCD7602299201"
    ),
    "rank8_low_low_a23_mixed_face_10_groupB_strong_middle_sparse_young_independent_audit_agent_20260822.json": (
        "B27EF0275F3630A5FC42CF7563D502E4D4912A871ADD391A04D4A7A85AD4263C"
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


def face_token(value) -> str:
    if value in ("0,1", [0, 1], (0, 1)):
        return "01"
    if value in ("1,0", [1, 0], (1, 0)):
        return "10"
    raise AssertionError(value)


def validate_registry(registry: dict) -> None:
    assert registry["schema"] == "rank8-low-low-a23-mixed-cross-outer-registry-agent-v1"
    assert registry["status"] == "CHECKPOINT_124_AUDITED_0_PRODUCER_ONLY_0_MISSING"
    assert registry["required_cell_count"] == 124
    assert registry["sealed_and_independently_audited"] == 124
    assert registry["producer_sealed_audit_missing"] == 0
    assert registry["missing_producer_and_audit"] == 0
    expected = {
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(2, 18)
        for label in LABELS
        if not (degree == 17 and label.startswith("curvature_"))
    }
    keys = set()
    for cell in registry["cells"]:
        key = (
            cell["face_token"],
            cell["total_ordinary_slack_degree"],
            cell["auxiliary"],
        )
        assert key not in keys
        keys.add(key)
        assert cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED"
        assert cell["family"] == (
            "curvature" if cell["auxiliary"].startswith("curvature_") else "strong"
        )
        manifest = ROOT / cell["producer_manifest"]
        audit = ROOT / cell["audit_report"]
        assert sha256(manifest) == cell["producer_manifest_sha256"]
        assert sha256(audit) == cell["audit_report_sha256"]
        for chunk in cell["chunk_files"]:
            assert chunk["negative_terms"] == 0
            assert sha256(Path(chunk["path"])) == chunk["sha256"]
        if "multidegree_family_grade_checkpoint" in cell:
            checkpoint = cell["multidegree_family_grade_checkpoint"]
            assert sha256(ROOT / checkpoint["path"]) == checkpoint["sha256"]
        if "factored_face_grade_checkpoint" in cell:
            checkpoint = cell["factored_face_grade_checkpoint"]
            assert sha256(ROOT / checkpoint["path"]) == checkpoint["sha256"]
    assert keys == expected and len(keys) == 124
    for record in registry["immutable_theoretical_inputs"].values():
        assert sha256(ROOT / record["path"]) == record["sha256"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--expected-registry-sha256", required=True)
    parser.add_argument("--registry-audit", required=True)
    parser.add_argument("--expected-registry-audit-sha256", required=True)
    parser.add_argument(
        "--single-support-audit",
        default=(
            "rank8_low_low_a23_mixed_single_support_nonnegative_"
            "independent_audit_root_20260826.json"
        ),
    )
    parser.add_argument("--expected-single-support-audit-sha256", required=True)
    parser.add_argument(
        "--output",
        default="rank8_low_low_a23_mixed_support_complete_root_20260826.json",
    )
    args = parser.parse_args()

    fixed = {
        name: load_pinned(ROOT / name, expected)
        for name, expected in FIXED.items()
        if name.endswith(".json")
    }
    for name, expected in FIXED.items():
        assert sha256(ROOT / name) == expected

    zero = fixed["rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json"]
    zero_audit = fixed[
        "rank8_low_low_a23_mixed_zero_slack_young_root_independent_audit_20260822.json"
    ]
    six = fixed[
        "rank8_low_low_a23_mixed_face_remaining_groups_sparse_young_independent_audit_agent_20260822.json"
    ]
    far10b = fixed[
        "rank8_low_low_a23_mixed_face_10_groupB_strong_far_sparse_young_independent_audit_agent_20260822.json"
    ]
    middle10b = fixed[
        "rank8_low_low_a23_mixed_face_10_groupB_strong_middle_sparse_young_independent_audit_agent_20260822.json"
    ]
    identity = fixed[
        "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
    ]
    identity_replay = fixed["rank8_low_low_a23_probe_replay_agent_20260822.json"]
    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["raw_auxiliary_redistribution_degree"] == [2, 2]
    assert identity["support"]["P_exponents"] == [0, 9]
    assert identity["support"]["Q_exponents"] == [0, 8]
    assert identity_replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    assert identity_replay["row_builder_replay"]["exact_equalities"] == 126
    assert identity_replay["bernstein_conversion_replay"]["exact_position_equalities"] == 18
    assert zero["status"] == "PASS_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM"
    assert zero_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM_AUDIT"
    )
    assert zero_audit["identity_rechecked"] == (
        "For every allocation L+H=2T and "
        "4*low_cost*high_cost=payment^2, so weighted AM-GM pays "
        "payment*x^T. Target demand and shared source capacity "
        "inequalities were recomputed with Fraction exactly."
    )
    validate_immutable_inputs(zero_audit)
    zero_keys = {(face_token(row["face"]), row["label"]) for row in zero_audit["rows"]}
    assert zero_keys == {(face, label) for face in ("01", "10") for label in LABELS}

    assert six["status"] == "PASS_INDEPENDENT_EXACT_RATIONAL_PAYMENT_REPLAY_ALL_SIX_GROUP_ROWS"
    assert far10b["status"] == "PASS_INDEPENDENT_EXACT_RATIONAL_PAYMENT_REPLAY"
    assert middle10b["status"] == "PASS_INDEPENDENT_EXACT_RATIONAL_PAYMENT_REPLAY"
    for report in (six, far10b, middle10b):
        validate_immutable_inputs(report)

    young_rows = list(six["rows"]) + [far10b, middle10b]
    young_keys = set()
    for row in young_rows:
        token = face_token(row["face"])
        group = tuple(row["ordinary_slack_group"])
        group_name = next(name for name, value in GROUPS.items() if value == group)
        key = (token, group_name, row["auxiliary"])
        assert key not in young_keys
        young_keys.add(key)
        assert row["negative_terms"] > 0
        assert row["all_midpoint_identities_exact"] is True
        assert row["all_reported_coefficients_match_rebuilt_polynomial"] is True
        assert row["all_target_demands_paid_exactly_or_better"] is True
        assert row["all_source_capacities_respected"] is True
        assert row["all_sources_disjoint_from_zero_support"] is True

    single_path = Path(args.single_support_audit).resolve()
    single = load_pinned(single_path, args.expected_single_support_audit_sha256)
    assert single["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_EIGHT_COMPLEMENTARY_"
        "SINGLE_SUPPORT_ROWS_COEFFICIENTWISE_NONNEGATIVE"
    )
    validate_immutable_inputs(single)
    raw_keys = {
        (row["face_token"], row["group_token"], row["auxiliary"])
        for row in single["rows"]
    }
    assert len(raw_keys) == 8
    assert all(row["negative_terms"] == 0 for row in single["rows"])
    complete_single = {
        (face, group, label)
        for face in ("01", "10")
        for group in ("A", "B")
        for label in LABELS
    }
    assert young_keys.isdisjoint(raw_keys)
    assert young_keys | raw_keys == complete_single

    registry_path = Path(args.registry).resolve()
    registry = load_pinned(registry_path, args.expected_registry_sha256)
    validate_registry(registry)
    registry_audit_path = Path(args.registry_audit).resolve()
    registry_audit = load_pinned(
        registry_audit_path, args.expected_registry_audit_sha256
    )
    assert registry_audit["status"] == (
        "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY"
    )
    assert registry_audit["registry_sha256"] == args.expected_registry_sha256.upper()
    assert registry_audit["required_cell_count"] == 124
    assert registry_audit["sealed_and_independently_audited"] == 124
    assert registry_audit["producer_sealed_audit_missing"] == 0
    assert registry_audit["missing_producer_and_audit"] == 0
    assert registry_audit["unique_exact_domain_order"] is True

    payload = {
        "schema": "rank8-low-low-a23-mixed-support-complete-root-v1",
        "status": (
            "PASS_EXACT_AND_INDEPENDENT_BOTH_MIXED_ENDPOINT_FACES_"
            "ALL_FOUR_AUXILIARIES_ARBITRARY_NONNEGATIVE_SLACKS"
        ),
        "theorem": (
            "On each normalized mixed endpoint face (z,w)=(0,1),(1,0), all "
            "four rank-eight low/low auxiliary polynomials are nonnegative for "
            "all nonnegative h,ta,tb,P,Q and all ten ordinary gap slacks."
        ),
        "support_partition": {
            "Z": "empty ordinary-slack support; exact Young certificate and independent replay",
            "EA": "nonempty support contained in A; eight Young/raw rows jointly exhaustive with EB",
            "EB": "nonempty support contained in B; eight Young/raw rows jointly exhaustive with EA",
            "X": "support meeting A and B; 124 exact row-grade cells independently audited",
            "disjoint_and_exhaustive": True,
            "groups": {name: list(value) for name, value in GROUPS.items()},
        },
        "coverage": {
            "faces": {"01": [0, 1], "10": [1, 0]},
            "bridge_positions": [[0, 2], [2, 0]],
            "auxiliaries": list(LABELS),
            "zero_support_rows": len(zero_keys),
            "single_support_young_rows": len(young_keys),
            "single_support_raw_nonnegative_rows": len(raw_keys),
            "cross_support_row_grade_cells": 124,
            "curvature_grades": [2, 16],
            "strong_grades": [2, 17],
            "outer_b0_exponents": [0, 1, 2],
            "mixed_Bernstein_position_instances": 144,
        },
        "immutable_inputs": {
            **FIXED,
            single_path.name: args.expected_single_support_audit_sha256.upper(),
            registry_path.name: args.expected_registry_sha256.upper(),
            registry_audit_path.name: args.expected_registry_audit_sha256.upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the two mixed positions of the rank-eight low/low "
            "a2/a3 redistribution bridge. The 377-position complement and the "
            "two diagonal endpoint faces remain separate inputs to the full "
            "low/low bridge assembler."
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
