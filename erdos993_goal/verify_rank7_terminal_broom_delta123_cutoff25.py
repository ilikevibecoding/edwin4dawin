#!/usr/bin/env python3
"""Assemble the exact cutoff-25 Delta1--Delta3 certificates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    low_path = ROOT / "rank7_delta012_cutoff25_inventory_20260820.json"
    low = json.loads(low_path.read_text(encoding="utf-8"))
    assert low["cutoff"] == 25
    assert low["branch_count"] == 24
    assert low["status"] == "INCOMPLETE"
    assert low["passed"] == 22
    rank12 = [row for row in low["branches"] if row["rank"] in (1, 2)]
    assert len(rank12) == 16
    assert all(row["status"] == "PASS" for row in rank12)
    rank0_no_gos = [
        row for row in low["branches"] if row["rank"] == 0 and row["status"] != "PASS"
    ]
    assert {
        (row["case"], row["q_endpoint"], row["d_endpoint"])
        for row in rank0_no_gos
    } == {("small", 0, 1), ("large", 0, 1)}
    for row in low["branches"]:
        assert sha(ROOT / row["log"]) == row["sha256"].upper()

    delta3_path = ROOT / "rank7_delta3_full_d5_cutoff25_exact_20260820.json"
    delta3 = json.loads(delta3_path.read_text(encoding="utf-8"))
    assert delta3["cutoff"] == 25
    assert delta3["status"] == "INCOMPLETE"
    assert delta3["passed"] == 7
    assert len(delta3["branches"]) == 8
    delta3_no_gos = [row for row in delta3["branches"] if row["status"] != "PASS"]
    assert len(delta3_no_gos) == 1
    assert (
        delta3_no_gos[0]["z"],
        delta3_no_gos[0]["s"],
        delta3_no_gos[0]["d"],
    ) == (0, 1, 0)
    for row in delta3["branches"]:
        assert sha(ROOT / row["log"]) == row["sha256"].upper()

    root_log = ROOT / "rank7_root_z_concavity_cutoff25_exact_20260820.log"
    assert "PASS_ROOT_Z_CONCAVITY_CUTOFF 25" in root_log.read_text(encoding="utf-8")
    capacity_log = ROOT / "rank7_delta3_capacity_full_d5_cutoff25_exact_20260820.log"
    capacity_text = capacity_log.read_text(encoding="utf-8")
    assert "full_D5 retained" in capacity_text
    assert "PASS_DELTA3_CAPACITY_FULL_D5_CUTOFF 25" in capacity_text
    assert "numerator (40, 19, 9, 8, 5, 2) 1328400 0" in capacity_text

    artifacts = [
        low_path,
        ROOT / "run_rank7_delta012_cutoff_batch.py",
        ROOT / "probe_rank7_terminal_broom_delta012_cutoff.py",
        ROOT / "prove_rank7_terminal_broom_delta0_large.py",
        delta3_path,
        ROOT / "run_rank7_delta3_full_d5_cutoff_batch.py",
        ROOT / "probe_rank7_terminal_broom_delta3_full_d5_cutoff.py",
        capacity_log,
        ROOT / "probe_rank7_delta3_capacity_full_d5_cutoff.py",
        root_log,
        ROOT / "probe_rank7_terminal_broom_root_z_concavity_cutoff.py",
    ]
    report = {
        "schema": "rank7-terminal-broom-delta123-cutoff25-v1",
        "status": "PASS_EXACT_RANK7_DELTA3_AND_CONDITIONAL_DELTA12_N_AT_LEAST_25",
        "cutoff": 25,
        "delta1_delta2": {
            "branches": 16,
            "passing": 16,
            "dependency": "the lower h6 endpoint is d=s-D6/2 and therefore requires rooted C7; this is unconditional from n>=39 and on the separately certified middle-band C7 cells, but not yet on every rooted core of orders 25..38",
            "note": "the two rank-zero loose-box failures are outside this theorem and remain explicitly recorded",
        },
        "delta3": {
            "rectangular_branches": 8,
            "passing_rectangular_branches": 7,
            "single_loose_box_no_go": "lower D6, s=1, d=1/2",
            "capacity_repair": {
                "full_D5_retained": True,
                "tensor_degrees": [40, 19, 9, 8, 5, 2],
                "coefficients": 1328400,
                "minimum": 0,
            },
        },
        "conclusion": "Delta3 is nonnegative for every rooted tree core of order at least 25; Delta1 and Delta2 have complete exact endpoint certificates conditional on rooted C7 in the middle band, and are unconditional from order 39",
        "artifacts_sha256": {path.name: sha(path) for path in artifacts},
    }
    output = ROOT / "rank7_terminal_broom_delta123_cutoff25_exact_20260820.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", output.name, sha(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
