#!/usr/bin/env python3
"""Exact root-placement ledger for all Delta3 e=1 old roots."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_all_old_roots_complete_audit_agent_20260825.json"
PINNED = {
    "audit_rank8_delta3_e1_old_root_all_arm_distances_complete_agent_20260825.py":
        "7A2D41EB4F04B7A534E1E47E19C4E2B45DAEFAB555C44549C6563737FF080904",
    "rank8_delta3_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json":
        "13C81279F6D76308DB7B439BB74C87ED13E9116AE84EBF754C6282C08FF83DBD",
    "RANK8_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES_COMPLETE_THEOREM_2026-08-25.md":
        "4853A226E840C05F2FB735D6E095C1E201BCE874094855364CD39E3C15E30D80",
    "prove_rank8_delta3_e1_center_root_complete_agent_20260825.py":
        "9E6F77D3C5683C2E435CE69F2A57CBA8A32BF2D7AEBDB12E5545197EFA0FBD46",
    "rank8_delta3_e1_center_root_complete_exact_agent_20260825.json":
        "A67E9AF18DAE82E5C54AEBA35F823B8CAF36B84D4883147447F12B8356A0E090",
    "audit_rank8_delta3_e1_center_root_complete_agent_20260825.py":
        "176246CAE3F20EE719D16FBD19DAA1507DFF087C390CA8CE2254C55D94A4C66B",
    "rank8_delta3_e1_center_root_complete_independent_audit_agent_20260825.json":
        "F480EC24F2C74C72939422E4DAA96D27C23A459DB8E0AF8768FC44F051AB9501",
    "RANK8_DELTA3_E1_CENTER_ROOT_COMPLETE_THEOREM_2026-08-25.md":
        "EC5462421B6EC5C1F539CD04795143DBF5C080ADD5A16419C0D1F18BF8EDBE30",
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
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    arm = load(
        "rank8_delta3_e1_old_root_all_arm_distances_complete_audit_agent_20260825.json"
    )
    center = load("rank8_delta3_e1_center_root_complete_exact_agent_20260825.json")
    center_audit = load(
        "rank8_delta3_e1_center_root_complete_independent_audit_agent_20260825.json"
    )
    assert arm["status"] == (
        "PASS_FINAL_WRAPPER_DELTA3_E1_OLD_ROOT_ALL_ARM_DISTANCES"
    )
    assert arm["distance_ledger"]["unresolved_arm_root_distances"] == []
    assert center["status"] == (
        "PASS_EXACT_DELTA3_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert center_audit["audited_theorem_status"] == center["status"]
    assert center_audit["status"] == (
        "PASS_INDEPENDENT_TREE_DP_DELTA3_E1_CENTER_ROOT_COMPLETE"
    )

    payload = {
        "schema": "rank8-delta3-e1-all-old-roots-complete-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_DELTA3_E1_ALL_OLD_ROOT_PLACEMENTS",
        "scope": (
            "Every rooted e=1 subdivided claw of source order at least 23, "
            "every old root vertex, and all three one-arm extension orbits."
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
            "unresolved_old_root_placements": [],
        },
        "center_replay": center_audit["replayed"],
        "arm_distance_ledger": arm["distance_ledger"],
        "dependency_sha256": actual,
        "proof_boundary": (
            "This closes only the Delta3 e=1 subdivided-claw strict increment "
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
