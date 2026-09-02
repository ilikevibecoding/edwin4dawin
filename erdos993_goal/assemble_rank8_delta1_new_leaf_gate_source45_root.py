#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=45."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source45_root_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source46_root.py":
        "C6BBE74A5228DCA26A09D0E728A8494792F3956EFFB48987E685C516E16D5630",
    "rank8_delta1_new_leaf_gate_source46_root_20260825.json":
        "FCEAE3E57DEA030CFAC92218B545A7C1783ED748D5A793C07F42B656011F7E9A",
    "audit_rank8_delta1_new_leaf_gate_source46_root.py":
        "B0CFA876E92004DCD42522B6F7B43084FFCA517644CFC4F7151ECA98197B833A",
    "rank8_delta1_new_leaf_gate_source46_independent_audit_root_20260825.json":
        "3F807822844DBF5CFB975A4192CF832D3C534971D10F6922CAD396443605E8AD",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_q5_exact_F_generic_root.py":
        "025C4A1E43061621DBBED57A24DEB34B2A305ADA4EA5C53460C5E975A4001910",
    "rank8_delta1_new_leaf_mask3_order44_q5_exact_F_root_20260825.json":
        "A0B089CD6C60ABA029B1703C964E1EB19D13959075AD00843E3BD1A2F9773B88",
    "audit_rank8_delta1_new_leaf_mask3_q5_exact_F_generic_root.py":
        "9038EF9D07AAA85BADB7499554B86CC31CFE071654AEA8C5A40E6A5451FD40AF",
    "rank8_delta1_new_leaf_mask3_order44_q5_exact_F_independent_audit_root_20260825.json":
        "C541D4F84BEC3A64C5FF5AA7FB17C6EA823A3048BEECCCC8627F45DC46844FE5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source46_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source46_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    order44 = load(
        "rank8_delta1_new_leaf_mask3_order44_q5_exact_F_root_20260825.json"
    )
    order44_audit = load(
        "rank8_delta1_new_leaf_mask3_order44_q5_exact_F_"
        "independent_audit_root_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_46"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_46"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert order44["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_44"
    assert order44_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_44"
    )
    assert order44["aggregate"]["regions"] == order44_audit["aggregate"]["regions"] == 200
    assert order44["aggregate"]["coefficients"] == order44_audit["aggregate"]["coefficients"] == 240000
    assert order44["aggregate"]["negative"] == order44_audit["aggregate"]["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source45-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_45"
        ),
        "theorem": (
            "Let A be a tree of order at least 45, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-46 gate supplies all endpoints and separate concavity for every D order at least 45.",
            "Masks 0,1,2 cover D order 44 because they apply for every D order at least 26.",
            "The independently reconstructed Q5-compatible exact-F certificate supplies mask 3 at D order 44.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 44.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=45.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 44, "last_D_order": 44},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 44,
        "source_A_order_cutoff": 45,
        "extended_tree_order_cutoff": 46,
        "order44_certificate_aggregate": order44["aggregate"],
        "order44_certificate_ordered_region_digest_sha256": (
            order44_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=45. Source orders 27..44, the Delta2/3 new-leaf gates, "
            "all old-root increment gates, connected Q8, forest Q8, rank-eight "
            "PGC, and Erdos Problem 993 remain outside this certificate."
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
