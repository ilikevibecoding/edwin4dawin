#!/usr/bin/env python3
"""Independent snapshot audit of the running compressed a2/a3 checkpoint."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
RUNNER = ROOT / "verify_rank8_low_low_a23_redistribution_cells_agent.py"
IDENTITY = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
REPLAY = ROOT / "rank8_low_low_a23_probe_replay_agent_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_agent_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_checkpoint_agent_audit_20260822.json"
EXPECTED = {
    PROBE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    RUNNER.name: "15919D393D8DB05AA3CBEB2AA6D0D569D126CA823F1E34377133B2B6390754D8",
    IDENTITY.name: "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
    REPLAY.name: "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB",
}
LABELS = {
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
}
INTERIOR = (
    (0, 1), (0, 2), (1, 0), (1, 1),
    (1, 2), (2, 0), (2, 1),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def required_positions(p_exponent, q_exponent):
    if p_exponent and q_exponent:
        return INTERIOR
    if p_exponent:
        return ((1, 0),)
    if q_exponent:
        return ((0, 1),)
    return ()


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def main() -> None:
    assert {path.name: sha256(path) for path in (
        PROBE, RUNNER, IDENTITY, REPLAY,
    )} == EXPECTED
    checkpoint_hash = sha256(CHECKPOINT)
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert checkpoint["source_sha256"] == EXPECTED[RUNNER.name]
    assert checkpoint["immutable_inputs"] == {
        PROBE.name: EXPECTED[PROBE.name],
        IDENTITY.name: EXPECTED[IDENTITY.name],
    }
    assert checkpoint["total_expansion_units"] == 89
    assert checkpoint["total_position_cells"] == 521
    rows = checkpoint["rows"]
    assert checkpoint["completed_expansion_units"] == len(rows)
    seen = set()
    statistics = {label: [] for label in LABELS}
    position_count = 0
    elapsed = 0.0
    for row in rows:
        key = row["p_exponent"], row["q_exponent"]
        assert key not in seen and key != (0, 0)
        assert 0 <= key[0] <= 9 and 0 <= key[1] <= 8
        seen.add(key)
        actual = tuple(
            (item["left_bernstein_index"], item["right_bernstein_index"])
            for item in row["positions"]
        )
        assert actual == required_positions(*key)
        assert row["position_count"] == len(actual)
        assert row["pass"] is True
        position_count += len(actual)
        elapsed += float(row["elapsed_seconds"])
        for position in row["positions"]:
            assert position["pass"] is True
            assert set(position["rows"]) == LABELS
            for label, item in position["rows"].items():
                assert item["negative"] == 0
                assert item["first_negative"] is None
                if item["terms"]:
                    assert item["minimum"] > 0
                    assert item["maximum"] >= item["minimum"]
                else:
                    assert item["minimum"] is None and item["maximum"] is None
                statistics[label].append(item)
    assert checkpoint["completed_position_cells"] == position_count
    aggregates = {label: aggregate(items) for label, items in statistics.items()}
    complete = len(rows) == 89
    if complete:
        assert seen == {
            (p_exponent, q_exponent)
            for p_exponent in range(10) for q_exponent in range(9)
            if p_exponent or q_exponent
        }
        assert position_count == 521
    payload = {
        "schema": "rank8-low-low-a23-checkpoint-agent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_COMPLETE_A23_CHECKPOINT_AUDIT"
            if complete else "PASS_INDEPENDENT_PARTIAL_A23_CHECKPOINT_AUDIT"
        ),
        "checkpoint_sha256": checkpoint_hash,
        "completed_expansion_units": len(rows),
        "completed_position_cells": position_count,
        "total_elapsed_seconds_recorded": elapsed,
        "aggregates": aggregates,
        "complete": complete,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
