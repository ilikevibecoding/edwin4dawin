#!/usr/bin/env python3
"""Assemble and audit the exact cutoff-25 Delta4--Delta6 certificates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    inventory_path = ROOT / "rank7_middle_cutoff25_ranks4_6_inventory_20260820.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    assert inventory["status"] == "EXACT_ENDPOINT_INVENTORY_WITH_NO_GOS"
    assert inventory["cutoff"] == 25
    assert inventory["ranks"] == [4, 5, 6]
    branches = inventory["branches"]
    assert len(branches) == 48
    passes = [row for row in branches if row["status"] == "PASS"]
    no_gos = [row for row in branches if row["status"] != "PASS"]
    assert len(passes) == 47
    assert len(no_gos) == 1
    no_go = no_gos[0]
    assert no_go["rank"] == 4
    assert no_go["bits_vzsd"] == [0, 0, 1, 0]
    assert no_go["status"] == "BERNSTEIN_NO_GO"
    for row in branches:
        assert sha(ROOT / row["log"]) == row["sha256"]

    root_log = ROOT / "rank7_root_z_concavity_cutoff25_exact_20260820.log"
    d5_log = ROOT / "rank7_d5_concavity_ranks4_6_replay_20260820.log"
    capacity_log = ROOT / "rank7_delta4_capacity_cutoff25_exact_20260820.log"
    assert "PASS_ROOT_Z_CONCAVITY_CUTOFF 25" in root_log.read_text(encoding="utf-8")
    assert "RANK7_MIDDLE_D5_CONCAVITY_PASS" in d5_log.read_text(encoding="utf-8")
    capacity_text = capacity_log.read_text(encoding="utf-8")
    assert "RANK7_TERMINAL_BROOM_DELTA4_CAPACITY_EDGE_PASS" in capacity_text
    assert "PASS_DELTA4_CAPACITY_CUTOFF_PROBE 25" in capacity_text
    assert "numerator (44, 20, 9, 8, 2) 255150 0" in capacity_text

    artifacts = [
        inventory_path,
        ROOT / "run_rank7_middle_cutoff_batch.py",
        ROOT / "probe_rank7_terminal_broom_middle_cutoff.py",
        root_log,
        ROOT / "probe_rank7_terminal_broom_root_z_concavity_cutoff.py",
        d5_log,
        ROOT / "verify_rank7_terminal_broom_d5_concavity.py",
        capacity_log,
        ROOT / "probe_rank7_terminal_broom_delta4_capacity_cutoff.py",
        ROOT / "prove_rank7_terminal_broom_delta4_capacity_edge.py",
    ]
    report = {
        "schema": "rank7-terminal-broom-delta456-cutoff25-v1",
        "status": "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA456_N_AT_LEAST_25",
        "cutoff": 25,
        "endpoint_inventory": {
            "branches": 48,
            "passing_rectangular_branches": 47,
            "single_loose_box_no_go": {
                "rank": 4,
                "bits_vzsd": [0, 0, 1, 0],
                "meaning": "s=1,d=1/2 is impossible; repaired by the exact root-capacity edge",
            },
        },
        "capacity_repair": {
            "tensor_degrees": [44, 20, 9, 8, 2],
            "coefficients": 255150,
            "minimum": 0,
        },
        "conclusion": "Delta4, Delta5, and Delta6 are nonnegative for every rooted tree core of order at least 25",
        "artifacts_sha256": {path.name: sha(path) for path in artifacts},
    }
    output = ROOT / "rank7_terminal_broom_delta456_cutoff25_exact_20260820.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", output.name, sha(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
