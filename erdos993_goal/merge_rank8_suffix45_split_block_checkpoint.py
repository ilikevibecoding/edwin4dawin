#!/usr/bin/env python3
"""Merge one hash-verified split outer block into the parent suffix45 checkpoint."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PARENT = ROOT / "rank8_low_low_full_early_suffix45_a5_b5_blocks_checkpoint_20260822.json"
EXPECTED_PARENT_PROBE = "BC9988E35FFC95E406C4CFF7D8347DF2AACAC398FA4B1A2BC5E4D13CB5AB5A23"
EXPECTED_PARENT_VERIFIER = "82F0E30530689B2D0611893A23FB61A4FBAC7480827CD876D1E524F33DA1318B"
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["a5_exponent"], row["b5_exponent"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--split-report", type=Path, required=True)
    parser.add_argument("--expected-sha256", required=True)
    args = parser.parse_args()
    split_path = args.split_report.resolve()
    assert split_path.parent == ROOT
    expected_split = args.expected_sha256.upper()
    assert sha256(split_path) == expected_split

    parent = json.loads(PARENT.read_text(encoding="utf-8"))
    assert parent["status"] == "RUNNING_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_BLOCKS"
    assert parent["probe_sha256"] == EXPECTED_PARENT_PROBE
    assert parent["verifier_sha256"] == EXPECTED_PARENT_VERIFIER
    split = json.loads(split_path.read_text(encoding="utf-8"))
    assert split["status"] == "PASS_EXACT_RANK8_SUFFIX45_SPLIT_OUTER_BLOCK"
    assert split["inner_grid_cells"] == 132
    row = split["block_summary"]
    assert key(row) == tuple(split["outer_block"])
    assert row["pass"] and row["suffix5_face_match"]
    assert set(row["rows"]) == set(AUXILIARIES)
    assert set(row["suffix5_face_rows"]) == set(AUXILIARIES)
    for label in AUXILIARIES:
        assert row["rows"][label]["negative"] == 0
        row["rows"][label]["first_negative"] = None
    row["split_cell_report_sha256"] = expected_split

    existing = {key(item): item for item in parent["rows"]}
    if key(row) in existing:
        assert existing[key(row)] == row
    else:
        parent["rows"].append(row)
        parent["rows"].sort(key=key)
    atomic_json(PARENT, parent)
    print("PASS_MERGED_SPLIT_BLOCK", *key(row))
    print("PARENT_ROWS", len(parent["rows"]))
    print("PARENT", sha256(PARENT))


if __name__ == "__main__":
    main()
