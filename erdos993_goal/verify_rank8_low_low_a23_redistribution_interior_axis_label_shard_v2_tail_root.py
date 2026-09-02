#!/usr/bin/env python3
"""Finish the four-axis tail with direct-endpoint far-label shards."""

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
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_root.py"
PROBE_AUDITOR = ROOT / "audit_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_probe_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_probe_audit_20260823.json"
IMPORTED_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_tail_checkpoint_20260823.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_checkpoint_20260823.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_failure_20260823.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_exact_20260823.json"
EXPECTED = {
    PROBE.name: "5450CBD6EC241ACEE4CD1335D4C3815539DF905DBFFC980AC1EEE59C9D145ABC",
    PROBE_AUDITOR.name: "BCF921A4C3B9A08E94EF0DD1FD205DE9B6E46A0BC282E7C39F2D5D8BDD89836A",
    PROBE_AUDIT.name: "CA1654523EE4728D63296C7263203A758738624B479271C975C4922C82964C29",
    IMPORTED_CHECKPOINT.name: "5C0443DCF8DB5430EEA377D4F4B6FAF0013FFF109EE916F3D4D5F8034E578244",
}
IMPORTED_SOURCE = "3DAA2CDC58EF7C0F8830825B9A5082885164DDE304402D40584A3E0BEA787581"
LEGACY_PROBE = "D8FA040135EEEC06FEC2ABCB8B75DC734DFE5EAE7D74E5120EE5A1898031C979"
IMPORTED_CELLS = {(2, 0), (0, 2)}
NEW_CELLS = ((1, 0), (0, 1))
ALL_CELLS = {(2, 0), (0, 2), (1, 0), (0, 1)}
SHARDS = tuple((cell, label) for cell in NEW_CELLS for label in LABELS)
LEGACY_SHARD_KEY = (1, 0, "curvature_middle_times_4")
FAR = {"curvature_far", "strong_far"}


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


def validate_legacy_shard(shard) -> None:
    assert shard_key(shard) == LEGACY_SHARD_KEY
    assert shard["pass"] is True and shard["elapsed_seconds"] >= 0
    assert shard["engine_sha256"] == LEGACY_PROBE
    assert (
        shard["left_bernstein_index"], shard["right_bernstein_index"]
    ) == required_positions(1, 0)[0]
    validate_statistics(shard["statistics"])


def validate_shard(shard) -> None:
    cell = (shard["p_exponent"], shard["q_exponent"])
    assert (cell, shard["label"]) in SHARDS
    assert shard_key(shard) != LEGACY_SHARD_KEY
    assert shard["pass"] is True and shard["elapsed_seconds"] >= 0
    assert shard["engine_sha256"] == EXPECTED[PROBE.name]
    assert shard["far_endpoint_direct"] is (shard["label"] in FAR)
    assert (
        shard["left_bernstein_index"], shard["right_bernstein_index"]
    ) == required_positions(*cell)[0]
    validate_statistics(shard["statistics"])


def imported_state():
    saved = json.loads(IMPORTED_CHECKPOINT.read_text(encoding="utf-8"))
    assert saved["status"] == "RUNNING_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_TAIL"
    assert saved["source_sha256"] == IMPORTED_SOURCE
    assert saved["imported_axis_units"] == 2
    assert saved["completed_label_shards"] == 1 and saved["total_label_shards"] == 8
    imported = saved["imported_rows"]
    legacy = saved["shards"]
    assert len(imported) == 2 and {key(row) for row in imported} == IMPORTED_CELLS
    assert len(legacy) == 1
    for row in imported:
        validate_imported_row(row)
    validate_legacy_shard(legacy[0])
    return imported, legacy, saved["created_utc"]


