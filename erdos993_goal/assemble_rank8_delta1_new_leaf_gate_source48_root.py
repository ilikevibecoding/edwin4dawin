#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=48."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source48_root_20260825.json"

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source49_root.py":
        "B28072F58553F4D7E34CF9D30B2787D76D6CFF965DB90FD38768D49B05DB1E75",
    "rank8_delta1_new_leaf_gate_source49_root_20260825.json":
        "B2104ABE611946543272D609B077CD54E5EFC4F86EF85A7FF9652480268A83B7",
    "audit_rank8_delta1_new_leaf_gate_source49_root.py":
        "26CEB11CC8A48806E4FEF1DCDCB3E3728783A28573202ADC70C0B727B44951AF",
    "rank8_delta1_new_leaf_gate_source49_independent_audit_root_20260825.json":
        "A0D915C9EE96A6BD24C6B51650FCBA0E7D9ED990FCE14CFD2DAB7F7D3690819B",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root.py":
        "3F60EC8F6565056131FBB2A54C59BB6738F4AB5EFB7BBBDD9A6EADE5378A843A",
    "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root_20260825.json":
        "58E8301FEEB3850083C75AB3BC9CEF03FDD9E607B1F5BA318EEF24341DC6671B",
    "audit_rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root.py":
        "AB374F0CFD2B1D05411CFC871DE88AC82E6433F3E0EE0BF23D47B7EBAA2C78F7",
    "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_independent_audit_root_20260825.json":
        "ADDD32C80AEDF128B99A569D833B25975B5C6DAD61AEE3E134BD3B6F8ADBB724",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source49_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source49_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    order47 = load(
        "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root_20260825.json"
    )
    order47_audit = load(
        "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_"
        "independent_audit_root_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_49"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_49"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert order47["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_47"
    assert order47_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_47"
    )
    assert order47["aggregate"]["regions"] == order47_audit["aggregate"]["regions"] == 140
    assert order47["aggregate"]["coefficients"] == order47_audit["aggregate"]["coefficients"] == 167700
    assert order47["aggregate"]["negative"] == order47_audit["aggregate"]["negative"] == 0

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source48-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_48"
        ),
        "theorem": (
            "Let A be a tree of order at least 48, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-49 gate supplies all endpoints and separate concavity for every D order at least 48.",
            "Masks 0,1,2 apply at D order 47 because they cover every D order at least 26.",
            "The independently reconstructed refined exact-F certificate supplies mask 3 at D order 47.",
            "Therefore all four endpoints and, by separate concavity, the full rectangle are nonnegative for every D order at least 47.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=48.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 47, "last_D_order": 47},
            {"first_D_order": 48, "last_D_order": 50},
            {"first_D_order": 51, "last_D_order": 53},
            {"first_D_order": 54, "last_D_order": 179},
            {"first_D_order": 180, "last_D_order": None},
        ],
        "D_order_cutoff": 47,
        "source_A_order_cutoff": 48,
        "extended_tree_order_cutoff": 49,
        "order47_certificate_aggregate": order47["aggregate"],
        "order47_certificate_ordered_region_digest_sha256": (
            order47_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=48. Source orders 27..47, the Delta2/3 new-leaf gates, "
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
