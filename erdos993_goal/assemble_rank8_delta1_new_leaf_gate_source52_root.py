#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=52."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source52_root_20260825.json"

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source55_root.py":
        "BF7D5B6404F79ED8A371354C7B2D210F28E765287C1325EC03DC1159999ADFBA",
    "rank8_delta1_new_leaf_gate_source55_root_20260825.json":
        "BB31F7DE802FF6415EBC7C761E99D04541B63264F00F3421FBAB177602CF7941",
    "audit_rank8_delta1_new_leaf_gate_source55_root.py":
        "1EF67456410F271BD7ACB58C5A6537E82CFF69DE441940EEF7771C8ABF528A1D",
    "rank8_delta1_new_leaf_gate_source55_independent_audit_root_20260825.json":
        "55D3AF1F9DCA9F5B618B8F93AEE0E8161B148EB5C132FB8708CE7ED527F8324F",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root.py":
        "6AE7C4A9D228DC3726212B245B762E80E9E33E77AE2AC7A783E45C5475A37ED3",
    "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root_20260825.json":
        "C86843D171CF1BFCDF8E1623B746E68F052C6E1E3E7AD00575079EFAB0287792",
    "audit_rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root.py":
        "D65E2FE18EEF4C64575BA997052AEA0D1040FC26EBD9A98F6D8D3D2C16C068EE",
    "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_independent_audit_root_20260825.json":
        "5F54F4F133A440CCAD5932F288641E3C30891BA4FE49713B6D5B803744908899",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source55_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source55_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    low = load("rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root_20260825.json")
    low_audit = load(
        "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_"
        "independent_audit_root_20260825.json"
    )

    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_55"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_55"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert [row["mask"] for row in masks012["certified_masks"]] == [0, 1, 2]
    assert low["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_51_THROUGH_53"
    )
    assert low_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_51_THROUGH_53"
    )
    assert low["order_partition"] == {
        "first": 51,
        "last": 53,
        "count": 3,
        "small_F_rule": "M=|F|<=floor(2N/3)",
        "large_F_rule": "M=|F|>=floor(2N/3)+1",
    }
    assert low["aggregate"]["negative"] == 0
    assert low["aggregate"]["orders"] == 3
    assert low_audit["aggregate"]["negative"] == 0
    assert low_audit["aggregate"]["orders"] == 3
    for key in ("orders", "regions", "coefficients", "negative", "zero", "positive"):
        assert low["aggregate"][key] == low_audit["aggregate"][key]

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source52-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_52"
        ),
        "theorem": (
            "Let A be a tree of order at least 52, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-55 gate supplies separate concavity, all four endpoint identities, and mask 3 for every D order at least 54.",
            "The masks 0,1,2 certificate applies for every D order at least 26.",
            "The independently reconstructed coupled-F certificate supplies mask 3 for each D order 51, 52, and 53.",
            "Thus every endpoint is nonnegative for every D order at least 51; separate concavity makes the whole c8-by-d7 rectangle nonnegative.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=52.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 51, "last_D_order": 53},
            {"first_D_order": 54, "last_D_order": 179},
            {"first_D_order": 180, "last_D_order": None},
        ],
        "D_order_cutoff": 51,
        "source_A_order_cutoff": 52,
        "extended_tree_order_cutoff": 53,
        "low_certificate_aggregate": low["aggregate"],
        "low_certificate_ordered_region_digest_sha256": (
            low_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=52. Source orders 27..51, the Delta2/3 new-leaf gates, "
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
