#!/usr/bin/env python3
"""Durable independent full-row resume for corrected face10 grade7 strong rows."""

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
FAILURE_CONTEXT: dict = {}


def merge_chunk(
    records: list[dict],
    scales: list[int],
    expected_chunk: dict,
    complete: hashlib._Hash,
    peak: list[int],
    limit: int,
) -> dict:
    cursors = [support.Cursor(record, scale) for record, scale in zip(records, scales)]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [
                index for index, item in enumerate(current)
                if item is not None and item[0] == smallest
            ]
            monomial = current[active[0]][1]
            coefficient = 0
            for index in active:
                assert current[index][1] == monomial
                coefficient += current[index][2]
                current[index] = cursors[index].advance()
            if coefficient == 0:
                continue
            encoded = (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode()
            digest.update(encoded)
            complete.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(monomial), "coefficient": coefficient}
            if terms % 100_000 == 0:
                current_private = private_bytes()
                peak[0] = max(peak[0], current_private)
                if current_private > limit:
                    raise MemoryError(f"private memory {current_private} exceeds {limit}")
    finally:
        for cursor in cursors:
            cursor.close()
    replay = {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    for key, value in replay.items():
        assert expected_chunk["chunk"][key] == value
    return replay


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", choices=("strong_middle_times_4", "strong_far"), required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hard-private-limit-bytes", type=int, default=500_000_000)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    peak = [0]
    FAILURE_CONTEXT.update({"output": output, "label": args.label, "peak": peak, "stage": "pinning"})
    assert sha256(HERE / "resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_row_chunk_agent.py") == SUPPORT_SOURCE_SHA256
    support.pin(support.PRIOR_AUDIT_SOURCE)
    failure = support.pin(support.PRIOR_FAILURE)
    assert failure is not None
    assert failure["stage"] == "middle row replay exponent 2"
    assert failure["source_sha256"] == support.PRIOR_AUDIT_SOURCE[1]
    job = support.pin(support.CORRECTED_JOB)
    assert job is not None
    middle_manifest, middle_chunks, far_manifest, far_chunks = support.load_corrected_rows(job)
    expected_components = support.formal_audit.components_for_degree(support.DEGREE)
    complete = hashlib.sha256()
    row_replays = []
    components_by_outer = []
    for exponent in range(3):
        FAILURE_CONTEXT["stage"] = f"{args.label} exponent {exponent}"
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
        if args.label == "strong_middle_times_4":
            records = [record for record in normalized if record["piece"] in ("base", "linear")]
            scales = [4 if record["piece"] == "base" else 2 for record in records]
            expected_chunk = middle_chunks[exponent]
            row_manifest = middle_manifest
        else:
            records = normalized
            scales = [1] * len(records)
            expected_chunk = far_chunks[exponent]
            row_manifest = far_manifest
        replay = merge_chunk(
            records, scales, expected_chunk, complete, peak,
            args.hard_private_limit_bytes,
        )
        assert replay["negative_terms"] == 0
        row_replays.append(replay)
        print("ROW_REPLAY", args.label, exponent, replay["mixed_support_terms"], 0, flush=True)
    complete_digest = complete.hexdigest().upper()
    assert complete_digest == row_manifest["result"]["ordered_coefficient_sha256"]
    assert sum(item["mixed_support_terms"] for item in row_replays) == row_manifest["result"]["mixed_support_terms"]
    assert sum(item["negative_terms"] for item in row_replays) == row_manifest["result"]["negative_terms"] == 0
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-full-row-agent-v1",
        "status": "PASS_INDEPENDENT_RESUMED_FORMAL_PROVENANCE_FULL_ROW_EXACT",
        "face": support.FACE,
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": support.DEGREE,
        "auxiliary": args.label,
        "corrected_job": str(support.CORRECTED_JOB[0]),
        "corrected_job_sha256": support.CORRECTED_JOB[1],
        "row_replays": row_replays,
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
        "one_row_chunk_live_at_a_time": True,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "support_source_sha256": SUPPORT_SOURCE_SHA256,
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            requested = FAILURE_CONTEXT["output"]
            current = private_bytes()
            atomic_json(requested.with_suffix(requested.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-full-row-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "auxiliary": FAILURE_CONTEXT["label"],
                "stage": FAILURE_CONTEXT["stage"],
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(FAILURE_CONTEXT["peak"][0], current),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
