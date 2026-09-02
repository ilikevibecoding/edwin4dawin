#!/usr/bin/env python3
"""Exhaust the exact suffix-3/gap-zero face with resumable split cells."""

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
PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_outer_cell_flint.py"
BASE = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
PILOT = ROOT / "rank8_low_low_suffix3_gap0_block_1_1_exact_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_full_face_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_full_face_exact_20260822.json"
FAILURE = ROOT / "rank8_low_low_suffix3_gap0_full_face_first_failure_20260822.json"

EXPECTED_PROBE = "A97A572170EC70470F009ADDFED9F47E7336E88E3EB7DDF5BE6F58BA9E4D4E4B"
EXPECTED_BASE = "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F"
EXPECTED_PILOT = "2709CCBF0C8F3B7431F38A71D0A79148623E88A496C5722291E2AE58A87C7AE0"
LEGACY_SOURCE = "9806AB457F89DA618C28351A5368FEDD96644A286DA21916D123F001AB3EEAEF"
AUXILIARIES = (
    "curvature_middle", "curvature_far", "strong_middle", "strong_far",
)
GAP_CELLS = (
    (1, 0), (0, 1), (1, 1), (2, 0),
    (0, 2), (2, 1), (1, 2), (2, 2),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def cell_key(row):
    return (
        row["a3_exponent"], row["b3_exponent"],
        row["a0_exponent"], row["b0_exponent"],
    )


def validate_statistics(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]
    else:
        assert statistics["minimum"] is None
        assert statistics["maximum"] is None


def validate_cell(row) -> None:
    a3, b3, a0, b0 = cell_key(row)
    assert 0 <= a3 <= 9 and 0 <= b3 <= 8
    assert (a0, b0) in GAP_CELLS
    assert row["pass"] is True
    assert set(row["rows"]) == set(AUXILIARIES)
    for statistics in row["rows"].values():
        validate_statistics(statistics)


def run_cell(a3: int, b3: int, a0: int, b0: int):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--a3", str(a3), "--b3", str(b3),
            "--a0", str(a0), "--b0", str(b0),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a3, b3, a0, b0)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert cell_key(row) == (a3, b3, a0, b0)
    if row["pass"] is not True:
        atomic_json(FAILURE, {
            "status": "FAIL_EXACT_SUFFIX3_GAP0_CELL",
            "cell": [a3, b3, a0, b0],
            "probe_sha256": EXPECTED_PROBE,
            "row": row,
            "elapsed_seconds": time.perf_counter() - started,
        })
        raise RuntimeError(
            f"negative coefficient found in cell {(a3, b3, a0, b0)}; "
            f"witness preserved at {FAILURE}"
        )
    validate_cell(row)
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def aggregate_statistics(statistics_rows):
    nonempty = [item for item in statistics_rows if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in statistics_rows),
        "negative": sum(item["negative"] for item in statistics_rows),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def checkpoint_payload(rows, source_hash):
    return {
        "status": "RUNNING_EXACT_SUFFIX3_GAP0_FULL_FACE",
        "source_sha256": source_hash,
        "probe_sha256": EXPECTED_PROBE,
        "base_sha256": EXPECTED_BASE,
        "pilot_sha256": EXPECTED_PILOT,
        "new_gap_cells_complete": len(rows),
        "new_gap_cells_total": 720,
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--max-new-cells", type=int, default=None,
        help="Stop after this many newly computed cells in the current run.",
    )
    args = parser.parse_args()
    assert args.max_new_cells is None or args.max_new_cells >= 0

    source_hash = sha256(Path(__file__))
    assert sha256(PROBE) == EXPECTED_PROBE
    assert sha256(BASE) == EXPECTED_BASE
    assert sha256(PILOT) == EXPECTED_PILOT
    base = json.loads(BASE.read_text(encoding="utf-8"))
    pilot = json.loads(PILOT.read_text(encoding="utf-8"))
    assert len(base["rows"]) == 90
    base_rows = {
        (row["a3_exponent"], row["b3_exponent"]): row
        for row in base["rows"]
    }
    assert set(base_rows) == {(a3, b3) for a3 in range(10) for b3 in range(9)}
    for row in base_rows.values():
        assert row["pass"] is True
        for statistics in row["rows"].values():
            validate_statistics(statistics)

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] in (source_hash, LEGACY_SOURCE)
        assert saved["probe_sha256"] == EXPECTED_PROBE
        assert saved["base_sha256"] == EXPECTED_BASE
        assert saved["pilot_sha256"] == EXPECTED_PILOT
        rows = saved["rows"]
    else:
        rows = [
            row for row in pilot["rows"]
            if (row["a0_exponent"], row["b0_exponent"]) != (0, 0)
        ]
        assert len(rows) == 8
    for row in rows:
        validate_cell(row)
    assert len(rows) == len({cell_key(row) for row in rows})
    rows.sort(key=cell_key)
    atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash))

    # Dense suffix-3 blocks are examined first; the validated (1,1) block is
    # already seeded from PILOT, so this order also finds difficult failures early.
    outer_order = sorted(
        base_rows,
        key=lambda key: (
            -sum(item["terms"] for item in base_rows[key]["rows"].values()),
            key,
        ),
    )
    completed = {cell_key(row) for row in rows}
    newly_computed = 0
    for a3, b3 in outer_order:
        for a0, b0 in GAP_CELLS:
            key = (a3, b3, a0, b0)
            if key in completed:
                continue
            if args.max_new_cells is not None and newly_computed >= args.max_new_cells:
                print(
                    "PAUSED_EXACT_SUFFIX3_GAP0_FULL_FACE",
                    len(rows), "OF", 720, "NEW_GAP_CELLS",
                    flush=True,
                )
                return
            row = run_cell(a3, b3, a0, b0)
            rows.append(row)
            rows.sort(key=cell_key)
            completed.add(key)
            newly_computed += 1
            atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash))
            print(
                "PASS_CELL", a3, b3, a0, b0,
                {label: row["rows"][label]["terms"] for label in AUXILIARIES},
                f"{row['elapsed_seconds']:.3f}s",
                len(rows), "OF", 720,
                flush=True,
            )

    expected = {
        (a3, b3, a0, b0)
        for a3 in range(10) for b3 in range(9)
        for a0, b0 in GAP_CELLS
    }
    assert completed == expected and len(rows) == 720
    new_by_outer = {}
    for row in rows:
        new_by_outer.setdefault(cell_key(row)[:2], []).append(row)

    block_summaries = []
    global_statistics = {label: [] for label in AUXILIARIES}
    for a3 in range(10):
        for b3 in range(9):
            origin = base_rows[(a3, b3)]["rows"]
            new_cells = new_by_outer[(a3, b3)]
            assert len(new_cells) == 8
            aggregates = {}
            for label in AUXILIARIES:
                statistics_rows = [origin[label]] + [
                    row["rows"][label] for row in new_cells
                ]
                aggregate = aggregate_statistics(statistics_rows)
                assert aggregate["negative"] == 0
                if aggregate["terms"]:
                    assert aggregate["minimum"] > 0
                aggregates[label] = aggregate
                global_statistics[label].extend(statistics_rows)
            block_summaries.append({
                "a3_exponent": a3,
                "b3_exponent": b3,
                "gap0_cells": 9,
                "aggregates": aggregates,
            })

    global_aggregates = {
        label: aggregate_statistics(statistics_rows)
        for label, statistics_rows in global_statistics.items()
    }
    assert all(
        aggregate["negative"] == 0
        and (aggregate["terms"] == 0 or aggregate["minimum"] > 0)
        for aggregate in global_aggregates.values()
    )
    payload = {
        "schema": "rank8-low-low-suffix3-gap0-full-face-v1",
        "status": "PASS_EXACT_SUFFIX3_GAP0_FULL_FACE",
        "theorem": (
            "All four paid rank-eight low/low auxiliaries are coefficientwise "
            "nonnegative on the full a2=b2=0 face with arbitrary suffix-3 "
            "variables and arbitrary gap-zero slacks a0,b0."
        ),
        "degree_support": {
            "a3_exponents": [0, 9],
            "b3_exponents": [0, 8],
            "a0_exponents": [0, 2],
            "b0_exponents": [0, 2],
            "justification": (
                "The prior suffix-3 support audit gives degrees 9 and 8 in "
                "a3,b3. Each factor row is affine in its side's gap-zero "
                "slack, and every auxiliary is bilinear in factor rows, so "
                "the a0,b0 degrees are at most two."
            ),
        },
        "outer_suffix3_blocks": 90,
        "gap0_cells_per_block": 9,
        "total_disjoint_cells": 810,
        "origin_cells_inherited_from_base_certificate": 90,
        "new_gap_cells_computed": 720,
        "pilot_seeded_new_gap_cells": 8,
        "new_rows": rows,
        "block_summaries": block_summaries,
        "global_aggregates": global_aggregates,
        "total_exact_coefficients": sum(
            aggregate["terms"] for aggregate in global_aggregates.values()
        ),
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            BASE.name: EXPECTED_BASE,
            PILOT.name: EXPECTED_PILOT,
        },
        "source_sha256": source_hash,
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
