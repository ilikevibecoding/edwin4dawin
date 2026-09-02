#!/usr/bin/env python3
"""Exact coverage wrapper for every Delta2 e=1 arm-old-root distance."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json"
EXTENSIONS = ["root", "short", "long"]
PINNED = {
    "prove_rank8_delta2_e1_old_root_near1_complete_agent_20260825.py":
        "3791C6278E4D14A5D6BB46EA506789101DD778C644C77F0B91A94175FBF7C6E1",
    "rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json":
        "744FA3670F7573592E1C30171ED4E5BF8472B99ED2F688C8E11B9FF8EE666F9F",
    "audit_rank8_delta2_e1_old_root_near1_complete_agent_20260825.py":
        "6956D28C2653F8E34F26BC8160968F5BCD5C83D3EA040FEE3E9B79B588694ECC",
    "rank8_delta2_e1_old_root_near1_complete_independent_audit_agent_20260825.json":
        "65BB63C3B89438C5E37B37E945718E2EB6C335A76BE17EAE50AE5CAE1463DC12",
    "RANK8_DELTA2_E1_OLD_ROOT_NEAR1_COMPLETE_THEOREM_2026-08-25.md":
        "3030D275C101395881C6364E3E7BC9BDB971558DA095213E527C89EAC285903A",
    "prove_rank8_delta2_e1_old_root_near2_complete_agent_20260825.py":
        "810DFBB92AFE9E8EF438EB8C878155D8929F79CC71858144944431EAFD845F6D",
    "rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json":
        "3EA6C013BFFA1BD91DAB4471B710482AE92F3B0737C021E9280D9DF16DDD009D",
    "audit_rank8_delta2_e1_old_root_near2_complete_agent_20260825.py":
        "C0396DC46506200B57369356A5CBDE3958A921A05539C89AE8CE8B761D9E2CB5",
    "rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json":
        "68F2A137EE7BF9253F4B964C52E3E7A45D683960D3C631997A9170D549D770FE",
    "RANK8_DELTA2_E1_OLD_ROOT_NEAR2_COMPLETE_THEOREM_2026-08-25.md":
        "3DED65AFBA854E50840685CB6919F68BB943B74668FFF0BE9A5E84ABCF965D65",
    "prove_rank8_delta2_e1_old_root_remaining_finite_band_agent_20260825.py":
        "B7CF39C845A81F8B7BE07A5FC965D748F1FBC77570EDA2EF7FC87CB43D99A637",
    "rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json":
        "8C0261ECA0C07D6AA5F21C465FABA5C1D51AA38BF231EC8B758D65D17F5C38F5",
    "audit_rank8_delta2_e1_old_root_remaining_finite_band_agent_20260825.py":
        "FEA27FAE85C7CB52DA193C0E2358AEE22CD4532B17724C174F7783196A71AD50",
    "rank8_delta2_e1_old_root_remaining_finite_band_independent_audit_agent_20260825.json":
        "C6F0F2C3B697611BE6448FEDAE81A557D7020A5B7F8901F4E1F255C794811B73",
    "RANK8_DELTA2_E1_OLD_ROOT_REMAINING_FINITE_BAND_THEOREM_2026-08-25.md":
        "4BC6225DA34065EAA4BFA0570BB4FEB4056C1F61F6B6BE7092E9430D9327C0CB",
    "prove_rank8_delta2_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "2A12B84716FB01C36423B383C4A93F12C4F900346420F4A4BD0C8EA965F6E633",
    "rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json":
        "D384FCC3B463CF9158CC0AC3912F88028D5968BEB664DDE5AAD2F9B772451D5F",
    "audit_rank8_delta2_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "240F3F03F61EE5957768A47611A64F6A0A900882C05FDE45DC3E8B1612084517",
    "rank8_delta2_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json":
        "D892691E1A27824F637C0F5E77AAEDEAF79AB92BB3BF74A708F6F7CF715FB698",
    "RANK8_DELTA2_E1_OLD_ROOT_NEAR19_PLUS_UNIFORM_TAIL_THEOREM_2026-08-25.md":
        "F780155D4DF9A3BBC260A2E1AC45384001527959AEA1BE74619A4F28FEAE8F33",
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
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)

    near1 = load("rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json")
    near1_audit = load(
        "rank8_delta2_e1_old_root_near1_complete_independent_audit_agent_20260825.json"
    )
    near2 = load("rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json")
    near2_audit = load(
        "rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json"
    )
    finite = load(
        "rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json"
    )
    finite_audit = load(
        "rank8_delta2_e1_old_root_remaining_finite_band_independent_audit_agent_20260825.json"
    )
    tail = load(
        "rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
    )
    tail_audit = load(
        "rank8_delta2_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
    )

    expected = [
        (
            near1,
            near1_audit,
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR1_ALL_ORDER_ALL_EXTENSIONS",
            "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR1_COMPLETE",
        ),
        (
            near2,
            near2_audit,
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR2_ALL_ORDER_ALL_EXTENSIONS",
            "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR2_COMPLETE",
        ),
        (
            finite,
            finite_audit,
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_REMAINING_FINITE_NEAR0_3_18",
            "PASS_INDEPENDENT_TREE_DP_DELTA2_E1_OLD_ROOT_REMAINING_FINITE",
        ),
        (
            tail,
            tail_audit,
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS",
            "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR19_PLUS",
        ),
    ]
    for certificate, audit, certificate_status, audit_status in expected:
        assert certificate["status"] == certificate_status
        assert audit["status"] == audit_status
        assert audit["audited_theorem_status"] == certificate_status
        assert certificate["source_order_lower"] == 23
        assert certificate["extensions"] == EXTENSIONS

    assert near1["near"] == 1 and near2["near"] == 2
    finite_set = set(finite["near_values"])
    assert finite_set == {0, *range(3, 19)}
    assert finite["excluded_already_sealed_near_values"] == [1, 2]
    assert finite_audit["replayed"]["exact_near_set"] == finite["near_values"]
    assert finite_audit["replayed"][
        "explicitly_excluded_already_sealed_near_set"
    ] == [1, 2]
    singleton_set = {near1["near"], near2["near"]}
    assert finite_set.isdisjoint(singleton_set)
    assert finite_set | singleton_set == set(range(19))
    assert tail["near_lower"] == 19 and tail["source_order_automatic"] is True
    assert tail_audit["coverage_ledger"]["near_partition"] == "near>=19"
    for near in range(19):
        assert int(near in finite_set) + int(near == 1) + int(near == 2) == 1

    payload = {
        "schema": "rank8-delta2-e1-old-root-all-arm-distances-complete-agent-v1",
        "status": "PASS_FINAL_WRAPPER_DELTA2_E1_OLD_ROOT_ALL_ARM_DISTANCES",
        "scope": (
            "Every e=1 subdivided claw of source order at least 23 rooted at "
            "an old arm vertex, every integer arm distance near>=0, and all "
            "three one-arm extension orbits, for the Delta2 strict increment."
        ),
        "distance_partition": [
            {
                "near": [0, *range(3, 19)],
                "description": "grouped remaining finite package",
                "certificate_status": finite["status"],
                "audit_status": finite_audit["status"],
            },
            {
                "near": [1],
                "description": "separately sealed near=1 package",
                "certificate_status": near1["status"],
                "audit_status": near1_audit["status"],
            },
            {
                "near": [2],
                "description": "separately sealed near=2 package",
                "certificate_status": near2["status"],
                "audit_status": near2_audit["status"],
            },
            {
                "near": "every integer near>=19",
                "description": "uniform transfer tail",
                "certificate_status": tail["status"],
                "audit_status": tail_audit["status"],
            },
        ],
        "distance_ledger": {
            "finite_near_0_through_18_exactly_once": True,
            "uniform_tail_begins_exactly_at_19": True,
            "finite_and_tail_disjoint": True,
            "union_is_every_integer_near_at_least_zero": True,
            "all_three_extension_orbits_in_every_piece": True,
            "all_pieces_have_independent_literal_tree_dp_audits": True,
            "unresolved_arm_root_distances": [],
        },
        "large_replay_totals": {
            "grouped_finite_ordered_newton_coefficients": finite_audit["replayed"][
                "ordered_newton_coefficients"
            ],
            "uniform_tail_ordered_newton_coefficients": tail_audit["replayed"][
                "ordered_newton_coefficients"
            ],
            "grouped_finite_literal_increment_checks": finite_audit["replayed"][
                "literal_adjacency_increment_crosschecks"
            ],
            "uniform_tail_literal_increment_checks": tail_audit["replayed"][
                "literal_adjacency_increment_crosschecks"
            ],
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This wrapper closes only the Delta2 e=1 subdivided-claw strict "
            "arm-extension increment for old roots on arms.  Center roots and "
            "inserted-new-leaf roots require their separately named packages; "
            "arbitrary trees, Q8/PGC, forest unimodality, and Erdos Problem 993 "
            "remain outside."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
