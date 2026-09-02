#!/usr/bin/env python3
"""Fail-closed assembler for one audited multidegree family/grade job."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py",
    "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342",
)
AUDIT_SOURCE = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py",
    "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F",
)
SCOPE_SOURCE = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_agent.py",
    "3A1E2571895F0B4DAE1E530F9C9D4E1F5FE39046B871379C6B2A795BE7A47B5B",
)
SCOPE_REPORT = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)
FAMILY_MAXIMUM = {"curvature": 16, "strong": 17}
FACES = (("01", [0, 1]), ("10", [1, 0]))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned_json(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, choices=range(8, 14), required=True)
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--independent-audit", required=True)
    parser.add_argument("--expected-independent-audit-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    for name, expected in (
        PRODUCER_SOURCE, AUDIT_SOURCE, SCOPE_SOURCE, SCOPE_REPORT
    ):
        assert sha256(HERE / name) == expected
    scope = pinned_json(HERE / SCOPE_REPORT[0], SCOPE_REPORT[1])
    assert scope["status"] == "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE"
    scoped = {
        (item["family"], item["total_ordinary_slack_degree"]): item
        for item in scope["scopes"]
    }
    scope_cell = scoped[(args.family, args.degree)]
    maximum = FAMILY_MAXIMUM[args.family]
    assert scope_cell["exact_base_degree"] == maximum - args.degree
    assert scope_cell["surviving_pieces"] == ["base", "linear", "direction"]

    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    job = pinned_json(job_path, job_hash)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == PRODUCER_SOURCE[1]
    assert job["canonical_scope"]["faces_separate"] is True

    audit_path = Path(args.independent_audit).resolve()
    audit_hash = args.expected_independent_audit_sha256.upper()
    audit = pinned_json(audit_path, audit_hash)
    assert audit["status"] == "PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT"
    assert audit["family"] == args.family
    assert audit["total_ordinary_slack_degree"] == args.degree
    assert audit["producer_job_sha256"] == job_hash
    assert audit["source_sha256"] == AUDIT_SOURCE[1]
    assert audit["checks"]["producer_imported"] is False
    assert audit["checks"]["both_oriented_faces_reconstructed_separately"] is True
    assert audit["checks"]["all_complete_ordered_row_hashes_exact"] is True

    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    audit_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for face in audit["audited_faces"]
        for cell in face["cells"]
    }
    labels = (
        f"{args.family}_middle_times_4", f"{args.family}_far"
    )
    expected_keys = {
        (token, label) for token, _ in FACES for label in labels
    }
    assert set(job_cells) == set(audit_cells) == expected_keys

    assembled_cells = []
    face_rows = {}
    for token, face in FACES:
        rows = []
        for label in labels:
            key = (token, label)
            produced = job_cells[key]
            replayed = audit_cells[key]
            manifest_path = Path(produced["manifest"]).resolve()
            manifest = pinned_json(manifest_path, produced["manifest_sha256"])
            assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            assert manifest["face"] == face
            assert manifest["family"] == args.family
            assert manifest["auxiliary"] == label
            assert manifest["total_ordinary_slack_degree"] == args.degree
            assert manifest["source_sha256"] == PRODUCER_SOURCE[1]
            assert manifest["result"]["negative_terms"] == produced["negative_terms"] == 0
            assert replayed["replayed_negative_terms"] == 0
            assert replayed["producer_manifest_sha256"] == produced["manifest_sha256"]
            assert replayed["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
            assert replayed["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
            assert [item["outer_exponent"] for item in replayed["chunks"]] == [0, 1, 2]
            for record in manifest["result"]["chunks"]:
                chunk_path = Path(record["path"]).resolve()
                chunk = pinned_json(chunk_path, record["sha256"])
                assert chunk["chunk"]["negative_terms"] == 0
                assert chunk["chunk"]["ordered_coefficient_sha256"] == record["ordered_coefficient_sha256"]
            row = {
                "auxiliary": label,
                "family": args.family,
                "producer_manifest": str(manifest_path),
                "producer_manifest_sha256": produced["manifest_sha256"],
                "producer_source_sha256": PRODUCER_SOURCE[1],
                "audit_report": str(audit_path),
                "audit_report_sha256": audit_hash,
                "audit_source_sha256": AUDIT_SOURCE[1],
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "negative_terms": 0,
            }
            rows.append(row)
            assembled_cells.append({
                "face_token": token,
                "face": face,
                "bridge_corner": [2 * face[0], 2 * face[1]],
                **row,
            })
        face_rows[token] = rows

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-grade-assembler-agent-v1",
        "status": "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED",
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree": maximum - args.degree,
        "expected_cells": 4,
        "assembled_cells": assembled_cells,
        "face_rows": face_rows,
        "producer_job": {"path": str(job_path), "sha256": job_hash},
        "independent_audit": {"path": str(audit_path), "sha256": audit_hash},
        "formula_scope_audit": {"path": SCOPE_REPORT[0], "sha256": SCOPE_REPORT[1]},
        "checks": {
            "both_oriented_faces_computed_separately": True,
            "both_required_rows_per_face": True,
            "all_three_outer_slices_per_row": True,
            "all_chunk_and_complete_ordered_hashes_independently_replayed": True,
            "all_negative_counts_zero": True,
            "no_cross_face_family_or_grade_credit": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
