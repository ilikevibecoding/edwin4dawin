#!/usr/bin/env python3
"""Fail-closed independent audit of the assembled 377-position certificate.

The audit reconstructs the whole target universe from ``required_positions``,
checks the immutable producer chain, compares the assembled rows byte-for-byte
at the JSON value level with the disjoint prefix/tail union, and independently
reaggregates every recorded exact coefficient statistic.  The low-memory FLINT
index scanner is accepted only through its separate hash-pinned equivalence
audit against the original coefficient-list scanner.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_low_low_a23_redistribution_interior_complete_root.py"
PREFIX = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
TAIL_RUNNER = ROOT / "verify_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_root.py"
TAIL_PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_root.py"
TAIL_PROBE_AUDITOR = ROOT / "audit_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_probe_root.py"
TAIL_PROBE_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_probe_audit_20260823.json"
IMPORTED_TAIL_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_tail_checkpoint_20260823.json"
TAIL_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_checkpoint_20260823.json"
TAIL_REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_exact_20260823.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_complete_independent_audit_root_20260823.json"

EXPECTED = {
    ASSEMBLER.name: "595D46B0FE4C725A234885371C79FEA1B42B87BAB55876EFFC9DB55BA77F8BF0",
    PREFIX.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
    TAIL_RUNNER.name: "D5F949547729D4C06455359DEF6BAD10CB9217A8CC4FA2B62B35EB019BEF6958",
    TAIL_PROBE.name: "5450CBD6EC241ACEE4CD1335D4C3815539DF905DBFFC980AC1EEE59C9D145ABC",
    TAIL_PROBE_AUDITOR.name: "BCF921A4C3B9A08E94EF0DD1FD205DE9B6E46A0BC282E7C39F2D5D8BDD89836A",
    TAIL_PROBE_AUDIT.name: "CA1654523EE4728D63296C7263203A758738624B479271C975C4922C82964C29",
    IMPORTED_TAIL_CHECKPOINT.name: "5C0443DCF8DB5430EEA377D4F4B6FAF0013FFF109EE916F3D4D5F8034E578244",
}
EXPECTED_PREFIX_SOURCE = "299C6C094CCB1FBC9B6B8D9C5362F383028B3CC327AE500224720F4B6794A016"
LEGACY_PROBE = "D8FA040135EEEC06FEC2ABCB8B75DC734DFE5EAE7D74E5120EE5A1898031C979"
TAIL_KEYS = {(2, 0), (0, 2), (1, 0), (0, 1)}
MIXED = {(0, 2), (2, 0)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def value_sha256(value) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["p_exponent"], row["q_exponent"]


def shard_key(shard):
    return shard["p_exponent"], shard["q_exponent"], shard["label"]


def position_key(position):
    return position["left_bernstein_index"], position["right_bernstein_index"]


def retained_positions(p_exponent: int, q_exponent: int):
    return tuple(
        position
        for position in required_positions(p_exponent, q_exponent)
        if position not in MIXED
    )


def validate_statistics(item) -> None:
    assert set(item) == {"terms", "negative", "minimum", "maximum", "first_negative"}
    assert type(item["terms"]) is int and item["terms"] >= 0
    assert item["negative"] == 0 and item["first_negative"] is None
    if item["terms"]:
        assert type(item["minimum"]) is int and type(item["maximum"]) is int
        assert 0 < item["minimum"] <= item["maximum"]
    else:
        assert item["minimum"] is None and item["maximum"] is None


def validate_row(row) -> None:
    p_exponent, q_exponent = key(row)
    assert 0 <= p_exponent <= 9 and 0 <= q_exponent <= 8
    assert p_exponent or q_exponent
    assert row["redistribution_degree"] == [2, 2]
    assert row["bernstein_scaling"] == 4
    assert row["excluded_mixed_endpoint_positions"] == [[0, 2], [2, 0]]
    expected = retained_positions(p_exponent, q_exponent)
    assert tuple(map(position_key, row["positions"])) == expected
    assert row["position_count"] == len(expected)
    assert row["pass"] is True
    assert isinstance(row["elapsed_seconds"], (int, float)) and row["elapsed_seconds"] >= 0
    assert len(row["engine_sha256"]) == 64
    assert len(row["source_artifact_sha256"]) == 64
    for position in row["positions"]:
        assert position["pass"] is True
        assert set(position["rows"]) == set(LABELS)
        for item in position["rows"].values():
            validate_statistics(item)


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

    prefix = json.loads(PREFIX.read_text(encoding="utf-8"))
    tail_checkpoint = json.loads(TAIL_CHECKPOINT.read_text(encoding="utf-8"))
    tail = json.loads(TAIL_REPORT.read_text(encoding="utf-8"))
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    scanner_audit = json.loads(TAIL_PROBE_AUDIT.read_text(encoding="utf-8"))

    assert prefix["status"] == "RUNNING_EXACT_A23_377_POSITION_COMPLEMENT"
    assert prefix["source_sha256"] == EXPECTED_PREFIX_SOURCE
    assert prefix["completed_expansion_units"] == 85
    assert prefix["completed_position_cells"] == 373
    assert len(prefix["rows"]) == 85

    assert tail_checkpoint["status"] == "COMPLETE_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL"
    assert tail_checkpoint["source_sha256"] == EXPECTED[TAIL_RUNNER.name]
    assert tail_checkpoint["imported_axis_units"] == 2
    assert tail_checkpoint["imported_legacy_label_shards"] == 1
    assert tail_checkpoint["completed_v2_label_shards"] == 7
    assert tail_checkpoint["total_combined_label_shards"] == 8
    assert tail_checkpoint["report_sha256"] == sha256(TAIL_REPORT)
    assert tail["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL"
    assert tail["source_sha256"] == EXPECTED[TAIL_RUNNER.name]
    assert tail["axis_units"] == tail["position_cells"] == 4
    assert tail["imported_axis_units"] == 2
    assert tail["legacy_label_shards"] == 1 and tail["fresh_v2_label_shards"] == 7
    assert tail["negative_coefficients"] == 0
    assert {key(row) for row in tail["rows"]} == TAIL_KEYS

    tail_rows = {key(row): row for row in tail["rows"]}
    assert tail_checkpoint["imported_rows"] == [
        row for row in tail["rows"] if key(row) in {(0, 2), (2, 0)}
    ]
    shards = tail_checkpoint["legacy_shards"] + tail_checkpoint["shards"]
    assert len(shards) == len({shard_key(shard) for shard in shards}) == 8
    for cell in ((1, 0), (0, 1)):
        row = tail_rows[cell]
        position = row["positions"][0]
        selected = {
            shard["label"]: shard
            for shard in shards
            if (shard["p_exponent"], shard["q_exponent"]) == cell
        }
        assert set(selected) == set(LABELS)
        assert position["rows"] == {
            label: selected[label]["statistics"] for label in LABELS
        }
        assert row["elapsed_seconds"] == sum(
            selected[label]["elapsed_seconds"] for label in LABELS
        )
        for label in LABELS:
            assert selected[label]["pass"] is True
            expected_engine = (
                LEGACY_PROBE
                if (cell[0], cell[1], label) == (1, 0, "curvature_middle_times_4")
                else EXPECTED[TAIL_PROBE.name]
            )
            assert selected[label]["engine_sha256"] == expected_engine
            validate_statistics(selected[label]["statistics"])

    assert scanner_audit["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_PROBE_AUDIT"
    assert scanner_audit["coverage"]["label_replays"] == 16
    assert scanner_audit["coverage"]["direct_far_replays"] == 8
    replayed = scanner_audit["exact_replays"]
    assert {tuple(item["cell"]) for item in replayed} == {(9, 0), (8, 0), (0, 8), (0, 7)}
    assert all(
        set(item["labels"]) == set(LABELS)
        and all(
            label_item["exact_statistics_dictionary_equality"] is True
            for label_item in item["labels"].values()
        )
        for item in replayed
    )
    assert scanner_audit["source_sha256"] == EXPECTED[TAIL_PROBE_AUDITOR.name]

    expected_tail_inputs = {
        TAIL_PROBE.name: EXPECTED[TAIL_PROBE.name],
        TAIL_PROBE_AUDITOR.name: EXPECTED[TAIL_PROBE_AUDITOR.name],
        TAIL_PROBE_AUDIT.name: EXPECTED[TAIL_PROBE_AUDIT.name],
        IMPORTED_TAIL_CHECKPOINT.name: EXPECTED[IMPORTED_TAIL_CHECKPOINT.name],
    }
    assert tail["immutable_inputs"] == expected_tail_inputs
    assert tail_checkpoint["immutable_inputs"] == expected_tail_inputs

    assert report["schema"] == "rank8-low-low-a23-redistribution-interior-complete-root-v4"
    assert report["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED"
    assert report["source_sha256"] == EXPECTED[ASSEMBLER.name]
    assert report["input_sha256"] == {
        PREFIX.name: EXPECTED[PREFIX.name],
        TAIL_REPORT.name: sha256(TAIL_REPORT),
    }
    assert report["universe"] == {
        "outer_expansion_units": 89,
        "cached_prefix_units": 85,
        "streamed_tail_units": 4,
        "both_positive_units": 72,
        "axis_units": 17,
        "retained_positions": 377,
        "separate_mixed_face_positions": 144,
        "original_position_universe": 521,
    }

    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10)
        for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    original_count = sum(len(required_positions(*cell)) for cell in targets)
    retained_count = sum(len(retained_positions(*cell)) for cell in targets)
    assert len(targets) == 89
    assert original_count == 521 and retained_count == 377
    assert original_count - retained_count == 144

    prefix_keys = {key(row) for row in prefix["rows"]}
    tail_keys = {key(row) for row in tail["rows"]}
    assert len(prefix_keys) == 85
    assert tail_keys == TAIL_KEYS
    assert prefix_keys.isdisjoint(tail_keys)
    assert prefix_keys | tail_keys == targets
    expected_rows = sorted(prefix["rows"] + tail["rows"], key=key)
    assert report["rows"] == expected_rows
    assert report["streamed_tail_keys"] == [list(item) for item in sorted(TAIL_KEYS)]
    assert sum(row["position_count"] for row in expected_rows) == 377
    for row in expected_rows:
        validate_row(row)

    statistics = {label: [] for label in LABELS}
    by_position = {}
    for row in expected_rows:
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
    assert global_aggregates == report["global_aggregates"]
    assert position_aggregates == report["position_aggregates"]
    assert set(position_aggregates) == {"0,1", "1,0", "1,1", "1,2", "2,1"}
    assert all(item["negative"] == 0 for item in global_aggregates.values())
    assert report["recorded_probe_seconds"] == sum(
        row["elapsed_seconds"] for row in expected_rows
    )

    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-complete-independent-audit-root-v2",
        "status": "PASS_INDEPENDENT_A23_377_POSITION_ASSEMBLY_AUDIT",
        "coverage": {
            "outer_expansion_units_reconstructed": 89,
            "retained_positions_reconstructed": 377,
            "mixed_positions_excluded": 144,
            "all_statistics_reaggregated": True,
            "scanner_sealed_axis_cells": len(replayed),
            "scanner_exact_label_replays": sum(len(item["labels"]) for item in replayed),
        },
        "rows_canonical_sha256": value_sha256(expected_rows),
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "immutable_inputs": EXPECTED,
        "tail_checkpoint_sha256": sha256(TAIL_CHECKPOINT),
        "tail_report_sha256": sha256(TAIL_REPORT),
        "assembled_report_sha256": sha256(REPORT),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audit closes only the 377-position complement. The two mixed "
            "endpoint faces remain a separate arbitrary-slack proof gate."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print(
        "UNITS", 89, "POSITIONS", 377,
        "SCANNER_LABEL_REPLAYS", sum(len(item["labels"]) for item in replayed),
    )
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
