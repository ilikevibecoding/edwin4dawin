#!/usr/bin/env python3
"""Exact Delta2/3 e=1 ledger for every root in the extended target claw."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e1_all_target_root_placements_complete_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_delta2_e1_all_old_roots_complete_agent_20260825.py":
        "C0B0232B577545B45940BA0B620F88793A4F521E2B4B8B065446D168E5354BD9",
    "rank8_delta2_e1_all_old_roots_complete_audit_agent_20260825.json":
        "09786DEAF69A54960CCD4AE0CEA6965A73E3364B0E8A9961951D9AFF0D4D56C3",
    "RANK8_DELTA2_E1_ALL_OLD_ROOT_PLACEMENTS_COMPLETE_THEOREM_2026-08-25.md":
        "CC800E6199919DD939D7A17392007B176A98B3087D0DEF7162A4BB5FEA1CD79E",
    "audit_rank8_delta3_e1_all_old_roots_complete_agent_20260825.py":
        "A3B7896071711D5D0CD62BCE322C85A7B1DBBD7F0674B86D7951D0020D57C2FA",
    "rank8_delta3_e1_all_old_roots_complete_audit_agent_20260825.json":
        "84CC527DE97C605D4B7A7807A8E841FA4D842C5AE77A50C9927E710EE161F2E8",
    "prove_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py":
        "517FD645FCECEFAB1AE40811EF337797B5402B8375E42C51A7942A0819C165CD",
    "rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json":
        "930B8F2E985B07B54B5AFB7422DF0510AAE2DF6D11E88418527B0111D1368CD0",
    "audit_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py":
        "C1D5EA228D583C43AC74339C80D93D8EC93C23D3C6ADDE3614CD950A83991E67",
    "rank8_delta23_e1_inserted_new_leaf_complete_independent_audit_agent_20260825.json":
        "B2B97CBC67021A53FF422A8CEC877E4CA832D21C01754AAF4016C2015565C3F5",
    "RANK8_DELTA23_E1_INSERTED_NEW_LEAF_COMPLETE_THEOREM_2026-08-25.md":
        "8277DFC6A65F0E8818229696F4341A29A161DEAAE3DE4150CCFDEA2DC13A97A2",
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
    delta2_old = load("rank8_delta2_e1_all_old_roots_complete_audit_agent_20260825.json")
    delta3_old = load("rank8_delta3_e1_all_old_roots_complete_audit_agent_20260825.json")
    inserted = load("rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json")
    inserted_audit = load(
        "rank8_delta23_e1_inserted_new_leaf_complete_independent_audit_agent_20260825.json"
    )

    assert delta2_old["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_DELTA2_E1_ALL_OLD_ROOT_PLACEMENTS"
    )
    assert delta3_old["status"] == (
        "PASS_EXACT_SCOPE_AUDIT_DELTA3_E1_ALL_OLD_ROOT_PLACEMENTS"
    )
    for old in (delta2_old, delta3_old):
        ledger = old["root_placement_ledger"]
        assert ledger["center_and_arm_cases_disjoint"] is True
        assert ledger["every_old_vertex_is_center_or_on_exactly_one_arm"] is True
        assert ledger["all_arm_distances_covered"] is True
        assert ledger["all_three_extension_orbits_covered"] is True
        assert ledger["unresolved_old_root_placements"] == []

    assert inserted["status"] == (
        "PASS_EXACT_DELTA23_E1_INSERTED_NEW_LEAF_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert inserted_audit["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA23_E1_INSERTED_NEW_LEAF_COMPLETE"
    )
    assert inserted_audit["audited_theorem_status"] == inserted["status"]
    assert inserted["ranks"] == [2, 3]
    assert inserted["source_order_lower"] == 23
    assert inserted["extended_arms"] == [0, 1, 2]
    assert inserted_audit["replayed"]["ordered_newton_coefficients"] == 162783

    payload = {
        "schema": "rank8-delta23-e1-all-target-root-placements-complete-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_DELTA23_E1_ALL_TARGET_ROOT_PLACEMENTS",
        "scope": (
            "Every e=1 subdivided-claw source of order at least 23, every "
            "one-arm endpoint-leaf extension, every vertex of the extended "
            "target tree as root, and both Delta2 and Delta3 rank-eight gates."
        ),
        "target_root_partition": [
            {
                "placement": "a vertex already present in the source tree",
                "Delta2_gate": "strict old-root increment",
                "Delta2_status": delta2_old["status"],
                "Delta3_gate": "strict old-root increment",
                "Delta3_status": delta3_old["status"],
            },
            {
                "placement": "the unique inserted endpoint leaf",
                "Delta2_gate": "positive terminal-residual coefficient",
                "Delta3_gate": "positive terminal-residual coefficient",
                "certificate_status": inserted["status"],
                "audit_status": inserted_audit["status"],
            },
        ],
        "placement_ledger": {
            "old_vertices_and_inserted_leaf_disjoint": True,
            "every_target_vertex_is_old_or_the_inserted_leaf": True,
            "all_old_vertices_covered_in_both_ranks": True,
            "inserted_leaf_covered_in_both_ranks": True,
            "all_three_extension_orbits_covered": True,
            "all_leaf_packages_have_independent_literal_tree_dp_replay": True,
            "unresolved_target_root_placements": [],
        },
        "inserted_leaf_replay": inserted_audit["replayed"],
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This closes only the Delta2/Delta3 e=1 subdivided-claw root-"
            "placement gate for one-arm endpoint-leaf extensions from source "
            "order at least 23.  It does not cover arbitrary trees, other e, "
            "full Q8/PGC, forest unimodality, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
