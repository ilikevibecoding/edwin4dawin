#!/usr/bin/env python3
"""Memory-bounded semiblock verifier for one fixed (a5,b5) block."""

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
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix45_semiblock_flint.py"
CELL_PROBE = ROOT / "probe_rank8_low_low_full_early_suffix45_cell_flint.py"
SUFFIX5_REPORT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
EXPECTED_PROBE = "048018CE51F928EFAF5FEFEC80A21E5DB38627904F9D2A8FA2602FFE11A9E0EB"
EXPECTED_CELL_PROBE = "03E23C298BAD633104C391A1A0A97E9E55278E764782460A23AF2A8E60ADE073"
EXPECTED_CELL_VERIFIER = "97FC396F766BC634F022A14C1943DF064FA18EE92947483EB101A5A2FDD2CB0F"
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


def fixed_values(retain):
    upper = 11 if retain == "b4" else 10
    priority = [1, 0, upper]
    return priority + [value for value in range(upper + 1) if value not in priority]


def validate_cell(row, a5, b5):
    assert (row["a5_exponent"], row["b5_exponent"]) == (a5, b5)
    assert 0 <= row["a4_exponent"] <= 11
    assert 0 <= row["b4_exponent"] <= 10
    assert row["pass"] and set(row["rows"]) == set(AUXILIARIES)
    for label in AUXILIARIES:
        statistics = row["rows"][label]
        assert statistics["negative"] == 0
        assert statistics["first_negative"] is None
        if statistics["terms"]:
            assert statistics["minimum"] > 0
            assert statistics["maximum"] >= statistics["minimum"]
        else:
            assert statistics["minimum"] is None
            assert statistics["maximum"] is None


def load_seed(a5, b5):
    seed_path = ROOT / (
        f"rank8_low_low_full_early_suffix45_split_a5_{a5}_b5_{b5}_"
        "checkpoint_20260822.json"
    )
    if not seed_path.exists():
        return [], None
    saved = json.loads(seed_path.read_text(encoding="utf-8"))
    if not (
        saved.get("probe_sha256") == EXPECTED_CELL_PROBE
        and saved.get("verifier_sha256") == EXPECTED_CELL_VERIFIER
        and saved.get("outer_block") == [a5, b5]
    ):
        return [], None
    rows = saved["rows"]
    assert len({key(row) for row in rows}) == len(rows)
    for row in rows:
        validate_cell(row, a5, b5)
    return rows, {
        "path": seed_path.name,
        "sha256_at_import": sha256(seed_path),
        "rows_imported": len(rows),
        "cell_probe_sha256": EXPECTED_CELL_PROBE,
        "cell_verifier_sha256": EXPECTED_CELL_VERIFIER,
    }


