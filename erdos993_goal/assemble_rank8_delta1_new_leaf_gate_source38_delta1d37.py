#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=38."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source38_delta1d37_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source39_delta1d38.py":
        "763326798816E6C205611F8E1A4A967E833C7B5C83B72C3C11A0A343AC387B82",
    "rank8_delta1_new_leaf_gate_source39_delta1d38_20260825.json":
        "6F1E7A0359C84430958F749B38508840083AFD24F73E46281653A6D0E7B631B6",
    "audit_rank8_delta1_new_leaf_gate_source39_delta1d38.py":
        "F7A217D5B376DA71F04FAF2837269F008CFC4E10F5E1240AEB3C74445D2BE4E2",
    "rank8_delta1_new_leaf_gate_source39_independent_audit_delta1d38_20260825.json":
        "410B95401F54C89C48A4F92745615045341ED139BB70354FD60F24A2F0CC33EE",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order37_delta1d37.py":
        "130A33A0A48A299DE9583C0A214C1295764518EBD65830A2AFA3B9FBC2466726",
    "rank8_delta1_new_leaf_mask3_order37_delta1d37_20260825.json":
        "2211E11221BD888678A85A058067C82C5E991E606AE7BDC8A8B376D3D5F961BE",
    "audit_rank8_delta1_new_leaf_mask3_order37_assembly_delta1d37.py":
        "AA449FE997407222BA752A88F634A942BCBB76A3BE870F8C4ECE2F85D0C94B65",
    "rank8_delta1_new_leaf_mask3_order37_assembly_independent_audit_delta1d37_20260825.json":
        "22CB24B2FFB5DEAF4E6D258A6726B96FED261743369EEAB2787D3C38B23EB96C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert len(EXPECTED) == 10
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source39_delta1d38_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source39_independent_audit_delta1d38_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order37 = load("rank8_delta1_new_leaf_mask3_order37_delta1d37_20260825.json")
    order37_audit = load(
        "rank8_delta1_new_leaf_mask3_order37_assembly_"
        "independent_audit_delta1d37_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_39"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_39"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert order37["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_37"
    assert order37_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_37"
    )
    assert order37["aggregate"] == order37_audit["aggregate"] == {
        "regions": 850, "coefficients": 1018200,
        "negative": 0, "zero": 0, "positive": 1018200,
    }
    assert upper["D_order_cutoff"] == 38
    assert upper["source_A_order_cutoff"] == 39
    assert upper["extended_tree_order_cutoff"] == 40

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source38-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_38"
        ),
        "theorem": (
            "Let A be a tree of order at least 38, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-39 gate supplies all endpoints and separate concavity for every D order at least 38.",
            "Masks 0,1,2 cover D order 37 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/bridge/exact-F certificate supplies mask 3 at D order 37.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 37.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=38.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 37, "last_D_order": 37},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 37,
        "source_A_order_cutoff": 38,
        "extended_tree_order_cutoff": 39,
        "order37_certificate_aggregate": order37["aggregate"],
        "order37_certificate_ordered_partition_digest_sha256": (
            order37_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=38. Source orders 27..37, the remaining Delta2/3 "
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
