#!/usr/bin/env python3
"""Exact fail-closed coverage ledger for all-long e=2 root orbits."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_root_orbit_coverage_ledger_agent_20260825.json"
EXPECTED = {
    "rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json":
        "F98877F5E1B91C5A64A77A3D97868FC37342DEEF92E74959E4BEA2A4ECEF0E5B",
    "RANK8_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "C62573927200615EE917D186DCC741FAE31B0ABBEE57918C72BDA6A8CE7192E8",
    "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json":
        "9109C73747463308BD4FC03845CEF33A7DB350F7D5A758EDA58E10B86550F24B",
    "RANK8_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md":
        "3F8180A3ABE57C1A15B2649CDA75B098995C2F55A4C3BEBBEF6B84B6A377C030",
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
    branch = load("rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json")
    deep = load("rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json")
    assert branch["status"] == "SEALED_EXACT_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_ONLY"
    assert deep["status"] == "SEALED_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_ONLY"
    assert branch["exact_scope"]["ranks"] == deep["exact_scope"]["ranks"] == [2, 3]
    assert branch["coverage"]["negative_coefficients"] == 0
    assert deep["coverage"]["negative_coefficients"] == 0

    families = [
        {
            "family": "degree3_branch",
            "state": "SEALED_EXACT_AND_LITERAL_DP_AUDITED",
            "root_condition": "either of the two degree-3 branch vertices",
            "rank_cells": [2, 3],
            "minimum_order": 37,
            "evidence": "rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json",
        },
        {
            "family": "deep_degree2_bridge",
            "state": "SEALED_EXACT_AND_LITERAL_DP_AUDITED",
            "root_condition": "degree-2 bridge root with distances dL>=8 and dR>=8 from the two branches",
            "rank_cells": [2, 3],
            "minimum_order": 45,
            "evidence": "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json",
        },
        {
            "family": "deep_degree2_pendant",
            "state": "SEALED_EXACT_AND_LITERAL_DP_AUDITED",
            "root_condition": "degree-2 pendant root with branch distance dB>=8 and leaf distance dL>=7",
            "rank_cells": [2, 3],
            "minimum_order": 45,
            "evidence": "rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json",
        },
        {
            "family": "shallow_degree2_bridge",
            "state": "OPEN",
            "root_condition": "degree-2 bridge root with dL<=7 or dR<=7",
            "rank_cells": [2, 3],
            "evidence": None,
        },
        {
            "family": "shallow_degree2_pendant",
            "state": "OPEN",
            "root_condition": "degree-2 pendant root with branch distance dB<=7 or leaf distance dL<=6",
            "rank_cells": [2, 3],
            "evidence": None,
        },
        {
            "family": "degree1_leaf",
            "state": "OPEN",
            "root_condition": "one of the four pendant leaves",
            "rank_cells": [2, 3],
            "evidence": None,
        },
    ]
    sealed = [row for row in families if row["state"].startswith("SEALED")]
    opened = [row for row in families if row["state"] == "OPEN"]
    assert len(families) == 6 and len(sealed) == len(opened) == 3
    assert sum(len(row["rank_cells"]) for row in sealed) == 6
    assert sum(len(row["rank_cells"]) for row in opened) == 6

    payload = {
        "schema": "rank8-delta23-e2-all-long-root-orbit-coverage-ledger-v1",
        "status": "PARTIAL_EXACT_3_OF_6_ALL_LONG_ROOT_FAMILIES_SEALED",
        "universe": {
            "tree": "e=2 double claw",
            "lengths": "four pendant arms >=7 and branch bridge >=8",
            "roots": "every vertex of the tree",
            "ranks": [2, 3],
            "claim_type": "rooted residual VALUE only",
        },
        "partition_rule": {
            "degree3": "the two branch vertices",
            "degree2_bridge": "deep iff both branch distances are >=8; otherwise shallow",
            "degree2_pendant": "deep iff branch distance >=8 and leaf distance >=7; otherwise shallow",
            "degree1": "the four leaves",
            "exhaustive": True,
            "pairwise_disjoint": True,
        },
        "families": families,
        "counts": {
            "root_families": 6,
            "sealed_root_families": 3,
            "open_root_families": 3,
            "rank_family_cells": 12,
            "sealed_rank_family_cells": 6,
            "open_rank_family_cells": 6,
            "gaps_in_ledger_partition": 0,
            "overlaps_in_ledger_partition": 0,
        },
        "sealed_union": {
            "branch_vertices": 2,
            "deep_bridge_path_orbits": 1,
            "deep_pendant_arm_orbits": 4,
            "ranks": [2, 3],
            "all_coefficients_nonnegative": True,
            "all_origins_positive": True,
        },
        "immutable_evidence_hashes": actual,
        "proof_boundary": "This ledger is partial. Shallow bridge roots, shallow pendant roots, and leaves remain open. It does not prove an all-root value theorem, a leaf increment, the complete e=2 layer, or Problem 993.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("sealed_families", payload["counts"]["sealed_root_families"], flush=True)
    print("open_families", payload["counts"]["open_root_families"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
