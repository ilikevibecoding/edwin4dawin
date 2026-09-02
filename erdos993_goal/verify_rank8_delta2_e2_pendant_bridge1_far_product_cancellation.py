#!/usr/bin/env python3
"""Checkpointed all-cell audit of far-product cancellation at bridge one."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_delta2_e2_pendant_bridge1_far_product_cell.py"
CHECKPOINT = ROOT / "rank8_delta2_e2_pendant_bridge1_far_product_cancellation_checkpoint_20260821.json"
REPORT = ROOT / "rank8_delta2_e2_pendant_bridge1_far_product_cancellation_exact_20260821.json"
LONG = "L"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return str(row["paired_state"]), str(row["near_state"]), str(row["tail_state"])


def ordered_cells():
    paired = [1, 2, 3, 4, 5, 6, LONG]
    root = [0, 1, 2, 3, 4, 5, 6, LONG]
    return sorted(
        ((p, n, t) for p in paired for n in root for t in root),
        key=lambda cell: (
            sum(value == LONG for value in cell),
            str(cell[0]), str(cell[1]), str(cell[2]),
        ),
    )


def run_cell(paired, near, tail):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--paired", str(paired), "--near", str(near), "--tail", str(tail),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=300,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(paired, near, tail)} rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == (str(paired), str(near), str(tail))
    assert row["far_product_degree"] == 0
    assert row["negative_coefficients"] == 0
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main() -> None:
    probe_hash = sha256(PROBE)
    verifier_hash = sha256(Path(__file__))
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == probe_hash
                and saved.get("verifier_sha256") == verifier_hash):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for paired, near, tail in ordered_cells():
        cell_key = (str(paired), str(near), str(tail))
        if cell_key in completed:
            continue
        row = run_cell(paired, near, tail)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_RANK8_DELTA2_BRIDGE1_FAR_PRODUCT_CANCELLATION",
            "probe_sha256": probe_hash,
            "verifier_sha256": verifier_hash,
            "rows": rows,
        })
        print(
            "PASS_CELL", paired, near, tail,
            "terms", row["terms"], f"{row['elapsed_seconds']:.3f}s",
            flush=True,
        )

    expected = {(str(p), str(n), str(t)) for p, n, t in ordered_cells()}
    assert len(rows) == 448 and {key(row) for row in rows} == expected
    payload = {
        "schema": "rank8-delta2-e2-pendant-bridge1-far-product-cancellation-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_PRODUCT_CANCELLATION",
        "theorem": (
            "For every paired-arm and selected-root short/long state at "
            "bridge length one, the exact Delta2 polynomial is independent "
            "of the symmetric product of the two long far-arm offsets."
        ),
        "cells": len(rows),
        "terms": sum(row["terms"] for row in rows),
        "maximum_far_product_degree": max(row["far_product_degree"] for row in rows),
        "negative_coefficients": sum(row["negative_coefficients"] for row in rows),
        "rows": rows,
        "immutable_inputs": {PROBE.name: probe_hash},
        "source_sha256": verifier_hash,
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", verifier_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
