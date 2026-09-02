#!/usr/bin/env python3
"""Validate all nine gap-zero split cells at the suffix-3 block (1,1)."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_outer_cell_flint.py"
SUFFIX3_REPORT = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_block_1_1_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_block_1_1_exact_20260822.json"
EXPECTED_PROBE = "A97A572170EC70470F009ADDFED9F47E7336E88E3EB7DDF5BE6F58BA9E4D4E4B"
EXPECTED_SUFFIX3 = "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F"
AUXILIARIES = (
    "curvature_middle", "curvature_far", "strong_middle", "strong_far",
)
EXPECTED_AGGREGATE = {
    "curvature_middle": {
        "terms": 6_205_134, "minimum": 24,
        "maximum": 318_929_952_995_618_832,
    },
    "curvature_far": {
        "terms": 6_205_119, "minimum": 6,
        "maximum": 91_798_868_674_038_204,
    },
    "strong_middle": {
        "terms": 12_237_204, "minimum": 24,
        "maximum": 1_943_303_860_719_905_232,
    },
    "strong_far": {
        "terms": 12_237_189, "minimum": 6,
        "maximum": 572_560_652_336_556_312,
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a0_exponent"], row["b0_exponent"]


def ordered_cells():
    return [(1, 0), (0, 1), (1, 1), (2, 0), (0, 2),
            (2, 1), (1, 2), (2, 2), (0, 0)]


def run_cell(a0, b0):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE), "--a3", "1", "--b3", "1",
            "--a0", str(a0), "--b0", str(b0),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=3600,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a0, b0)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert (row["a3_exponent"], row["b3_exponent"]) == (1, 1)
    assert key(row) == (a0, b0)
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
    row["elapsed_seconds"] = time.perf_counter() - started
    return row


def main():
    assert sha256(PROBE) == EXPECTED_PROBE
    assert sha256(SUFFIX3_REPORT) == EXPECTED_SUFFIX3
    base = json.loads(SUFFIX3_REPORT.read_text(encoding="utf-8"))
    base_cell = next(
        row for row in base["rows"]
        if (row["a3_exponent"], row["b3_exponent"]) == (1, 1)
    )
    rows = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (
            saved.get("probe_sha256") == EXPECTED_PROBE
            and saved.get("verifier_sha256") == sha256(Path(__file__))
        ):
            rows = saved["rows"]
    completed = {key(row) for row in rows}
    for a0, b0 in ordered_cells():
        if (a0, b0) in completed:
            continue
        row = run_cell(a0, b0)
        rows.append(row)
        rows.sort(key=key)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_SUFFIX3_GAP0_BLOCK_1_1",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "rows": rows,
        })
        print(
            "PASS_CELL", a0, b0,
            {label: row["rows"][label]["terms"] for label in AUXILIARIES},
            f"{row['elapsed_seconds']:.3f}s", flush=True,
        )

    assert len(rows) == 9 and list(map(key, rows)) == [
        (a0, b0) for a0 in range(3) for b0 in range(3)
    ]
    assert next(row for row in rows if key(row) == (0, 0))["rows"] == base_cell["rows"]
    aggregates = {}
    for label in AUXILIARIES:
        nonempty = [row["rows"][label] for row in rows if row["rows"][label]["terms"]]
        aggregate = {
            "terms": sum(item["terms"] for item in nonempty),
            "negative": 0,
            "minimum": min(item["minimum"] for item in nonempty),
            "maximum": max(item["maximum"] for item in nonempty),
        }
        assert aggregate == {**EXPECTED_AGGREGATE[label], "negative": 0}
        aggregates[label] = aggregate
    payload = {
        "schema": "rank8-low-low-suffix3-gap0-block-1-1-v1",
        "status": "PASS_EXACT_SUFFIX3_GAP0_BLOCK_1_1_SPLIT_VALIDATION",
        "outer_suffix3_cell": [1, 1],
        "gap0_cells": 9,
        "rows": rows,
        "aggregates": aggregates,
        "monolithic_pilot_match": True,
        "suffix3_origin_match": True,
        "immutable_inputs": {
            PROBE.name: EXPECTED_PROBE,
            SUFFIX3_REPORT.name: EXPECTED_SUFFIX3,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
