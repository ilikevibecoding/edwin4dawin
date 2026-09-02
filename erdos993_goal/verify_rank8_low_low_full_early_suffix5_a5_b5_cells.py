#!/usr/bin/env python3
"""Fail-closed 182-cell proof of the full-early suffix-5 low/low lift."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint.py"
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_checkpoint_20260821.json"
REPORT = ROOT / "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
EXPECTED_PROBE = "17B3712D2B8801A527AACA41B7F2AA5BD02B7BEB2B04FA560FF5BA2FB6B71364"
EXPECTED_EARLY_REPORT = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"
PREVIOUS_VERIFIER = "02F249E455E462D06428F8CAFADC861404EC139E55B70FD8ED67F6ED98F3E062"
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
    return row["a5_exponent"], row["b5_exponent"]


def ordered_cells():
    cells = [(a5, b5) for a5 in range(14) for b5 in range(13)]
    priority = [(1, 0), (0, 1), (1, 1), (13, 0), (0, 12)]
    rest = sorted(
        (cell for cell in cells if cell not in priority and cell != (0, 0)),
        key=lambda cell: (sum(cell), cell[0], cell[1]),
    )
    return priority + rest + [(0, 0)]


def run_cell(a5: int, b5: int) -> dict:
    started = time.perf_counter()
    if (a5, b5) == (0, 0):
        assert sha256(EARLY_REPORT) == EXPECTED_EARLY_REPORT
        base_report = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
        assert base_report["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_AMGM"
        assert {row["bernstein_target"] for row in base_report["rows"]} == set(AUXILIARIES)
        return {
            "a5_exponent": 0,
            "b5_exponent": 0,
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
        [sys.executable, str(PROBE), "--a5", str(a5), "--b5", str(b5)],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=1800,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a5, b5)} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"cell {(a5, b5)} unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    assert key(row) == (a5, b5)
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
                and saved.get("verifier_sha256") in {
                    sha256(Path(__file__)), PREVIOUS_VERIFIER,
                }):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for a5, b5 in ordered_cells():
        if (a5, b5) in completed:
            continue
        row = run_cell(a5, b5)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX5_CELLS",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "degree_support": {"a5": [0, 13], "b5": [0, 12]},
            "rows": rows,
        })
        totals = {name: row["rows"][name]["terms"] for name in AUXILIARIES}
        print("PASS_CELL", a5, b5, totals, f"{row['elapsed_seconds']:.3f}s", flush=True)

    expected = [(a5, b5) for a5 in range(14) for b5 in range(13)]
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
    payload = {
        "schema": "rank8-low-low-full-early-suffix5-a5-b5-cells-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX5_CELLS",
        "theorem": (
            "All four pending low/low Bernstein auxiliaries are nonnegative "
            "for arbitrary h,ta,tb,a0,a2,a5,a6,a7,b0,b2,b5,b6,b7>=0, "
            "with adjusted gap slacks a3,a4,b3,b4 fixed at zero."
        ),
        "degree_support_justification": (
            "The a5 gap occurs in six left ratios and b5 in six right "
            "ratios. Quadratic curvature has outer degrees at most (12,12); "
            "the strong payment has a5 degree at most 13 because capacity "
            "adds one left degree and b5 degree at most 12."
        ),
        "ordered_cells": len(rows),
        "rows": rows,
        "aggregates": aggregates,
        "aggregate_scope": (
            "Exact coefficient statistics for the 181 genuinely lifted "
            "non-origin cells. The origin is supplied by the immutable "
            "full-early-core AM-GM certificate and is not double-counted."
        ),
        "payment_masks": {
            label: {
                side: str(mask)
                for side, mask in __import__(
                    "probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint"
                ).PAYMENT_MASKS[label].items()
            }
            for label in AUXILIARIES
        },
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            EARLY_REPORT.name: EXPECTED_EARLY_REPORT,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the full early core lifted through suffix indices "
            "5..7 only. Joining the remaining suffix indices 3 and 4 is "
            "still required for the full low/low cone."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
