#!/usr/bin/env python3
"""Assemble the independently audited n=28 k=1 lower-cross e>=6 layer."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_n28_lcross_k1_e6plus_assembled_root_20260826.json"

FILES = {
    "census": "rank8_delta2_e6_n28_census_exact_root_20260826.json",
    "census_audit": "rank8_delta2_e6_n28_census_independent_audit_root_20260826.json",
    "census_gate": "rank8_delta2_e6_n28_census_agreement_gate_root_20260826.json",
    "low": "rank8_delta2_n28_low_surplus_strong_q5_exact_root_20260826.json",
    "high": "rank8_delta2_n28_high_surplus_strong_q5_exact_root_20260826.json",
    "surplus_audit": "rank8_delta2_n28_strong_q5_surplus_independent_audit_root_20260826.json",
    "strong_q5": "rank5_strong_q5_through28_theorem_exact_root_20260826.json",
    "strong_q5_small_audit": "rank5_strong_q5_base_small_grid_independent_audit_root_20260826.json",
    "strong_q5_large_audit": "rank5_ratio_payment_through28_large_core_grid_independent_audit_root_20260826.json",
    "tau": "tree_tau_branch_weight_upper_exact_root_20260826.json",
    "tau_audit": "tree_tau_branch_weight_upper_independent_audit_root_20260826.json",
    "stars": "rank8_delta2_stars_n28_n34_exact_root_20260826.json",
    "stars_audit": "rank8_delta2_stars_n28_n34_independent_audit_root_20260826.json",
    "sparse_source": "rank8_delta2_lcross_k1_source_sparse_root_20260826.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> int:
    reports = {key: load(name) for key, name in FILES.items() if key != "sparse_source"}
    assert reports["census"]["status"] == "PASS_EXACT_RANK8_DELTA2_E6_N28_ALL_ROOTED_TREES"
    assert reports["census_audit"]["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_E6_N28_ALL_ROOTED_AUDIT"
    assert reports["census_gate"]["status"] == "PASS_EXACT_INDEPENDENT_RANK8_DELTA2_E6_N28_CENSUS_AGREEMENT"
    assert reports["census_gate"]["agreement"]["rooted_evaluations"] == 178_134_404
    assert int(reports["census"]["global_minimum"]["delta2"]) > 0

    assert reports["low"]["status"] == "PASS_EXACT_RANK8_DELTA2_N28_SURPLUS_7_TO_39_STRONG_Q5"
    assert reports["high"]["status"] == "PASS_EXACT_RANK8_DELTA2_N28_ALL_REALIZABLE_NONSTAR_SURPLUS_40_TO_300_STRONG_Q5"
    assert reports["surplus_audit"]["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_N28_STRONG_Q5_SURPLUS_7_TO_300_AUDIT"
    assert reports["surplus_audit"]["coverage"]["cells"] == 201
    assert reports["surplus_audit"]["coverage"]["negative_coefficients"] == 0

    assert reports["strong_q5"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK5_STRONG_Q5_FOR_EVERY_TREE_ORDER_11_THROUGH_28"
    assert reports["strong_q5_small_audit"]["status"] == "PASS_INDEPENDENT_RANK5_STRONG_Q5_BASE_AND_SMALL_CORE_GRID_AUDIT"
    assert reports["strong_q5_large_audit"]["status"] == "PASS_INDEPENDENT_RANK5_RATIO_PAYMENT_LARGE_CORE_GRID_AUDIT"

    assert reports["tau"]["status"] == "PASS_EXACT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE"
    assert reports["tau_audit"]["status"] == "PASS_INDEPENDENT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE_AUDIT"
    assert reports["stars"]["status"] == "PASS_EXACT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34"
    assert reports["stars_audit"]["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34_AUDIT"

    table = reports["tau"]["order28"]["table"]
    possible = sorted(int(row["e"]) for row in table)
    assert len(possible) == reports["tau"]["order28"]["possible_nonstar_degree_surpluses"] == 207
    target = [excess for excess in possible if excess >= 6]
    low_values = [int(row["degree_surplus"]) for row in reports["low"]["cells"]]
    high_values = reports["high"]["coverage"]["realizable_nonstar_surpluses"]
    assert low_values == list(range(7, 40))
    assert high_values == [excess for excess in possible if excess >= 40]
    covered = [6] + low_values + high_values
    assert covered == target and len(covered) == 202
    assert reports["high"]["coverage"]["star_surplus"] == 325
    impossible_above_300 = list(range(301, 325))
    assert all(value not in possible for value in impossible_above_300)

    sparse = load(FILES["sparse_source"])
    assert sparse["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"
    assert sparse["numerator_term_count"] == 5703

    artifacts = {name: sha256(HERE / name) for name in FILES.values()}
    payload = {
        "schema": "rank8-delta2-n28-lcross-k1-e6plus-assembled-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_N28_LCROSS_K1_E6PLUS_AND_STAR",
        "theorem": (
            "At order 28 the k=1 lower-cross Delta2 source is positive for "
            "every rooted tree of degree surplus at least 6, including the star."
        ),
        "no_gap_partition": [
            {
                "scope": "degree surplus 6",
                "evidence": "exact exhaustive census of all 178,134,404 rooted evaluations, independently reproduced",
            },
            {
                "scope": "degree surplus 7 through 39",
                "evidence": "33 exact strong-Q5/tau Bernstein cells, independently reconstructed",
            },
            {
                "scope": "every realizable degree surplus 40 through 300",
                "evidence": "168 exact integer-surplus strong-Q5/tau Bernstein cells, independently reconstructed",
            },
            {
                "scope": "integer surplus 301 through 324",
                "evidence": "impossible by the exact independently audited order-28 branch-weight table",
            },
            {
                "scope": "degree surplus 325",
                "evidence": "the unique star family, both root orbits certified and independently audited",
            },
        ],
        "coverage": {
            "order": 28,
            "realizable_nonstar_surpluses_at_least_6": target,
            "realizable_nonstar_surplus_count": len(target),
            "missing_realizable_surpluses_at_least_6": [],
            "star_surplus": 325,
            "e6_rooted_census": 178_134_404,
            "strong_q5_bernstein_cells": 201,
            "independently_reproduced_strong_q5_bernstein_coefficients": 201 * 8775,
        },
        "artifacts": artifacts,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Degree-surplus families 0 through 5 and the other three live "
            "Delta2 tensors are separate structural proof components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REALIZABLE_E6PLUS", len(target))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
