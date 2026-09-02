#!/usr/bin/env python3
"""Exact equivalence audit of a multidegree job against sealed registry cells."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
REGISTRY = (
    "rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json",
    "112D3ED668BA74DBF503AB698444068D6612A04DF5BA8A7917A2B7277FFB4FC7",
)
PRODUCER = (
    "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py",
    "78D99F5B17D89DDA8352C2014829FAA4D2765426FA3045F5783A817A18D5280E",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned_json(path: Path, expected: str) -> dict:
    assert sha256(path) == expected.upper(), (path, sha256(path), expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def load_manifest(path_value: str, expected_hash: str) -> tuple[Path, dict]:
    path = Path(path_value).resolve()
    return path, pinned_json(path, expected_hash)


def load_chunks(manifest: dict) -> list[tuple[dict, dict]]:
    records = manifest["result"]["chunks"]
    assert [record["outer_exponent"] for record in records] == [0, 1, 2]
    loaded = []
    for record in records:
        path = Path(record["path"]).resolve()
        loaded.append((record, pinned_json(path, record["sha256"])))
    return loaded


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    assert sha256(HERE / PRODUCER[0]) == PRODUCER[1]
    registry = pinned_json(HERE / REGISTRY[0], REGISTRY[1])
    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    job = pinned_json(job_path, job_hash)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["source_sha256"] == PRODUCER[1]
    family = job["family"]
    degree = job["total_ordinary_slack_degree"]
    candidates = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    references = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in registry["cells"]
        if cell["family"] == family
        and cell["total_ordinary_slack_degree"] == degree
    }
    assert set(candidates) == set(references)
    assert len(candidates) == 4

    audited = []
    compare_keys = (
        "mixed_support_terms", "negative_terms", "minimum",
        "first_negative", "ordered_coefficient_sha256",
    )
    for key in sorted(candidates):
        candidate_cell = candidates[key]
        reference_cell = references[key]
        assert reference_cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED"
        candidate_path, candidate = load_manifest(
            candidate_cell["manifest"], candidate_cell["manifest_sha256"]
        )
        reference_path, reference = load_manifest(
            reference_cell["producer_manifest"],
            reference_cell["producer_manifest_sha256"],
        )
        for manifest in (candidate, reference):
            assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            assert manifest["family"] == family
            assert manifest["auxiliary"] == key[1]
            assert manifest["total_ordinary_slack_degree"] == degree
            assert manifest["result"]["negative_terms"] == 0
        for field in (
            "mixed_support_terms", "negative_terms",
            "ordered_coefficient_sha256",
        ):
            assert candidate["result"][field] == reference["result"][field]
        candidate_chunks = load_chunks(candidate)
        reference_chunks = load_chunks(reference)
        chunk_matches = []
        for (candidate_record, candidate_chunk), (reference_record, reference_chunk) in zip(
            candidate_chunks, reference_chunks
        ):
            assert candidate_record["outer_exponent"] == reference_record["outer_exponent"]
            for field in compare_keys:
                assert candidate_chunk["chunk"][field] == reference_chunk["chunk"][field], (
                    key, candidate_record["outer_exponent"], field,
                    candidate_chunk["chunk"][field], reference_chunk["chunk"][field],
                )
            chunk_matches.append({
                "outer_exponent": candidate_record["outer_exponent"],
                "mixed_support_terms": candidate_chunk["chunk"]["mixed_support_terms"],
                "negative_terms": 0,
                "ordered_coefficient_sha256": candidate_chunk["chunk"]["ordered_coefficient_sha256"],
                "exact_count_sign_minimum_witness_and_ordered_hash_match": True,
            })
        audited.append({
            "face_token": key[0],
            "auxiliary": key[1],
            "candidate_manifest": str(candidate_path),
            "candidate_manifest_sha256": candidate_cell["manifest_sha256"],
            "reference_manifest": str(reference_path),
            "reference_manifest_sha256": reference_cell["producer_manifest_sha256"],
            "reference_independent_audit": reference_cell["audit_report"],
            "reference_independent_audit_sha256": reference_cell["audit_report_sha256"],
            "mixed_support_terms": candidate["result"]["mixed_support_terms"],
            "negative_terms": 0,
            "ordered_coefficient_sha256": candidate["result"]["ordered_coefficient_sha256"],
            "chunks": chunk_matches,
            "exact_complete_ordered_row_match": True,
        })

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-sealed-equivalence-audit-agent-v1",
        "status": "PASS_EXACT_MULTIDEGREE_ALL_FOUR_CELLS_MATCH_SEALED_INDEPENDENT_REFERENCES",
        "family": family,
        "total_ordinary_slack_degree": degree,
        "exact_base_degree": job["exact_base_degree"],
        "producer_job": str(job_path),
        "producer_job_sha256": job_hash,
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "registry": {"path": REGISTRY[0], "sha256": REGISTRY[1]},
        "audited_cells": audited,
        "checks": {
            "all_four_oriented_cells_present": True,
            "references_already_sealed_and_independently_audited": True,
            "all_three_outer_slices_exact": True,
            "counts_signs_minima_first_negative_witnesses_and_ordered_hashes_match": True,
            "complete_ordered_row_hashes_match": True,
            "no_cross_grade_credit": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
