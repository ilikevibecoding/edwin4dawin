#!/usr/bin/env python3
"""Fail-closed 192-cell assembly of the direct-H strong b3 extension."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_high_strong_b3_a0_a2_cell.py"
CHECKPOINT = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json"
EXPECTED_PROBE = "97AEEBC10284F902CC6C20C26C5028EE7CC868508BA44AA5BBD720C03EB77CEE"
EXPECTED = {
    1: (17_235_191, 1, 393_182_128_404_760_680),
    2: (10_606_008, 1, 233_584_957_392_162_480),
    3: (6_040_512, 2, 77_896_308_585_006_084),
    4: (3_221_170, 1, 15_511_083_293_515_020),
    5: (1_540_660, 2, 1_945_350_763_657_992),
    6: (642_531, 1, 149_624_029_700_808),
    7: (209_814, 2, 6_421_288_711_032),
    8: (43_155, 1, 118_263_586_200),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (row["b3_exponent"], row["a0_exponent"], row["a2_exponent"])


def run_cell(b3: int, a0: int, a2: int) -> dict:
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--b3", str(b3), "--a0", str(a0),
         "--a2", str(a2)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=900,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(b3, a0, a2)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(b3, a0, a2)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (b3, a0, a2)
    assert row["negative"] == 0 and row["first_negative"] is None
    if row["terms"] == 0:
        assert row["minimum"] is None and row["maximum"] is None
    else:
        assert row["minimum"] > 0 and row["maximum"] >= row["minimum"]
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def verify_completed_exponent(rows, exponent):
    block = [row for row in rows if row["b3_exponent"] == exponent]
    if len(block) != 24:
        return None
    assert sorted((row["a0_exponent"], row["a2_exponent"]) for row in block) == [
        (a0, a2) for a0 in range(3) for a2 in range(8)
    ]
    expected_terms, expected_minimum, expected_maximum = EXPECTED[exponent]
    nonempty = [row for row in block if row["terms"]]
    aggregate = {
        "b3_exponent": exponent,
        "cells": 24,
        "nonempty_cells": len(nonempty),
        "terms": sum(row["terms"] for row in block),
        "negative": 0,
        "minimum": min(row["minimum"] for row in nonempty),
        "maximum": max(row["maximum"] for row in nonempty),
    }
    assert (aggregate["terms"], aggregate["minimum"], aggregate["maximum"]) == (
        expected_terms, expected_minimum, expected_maximum
    )
    return aggregate


def main() -> None:
    if sha256(PROBE) != EXPECTED_PROBE:
        raise SystemExit("probe hash changed; refusing to run")
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == EXPECTED_PROBE
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for b3 in range(1, 9):
        for a0 in range(3):
            for a2 in range(8):
                if (b3, a0, a2) in completed:
                    continue
                row = run_cell(b3, a0, a2)
                rows.append(row)
                rows.sort(key=key)
                atomic_json(CHECKPOINT, {
                    "status": "RUNNING_EXACT_STRONG_B3_A0_A2_CELLS",
                    "probe_sha256": EXPECTED_PROBE,
                    "verifier_sha256": sha256(Path(__file__)),
                    "degree_support": {"b3": [1, 8], "a0": [0, 2], "a2": [0, 7]},
                    "rows": rows,
                })
                print("PASS_CELL", b3, a0, a2, row["terms"], flush=True)
        aggregate = verify_completed_exponent(rows, b3)
        print("PASS_EXPONENT", b3, aggregate["terms"], flush=True)

    assert len(rows) == 192
    aggregates = [verify_completed_exponent(rows, exponent) for exponent in range(1, 9)]
    payload = {
        "schema": "rank8-low-high-strong-b3-a0-a2-cells-v1",
        "status": "PASS_EXACT_STRONG_B3_FULL_LEFT_COEFFICIENT_EXTENSION",
        "theorem": (
            "Every positive b3 coefficient of H_str=C*M0+h*d is strictly "
            "positive for arbitrary h,ta,a0,a2,a3,...,a7,tb,b0,b1,b2>=0 "
            "when b4=b5=b6=b7=0. The 192-cell split exactly reconstructs "
            "all eight previously computed unsplit b3 coefficient totals."
        ),
        "degree_support_justification": (
            "Each left coefficient has a0-degree at most 1 and a2-degree at "
            "most 3. Quadratic margin/derivative products therefore have "
            "a0-degree at most 2 and a2-degree at most 6; multiplication by "
            "C=A2 adds at most one a2 degree and no a0 degree."
        ),
        "ordered_cells": 192,
        "rows": rows,
        "exponent_aggregates": aggregates,
        "aggregate_terms": sum(row["terms"] for row in rows),
        "aggregate_negative": 0,
        "immutable_inputs": {PROBE.name: EXPECTED_PROBE},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This removes b3 only after b4=b5=b6=b7 are zero. Simultaneous "
            "b4,b5 extension and the final low/high join remain dependencies."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
