#!/usr/bin/env python3
"""Fail-closed assembler for all 105 finite-middle mask-3 cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_middle_agent.py":
        "91F3D2FBD65BE77119A9513A2A3BE8D95F1277683FD49F60BCE7E27E7FB70F5B",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json":
        "2919A6986E0AF16466EEF5CE89783D6676B27B0316066C821BFFE944647F9DC9",
    "prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent.py":
        "1484464582B475072E126563CDF9A31E274A03E39609E0F11E6C1FE1337C6246",
    "rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json":
        "881507ADD1A7A96E95C8D24A0D1C6E7092E567F8C27AB8A84082F6F34F862957",
    "prove_rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_agent.py":
        "7EF09D48838D6D991B5A755D2112F2205B066CC8F007B5301C1B9072C0A433C6",
    "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json":
        "7417437EB9605542365D6C170378866EEF77030B417BB8019531E3F0F00B5378",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_middle_layers_agent.py":
        "A87A3D07012D75DAE09CF14307EA6F1EF0AF39DD9A27D694531EBCE53D18D716",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_layers_independent_audit_agent_20260823.json":
        "020E409530F99A7244FE681E71C318B4BC66725235DA5DC275BA0388145053EA",
    "assemble_rank8_delta0_new_leaf_mask3_5_finite_middle_residual_agent.py":
        "E6D02DCA9DC491FF97437E3A2C97DBF55939C34B132085E171FE021D929B8550",
    "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_assembled_agent_20260823.json":
        "45821A4E8FDA537EA0CE099F34DB952D95D6A1033DB9824D4F92890132FDAA5E",
    "audit_rank8_delta0_new_leaf_mask3_5_finite_middle_residual_agent.py":
        "D67462D3E705DEF004186D247B35D1207A0041180CCEE8260BCE639BA2010019",
    "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_independent_audit_agent_20260823.json":
        "34CADCA0E7A048E26D83633352AC1B7FE78B452FC18BC64E5727A83755BE65EA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def cell(row) -> tuple[int, int, int]:
    return row["N"], row["r"], row["m"]


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json")
    first = load("rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json")
    ratio = load("rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json")
    layers_audit = load("rank8_delta0_new_leaf_mask3_n26_39_middle_layers_independent_audit_agent_20260823.json")
    five = load("rank8_delta0_new_leaf_mask3_5_finite_middle_residual_assembled_agent_20260823.json")
    five_audit = load("rank8_delta0_new_leaf_mask3_5_finite_middle_residual_independent_audit_agent_20260823.json")

    domain = {(N, r, N - r) for N in range(26, 40) for r in range(10, N - 15)}
    assert len(domain) == 105
    coarse_sealed = {cell(row) for row in coarse["rows"] if row["status"] == "SEALED"}
    coarse_open = {cell(row) for row in coarse["rows"] if row["status"] != "SEALED"}
    first_sealed = {cell(row) for row in first["rows"] if row["status"] == "SEALED"}
    first_open = {cell(row) for row in first["rows"] if row["status"] != "SEALED"}
    ratio_sealed = {cell(row) for row in ratio["rows"] if row["status"] == "SEALED"}
    ratio_open = {cell(row) for row in ratio["rows"] if row["status"] != "SEALED"}
    five_sealed = {cell(row) for row in five["rows"] if row["status"] == "SEALED"}

    assert coarse_sealed | coarse_open == domain and coarse_sealed.isdisjoint(coarse_open)
    assert first_sealed | first_open == coarse_open and first_sealed.isdisjoint(first_open)
    assert ratio_sealed | ratio_open == first_open and ratio_sealed.isdisjoint(ratio_open)
    assert five_sealed == ratio_open
    layers = [coarse_sealed, first_sealed, ratio_sealed, five_sealed]
    assert [len(layer) for layer in layers] == [92, 4, 4, 5]
    assert all(layers[i].isdisjoint(layers[j]) for i in range(4) for j in range(i + 1, 4))
    assert set().union(*layers) == domain
    assert layers_audit["counts"]["coarse_zero_negative"] == 92
    assert layers_audit["counts"]["first_refinement_zero_negative"] == 4
    assert layers_audit["counts"]["ratio_lift_zero_negative"] == 4
    assert five_audit["status"] == "PASS_INDEPENDENT_PARTITION_DELTA0_NEW_LEAF_MASK3_ALL_5_FINITE_MIDDLE_RESIDUAL"

    route = {}
    for label, cells in zip(("COARSE_BOX", "EDGE_RATIO_REFINEMENT", "DELETION_RATIO_LIFT", "FIVE_CELL_STRUCTURAL_PACKAGE"), layers):
        for current in cells:
            assert current not in route
            route[current] = label
    rows = [
        {"N": N, "r": r, "m": m, "status": "SEALED", "route": route[(N, r, m)]}
        for N, r, m in sorted(domain)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-middle-complete-assembled-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_MIDDLE_ALL_105",
        "scope": "26<=N<=39, r>=10, m=N-r>=16, Delta0/new-leaf/mask3.",
        "partition_counts": {
            "coarse_box": 92,
            "edge_ratio_refinement": 4,
            "deletion_ratio_lift": 4,
            "five_cell_structural_package": 5,
            "total": 105,
            "open": 0,
        },
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": (
            "This closes exactly the 105 finite-middle cells. The finite low-r "
            "and small-m wings, three infinite tails, and their complete mask3 "
            "assembler remain separate obligations; Problem 993 remains open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION", payload["partition_counts"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
