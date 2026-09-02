#!/usr/bin/env python3
"""Fail-closed gate for all-long e=2 deep degree-2 rooted values."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = "rank8_delta23_e2_all_long_deep_degree2_root_value_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta23_e2_all_long_deep_degree2_root_value_independent_audit_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json"
EXPECTED = {
    "prove_rank8_delta23_e2_all_long_deep_degree2_root_value_agent_20260825.py":
        "6F28332C5B3B358BCBADAEF6E6772C5F8D51574B71157988139FCC462843D75F",
    PRODUCER_REPORT:
        "04C1CF61D334CBA6FD4999CE75FF9B5D54DD90C3EB6CEBEA8C78577C16E29D26",
    "audit_rank8_delta23_e2_all_long_deep_degree2_root_value_agent_20260825.py":
        "88A6627902AB566E5CC741A780139D86381D771BB0784F6798E5D0BC8441610D",
    AUDIT_REPORT:
        "61A7104F92E5CDECAFED12381E57FC472A873DDE12795E54ACFDE33C77909920",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta2_e2_bridge_interior_symmetric_long_exact_20260820.json":
        "82D505176D8CB949C2C93B9F9124470F7816B89EF0C35C7B438D494581DA1ABB",
    "rank8_delta3_e2_bridge_interior_symmetric_long_exact_20260820.json":
        "BE38D03793225600A374592CCB11AD529EAB7443E5C599231834C531DF336E93",
    "rank8_delta2_e2_pendant_symmetric_long_exact_20260820.json":
        "F53798E4748FA70D769BABA8AE4DD21A2D16BE8D2ADEF49E8D33F30F0247DE11",
    "rank8_delta3_e2_pendant_symmetric_long_exact_20260820.json":
        "E3DA855160CC5A4CEA00D6219C4C01CA466CD3E085BC62690A08D4E5D55BBE59",
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
        "producer_status": producer["status"]
            == "PASS_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE",
        "audit_status": audit["status"]
            == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE",
        "audit_pins_producer": audit["certificate_sha256"] == EXPECTED[PRODUCER_REPORT],
        "ranks_exactly_delta2_delta3": [case["rank"] for case in producer["cases"]]
            == [2, 3],
        "two_root_families": producer["coverage_totals"]["root_families"] == 2,
        "five_literal_path_orbits": producer["coverage_totals"]["literal_path_orbits"] == 5,
        "four_rank_cells": producer["coverage_totals"]["rank_cells"] == 4,
        "profile_translation_exact": producer["coverage_totals"]["exact_profile_translation_identities"]
            == audit["coverage_totals"]["exact_symbolic_profile_identities"]
            == 22,
        "literal_profile_comparisons_exact": audit["coverage_totals"]["literal_profile_comparisons"]
            == 980,
        "all_ordered_samples_replayed": audit["coverage_totals"]["ordered_samples_replayed"]
            == 55,
        "all_ordered_newton_replayed": audit["coverage_totals"]["ordered_newton_coefficients_replayed"]
            == 55,
        "all_ordered_power_replayed": audit["coverage_totals"]["ordered_power_coefficients_replayed"]
            == 55,
        "zero_digest_mismatch": audit["coverage_totals"]["digest_mismatches"] == 0,
        "zero_negative_coefficients": producer["coverage_totals"]["negative_newton_coefficients"]
            == audit["coverage_totals"]["negative_coefficients"]
            == 0,
        "strictly_positive_origins": producer["coverage_totals"]["all_origins_strictly_positive"]
            is True,
    }
    assert all(obligations.values()), obligations

    expected_cases = {
        2: {
            "entries": 28,
            "actual_degree": 26,
            "positive": 27,
            "zero": 1,
            "origin": "537643174690673426752170669168",
            "newton": "AF7B435173B09E737589D673F22ABF6D0A9408F952ABC8B2E974CDF17D4F61CD",
            "power": "8153A2A9EEE5A58C302D04CE47CA6F8B3C6E8ACDCDFC8D269A6B81EC83230DE5",
        },
        3: {
            "entries": 27,
            "actual_degree": 25,
            "positive": 26,
            "zero": 1,
            "origin": "237219183357050251226988091100",
            "newton": "19C84F2EC3FB2770D0A1B463F94A74C452A2F906C85056BBC8A45119E3864856",
            "power": "F2A74D5228F28456FAF3C5E58C56ABFA175DD9347B1A380BC36B92A5CCB8E002",
        },
    }
    cases = []
    for case in producer["cases"]:
        rank = case["rank"]
        expected = expected_cases[rank]
        assert case["entries"] == expected["entries"]
        assert case["actual_degree"] == expected["actual_degree"]
        assert case["newton_coefficients"]["positive"] == expected["positive"]
        assert case["newton_coefficients"]["zero"] == expected["zero"]
        assert case["newton_coefficients"]["negative"] == 0
        assert case["newton_coefficients"]["origin"] == expected["origin"]
        assert case["newton_coefficients"]["ordered_sha256"] == expected["newton"]
        assert case["power_coefficients"]["ordered_sha256"] == expected["power"]
        audit_case = next(row for row in audit["ordered_literal_replay"] if row["rank"] == rank)
        assert audit_case["literal_newton"] == case["newton_coefficients"]
        assert audit_case["literal_power"] == case["power_coefficients"]
        cases.append(
            {
                "rank": rank,
                "entries": expected["entries"],
                "actual_degree": expected["actual_degree"],
                "positive_newton": expected["positive"],
                "zero_newton": expected["zero"],
                "negative_newton": 0,
                "origin": expected["origin"],
                "ordered_newton_sha256": expected["newton"],
                "ordered_power_sha256": expected["power"],
                "literal_replay_match": True,
            }
        )

    payload = {
        "schema": "rank8-delta23-e2-all-long-deep-degree2-root-value-gate-v1",
        "status": "SEALED_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_ONLY",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": {
            "source_class": "e=2 double-claw trees with all four pendant arms >=7",
            "deep_bridge": "root on the branch bridge, at edge-distance >=8 from both degree-3 branches (bridge=N+M+16)",
            "deep_pendant": "root on any pendant arm, at edge-distance >=8 from its degree-3 branch and >=7 from its leaf (selected arm=N+U+15)",
            "other_lengths": "unselected pendant arms >=7 and, for a pendant root, branch bridge >=8",
            "root_orbits": "one bridge path plus four pendant arms",
            "ranks": [2, 3],
            "orders": "n=45+T for every integer T>=0",
            "conclusion": "strict positivity of the rooted rank-eight residual value",
        },
        "proof_chain": [
            "producer proves bridge and pendant c0..c8,h6,h7 profiles equal one univariate T=n-45 profile",
            "all exact Delta2/Delta3 Newton coefficients are nonnegative with positive origins",
            "independent audit rederives all 22 identities in the original six offsets",
            "literal adjacency-list DP checks 980 translated profiles over the bridge and four pendant arm orbits",
            "literal replay matches all ordered sample, Newton, and power coefficient digests",
        ],
        "profile_power_sha256": producer["translation_identity"]["reference_profile_power_sha256"],
        "cases": cases,
        "coverage": {
            "root_families": 2,
            "literal_path_orbits": 5,
            "rank_cells": 4,
            "profile_identities": 22,
            "literal_profile_comparisons": 980,
            "ordered_samples": 55,
            "ordered_newton_coefficients": 55,
            "ordered_power_coefficients": 55,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "fail_closed_exclusions": [
            "no root within seven bridge edges of a branch",
            "no pendant root within seven edges of its branch or within six edges of its leaf",
            "no leaf root",
            "no branch root beyond the separately sealed branch package",
            "no leaf-extension increment or inserted-new-leaf value",
            "no full all-long all-root theorem yet",
            "no complete e=2 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("root_families", payload["coverage"]["root_families"], flush=True)
    print("literal_path_orbits", payload["coverage"]["literal_path_orbits"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
