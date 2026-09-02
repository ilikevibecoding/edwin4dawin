#!/usr/bin/env python3
"""Fail-closed assembly of the full Delta1 inserted-leaf gate for |A|>=55."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source55_root_20260825.json"

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_masks012_containment_certificate_root.py":
        "323D57BDE824D3BF2C49D898F7E02996F1E33EB1731A7216063DEDCFFDB0F3CA",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "B57C78913FDC93EA395E357FD0D649A0E296D761254CD45C2BCF0E471A860157",
    "rank8_delta1_new_leaf_mask3_orders54_179_F_split_root_20260825.json":
        "4C6A3DDBD170679F14E0AA6268CDED14F3EC8CC4A3522F13594EC2AFA289CA03",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "rank8_delta1_new_leaf_mask3_orders54_179_F_split_independent_audit_root_20260825.json":
        "A99F485ADE8B9DB4A1E514165D2F3E06193907F5FF98AE722CF793EE86D4AF4B",
    "prove_rank8_delta1_new_leaf_mask3_large_order_shadow_box_root.py":
        "88A36B35F4025046F6F41ABD539C2F1A30EFFF32E2FFF7491E7EBDF6546AFF1C",
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json":
        "3185E1FC1FC723CDD97E9B7B17B94583C5FDD5285D4BC26B0E9CD7CB7D082660",
    "audit_rank8_delta1_new_leaf_mask3_large_order_shadow_box_root.py":
        "B652F8783F17EA2E9E82A61E356CFC4E26BA3D90F41670893AE9DB0404A5CB09",
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_independent_audit_root_20260825.json":
        "B0AA2DEFE60FD5FAA81C0EEDC7B397EB0158A014147C651B9F39CDE857B451ED",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json":
        "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    finite = load(
        "rank8_delta1_new_leaf_mask3_orders54_179_F_split_root_20260825.json"
    )
    finite_audit = load(
        "rank8_delta1_new_leaf_mask3_orders54_179_F_split_"
        "independent_audit_root_20260825.json"
    )
    infinite = load(
        "rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json"
    )
    infinite_audit = load(
        "rank8_delta1_new_leaf_mask3_large_order_shadow_box_"
        "independent_audit_root_20260825.json"
    )
    symbolic = load(
        "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"
    )

    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert [row["mask"] for row in masks012["certified_masks"]] == [0, 1, 2]
    assert finite["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_54_THROUGH_179"
    )
    assert finite_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_54_THROUGH_179"
    )
    assert finite["order_partition"]["first"] == 54
    assert finite["order_partition"]["last"] == 179
    assert finite["order_partition"]["count"] == 126
    assert finite["aggregate"] == {
        key: finite_audit["aggregate"][key]
        for key in ("orders", "regions", "coefficients", "negative", "zero", "positive")
    }
    assert finite["aggregate"]["negative"] == 0
    assert infinite["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180"
    )
    assert infinite_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180"
    )
    assert infinite["cutoff_D_order"] == 180

    assert symbolic["status"] == "PASS_EXACT_IDENTITIES_DEPENDENCY_OPEN_NO_SIGN_CLAIM"
    delta1 = symbolic["families"]["new_leaf_root_raw"][1]
    assert delta1["rank"] == 1
    assert set(delta1["top_variable_derivatives"]) == {"c8", "d7"}
    for variable in ("c8", "d7"):
        curvature = delta1["top_variable_derivatives"][variable]
        assert curvature["degree"] == 2
        assert curvature["second_derivative"]["orientation"] == (
            "COEFFICIENTWISE_NONPOSITIVE"
        )
        assert curvature["second_derivative"]["negative"] == 4
        assert curvature["second_derivative"]["positive"] == 0

    endpoints = [
        {"mask": row["mask"], "endpoint_names": row["endpoint_names"]}
        for row in masks012["certified_masks"]
    ]
    endpoints.append(
        {"mask": 3, "endpoint_names": ["Q7(C)_upper", "Q6(D)_upper"]}
    )
    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source55-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_55"
        ),
        "theorem": (
            "Let A be a tree of order at least 55, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "For C'=C+xD and H'=C, the Delta1 gate is separately concave in c8 and d7 on compatible nonnegative forest tuples.",
            "Forest Q7(C) and Q6(D) place actual c8 and d7 in their zero-to-Q upper intervals.",
            "Successive one-variable endpoint minimization puts the rectangle minimum at one of four corners.",
            "Masks 0,1,2 are independently certified whenever |D|>=26.",
            "Mask 3 is independently certified for every integer 54<=|D|<=179 and separately for all |D|>=180.",
            "Since |D|=|A|-1, all four corners and hence the full gate are nonnegative for |A|>=55.",
        ],
        "endpoint_inventory": endpoints,
        "mask3_order_partition": [
            {"first_D_order": 54, "last_D_order": 179},
            {"first_D_order": 180, "last_D_order": None},
        ],
        "D_order_cutoff": 54,
        "source_A_order_cutoff": 55,
        "extended_tree_order_cutoff": 56,
        "finite_certificate_aggregate": finite["aggregate"],
        "finite_certificate_ordered_region_digest_sha256": (
            finite_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": {
            variable: delta1["top_variable_derivatives"][variable]["second_derivative"]
            for variable in ("c8", "d7")
        },
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=55. Source orders 27..54, the Delta2/3 new-leaf gates, "
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
