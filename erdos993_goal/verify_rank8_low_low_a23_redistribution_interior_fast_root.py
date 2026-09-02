#!/usr/bin/env python3
"""Checkpointed exact verifier for the 377-position a2/a3 complement.

The two mixed Bernstein endpoint faces (0,2) and (2,0) are deliberately
excluded.  They are full faces, not isolated cells, and are proved by a
separate Young/AM-GM certificate.  This runner imports six sealed expansion
units and computes the remaining units with exactly one subprocess at a time.
"""

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
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_fast_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_audit_20260822.json"
SEALED_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_checkpoint_20260822.json"
DENSE_OUTPUT = ROOT / "rank8_a23_fast_agent_1_1_probe.tmp"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_first_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_exact_20260822.json"

EXPECTED = {
    PROBE.name: "81EBE70417A47465AB3BFB995E178C8D84715DAFDB69FCA3E0EEB73B8B3781E8",
    PROBE_AUDIT.name: "3C83C899D316AFB54AF848A451B038B1A423E0EBE8285F0D2F91A0CBF60B9774",
    SEALED_CHECKPOINT.name: "50E0DAB1F9974ABFF125A225105757EAACA8AF4C148FD6E4AB075E587E1F8D31",
    DENSE_OUTPUT.name: "DC88F3803FD1776087DD28C44C755BF6100D584E3D595D99C017D23CE3D6492B",
}
MIXED = {(0, 2), (2, 0)}


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


def position_key(row):
    return row["left_bernstein_index"], row["right_bernstein_index"]


def expected_positions(p_exponent: int, q_exponent: int):
    return tuple(
        position for position in required_positions(p_exponent, q_exponent)
        if position not in MIXED
    )


def validate_statistics(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
    assert statistics["terms"] >= 0
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]
    else:
        assert statistics["minimum"] is None
        assert statistics["maximum"] is None


def validate_row(row) -> None:
    p_exponent, q_exponent = key(row)
    assert 0 <= p_exponent <= 9 and 0 <= q_exponent <= 8
    assert p_exponent or q_exponent
    assert row["redistribution_degree"] == [2, 2]
    assert row["bernstein_scaling"] == 4
    positions = expected_positions(p_exponent, q_exponent)
    assert tuple(map(position_key, row["positions"])) == positions
    assert row["position_count"] == len(positions)
    assert row["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
    assert row["pass"] is True
    assert row["elapsed_seconds"] >= 0
    assert len(row["engine_sha256"]) == 64
    for position in row["positions"]:
        assert position["pass"] is True
        assert set(position["rows"]) == set(LABELS)
        for statistics in position["rows"].values():
            validate_statistics(statistics)


def normalize(source, engine: str, engine_sha256: str, elapsed_seconds: float, source_artifact: str):
    p_exponent, q_exponent = key(source)
    positions = [
        position for position in source["positions"]
        if position_key(position) not in MIXED
    ]
    row = {
        "p_exponent": p_exponent,
        "q_exponent": q_exponent,
        "redistribution_degree": [2, 2],
        "bernstein_scaling": 4,
        "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
        "positions": positions,
        "position_count": len(positions),
        "pass": all(position["pass"] for position in positions),
        "elapsed_seconds": elapsed_seconds,
        "engine": engine,
        "engine_sha256": engine_sha256,
        "source_artifact_sha256": source_artifact,
    }
    validate_row(row)
    return row


def imported_rows():
    sealed = json.loads(SEALED_CHECKPOINT.read_text(encoding="utf-8"))
    assert sealed["completed_expansion_units"] == 5
    assert sealed["completed_position_cells"] == 23
    rows = [
        normalize(
            source,
            "filtered_sealed_checkpoint_row",
            source["engine_sha256"],
            source["elapsed_seconds"],
            EXPECTED[SEALED_CHECKPOINT.name],
        )
        for source in sealed["rows"]
    ]
    dense = parse_one(DENSE_OUTPUT.read_text(encoding="utf-8-sig"))
    assert key(dense) == (1, 1)
    assert dense["pass"] is False
    assert len(dense["positions"]) == 7
    rows.append(normalize(
        dense,
        "filtered_sealed_dense_failure_row",
        EXPECTED[PROBE.name],
        0.0,
        EXPECTED[DENSE_OUTPUT.name],
    ))
    assert len(rows) == len({key(row) for row in rows}) == 6
    return sorted(rows, key=key)


def run_expansion(p_exponent: int, q_exponent: int):
    started = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PROBE), "--p", str(p_exponent), "--q", str(q_exponent)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"expansion {(p_exponent, q_exponent)} failed rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    source = parse_one(result.stdout)
    assert key(source) == (p_exponent, q_exponent)
    row = normalize(
        source,
        "interior_cached_polarized",
        EXPECTED[PROBE.name],
        time.perf_counter() - started,
        EXPECTED[PROBE.name],
    )
    if row["pass"] is not True:
        atomic_json(FAILURE, {
            "status": "FAIL_EXACT_A23_377_POSITION_COMPLEMENT",
            "cell": [p_exponent, q_exponent],
            "row": row,
        })
        raise RuntimeError(f"negative retained coefficient in {(p_exponent, q_exponent)}")
    return row


