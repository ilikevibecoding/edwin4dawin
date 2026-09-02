#!/usr/bin/env python3
"""Merge the sealed 76-cell checkpoint with the repaired 48-cell block."""

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
OLD_BUILDER_SHA256 = (
    "7B6D1FF53BCC9F7788E960C429990DC70BC3DA63355CC42B01736ABF4A13D45A"
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


def load_pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def labels_for_degree(degree: int) -> tuple[str, ...]:
    return LABELS if degree <= 16 else LABELS[2:]


def expected_domain() -> list[tuple[str, int, str]]:
    return [
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(2, 18)
        for label in labels_for_degree(degree)
    ]


def normalized_chunks(manifest: dict) -> list[dict]:
    chunks = manifest["result"]["chunks"]
    assert [item["outer_exponent"] for item in chunks] == [0, 1, 2]
    for item in chunks:
        assert item["negative_terms"] == 0
        chunk = load_pinned(ref(item["path"]), item["sha256"])
        assert chunk["chunk"]["negative_terms"] == 0
        assert chunk["chunk"]["ordered_coefficient_sha256"] == (
            item["ordered_coefficient_sha256"]
        )
    return chunks


def validate_and_normalize_cell(cell: dict) -> dict:
    manifest = load_pinned(ref(cell["producer_manifest"]), cell["producer_manifest_sha256"])
    assert manifest["face"] == cell["face"]
    assert manifest["auxiliary"] == cell["auxiliary"]
    assert manifest["total_ordinary_slack_degree"] == cell["total_ordinary_slack_degree"]
    manifest_negative_terms = manifest["result"]["negative_terms"]
    assert manifest_negative_terms == 0
    if "negative_terms" in cell:
        assert cell["negative_terms"] == manifest_negative_terms
    assert manifest["result"]["ordered_coefficient_sha256"] == (
        cell["ordered_coefficient_sha256"]
    )
    assert manifest["source_sha256"] == cell["producer_source_sha256"]
    assert sha256(ref(cell["audit_report"])) == cell["audit_report_sha256"]
    return {
        **cell,
        "negative_terms": manifest_negative_terms,
        "chunk_files": normalized_chunks(manifest),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--block", required=True)
    parser.add_argument("--expected-block-sha256", required=True)
    parser.add_argument(
        "--output",
        default="rank8_low_low_a23_mixed_cross_outer_registry_root_20260827.json",
    )
    args = parser.parse_args()

    old = load_pinned(HERE / OLD_REGISTRY[0], OLD_REGISTRY[1])
    assert old["schema"] == "rank8-low-low-a23-mixed-cross-outer-registry-agent-v1"
    assert old["source_sha256"] == OLD_BUILDER_SHA256
    assert old["status"] == "CHECKPOINT_76_AUDITED_0_PRODUCER_ONLY_48_MISSING"
    assert old["sealed_and_independently_audited"] == 76
    assert old["producer_sealed_audit_missing"] == 0
    assert old["missing_producer_and_audit"] == 48

    block_path = Path(args.block).resolve()
    block = load_pinned(block_path, args.expected_block_sha256)
    assert block["status"] == "PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13"
    assert block["expected_cells"] == len(block["assembled_cells"]) == 48
    assert len(block["grade_certificates"]) == 12
    assert all(block["checks"].values())
    certificate_by_pair = {
        (item["family"], item["total_ordinary_slack_degree"]): item
        for item in block["grade_certificates"]
    }
    assert len(certificate_by_pair) == 12
    block_cells = {
        (cell["face_token"], cell["total_ordinary_slack_degree"], cell["auxiliary"]): cell
        for cell in block["assembled_cells"]
    }
    assert len(block_cells) == 48
    expected_block_keys = {
        (face, degree, label)
        for face in ("01", "10")
        for degree in range(8, 14)
        for label in LABELS
    }
    assert set(block_cells) == expected_block_keys

    old_by_key = {
        (cell["face_token"], cell["total_ordinary_slack_degree"], cell["auxiliary"]): cell
        for cell in old["cells"]
    }
    assert list(old_by_key) == expected_domain()
    merged = []
    for key in expected_domain():
        old_cell = old_by_key[key]
        if old_cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED":
            assert key not in block_cells
            merged.append(validate_and_normalize_cell(old_cell))
            continue
        assert old_cell["state"] == "MISSING_PRODUCER_AND_AUDIT"
        assert key in block_cells
        raw = block_cells[key]
        family = raw["family"]
        grade = raw["total_ordinary_slack_degree"]
        certificate_record = certificate_by_pair[(family, grade)]
        certificate = load_pinned(
            ref(certificate_record["path"]), certificate_record["sha256"]
        )
        producer = certificate["producer_job"]
        audit = certificate["independent_audit"]
        assert sha256(ref(producer["path"])) == producer["sha256"]
        assert sha256(ref(audit["path"])) == audit["sha256"]
        cell = {
            "face_token": raw["face_token"],
            "face": raw["face"],
            "bridge_corner": raw["bridge_corner"],
            "family": family,
            "auxiliary": raw["auxiliary"],
            "total_ordinary_slack_degree": grade,
            "state": "SEALED_AND_INDEPENDENTLY_AUDITED",
            "producer_manifest": raw["producer_manifest"],
            "producer_manifest_sha256": raw["producer_manifest_sha256"],
            "producer_source_sha256": raw["producer_source_sha256"],
            "ordered_coefficient_sha256": raw["ordered_coefficient_sha256"],
            "negative_terms": 0,
            "audit_report": raw["audit_report"],
            "audit_report_sha256": raw["audit_report_sha256"],
            "audit_source_sha256": raw["audit_source_sha256"],
            "multidegree_family_grade_checkpoint": {
                **certificate_record,
                "producer_job": producer,
                "independent_audit": audit,
                "repaired_grades8_13_block": {
                    "path": str(block_path),
                    "sha256": args.expected_block_sha256.upper(),
                },
            },
        }
        merged.append(validate_and_normalize_cell(cell))

    assert len(merged) == 124
    assert all(cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED" for cell in merged)
    multidegree_checkpoints = dict(old["multidegree_family_grade_checkpoints"])
    for item in block["grade_certificates"]:
        multidegree_checkpoints[
            f"{item['family']}_grade_{item['total_ordinary_slack_degree']}"
        ] = item
    payload = {
        **old,
        "status": "CHECKPOINT_124_AUDITED_0_PRODUCER_ONLY_0_MISSING",
        "sealed_and_independently_audited": 124,
        "producer_sealed_audit_missing": 0,
        "missing_producer_and_audit": 0,
        "multidegree_family_grade_checkpoints": multidegree_checkpoints,
        "cells": merged,
        "minimal_remaining_face_grade_order": {
            "face_01": [],
            "face_10": [],
            "note": "All 124 exact mixed-cross cells are sealed and independently audited.",
        },
        "repaired_grades8_13_block": {
            "path": str(block_path),
            "sha256": args.expected_block_sha256.upper(),
            "source_sha256": block["source_sha256"],
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
