#!/usr/bin/env python3
"""Exact placement ledger for every Delta2 e=1 old root."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_all_old_roots_complete_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_delta2_e1_old_root_all_arm_distances_complete_agent_20260825.py":
        "32F65F86BF4A6C349D1F0E31161CE8B3AB74089F92F641466A2F1A3FD99854CA",
    "rank8_delta2_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json":
        "E69EEA49DB3D58846772106F62779BD1437AAA3842472A46F19DB848B32A74A8",
    "RANK8_DELTA2_E1_OLD_ROOT_ALL_ARM_DISTANCES_COMPLETE_THEOREM_2026-08-25.md":
        "E2D4EF3FEAB842EE7B8FCCE691CF76C5F39A6248EE08490DA14E9A282B70CCFC",
    "prove_rank8_delta2_e1_center_root_complete_agent_20260825.py":
        "96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F",
    "rank8_delta2_e1_center_root_complete_exact_agent_20260825.json":
        "5C434FD92F74E09BC75A2C71F796E92DB8D3EBCA6449DC851A1D82CBCDEE840B",
    "audit_rank8_delta2_e1_center_root_complete_agent_20260825.py":
        "0DA0656ACF8C474D44EBDF31DE5BFDD155030DBE6FE4F051459510839B32AFCE",
    "rank8_delta2_e1_center_root_complete_independent_audit_agent_20260825.json":
        "469A00A739612BB3C6444F2955A3BAD0565CB9890F24206A6E04E4E2AB022795",
    "RANK8_DELTA2_E1_CENTER_ROOT_COMPLETE_THEOREM_2026-08-25.md":
        "46883C26C8D81C2079777A741B02FE3EA82E8E8692FE8C192A49888C508417AB",
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
    arm = load(
        "rank8_delta2_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json"
    )
    center = load("rank8_delta2_e1_center_root_complete_exact_agent_20260825.json")
    center_audit = load(
        "rank8_delta2_e1_center_root_complete_independent_audit_agent_20260825.json"
    )
    assert arm["status"] == (
        "PASS_FINAL_WRAPPER_DELTA2_E1_OLD_ROOT_ALL_ARM_DISTANCES"
    )
    assert arm["distance_ledger"]["unresolved_arm_root_distances"] == []
    assert arm["distance_ledger"][
        "all_pieces_have_independent_literal_tree_dp_audits"
    ] is True
    assert center["status"] == (
        "PASS_EXACT_DELTA2_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert center_audit["status"] == (
        "PASS_INDEPENDENT_TREE_DP_DELTA2_E1_CENTER_ROOT_COMPLETE"
    )
    assert center_audit["audited_theorem_status"] == center["status"]
    assert center["source_order_lower"] == 23

    payload = {
        "schema": "rank8-delta2-e1-all-old-roots-complete-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_DELTA2_E1_ALL_OLD_ROOT_PLACEMENTS",
        "scope": (
            "Every rooted e=1 subdivided claw of source order at least 23, "
            "every root vertex already present in the source tree, and all "
            "three one-arm extension orbits, for the Delta2 strict increment."
        ),
        "root_placement_partition": [
            {
                "placement": "claw center",
                "certificate_status": center["status"],
                "audit_status": center_audit["status"],
            },
            {
                "placement": "a vertex on exactly one arm, at distance near+1",
                "near": "every integer near>=0",
                "wrapper_status": arm["status"],
            },
        ],
        "root_placement_ledger": {
            "center_and_arm_cases_disjoint": True,
            "every_old_vertex_is_center_or_on_exactly_one_arm": True,
            "all_arm_distances_covered": True,
            "all_three_extension_orbits_covered": True,
            "every_leaf_package_has_independent_literal_tree_dp_replay": True,
            "unresolved_old_root_placements": [],
        },
        "center_replay": center_audit["replayed"],
        "arm_distance_ledger": arm["distance_ledger"],
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This closes only the Delta2 e=1 subdivided-claw strict increment "
            "gate for roots already present in the source tree.  It does not "
            "cover an inserted new leaf as root, arbitrary trees, full Q8/PGC, "
            "forest unimodality, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
