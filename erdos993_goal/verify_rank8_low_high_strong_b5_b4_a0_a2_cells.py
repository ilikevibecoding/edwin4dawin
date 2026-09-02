#!/usr/bin/env python3
"""Fail-closed b5 extension over the exact (b4,a0,a2) cell grid."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py"
B4_PRIMARY = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json"
B4_AUDIT = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_low_high_strong_b5_b4_a0_a2_cells_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json"
PINS = {
    PROBE.name: "D3D0BD450D9C1BC171F9BA60D055D23883A3BF1F295FB4B9D8EC4E9544CC2BF0",
    B4_PRIMARY.name: "0523B65E9345939887DB77F32EE5C41CAC4F142E9C5F4235701616E999B593AE",
    B4_AUDIT.name: "4DE3A98041321E29FDB2E0DA24B16C4AB477923FAFD091EEA5C2B17642D88103",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix+".tmp")
    temporary.write_text(json.dumps(payload, indent=2)+"\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (row["b5_exponent"], row["b4_exponent"],
            row["a0_exponent"], row["a2_exponent"])


def run_cell(b5, b4, a0, a2):
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--b5", str(b5), "--b4", str(b4),
         "--a0", str(a0), "--a2", str(a2)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=900,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(b5,b4,a0,a2)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(b5,b4,a0,a2)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (b5,b4,a0,a2)
    assert row["negative"] == 0 and row["first_negative"] is None
    if row["terms"]:
        assert 0 < row["minimum"] <= row["maximum"]
    else:
        assert row["minimum"] is None and row["maximum"] is None
    row["elapsed_seconds"] = time.perf_counter()-started
    return row


def main():
    for name, expected in PINS.items():
        if sha256(ROOT/name) != expected:
            raise SystemExit(f"immutable input changed: {name}")
    assert json.loads(B4_PRIMARY.read_text(encoding="utf-8"))["status"] == (
        "PASS_EXACT_STRONG_B3_B4_FULL_LEFT_COEFFICIENT_EXTENSION"
    )
    assert json.loads(B4_AUDIT.read_text(encoding="utf-8"))["status"] == (
        "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_B4_EXTENSION"
    )
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("pinned_inputs") == PINS
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for b5 in range(1,13):
        for b4 in range(0,11):
            for a0 in range(3):
                for a2 in range(8):
                    if (b5,b4,a0,a2) in completed:
                        continue
                    row = run_cell(b5,b4,a0,a2)
                    rows.append(row)
                    rows.sort(key=key)
                    atomic_json(CHECKPOINT, {
                        "status": "RUNNING_EXACT_STRONG_B5_B4_A0_A2_CELLS",
                        "pinned_inputs": PINS,
                        "verifier_sha256": sha256(Path(__file__)),
                        "degree_support": {"b5":[1,12],"b4":[0,10],
                                           "a0":[0,2],"a2":[0,7]},
                        "rows": rows,
                    })
                    print("PASS_CELL", b5,b4,a0,a2,row["terms"],flush=True)
        block = [row for row in rows if row["b5_exponent"] == b5]
        assert len(block) == 264
        print("PASS_EXPONENT", b5, sum(row["terms"] for row in block), flush=True)

    expected_keys = [(b5,b4,a0,a2) for b5 in range(1,13)
                     for b4 in range(11) for a0 in range(3) for a2 in range(8)]
    assert [key(row) for row in rows] == expected_keys
    payload = {
        "schema": "rank8-low-high-strong-b5-b4-a0-a2-cells-v1",
        "status": "PASS_EXACT_STRONG_B3_B4_B5_FULL_LEFT_COEFFICIENT_EXTENSION",
        "theorem": (
            "H_str=C*M0+h*d is nonnegative for arbitrary nonnegative b3,b4,b5 "
            "and all remaining live cone variables when b6=b7=0. The b5=0 "
            "face is the pinned b3/b4 theorem; all positive b5 coefficients "
            "are positive or identically zero on the exact outer-degree grid."
        ),
        "degree_support_justification": (
            "The b5 gap occurs in right ratios 0..5, so its quadratic degree is "
            "at most 12. The b4, a0, and a2 maxima are 10, 2, and 7."
        ),
        "ordered_cells": 3168,
        "rows": rows,
        "aggregate_terms": sum(row["terms"] for row in rows),
        "aggregate_negative": 0,
        "pinned_inputs": PINS,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The corrected b6/b7 terminal compression theorem remains a "
            "separate dependency before promoting this to the full low/high cone."
        ),
    }
    atomic_json(REPORT,payload)
    print(payload["status"])
    print("SOURCE",payload["source_sha256"])
    print("REPORT",sha256(REPORT))


if __name__ == "__main__":
    main()
