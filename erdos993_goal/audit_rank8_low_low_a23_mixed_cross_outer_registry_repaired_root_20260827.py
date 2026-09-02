#!/usr/bin/env python3
"""Independent fail-closed audit of the repaired 124-cell registry merge."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OLD_REGISTRY = (
    "rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json",
    "112D3ED668BA74DBF503AB698444068D6612A04DF5BA8A7917A2B7277FFB4FC7",
)
OLD_AUDIT = (
    "rank8_low_low_a23_mixed_cross_outer_registry_independent_audit_agent_20260823.json",
    "01925AF08A0568E4936DCE82036410EE73E9E1C26F3707D79F6F2A8CACAAB9B8",
)
LABELS = (
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ref(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else HERE / path


def pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def domain() -> list[tuple[str, int, str]]:
    return [
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(2, 18)
        for label in (LABELS if degree <= 16 else LABELS[2:])
    ]


def key(cell: dict) -> tuple[str, int, str]:
    return (
        cell["face_token"],
        cell["total_ordinary_slack_degree"],
        cell["auxiliary"],
    )


def replay_manifest_and_chunks(cell: dict) -> None:
    manifest = pinned(ref(cell["producer_manifest"]), cell["producer_manifest_sha256"])
    assert manifest["face"] == cell["face"]
    assert manifest["auxiliary"] == cell["auxiliary"]
    assert manifest["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    assert manifest["source_sha256"] == cell["producer_source_sha256"]
    result = manifest["result"]
    assert result["negative_terms"] == cell["negative_terms"] == 0
    assert result["ordered_coefficient_sha256"] == cell["ordered_coefficient_sha256"]
    assert result["chunks"] == cell["chunk_files"]
    assert [chunk["outer_exponent"] for chunk in result["chunks"]] == [0, 1, 2]
    for record in result["chunks"]:
        assert record["negative_terms"] == 0
        chunk = pinned(ref(record["path"]), record["sha256"])
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == (
            record["ordered_coefficient_sha256"]
        )
    audit = pinned(ref(cell["audit_report"]), cell["audit_report_sha256"])
    assert audit["source_sha256"] == cell["audit_source_sha256"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", required=True)
    parser.add_argument("--expected-registry-sha256", required=True)
    parser.add_argument("--builder-source", required=True)
    parser.add_argument("--expected-builder-source-sha256", required=True)
    parser.add_argument(
        "--output",
        default=(
            "rank8_low_low_a23_mixed_cross_outer_registry_"
            "independent_audit_root_20260827.json"
        ),
    )
    args = parser.parse_args()

    builder = Path(args.builder_source).resolve()
    assert sha256(builder) == args.expected_builder_source_sha256.upper()
    registry_path = Path(args.registry).resolve()
    registry = pinned(registry_path, args.expected_registry_sha256)
    assert registry["schema"] == "rank8-low-low-a23-mixed-cross-outer-registry-agent-v1"
    assert registry["source_sha256"] == args.expected_builder_source_sha256.upper()
    assert registry["status"] == "CHECKPOINT_124_AUDITED_0_PRODUCER_ONLY_0_MISSING"
    assert registry["required_cell_count"] == 124
    assert registry["sealed_and_independently_audited"] == 124
    assert registry["producer_sealed_audit_missing"] == 0
    assert registry["missing_producer_and_audit"] == 0
    assert [key(cell) for cell in registry["cells"]] == domain()
    assert len({key(cell) for cell in registry["cells"]}) == 124
    assert all(cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED" for cell in registry["cells"])

    old = pinned(HERE / OLD_REGISTRY[0], OLD_REGISTRY[1])
    old_audit = pinned(HERE / OLD_AUDIT[0], OLD_AUDIT[1])
    assert old_audit["registry_sha256"] == OLD_REGISTRY[1]
    assert old_audit["sealed_and_independently_audited"] == 76
    assert old_audit["producer_sealed_audit_missing"] == 0
    assert old_audit["missing_producer_and_audit"] == 48
    old_by_key = {key(cell): cell for cell in old["cells"]}
    current_by_key = {key(cell): cell for cell in registry["cells"]}
    preserved = 0
    for cell_key, old_cell in old_by_key.items():
        if old_cell["state"] != "SEALED_AND_INDEPENDENTLY_AUDITED":
            continue
        current = current_by_key[cell_key]
        for field, value in old_cell.items():
            assert current[field] == value, (cell_key, field)
        replay_manifest_and_chunks(current)
        preserved += 1
    assert preserved == 76

    block_record = registry["repaired_grades8_13_block"]
    block = pinned(ref(block_record["path"]), block_record["sha256"])
    assert block["source_sha256"] == block_record["source_sha256"]
    assert block["status"] == "PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13"
    assert block["expected_cells"] == 48
    assert all(block["checks"].values())
    block_cells = {key(cell): cell for cell in block["assembled_cells"]}
    expected_new = {
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(8, 14)
        for label in LABELS
    }
    assert set(block_cells) == expected_new
    certificate_by_pair = {
        (item["family"], item["total_ordinary_slack_degree"]): item
        for item in block["grade_certificates"]
    }
    assert len(certificate_by_pair) == 12
    for item in certificate_by_pair.values():
        certificate = pinned(ref(item["path"]), item["sha256"])
        assert certificate["source_sha256"] == item["source_sha256"]
        assert sha256(ref(certificate["producer_job"]["path"])) == (
            certificate["producer_job"]["sha256"]
        )
        assert sha256(ref(certificate["independent_audit"]["path"])) == (
            certificate["independent_audit"]["sha256"]
        )

    replayed_new = 0
    common_fields = (
        "face_token", "face", "bridge_corner", "family", "auxiliary",
        "total_ordinary_slack_degree", "producer_manifest",
        "producer_manifest_sha256", "producer_source_sha256",
        "ordered_coefficient_sha256", "negative_terms", "audit_report",
        "audit_report_sha256", "audit_source_sha256",
    )
    for cell_key in sorted(expected_new):
        current = current_by_key[cell_key]
        source = block_cells[cell_key]
        for field in common_fields:
            assert current[field] == source[field], (cell_key, field)
        checkpoint = current["multidegree_family_grade_checkpoint"]
        expected_certificate = certificate_by_pair[
            (current["family"], current["total_ordinary_slack_degree"])
        ]
        for field in (
            "family", "total_ordinary_slack_degree", "exact_base_degree",
            "path", "sha256", "source_sha256", "cells",
        ):
            assert checkpoint[field] == expected_certificate[field]
        assert checkpoint["repaired_grades8_13_block"] == {
            "path": block_record["path"], "sha256": block_record["sha256"]
        }
        replay_manifest_and_chunks(current)
        replayed_new += 1
    assert replayed_new == 48

    for record in registry["immutable_theoretical_inputs"].values():
        assert sha256(ref(record["path"])) == record["sha256"]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-outer-registry-independent-audit-agent-v1",
        "status": (
            "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_"
            "DOMAIN_AND_EVIDENCE_REPLAY"
        ),
        "registry": str(registry_path),
        "registry_sha256": args.expected_registry_sha256.upper(),
        "builder_source": str(builder),
        "builder_source_sha256": args.expected_builder_source_sha256.upper(),
        "required_cell_count": 124,
        "sealed_and_independently_audited": 124,
        "preserved_checkpoint_cells_replayed": 76,
        "repaired_block_cells_replayed": 48,
        "standard_audited_cells_replayed": old_audit["standard_audited_cells_replayed"],
        "factored_audited_cells_replayed": old_audit["factored_audited_cells_replayed"],
        "multidegree_audited_cells_replayed": 48,
        "producer_sealed_audit_missing": 0,
        "missing_producer_and_audit": 0,
        "unique_exact_domain_order": True,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
