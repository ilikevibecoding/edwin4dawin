#!/usr/bin/env python3
"""Resume the four-axis tail as fresh-process, one-label exact shards."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_label_shard_root.py"
PROBE_AUDITOR = ROOT / "audit_rank8_low_low_a23_redistribution_interior_axis_label_shard_probe_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_probe_audit_20260823.json"
IMPORTED_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_index_stats_tail_checkpoint_20260823.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_tail_checkpoint_20260823.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_tail_failure_20260823.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_tail_exact_20260823.json"
EXPECTED = {
    PROBE.name: "D8FA040135EEEC06FEC2ABCB8B75DC734DFE5EAE7D74E5120EE5A1898031C979",
    PROBE_AUDITOR.name: "F4A393B0BC357522CA93C8C70CD336C0C399EFE79A63C5568D43580E34A7A864",
    PROBE_AUDIT.name: "93DD6072516A3B1CEEEB833AB8171827A3933CC13E6088458FF5BA961E9D0277",
    IMPORTED_CHECKPOINT.name: "827DB32882115B9BE9BC9E99812BD7E7D630ABA56218F484A38C9A3774067711",
}
IMPORTED_SOURCE = "2C9874A7D292B96577B619055BEC2C084D5C88756F5C5C7E4B1F341ACF265BC3"
IMPORTED_CELLS = {(2, 0), (0, 2)}
NEW_CELLS = ((1, 0), (0, 1))
ALL_CELLS = {(2, 0), (0, 2), (1, 0), (0, 1)}
SHARDS = tuple((cell, label) for cell in NEW_CELLS for label in LABELS)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def parse_one(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1
    return ast.literal_eval(lines[0])


def key(row):
    return row["p_exponent"], row["q_exponent"]


def shard_key(shard):
    return shard["p_exponent"], shard["q_exponent"], shard["label"]


def validate_statistics(item) -> None:
    assert set(item) == {"terms", "negative", "minimum", "maximum", "first_negative"}
    assert type(item["terms"]) is int and item["terms"] >= 0
    assert item["negative"] == 0 and item["first_negative"] is None
    if item["terms"]:
        assert type(item["minimum"]) is int and type(item["maximum"]) is int
        assert 0 < item["minimum"] <= item["maximum"]
    else:
        assert item["minimum"] is None and item["maximum"] is None


def validate_imported_row(row) -> None:
    assert key(row) in IMPORTED_CELLS
    assert row["position_count"] == 1 and len(row["positions"]) == 1
    assert row["pass"] is True and row["positions"][0]["pass"] is True
    assert set(row["positions"][0]["rows"]) == set(LABELS)
    for item in row["positions"][0]["rows"].values():
        validate_statistics(item)


def validate_shard(shard) -> None:
    cell = (shard["p_exponent"], shard["q_exponent"])
    assert (cell, shard["label"]) in SHARDS
    assert shard["pass"] is True
    assert shard["elapsed_seconds"] >= 0
    assert shard["engine_sha256"] == EXPECTED[PROBE.name]
    position = required_positions(*cell)
    assert len(position) == 1
    assert (
        shard["left_bernstein_index"], shard["right_bernstein_index"]
    ) == position[0]
    validate_statistics(shard["statistics"])


def imported_rows():
    saved = json.loads(IMPORTED_CHECKPOINT.read_text(encoding="utf-8"))
    assert saved["status"] == "RUNNING_EXACT_A23_INTERIOR_AXIS_INDEX_STATS_TAIL"
    assert saved["source_sha256"] == IMPORTED_SOURCE
    assert saved["completed_axis_units"] == 2 and saved["total_axis_units"] == 4
    assert len(saved["rows"]) == 2
    assert {key(row) for row in saved["rows"]} == IMPORTED_CELLS
    for row in saved["rows"]:
        validate_imported_row(row)
    return saved["rows"], saved["created_utc"]


def run_shard(cell, label):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable,
            str(PROBE),
            "--p", str(cell[0]),
            "--q", str(cell[1]),
            "--label", label,
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        timeout=14400,
    )
    if result.returncode != 0 or result.stderr:
        atomic_json(
            FAILURE,
            {
                "status": "FAIL_A23_INTERIOR_AXIS_LABEL_SHARD_SUBPROCESS",
                "cell": list(cell),
                "label": label,
                "returncode": result.returncode,
                "stderr": result.stderr,
            },
        )
        raise RuntimeError(
            f"axis label shard {cell} {label} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    source = parse_one(result.stdout)
    assert (source["p_exponent"], source["q_exponent"]) == cell
    assert source["label"] == label
    assert source["label_sharding"] is True
    assert source["low_peak_accumulation"] is True
    assert source["coefficient_scan"] == "flint_term_index_no_python_list"
    shard = {
        "p_exponent": cell[0],
        "q_exponent": cell[1],
        "left_bernstein_index": source["left_bernstein_index"],
        "right_bernstein_index": source["right_bernstein_index"],
        "label": label,
        "statistics": source["statistics"],
        "pass": source["pass"],
        "elapsed_seconds": time.perf_counter() - started,
        "engine": "axis_one_label_low_peak_flint_index_stats",
        "engine_sha256": EXPECTED[PROBE.name],
    }
    validate_shard(shard)
    return shard


def checkpoint_payload(imported, shards, source_hash, created_utc):
    return {
        "schema": "rank8-low-low-a23-interior-axis-label-shard-tail-checkpoint-v1",
        "status": "RUNNING_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_TAIL",
        "created_utc": created_utc,
        "updated_utc": now_utc(),
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "imported_axis_units": len(imported),
        "completed_label_shards": len(shards),
        "total_label_shards": len(SHARDS),
        "recorded_probe_seconds": sum(
            row["elapsed_seconds"] for row in imported
        ) + sum(shard["elapsed_seconds"] for shard in shards),
        "imported_rows": imported,
        "shards": shards,
    }


def assembled_new_rows(shards):
    indexed = {shard_key(shard): shard for shard in shards}
    rows = []
    for cell in NEW_CELLS:
        if not all((cell[0], cell[1], label) in indexed for label in LABELS):
            continue
        position = required_positions(*cell)
        assert len(position) == 1
        statistics = {
            label: indexed[cell[0], cell[1], label]["statistics"]
            for label in LABELS
        }
        elapsed = sum(
            indexed[cell[0], cell[1], label]["elapsed_seconds"]
            for label in LABELS
        )
        rows.append(
            {
                "p_exponent": cell[0],
                "q_exponent": cell[1],
                "redistribution_degree": [2, 2],
                "bernstein_scaling": 4,
                "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
                "positions": [
                    {
                        "left_bernstein_index": position[0][0],
                        "right_bernstein_index": position[0][1],
                        "rows": statistics,
                        "pass": True,
                    }
                ],
                "position_count": 1,
                "pass": True,
                "elapsed_seconds": elapsed,
                "engine": "axis_one_label_low_peak_flint_index_stats",
                "engine_sha256": EXPECTED[PROBE.name],
                "source_artifact_sha256": EXPECTED[PROBE.name],
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-labels", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_labels is None or args.max_new_labels >= 0
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    probe_audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    assert probe_audit["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_PROBE_AUDIT"
    assert probe_audit["coverage"]["label_replays"] == 16
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        imported = saved["imported_rows"]
        shards = saved["shards"]
        created_utc = saved["created_utc"]
    else:
        imported, created_utc = imported_rows()
        shards = []
    for row in imported:
        validate_imported_row(row)
    for shard in shards:
        validate_shard(shard)
    assert len(imported) == 2 and {key(row) for row in imported} == IMPORTED_CELLS
    assert len(shards) == len({shard_key(shard) for shard in shards})
    atomic_json(CHECKPOINT, checkpoint_payload(imported, shards, source_hash, created_utc))

    complete = {shard_key(shard) for shard in shards}
    missing = [
        (cell, label)
        for cell, label in SHARDS
        if (cell[0], cell[1], label) not in complete
    ]
    if args.max_new_labels is not None:
        missing = missing[: args.max_new_labels]
    for cell, label in missing:
        shard = run_shard(cell, label)
        shards.append(shard)
        shards.sort(key=shard_key)
        atomic_json(CHECKPOINT, checkpoint_payload(imported, shards, source_hash, created_utc))
        print(
            "PASS_AXIS_LABEL_SHARD",
            *cell,
            label,
            f"{shard['elapsed_seconds']:.3f}s",
            len(shards),
            "OF",
            len(SHARDS),
            flush=True,
        )

    if len(shards) != len(SHARDS):
        print("PAUSED_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_TAIL", len(shards), "OF", len(SHARDS))
        return

    rows = sorted(imported + assembled_new_rows(shards), key=key)
    assert len(rows) == 4 and {key(row) for row in rows} == ALL_CELLS
    payload = {
        "schema": "rank8-low-low-a23-interior-axis-label-shard-tail-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_TAIL",
        "axis_units": 4,
        "position_cells": 4,
        "imported_axis_units": 2,
        "fresh_label_shards": len(SHARDS),
        "negative_coefficients": 0,
        "rows": rows,
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
    }
    atomic_json(REPORT, payload)
    complete_payload = checkpoint_payload(imported, shards, source_hash, created_utc)
    complete_payload["status"] = "COMPLETE_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_TAIL"
    complete_payload["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete_payload)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
