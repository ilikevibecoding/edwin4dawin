#!/usr/bin/env python3
"""Fail-closed gate for the Delta2/3 all-long e=2 branch-root value cell."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json"
PRODUCER_REPORT = "rank8_delta23_e2_all_long_branch_root_value_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta23_e2_all_long_branch_root_value_independent_audit_agent_20260825.json"
EXPECTED = {
    "prove_rank8_delta23_e2_all_long_branch_root_value_agent_20260825.py":
        "DD99C567F24BC7970EDABE1FBF335FC639E18BE742C39848D75A2C699C377E58",
    PRODUCER_REPORT:
        "1AECB3C08F2C4BDCE12F3AB3151AB32F00024D15F3168134C01645A5C94CB3A5",
    "audit_rank8_delta23_e2_all_long_branch_root_value_agent_20260825.py":
        "BB2F383DC750EAE39CBE03E4971B207EC99591225E588A75CA5E9ABAB77B9F09",
    AUDIT_REPORT:
        "A2A5EC7ADFEF84CA81EB58CBE064A4589745CCF5FB55BA87CCE26A97E2F1E274",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta2_e2_branch_symmetric_long_exact_20260820.json":
        "82A55E610EB145FF453FE164AD1452C99C61B5B2C71B4D8EB9C8E7BCD58BFFDD",
    "rank8_delta3_e2_branch_symmetric_long_exact_20260820.json":
        "189DDE9C64CF1A8A24F5DB6BDEA82F7C37CE853C6FEEF2C900D12752C5271913",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    producer = load(PRODUCER_REPORT)
    audit = load(AUDIT_REPORT)

    obligations = {
        "producer_status_exact": producer["status"]
            == "PASS_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE",
        "audit_status_exact": audit["status"]
            == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE",
        "audit_pins_producer_report": audit["certificate_sha256"]
            == EXPECTED[PRODUCER_REPORT],
        "ranks_exactly_delta2_delta3": [case["rank"] for case in producer["cases"]]
            == [2, 3],
        "ordered_count_exact": producer["coverage_totals"]["ordered_newton_coefficients"]
            == 41635,
        "all_newton_coefficients_nonnegative": producer["coverage_totals"]["negative_newton_coefficients"]
            == 0,
        "all_origins_strictly_positive": producer["coverage_totals"]["all_origins_strictly_positive"]
            is True,
        "literal_profiles_exact": audit["coverage_totals"]["unique_literal_adjacency_profiles"]
            == 21952,
        "literal_dp_runs_exact": audit["coverage_totals"]["literal_forest_dp_runs"]
            == 43904,
        "all_ordered_values_replayed": audit["coverage_totals"]["ordered_sample_values_replayed"]
            == 41635,
        "all_ordered_coefficients_replayed": audit["coverage_totals"]["ordered_newton_coefficients_replayed"]
            == 41635,
        "no_digest_mismatch": audit["coverage_totals"]["digest_mismatches"] == 0,
        "independent_pair_sum_identity": audit["pair_sum_symbolic_rederivation"]["all_exact_zero_differences"]
            is True,
        "both_literal_branches_by_relabeling": producer["coverage_totals"]["literal_branch_vertices_covered_by_relabeling"]
            == 2,
    }
    assert all(obligations.values()), obligations

    expected_case_data = {
        2: {
            "shape": [28, 28, 28],
            "positive": 3654,
            "zero": 18298,
            "digest": "A56B5610A497B3428805844E9EA267CDDED15319FB11AD2651F4DCA204DED7D1",
            "origin": "1030314348377467650729780480",
        },
        3: {
            "shape": [27, 27, 27],
            "positive": 3276,
            "zero": 16407,
            "digest": "F8337D2A379E6FE2575C8F7EBDAC2424A3BA42482981BBE140C25323AE128FDC",
            "origin": "610786420221289528579318400",
        },
    }
    cases = []
    for case in producer["cases"]:
        rank = case["rank"]
        expected = expected_case_data[rank]
        coefficients = case["newton_coefficients"]
        assert case["grid_shape"] == expected["shape"]
        assert coefficients["positive"] == expected["positive"]
        assert coefficients["zero"] == expected["zero"]
        assert coefficients["negative"] == 0
        assert coefficients["ordered_sha256"] == expected["digest"]
        assert coefficients["origin"] == expected["origin"]
        assert coefficients["first_negative"] is None
        audit_case = next(row for row in audit["literal_tensor_replay"] if row["rank"] == rank)
        assert audit_case["literal_newton_coefficients"] == coefficients
        cases.append(
            {
                "rank": rank,
                "grid_shape": expected["shape"],
                "newton_coefficients": coefficients["entries"],
                "positive": expected["positive"],
                "zero": expected["zero"],
                "negative": 0,
                "origin": expected["origin"],
                "ordered_newton_sha256": expected["digest"],
                "literal_replay_match": True,
            }
        )

    payload = {
        "schema": "rank8-delta23-e2-all-long-branch-root-value-gate-v1",
        "status": "SEALED_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_ONLY",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": {
            "source_class": "e=2 double-claw trees",
            "length_parameterization": "(A+7,B+7,G+8,C+7,D+7) with A,B,C,D,G>=0",
            "root_placement": "either degree-3 branch vertex",
            "ranks": [2, 3],
            "orders": "n=37+A+B+C+D+G (therefore n>=37)",
            "conclusion": "the rank-eight rooted residual values Delta2 and Delta3 are strictly positive",
        },
        "proof_chain": [
            "two-arm states through grade eight depend exactly on the arm-offset sum",
            "the producer reconstructs the residual on the full (SL,SR,G) degree grid",
            "all Newton coefficients are nonnegative and the origin coefficient is positive",
            "a separate adjacency-list include/exclude DP replays every ordered value and coefficient digest",
            "right-branch roots follow by literal side reversal",
        ],
        "cases": cases,
        "coverage": {
            "rank_cells": 2,
            "root_orbits": 1,
            "literal_root_vertices_per_tree": 2,
            "ordered_values": 41635,
            "ordered_newton_coefficients": 41635,
            "literal_profiles": 21952,
            "literal_forest_dp_runs": 43904,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "fail_closed_exclusions": [
            "not an arbitrary-leaf increment gate",
            "not an inserted-new-leaf gate",
            "not a bridge-interior, pendant-interior, or leaf-root gate",
            "not any arm<7 or bridge<8 boundary",
            "not the complete e=2 rooted layer",
            "not the complete e=2 arbitrary-leaf layer",
            "not connected Q8, forest Q8, rank-eight PGC, or Problem 993",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("rank_cells", payload["coverage"]["rank_cells"], flush=True)
    print("ordered_coefficients", payload["coverage"]["ordered_newton_coefficients"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
