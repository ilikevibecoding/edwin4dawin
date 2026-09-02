#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=44."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source44_delta1d43_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source45_root.py":
        "E8FF97FED2C52584B2E14A18CAB363D55FEB7D7DC73B9D104D52B1E355B20481",
    "rank8_delta1_new_leaf_gate_source45_root_20260825.json":
        "8F30A50CEA20C93D8AA018DE4ED3047A97B4AC3E31176E61032C1DE79229627E",
    "audit_rank8_delta1_new_leaf_gate_source45_root.py":
        "93F6A146B23520113FC340EADD6E8E2D7C62DF5D0A38BA76F8C735358EDBA795",
    "rank8_delta1_new_leaf_gate_source45_independent_audit_root_20260825.json":
        "4DF961D43E0ACCE5AE57E49896F56DDD697830EC4C730D2BF91A15E0BEF42886",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order43_delta1d43.py":
        "2894BCB5802DFE0DDB10A63565160AE0FD60F4F03D924C75B1302C1A130B11DF",
    "rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json":
        "DD8A2D5A76C6406BBA2056D540E89C8FA82A987895F0924A3156ECA3A429D68E",
    "audit_rank8_delta1_new_leaf_mask3_order43_assembly_delta1d43.py":
        "1F8DC3EA75AC8B75B3BCFD22E2C4CA809C802A7E053A10A0412B9A2856C01E21",
    "rank8_delta1_new_leaf_mask3_order43_assembly_independent_audit_delta1d43_20260825.json":
        "23706FF613AB4DB3ED825882BC8A3D75E9C42AFDCE951D039D6E41D06ED59118",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source45_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source45_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order43 = load("rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json")
    order43_audit = load(
        "rank8_delta1_new_leaf_mask3_order43_assembly_"
        "independent_audit_delta1d43_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_45"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_45"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order43["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_43"
    assert order43_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_43"
    )
    assert order43["aggregate"] == order43_audit["aggregate"] == {
        "regions": 1604,
        "coefficients": 1924200,
        "negative": 0,
        "zero": 0,
        "positive": 1924200,
    }
    assert upper["D_order_cutoff"] == 44
    assert upper["source_A_order_cutoff"] == 45
    assert upper["extended_tree_order_cutoff"] == 46

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source44-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_44"
        ),
        "theorem": (
            "Let A be a tree of order at least 44, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-45 gate supplies all endpoints and separate concavity for every D order at least 44.",
            "Masks 0,1,2 cover D order 43 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/exact-F certificate supplies mask 3 at D order 43.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 43.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=44.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 43, "last_D_order": 43},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 43,
        "source_A_order_cutoff": 44,
        "extended_tree_order_cutoff": 45,
        "order43_certificate_aggregate": order43["aggregate"],
        "order43_certificate_ordered_partition_digest_sha256": (
            order43_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=44. Source orders 27..43, the remaining Delta2/3 "
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
