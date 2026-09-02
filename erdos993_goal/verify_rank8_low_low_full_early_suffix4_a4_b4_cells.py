#!/usr/bin/env python3
"""Fail-closed 132-cell proof of the full-early suffix-4 low/low lift."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint.py"
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_checkpoint_20260821.json"
REPORT = ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json"
EXPECTED_PROBE = "D116602901A39024D304148BD1474CCF702FB325AC7BC2E9BDE1BD37515EE986"
EXPECTED_EARLY_REPORT = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"
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
    priority = [(1, 1), (11, 0), (0, 10), (1, 0), (0, 1)]
    rest = sorted(
        (cell for cell in cells if cell not in priority and cell != (0, 0)),
        key=lambda cell: (sum(cell), cell[0], cell[1]),
    )
    return priority + rest + [(0, 0)]


def run_cell(a4: int, b4: int) -> dict:
    started = time.perf_counter()
    if (a4, b4) == (0, 0):
        assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
        base_report = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
        assert base_report["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_AMGM"
        assert {row["bernstein_target"] for row in base_report["rows"]} == set(AUXILIARIES)
        return {
            "a4_exponent": 0,
            "b4_exponent": 0,
            "rows": {
                label: {
                    "terms": 0,
                    "negative": 0,
                    "minimum": None,
                    "maximum": None,
                    "first_negative": None,
                    "reference_only": True,
                }
                for label in AUXILIARIES
            },
            "origin_reference": {
                "report": EARLY_REPORT.name,
                "sha256": EXPECTED_EARLY_REPORT,
                "status": base_report["status"],
                "statistics_excluded_from_lifted_cell_aggregates": True,
            },
            "pass": True,
            "elapsed_seconds": time.perf_counter() - started,
        }
    result = subprocess.run(
        [sys.executable, str(PROBE), "--a4", str(a4), "--b4", str(b4)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=1800,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a4, b4)} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(a4, b4)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (a4, b4)
    assert row["pass"]
    assert set(row["rows"]) == set(AUXILIARIES)
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
    if sha256(PROBE) != EXPECTED_PROBE:
        raise SystemExit("probe hash changed; refusing to run")
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == EXPECTED_PROBE
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for a4, b4 in ordered_cells():
        if (a4, b4) in completed:
            continue
        row = run_cell(a4, b4)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "degree_support": {"a4": [0, 11], "b4": [0, 10]},
            "rows": rows,
        })
        totals = {name: row["rows"][name]["terms"] for name in AUXILIARIES}
        print("PASS_CELL", a4, b4, totals, f"{row['elapsed_seconds']:.3f}s", flush=True)

    expected = [(a4, b4) for a4 in range(12) for b4 in range(11)]
    assert len(rows) == len(expected)
    assert sorted(map(key, rows)) == expected
    aggregates = {}
    for auxiliary in AUXILIARIES:
        nonempty = [row["rows"][auxiliary] for row in rows if row["rows"][auxiliary]["terms"]]
        aggregates[auxiliary] = {
            "terms": sum(row["rows"][auxiliary]["terms"] for row in rows),
            "negative": 0,
            "minimum": min(row["minimum"] for row in nonempty),
            "maximum": max(row["maximum"] for row in nonempty),
        }
    probe_module = __import__("probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint")
    payload = {
        "schema": "rank8-low-low-full-early-suffix4-a4-b4-cells-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS",
        "theorem": (
            "All four pending low/low Bernstein auxiliaries are nonnegative "
            "for arbitrary h,ta,tb,a0,a2,a4,a6,a7,b0,b2,b4,b6,b7>=0, "
            "with adjusted gap slacks a3,a5,b3,b5 fixed at zero."
        ),
        "degree_support_justification": (
            "The a4 and b4 gaps each occur in five ratios. Quadratic curvature "
            "therefore has outer degrees at most (10,10); the strong payment "
            "has a4 degree at most 11 because capacity adds one left degree."
        ),
        "ordered_cells": len(rows),
        "rows": rows,
        "aggregates": aggregates,
        "aggregate_scope": (
            "Exact coefficient statistics for the 131 genuinely lifted "
            "non-origin cells. The origin is supplied by the immutable "
            "full-early-core AM-GM certificate and is not double-counted."
        ),
        "payment_masks": {
            label: {side: str(mask) for side, mask in probe_module.PAYMENT_MASKS[label].items()}
            for label in AUXILIARIES
        },
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            EARLY_REPORT.name: EXPECTED_EARLY_REPORT,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the full early core lifted through suffix indices "
            "4,6,7 with index 5 zero. Joining suffix index 5 simultaneously, "
            "and then index 3, is still required for the full low/low cone."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
