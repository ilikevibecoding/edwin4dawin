#!/usr/bin/env python3
"""Hash-pinned exact comparison of factored and sealed unfactored face/grade jobs."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected.upper(), (path, actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def row_map(job: dict) -> dict[str, dict]:
    rows = {item["auxiliary"]: item for item in job["completed_rows"]}
    assert len(rows) == len(job["completed_rows"])
    assert list(rows) == job["expected_rows"]
    return rows


def read_manifest(row: dict) -> tuple[dict, Path]:
    path = Path(row["manifest"]).resolve()
    payload = pinned(path, row["manifest_sha256"])
    return payload, path


def read_chunks(manifest: dict) -> list[dict]:
    result = []
    for record in manifest["result"]["chunks"]:
        path = Path(record["path"]).resolve()
        payload = pinned(path, record["sha256"])
        assert payload["outer_exponent"] == record["outer_exponent"]
        result.append(payload)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--reference-job", required=True)
    parser.add_argument("--expected-reference-job-sha256", required=True)
    parser.add_argument("--factored-job", required=True)
    parser.add_argument("--expected-factored-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    face = list(map(int, args.face.split(",")))
    reference_path = Path(args.reference_job).resolve()
    factored_path = Path(args.factored_job).resolve()
    reference = pinned(reference_path, args.expected_reference_job_sha256)
    factored = pinned(factored_path, args.expected_factored_job_sha256)
    assert reference["status"] == "PASS_COMPLETE_FACE_GRADE_ALL_REQUIRED_ROWS"
    assert factored["status"] == "PASS_COMPLETE_FACE_GRADE_ALL_REQUIRED_OUTER_FACTORED_ROWS"
    for job in (reference, factored):
        assert job["face"] == face
        assert job["total_ordinary_slack_degree"] == args.degree
        assert job["missing_rows"] == []
    assert reference["expected_rows"] == factored["expected_rows"]
    reference_rows = row_map(reference)
    factored_rows = row_map(factored)
    comparisons = []
    for label in reference["expected_rows"]:
        old_manifest, old_path = read_manifest(reference_rows[label])
        new_manifest, new_path = read_manifest(factored_rows[label])
        for manifest in (old_manifest, new_manifest):
            assert manifest["face"] == face
            assert manifest["auxiliary"] == label
            assert manifest["total_ordinary_slack_degree"] == args.degree
            assert manifest["outer_exponent_range"] == [0, 2]
        old_result, new_result = old_manifest["result"], new_manifest["result"]
        for key in (
            "mixed_support_terms",
            "negative_terms",
            "ordered_coefficient_sha256",
            "piece_names",
            "piece_scales",
            "piece_lengths",
            "piece_raw_terms_visited",
            "piece_mixed_terms_visited",
        ):
            assert old_result[key] == new_result[key], (label, key)
        old_chunks, new_chunks = read_chunks(old_manifest), read_chunks(new_manifest)
        assert len(old_chunks) == len(new_chunks) == 3
        chunk_comparisons = []
        for exponent, (old_chunk, new_chunk) in enumerate(zip(old_chunks, new_chunks)):
            assert old_chunk["outer_exponent"] == new_chunk["outer_exponent"] == exponent
            for key in (
                "mixed_support_terms",
                "negative_terms",
                "minimum",
                "first_negative",
                "ordered_coefficient_sha256",
            ):
                assert old_chunk["chunk"][key] == new_chunk["chunk"][key], (
                    label, exponent, key
                )
            chunk_comparisons.append({
                "outer_exponent": exponent,
                "reference_chunk_sha256": old_manifest["result"]["chunks"][exponent]["sha256"],
                "factored_chunk_sha256": new_manifest["result"]["chunks"][exponent]["sha256"],
                "exact_statistics_and_ordered_digest_match": True,
            })
        comparisons.append({
            "auxiliary": label,
            "reference_manifest": str(old_path),
            "reference_manifest_sha256": reference_rows[label]["manifest_sha256"],
            "factored_manifest": str(new_path),
            "factored_manifest_sha256": factored_rows[label]["manifest_sha256"],
            "exact_complete_row_digest_match": True,
            "exact_piece_counts_match": True,
            "chunks": chunk_comparisons,
        })

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-outer-factored-equivalence-audit-agent-v1",
        "status": "PASS_HASH_PINNED_ALL_ROW_EXACT_FACTORED_UNFACTORED_EQUIVALENCE",
        "face": face,
        "total_ordinary_slack_degree": args.degree,
        "reference_job": str(reference_path),
        "reference_job_sha256": args.expected_reference_job_sha256.upper(),
        "factored_job": str(factored_path),
        "factored_job_sha256": args.expected_factored_job_sha256.upper(),
        "row_comparisons": comparisons,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
