#!/usr/bin/env python3
"""Aggregate contiguous chunk outputs from the fast rank-4 scanner."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("inputs", nargs="+", type=Path)
    args = parser.parse_args()

    payloads = [
        json.loads(path.read_text(encoding="utf-8"))
        for path in args.inputs
    ]
    rows = [payload["per_order"][0] for payload in payloads]
    order = rows[0]["order"]
    assert all(row["order"] == order for row in rows)
    rows.sort(key=lambda row: row["start_index"])
    assert rows[0]["start_index"] == 0
    for left, right in zip(rows, rows[1:]):
        assert left["stop_index"] == right["start_index"]
    assert all(
        payload["first_negative_curvature"] is None
        and payload["first_negative_leaf_increment"] is None
        and payload["first_below_double_star_envelope"] is None
        for payload in payloads
    )

    curvature_row = min(rows, key=lambda row: row["minimum_curvature"])
    increment_row = min(
        rows, key=lambda row: row["minimum_leaf_increment"]
    )
    excess_row = min(
        rows, key=lambda row: row["minimum_envelope_excess"]
    )
    trees = sum(row["trees"] for row in rows)
    attachments = sum(row["attachments"] for row in rows)
    last = rows[-1]
    final_chunk_capacity = last["stop_index"] - last["start_index"]
    generator_exhausted = last["trees"] < final_chunk_capacity
    assert generator_exhausted

    result = {
        "order": order,
        "coverage": {
            "start_index": 0,
            "trees": trees,
            "last_tree_index": trees - 1,
            "generator_exhausted": generator_exhausted,
            "attachments": attachments,
        },
        "minimum_curvature": curvature_row["minimum_curvature"],
        "minimum_curvature_witness": (
            curvature_row["minimum_curvature_witness"]
        ),
        "minimum_leaf_increment": increment_row[
            "minimum_leaf_increment"
        ],
        "minimum_leaf_increment_witness": increment_row[
            "minimum_leaf_increment_witness"
        ],
        "double_star_envelope": rows[0]["double_star_envelope"],
        "double_star_envelope_parameters": rows[0][
            "double_star_envelope_parameters"
        ],
        "minimum_envelope_excess": excess_row[
            "minimum_envelope_excess"
        ],
        "minimum_envelope_excess_witness": excess_row[
            "minimum_envelope_excess_witness"
        ],
        "negative_curvatures": 0,
        "negative_leaf_increments": 0,
        "below_double_star_envelope": 0,
        "source_files": [str(path) for path in args.inputs],
        "elapsed_seconds_sum": sum(
            payload["elapsed_seconds"] for payload in payloads
        ),
    }
    assert result["minimum_envelope_excess"] == 0
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    print("rank-4 chunk aggregation: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