def checkpoint_payload(rows, source_hash: str, created_utc: str):
    return {
        "schema": "rank8-low-low-a23-redistribution-interior-fast-root-checkpoint-v1",
        "status": "RUNNING_EXACT_A23_377_POSITION_COMPLEMENT",
        "created_utc": created_utc,
        "updated_utc": now_utc(),
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "completed_expansion_units": len(rows),
        "total_expansion_units": 89,
        "completed_position_cells": sum(row["position_count"] for row in rows),
        "total_position_cells": 377,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
    }


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-expansions", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_expansions is None or args.max_new_expansions >= 0
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    probe_audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    assert probe_audit["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_PROBE_AUDIT"
    assert probe_audit["universe"]["total_retained_positions"] == 377
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        rows = saved["rows"]
        created_utc = saved["created_utc"]
    else:
        rows = imported_rows()
        created_utc = now_utc()
    for row in rows:
        validate_row(row)
    assert len(rows) == len({key(row) for row in rows})
    rows.sort(key=key)
    atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))

    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10) for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    assert len(targets) == 89
    priority = [(9, 8), (9, 0), (0, 8), (8, 8), (9, 7), (1, 1)]
    order = priority + sorted(
        targets - set(priority),
        key=lambda item: (-sum(item), -item[0], -item[1]),
    )
    assert set(order) == targets and len(order) == 89
    complete = {key(row) for row in rows}
    missing = [target for target in order if target not in complete]
    if args.max_new_expansions is not None:
        missing = missing[:args.max_new_expansions]

    for p_exponent, q_exponent in missing:
        row = run_expansion(p_exponent, q_exponent)
        rows.append(row)
        rows.sort(key=key)
        complete.add((p_exponent, q_exponent))
        atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash, created_utc))
        print(
            "PASS_INTERIOR_EXPANSION", p_exponent, q_exponent,
            row["position_count"], "POSITIONS",
            f"{row['elapsed_seconds']:.3f}s", len(rows), "OF", 89,
            flush=True,
        )

    if complete != targets:
        print(
            "PAUSED_EXACT_A23_377_POSITION_COMPLEMENT",
            len(rows), "OF", 89, "EXPANSIONS",
            sum(row["position_count"] for row in rows), "OF", 377, "POSITIONS",
            flush=True,
        )
        return

    assert len(rows) == 89
    assert sum(row["position_count"] for row in rows) == 377
    statistics = {label: [] for label in LABELS}
    by_position = {}
    for row in rows:
        for position in row["positions"]:
            name = ",".join(map(str, position_key(position)))
            by_position.setdefault(name, {label: [] for label in LABELS})
            for label in LABELS:
                item = position["rows"][label]
                statistics[label].append(item)
                by_position[name][label].append(item)
    global_aggregates = {label: aggregate(items) for label, items in statistics.items()}
    position_aggregates = {
        position: {label: aggregate(items) for label, items in grouped.items()}
        for position, grouped in by_position.items()
    }
    assert set(position_aggregates) == {"0,1", "1,0", "1,1", "1,2", "2,1"}
    assert all(item["negative"] == 0 for item in global_aggregates.values())

    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-fast-root-v1",
        "status": "PASS_EXACT_A23_377_POSITION_COMPLEMENT",
        "proof_scope": (
            "All 89 outer expansion units and all 377 Bernstein positions outside "
            "the two mixed endpoint faces have coefficientwise nonnegative exact "
            "integer slack expansions."
        ),
        "universe": {
            "outer_expansion_units": 89,
            "both_positive_units": 72,
            "axis_units": 17,
            "retained_positions": 377,
            "separate_mixed_face_positions": 144,
            "original_position_universe": 521,
        },
        "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "checkpoint_sha256": sha256(CHECKPOINT),
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
        "scope_warning": (
            "This report does not prove either mixed endpoint face and therefore "
            "does not by itself close the full a2/a3 bridge."
        ),
    }
    atomic_json(REPORT, payload)
    complete_checkpoint = checkpoint_payload(rows, source_hash, created_utc)
    complete_checkpoint["status"] = "COMPLETE_EXACT_A23_377_POSITION_COMPLEMENT"
    complete_checkpoint["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete_checkpoint)
    print(payload["status"])
    print("POSITIONS", 377)
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
