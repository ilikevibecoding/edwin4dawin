#!/usr/bin/env python3
"""Exact equivalence audit for the direct-endpoint one-label axis probe."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import LABELS


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_root.py"
REFERENCE = ROOT / "rank8_low_low_a23_redistribution_interior_fast_root_checkpoint_20260822.json"
OUTPUT = ROOT / "rank8_low_low_a23_redistribution_interior_axis_label_shard_v2_probe_audit_20260823.json"
EXPECTED = {
    PROBE.name: "5450CBD6EC241ACEE4CD1335D4C3815539DF905DBFFC980AC1EEE59C9D145ABC",
    REFERENCE.name: "6F2EE89A1B12E1EBC533172BC89CAAAD1E99A4AA98954FDEFEEC0060D2F9E67C",
}
CELLS = ((9, 0), (8, 0), (0, 8), (0, 7))
FAR = {"curvature_far", "strong_far"}


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


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    reference = json.loads(REFERENCE.read_text(encoding="utf-8"))
    indexed = {
        (row["p_exponent"], row["q_exponent"]): row
        for row in reference["rows"]
    }
    exact_replays = []
    for cell in CELLS:
        recorded = indexed[cell]
        assert recorded["position_count"] == 1
        recorded_position = recorded["positions"][0]
        labels = {}
        for label in LABELS:
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
                timeout=600,
            )
            assert result.returncode == 0 and not result.stderr
            candidate = parse_one(result.stdout)
            assert (candidate["p_exponent"], candidate["q_exponent"]) == cell
            assert candidate["label"] == label
            assert candidate["label_sharding"] is True
            assert candidate["low_peak_accumulation"] is True
            assert candidate["far_endpoint_direct"] is (label in FAR)
            assert candidate["coefficient_scan"] == "flint_term_index_no_python_list"
            assert (
                candidate["left_bernstein_index"],
                candidate["right_bernstein_index"],
            ) == (
                recorded_position["left_bernstein_index"],
                recorded_position["right_bernstein_index"],
            )
            assert candidate["statistics"] == recorded_position["rows"][label]
            assert candidate["pass"] is True
            labels[label] = {
                "exact_statistics_dictionary_equality": True,
                "far_endpoint_direct": candidate["far_endpoint_direct"],
                "terms": candidate["statistics"]["terms"],
            }
        exact_replays.append({"cell": list(cell), "labels": labels})

    payload = {
        "schema": "rank8-low-low-a23-interior-axis-label-shard-v2-probe-audit-v1",
        "status": "PASS_EXACT_A23_INTERIOR_AXIS_LABEL_SHARD_V2_PROBE_AUDIT",
        "coverage": {
            "sealed_axis_cells": len(CELLS),
            "label_replays": len(CELLS) * len(LABELS),
            "direct_far_replays": len(CELLS) * len(FAR),
            "nonzero_left_axis": True,
            "nonzero_right_axis": True,
            "zero_boundary_axes": True,
        },
        "exact_replays": exact_replays,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("LABEL_REPLAYS", payload["coverage"]["label_replays"])
    print("DIRECT_FAR_REPLAYS", payload["coverage"]["direct_far_replays"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
