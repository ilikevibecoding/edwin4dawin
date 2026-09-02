#!/usr/bin/env python3
"""Independent structural and exact-replay audit of the 377-cell report."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank8_low_low_a23_redistribution_interior_fast_root.py"
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_fast_root.py"
PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_audit_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_exact_20260822.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_independent_audit_20260822.json"

EXPECTED = {
    PRODUCER.name: "299C6C094CCB1FBC9B6B8D9C5362F383028B3CC327AE500224720F4B6794A016",
    PROBE.name: "81EBE70417A47465AB3BFB995E178C8D84715DAFDB69FCA3E0EEB73B8B3781E8",
    PROBE_AUDIT.name: "3C83C899D316AFB54AF848A451B038B1A423E0EBE8285F0D2F91A0CBF60B9774",
}
MIXED = {(0, 2), (2, 0)}
REPLAY_CELLS = ((9, 6), (6, 6), (1, 8), (8, 0))


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


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    probe_audit = json.loads(PROBE_AUDIT.read_text(encoding="utf-8"))
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert probe_audit["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_PROBE_AUDIT"
    assert checkpoint["status"] == "COMPLETE_EXACT_A23_377_POSITION_COMPLEMENT"
    assert report["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT"
    assert checkpoint["report_sha256"] == sha256(REPORT)
    assert checkpoint["rows"] == report["rows"]
    assert report["source_sha256"] == EXPECTED[PRODUCER.name]
    assert checkpoint["source_sha256"] == EXPECTED[PRODUCER.name]
    assert report["universe"] == {
        "outer_expansion_units": 89,
        "both_positive_units": 72,
        "axis_units": 17,
        "retained_positions": 377,
        "separate_mixed_face_positions": 144,
        "original_position_universe": 521,
    }

    rows = report["rows"]
    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10) for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    assert len(rows) == 89 and {key(row) for row in rows} == targets
    assert len({key(row) for row in rows}) == 89
    assert sum(row["position_count"] for row in rows) == 377
    statistics = {label: [] for label in LABELS}
    by_position = {}
    for row in rows:
        p_exponent, q_exponent = key(row)
        expected = expected_positions(p_exponent, q_exponent)
        assert tuple(map(position_key, row["positions"])) == expected
        assert row["position_count"] == len(expected)
        assert row["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
        assert row["pass"] is True
        for position in row["positions"]:
            assert position["pass"] is True
            assert set(position["rows"]) == set(LABELS)
            name = ",".join(map(str, position_key(position)))
            by_position.setdefault(name, {label: [] for label in LABELS})
            for label, item in position["rows"].items():
                assert item["negative"] == 0 and item["first_negative"] is None
                assert item["terms"] >= 0
                if item["terms"]:
                    assert 0 < item["minimum"] <= item["maximum"]
                else:
                    assert item["minimum"] is None and item["maximum"] is None
                statistics[label].append(item)
                by_position[name][label].append(item)
    global_aggregates = {label: aggregate(items) for label, items in statistics.items()}
    position_aggregates = {
        position: {label: aggregate(items) for label, items in grouped.items()}
        for position, grouped in by_position.items()
    }
    assert global_aggregates == report["global_aggregates"]
    assert position_aggregates == report["position_aggregates"]
    assert set(position_aggregates) == {"0,1", "1,0", "1,1", "1,2", "2,1"}

    indexed = {key(row): row for row in rows}
    exact_replays = []
    for cell in REPLAY_CELLS:
        result = subprocess.run(
            [sys.executable, str(PROBE), "--p", str(cell[0]), "--q", str(cell[1])],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
            timeout=300,
        )
        assert result.returncode == 0 and not result.stderr
        candidate = parse_one(result.stdout)
        recorded = indexed[cell]
        assert candidate["positions"] == recorded["positions"]
        assert candidate["position_count"] == recorded["position_count"]
        exact_replays.append({
            "cell": list(cell),
            "positions": candidate["position_count"],
            "exact_statistics_dictionary_equality": True,
        })

    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-full-root-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_A23_377_POSITION_COMPLEMENT_AUDIT",
        "coverage": {
            "outer_expansion_units": 89,
            "retained_positions": 377,
            "mixed_positions_excluded": 144,
            "all_reported_statistics_reaggregated": True,
            "exact_replay_cells": len(exact_replays),
        },
        "exact_replays": exact_replays,
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "immutable_inputs": EXPECTED,
        "report_sha256": sha256(REPORT),
        "checkpoint_sha256": sha256(CHECKPOINT),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The audit closes only the 377-position complement. The two mixed "
            "endpoint faces still require their separate arbitrary-slack proof."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("EXACT_REPLAYS", len(exact_replays))
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
