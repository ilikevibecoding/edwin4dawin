#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=37."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source37_delta1d36_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source38_delta1d37.py":
        "D9E68B55FFD0C8C03D2B39C252A7CBF4BA57A56EB9B87C1B54639BCC171A9B1D",
    "rank8_delta1_new_leaf_gate_source38_delta1d37_20260825.json":
        "5F54DF5D79678E62F2D079479028309918B849EEADD3ADBBA2D230DD91A989AD",
    "audit_rank8_delta1_new_leaf_gate_source38_delta1d37.py":
        "ED7292C9BB81F2F8A65F8DDB92A76C7722B41B412A7FEC377C68AD25FE063339",
    "rank8_delta1_new_leaf_gate_source38_independent_audit_delta1d37_20260825.json":
        "C684C41F9E2635B661468545F924E490C4F3660DA0803F86A9216B99A18F870E",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "assemble_rank8_delta1_new_leaf_mask3_order36_delta1d36.py":
        "162A0F61F6224E61B47F290E07872EBBAB1C788B41AB18A218A7E54954900E7E",
    "rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json":
        "343ECCC16637FC8DABEAAD4C6C8188D13DCB9E5D94DA8904B236BA0C1F04823E",
    "audit_rank8_delta1_new_leaf_mask3_order36_assembly_delta1d36.py":
        "3FA9359336954DCB2573256F063256FA417FCCA1EF0B4D12049D9A60FDE5FC6A",
    "rank8_delta1_new_leaf_mask3_order36_assembly_independent_audit_delta1d36_20260825.json":
        "17D4C4EEA3CD10FB85D7935D348337B204CEBE8EF1EC22C98BA99B9C637111CA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert len(EXPECTED) == 10
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source38_delta1d37_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source38_independent_audit_delta1d37_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    order36 = load("rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json")
    order36_audit = load(
        "rank8_delta1_new_leaf_mask3_order36_assembly_"
        "independent_audit_delta1d36_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_38"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_38"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    assert order36["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_36"
    assert order36_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_36"
    )
    assert order36["aggregate"] == order36_audit["aggregate"] == {
        "regions": 732, "coefficients": 876600,
        "negative": 0, "zero": 0, "positive": 876600,
    }
    assert upper["D_order_cutoff"] == 37
    assert upper["source_A_order_cutoff"] == 38
    assert upper["extended_tree_order_cutoff"] == 39

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source37-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_37"
        ),
        "theorem": (
            "Let A be a tree of order at least 37, v any vertex, and form "
            "A+w by attaching a new leaf w at v. Then the Newton Delta1 "
            "terminal residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-38 gate supplies all endpoints and separate concavity for every D order at least 37.",
            "Masks 0,1,2 cover D order 36 because their independently audited containment certificate applies for every D order at least 26.",
            "The independently reconstructed small/bridge/exact-F certificate supplies mask 3 at D order 36.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 36.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=37.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 36, "last_D_order": 36},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 36,
        "source_A_order_cutoff": 37,
        "extended_tree_order_cutoff": 38,
        "order36_certificate_aggregate": order36["aggregate"],
        "order36_certificate_ordered_partition_digest_sha256": (
            order36_audit["ordered_partition_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the "
            "root and |A|>=37. Source orders 27..36, the remaining Delta2/3 "
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
