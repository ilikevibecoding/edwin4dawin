#!/usr/bin/env python3
"""Assemble all four corners into the full large-order Delta1 new-leaf gate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_large_order_gate_root_20260825.json"

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_masks012_containment_certificate_root.py":
        "323D57BDE824D3BF2C49D898F7E02996F1E33EB1731A7216063DEDCFFDB0F3CA",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
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
    mask3 = load("rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json")
    mask3_audit = load(
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
    assert mask3["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180"
    )
    assert mask3_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
        "FOR_D_ORDER_AT_LEAST_180"
    )
    assert mask3["cutoff_D_order"] == 180
    assert mask3["raw_endpoint_numerator"] == mask3_audit["raw_endpoint_numerator"]
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
        "schema": "rank8-delta1-new-leaf-large-order-full-gate-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_181"
        ),
        "theorem": (
            "Let A be a tree of order at least 181, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "For the new-leaf identity C'=C+xD, H'=C, the Delta1 gate is separately concave in c8 and d7 on compatible nonnegative forest tuples.",
            "Forest Q7(C) and Q6(D) place the actual c8 and d7 in their zero-to-Q upper intervals.",
            "A separately concave bivariate function attains its rectangle minimum at a corner, by applying one-variable endpoint minimization successively.",
            "Masks 0,1,2 are nonnegative for every |D|>=26; mask 3 is independently certified for |D|>=180.",
            "Since |D|=|A|-1, all four corners and hence the full gate are nonnegative for |A|>=181.",
        ],
        "endpoint_inventory": endpoints,
        "D_order_cutoff": 180,
        "source_A_order_cutoff": 181,
        "extended_tree_order_cutoff": 182,
        "concavity_fingerprints": {
            variable: delta1["top_variable_derivatives"][variable]["second_derivative"]
            for variable in ("c8", "d7")
        },
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=181. Source orders 27..180, the Delta2/3 new-leaf gates, "
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
