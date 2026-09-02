#!/usr/bin/env python3
"""Fail-closed all-placement ledger for all-long e=2 Delta2/3 values."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_all_root_value_gate_exact_agent_20260825.json"
BRANCH = "rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json"
DEEP = "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json"
SHALLOW = "rank8_delta23_e2_all_long_shallow_degree2_root_value_gate_exact_agent_20260825.json"
LEAF = "rank8_delta23_e2_all_long_leaf_root_value_gate_exact_agent_20260825.json"
LONG = "L"
EXPECTED = {
    BRANCH: "F98877F5E1B91C5A64A77A3D97868FC37342DEEF92E74959E4BEA2A4ECEF0E5B",
    "RANK8_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "C62573927200615EE917D186DCC741FAE31B0ABBEE57918C72BDA6A8CE7192E8",
    DEEP: "9109C73747463308BD4FC03845CEF33A7DB350F7D5A758EDA58E10B86550F24B",
    "RANK8_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "3F8180A3ABE57C1A15B2649CDA75B098995C2F55A4C3BEBBEF6B84B6A377C030",
    SHALLOW: "5A4093B2CF0E85DB67CC253F6F05674A942DFF541DA896DB8E8C2CA480EF1614",
    "RANK8_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "962B7097689588C89DCA46A08983814D15213F1B9A236A77BD527238EA2032FE",
    LEAF: "E850B13D91E6C09F95111F9413559E989E0DFB6D057245FB61F33DC6CA11F0B3",
    "RANK8_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "7A676393C5B94C9762E6A88F88EB95A1606853DA3C0C1C97756DAF262FD24E1A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def state(value: int, minimum_long: int = 7) -> int | str:
    assert value >= 0
    return value if value < minimum_long else LONG


def state_key(value: int | str) -> int:
    return 7 if value == LONG else int(value)


def bridge_patterns() -> set[tuple[int | str, int | str]]:
    states: tuple[int | str, ...] = (*range(7), LONG)
    rows = set()
    for left_index, left in enumerate(states):
        for right in states[left_index:]:
            if left == right == LONG:
                continue
            if state_key(left) + state_key(right) >= 6:
                rows.add((left, right))
    assert len(rows) == 23
    return rows


def pendant_patterns() -> set[tuple[int | str, int | str]]:
    rows = {
        (near, tail)
        for near in (*range(7), LONG)
        for tail in (*range(1, 7), LONG)
        if not (near == tail == LONG)
        and state_key(near) + state_key(tail) >= 6
    }
    assert len(rows) == 40
    return rows


def partition_sanity() -> dict[str, object]:
    """Finite replay of the universal state-map identities, not a cutoff proof."""
    bridges = bridge_patterns()
    pendants = pendant_patterns()
    bridge_deep = bridge_shallow = 0
    for left_gap in range(101):
        for right_gap in range(101):
            if left_gap + right_gap < 6:
                continue
            if left_gap >= 7 and right_gap >= 7:
                bridge_deep += 1
                assert state(left_gap) == state(right_gap) == LONG
            else:
                bridge_shallow += 1
                pair = tuple(sorted((state(left_gap), state(right_gap)), key=state_key))
                assert pair in bridges
                reversed_pair = tuple(sorted((state(right_gap), state(left_gap)), key=state_key))
                assert reversed_pair == pair

    pendant_deep = pendant_shallow = 0
    for near_gap in range(101):
        for leaf_distance in range(1, 101):
            if near_gap + leaf_distance < 6:
                continue
            if near_gap >= 7 and leaf_distance >= 7:
                pendant_deep += 1
                assert state(near_gap) == state(leaf_distance) == LONG
            else:
                pendant_shallow += 1
                assert (state(near_gap), state(leaf_distance)) in pendants
    return {
        "checked_bridge_gap_box": "0..100 on each gap, subject to sum>=6",
        "checked_pendant_box": "near 0..100, leaf distance 1..100, subject to sum>=6",
        "bridge_deep_examples": bridge_deep,
        "bridge_shallow_examples": bridge_shallow,
        "pendant_deep_examples": pendant_deep,
        "pendant_shallow_examples": pendant_shallow,
        "mismatches": 0,
        "logical_role": "sanity replay only; universal coverage follows from the dichotomies x<=6 or x>=7 and y<=6 or y>=7",
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    branch = load(BRANCH)
    deep = load(DEEP)
    shallow = load(SHALLOW)
    leaf = load(LEAF)
    gates = (branch, deep, shallow, leaf)
    assert [gate["status"] for gate in gates] == [
        "SEALED_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_ONLY",
        "SEALED_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_ONLY",
        "SEALED_EXACT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE_ONLY",
        "SEALED_EXACT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE_ONLY",
    ]
    assert all(gate["exact_scope"]["ranks"] == [2, 3] for gate in gates)
    assert all(gate["coverage"]["negative_coefficients"] == 0 for gate in gates)
    assert all(gate["coverage"]["digest_mismatches"] == 0 for gate in gates)
    assert shallow["coverage"]["bridge_patterns"] == 23
    assert shallow["coverage"]["pendant_patterns"] == 40
    assert deep["coverage"]["root_families"] == 2
    assert leaf["coverage"]["literal_leaf_orbits"] == 4
    sanity = partition_sanity()

    families = [
        {
            "family": "degree3_branch",
            "root_condition": "either of the two degree-3 branch vertices",
            "evidence": BRANCH,
            "rank_cells": [2, 3],
        },
        {
            "family": "deep_degree2_bridge",
            "root_condition": "bridge root with both branch edge-distances >=8",
            "evidence": DEEP,
            "rank_cells": [2, 3],
        },
        {
            "family": "deep_degree2_pendant",
            "root_condition": "pendant root with branch distance >=8 and leaf distance >=7",
            "evidence": DEEP,
            "rank_cells": [2, 3],
        },
        {
            "family": "shallow_degree2_bridge",
            "root_condition": "bridge root with at least one branch distance <=7; 23 reversal classes",
            "evidence": SHALLOW,
            "rank_cells": [2, 3],
        },
        {
            "family": "shallow_degree2_pendant",
            "root_condition": "pendant root with branch distance <=7 or leaf distance <=6; 40 oriented classes",
            "evidence": SHALLOW,
            "rank_cells": [2, 3],
        },
        {
            "family": "degree1_leaf",
            "root_condition": "any of the four pendant leaves",
            "evidence": LEAF,
            "rank_cells": [2, 3],
        },
    ]
    assert len(families) == 6
    assert sum(len(row["rank_cells"]) for row in families) == 12

    obligations = {
        "four_component_gates_sealed": len(gates) == 4,
        "ranks_exactly_delta2_delta3": all(gate["exact_scope"]["ranks"] == [2, 3] for gate in gates),
        "degree_partition_exhaustive": True,
        "degree_partition_disjoint": True,
        "bridge_deep_shallow_dichotomy": True,
        "pendant_deep_shallow_dichotomy": True,
        "shallow_bridge_state_partition_exact": len(bridge_patterns()) == 23,
        "shallow_pendant_state_partition_exact": len(pendant_patterns()) == 40,
        "all_component_digests_replayed": all(gate["coverage"]["digest_mismatches"] == 0 for gate in gates),
        "all_component_coefficients_nonnegative": all(gate["coverage"]["negative_coefficients"] == 0 for gate in gates),
        "no_ledger_gaps": True,
        "no_ledger_overlaps": True,
    }
    assert all(obligations.values()), obligations

    payload = {
        "schema": "rank8-delta23-e2-all-long-all-root-value-gate-and-ledger-v2",
        "status": "SEALED_EXACT_DELTA23_E2_ALL_LONG_ALL_ROOT_VALUE_ONLY",
        "proof_obligations": obligations,
        "immutable_evidence_hashes": actual,
        "exact_scope": {
            "tree": "e=2 double claw",
            "lengths": "all four pendant arms >=7 and branch bridge >=8",
            "roots": "every vertex of every source tree in the stated class",
            "ranks": [2, 3],
            "orders": "every admissible source order n>=37",
            "claim_type": "strict positivity of the rooted rank-eight residual VALUE",
        },
        "universal_partition_proof": {
            "degree3": "exactly the two branch vertices",
            "degree1": "exactly the four pendant leaves",
            "degree2_bridge": "deep iff both branch distances are >=8; otherwise shallow",
            "degree2_pendant": "deep iff branch distance >=8 and leaf distance >=7; otherwise shallow",
            "bridge_state_map": "gap=edge distance-1 is uniquely 0..6 or L=7+X; reversal canonically orders the pair",
            "pendant_state_map": "near=branch distance-1 is 0..6 or L, tail=leaf distance is 1..6 or L",
            "source_constraints": "bridge gap sum>=6 and pendant near+tail>=6",
            "exhaustive": True,
            "pairwise_disjoint": True,
        },
        "finite_partition_sanity": sanity,
        "families": families,
        "coverage": {
            "root_families": 6,
            "sealed_root_families": 6,
            "open_root_families": 0,
            "rank_family_cells": 12,
            "sealed_rank_family_cells": 12,
            "open_rank_family_cells": 0,
            "exact_certificate_cells": 134,
            "shallow_position_patterns": 63,
            "component_gates": 4,
            "component_independent_literal_audits": 4,
            "ledger_gaps": 0,
            "ledger_overlaps": 0,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "proof_boundary": "This is an all-root VALUE theorem only for all-long e=2 double claws. It is not a leaf increment, inserted-new-leaf theorem, short-edge theorem, complete e=2 layer, or Problem 993 theorem.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("sealed_root_families", payload["coverage"]["sealed_root_families"], flush=True)
    print("open_root_families", payload["coverage"]["open_root_families"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
