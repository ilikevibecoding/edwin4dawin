#!/usr/bin/env python3
"""Fail-closed gate for all-long e=2 Delta2/3 leaf-root values."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = "rank8_delta23_e2_all_long_leaf_root_value_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta23_e2_all_long_leaf_root_value_independent_audit_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_leaf_root_value_gate_exact_agent_20260825.json"
EXPECTED = {
    "prove_rank8_delta23_e2_all_long_leaf_root_value_agent_20260825.py":
        "61C407C7C94B2CB5CAE7E7E0F886B9C16FC82AF6F6701596AC4799D97424712F",
    PRODUCER_REPORT:
        "3E35AE742BBFEEE39D17DA7AAE2E3DA53B611220CCDC5FE9D950A129687EA5F5",
    "audit_rank8_delta23_e2_all_long_leaf_root_value_agent_20260825.py":
        "194DC2F0B2FEC0EDAE7E34B73E2F32F0E8B83AEFD5E75954D4079D2E21E95F7D",
    AUDIT_REPORT:
        "0CA7726FBFE149BDA2AAE9D4E7CAC5308BBB1B7EDFDA2ACCC6A71FFB9E87104D",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
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
            == "PASS_EXACT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE",
        "audit_status": audit["status"]
            == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE",
        "audit_pins_producer": audit["certificate_sha256"] == EXPECTED[PRODUCER_REPORT],
        "ranks_exactly_delta2_delta3": [case["rank"] for case in producer["cases"]] == [2, 3],
        "four_literal_leaf_orbits": producer["coverage_totals"]["literal_leaf_orbits"]
            == audit["coverage_totals"]["literal_leaf_orbits"] == 4,
        "two_rank_cells": producer["coverage_totals"]["rank_cells"]
            == audit["coverage_totals"]["rank_cells"] == 2,
        "pair_compression_exact": producer["coverage_totals"]["pair_compression_identities"] == 34,
        "profile_translation_exact": producer["coverage_totals"]["profile_translation_identities"]
            == audit["coverage_totals"]["exact_symbolic_profile_identities"] == 11,
        "literal_profile_comparisons_exact": audit["coverage_totals"]["literal_profile_comparisons"] == 672,
        "all_ordered_samples_replayed": audit["coverage_totals"]["ordered_samples_replayed"] == 55,
        "all_ordered_newton_replayed": audit["coverage_totals"]["ordered_newton_coefficients_replayed"] == 55,
        "all_ordered_power_replayed": audit["coverage_totals"]["ordered_power_coefficients_replayed"] == 55,
        "zero_digest_mismatch": audit["coverage_totals"]["digest_mismatches"] == 0,
        "zero_negative_coefficients": producer["coverage_totals"]["negative_newton_coefficients"]
            == audit["coverage_totals"]["negative_coefficients"] == 0,
        "strictly_positive_origins": producer["coverage_totals"]["all_origins_strictly_positive"] is True,
    }
    assert all(obligations.values()), obligations

    expected_cases = {
        2: {
            "entries": 28,
            "actual_degree": 26,
            "positive": 27,
            "zero": 1,
            "origin": "957538257268661710124672000",
            "sample": "F1130DB2AEBA493F908D1F3B9E2543B37BFB8445D724975B27A304863DB0EFE7",
            "newton": "EEA7C9120B66E4B59FC9C8B3375079DC38EDCD97E412A6C58A044D20AFF5D704",
            "power": "339C2C3755C0CD19D0A30FF0F4E8C1CCA952DAAD3560E884E7C380EB53B1516B",
        },
        3: {
            "entries": 27,
            "actual_degree": 25,
            "positive": 26,
            "zero": 1,
            "origin": "572576372299443394836720640",
            "sample": "A3ABA4C73441BF436A780DFB11C2D5F71A7EEDC3AB6EE788F818E3D3ABD99292",
            "newton": "9D182A824697729FD6E6FF4EF58403E971E9F28925C9548B2E46E15F9DA99533",
            "power": "DF62DD4A4BDDC388A361DC9EE742EADA3D197987D4E1AE6770E13F4D5C18FB72",
        },
    }
    cases = []
    for case in producer["cases"]:
        rank = case["rank"]
        expected = expected_cases[rank]
        assert case["coordinate"] == "T=n-37"
        assert case["entries"] == expected["entries"]
        assert case["actual_degree"] == expected["actual_degree"]
        assert case["sample_values"]["ordered_sha256"] == expected["sample"]
        assert case["newton_coefficients"]["positive"] == expected["positive"]
        assert case["newton_coefficients"]["zero"] == expected["zero"]
        assert case["newton_coefficients"]["negative"] == 0
        assert case["newton_coefficients"]["origin"] == expected["origin"]
        assert case["newton_coefficients"]["ordered_sha256"] == expected["newton"]
        assert case["power_coefficients"]["ordered_sha256"] == expected["power"]
        audit_case = next(row for row in audit["ordered_literal_replay"] if row["rank"] == rank)
        assert audit_case["sample_values"]["ordered_sha256"] == expected["sample"]
        assert audit_case["newton_coefficients"]["ordered_sha256"] == expected["newton"]
        assert audit_case["power_coefficients"]["ordered_sha256"] == expected["power"]
        assert audit_case["digest_match"] is True
        cases.append(
            {
                "rank": rank,
                "entries": expected["entries"],
                "actual_degree": expected["actual_degree"],
                "positive_newton": expected["positive"],
                "zero_newton": expected["zero"],
                "negative_newton": 0,
                "origin": expected["origin"],
                "ordered_sample_sha256": expected["sample"],
                "ordered_newton_sha256": expected["newton"],
                "ordered_power_sha256": expected["power"],
                "literal_replay_match": True,
            }
        )

    payload = {
        "schema": "rank8-delta23-e2-all-long-leaf-root-value-gate-v1",
        "status": "SEALED_EXACT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE_ONLY",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": {
            "source_class": "e=2 double-claw trees with all four pendant arms >=7 and branch bridge >=8",
            "root": "any of the four degree-1 pendant leaves",
            "ranks": [2, 3],
            "orders": "n=37+T for every integer T>=0",
            "conclusion": "strict positivity of the rooted rank-eight residual VALUE",
        },
        "proof_chain": [
            "producer proves exact ordinary and leaf-deleted path-pair compression identities",
            "producer proves the c0..c8,h6,h7 profile equals one T=n-37 ray",
            "all exact Delta2/Delta3 Newton coefficients are nonnegative with positive origins",
            "independent audit rederives all eleven identities in original A,B,C,D,G coordinates",
            "literal adjacency-list DP checks 672 profiles over all four leaf orbits",
            "literal replay matches all ordered sample, Newton, and power coefficient digests",
        ],
        "profile_power_sha256": producer["translation_identity"]["reference_profile_power_sha256"],
        "cases": cases,
        "coverage": {
            "root_families": 1,
            "literal_leaf_orbits": 4,
            "rank_cells": 2,
            "pair_compression_identities": 34,
            "profile_translation_identities": 11,
            "literal_profile_comparisons": 672,
            "ordered_samples": 55,
            "ordered_newton_coefficients": 55,
            "ordered_power_coefficients": 55,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "fail_closed_exclusions": [
            "no leaf-extension increment or inserted-new-leaf value",
            "no short source arm or bridge outside the stated all-long class",
            "no complete e=2 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("literal_leaf_orbits", payload["coverage"]["literal_leaf_orbits"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
