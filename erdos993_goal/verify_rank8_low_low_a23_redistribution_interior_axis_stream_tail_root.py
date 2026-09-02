#!/usr/bin/env python3
"""Checkpointed low-memory verifier for the four remaining axis units."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import LABELS


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_stream_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_probe_audit_20260822.json"
PREFIX_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_tail_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_tail_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_tail_exact_20260822.json"
EXPECTED = {
    PROBE.name: "7D99C8D8AFB6FD08E708E7F61D805199F02DBC439EA8C943347621AFE04C47C8",
    PROBE_AUDIT.name: "4F51080386BEF5BC49FF2B30BF994FA43C49250583F91AF73FAA43E4D3338664",
    PREFIX_CHECKPOINT.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
}
TARGETS = ((2, 0), (0, 2), (1, 0), (0, 1))


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def parse_one(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1
    return ast.literal_eval(lines[0])


def key(row):
    return row["p_exponent"], row["q_exponent"]


def validate(row) -> None:
    assert key(row) in TARGETS
    assert row["position_count"] == 1 and len(row["positions"]) == 1
    assert row["pass"] is True
    assert row["positions"][0]["pass"] is True
    assert set(row["positions"][0]["rows"]) == set(LABELS)
    assert row["elapsed_seconds"] >= 0
    assert len(row["engine_sha256"]) == 64
    for item in row["positions"][0]["rows"].values():
        assert item["negative"] == 0 and item["first_negative"] is None
        if item["terms"]:
            assert 0 < item["minimum"] <= item["maximum"]
        else:
            assert item["minimum"] is None and item["maximum"] is None


def run_cell(cell):
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--p", str(cell[0]), "--q", str(cell[1])],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        timeout=14400,
    )
    if result.returncode != 0 or result.stderr:
        atomic_json(FAILURE, {
            "status": "FAIL_A23_INTERIOR_AXIS_LABEL_STREAM_SUBPROCESS",
            "cell": list(cell),
            "returncode": result.returncode,
            "stderr": result.stderr,
        })
        raise RuntimeError(
            f"axis stream {cell} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    source = parse_one(result.stdout)
    assert key(source) == cell and source["label_streaming"] is True
    row = {
        "p_exponent": source["p_exponent"],
        "q_exponent": source["q_exponent"],
        "redistribution_degree": source["redistribution_degree"],
        "bernstein_scaling": source["bernstein_scaling"],
        "excluded_mixed_endpoint_positions": source["excluded_mixed_endpoint_positions"],
        "positions": source["positions"],
        "position_count": source["position_count"],
        "pass": source["pass"],
        "elapsed_seconds": time.perf_counter() - started,
        "engine": "axis_label_stream",
        "engine_sha256": EXPECTED[PROBE.name],
        "source_artifact_sha256": EXPECTED[PROBE.name],
    }
    validate(row)
    return row


def checkpoint_payload(rows, source_hash, created_utc):
    return {
        "schema": "rank8-low-low-a23-interior-axis-stream-tail-checkpoint-v1",
        "status": "RUNNING_EXACT_A23_INTERIOR_AXIS_STREAM_TAIL",
        "created_utc": created_utc,
        "updated_utc": now_utc(),
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "completed_axis_units": len(rows),
        "total_axis_units": 4,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-expansions", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_expansions is None or args.max_new_expansions >= 0
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    prefix = json.loads(PREFIX_CHECKPOINT.read_text(encoding="utf-8"))
    audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    assert prefix["completed_expansion_units"] == 85
    assert prefix["completed_position_cells"] == 373
    assert audit["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_STREAM_PROBE_AUDIT"
    prefix_keys = {(row["p_exponent"], row["q_exponent"]) for row in prefix["rows"]}
    assert not prefix_keys.intersection(TARGETS)
    source_hash = sha256(Path(__file__))
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        rows = saved["rows"]
        created_utc = saved["created_utc"]
    else:
        rows = []
        created_utc = now_utc()
    for row in rows:
        validate(row)
    assert len(rows) == len({key(row) for row in rows})
    atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))
    complete = {key(row) for row in rows}
    missing = [cell for cell in TARGETS if cell not in complete]
    if args.max_new_expansions is not None:
        missing = missing[:args.max_new_expansions]
    for cell in missing:
        row = run_cell(cell)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))
        print(
            "PASS_AXIS_STREAM", *cell, f"{row['elapsed_seconds']:.3f}s",
            len(rows), "OF", 4, flush=True,
        )
    if {key(row) for row in rows} != set(TARGETS):
        print("PAUSED_EXACT_A23_INTERIOR_AXIS_STREAM_TAIL", len(rows), "OF", 4)
        return
    payload = {
        "schema": "rank8-low-low-a23-interior-axis-stream-tail-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_STREAM_TAIL",
        "axis_units": 4,
        "position_cells": 4,
        "negative_coefficients": 0,
        "rows": rows,
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
    }
    atomic_json(REPORT, payload)
    complete_payload = checkpoint_payload(rows, source_hash, created_utc)
    complete_payload["status"] = "COMPLETE_EXACT_A23_INTERIOR_AXIS_STREAM_TAIL"
    complete_payload["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete_payload)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
