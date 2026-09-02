#!/usr/bin/env python3
"""Fail-closed assembler for all 126 finite low-r mask-3 cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_agent.py": "A3B4DE472F60284DE15FF2F56BDA50AE614A310CF3DDC4769305740EA8C4A89A",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json": "275EB56A82B6CD020C8D79E64415E21BE970BD883EB23A7CCF658A6363A262BB",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_r1_9_agent.py": "832CF1731530CD92F5C447A62D266C34FF38C1F4A15489B294CE4B6D0A8A81EA",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_independent_audit_agent_20260823.json": "332E18B635CB49112218A24FCD4D71062523054B2479CFC8D6BDCD286BAF4115",
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_agent.py": "FBD0FF4F73D6A595E4682D39B22E32C797723FBEBDDD69077ADA17D3963E1DB6",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_exact_agent_20260823.json": "B8DC1531F41D0A3CD3BB9F1484B4521136F0ACA2F301D7CC8507FAC1BF69A2F5",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_agent.py": "F84BAA83FA3CB9A0E28028733B0463661D8592B9C9FDA7DF2ECACA2D024FE2C6",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_independent_audit_agent_20260823.json": "39870096C5389EB33728376B9FB5BDF1798349AB3FDFE4B3CA3FB2FBD8440D69",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json")
    coarse_audit = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_independent_audit_agent_20260823.json")
    refined = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_exact_agent_20260823.json")
    refined_audit = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_independent_audit_agent_20260823.json")
    domain = {(N, r, N - r) for N in range(26, 40) for r in range(1, 10)}
    open_cells = {tuple(row) for row in coarse["open_cells"]}
    coarse_sealed = {(row["N"], row["r"], row["m"]) for row in coarse["rows"] if row["status"] == "SEALED"}
    refined_sealed = {(row["N"], row["r"], row["m"]) for row in refined["rows"] if row["status"] == "SEALED"}
    assert len(domain) == 126 and coarse_sealed | open_cells == domain and coarse_sealed.isdisjoint(open_cells)
    assert len(coarse_sealed) == 122 and refined_sealed == open_cells and len(refined_sealed) == 4
    assert coarse_audit["counts"] == {"cells": 126, "zero_negative": 122, "open": 4, "bernstein_controls": 34020}
    assert refined_audit["counts"] == {"cells": 4, "component_subboxes": 72, "open": 0}
    rows = [{"N": N, "r": r, "m": m, "status": "SEALED", "route": "COMPONENT_REFINEMENT" if (N, r, m) in refined_sealed else "COARSE_BOX"} for N, r, m in sorted(domain)]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-complete-assembled-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_R1_9_ALL_126",
        "scope": "26<=N<=39,1<=r<=9,m=N-r>=17; Delta0/new-leaf/mask3.",
        "partition_counts": {"coarse_box": 122, "component_refinement": 4, "total": 126, "open": 0},
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": "This closes exactly the finite low-r wing. The small-m wing, tails, and complete mask3 assembler remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION", payload["partition_counts"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
