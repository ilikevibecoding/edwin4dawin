#!/usr/bin/env python3
"""Checkpointed product-retaining audit for pendant bridges 2 through 7.

The primary fixed-bridge cells compress the two long far-arm offsets to their
sum.  This verifier independently invokes the product-retaining cell probe and
requires exact degree zero in the symmetric product coordinate in every one of
the 6*7*8*8 state cells.  It also rechecks coefficient nonnegativity.  The
result is an exact finite symbolic audit, not a floating-point sample.
"""

from __future__ import annotations

import argparse
import ast
import concurrent.futures
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_delta2_e2_pendant_fixed_bridge_far_product_cell_root.py"
CHECKPOINT = ROOT / "rank8_delta2_e2_pendant_bridges2to7_far_product_cancellation_checkpoint_root.json"
REPORT = ROOT / "rank8_delta2_e2_pendant_bridges2to7_far_product_cancellation_exact_root.json"
LONG = "L"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (
        int(row["bridge_length"]), str(row["paired_state"]),
        str(row["near_state"]), str(row["tail_state"]),
    )


def ordered_cells(bridges):
    paired = [1, 2, 3, 4, 5, 6, LONG]
    root = [0, 1, 2, 3, 4, 5, 6, LONG]
    return sorted(
        ((b, p, n, t) for b in bridges for p in paired for n in root for t in root),
        key=lambda cell: (
            sum(value == LONG for value in cell[1:]),
            cell[0], str(cell[1]), str(cell[2]), str(cell[3]),
        ),
    )


def run_cell(cell):
    bridge, paired, near, tail = cell
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE), "--bridge-length", str(bridge),
            "--paired", str(paired), "--near", str(near), "--tail", str(tail),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=600,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {cell} rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {cell} unexpected stdout={result.stdout!r}")
    row = ast.literal_eval(lines[0])
    if key(row) != (bridge, str(paired), str(near), str(tail)):
        raise RuntimeError(f"cell {cell} key mismatch: {key(row)}")
    if row["far_product_degree"] != 0 or row["negative_coefficients"] != 0:
        raise RuntimeError(f"cell {cell} failed exact audit: {row}")
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--bridges", type=int, nargs="+", default=list(range(2, 8)))
    args = parser.parse_args()
    bridges = sorted(set(args.bridges))
    if not bridges or any(bridge not in range(2, 8) for bridge in bridges):
        raise SystemExit("bridges must be a nonempty subset of 2..7")

    probe_hash = sha256(PROBE)
    verifier_hash = sha256(Path(__file__))
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == probe_hash
                and saved.get("verifier_sha256") == verifier_hash):
            rows = [row for row in saved["rows"] if row["bridge_length"] in bridges]
    completed = {key(row) for row in rows}
    pending = [cell for cell in ordered_cells(bridges) if (
        cell[0], str(cell[1]), str(cell[2]), str(cell[3])
    ) not in completed]
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_cell, cell): cell for cell in pending}
        for future in concurrent.futures.as_completed(futures):
            row = future.result()
            rows.append(row)
            rows.sort(key=key)
            atomic_json(CHECKPOINT, {
                "status": "RUNNING_RANK8_DELTA2_BRIDGES2TO7_FAR_PRODUCT_CANCELLATION",
                "bridges": bridges,
                "probe_sha256": probe_hash,
                "verifier_sha256": verifier_hash,
                "rows": rows,
            })
            if len(rows) % 16 == 0:
                print(
                    "PASS_CELLS", len(rows), "of", len(ordered_cells(bridges)),
                    f"elapsed={time.perf_counter() - started:.1f}s", flush=True,
                )

    expected = {
        (b, str(p), str(n), str(t)) for b, p, n, t in ordered_cells(bridges)
    }
    if len(rows) != len(expected) or {key(row) for row in rows} != expected:
        raise RuntimeError("completed key universe mismatch")
    payload = {
        "schema": "rank8-delta2-e2-pendant-bridges2to7-far-product-cancellation-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_BRIDGES2TO7_FAR_PRODUCT_CANCELLATION",
        "bridges": bridges,
        "cells": len(rows),
        "terms": sum(row["terms"] for row in rows),
        "maximum_far_product_degree": max(row["far_product_degree"] for row in rows),
        "negative_coefficients": sum(row["negative_coefficients"] for row in rows),
        "rows": rows,
        "immutable_inputs": {PROBE.name: probe_hash},
        "source_sha256": verifier_hash,
        "runtime_seconds_current_invocation": time.perf_counter() - started,
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("cells", payload["cells"], "terms", payload["terms"])
    print("source_sha256", verifier_hash)
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
