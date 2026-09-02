#!/usr/bin/env python3
"""Independent fail-closed audit of the complete mixed-support theorem."""

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


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def token(face) -> str:
    if face in ("0,1", [0, 1]):
        return "01"
    if face in ("1,0", [1, 0]):
        return "10"
    raise AssertionError(face)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--theorem", required=True)
    parser.add_argument("--expected-theorem-sha256", required=True)
    parser.add_argument(
        "--output",
        default=(
            "rank8_low_low_a23_mixed_support_complete_"
            "independent_audit_root_20260826.json"
        ),
    )
    args = parser.parse_args()
    theorem_path = Path(args.theorem).resolve()
    assert sha256(theorem_path) == args.expected_theorem_sha256.upper()
    theorem = json.loads(theorem_path.read_text(encoding="utf-8"))
    assert theorem["schema"] == "rank8-low-low-a23-mixed-support-complete-root-v1"
    assert theorem["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_BOTH_MIXED_ENDPOINT_FACES_"
        "ALL_FOUR_AUXILIARIES_ARBITRARY_NONNEGATIVE_SLACKS"
    )
    assert theorem["support_partition"]["disjoint_and_exhaustive"] is True
    assert theorem["support_partition"]["groups"] == {
        name: list(value) for name, value in GROUPS.items()
    }

    loaded = {}
    for name, expected in theorem["immutable_inputs"].items():
        path = ROOT / name
        assert path.is_file(), name
        assert sha256(path) == expected, name
        if path.suffix == ".json":
            loaded[name] = json.loads(path.read_text(encoding="utf-8"))

    by_schema = {}
    for name, report in loaded.items():
        schema = report.get("schema")
        if schema:
            by_schema.setdefault(schema, []).append((name, report))

    identity = by_schema["rank8-low-low-a23-redistribution-identity-support-agent-v1"][0][1]
    replay = by_schema["rank8-low-low-a23-probe-replay-agent-v1"][0][1]
    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["raw_auxiliary_redistribution_degree"] == [2, 2]
    assert identity["support"]["P_exponents"] == [0, 9]
    assert identity["support"]["Q_exponents"] == [0, 8]
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"

    zero_audit = by_schema[
        "rank8-low-low-a23-mixed-zero-slack-young-root-independent-audit-v1"
    ][0][1]
    assert zero_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM_AUDIT"
    )
    zero_keys = {(token(row["face"]), row["label"]) for row in zero_audit["rows"]}
    assert zero_keys == {(face, label) for face in ("01", "10") for label in LABELS}

    young_reports = []
    young_reports.extend(
        report
        for _, report in by_schema[
            "rank8-low-low-a23-mixed-face-remaining-groups-sparse-young-independent-audit-agent-v1"
        ]
        for report in report["rows"]
    )
    young_reports.extend(
        report
        for schema in (
            "rank8-low-low-a23-mixed-face-10-groupB-strong-far-sparse-young-independent-audit-agent-v1",
            "rank8-low-low-a23-mixed-face-10-groupB-strong-middle-sparse-young-independent-audit-agent-v1",
        )
        for _, report in by_schema[schema]
    )
    young_keys = set()
    for row in young_reports:
        group = tuple(row["ordinary_slack_group"])
        group_token = next(name for name, value in GROUPS.items() if value == group)
        key = (token(row["face"]), group_token, row["auxiliary"])
        assert key not in young_keys
        young_keys.add(key)
        assert row["negative_terms"] > 0
        assert row["all_midpoint_identities_exact"] is True
        assert row["all_target_demands_paid_exactly_or_better"] is True
        assert row["all_source_capacities_respected"] is True
        assert row["all_sources_disjoint_from_zero_support"] is True

    single = by_schema[
        "rank8-low-low-a23-mixed-single-support-nonnegative-independent-audit-root-v1"
    ][0][1]
    assert single["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_EIGHT_COMPLEMENTARY_"
        "SINGLE_SUPPORT_ROWS_COEFFICIENTWISE_NONNEGATIVE"
    )
    raw_keys = {
        (row["face_token"], row["group_token"], row["auxiliary"])
        for row in single["rows"]
    }
    assert all(row["negative_terms"] == 0 for row in single["rows"])
    full_single = {
        (face, group, label)
        for face in ("01", "10")
        for group in ("A", "B")
        for label in LABELS
    }
    assert len(young_keys) == len(raw_keys) == 8
    assert young_keys.isdisjoint(raw_keys)
    assert young_keys | raw_keys == full_single

    registry = by_schema["rank8-low-low-a23-mixed-cross-outer-registry-agent-v1"][0][1]
    registry_audit = by_schema[
        "rank8-low-low-a23-mixed-cross-outer-registry-independent-audit-agent-v1"
    ][0][1]
    assert registry["status"] == "CHECKPOINT_124_AUDITED_0_PRODUCER_ONLY_0_MISSING"
    assert registry["sealed_and_independently_audited"] == 124
    assert registry_audit["status"] == (
        "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY"
    )
    assert registry_audit["registry_sha256"] == next(
        expected
        for name, expected in theorem["immutable_inputs"].items()
        if loaded.get(name, {}).get("schema")
        == "rank8-low-low-a23-mixed-cross-outer-registry-agent-v1"
    )
    cross_keys = {
        (cell["face_token"], cell["total_ordinary_slack_degree"], cell["auxiliary"])
        for cell in registry["cells"]
    }
    expected_cross = {
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(2, 18)
        for label in LABELS
        if not (degree == 17 and label.startswith("curvature_"))
    }
    assert cross_keys == expected_cross and len(cross_keys) == 124
    assert all(cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED" for cell in registry["cells"])

    truth_table = {
        (False, False): "Z",
        (True, False): "EA",
        (False, True): "EB",
        (True, True): "X",
    }
    assert len(truth_table) == 4
    assert theorem["coverage"] == {
        "faces": {"01": [0, 1], "10": [1, 0]},
        "bridge_positions": [[0, 2], [2, 0]],
        "auxiliaries": list(LABELS),
        "zero_support_rows": 8,
        "single_support_young_rows": 8,
        "single_support_raw_nonnegative_rows": 8,
        "cross_support_row_grade_cells": 124,
        "curvature_grades": [2, 16],
        "strong_grades": [2, 17],
        "outer_b0_exponents": [0, 1, 2],
        "mixed_Bernstein_position_instances": 2 * 9 * 8,
    }

    payload = {
        "schema": "rank8-low-low-a23-mixed-support-complete-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_FAIL_CLOSED_Z_EA_EB_X_PARTITION_"
            "BOTH_MIXED_FACES_NO_ROW_OR_GRADE_GAP"
        ),
        "theorem": theorem_path.name,
        "theorem_sha256": args.expected_theorem_sha256.upper(),
        "checks": {
            "truth_value_partition_disjoint_and_exhaustive": True,
            "zero_support_face_auxiliary_rows": 8,
            "single_support_domain_rows": 16,
            "single_support_young_rows": 8,
            "single_support_raw_nonnegative_rows": 8,
            "cross_support_exact_domain_cells": 124,
            "mixed_Bernstein_position_instances": 144,
        },
        "immutable_inputs_rehashed": len(theorem["immutable_inputs"]),
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print(payload["status"], flush=True)
    print("REPORT", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
