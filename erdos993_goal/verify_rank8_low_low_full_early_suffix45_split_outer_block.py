#!/usr/bin/env python3
"""Memory-bounded 132-cell verifier for one fixed non-origin (a5,b5) block."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix45_cell_flint.py"
SUFFIX5_REPORT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
EXPECTED_PROBE = "03E23C298BAD633104C391A1A0A97E9E55278E764782460A23AF2A8E60ADE073"
EXPECTED_SUFFIX5_REPORT = "8993846F0A260DBEF8091D3617AF8EAAACED67AD274ADA8EA9C181B45D102F7F"
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a4_exponent"], row["b4_exponent"]


def ordered_cells():
    cells = [(a4, b4) for a4 in range(12) for b4 in range(11)]
    priority = [(1, 0), (0, 1), (1, 1), (11, 0), (0, 10)]
    rest = sorted(
        (cell for cell in cells if cell not in priority and cell != (0, 0)),
        key=lambda cell: (sum(cell), cell[0], cell[1]),
    )
    return priority + rest + [(0, 0)]


def run_cell(a4: int, b4: int, a5: int, b5: int, suffix5_face_rows) -> dict:
    started = time.perf_counter()
    if (a4, b4) == (0, 0):
        return {
            "a4_exponent": 0,
            "b4_exponent": 0,
            "a5_exponent": a5,
            "b5_exponent": b5,
            "rows": suffix5_face_rows,
            "coordinate_face_reference": {
                "report": SUFFIX5_REPORT.name,
                "sha256": EXPECTED_SUFFIX5_REPORT,
                "cell": [a5, b5],
            },
            "pass": True,
            "elapsed_seconds": time.perf_counter() - started,
        }
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--a4", str(a4), "--b4", str(b4),
            "--a5", str(a5), "--b5", str(b5),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=3600,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a4, b4, a5, b5)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(a4, b4, a5, b5)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (a4, b4)
    assert (row["a5_exponent"], row["b5_exponent"]) == (a5, b5)
    assert row["pass"] and set(row["rows"]) == set(AUXILIARIES)
    for auxiliary in AUXILIARIES:
        statistics = row["rows"][auxiliary]
        assert statistics["negative"] == 0 and statistics["first_negative"] is None
        if statistics["terms"]:
            assert statistics["minimum"] > 0
            assert statistics["maximum"] >= statistics["minimum"]
        else:
            assert statistics["minimum"] is None and statistics["maximum"] is None
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--a5", choices=range(14), type=int, required=True)
    parser.add_argument("--b5", choices=range(13), type=int, required=True)
    args = parser.parse_args()
    assert (args.a5, args.b5) != (0, 0)
    assert sha256(PROBE) == EXPECTED_PROBE
    assert sha256(SUFFIX5_REPORT) == EXPECTED_SUFFIX5_REPORT
    suffix5 = json.loads(SUFFIX5_REPORT.read_text(encoding="utf-8"))
    face = next(
        row for row in suffix5["rows"]
        if (row["a5_exponent"], row["b5_exponent"]) == (args.a5, args.b5)
    )
    suffix5_face_rows = face["rows"]
    checkpoint = ROOT / (
        f"rank8_low_low_full_early_suffix45_split_a5_{args.a5}_b5_{args.b5}_"
        "checkpoint_20260822.json"
    )
    output = ROOT / (
        f"rank8_low_low_full_early_suffix45_split_a5_{args.a5}_b5_{args.b5}_"
        "exact_20260822.json"
    )

    rows = []
    if checkpoint.exists():
        saved = json.loads(checkpoint.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == EXPECTED_PROBE
                and saved.get("verifier_sha256") == sha256(Path(__file__))
                and saved.get("outer_block") == [args.a5, args.b5]):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for a4, b4 in ordered_cells():
        if (a4, b4) in completed:
            continue
        row = run_cell(a4, b4, args.a5, args.b5, suffix5_face_rows)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(checkpoint, {
            "status": "RUNNING_EXACT_RANK8_SUFFIX45_SPLIT_OUTER_BLOCK",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "outer_block": [args.a5, args.b5],
            "inner_degree_support": {"a4": [0, 11], "b4": [0, 10]},
            "rows": rows,
        })
        totals = {name: row["rows"][name]["terms"] for name in AUXILIARIES}
        print("PASS_CELL", a4, b4, totals, f"{row['elapsed_seconds']:.3f}s", flush=True)

    expected = [(a4, b4) for a4 in range(12) for b4 in range(11)]
    assert len(rows) == 132 and sorted(map(key, rows)) == expected
    aggregates = {}
    for auxiliary in AUXILIARIES:
        nonempty = [row["rows"][auxiliary] for row in rows if row["rows"][auxiliary]["terms"]]
        aggregates[auxiliary] = {
            "terms": sum(item["terms"] for item in nonempty),
            "negative": 0,
            "minimum": min(item["minimum"] for item in nonempty),
            "maximum": max(item["maximum"] for item in nonempty),
        }
    payload = {
        "schema": "rank8-low-low-full-early-suffix45-split-outer-block-v1",
        "status": "PASS_EXACT_RANK8_SUFFIX45_SPLIT_OUTER_BLOCK",
        "outer_block": [args.a5, args.b5],
        "inner_grid_cells": 132,
        "inner_degree_support_justification": (
            "The individual suffix-4 degrees remain bounded by a4<=11 and "
            "b4<=10 after adjoining fixed a5,b5 powers; all 132 coefficients "
            "are checked, with the a4=b4=0 cell supplied by the immutable "
            "suffix-5 face certificate."
        ),
        "rows": rows,
        "block_summary": {
            "a5_exponent": args.a5,
            "b5_exponent": args.b5,
            "rows": aggregates,
            "suffix5_face_rows": suffix5_face_rows,
            "pass": True,
            "suffix5_face_match": True,
            "split_cell_report": output.name,
        },
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            SUFFIX5_REPORT.name: EXPECTED_SUFFIX5_REPORT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
