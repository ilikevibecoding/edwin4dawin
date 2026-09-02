#!/usr/bin/env python3
"""Assemble the sealed 85-unit prefix and four low-memory axis rows.

This producer performs no symbolic expansion.  It fail-closes unless the two
input artifacts have their pinned hashes, their advertised exact scopes are
complete, and their disjoint union is precisely the 89-unit/377-position
complement of the two mixed endpoint faces.
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
PREFIX = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
TAIL = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_tail_exact_20260823.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"

EXPECTED = {
    PREFIX.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
}
EXPECTED_PREFIX_SOURCE = "299C6C094CCB1FBC9B6B8D9C5362F383028B3CC327AE500224720F4B6794A016"
EXPECTED_TAIL_SOURCE = "D5F949547729D4C06455359DEF6BAD10CB9217A8CC4FA2B62B35EB019BEF6958"
EXPECTED_TAIL_KEYS = {(2, 0), (0, 2), (1, 0), (0, 1)}
MIXED = {(0, 2), (2, 0)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["p_exponent"], row["q_exponent"]


def position_key(position):
    return position["left_bernstein_index"], position["right_bernstein_index"]


def expected_positions(p_exponent: int, q_exponent: int):
    return tuple(
        position
        for position in required_positions(p_exponent, q_exponent)
        if position not in MIXED
    )


def validate_statistics(item) -> None:
    assert set(item) == {"terms", "negative", "minimum", "maximum", "first_negative"}
    assert isinstance(item["terms"], int) and item["terms"] >= 0
    assert item["negative"] == 0 and item["first_negative"] is None
    if item["terms"]:
        assert isinstance(item["minimum"], int) and isinstance(item["maximum"], int)
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
    positions = expected_positions(p_exponent, q_exponent)
    assert tuple(map(position_key, row["positions"])) == positions
    assert row["position_count"] == len(positions)
    assert row["pass"] is True and row["elapsed_seconds"] >= 0
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
    tail = json.loads(TAIL.read_text(encoding="utf-8"))

    assert prefix["status"] == "RUNNING_EXACT_A23_377_POSITION_COMPLEMENT"
    assert prefix["source_sha256"] == EXPECTED_PREFIX_SOURCE
    assert prefix["completed_expansion_units"] == 85
    assert prefix["completed_position_cells"] == 373
    assert len(prefix["rows"]) == 85

    assert tail["status"] == "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_TAIL"
    assert tail["source_sha256"] == EXPECTED_TAIL_SOURCE
    assert tail["axis_units"] == 4 and tail["position_cells"] == 4
    assert tail["negative_coefficients"] == 0
    assert len(tail["rows"]) == 4

    prefix_keys = {key(row) for row in prefix["rows"]}
    tail_keys = {key(row) for row in tail["rows"]}
    assert len(prefix_keys) == 85 and tail_keys == EXPECTED_TAIL_KEYS
    assert prefix_keys.isdisjoint(tail_keys)

    rows = sorted(prefix["rows"] + tail["rows"], key=key)
    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10)
        for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    assert len(rows) == len({key(row) for row in rows}) == len(targets) == 89
    assert {key(row) for row in rows} == targets
    for row in rows:
        validate_row(row)
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

    input_hashes = {PREFIX.name: sha256(PREFIX), TAIL.name: sha256(TAIL)}
    payload = {
        "schema": "rank8-low-low-a23-redistribution-interior-complete-root-v4",
        "status": "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED",
        "proof_scope": (
            "The pinned 85-unit cached prefix and four independently scanned "
            "axis units form the exact 89-unit, 377-position complement of the "
            "two mixed endpoint faces; every recorded integer coefficient is "
            "nonnegative."
        ),
        "universe": {
            "outer_expansion_units": 89,
            "cached_prefix_units": 85,
            "streamed_tail_units": 4,
            "both_positive_units": 72,
            "axis_units": 17,
            "retained_positions": 377,
            "separate_mixed_face_positions": 144,
            "original_position_universe": 521,
        },
        "streamed_tail_keys": [list(item) for item in sorted(EXPECTED_TAIL_KEYS)],
        "excluded_mixed_endpoint_positions": [[0, 2], [2, 0]],
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "input_sha256": input_hashes,
        "source_sha256": sha256(Path(__file__)),
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
        "scope_warning": (
            "This report deliberately excludes the two mixed endpoint faces; "
            "their arbitrary-slack certificate is a separate remaining gate."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("UNITS", len(rows), "POSITIONS", sum(row["position_count"] for row in rows))
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
