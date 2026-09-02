#!/usr/bin/env python3
"""Assemble two durable resumed full rows into the corrected strong audit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_row_chunk_agent as support
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    atomic_json,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
FULL_ROW_SOURCE = (
    HERE / "resume_rank8_low_low_a23_mixed_cross_face10_grade7_strong_dual_full_rows_agent.py",
    "A1E476FFE02FE81000BE7BABDC1779068EE4ECA78BA3BB591C71C71E73DF3DFA",
)
LABELS = ("strong_middle_times_4", "strong_far")
FAILURE_CONTEXT: dict = {}


def row_report_path(label: str) -> Path:
    return HERE / (
        f"rank8_low_low_a23_mixed_cross_face_10_{label}_grade_7_"
        "resumed_full_row_independent_agent_20260823.json"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    FAILURE_CONTEXT["output"] = output
    assert sha256(FULL_ROW_SOURCE[0]) == FULL_ROW_SOURCE[1]
    job = support.pin(support.CORRECTED_JOB)
    assert job is not None
    support.pin(support.PRIOR_AUDIT_SOURCE)
    failure = support.pin(support.PRIOR_FAILURE)
    assert failure is not None and failure["stage"] == "middle row replay exponent 2"
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == list(LABELS)
    row_replays = {}
    resumed = []
    atom_stream_audit = None
    for label in LABELS:
        path = row_report_path(label)
        report_hash = sha256(path)
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_INDEPENDENT_RESUMED_FORMAL_PROVENANCE_FULL_ROW_EXACT"
        assert report["source_sha256"] == FULL_ROW_SOURCE[1]
        assert report["face"] == support.FACE
        assert report["total_ordinary_slack_degree"] == support.DEGREE
        assert report["auxiliary"] == label
        assert report["corrected_job_sha256"] == support.CORRECTED_JOB[1]
        assert report["formal_comparison_provenance"]["prior_failure_sha256"] == support.PRIOR_FAILURE[1]
        assert report["imports_producer"] is False
        assert report["replayed_negative_terms"] == 0
        assert len(report["row_replays"]) == 3
        manifest_path = Path(rows[label]["manifest"]).resolve()
        assert sha256(manifest_path) == rows[label]["manifest_sha256"]
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert report["complete_ordered_coefficient_sha256"] == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in report["row_replays"]) == manifest["result"]["mixed_support_terms"]
        row_replays[label] = report["row_replays"]
        resumed.append({
            "auxiliary": label,
            "path": str(path),
            "sha256": report_hash,
            "complete_ordered_coefficient_sha256": report["complete_ordered_coefficient_sha256"],
        })
        if label == "strong_far":
            atom_stream_audit = report["atom_stream_provenance"]
    assert atom_stream_audit is not None and len(atom_stream_audit) == 3
    assert all(len(outer["components"]) == 42 for outer in atom_stream_audit)
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-literal-corrected-resumed-full-rows-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
        "face": support.FACE,
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": support.DEGREE,
        "strong_job": str(support.CORRECTED_JOB[0]),
        "strong_job_sha256": support.CORRECTED_JOB[1],
        "atom_stream_audit": atom_stream_audit,
        "row_replays": row_replays,
        "replayed_negative_terms": {label: 0 for label in LABELS},
        "resumed_full_row_reports": resumed,
        "prior_fail_closed_audit": {
            "source": str(support.PRIOR_AUDIT_SOURCE[0]),
            "source_sha256": support.PRIOR_AUDIT_SOURCE[1],
            "failure": str(support.PRIOR_FAILURE[0]),
            "failure_sha256": support.PRIOR_FAILURE[1],
            "failure_stage": failure["stage"],
        },
        "audit_scope": {
            "formal_atom_comparisons": "Inherited exactly from the pinned sequential fail-closed audit stage after all exponent-2 atoms.",
            "row_merges": "Both complete rows independently regenerated and sealed in separate bounded processes.",
        },
        "imports_producer": False,
        "one_row_chunk_live_at_a_time": True,
        "source_sha256": sha256(Path(__file__)),
        "full_row_source_sha256": FULL_ROW_SOURCE[1],
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
                "schema": "rank8-low-low-a23-mixed-cross-strong-literal-corrected-resumed-full-rows-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION",
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": private_bytes(),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