def run_semiblock(retain, fixed, a5, b5):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE), "--retain", retain,
            "--fixed-exponent", str(fixed),
            "--a5", str(a5), "--b5", str(b5),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"semiblock {(retain, fixed, a5, b5)} failed "
            f"rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(
            f"semiblock {(retain, fixed, a5, b5)} unexpected output: {lines!r}"
        )
    output = ast.literal_eval(lines[0])
    assert output["retained"] == retain
    assert output["fixed_exponent"] == fixed
    assert (output["a5_exponent"], output["b5_exponent"]) == (a5, b5)
    expected_count = 11 if retain == "b4" else 12
    assert output["pass"] and len(output["rows"]) == expected_count
    for row in output["rows"]:
        validate_cell(row, a5, b5)
    fixed_coordinate = 0 if retain == "b4" else 1
    assert {key(row)[fixed_coordinate] for row in output["rows"]} == {fixed}
    return output["rows"], time.perf_counter() - started


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--a5", choices=range(14), type=int, required=True)
    parser.add_argument("--b5", choices=range(13), type=int, required=True)
    parser.add_argument("--retain", choices=("a4", "b4"), required=True)
    args = parser.parse_args()
    assert (args.a5, args.b5) != (0, 0)
    assert sha256(PROBE) == EXPECTED_PROBE
    assert sha256(CELL_PROBE) == EXPECTED_CELL_PROBE
    assert sha256(SUFFIX5_REPORT) == EXPECTED_SUFFIX5_REPORT
    suffix5 = json.loads(SUFFIX5_REPORT.read_text(encoding="utf-8"))
    face = next(
        row for row in suffix5["rows"]
        if (row["a5_exponent"], row["b5_exponent"])
        == (args.a5, args.b5)
    )
    suffix5_face_rows = face["rows"]
    checkpoint = ROOT / (
        f"rank8_low_low_full_early_suffix45_semiblock_a5_{args.a5}_"
        f"b5_{args.b5}_checkpoint_20260822.json"
    )
    output_path = ROOT / (
        f"rank8_low_low_full_early_suffix45_semiblock_a5_{args.a5}_"
        f"b5_{args.b5}_exact_20260822.json"
    )

    rows = []
    seed_reference = None
    if checkpoint.exists():
        saved = json.loads(checkpoint.read_text(encoding="utf-8"))
        if (
            saved.get("probe_sha256") == EXPECTED_PROBE
            and saved.get("verifier_sha256") == sha256(Path(__file__))
            and saved.get("outer_block") == [args.a5, args.b5]
            and saved.get("retained") == args.retain
        ):
            rows = saved["rows"]
            seed_reference = saved.get("seed_reference")
    if not rows:
        rows, seed_reference = load_seed(args.a5, args.b5)
    existing = {key(row): row for row in rows}
    semiblock_timings = []
    for fixed in fixed_values(args.retain):
        fixed_coordinate = 0 if args.retain == "b4" else 1
        expected_keys = {
            (fixed, b4) if args.retain == "b4" else (a4, fixed)
            for a4 in range(12) for b4 in range(11)
        }
        if expected_keys <= set(existing):
            continue
        new_rows, elapsed = run_semiblock(
            args.retain, fixed, args.a5, args.b5,
        )
        for row in new_rows:
            row_key = key(row)
            if row_key in existing:
                assert existing[row_key]["rows"] == row["rows"]
            else:
                existing[row_key] = row
        rows = sorted(existing.values(), key=key)
        semiblock_timings.append({
            "fixed_exponent": fixed,
            "elapsed_seconds": elapsed,
            "cells_returned": len(new_rows),
        })
        atomic_json(checkpoint, {
            "status": "RUNNING_EXACT_RANK8_SUFFIX45_SEMIBLOCK_OUTER",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "outer_block": [args.a5, args.b5],
            "retained": args.retain,
            "seed_reference": seed_reference,
            "semiblock_timings": semiblock_timings,
            "rows": rows,
        })
        print(
            "PASS_SEMIBLOCK", args.retain, fixed,
            "CELLS", len(new_rows), "TOTAL", len(rows),
            f"{elapsed:.3f}s", flush=True,
        )

    expected = [(a4, b4) for a4 in range(12) for b4 in range(11)]
    assert len(rows) == 132 and list(map(key, rows)) == expected
    origin = existing[(0, 0)]
    assert origin["rows"] == suffix5_face_rows
    aggregates = {}
    for label in AUXILIARIES:
        nonempty = [row["rows"][label] for row in rows if row["rows"][label]["terms"]]
        aggregates[label] = {
            "terms": sum(item["terms"] for item in nonempty),
            "negative": 0,
            "minimum": min(item["minimum"] for item in nonempty),
            "maximum": max(item["maximum"] for item in nonempty),
        }
    payload = {
        "schema": "rank8-low-low-full-early-suffix45-semiblock-outer-v1",
        "status": "PASS_EXACT_RANK8_SUFFIX45_SPLIT_OUTER_BLOCK",
        "outer_block": [args.a5, args.b5],
        "inner_grid_cells": 132,
        "semiblock_method": {
            "retained": args.retain,
            "fixed_coordinate": "a4" if args.retain == "b4" else "b4",
            "completed_semiblocks": len(semiblock_timings),
            "timings": semiblock_timings,
            "seed_reference": seed_reference,
        },
        "rows": rows,
        "block_summary": {
            "a5_exponent": args.a5,
            "b5_exponent": args.b5,
            "rows": aggregates,
            "suffix5_face_rows": suffix5_face_rows,
            "pass": True,
            "suffix5_face_match": True,
            "split_cell_report": output_path.name,
        },
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            CELL_PROBE.name: EXPECTED_CELL_PROBE,
            SUFFIX5_REPORT.name: EXPECTED_SUFFIX5_REPORT,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(output_path, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output_path))


if __name__ == "__main__":
    main()
