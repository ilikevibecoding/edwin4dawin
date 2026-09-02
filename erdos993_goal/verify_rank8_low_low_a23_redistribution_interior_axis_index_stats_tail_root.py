#!/usr/bin/env python3
"""Resume the four-axis tail with a no-list exact coefficient scanner."""

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
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_index_stats_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_probe_audit_20260823.json"
IMPORTED_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_stream_tail_checkpoint_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_tail_checkpoint_20260823.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_tail_failure_20260823.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_tail_exact_20260823.json"
EXPECTED = {
    PROBE.name: "BC72176B26FAACE2DB3024047B6CA373D0ADEDCCE12EBAE5437C380DFA57820A",
    PROBE_AUDIT.name: "271E158A17D8A5C9FCAD71133C033C50FA473B0930B095A160129171A6C9156B",
    IMPORTED_CHECKPOINT.name: "AE7AA78EAA06D9BC25DDF7A8D774AC22D8869429AF75A1D18151464F796FF247",
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
    assert row["pass"] is True and row["positions"][0]["pass"] is True
    assert set(row["positions"][0]["rows"]) == set(LABELS)
    assert row["redistribution_degree"] == [2, 2]
    assert row["bernstein_scaling"] == 4
    assert row["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
    assert row["elapsed_seconds"] >= 0
    assert len(row["engine_sha256"]) == 64
    assert len(row["source_artifact_sha256"]) == 64
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
        atomic_json(
            FAILURE,
            {
                "status": "FAIL_A23_INTERIOR_AXIS_INDEX_STATS_SUBPROCESS",
                "cell": list(cell),
                "returncode": result.returncode,
                "stderr": result.stderr,
            },
        )
        raise RuntimeError(
            f"axis index stream {cell} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    source = parse_one(result.stdout)
    assert key(source) == cell
    assert source["label_streaming"] is True
    assert source["coefficient_scan"] == "flint_term_index_no_python_list"
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
        "engine": "axis_label_stream_flint_index_stats",
        "engine_sha256": EXPECTED[PROBE.name],
        "source_artifact_sha256": EXPECTED[PROBE.name],
    }
    validate(row)
    return row


def checkpoint_payload(rows, source_hash, created_utc):
    return {
        "schema": "rank8-low-low-a23-interior-axis-index-stats-tail-checkpoint-v1",
        "status": "RUNNING_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_TAIL",
        "created_utc": created_utc,
        "updated_utc": now_utc(),
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "completed_axis_units": len(rows),
        "total_axis_units": 4,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
    }


def imported_rows():
    saved = json.loads(IMPORTED_CHECKPOINT.read_text(encoding="utf-8"))
    assert saved["status"] == "RUNNING_EXACT_A23_INTERIOR_AXIS_STREAM_TAIL"
    assert saved["completed_axis_units"] == 1
    assert len(saved["rows"]) == 1 and key(saved["rows"][0]) == (2, 0)
    return saved["rows"], saved["created_utc"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-expansions", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_expansions is None or args.max_new_expansions >= 0
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_PROBE_AUDIT"
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        rows = saved["rows"]
        created_utc = saved["created_utc"]
    else:
        rows, created_utc = imported_rows()
    for row in rows:
        validate(row)
    assert len(rows) == len({key(row) for row in rows})
    atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))

    complete = {key(row) for row in rows}
    missing = [cell for cell in TARGETS if cell not in complete]
    if args.max_new_expansions is not None:
        missing = missing[: args.max_new_expansions]
    for cell in missing:
        row = run_cell(cell)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))
        print(
            "PASS_AXIS_INDEX_STATS",
            *cell,
            f"{row['elapsed_seconds']:.3f}s",
            len(rows),
            "OF",
            4,
            flush=True,
        )

    if {key(row) for row in rows} != set(TARGETS):
        print("PAUSED_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_TAIL", len(rows), "OF", 4)
        return
    payload = {
        "schema": "rank8-low-low-a23-interior-axis-index-stats-tail-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_TAIL",
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
    complete_payload["status"] = "COMPLETE_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_TAIL"
    complete_payload["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete_payload)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
