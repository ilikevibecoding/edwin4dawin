#!/usr/bin/env python3
"""Assemble the no-gap k=1 lower-cross Delta2 proof for orders 28..34."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_lcross_k1_orders28_34_all_trees_assembled_root_20260826.json"
FILES = {
    "n28": "rank8_delta2_n28_lcross_k1_positive_surplus_assembled_root_20260826.json",
    "low": "rank8_delta2_orders29_34_surplus1_5_strong_q5_exact_root_20260826.json",
    "low_audit": "rank8_delta2_orders29_34_surplus1_5_strong_q5_independent_audit_root_20260826.json",
    "e6plus": "rank8_delta2_lcross_k1_finite_orders29_34_assembled_root_20260826.json",
    "path": "rank8_delta2_path_forcing_and_face_exact_20260820.json",
    "path_audit": "rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json",
    "strong_q5": "rank5_strong_q5_through34_theorem_exact_root_20260826.json",
    "tau": "tree_tau_branch_weight_upper_exact_root_20260826.json",
    "tau_audit": "tree_tau_branch_weight_upper_independent_audit_root_20260826.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> int:
    reports = {key: load(name) for key, name in FILES.items()}
    assert reports["n28"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_N28_LCROSS_K1_ALL_POSITIVE_SURPLUS_AND_STAR"
    assert reports["n28"]["coverage"]["realizable_positive_nonstar_surplus_count"] == 207
    assert reports["n28"]["coverage"]["missing_realizable_positive_surpluses"] == []
    assert reports["low"]["status"] == "PASS_EXACT_RANK8_DELTA2_ORDERS29_TO34_SURPLUS1_TO5_STRONG_Q5"
    assert reports["low"]["coverage"]["cells"] == 30
    assert reports["low_audit"]["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_ORDERS29_TO34_SURPLUS1_TO5_STRONG_Q5_AUDIT"
    assert reports["low_audit"]["coverage"]["cells"] == 30
    assert reports["low_audit"]["coverage"]["negative_coefficients"] == 0
    assert reports["e6plus"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_FINITE_ORDERS_29_TO_34"
    assert reports["e6plus"]["coverage"]["missing_orders"] == []
    assert reports["e6plus"]["coverage"]["missing_nonstar_surplus_values"] == []
    assert reports["path"]["status"] == "PASS_EXACT_RANK8_DELTA2_PATH_FACE_AND_DEGREE_SURPLUS_SPLIT"
    assert reports["path_audit"]["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_PATH_FACE"
    assert "every rooted path core P_n, n>=23" in reports["path"]["scope"]
    assert reports["strong_q5"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK5_STRONG_Q5_FOR_EVERY_TREE_ORDER_11_THROUGH_34"
    assert reports["tau"]["status"] == "PASS_EXACT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE"
    assert reports["tau_audit"]["status"] == "PASS_INDEPENDENT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE_AUDIT"

    primary_pairs = {
        (row["order"], row["degree_surplus"])
        for row in reports["low"]["cells"]
    }
    audit_pairs = {
        (row["order"], row["degree_surplus"])
        for row in reports["low_audit"]["cells"]
    }
    expected_low_pairs = {(order, excess) for order in range(29, 35) for excess in range(1, 6)}
    assert primary_pairs == audit_pairs == expected_low_pairs

    payload = {
        "schema": "rank8-delta2-lcross-k1-orders28-34-all-trees-assembled-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_ALL_TREES_ORDERS28_TO34",
        "theorem": (
            "For every rooted tree of order 28 through 34, the k=1 "
            "lower-cross rank-eight terminal Delta2 source is nonnegative."
        ),
        "no_gap_partition": [
            {
                "orders": "28..34",
                "family": "degree surplus 0",
                "evidence": "the exact independently audited rooted-path theorem (valid from order 23)",
            },
            {
                "orders": "28",
                "family": "every positive nonstar surplus and the star",
                "evidence": "207 exact realizable-surplus cells, the exact impossibility gaps, and both star root orbits",
            },
            {
                "orders": "29..34",
                "family": "degree surplus 1..5",
                "evidence": "30 exact strong-Q5 cells independently reconstructed coefficient-for-coefficient",
            },
            {
                "orders": "29..34",
                "family": "every nonstar degree surplus at least 6 and the star",
                "evidence": "12 exact continuous finite-order cells plus 12 star root orbits, independently audited",
            },
        ],
        "coverage": {
            "orders": [28, 34],
            "tree_families": "all rooted trees",
            "missing_orders": [],
            "missing_degree_surplus_families": [],
            "new_low_surplus_cells": 30,
            "independently_reproduced_low_surplus_coefficients": 30 * 8775,
        },
        "artifacts": {name: sha256(HERE / name) for name in FILES.values()},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is one of four live Delta2 tensor paths. Orders n>=35 and "
            "the other three paths are assembled separately."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
