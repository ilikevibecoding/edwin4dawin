#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=41."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source42_delta1d41.py":
        "F84132D6FD090CECC917D447320CDDC89640DB0C1AC3DAADE4ED071359C78E29",
    "rank8_delta1_new_leaf_gate_source42_delta1d41_20260825.json":
        "044DFC4B935AB4961CCD5B846079F4C783A1E08704138349E1D3D78A76E59676",
    "audit_rank8_delta1_new_leaf_gate_source42_delta1d41.py":
        "23F81A27613EFF509A2E4D001905DA846A4BBDC2EE75EE91EF66096397633FD4",
    "rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json":
        "3F1459BDE8E33BB6824E651A2964F87876D5E8FEE8EA06AC67AE904A68AF37A4",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order40_delta1d40.py":
        "DE2EFD4AAEB6B6CEA3A5986121B09D89151CA674BD75DDCCA79AD8F3F99D3577",
    "rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json":
        "787F91A54C710E024AE8944DBF6C98686E5FD99B48E271BA50767A4C9DB96B46",
    "audit_rank8_delta1_new_leaf_mask3_order40_assembly_delta1d40.py":
        "058101ACC5AC5D061DB050AF6D2CE0BEEE3C5420A65D3D6B2AEC006EC1BCC617",
    "rank8_delta1_new_leaf_mask3_order40_assembly_independent_audit_delta1d40_20260825.json":
        "EBB3489B2A1BB3B9B6E2B00ADEFD0B6B4656E96825045AA8EA1520ABAE43DB84",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source42_delta1d41_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order40 = load("rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json")
    order40_audit = load(
        "rank8_delta1_new_leaf_mask3_order40_assembly_"
        "independent_audit_delta1d40_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_42"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_42"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order40["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40"
    assert order40_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40"
    )
    assert order40["aggregate"] == order40_audit["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert upper["D_order_cutoff"] == 41
    assert upper["source_A_order_cutoff"] == 42
    assert upper["extended_tree_order_cutoff"] == 43

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source41-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_41"
        ),
        "theorem": (
            "Let A be a tree of order at least 41, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-42 gate supplies all endpoints and separate concavity for every D order at least 41.",
            "Masks 0,1,2 cover D order 40 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 40.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 40.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=41.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 40, "last_D_order": 40},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 40,
        "source_A_order_cutoff": 41,
        "extended_tree_order_cutoff": 42,
        "order40_certificate_aggregate": order40["aggregate"],
        "order40_certificate_ordered_partition_digest_sha256": (
            order40_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=41. Source orders 27..40, the remaining Delta2/3 "
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
