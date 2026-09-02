#!/usr/bin/env python3
"""Single-read independent resume of both corrected face10 grade7 strong rows."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_row_chunk_agent as support
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    atomic_json,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
SUPPORT_SOURCE_SHA256 = "0E3A15A21CC171F806374CE830A60CFE21F2DA88B63905937AAEC83823CEB590"
LABELS = ("strong_middle_times_4", "strong_far")
FAILURE_OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_resumed_dual_full_rows_agent_20260823.failure.json"


def row_output(label: str) -> Path:
    return HERE / (
        f"rank8_low_low_a23_mixed_cross_face_10_{label}_grade_7_"
        "resumed_full_row_independent_agent_20260823.json"
    )


def empty_stats() -> dict:
    return {"terms": 0, "negative": 0, "minimum": None, "first_negative": None}


def add_coefficient(
    label: str,
    monomial: tuple[int, ...],
    coefficient: int,
    digest: hashlib._Hash,
    complete: hashlib._Hash,
    stats: dict,
) -> None:
    if coefficient == 0:
        return
    encoded = (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode()
    digest.update(encoded)
    complete.update(encoded)
    stats["terms"] += 1
    stats["minimum"] = coefficient if stats["minimum"] is None else min(stats["minimum"], coefficient)
    if coefficient < 0:
        stats["negative"] += 1
        if stats["first_negative"] is None:
            stats["first_negative"] = {"monomial": list(monomial), "coefficient": coefficient}


def dual_merge_chunk(
    records: list[dict],
    expected_middle: dict,
    expected_far: dict,
    complete: dict[str, hashlib._Hash],
    peak: list[int],
    limit: int,
) -> dict[str, dict]:
    cursors = [support.Cursor(record, 1) for record in records]
    current = [cursor.advance() for cursor in cursors]
    digests = {label: hashlib.sha256() for label in LABELS}
    stats = {label: empty_stats() for label in LABELS}
    middle_scales = [
        4 if record["piece"] == "base" else 2 if record["piece"] == "linear" else 0
        for record in records
    ]
    processed_keys = 0
    try:
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [
                index for index, item in enumerate(current)
                if item is not None and item[0] == smallest
            ]
            monomial = current[active[0]][1]
            far_coefficient = middle_coefficient = 0
            for index in active:
                assert current[index][1] == monomial
                coefficient = current[index][2]
                far_coefficient += coefficient
                middle_coefficient += middle_scales[index] * coefficient
                current[index] = cursors[index].advance()
            add_coefficient(
                "strong_middle_times_4", monomial, middle_coefficient,
                digests["strong_middle_times_4"], complete["strong_middle_times_4"],
                stats["strong_middle_times_4"],
            )
            add_coefficient(
                "strong_far", monomial, far_coefficient,
                digests["strong_far"], complete["strong_far"], stats["strong_far"],
            )
            processed_keys += 1
            if processed_keys % 100_000 == 0:
                current_private = private_bytes()
                peak[0] = max(peak[0], current_private)
                if current_private > limit:
                    raise MemoryError(f"private memory {current_private} exceeds {limit}")
    finally:
        for cursor in cursors:
            cursor.close()
    result = {}
    for label, expected in (
        ("strong_middle_times_4", expected_middle),
        ("strong_far", expected_far),
    ):
        item = stats[label]
        replay = {
            "mixed_support_terms": item["terms"],
            "negative_terms": item["negative"],
            "minimum": item["minimum"],
            "first_negative": item["first_negative"],
            "ordered_coefficient_sha256": digests[label].hexdigest().upper(),
        }
        for key, value in replay.items():
            assert expected["chunk"][key] == value
        assert replay["negative_terms"] == 0
        result[label] = replay
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hard-private-limit-bytes", type=int, default=500_000_000)
    args = parser.parse_args()
    assert sha256(HERE / "resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_row_chunk_agent.py") == SUPPORT_SOURCE_SHA256
    support.pin(support.PRIOR_AUDIT_SOURCE)
    failure = support.pin(support.PRIOR_FAILURE)
    assert failure is not None and failure["stage"] == "middle row replay exponent 2"
    job = support.pin(support.CORRECTED_JOB)
    assert job is not None
    middle_manifest, middle_chunks, far_manifest, far_chunks = support.load_corrected_rows(job)
    expected_components = support.formal_audit.components_for_degree(support.DEGREE)
    complete = {label: hashlib.sha256() for label in LABELS}
    row_replays = {label: [] for label in LABELS}
    components_by_outer = []
    peak = [0]
    for exponent in range(3):
        atom_records = far_chunks[exponent]["atom_stream_manifests"]
        assert len(expected_components) == len(atom_records) == 42
        normalized = [
            support.normalize_atom(record, expected, exponent)
            for expected, record in zip(expected_components, atom_records)
        ]
        components_by_outer.append({
            "outer_exponent": exponent,
            "formal_comparison_provenance": "completed_before_pinned_prior_failure_stage",
            "components": normalized,
        })
        replays = dual_merge_chunk(
            normalized, middle_chunks[exponent], far_chunks[exponent],
            complete, peak, args.hard_private_limit_bytes,
        )
        for label in LABELS:
            row_replays[label].append(replays[label])
            print("ROW_REPLAY", label, exponent, replays[label]["mixed_support_terms"], 0, flush=True)
    manifests = {
        "strong_middle_times_4": middle_manifest,
        "strong_far": far_manifest,
    }
    source_hash = sha256(Path(__file__))
    outputs = []
    for label in LABELS:
        complete_digest = complete[label].hexdigest().upper()
        manifest = manifests[label]
        assert complete_digest == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
        assert sum(item["negative_terms"] for item in row_replays[label]) == manifest["result"]["negative_terms"] == 0
        output = row_output(label)
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-full-row-agent-v1",
            "status": "PASS_INDEPENDENT_RESUMED_FORMAL_PROVENANCE_FULL_ROW_EXACT",
            "face": support.FACE,
            "bridge_corner": [2, 0],
            "total_ordinary_slack_degree": support.DEGREE,
            "auxiliary": label,
            "corrected_job": str(support.CORRECTED_JOB[0]),
            "corrected_job_sha256": support.CORRECTED_JOB[1],
            "row_replays": row_replays[label],
            "complete_ordered_coefficient_sha256": complete_digest,
            "replayed_negative_terms": 0,
            "atom_stream_provenance": components_by_outer,
            "formal_comparison_provenance": {
                "prior_audit_source": str(support.PRIOR_AUDIT_SOURCE[0]),
                "prior_audit_source_sha256": support.PRIOR_AUDIT_SOURCE[1],
                "prior_failure": str(support.PRIOR_FAILURE[0]),
                "prior_failure_sha256": support.PRIOR_FAILURE[1],
                "prior_failure_stage": failure["stage"],
                "control_flow_consequence": (
                    "All exponent-0 rows, all exponent-1 atoms and rows, and all exponent-2 atoms "
                    "completed before entry into the exponent-2 middle row replay."
                ),
            },
            "imports_producer": False,
            "single_read_dual_row_merge": True,
            "one_row_chunk_live_at_a_time": True,
            "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
            "observed_peak_private_bytes_at_checkpoints": peak[0],
            "source_sha256": source_hash,
            "support_source_sha256": SUPPORT_SOURCE_SHA256,
        }
        outputs.append((output, atomic_json(output, payload)))
    for output, report_hash in outputs:
        print("PASS", output, report_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        current = private_bytes()
        atomic_json(FAILURE_OUTPUT, {
            "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-dual-full-rows-agent-v1",
            "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
            "failure": {"type": type(error).__name__, "message": str(error)},
            "private_bytes_at_failure": current,
            "source_sha256": sha256(Path(__file__)),
        })
        raise
