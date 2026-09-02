#!/usr/bin/env python3
"""Independent partition audit of the complete 126-cell low-r mask-3 wing."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_agent.py": "5E22D1EE126ACFFE40C5DA810C546E45DCE797CE59CA53F9BC8BFE799F53CCF1",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json": "434A2B05ABB203458F58BD49A3BE33AC4EC4DE54BA1E72628048E56C3ED70B3F",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_independent_audit_agent_20260823.json": "332E18B635CB49112218A24FCD4D71062523054B2479CFC8D6BDCD286BAF4115",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_independent_audit_agent_20260823.json": "39870096C5389EB33728376B9FB5BDF1798349AB3FDFE4B3CA3FB2FBD8440D69",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    assembled = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_complete_assembled_agent_20260823.json")
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_independent_audit_agent_20260823.json")
    refined = load("rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_independent_audit_agent_20260823.json")
    domain = {(N, r, N - r) for N in range(26, 40) for r in range(1, 10)}
    open_cells = {tuple(row) for row in coarse["open_cells"]}
    assert len(domain) == 126 and len(open_cells) == 4
    assert {(row["N"], row["r"], row["m"]) for row in refined["rows"]} == open_cells
    rows = {(row["N"], row["r"], row["m"]): row for row in assembled["rows"]}
    assert set(rows) == domain and len(assembled["rows"]) == 126
    assert all(rows[cell]["route"] == ("COMPONENT_REFINEMENT" if cell in open_cells else "COARSE_BOX") for cell in domain)
    assert all(row["status"] == "SEALED" for row in rows.values())
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_DELTA0_NEW_LEAF_MASK3_N26_39_R1_9_ALL_126",
        "hashes": hashes,
        "partition_counts": {"coarse_box": 122, "component_refinement": 4, "total": 126, "overlap": 0, "missing": 0},
        "proof_boundary": assembled["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION", payload["partition_counts"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
