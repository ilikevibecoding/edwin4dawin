#!/usr/bin/env python3
"""Fail-closed no-gap assembler for all 224 finite mask-3 small-m cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_agent.py": "111DFEEC2DCEC290A2AD876170AE083835D88E2B1E2834EC1F80DBE18467C475",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json": "1F771FEB9338055E961045A8C557C184E92FBED45BBA02C5A6CFDC5377CC212D",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_m0_15_coarse_agent.py": "573EB517CA78F034CB904DA4E7B8908FBA4AE100A4F8EC451B4D49EBE6F4CE82",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_coarse_independent_audit_agent_20260823.json": "BE0D50AE6F752511FE4E0840B27B5A73A51F81F42222DC5A8542097A6C2F4EA8",
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_agent.py": "D5903605EAE82AA236DE0D44AF18FF9FA8433FB893173E9E9BDA9A61623C4711",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json": "EA987A9B46FE22872462F97E03B1850965E4FFA7EB8BBF3EB405557FC1366933",
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_agent.py": "F81DE63D8717991E1BCE03FC936D6B01E07A242F79F78C317BA0137FD672E94F",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json": "66410DE4223D5EAE6C2F456B26E016791B07F05827EFC1312C2DF8A06B946DAE",
    "audit_rank8_delta0_new_leaf_mask3_small_m_joint_jet_chain_agent.py": "CE0C2D6D810A92BA3D01DFDA17CB04398E345272A07CA27D8A7152461059803D",
    "rank8_delta0_new_leaf_mask3_small_m_joint_jet_chain_independent_audit_agent_20260823.json": "7316AF4E73F55673945B138AED40A87328B8A8959789018EC78480D69A6B9067",
    "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": "23ABB3E543DD19CE9B0E4963675A89099F4A111692049FCC3D971B1BA54EC7CB",
    "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json": "908E41B8D1426ADA2399EB64D29881FC8A58B7C8579B6A574CEF54151AE9ABFC",
    "audit_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": "C2BC33F716FBCD3230B08707E566EF5065EFA01589430226C7C50ABA05703115",
    "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_independent_audit_agent_20260823.json": "3D004F7640E1452BFDD18AA97E69616D6AC8308228BF1AE4F4505D433CEC1F77",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def key(row):
    return row["N"], row["m"], row["branch"]


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json")
    coarse_audit = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_coarse_independent_audit_agent_20260823.json")
    floor = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json")
    envelope = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json")
    joint_audit = load("rank8_delta0_new_leaf_mask3_small_m_joint_jet_chain_independent_audit_agent_20260823.json")
    literal = load("rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json")
    literal_audit = load("rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_independent_audit_agent_20260823.json")
    assert coarse_audit["status"] == "PASS_INDEPENDENT_LITERAL_MASK3_SMALL_M_COARSE_REPLAY_WITH_80_OPEN"
    assert joint_audit["status"] == "PASS_INDEPENDENT_GENG_LITERAL_MASK3_SMALL_M_JOINT_JET_ENVELOPE_REPLAY"
    assert literal["status"] == "PASS_EXACT_MASK3_SMALL_M_2495_LITERAL_ATTACHMENT_CLOSURE"
    assert literal_audit["status"] == "PASS_INDEPENDENT_GENG_BITMASK_DELETION_MASK3_SMALL_M_2495_LITERAL_REPLAY"

    coarse_open = {
        (row[0], row[1], row[2]) for row in coarse["open_subboxes"]
    }
    floor_rows = {key(row): row for row in floor["rows"]}
    floor_open = {item for item, row in floor_rows.items() if row["status"] != "SEALED"}
    envelope_rows = {key(row): row for row in envelope["branch_rows"]}
    envelope_open = {item for item, row in envelope_rows.items() if row["status"] != "SEALED"}
    literal_keys = {(row["N"], row["m"], "f6_positive") for row in literal["rows"]}
    assert len(coarse_open) == 80 and set(floor_rows) == coarse_open
    assert len(floor_open) == 5 and set(envelope_rows) == floor_open
    assert len(envelope_open) == 4 and literal_keys == envelope_open
    assert floor["counts"]["open_joint_jet_boxes"] == envelope["counts"]["input_joint_jets"] == 14_402
    assert envelope["counts"]["open_envelope_jets"] == literal["counts"]["input_residual_joint_jets"] == 2_495

    rows = []
    route_counts = {"COARSE": 0, "ROOT_FLOOR": 0, "ENVELOPE": 0, "LITERAL": 0}
    branch_universe = set()
    for cell in coarse["rows"]:
        branches = []
        for branch in cell["branches"]:
            item = (cell["N"], cell["m"], branch["branch"])
            branch_universe.add(item)
            if item not in coarse_open:
                route = "COARSE"
            elif floor_rows[item]["status"] == "SEALED":
                route = "ROOT_FLOOR"
            elif envelope_rows[item]["status"] == "SEALED":
                route = "ENVELOPE"
            else:
                assert item in literal_keys
                route = "LITERAL"
            route_counts[route] += 1
            branches.append({"branch": branch["branch"], "status": "SEALED", "route": route})
        rows.append({"N": cell["N"], "m": cell["m"], "r": cell["r"], "status": "SEALED", "branches": branches})
    expected_universe = {
        (N, m, branch)
        for N in range(26, 40)
        for m in range(16)
        for branch in (["f6_zero"] if m < 6 else (["f6_positive"] if m > 10 else ["f6_zero", "f6_positive"]))
    }
    assert branch_universe == expected_universe and len(branch_universe) == 294
    assert route_counts == {"COARSE": 214, "ROOT_FLOOR": 75, "ENVELOPE": 1, "LITERAL": 4}
    assert len(rows) == 224 and all(row["status"] == "SEALED" for row in rows)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-complete-v1",
        "status": "PASS_EXACT_INDEPENDENTLY_AUDITED_MASK3_N26_39_SMALL_M_ALL_224",
        "scope": "Delta0/q=new-leaf/mask3; 26<=N<=39,0<=m<=15,r=N-m.",
        "counts": {"cells": 224, "logical_branches": 294, "routes": route_counts, "open": 0},
        "rows": rows,
        "open_cells": [],
        "dependency_manifest_sha256": hashes,
        "proof_boundary": "This closes only the finite 224-cell small-m wing. Low-r, middle, unbounded tails, other masks/roots/ranks, and Problem 993 are separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 224 BRANCHES 294 ROUTES", route_counts)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
