#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=43."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source43_delta1d42_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source44_delta1d43.py":
        "F501B4B649F87C796E9A7DC17081F6395F576D1BEC8E83BB44821062EC59B877",
    "rank8_delta1_new_leaf_gate_source44_delta1d43_20260825.json":
        "C47198613AB94C0FC8C91DDC68884D406B02C2D2FD6E937BB85986587D4ECCB8",
    "audit_rank8_delta1_new_leaf_gate_source44_delta1d43.py":
        "395604004AF2D26580EA044FE6EF0FD2BCF084E85DD972940FDFEBB70C9DFC62",
    "rank8_delta1_new_leaf_gate_source44_independent_audit_delta1d43_20260825.json":
        "F3347EB183C7F23AD37CCD403A6A44DAF596581DA261A25411897FE15F8C3AB0",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order42_delta1d42.py":
        "53BBCD3AB0013BC27604F96736294561A732A62F147E638B3A3C67917DC5EE9A",
    "rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json":
        "8D429EC79FC4759455A762DA1A13E0C19B9D18A4235BEA5ACC34DCAAFA98DCF7",
    "audit_rank8_delta1_new_leaf_mask3_order42_assembly_delta1d42.py":
        "BEC7251AC321CCE92C571712B9E1FED2EECBBCD451D5CE217DF6AAD80D10CCDC",
    "rank8_delta1_new_leaf_mask3_order42_assembly_independent_audit_delta1d42_20260825.json":
        "F46B92A6B30A8C4846CE8FC4425C0A7DAEC5EED23CE0896893A4DDDC2521A2D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source44_delta1d43_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source44_independent_audit_delta1d43_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order42 = load("rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json")
    order42_audit = load(
        "rank8_delta1_new_leaf_mask3_order42_assembly_"
        "independent_audit_delta1d42_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_44"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_44"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order42["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_42"
    assert order42_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_42"
    )
    assert order42["aggregate"] == order42_audit["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert upper["D_order_cutoff"] == 43
    assert upper["source_A_order_cutoff"] == 44
    assert upper["extended_tree_order_cutoff"] == 45

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source43-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_43"
        ),
        "theorem": (
            "Let A be a tree of order at least 43, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-44 gate supplies all endpoints and separate concavity for every D order at least 43.",
            "Masks 0,1,2 cover D order 42 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 42.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 42.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=43.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 42, "last_D_order": 42},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 42,
        "source_A_order_cutoff": 43,
        "extended_tree_order_cutoff": 44,
        "order42_certificate_aggregate": order42["aggregate"],
        "order42_certificate_ordered_partition_digest_sha256": (
            order42_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=43. Source orders 27..42, the remaining Delta2/3 "
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
