#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=39."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source39_delta1d38_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source40_delta1d39.py":
        "CD022A88F87298C41938D77B06D59DB1D0F1FDA0C75810717CBCA6163EE003AC",
    "rank8_delta1_new_leaf_gate_source40_delta1d39_20260825.json":
        "ED00F446FA3F7A4719BB683DC7634BEC79591EF28F5C0264F4867396C89579B8",
    "audit_rank8_delta1_new_leaf_gate_source40_delta1d39.py":
        "476F05B4A0315E178B0ADF0FA2111AB5AB2F456DE8DEFFB0680A5D0F58B7D0DD",
    "rank8_delta1_new_leaf_gate_source40_independent_audit_delta1d39_20260825.json":
        "223E8BC7206F2B8C87A72CCD45F61E07551BA4E97ACDAC682F17D5D74F4AA160",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order38_delta1d38.py":
        "03B307F1526A90DDB6B3D8DEC774851799A62A1CA8F7A9F5AF6E6D89B4966A9D",
    "rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json":
        "9FBA55E56968D39575E03B04558335505773842046C7EA9FA3F3E5B2EA30E32D",
    "audit_rank8_delta1_new_leaf_mask3_order38_assembly_delta1d38.py":
        "B0B905950A343EC0D73A4026788689AD3A2E260C9AC04C409DB7BD89F232AC97",
    "rank8_delta1_new_leaf_mask3_order38_assembly_independent_audit_delta1d38_20260825.json":
        "011551E69B4B873423025B2166F03161572331BDFD22EE78BCB5479648E3B00F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source40_delta1d39_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source40_independent_audit_delta1d39_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order38 = load("rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json")
    order38_audit = load(
        "rank8_delta1_new_leaf_mask3_order38_assembly_"
        "independent_audit_delta1d38_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_40"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_40"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order38["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_38"
    assert order38_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_38"
    )
    assert order38["aggregate"] == order38_audit["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert upper["D_order_cutoff"] == 39
    assert upper["source_A_order_cutoff"] == 40
    assert upper["extended_tree_order_cutoff"] == 41

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source39-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_39"
        ),
        "theorem": (
            "Let A be a tree of order at least 39, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-40 gate supplies all endpoints and separate concavity for every D order at least 39.",
            "Masks 0,1,2 cover D order 38 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 38.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 38.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=39.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 38, "last_D_order": 38},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 38,
        "source_A_order_cutoff": 39,
        "extended_tree_order_cutoff": 40,
        "order38_certificate_aggregate": order38["aggregate"],
        "order38_certificate_ordered_partition_digest_sha256": (
            order38_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=39. Source orders 27..38, the remaining Delta2/3 "
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
