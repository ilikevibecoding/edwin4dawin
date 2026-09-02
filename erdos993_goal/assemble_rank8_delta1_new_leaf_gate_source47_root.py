#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=47."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source47_root_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source48_root.py":
        "F73AA558913480E9FD55A34FB1854FE3086941D3FCF5612AC3397B8056991445",
    "rank8_delta1_new_leaf_gate_source48_root_20260825.json":
        "34ED3348A404D8A6E9FB54DF9BFD5DBA63B0AEED29FC58B6CDBF29743A4E0AA5",
    "audit_rank8_delta1_new_leaf_gate_source48_root.py":
        "F0ED8D98FAB8A0636AD799183DDC1C6C4DF5F04EAA6C740CEFC039363F10A1F4",
    "rank8_delta1_new_leaf_gate_source48_independent_audit_root_20260825.json":
        "30F0CC47382C5E03905AFAEEB080763F1CB77EA3A763FF8E506A0FB1ED84B178",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_order46_refined_exact_F_root.py":
        "C12416EFD929E3FBF3769338CF2FB777DD4A6AAFADA52CD622BA07F1563FA251",
    "rank8_delta1_new_leaf_mask3_order46_refined_exact_F_root_20260825.json":
        "9CB86C0A303215A183EC2F7585E14D89E84AE3F2E951C06BADC135A90AE7F71D",
    "audit_rank8_delta1_new_leaf_mask3_order46_refined_exact_F_root.py":
        "E587DC1E3A87D7323C103E345E70EA3B1D5256070A44AC58D4121C5A3DE04DA9",
    "rank8_delta1_new_leaf_mask3_order46_refined_exact_F_independent_audit_root_20260825.json":
        "F08A5EBA52E946CCDAAF1EF48336C3867CBD48EF886E2011D2E0A09C2D34AC8E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source48_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source48_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    order46 = load(
        "rank8_delta1_new_leaf_mask3_order46_refined_exact_F_root_20260825.json"
    )
    order46_audit = load(
        "rank8_delta1_new_leaf_mask3_order46_refined_exact_F_"
        "independent_audit_root_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_48"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_48"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert order46["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_46"
    assert order46_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_46"
    )
    assert order46["aggregate"]["regions"] == order46_audit["aggregate"]["regions"] == 148
    assert order46["aggregate"]["coefficients"] == order46_audit["aggregate"]["coefficients"] == 177300
    assert order46["aggregate"]["negative"] == order46_audit["aggregate"]["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source47-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_47"
        ),
        "theorem": (
            "Let A be a tree of order at least 47, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-48 gate supplies all endpoints and separate concavity for every D order at least 47.",
            "Masks 0,1,2 cover D order 46 because they apply for every D order at least 26.",
            "The independently reconstructed refined exact-F certificate supplies mask 3 at D order 46.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 46.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=47.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 46, "last_D_order": 46},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 46,
        "source_A_order_cutoff": 47,
        "extended_tree_order_cutoff": 48,
        "order46_certificate_aggregate": order46["aggregate"],
        "order46_certificate_ordered_region_digest_sha256": (
            order46_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=47. Source orders 27..46, the Delta2/3 new-leaf gates, "
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
