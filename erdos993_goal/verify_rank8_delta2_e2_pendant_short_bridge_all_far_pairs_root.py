#!/usr/bin/env python3
"""Checkpointed exact sweep of every non-long/long far state at short bridges."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py"
CHECKPOINT = ROOT / "rank8_delta2_e2_pendant_short_bridges_all_far_pairs_checkpoint_root.json"
REPORT = ROOT / "rank8_delta2_e2_pendant_short_bridges_all_far_pairs_exact_root.json"
LONG = "L"
STATES = [1, 2, 3, 4, 5, 6, LONG]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def tasks(bridges):
    pairs = [
        (left, right)
        for i, left in enumerate(STATES)
        for right in STATES[i:]
        if (left, right) != (LONG, LONG)
    ]
    return [(bridge, left, right) for bridge in bridges for left, right in pairs]


def task_key(row):
    return int(row["bridge_length"]), str(row["far_pair"][0]), str(row["far_pair"][1])


def report_path(bridge, left, right):
    label = f"bridge{bridge}_far{left}_{right}".replace("L", "long")
    return ROOT / f"rank8_delta2_e2_pendant_{label}_root_side_arbitrary_cells_exact_root.json"


def run_task(task):
    bridge, left, right = task
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(RUNNER), "--bridge-length", str(bridge),
            "--far-left", str(left), "--far-right", str(right),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=1800,
    )
    if result.returncode != 0:
        raise RuntimeError(f"task {task} rc={result.returncode}; stderr={result.stderr!r}")
    path = report_path(bridge, left, right)
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload["status"] != (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_PAIR_ROOT_SIDE_ARBITRARY"
    ):
        raise RuntimeError(f"task {task} obstruction: {payload['signed_cells'][:1]}")
    return {
        "bridge_length": bridge,
        "far_pair": [left, right],
        "patterns": payload["patterns_completed"],
        "empty_patterns": payload["empty_patterns"],
        "symbolic_cells": payload["symbolic_cells_completed"],
        "signed_cells": len(payload["signed_cells"]),
        "report": path.name,
        "report_sha256": sha256(path),
        "runtime_seconds": payload["runtime_seconds"],
        "wall_seconds": time.perf_counter() - started,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bridges", type=int, nargs="+", default=list(range(1, 8)))
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    bridges = sorted(set(args.bridges))
    if not bridges or any(bridge not in range(1, 8) for bridge in bridges):
        raise SystemExit("bridges must be a nonempty subset of 1..7")

    runner_hash = sha256(RUNNER)
    verifier_hash = sha256(Path(__file__))
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("runner_sha256") == runner_hash
                and saved.get("verifier_sha256") == verifier_hash):
            rows = [row for row in saved["rows"] if row["bridge_length"] in bridges]
    complete = {task_key(row) for row in rows}
    pending = [task for task in tasks(bridges) if (
        task[0], str(task[1]), str(task[2])
    ) not in complete]
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_task, task): task for task in pending}
        for future in concurrent.futures.as_completed(futures):
            row = future.result()
            rows.append(row)
            rows.sort(key=task_key)
            atomic_json(CHECKPOINT, {
                "status": "RUNNING_RANK8_DELTA2_E2_PENDANT_SHORT_BRIDGES_ALL_FAR_PAIRS",
                "bridges": bridges,
                "runner_sha256": runner_hash,
                "verifier_sha256": verifier_hash,
                "rows": rows,
            })
            print(
                "PASS_TASK", task_key(row), "completed", len(rows), "of", len(tasks(bridges)),
                "cells", row["symbolic_cells"], f"elapsed={time.perf_counter()-started:.1f}s",
                flush=True,
            )

    expected = {(b, str(l), str(r)) for b, l, r in tasks(bridges)}
    if len(rows) != len(expected) or {task_key(row) for row in rows} != expected:
        raise RuntimeError("completed task universe mismatch")
    payload = {
        "schema": "rank8-delta2-e2-pendant-short-bridges-all-far-pairs-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_SHORT_BRIDGES_ALL_NONLONGLONG_FAR_PAIRS",
        "bridges": bridges,
        "far_pair_states_per_bridge": 27,
        "tasks": len(rows),
        "patterns": sum(row["patterns"] for row in rows),
        "empty_patterns": sum(row["empty_patterns"] for row in rows),
        "symbolic_cells": sum(row["symbolic_cells"] for row in rows),
        "signed_cells": sum(row["signed_cells"] for row in rows),
        "rows": rows,
        "immutable_inputs": {RUNNER.name: runner_hash},
        "source_sha256": verifier_hash,
        "runtime_seconds_current_invocation": time.perf_counter() - started,
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("tasks", payload["tasks"], "cells", payload["symbolic_cells"])
    print("source_sha256", verifier_hash)
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
