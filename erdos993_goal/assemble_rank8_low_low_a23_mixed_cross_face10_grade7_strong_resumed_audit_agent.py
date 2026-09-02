#!/usr/bin/env python3
"""Assemble six resumed row chunks into the corrected independent audit."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path

from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    atomic_json,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
FACE = [1, 0]
DEGREE = 7
LABELS = ("strong_middle_times_4", "strong_far")
CORRECTED_JOB = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_literal_corrected_job_agent_20260823.json",
    "9C3C48DC5E59B81406F35B5BA828411FB37DC43AEC92C738AABCE261689320D8",
)
PRIOR_AUDIT_SOURCE = (
    HERE / "audit_rank8_low_low_a23_mixed_cross_face10_grade7_strong_exp1_literal_corrected_agent.py",
    "60C5FC8F47E36B4A532BD3E994791E08852E6997BA189A2FEA7CCBBFCE9283E2",
)
PRIOR_FAILURE = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_literal_corrected_independent_audit_agent_20260823.json.failure.json",
    "71B2721AD20267F341502B3FC974A87C160C0306B7DBFD2EAA2623A11861C343",
)
CHUNK_SOURCE = (
    HERE / "resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_row_chunk_agent.py",
    "0E3A15A21CC171F806374CE830A60CFE21F2DA88B63905937AAEC83823CEB590",
)
FAILURE_CONTEXT: dict = {}


def pin(item: tuple[Path, str]) -> dict | None:
    path, expected = item
    actual = sha256(path)
    assert actual == expected, (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8")) if path.suffix == ".json" else None


def report_path(label: str, exponent: int) -> Path:
    return HERE / (
        f"rank8_low_low_a23_mixed_cross_face_10_{label}_grade_7_b0_exp_{exponent}_"
        "resumed_independent_merge_agent_20260823.json"
    )


def load_rows(job: dict) -> dict[str, tuple[dict, list[dict]]]:
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == list(LABELS)
    loaded = {}
    for label, row in rows.items():
        path = Path(row["manifest"]).resolve()
        assert sha256(path) == row["manifest_sha256"]
        manifest = json.loads(path.read_text(encoding="utf-8"))
        assert manifest["face"] == FACE and manifest["total_ordinary_slack_degree"] == DEGREE
        assert manifest["result"]["negative_terms"] == 0
        chunks = []
        for record in manifest["result"]["chunks"]:
            chunk_path = Path(record["path"]).resolve()
            assert sha256(chunk_path) == record["sha256"]
            chunks.append(json.loads(chunk_path.read_text(encoding="utf-8")))
        loaded[label] = (manifest, chunks)
    return loaded


def replay_saved_chunk(report: dict, expected_chunk: dict, complete: hashlib._Hash) -> dict:
    result = report["result"]
    stream = Path(result["merged_stream"]).resolve()
    assert sha256(stream) == result["merged_stream_sha256"]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    with gzip.open(stream, "rb") as saved:
        for encoded in saved:
            assert encoded.endswith(b"\n")
            exponents, coefficient_text = encoded.rstrip(b"\n").rsplit(b":", 1)
            monomial = tuple(map(int, exponents.split(b",")))
            coefficient = int(coefficient_text)
            assert monomial[-1] == report["outer_exponent"]
            assert coefficient != 0
            digest.update(encoded)
            complete.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(monomial), "coefficient": coefficient}
    replay = {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    for key, value in replay.items():
        assert result[key] == value
        assert expected_chunk["chunk"][key] == value
    return replay


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    FAILURE_CONTEXT["output"] = output
    pin(PRIOR_AUDIT_SOURCE)
    prior_failure = pin(PRIOR_FAILURE)
    assert prior_failure is not None
    assert prior_failure["stage"] == "middle row replay exponent 2"
    assert prior_failure["source_sha256"] == PRIOR_AUDIT_SOURCE[1]
    pin(CHUNK_SOURCE)
    job = pin(CORRECTED_JOB)
    assert job is not None
    rows = load_rows(job)
    row_replays = {label: [] for label in LABELS}
    full_digests = {label: hashlib.sha256() for label in LABELS}
    chunk_reports = []
    atom_stream_audit = []
    for label in LABELS:
        manifest, chunks = rows[label]
        for exponent in range(3):
            path = report_path(label, exponent)
            report_hash = sha256(path)
            report = json.loads(path.read_text(encoding="utf-8"))
            assert report["status"] == "PASS_INDEPENDENT_RESUMED_FORMAL_PROVENANCE_ROW_CHUNK_STREAM_EXACT"
            assert report["source_sha256"] == CHUNK_SOURCE[1]
            assert report["face"] == FACE and report["total_ordinary_slack_degree"] == DEGREE
            assert report["auxiliary"] == label and report["outer_exponent"] == exponent
            assert report["corrected_job_sha256"] == CORRECTED_JOB[1]
            assert report["formal_comparison_provenance"]["prior_failure_sha256"] == PRIOR_FAILURE[1]
            assert report["imports_producer"] is False
            replay = replay_saved_chunk(report, chunks[exponent], full_digests[label])
            row_replays[label].append(replay)
            chunk_reports.append({
                "auxiliary": label,
                "outer_exponent": exponent,
                "path": str(path),
                "sha256": report_hash,
                "merged_stream": report["result"]["merged_stream"],
                "merged_stream_sha256": report["result"]["merged_stream_sha256"],
            })
            if label == "strong_far":
                assert len(report["component_streams"]) == 42
                atom_stream_audit.append({
                    "outer_exponent": exponent,
                    "audit_mode": "inherited_exact_formal_comparisons_from_pinned_prior_failure_stage",
                    "components": report["component_streams"],
                })
        assert full_digests[label].hexdigest().upper() == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
        assert sum(item["negative_terms"] for item in row_replays[label]) == manifest["result"]["negative_terms"] == 0
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-literal-corrected-resumed-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
        "face": FACE,
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "strong_job": str(CORRECTED_JOB[0]),
        "strong_job_sha256": CORRECTED_JOB[1],
        "atom_stream_audit": atom_stream_audit,
        "row_replays": row_replays,
        "replayed_negative_terms": {
            label: sum(item["negative_terms"] for item in replays)
            for label, replays in row_replays.items()
        },
        "resumed_chunk_reports": chunk_reports,
        "audit_scope": {
            "formal_atom_comparisons": (
                "Pinned prior fail-closed source and stage prove completion of all exponents 0, 1, and 2 "
                "before the exponent-2 middle row merge began."
            ),
            "row_merges": "All six row/exponent merges independently regenerated as durable exact streams.",
            "complete_rows": "Each complete ordered digest independently replayed from its three durable streams.",
        },
        "prior_fail_closed_audit": {
            "source": str(PRIOR_AUDIT_SOURCE[0]),
            "source_sha256": PRIOR_AUDIT_SOURCE[1],
            "failure": str(PRIOR_FAILURE[0]),
            "failure_sha256": PRIOR_FAILURE[1],
            "failure_stage": prior_failure["stage"],
        },
        "imports_producer": False,
        "one_row_chunk_live_at_a_time": True,
        "source_sha256": sha256(Path(__file__)),
        "chunk_source_sha256": CHUNK_SOURCE[1],
        "producer_source_sha256_from_job": job["source_sha256"],
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            requested = FAILURE_CONTEXT["output"]
            atomic_json(requested.with_suffix(requested.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-strong-literal-corrected-resumed-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION",
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": private_bytes(),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
