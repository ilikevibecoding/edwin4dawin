#!/usr/bin/env python3
"""Independent no-gap audit of the assembled 224-cell mask-3 small-m wing."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_agent.py": "17797B1EBE3B750E524602D2AC8A07DAD89BB6006D89D9D90A2BE7CD0ABCA8ED",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json": "582EE9A42AFC0F3B2F595B83CB2EEBE6CF302D7B03ACA6EA919F870C3D9EF047",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assembler_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert assembler_hashes == EXPECTED
    master = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_complete_assembled_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_MASK3_N26_39_SMALL_M_ALL_224"
    manifest = master["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json")
    floor = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json")
    envelope = load("rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json")
    literal = load("rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json")
    coarse_open = {(row[0], row[1], row[2]) for row in coarse["open_subboxes"]}
    floor_rows = {(row["N"], row["m"], row["branch"]): row for row in floor["rows"]}
    floor_open = {key for key, row in floor_rows.items() if row["status"] != "SEALED"}
    envelope_rows = {(row["N"], row["m"], row["branch"]): row for row in envelope["branch_rows"]}
    envelope_open = {key for key, row in envelope_rows.items() if row["status"] != "SEALED"}
    literal_keys = {(row["N"], row["m"], "f6_positive") for row in literal["rows"]}
    assert (len(coarse_open), len(floor_open), len(envelope_open)) == (80, 5, 4)
    assert set(floor_rows) == coarse_open and set(envelope_rows) == floor_open and literal_keys == envelope_open
    expected_routes = {}
    universe = set()
    for N in range(26, 40):
        for m in range(16):
            for branch in (["f6_zero"] if m < 6 else (["f6_positive"] if m > 10 else ["f6_zero", "f6_positive"])):
                key = (N, m, branch)
                universe.add(key)
                expected_routes[key] = (
                    "COARSE" if key not in coarse_open else
                    "ROOT_FLOOR" if floor_rows[key]["status"] == "SEALED" else
                    "ENVELOPE" if envelope_rows[key]["status"] == "SEALED" else
                    "LITERAL"
                )
    actual_routes = {
        (row["N"], row["m"], branch["branch"]): branch["route"]
        for row in master["rows"] for branch in row["branches"]
    }
    assert actual_routes == expected_routes and len(universe) == 294
    counts = {route: list(actual_routes.values()).count(route) for route in ("COARSE", "ROOT_FLOOR", "ENVELOPE", "LITERAL")}
    assert counts == {"COARSE": 214, "ROOT_FLOOR": 75, "ENVELOPE": 1, "LITERAL": 4}
    assert len(master["rows"]) == 224 and master["open_cells"] == []
    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_MASK3_N26_39_SMALL_M_ALL_224",
        "counts": {"cells": 224, "logical_branches": 294, "routes": counts, "overlap": 0, "gap": 0},
        "assembler_hashes": assembler_hashes,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROUTES", counts, "GAP 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
