#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=49."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source49_root_20260825.json"

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source52_root.py":
        "75E91650616DAFA75515E16DC8E668CB61D642ACF678DFB4F85C6E5FA4490864",
    "rank8_delta1_new_leaf_gate_source52_root_20260825.json":
        "17DA8DD5973BCF8692F532FD2C7B3B8B2917B4D492FB55917B54ABBA956E01CB",
    "audit_rank8_delta1_new_leaf_gate_source52_root.py":
        "FFE65EDF82482ACDF53C3F319B884400404B414E7B61F805F9CE4076E554DB05",
    "rank8_delta1_new_leaf_gate_source52_independent_audit_root_20260825.json":
        "DE6A43A6BDB4BBDDE5EA2E4B823B6318B9B85CE4C25F9696B520DF77354543BE",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root.py":
        "1FB209E9B32097C37C143BA00814A79064BE898540428A7B009F5361FA9AA2C1",
    "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root_20260825.json":
        "C83ADC5157FE1B651BBF66D685547F69AF0203D1171A789D7EC2DD03652FC2A0",
    "audit_rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root.py":
        "D7FCADBFA56EB0A74CEC2FBAA38C014E3FADEEA0A1C53B1208FC00C71EEA30A5",
    "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_independent_audit_root_20260825.json":
        "1F3A8DB85F3470E038318E658A87CD40535DE41BDF8D899319DC23DF8204BAC7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source52_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source52_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    low = load(
        "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root_20260825.json"
    )
    low_audit = load(
        "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_"
        "independent_audit_root_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_52"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_52"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert low["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_48_THROUGH_50"
    )
    assert low_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_48_THROUGH_50"
    )
    assert low["aggregate"]["orders"] == low_audit["aggregate"]["orders"] == 3
    assert low["aggregate"]["regions"] == low_audit["aggregate"]["regions"] == 102
    assert low["aggregate"]["coefficients"] == low_audit["aggregate"]["coefficients"] == 121500
    assert low["aggregate"]["negative"] == low_audit["aggregate"]["negative"] == 0

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source49-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_49"
        ),
        "theorem": (
            "Let A be a tree of order at least 49, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-52 gate supplies separate concavity and all endpoints for every D order at least 51.",
            "Masks 0,1,2 apply for every D order at least 26.",
            "The independently reconstructed exact-F certificate supplies mask 3 for D orders 48, 49, and 50.",
            "Thus every endpoint and, by separate concavity, the entire rectangle is nonnegative for every D order at least 48.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=49.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 48, "last_D_order": 50},
            {"first_D_order": 51, "last_D_order": 53},
            {"first_D_order": 54, "last_D_order": 179},
            {"first_D_order": 180, "last_D_order": None},
        ],
        "D_order_cutoff": 48,
        "source_A_order_cutoff": 49,
        "extended_tree_order_cutoff": 50,
        "low_certificate_aggregate": low["aggregate"],
        "low_certificate_ordered_region_digest_sha256": (
            low_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=49. Source orders 27..48, the Delta2/3 new-leaf gates, "
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
