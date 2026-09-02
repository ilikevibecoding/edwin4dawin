#!/usr/bin/env python3
"""Assemble the unconditional rank-seven Delta1/Delta2 cutoff-25 theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    inventory_path = ROOT / "rank7_delta012_cutoff25_inventory_20260820.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    upper = [
        row
        for row in inventory["branches"]
        if row["rank"] in (1, 2) and row["d_endpoint"] == 1
    ]
    assert len(upper) == 8
    assert all(row["status"] == "PASS" for row in upper)
    for row in upper:
        assert sha(ROOT / row["log"]) == row["sha256"].upper()

    residual_path = ROOT / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"
    residual = json.loads(residual_path.read_text(encoding="utf-8"))
    assert residual["status"] == "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4"
    pairs = sorted(
        {
            (row["order"], row["root_degree"])
            for row in residual["residual"]["cells"]
            if 25 <= row["order"] <= 38
        }
    )
    assert all(1 <= root_degree <= 7 for _, root_degree in pairs)

    structure_path = ROOT / "rank7_delta12_complementary_capacity_structure_exact_20260820.json"
    structure = json.loads(structure_path.read_text(encoding="utf-8"))
    assert structure["status"] == "PASS_EXACT_COMPLEMENTARY_CAPACITY_AND_SWITCH_PARTITION"
    assert structure["row_count"] == 98
    assert structure["branch_intervals"] == 154

    batch_path = ROOT / "rank7_delta12_complementary_capacity_fixed_exact_20260820.json"
    batch = json.loads(batch_path.read_text(encoding="utf-8"))
    assert batch["status"] == "PASS"
    assert batch["expected_cells"] == 472
    assert batch["completed_cells"] == 472
    assert batch["passing_cells"] == 472
    prover_path = ROOT / "prove_rank7_delta12_complementary_capacity_fixed.py"
    runner_path = ROOT / "run_rank7_delta12_complementary_capacity_fixed_batch.py"
    assert sha(prover_path) == batch["source_sha256"]
    assert sha(runner_path) == batch["runner_sha256"]
    assert sha(residual_path) == batch["residual_input_sha256"]

    expected = set()
    for rank in (1, 2):
        for n, root_degree in pairs:
            branches = (
                ("containment", "extension")
                if root_degree <= 4
                else ("extension_mass",)
            )
            for branch in branches:
                for q_endpoint in (0, 1):
                    expected.add((rank, n, root_degree, branch, q_endpoint))
    actual = {
        (
            row["rank"],
            row["n"],
            row["root_degree"],
            row["branch"],
            row["q_endpoint"],
        )
        for row in batch["cells"]
    }
    assert len(actual) == len(batch["cells"]) == 472
    assert actual == expected
    assert all(row["status"] == "PASS" for row in batch["cells"])
    assert all(Fraction(row["numerator_minimum"]) >= 0 for row in batch["cells"])
    assert all(Fraction(row["denominator_minimum"]) >= 0 for row in batch["cells"])

    concavity_log = ROOT / "rank7_root_z_concavity_cutoff25_exact_20260820.log"
    assert "PASS_ROOT_Z_CONCAVITY_CUTOFF 25" in concavity_log.read_text(encoding="utf-8")

    artifacts = [
        inventory_path,
        residual_path,
        structure_path,
        ROOT / "verify_rank7_delta12_complementary_capacity_structure.py",
        batch_path,
        prover_path,
        runner_path,
        concavity_log,
        ROOT / "probe_rank7_terminal_broom_root_z_concavity_cutoff.py",
    ]
    report = {
        "schema": "rank7-terminal-broom-delta12-unconditional-cutoff25-v1",
        "status": "PASS_EXACT_RANK7_DELTA1_DELTA2_UNCONDITIONAL_N_AT_LEAST_25",
        "theorem": (
            "For every rooted tree core A of order n>=25, the rank-seven "
            "terminal-broom residual satisfies Delta1>=0 and Delta2>=0."
        ),
        "coverage_join": {
            "n_at_least_39": "the rooted-C7 large-order theorem plus the prior cutoff boxes",
            "n_25_through_38_rooted_C7_covered_complement": (
                "the rooted-C7 coverage manifest plus the prior cutoff boxes"
            ),
            "n_25_through_38_rooted_C7_residual": (
                "472 exact complementary-capacity lower-d cells, joined to "
                "the eight prior unconditional upper-d boxes"
            ),
        },
        "capacity_replacement": {
            "a": "i4(J)",
            "b": "i5(J)",
            "capacities": ["a<=c4", "5b<=(m-4)a", "b<=h5"],
            "normalized": [
                "s>=1-y",
                "d>=max(1-z*(m-4)*(1-s)/5,1-s*z)",
            ],
            "switch": "s=(m-4)/(m+1)",
            "half_retention_domain_verified": True,
        },
        "complementary_capacity_cells": {
            "expected": 472,
            "passing": 472,
            "ranks": [1, 2],
            "orders": "25..38",
            "q_endpoints_per_face": 2,
        },
        "prior_upper_d_boxes": 8,
        "scope_warning": (
            "This theorem closes Delta1 and Delta2 only.  It does not close "
            "Delta0, connected-tree Q7, or Erdos Problem 993."
        ),
        "artifacts_sha256": {path.name: sha(path) for path in artifacts},
    }
    output = ROOT / "rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", output.name, sha(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
