#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=42."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source42_delta1d41_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source43_delta1d42.py":
        "AC599E484CB115B51411EF18FB0CDABE009D37B815708F369D7B0FB29F4BA078",
    "rank8_delta1_new_leaf_gate_source43_delta1d42_20260825.json":
        "C47388E65A7F05F92658507330AA8D584E4D31E54589B7C92BDA26DFC82533EA",
    "audit_rank8_delta1_new_leaf_gate_source43_delta1d42.py":
        "CFF9DE8B5B9D16EEBC5EA10281DC6452A96FD7B382BE8B3531EA4FE640FF977B",
    "rank8_delta1_new_leaf_gate_source43_independent_audit_delta1d42_20260825.json":
        "A0C2F4BEAE9F4A511E7FF1227E71A34B8AFC74A5867D9493BDC5517058EBF586",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order41_delta1d41.py":
        "67F96798EDAB374DBCA89F20560B5E75FFCA3B5EBC93A31C517F2A787418553C",
    "rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json":
        "2712CB0DE3DC5236C4E4419F1765D0B5B6EA12658FF7E99DCC47EE5DE6D29360",
    "audit_rank8_delta1_new_leaf_mask3_order41_assembly_delta1d41.py":
        "B5B459EB7EF69DDF27BC0358C8C79C15D6D1F00E44B9A74FD7A43E510109439B",
    "rank8_delta1_new_leaf_mask3_order41_assembly_independent_audit_delta1d41_20260825.json":
        "37FE1052D251FDF74044287849974AFAF07785D30633C8B25A1752BB227A03C4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source43_delta1d42_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source43_independent_audit_delta1d42_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order41 = load("rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json")
    order41_audit = load(
        "rank8_delta1_new_leaf_mask3_order41_assembly_"
        "independent_audit_delta1d41_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_43"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_43"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order41["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_41"
    assert order41_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_41"
    )
    assert order41["aggregate"] == order41_audit["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert upper["D_order_cutoff"] == 42
    assert upper["source_A_order_cutoff"] == 43
    assert upper["extended_tree_order_cutoff"] == 44

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source42-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_42"
        ),
        "theorem": (
            "Let A be a tree of order at least 42, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-43 gate supplies all endpoints and separate concavity for every D order at least 42.",
            "Masks 0,1,2 cover D order 41 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 41.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 41.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=42.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 41, "last_D_order": 41},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 41,
        "source_A_order_cutoff": 42,
        "extended_tree_order_cutoff": 43,
        "order41_certificate_aggregate": order41["aggregate"],
        "order41_certificate_ordered_partition_digest_sha256": (
            order41_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=42. Source orders 27..41, the remaining Delta2/3 "
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