def run_shard(cell, label):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--p", str(cell[0]), "--q", str(cell[1]),
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
                "status": "FAIL_A23_INTERIOR_AXIS_LABEL_SHARD_V2_SUBPROCESS",
                "cell": list(cell), "label": label,
                "returncode": result.returncode, "stderr": result.stderr,
            },
        )
        raise RuntimeError(
            f"axis label shard v2 {cell} {label} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    source = parse_one(result.stdout)
    assert (source["p_exponent"], source["q_exponent"]) == cell
    assert source["label"] == label
    assert source["label_sharding"] is True
    assert source["low_peak_accumulation"] is True
    assert source["far_endpoint_direct"] is (label in FAR)
    assert source["coefficient_scan"] == "flint_term_index_no_python_list"
    shard = {
        "p_exponent": cell[0], "q_exponent": cell[1],
        "left_bernstein_index": source["left_bernstein_index"],
        "right_bernstein_index": source["right_bernstein_index"],
        "label": label, "statistics": source["statistics"],
        "pass": source["pass"],
        "far_endpoint_direct": source["far_endpoint_direct"],
        "elapsed_seconds": time.perf_counter() - started,
        "engine": "axis_one_label_v2_direct_far_flint_index_stats",
        "engine_sha256": EXPECTED[PROBE.name],
    }
    validate_shard(shard)
    return shard


def checkpoint_payload(imported, legacy, shards, source_hash, created_utc):
    return {
        "schema": "rank8-low-low-a23-interior-axis-label-shard-v2-tail-checkpoint-v1",
        "status": "RUNNING_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL",
        "created_utc": created_utc, "updated_utc": now_utc(),
        "source_sha256": source_hash, "immutable_inputs": EXPECTED,
        "imported_axis_units": len(imported),
        "imported_legacy_label_shards": len(legacy),
        "completed_v2_label_shards": len(shards),
        "total_combined_label_shards": len(SHARDS),
        "recorded_probe_seconds": (
            sum(row["elapsed_seconds"] for row in imported)
            + sum(shard["elapsed_seconds"] for shard in legacy)
            + sum(shard["elapsed_seconds"] for shard in shards)
        ),
        "imported_rows": imported, "legacy_shards": legacy, "shards": shards,
    }


def assembled_new_rows(all_shards):
    indexed = {shard_key(shard): shard for shard in all_shards}
    rows = []
    for cell in NEW_CELLS:
        if not all((cell[0], cell[1], label) in indexed for label in LABELS):
            continue
        position = required_positions(*cell)
        assert len(position) == 1
        rows.append(
            {
                "p_exponent": cell[0], "q_exponent": cell[1],
                "redistribution_degree": [2, 2], "bernstein_scaling": 4,
                "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
                "positions": [{
                    "left_bernstein_index": position[0][0],
                    "right_bernstein_index": position[0][1],
                    "rows": {
                        label: indexed[cell[0], cell[1], label]["statistics"]
                        for label in LABELS
                    },
                    "pass": True,
                }],
                "position_count": 1, "pass": True,
                "elapsed_seconds": sum(
                    indexed[cell[0], cell[1], label]["elapsed_seconds"]
                    for label in LABELS
                ),
                "engine": "axis_one_label_mixed_v1_v2_flint_index_stats",
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
    audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_PROBE_AUDIT"
    assert audit["coverage"]["label_replays"] == 16
    assert audit["coverage"]["direct_far_replays"] == 8
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        imported, legacy, shards = (
            saved["imported_rows"], saved["legacy_shards"], saved["shards"]
        )
        created_utc = saved["created_utc"]
    else:
        imported, legacy, created_utc = imported_state()
        shards = []
    for row in imported:
        validate_imported_row(row)
    assert len(legacy) == 1
    validate_legacy_shard(legacy[0])
    for shard in shards:
        validate_shard(shard)
    combined = legacy + shards
    assert len(combined) == len({shard_key(shard) for shard in combined})
    atomic_json(CHECKPOINT, checkpoint_payload(imported, legacy, shards, source_hash, created_utc))

    complete = {shard_key(shard) for shard in combined}
    missing = [
        (cell, label) for cell, label in SHARDS
        if (cell[0], cell[1], label) not in complete
    ]
    if args.max_new_labels is not None:
        missing = missing[: args.max_new_labels]
    for cell, label in missing:
        shard = run_shard(cell, label)
        shards.append(shard)
        shards.sort(key=shard_key)
        combined = legacy + shards
        atomic_json(CHECKPOINT, checkpoint_payload(imported, legacy, shards, source_hash, created_utc))
        print(
            "PASS_AXIS_LABEL_SHARD_V2", *cell, label,
            f"{shard['elapsed_seconds']:.3f}s", len(combined), "OF", len(SHARDS),
            flush=True,
        )

    combined = legacy + shards
    if len(combined) != len(SHARDS):
        print("PAUSED_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL", len(combined), "OF", len(SHARDS))
        return

    rows = sorted(imported + assembled_new_rows(combined), key=key)
    assert len(rows) == 4 and {key(row) for row in rows} == ALL_CELLS
    payload = {
        "schema": "rank8-low-low-a23-interior-axis-label-shard-v2-tail-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL",
        "axis_units": 4, "position_cells": 4,
        "imported_axis_units": 2, "legacy_label_shards": 1,
        "fresh_v2_label_shards": 7, "negative_coefficients": 0,
        "rows": rows, "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
    }
    atomic_json(REPORT, payload)
    complete_payload = checkpoint_payload(imported, legacy, shards, source_hash, created_utc)
    complete_payload["status"] = "COMPLETE_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL"
    complete_payload["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete_payload)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
