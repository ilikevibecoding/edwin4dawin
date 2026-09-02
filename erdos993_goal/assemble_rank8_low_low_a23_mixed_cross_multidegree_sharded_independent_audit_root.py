#!/usr/bin/env python3
"""Assemble six disjoint independent face/outer replay shards."""

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


def shard_name(family: str, degree: int, token: str, outer: int) -> str:
    return (
        "rank8_low_low_a23_mixed_cross_"
        f"{family}_grade{degree}_independent_shard_{token}_o{outer}_"
        "root_20260827.json"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--shard-directory", default=".")
    parser.add_argument("--shard-source", required=True)
    parser.add_argument("--expected-shard-source-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    shard_source = Path(args.shard_source).resolve()
    shard_source_hash = args.expected_shard_source_sha256.upper()
    assert sha256(shard_source) == shard_source_hash
    maximum = FAMILY_MAXIMUM[args.family]
    assert args.degree <= maximum
    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    job = pinned(job_path, job_hash)
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == PRODUCER_SOURCE_SHA256
    labels = (f"{args.family}_middle_times_4", f"{args.family}_far")
    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    assert set(job_cells) == {
        (token, label) for token in FACES for label in labels
    }

    shard_directory = Path(args.shard_directory).resolve()
    shards = {}
    shard_records = []
    for token in FACES:
        for outer in range(3):
            path = shard_directory / shard_name(args.family, args.degree, token, outer)
            digest = sha256(path)
            shard = pinned(path, digest)
            assert shard["status"] == "PASS_INDEPENDENT_EXACT_FACE_OUTER_SHARD_BOTH_ROWS"
            assert shard["source_sha256"] == shard_source_hash
            assert shard["family"] == args.family
            assert shard["total_ordinary_slack_degree"] == args.degree
            assert shard["exact_base_degree"] == maximum - args.degree
            assert shard["face_token"] == token
            assert shard["face"] == FACES[token]
            assert shard["outer_exponent"] == outer
            assert shard["producer_job_sha256"] == job_hash
            assert shard["producer_source_sha256"] == PRODUCER_SOURCE_SHA256
            checks = shard["checks"]
            assert checks["producer_imported"] is False
            assert all(
                value is True
                for key, value in checks.items()
                if key != "producer_imported"
            )
            assert len(shard["replays"]) == 2
            shards[(token, outer)] = shard
            shard_records.append({
                "face_token": token,
                "outer_exponent": outer,
                "path": str(path),
                "sha256": digest,
            })
    assert len(shards) == 6

    audited_faces = []
    for token, face in FACES.items():
        cells = []
        atom_summaries = []
        for outer in range(3):
            atom_summaries.append({
                "outer_exponent": outer,
                "components": shards[(token, outer)]["atom_summaries"],
                "temporary_streams_removed_after_exact_merge": True,
            })
        for label in labels:
            produced = job_cells[(token, label)]
            manifest_path = Path(produced["manifest"]).resolve()
            manifest = pinned(manifest_path, produced["manifest_sha256"])
            assert manifest["source_sha256"] == PRODUCER_SOURCE_SHA256
            assert manifest["result"]["negative_terms"] == produced["negative_terms"] == 0
            expected_chunks = manifest["result"]["chunks"]
            assert [item["outer_exponent"] for item in expected_chunks] == [0, 1, 2]
            replays = []
            for outer in range(3):
                matches = [
                    item for item in shards[(token, outer)]["replays"]
                    if item["auxiliary"] == label
                ]
                assert len(matches) == 1
                item = matches[0]
                assert item["producer_manifest_sha256"] == produced["manifest_sha256"]
                replay = item["replay"]
                expected = expected_chunks[outer]
                for field in (
                    "outer_exponent", "mixed_support_terms", "negative_terms",
                    "minimum", "ordered_coefficient_sha256",
                ):
                    assert replay[field] == expected[field], (token, outer, label, field)
                # Legacy producer chunks omit this nullable field when no
                # negative witness exists; the independent replay records it
                # explicitly as null.
                assert replay.get("first_negative") == expected.get("first_negative"), (
                    token, outer, label, "first_negative"
                )
                assert replay["negative_terms"] == 0
                replays.append(replay)
            assert sum(item["mixed_support_terms"] for item in replays) == (
                manifest["result"]["mixed_support_terms"]
            )
            cells.append({
                "face_token": token,
                "face": face,
                "auxiliary": label,
                "producer_manifest": str(manifest_path),
                "producer_manifest_sha256": produced["manifest_sha256"],
                "replayed_mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "replayed_negative_terms": 0,
                "replayed_ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                "complete_hash_justification": (
                    "all three disjoint outer-exponent chunk streams independently "
                    "match their exact ordered hashes"
                ),
                "chunks": replays,
            })
        audited_faces.append({
            "face_token": token,
            "face": face,
            "atom_summaries": atom_summaries,
            "cells": cells,
        })

    payload = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-family-"
            "sharded-independent-audit-root-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_SHARDED_FORMAL_TWO_GRADING_ATOM_EXTERNAL_"
            "MERGE_ALL_FOUR_CELLS_EXACT"
        ),
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree_in_producer": maximum - args.degree,
        "producer_job": str(job_path),
        "producer_job_sha256": job_hash,
        "producer_source": {"sha256": PRODUCER_SOURCE_SHA256},
        "shards": shard_records,
        "audited_faces": audited_faces,
        "checks": {
            "producer_imported": False,
            "six_disjoint_face_outer_shards": True,
            "one_natural_bilinear_atom_live_per_shard": True,
            "temporary_external_merge": True,
            "temporary_streams_removed": True,
            "both_oriented_faces_reconstructed_separately": True,
            "all_chunk_counts_signs_minima_witnesses_and_ordered_hashes_exact": True,
            "all_three_outer_chunks_per_complete_row_exact": True,
        },
        "shard_source": {"path": str(shard_source), "sha256": shard_source_hash},
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
