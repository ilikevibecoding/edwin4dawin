#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=40."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source40_delta1d39_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source41_delta1d40.py":
        "3D18C80B0E29D691B8E7ED2EACBFBCEDC13355831DD1C3575B7E063D9665158E",
    "rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json":
        "EF2A31B3FAC3D02FB390FE92A7334D81B2B8B1844EF0B67AE5219E6F9E1AE146",
    "audit_rank8_delta1_new_leaf_gate_source41_delta1d40.py":
        "33C05A9ED97C23C02BE17AD8AD1E0EDC21C188E9CCEE0C7A3E0FB8E889B6F4BB",
    "rank8_delta1_new_leaf_gate_source41_independent_audit_delta1d40_20260825.json":
        "7A775C87EB6B3AD2767D5C8D235759FE4642B1B8B107872AD6BF171D46B0C9F9",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order39_delta1d39.py":
        "4AAFBF0921EE7269AAD75E4956FFE0091A693D6E00011DCBBFCDDDD44D3D7B4F",
    "rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json":
        "43BA2B9BEA6D09B3C8ACD59D84E9FC4449C32C8C0E4534542DF938E0362574FC",
    "audit_rank8_delta1_new_leaf_mask3_order39_assembly_delta1d39.py":
        "80F70CA3FFB6D60F8486A3F5E9EEEA6612D7C58946A3E8228CBC0343FC166E73",
    "rank8_delta1_new_leaf_mask3_order39_assembly_independent_audit_delta1d39_20260825.json":
        "6B3B0734335B9866138B111135C36EFEB75542D9D33F20A23452FFD8D01048E8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source41_independent_audit_delta1d40_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order39 = load("rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json")
    order39_audit = load(
        "rank8_delta1_new_leaf_mask3_order39_assembly_"
        "independent_audit_delta1d39_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_41"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_41"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order39["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_39"
    assert order39_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_39"
    )
    assert order39["aggregate"] == order39_audit["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert upper["D_order_cutoff"] == 40
    assert upper["source_A_order_cutoff"] == 41
    assert upper["extended_tree_order_cutoff"] == 42

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source40-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_40"
        ),
        "theorem": (
            "Let A be a tree of order at least 40, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-41 gate supplies all endpoints and separate concavity for every D order at least 40.",
            "Masks 0,1,2 cover D order 39 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 39.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 39.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=40.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 39, "last_D_order": 39},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 39,
        "source_A_order_cutoff": 40,
        "extended_tree_order_cutoff": 41,
        "order39_certificate_aggregate": order39["aggregate"],
        "order39_certificate_ordered_partition_digest_sha256": (
            order39_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=40. Source orders 27..39, the remaining Delta2/3 "
            "work, old-root increment gates, connected Q8, forest Q8, "
            "rank-eight PGC, and Erdos Problem 993 remain outside this certificate."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
