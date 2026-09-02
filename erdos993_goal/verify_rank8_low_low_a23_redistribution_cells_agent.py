#!/usr/bin/env python3
"""Checkpointed 89-expansion verifier for 521 new a2/a3 Bernstein cells."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
IDENTITY = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_agent_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_cells_agent_first_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_cells_agent_exact_20260822.json"
EXPECTED = {
    PROBE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    IDENTITY.name: "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["p_exponent"], row["q_exponent"]


def position_key(row):
    return row["left_bernstein_index"], row["right_bernstein_index"]


def validate_statistics(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
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
    expected_positions = required_positions(p_exponent, q_exponent)
    assert tuple(map(position_key, row["positions"])) == expected_positions
    assert row["position_count"] == len(expected_positions)
    assert row["pass"] is True
    for position in row["positions"]:
        assert position["pass"] is True
        assert set(position["rows"]) == set(LABELS)
        for statistics in position["rows"].values():
            validate_statistics(statistics)


def run_expansion(p_exponent, q_exponent):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable,
            str(PROBE),
            "--p", str(p_exponent),
            "--q", str(q_exponent),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"expansion {(p_exponent, q_exponent)} failed "
            f"rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == (p_exponent, q_exponent)
    row["elapsed_seconds"] = time.perf_counter() - started
    if row["pass"] is not True:
        atomic_json(FAILURE, {
            "status": "FAIL_EXACT_A23_REDISTRIBUTION_CELL",
            "cell": [p_exponent, q_exponent],
            "probe_sha256": EXPECTED[PROBE.name],
            "row": row,
        })
        raise RuntimeError(
            f"negative Bernstein coefficient in {(p_exponent, q_exponent)}; "
            f"witness preserved at {FAILURE}"
        )
    validate_row(row)
    return row


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def checkpoint_payload(rows, source_hash):
    return {
        "status": "RUNNING_EXACT_A23_REDISTRIBUTION_CELLS_AGENT",
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "completed_expansion_units": len(rows),
        "total_expansion_units": 89,
        "completed_position_cells": sum(row["position_count"] for row in rows),
        "total_position_cells": 521,
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-expansions", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_expansions is None or args.max_new_expansions >= 0
    assert {path.name: sha256(path) for path in (PROBE, IDENTITY)} == EXPECTED
    identity = json.loads(IDENTITY.read_text(encoding="utf-8"))
    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["compressed_cell_universe"]["FLINT_expansion_units"] == 89
    assert identity["compressed_cell_universe"]["new_Bernstein_position_cells"] == 521
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        rows = saved["rows"]
    else:
        rows = []
    for row in rows:
        validate_row(row)
    assert len(rows) == len({key(row) for row in rows})
    rows.sort(key=key)
    atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash))

    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10) for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    assert len(targets) == 89
    priority = [(9, 8), (9, 0), (0, 8), (8, 8), (9, 7), (1, 1), (1, 0), (0, 1)]
    order = priority + sorted(
        targets - set(priority),
        key=lambda item: (-sum(item), -item[0], -item[1]),
    )
    assert set(order) == targets and len(order) == len(targets)
    complete = {key(row) for row in rows}
    new_count = 0
    for p_exponent, q_exponent in order:
        target = (p_exponent, q_exponent)
        if target in complete:
            continue
        if (
            args.max_new_expansions is not None
            and new_count >= args.max_new_expansions
        ):
            print(
                "PAUSED_EXACT_A23_REDISTRIBUTION_CELLS_AGENT",
                len(rows), "OF", 89, "EXPANSIONS",
                sum(row["position_count"] for row in rows), "OF", 521,
                "POSITIONS",
                flush=True,
            )
            return
        row = run_expansion(p_exponent, q_exponent)
        rows.append(row)
        rows.sort(key=key)
        complete.add(target)
        new_count += 1
        atomic_json(CHECKPOINT, checkpoint_payload(rows, source_hash))
        print(
            "PASS_EXPANSION", p_exponent, q_exponent,
            row["position_count"], "POSITIONS",
            f"{row['elapsed_seconds']:.3f}s",
            len(rows), "OF", 89,
            flush=True,
        )

    assert complete == targets and len(rows) == 89
    assert sum(row["position_count"] for row in rows) == 521
    statistics = {label: [] for label in LABELS}
    by_position = {}
    for row in rows:
        for position in row["positions"]:
            position_name = ",".join(map(str, position_key(position)))
            by_position.setdefault(position_name, {label: [] for label in LABELS})
            for label in LABELS:
                item = position["rows"][label]
                statistics[label].append(item)
                by_position[position_name][label].append(item)
    global_aggregates = {
        label: aggregate(items) for label, items in statistics.items()
    }
    position_aggregates = {
        position: {
            label: aggregate(items) for label, items in rows_by_label.items()
        }
        for position, rows_by_label in by_position.items()
    }
    assert all(
        item["negative"] == 0
        and (item["terms"] == 0 or item["minimum"] > 0)
        for item in global_aggregates.values()
    )
    payload = {
        "schema": "rank8-low-low-a23-redistribution-cells-agent-v1",
        "status": "PASS_EXACT_A23_REDISTRIBUTION_NEW_BERNSTEIN_CELLS",
        "meaning": (
            "All 521 genuinely new tensor Bernstein position cells in the "
            "P=a2+a3,Q=b2+b3 redistribution are coefficientwise nonnegative. "
            "Endpoint theorem verification is intentionally separate."
        ),
        "expansion_units": 89,
        "new_Bernstein_position_cells": 521,
        "rows": rows,
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "total_exact_coefficients": sum(
            item["terms"] for item in global_aggregates.values()
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "scope_warning": (
            "This report is the interior/axis certificate. The full theorem "
            "also requires the sealed full-early and a2=b2=0 endpoint faces."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
