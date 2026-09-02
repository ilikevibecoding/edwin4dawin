#!/usr/bin/env python3
"""Fail-closed 240-cell assembly of the direct-H strong b4 extension."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_high_strong_b4_a0_a2_cell.py"
B3_PRIMARY = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json"
B3_AUDIT = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json"
PINS = {
    PROBE.name: "25E4837E27BBFD377495AF03B876AD049998B849A12F8A95AA447AF02F667E6D",
    B3_PRIMARY.name: "77BF1549D11559C478CCA5215C6D70186D23827C7D06C04AF8C00E1BF2BAC5CE",
    B3_AUDIT.name: "37C269AB5C0AFA36FAB61B7F02FA1F8718473FE1000CCBB8D0B1141BD043075C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (row["b4_exponent"], row["a0_exponent"], row["a2_exponent"])


def run_cell(b4: int, a0: int, a2: int) -> dict:
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--b4", str(b4), "--a0", str(a0),
         "--a2", str(a2)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=900,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(b4, a0, a2)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(b4, a0, a2)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (b4, a0, a2)
    assert row["negative"] == 0 and row["first_negative"] is None
    if row["terms"]:
        assert 0 < row["minimum"] <= row["maximum"]
    else:
        assert row["minimum"] is None and row["maximum"] is None
    row["elapsed_seconds"] = time.perf_counter()-started
    return row


def main() -> None:
    for name, expected in PINS.items():
        if sha256(ROOT/name) != expected:
            raise SystemExit(f"immutable input changed: {name}")
    assert json.loads(B3_PRIMARY.read_text(encoding="utf-8"))["status"] == (
        "PASS_EXACT_STRONG_B3_FULL_LEFT_COEFFICIENT_EXTENSION"
    )
    assert json.loads(B3_AUDIT.read_text(encoding="utf-8"))["status"] == (
        "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_EXTENSION"
    )

    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("pinned_inputs") == PINS
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for b4 in range(1, 11):
        for a0 in range(3):
            for a2 in range(8):
                if (b4, a0, a2) in completed:
                    continue
                row = run_cell(b4, a0, a2)
                rows.append(row)
                rows.sort(key=key)
                atomic_json(CHECKPOINT, {
                    "status": "RUNNING_EXACT_STRONG_B4_A0_A2_CELLS",
                    "pinned_inputs": PINS,
                    "verifier_sha256": sha256(Path(__file__)),
                    "degree_support": {"b4": [1, 10], "a0": [0, 2], "a2": [0, 7]},
                    "rows": rows,
                })
                print("PASS_CELL", b4, a0, a2, row["terms"], flush=True)
        block = [row for row in rows if row["b4_exponent"] == b4]
        assert len(block) == 24
        print("PASS_EXPONENT", b4, sum(row["terms"] for row in block), flush=True)

    expected_keys = [(b4, a0, a2) for b4 in range(1, 11)
                     for a0 in range(3) for a2 in range(8)]
    assert [key(row) for row in rows] == expected_keys
    payload = {
        "schema": "rank8-low-high-strong-b4-a0-a2-cells-v1",
        "status": "PASS_EXACT_STRONG_B3_B4_FULL_LEFT_COEFFICIENT_EXTENSION",
        "theorem": (
            "H_str=C*M0+h*d is nonnegative for arbitrary nonnegative b3,b4 "
            "and every remaining live cone variable when b5=b6=b7=0. The "
            "b4=0 face is the pinned b3 theorem; every positive b4 coefficient "
            "is strictly positive or identically zero in the exact 240-cell split."
        ),
        "degree_support_justification": (
            "The b4 gap occurs in right ratios 0 through 4, hence has degree "
            "at most 5 in each right coefficient and at most 10 in the quadratic "
            "direct-H expression. The a0/a2 bounds are 2 and 7 as in the b3 audit."
        ),
        "ordered_cells": 240,
        "rows": rows,
        "aggregate_terms": sum(row["terms"] for row in rows),
        "aggregate_negative": 0,
        "pinned_inputs": PINS,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes b3 and b4 only after b5=b6=b7 are zero. The b5 "
            "extension and corrected b6/b7 compression remain separate joins."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
