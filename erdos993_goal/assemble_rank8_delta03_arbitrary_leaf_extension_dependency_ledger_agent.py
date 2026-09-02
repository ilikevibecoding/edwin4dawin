#!/usr/bin/env python3
"""Build a fail-closed ledger for the rank-8 arbitrary-leaf extension route."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_arbitrary_leaf_extension_dependency_ledger_agent_20260823.json"
EXPECTED = {
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json": "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
    "assemble_rank8_delta0_new_leaf_four_mask_complete_agent.py": "A224169F7861D2AF6221CDABCF887D80506EF666B457FF7CEFC939CB6A64C3DB",
    "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json": "08752912E569EEE25180B6BB11E4070C525083168FAC42B23E5A961335D7527E",
    "audit_rank8_delta0_new_leaf_four_mask_complete_agent.py": "2E47475CEF055D3A045FD050BD408C05F606636CE474806B88D070B82CBC1131",
    "rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json": "0E2CDACDA87C3EE036AEA14C469CE0A1A46C3C9D46515C837A543954E7F2601A",
}

GATES = ("new_leaf_root", "attach_at_old_root", "general_old_root")
RANKS = (0, 1, 2, 3)


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), path.name
    assert before.st_mtime_ns == after.st_mtime_ns, path.name
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


def load(name: str):
    return json.loads(stable_bytes(HERE / name).decode("utf-8"))


def main() -> None:
    before = {name: sha256(HERE / name) for name in EXPECTED}
    assert before == EXPECTED

    symbolic = load("rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json")
    assert symbolic["status"] == "PASS_EXACT_IDENTITIES_DEPENDENCY_OPEN_NO_SIGN_CLAIM"
    assert symbolic["gate_meaning"]["ranks"] == list(RANKS)
    for gate in GATES:
        rows = symbolic["families"][gate + "_raw"]
        assert [row["rank"] for row in rows] == list(RANKS)

    theorem = load("rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json")
    audit = load("rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json")
    assert theorem["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"
    assert audit["status"] == "PASS_INDEPENDENT_FOUR_CORNER_COMPOSITION_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"

    cells = []
    for gate in GATES:
        for rank in RANKS:
            sealed = gate == "new_leaf_root" and rank == 0
            cells.append(
                {
                    "gate": gate,
                    "rank": rank,
                    "state": "SEALED_AND_INDEPENDENTLY_AUDITED" if sealed else "OPEN",
                    "evidence": (
                        "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json"
                        if sealed
                        else None
                    ),
                }
            )
    universe = {(gate, rank) for gate in GATES for rank in RANKS}
    observed = {(cell["gate"], cell["rank"]) for cell in cells}
    assert observed == universe and len(cells) == len(observed) == 12
    sealed = [cell for cell in cells if cell["state"] == "SEALED_AND_INDEPENDENTLY_AUDITED"]
    open_cells = [cell for cell in cells if cell["state"] == "OPEN"]
    assert [(cell["gate"], cell["rank"]) for cell in sealed] == [("new_leaf_root", 0)]
    assert len(open_cells) == 11

    after = {name: sha256(HERE / name) for name in EXPECTED}
    assert after == before
    payload = {
        "schema": "rank8-delta03-arbitrary-leaf-extension-dependency-ledger-v1",
        "status": "PARTIAL_EXACT_1_OF_12_GATE_RANK_OBLIGATIONS_SEALED_11_OPEN",
        "target": symbolic["target"],
        "universe_definition": {
            "gate_families": list(GATES),
            "ranks": list(RANKS),
            "total_cells": 12,
            "non_double_count_rule": "general_old_root_adjacent_structural is an analytic subcase of general_old_root, not an additional gate cell",
        },
        "counts": {
            "sealed_and_independently_audited": 1,
            "open": 11,
            "gaps": 0,
            "overlaps": 0,
        },
        "cells": cells,
        "new_exact_promotion": {
            "gate": "new_leaf_root",
            "rank": 0,
            "scope": "every source tree A of order n>=27, every attachment vertex v, and q the inserted leaf",
            "proof_route": "exact separate concavity in c8,d7 plus four independently audited endpoint masks",
        },
        "dependency_manifest_sha256": EXPECTED,
        "dependency_rehash_stable_within_run": True,
        "proof_boundary": "Only the Delta0 inserted-leaf-root cell is closed. Delta1..3 at the new leaf and Delta0..3 at both old-root gate families remain open. Hence arbitrary-leaf monotonicity, connected Q8 for n>=28, forest Q8, rank-eight PGC, forest independence-sequence unimodality, and Problem 993 remain unproved.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SEALED", len(sealed), "OPEN", len(open_cells), "TOTAL", len(cells))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
