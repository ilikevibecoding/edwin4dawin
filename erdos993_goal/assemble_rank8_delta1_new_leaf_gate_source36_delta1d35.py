#!/usr/bin/env python3
"""Fail-closed extension of the Delta1 inserted-leaf gate to |A|>=36."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source36_delta1d35_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source37_delta1d36.py": "CB63188EC5C840AD03CE2899FA986D58D4AC2162C61B9233BA58F8789AE5C85F",
    "rank8_delta1_new_leaf_gate_source37_delta1d36_20260825.json": "514A04DB8664620AE482F302FAD11C7A7361E0F1987C603545FBF01C83C9398E",
    "audit_rank8_delta1_new_leaf_gate_source37_delta1d36.py": "0F3E69EF47249BF8005AEAAD6B177CFF60F7C4A9F7375D654A07722577E3D82E",
    "rank8_delta1_new_leaf_gate_source37_independent_audit_delta1d36_20260825.json": "4A08CDF7C9C4411F86C9BECC8EDD6FD4C8EB00B4CCABAD96710E546EC76675BA",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json": "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json": "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order35_delta1d35.py": "609EF70A91DF7770D4827D3806EA7157C9E4106D5344CAA33313D3829793468E",
    "rank8_delta1_new_leaf_mask3_order35_delta1d35_20260825.json": "B394850E6B8B7A56931E571BF805E517A855C2B244104FF74A6D22A2B36E5828",
    "audit_rank8_delta1_new_leaf_mask3_order35_assembly_delta1d35.py": "43FD1C0AE44D09ED6BDFCA32646C051D8635739FF6B057F1C65FE2BFA6974318",
    "rank8_delta1_new_leaf_mask3_order35_assembly_independent_audit_delta1d35_20260825.json": "B48B88AF6497CCBFEEC8CEFF48A9A2B1B3AF8E4B17A52CFC07D85A333BF58DED",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source37_delta1d36_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source37_independent_audit_delta1d36_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order35 = load("rank8_delta1_new_leaf_mask3_order35_delta1d35_20260825.json")
    order35_audit = load(
        "rank8_delta1_new_leaf_mask3_order35_assembly_"
        "independent_audit_delta1d35_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_37"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_37"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    assert order35["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_35"
    assert order35_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_35"
    )
    assert order35["aggregate"] == order35_audit["aggregate"] == {
        "regions": 556, "coefficients": 675000,
        "negative": 0, "zero": 0, "positive": 675000,
    }
    assert upper["D_order_cutoff"] == 36
    assert upper["source_A_order_cutoff"] == 37
    assert upper["extended_tree_order_cutoff"] == 38

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source36-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_36"
        ),
        "theorem": (
            "Let A be a tree of order at least 36, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-37 gate supplies every endpoint and separate concavity for D orders at least 36.",
            "Masks 0,1,2 cover D order 35 because their independent containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/bridge/exact-F certificate supplies mask 3 at D order 35.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 35.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=36.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 35, "last_D_order": 35},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 35,
        "source_A_order_cutoff": 36,
        "extended_tree_order_cutoff": 37,
        "order35_certificate_aggregate": order35["aggregate"],
        "order35_certificate_ordered_partition_digest_sha256": (
            order35_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=36. Source orders 27..35, the remaining Delta2 "
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
