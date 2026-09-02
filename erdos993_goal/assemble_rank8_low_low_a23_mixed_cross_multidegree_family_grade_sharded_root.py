#!/usr/bin/env python3
"""Fail-closed grade certificate from a six-shard independent audit."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE_SHA256 = (
    "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342"
)
SCOPE = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)
FAMILY_MAXIMUM = {"curvature": 16, "strong": 17}
FACES = {"01": [0, 1], "10": [1, 0]}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(path: Path, expected: str) -> dict:
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
    parser.add_argument("--independent-audit-source", required=True)
    parser.add_argument("--expected-independent-audit-source-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    assert sha256(HERE / SCOPE[0]) == SCOPE[1]
    scope = pinned(HERE / SCOPE[0], SCOPE[1])
    assert scope["status"] == "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE"
    maximum = FAMILY_MAXIMUM[args.family]
    scoped = {
        (item["family"], item["total_ordinary_slack_degree"]): item
        for item in scope["scopes"]
    }
    assert scoped[(args.family, args.degree)]["exact_base_degree"] == maximum - args.degree

    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    job = pinned(job_path, job_hash)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == PRODUCER_SOURCE_SHA256

    audit_source = Path(args.independent_audit_source).resolve()
    audit_source_hash = args.expected_independent_audit_source_sha256.upper()
    assert sha256(audit_source) == audit_source_hash
    audit_path = Path(args.independent_audit).resolve()
    audit_hash = args.expected_independent_audit_sha256.upper()
    audit = pinned(audit_path, audit_hash)
    assert audit["status"] == (
        "PASS_INDEPENDENT_SHARDED_FORMAL_TWO_GRADING_ATOM_EXTERNAL_"
        "MERGE_ALL_FOUR_CELLS_EXACT"
    )
    assert audit["source_sha256"] == audit_source_hash
    assert audit["family"] == args.family
    assert audit["total_ordinary_slack_degree"] == args.degree
    assert audit["producer_job_sha256"] == job_hash
    checks = audit["checks"]
    assert checks["producer_imported"] is False
    assert all(
        value is True
        for key, value in checks.items()
        if key != "producer_imported"
    )

    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    audit_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for face in audit["audited_faces"]
        for cell in face["cells"]
    }
    labels = (f"{args.family}_middle_times_4", f"{args.family}_far")
    expected = {(token, label) for token in FACES for label in labels}
    assert set(job_cells) == set(audit_cells) == expected
    assembled_cells = []
    face_rows = {}
    for token, face in FACES.items():
        rows = []
        for label in labels:
            produced = job_cells[(token, label)]
            replayed = audit_cells[(token, label)]
            manifest_path = Path(produced["manifest"]).resolve()
            manifest = pinned(manifest_path, produced["manifest_sha256"])
            assert manifest["source_sha256"] == PRODUCER_SOURCE_SHA256
            assert manifest["result"]["negative_terms"] == produced["negative_terms"] == 0
            assert replayed["replayed_negative_terms"] == 0
            assert replayed["producer_manifest_sha256"] == produced["manifest_sha256"]
            assert replayed["replayed_mixed_support_terms"] == manifest["result"]["mixed_support_terms"]
            assert replayed["replayed_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
            assert [item["outer_exponent"] for item in replayed["chunks"]] == [0, 1, 2]
            for record, replay in zip(manifest["result"]["chunks"], replayed["chunks"]):
                for field in (
                    "outer_exponent", "mixed_support_terms", "negative_terms",
                    "minimum", "ordered_coefficient_sha256",
                ):
                    assert record[field] == replay[field]
                assert record.get("first_negative") == replay.get("first_negative")
                chunk = pinned(Path(record["path"]), record["sha256"])
                assert chunk["chunk"]["negative_terms"] == 0
            row = {
                "auxiliary": label,
                "family": args.family,
                "producer_manifest": str(manifest_path),
                "producer_manifest_sha256": produced["manifest_sha256"],
                "producer_source_sha256": PRODUCER_SOURCE_SHA256,
                "audit_report": str(audit_path),
                "audit_report_sha256": audit_hash,
                "audit_source_sha256": audit_source_hash,
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "negative_terms": 0,
            }
            rows.append(row)
            assembled_cells.append({
                "face_token": token,
                "face": face,
                "bridge_corner": [2 * value for value in face],
                **row,
            })
        face_rows[token] = rows

    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-family-grade-"
            "sharded-assembler-root-v1"
        ),
        "status": "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED",
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree": maximum - args.degree,
        "expected_cells": 4,
        "assembled_cells": assembled_cells,
        "face_rows": face_rows,
        "producer_job": {"path": str(job_path), "sha256": job_hash},
        "independent_audit": {"path": str(audit_path), "sha256": audit_hash},
        "formula_scope_audit": {"path": SCOPE[0], "sha256": SCOPE[1]},
        "checks": {
            "both_oriented_faces_computed_separately": True,
            "both_required_rows_per_face": True,
            "all_three_outer_slices_per_row": True,
            "all_chunk_and_complete_ordered_hashes_independently_replayed": True,
            "all_negative_counts_zero": True,
            "no_cross_face_family_or_grade_credit": True,
        },
        "audit_source": {"path": str(audit_source), "sha256": audit_source_hash},
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
