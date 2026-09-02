#!/usr/bin/env python3
"""Checkpoint one resumed face10 grade7 strong row/exponent merge.

The pinned corrected independent audit failed only after all exponent-2 atom
comparisons had completed.  Its source order therefore seals every atom stream
comparison through exponent 2.  This script resumes only the lost row-merge
layer, writes the exact merged coefficient stream atomically, and checks it
against the corrected producer chunk.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as formal_audit
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    atomic_json,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
FACE = [1, 0]
DEGREE = 7
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
CORRECTED_ATOM_SHA256 = "F1F61BF0207E899C4F3E43E6D0543D443A38722F06439B7E3C60C4D11275D5DE"
FAILURE_CONTEXT: dict = {}


class Cursor:
    def __init__(self, record: dict, scale: int):
        self.raw = Path(record["stream"]).open("rb")
        self.gz = gzip.GzipFile(fileobj=self.raw, mode="rb")
        self.scale = scale
        self.previous = None

    def close(self) -> None:
        self.gz.close()
        self.raw.close()

    def advance(self):
        line = self.gz.readline()
        if not line:
            return None
        exponents, coefficient = line.rstrip(b"\n").rsplit(b":", 1)
        monomial = tuple(map(int, exponents.split(b",")))
        key = (-sum(monomial), tuple(reversed(monomial)))
        if self.previous is not None:
            assert self.previous <= key
        self.previous = key
        return key, monomial, self.scale * int(coefficient)


def pin(item: tuple[Path, str]) -> dict | None:
    path, expected = item
    actual = sha256(path)
    assert actual == expected, (str(path), actual, expected)
    return json.loads(path.read_text(encoding="utf-8")) if path.suffix == ".json" else None


def normalize_atom(record: dict, expected: tuple[str, str, str], exponent: int) -> dict:
    path = Path(record["path"]).resolve()
    assert sha256(path) == record["sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE"
    assert manifest["face"] == FACE
    assert manifest["total_ordinary_slack_degree"] == DEGREE
    assert manifest["outer_exponent"] == exponent
    assert (manifest["piece"], manifest["part"], manifest["atom"]) == expected
    stream = Path(manifest["coefficient_stream"]).resolve()
    assert sha256(stream) == manifest["coefficient_stream_sha256"]
    if exponent == 1 and expected == ("base", "derivative", "twice_c8_v8"):
        assert record["sha256"] == CORRECTED_ATOM_SHA256
    return {
        "piece": expected[0],
        "part": expected[1],
        "atom": expected[2],
        "component": "_".join(expected),
        "outer_exponent": exponent,
        "manifest": str(path),
        "manifest_sha256": record["sha256"],
        "stream": str(stream),
        "stream_sha256": manifest["coefficient_stream_sha256"],
        "mixed_support_atom_terms": manifest["mixed_support_atom_terms"],
        "formal_comparison_provenance": "completed_before_pinned_prior_failure_stage",
    }


def load_corrected_rows(job: dict) -> tuple[dict, dict, list[dict], list[dict]]:
    rows = {row["auxiliary"]: row for row in job["completed_rows"]}
    assert list(rows) == ["strong_middle_times_4", "strong_far"]
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
    return loaded["strong_middle_times_4"] + loaded["strong_far"]


def merge_to_stream(
    records: list[dict], scales: list[int], output: Path, peak: list[int], limit: int,
) -> dict:
    temporary = output.with_suffix(output.suffix + ".tmp")
    cursors = [Cursor(record, scale) for record, scale in zip(records, scales)]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        with temporary.open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0, compresslevel=1) as saved:
                write_buffer = bytearray()
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
                    write_buffer.extend(encoded)
                    if len(write_buffer) >= 1_048_576:
                        saved.write(write_buffer)
                        write_buffer.clear()
                    digest.update(encoded)
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
                if write_buffer:
                    saved.write(write_buffer)
        os.replace(temporary, output)
    finally:
        for cursor in cursors:
            cursor.close()
        if temporary.exists():
            temporary.unlink()
    return {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
        "merged_stream": str(output),
        "merged_stream_sha256": sha256(output),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", choices=("strong_middle_times_4", "strong_far"), required=True)
    parser.add_argument("--exponent", type=int, choices=(0, 1, 2), required=True)
    parser.add_argument("--stream-output", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hard-private-limit-bytes", type=int, default=500_000_000)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    stream_output = Path(args.stream_output).resolve()
    peak = [0]
    FAILURE_CONTEXT.update({"output": output, "label": args.label, "exponent": args.exponent, "peak": peak})
    pin(PRIOR_AUDIT_SOURCE)
    failure = pin(PRIOR_FAILURE)
    assert failure is not None
    assert failure["status"] == "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD"
    assert failure["stage"] == "middle row replay exponent 2"
    assert failure["source_sha256"] == PRIOR_AUDIT_SOURCE[1]
    job = pin(CORRECTED_JOB)
    assert job is not None
    assert job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS"
    middle_manifest, middle_chunks, far_manifest, far_chunks = load_corrected_rows(job)
    expected_components = formal_audit.components_for_degree(DEGREE)
    atom_records = far_chunks[args.exponent]["atom_stream_manifests"]
    assert len(expected_components) == len(atom_records) == 42
    normalized = [
        normalize_atom(record, expected, args.exponent)
        for expected, record in zip(expected_components, atom_records)
    ]
    if args.label == "strong_middle_times_4":
        records = [record for record in normalized if record["piece"] in ("base", "linear")]
        scales = [4 if record["piece"] == "base" else 2 for record in records]
        expected_chunk = middle_chunks[args.exponent]
        row_manifest = middle_manifest
    else:
        records = normalized
        scales = [1] * len(records)
        expected_chunk = far_chunks[args.exponent]
        row_manifest = far_manifest
    result = merge_to_stream(records, scales, stream_output, peak, args.hard_private_limit_bytes)
    for key in (
        "mixed_support_terms", "negative_terms", "minimum", "first_negative",
        "ordered_coefficient_sha256",
    ):
        assert result[key] == expected_chunk["chunk"][key]
    assert result["negative_terms"] == 0
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-row-chunk-agent-v1",
        "status": "PASS_INDEPENDENT_RESUMED_FORMAL_PROVENANCE_ROW_CHUNK_STREAM_EXACT",
        "face": FACE,
        "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "auxiliary": args.label,
        "outer_exponent": args.exponent,
        "corrected_job": str(CORRECTED_JOB[0]),
        "corrected_job_sha256": CORRECTED_JOB[1],
        "corrected_row_ordered_coefficient_sha256": row_manifest["result"]["ordered_coefficient_sha256"],
        "component_streams": records,
        "component_scales": scales,
        "result": result,
        "formal_comparison_provenance": {
            "prior_audit_source": str(PRIOR_AUDIT_SOURCE[0]),
            "prior_audit_source_sha256": PRIOR_AUDIT_SOURCE[1],
            "prior_failure": str(PRIOR_FAILURE[0]),
            "prior_failure_sha256": PRIOR_FAILURE[1],
            "prior_failure_stage": failure["stage"],
            "control_flow_consequence": (
                "All exponent-0 rows, all exponent-1 atoms and rows, and all exponent-2 atoms "
                "completed before entry into the exponent-2 middle row replay."
            ),
        },
        "imports_producer": False,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_auditor_dependency_sha256": sha256(HERE / "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py"),
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            current = private_bytes()
            requested = FAILURE_CONTEXT["output"]
            atomic_json(requested.with_suffix(requested.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-resumed-row-chunk-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "auxiliary": FAILURE_CONTEXT["label"],
                "outer_exponent": FAILURE_CONTEXT["exponent"],
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(FAILURE_CONTEXT["peak"][0], current),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
