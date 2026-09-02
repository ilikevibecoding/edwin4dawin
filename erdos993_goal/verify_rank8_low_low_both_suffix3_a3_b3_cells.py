#!/usr/bin/env python3
"""Fail-closed 90-cell assembly of the joint suffix-3 low/low auxiliaries."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_both_suffix3_cell_flint.py"
CHECKPOINT = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_checkpoint_20260821.json"
REPORT = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
EXPECTED_PROBE = "C23BD62E1D56BFBD81FC7B27D00C6EB255DEC3C57940A7BD9C6BB81CA1D92243"
AUXILIARIES = (
    "curvature_middle", "curvature_far", "strong_middle", "strong_far",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a3_exponent"], row["b3_exponent"]


def ordered_cells():
    cells = [(a3, b3) for a3 in range(10) for b3 in range(9)]
    # Exercise the two dense one-sided directions and their first mixed cell
    # first, then proceed by total outer degree.  The already closed suffix-4
    # origin is last because it is the densest redundant consistency cell.
    priority = [(1, 0), (0, 1), (1, 1)]
    rest = sorted(
        (cell for cell in cells if cell not in priority and cell != (0, 0)),
        key=lambda cell: (sum(cell), cell[0], cell[1]),
    )
    return priority + rest + [(0, 0)]


def run_cell(a3: int, b3: int) -> dict:
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--a3", str(a3), "--b3", str(b3)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=1800,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a3, b3)} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(a3, b3)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (a3, b3)
    assert row["pass"]
    assert set(row["rows"]) == set(AUXILIARIES)
    for auxiliary in AUXILIARIES:
        stats = row["rows"][auxiliary]
        assert stats["negative"] == 0 and stats["first_negative"] is None
        if stats["terms"]:
            assert stats["minimum"] > 0
            assert stats["maximum"] >= stats["minimum"]
        else:
            assert stats["minimum"] is None and stats["maximum"] is None
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


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
    for a3, b3 in ordered_cells():
        if (a3, b3) in completed:
            continue
        row = run_cell(a3, b3)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_RANK8_LOW_LOW_BOTH_SUFFIX3_A3_B3_CELLS",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "degree_support": {"a3": [0, 9], "b3": [0, 8]},
            "rows": rows,
        })
        totals = {name: row["rows"][name]["terms"] for name in AUXILIARIES}
        print("PASS_CELL", a3, b3, totals, f"{row['elapsed_seconds']:.3f}s", flush=True)

    assert len(rows) == 90
    assert sorted(map(key, rows)) == [(a3, b3) for a3 in range(10) for b3 in range(9)]
    aggregates = {}
    for auxiliary in AUXILIARIES:
        nonempty = [row["rows"][auxiliary] for row in rows if row["rows"][auxiliary]["terms"]]
        aggregates[auxiliary] = {
            "terms": sum(row["rows"][auxiliary]["terms"] for row in rows),
            "negative": 0,
            "minimum": min(row["minimum"] for row in nonempty),
            "maximum": max(row["maximum"] for row in nonempty),
        }
    payload = {
        "schema": "rank8-low-low-both-suffix3-a3-b3-cells-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_BOTH_SUFFIX3_A3_B3_CELLS",
        "theorem": (
            "All four pending low/low Bernstein auxiliaries are nonnegative "
            "for arbitrary h,ta,tb,a3,...,a7,b3,...,b7>=0, with earlier "
            "adjusted gap slacks a0,a2,b0,b2 fixed at zero."
        ),
        "degree_support_justification": (
            "The a3 gap occurs in four left ratios and b3 in four right "
            "ratios. Quadratic curvature has degrees at most (8,8); the "
            "strong payment has a3 degree at most 9 because C adds one left "
            "ratio degree and b3 degree at most 8."
        ),
        "ordered_cells": len(rows),
        "rows": rows,
        "aggregates": aggregates,
        "immutable_inputs": {PROBE.name: EXPECTED_PROBE},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the simultaneous suffix a3..a7,b3..b7 only. The "
            "early slacks a0,a2,b0,b2 and the full low/low join remain open."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
