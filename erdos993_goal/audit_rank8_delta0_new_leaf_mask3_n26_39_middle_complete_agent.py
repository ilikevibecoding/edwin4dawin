#!/usr/bin/env python3
"""Independent no-gap audit of the complete 105-cell mask-3 middle region."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_middle_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask3_n26_39_middle_complete_agent.py":
        "B22AF06555FB70237C11C6AB312F6DB23754AC0FD802CE5B39747EC1168BBD65",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json":
        "86324524111FE152AB1856AC000D5DE9989E103ADC873D71B1B14D49DAA9FDA1",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_middle_layers_agent.py":
        "A87A3D07012D75DAE09CF14307EA6F1EF0AF39DD9A27D694531EBCE53D18D716",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_layers_independent_audit_agent_20260823.json":
        "020E409530F99A7244FE681E71C318B4BC66725235DA5DC275BA0388145053EA",
    "audit_rank8_delta0_new_leaf_mask3_5_finite_middle_residual_agent.py":
        "D67462D3E705DEF004186D247B35D1207A0041180CCEE8260BCE639BA2010019",
    "rank8_delta0_new_leaf_mask3_5_finite_middle_residual_independent_audit_agent_20260823.json":
        "34CADCA0E7A048E26D83633352AC1B7FE78B452FC18BC64E5727A83755BE65EA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def cell_set(rows) -> set[tuple[int, int, int]]:
    return {tuple(row) for row in rows}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    assembled = load("rank8_delta0_new_leaf_mask3_n26_39_middle_complete_assembled_agent_20260823.json")
    layers = load("rank8_delta0_new_leaf_mask3_n26_39_middle_layers_independent_audit_agent_20260823.json")
    five = load("rank8_delta0_new_leaf_mask3_5_finite_middle_residual_independent_audit_agent_20260823.json")
    assert layers["status"] == "PASS_INDEPENDENT_LITERAL_MASK3_N26_39_MIDDLE_92_PLUS_4_PLUS_4_PARTITION"
    assert five["status"] == "PASS_INDEPENDENT_PARTITION_DELTA0_NEW_LEAF_MASK3_ALL_5_FINITE_MIDDLE_RESIDUAL"

    domain = {(N, r, N - r) for N in range(26, 40) for r in range(10, N - 15)}
    after_coarse = cell_set(layers["open_chain"]["after_coarse"])
    after_first = cell_set(layers["open_chain"]["after_first_refinement"])
    after_ratio = cell_set(layers["open_chain"]["after_ratio_lift"])
    expected_five = {
        (26, 10, 16),
        (27, 10, 17),
        (27, 11, 16),
        (28, 11, 17),
        (28, 12, 16),
    }
    assert after_ratio == expected_five
    partitions = [domain - after_coarse, after_coarse - after_first, after_first - after_ratio, after_ratio]
    assert [len(value) for value in partitions] == [92, 4, 4, 5]
    assert all(partitions[i].isdisjoint(partitions[j]) for i in range(4) for j in range(i + 1, 4))
    assert set().union(*partitions) == domain and len(domain) == 105

    assembled_rows = {(row["N"], row["r"], row["m"]): row for row in assembled["rows"]}
    assert set(assembled_rows) == domain and len(assembled["rows"]) == 105
    labels = ("COARSE_BOX", "EDGE_RATIO_REFINEMENT", "DELETION_RATIO_LIFT", "FIVE_CELL_STRUCTURAL_PACKAGE")
    for label, partition in zip(labels, partitions):
        assert all(assembled_rows[current]["route"] == label for current in partition)
    assert all(row["status"] == "SEALED" for row in assembled_rows.values())

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-middle-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_DELTA0_NEW_LEAF_MASK3_N26_39_MIDDLE_ALL_105",
        "hashes": hashes,
        "partition_counts": {
            "coarse_box": 92,
            "edge_ratio_refinement": 4,
            "deletion_ratio_lift": 4,
            "five_cell_structural_package": 5,
            "total": 105,
            "overlap": 0,
            "missing": 0,
        },
        "proof_boundary": assembled["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION", payload["partition_counts"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
