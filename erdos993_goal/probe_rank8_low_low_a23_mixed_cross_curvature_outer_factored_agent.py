#!/usr/bin/env python3
"""Curvature-only face/grade driver for the validated b0-factored producer."""

from __future__ import annotations

import argparse
import gc
import json
from pathlib import Path

from probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent import (
    DEFAULT_PRIVATE_LIMIT,
    atomic_json,
    build_split_common,
    curvature_pieces,
    finish_manifest,
    guard,
    new_row_state,
    private_bytes,
    row_spec,
    sha256,
    stream_outer_chunk,
)


DEPENDENCY = "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py"
FAILURE_CONTEXT: dict = {}


def update_job(path, face, degree, completed, source_hash, dependency_hash, peak, limit, final=False):
    labels = ["curvature_middle_times_4", "curvature_far"]
    done = [item["auxiliary"] for item in completed]
    missing = [label for label in labels if label not in done]
    return atomic_json(path, {
        "schema": "rank8-low-low-a23-mixed-cross-curvature-outer-factored-job-agent-v1",
        "status": (
            "PASS_COMPLETE_CURVATURE_FACE_GRADE_OUTER_FACTORED_ROWS"
            if final and not missing and all(item["negative_terms"] == 0 for item in completed)
            else "CHECKPOINT_INCOMPLETE_CURVATURE_FACE_GRADE_OUTER_FACTORED"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "expected_rows": labels,
        "completed_rows": completed,
        "missing_rows": missing,
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "factored_dependency_sha256": dependency_hash,
    })


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 17), required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--date-tag", default="20260823")
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    face_token = args.face.replace(",", "")
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    here = Path(__file__).resolve().parent
    source_hash = sha256(Path(__file__))
    dependency_hash = sha256(here / DEPENDENCY)
    peak = [0]
    job_path = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_curvature_grade_{args.degree}_"
        f"outer_factored_job_agent_{args.date_tag}.json"
    )
    FAILURE_CONTEXT.update({
        "job": job_path, "face": face, "degree": args.degree,
        "peak": peak, "limit": args.hard_private_limit_bytes,
    })
    completed = []
    update_job(
        job_path, face, args.degree, completed, source_hash, dependency_hash,
        peak, args.hard_private_limit_bytes,
    )
    common = build_split_common(face, args.degree, peak, args.hard_private_limit_bytes)
    labels = ("curvature_middle_times_4", "curvature_far")
    available = {"base": None}
    if args.degree <= 15:
        available["linear"] = None
    if args.degree <= 14:
        available["direction"] = None
    states = {}
    for label in labels:
        dummy = row_spec(label, available)
        states[label] = new_row_state(
            label, [name for name, _, _ in dummy], [scale for _, scale, _ in dummy]
        )
    dependency_hashes = {DEPENDENCY: dependency_hash}
    for exponent in range(3):
        pieces = curvature_pieces(
            common, args.degree, exponent, peak, args.hard_private_limit_bytes
        )
        for label in labels:
            stream_outer_chunk(
                output_dir, args.date_tag, face, face_token, args.degree,
                "curvature", label, exponent, row_spec(label, pieces),
                states[label], source_hash, dependency_hashes, peak,
                args.hard_private_limit_bytes,
            )
        del pieces
        gc.collect()
        guard(
            f"curvature outer {exponent} released", peak,
            args.hard_private_limit_bytes,
        )
    for label in labels:
        completed.append(finish_manifest(
            output_dir, args.date_tag, face, face_token, args.degree,
            "curvature", states[label], source_hash, dependency_hashes,
            peak, args.hard_private_limit_bytes,
        ))
        update_job(
            job_path, face, args.degree, completed, source_hash,
            dependency_hash, peak, args.hard_private_limit_bytes,
        )
    job_hash = update_job(
        job_path, face, args.degree, completed, source_hash,
        dependency_hash, peak, args.hard_private_limit_bytes, final=True,
    )
    print("JOB", job_path, job_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            path = FAILURE_CONTEXT["job"]
            prior = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
            current = private_bytes()
            atomic_json(path, {
                **prior,
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], current
                ),
            })
        raise
