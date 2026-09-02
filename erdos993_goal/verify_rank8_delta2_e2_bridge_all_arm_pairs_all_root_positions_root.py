#!/usr/bin/env python3
"""Checkpointed exact sweep of every bridge-rooted e=2 arm-pair state."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

from run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root import (
    PAIR_TYPES,
)


ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root.py"
CHECKPOINT = ROOT / "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_checkpoint_root.json"
REPORT = ROOT / "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_exact_root_20260823.json"


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def atomic_json(path_value: Path, payload) -> None:
    temporary = path_value.with_suffix(path_value.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path_value)


def tasks():
    return [
        (left, right)
        for index, left in enumerate(PAIR_TYPES)
        for right in PAIR_TYPES[index:]
    ]


def task_key(row):
    return (
        tuple(str(value) for value in row["left_arm_pair"]),
        tuple(str(value) for value in row["right_arm_pair"]),
    )


def expected_key(task):
    return tuple(str(value) for value in task[0]), tuple(str(value) for value in task[1])


def report_path(left_pair, right_pair):
    label = (
        f"left{left_pair[0]}_{left_pair[1]}_right{right_pair[0]}_{right_pair[1]}"
        .replace("L", "long")
    )
    return ROOT / f"rank8_delta2_e2_bridge_{label}_all_root_positions_exact_root.json"


def run_task(task):
    left_pair, right_pair = task
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(RUNNER),
            "--left-a", str(left_pair[0]), "--left-b", str(left_pair[1]),
            "--right-a", str(right_pair[0]), "--right-b", str(right_pair[1]),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=1800,
    )
    if result.returncode != 0:
        raise RuntimeError(f"task {task} rc={result.returncode}; stderr={result.stderr!r}")
    path_value = report_path(left_pair, right_pair)
    payload = json.loads(path_value.read_text(encoding="utf-8"))
    if payload["status"] != (
        "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_FIXED_ARM_PAIRS_ALL_ROOT_POSITIONS"
    ):
        raise RuntimeError(f"task {task} obstruction: {payload['signed_cells'][:1]}")
    return {
        "left_arm_pair": list(left_pair),
        "right_arm_pair": list(right_pair),
        "patterns": payload["patterns_completed"],
        "empty_patterns": payload["empty_patterns"],
        "symbolic_cells": payload["symbolic_cells_completed"],
        "signed_cells": len(payload["signed_cells"]),
        "report": path_value.name,
        "report_sha256": sha256(path_value),
        "runtime_seconds": payload["runtime_seconds"],
        "wall_seconds": time.perf_counter() - started,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()
    runner_hash = sha256(RUNNER)
    verifier_hash = sha256(Path(__file__))
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("runner_sha256") == runner_hash
                and saved.get("verifier_sha256") == verifier_hash):
            rows = saved["rows"]
    completed = {task_key(row) for row in rows}
    pending = [task for task in tasks() if expected_key(task) not in completed]
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_task, task): task for task in pending}
        for future in concurrent.futures.as_completed(futures):
            row = future.result()
            rows.append(row)
            rows.sort(key=task_key)
            atomic_json(CHECKPOINT, {
                "status": "RUNNING_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS",
                "runner_sha256": runner_hash,
                "verifier_sha256": verifier_hash,
                "rows": rows,
            })
            print(
                "PASS_TASK", task_key(row), "completed", len(rows), "of", len(tasks()),
                "patterns", row["patterns"], "cells", row["symbolic_cells"],
                f"elapsed={time.perf_counter()-started:.1f}s", flush=True,
            )

    expected = {expected_key(task) for task in tasks()}
    if len(rows) != len(expected) or {task_key(row) for row in rows} != expected:
        raise RuntimeError("completed arm-pair universe mismatch")
    payload = {
        "schema": "rank8-delta2-e2-bridge-all-arm-pairs-all-root-positions-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS",
        "arm_pair_types": len(PAIR_TYPES),
        "side_pair_tasks": len(rows),
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
    print("tasks", payload["side_pair_tasks"], "patterns", payload["patterns"], "cells", payload["symbolic_cells"])
    print("source_sha256", verifier_hash)
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
