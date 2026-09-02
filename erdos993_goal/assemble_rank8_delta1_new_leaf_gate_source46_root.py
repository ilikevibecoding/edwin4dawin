#!/usr/bin/env python3
"""Fail-closed extension of the full Delta1 inserted-leaf gate to |A|>=46."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source46_root_20260825.json"
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source47_root.py":
        "941422109C24B76FE7B0EBD1502809000080E20FBB452EAFD71E7E629586C0FA",
    "rank8_delta1_new_leaf_gate_source47_root_20260825.json":
        "671F64EB7E0FCC14FF8936453943DEED3C2847FBEDF883C5DE3ED498A156BED9",
    "audit_rank8_delta1_new_leaf_gate_source47_root.py":
        "D2CA01EB79CEC6916D7D3258D0AB749CE0FB9387E1111792344FA1CB6C7AC1AA",
    "rank8_delta1_new_leaf_gate_source47_independent_audit_root_20260825.json":
        "E2822C7001F15DA17CD01AEE1310A893E837A0C1397F9C9F1C2505FAC68C9928",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "prove_rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root.py":
        "20B7A384F6A68980F99696364E94054A3E2B65ECB84FCC5CEC73EFD069DF599B",
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root_20260825.json":
        "C1C76F5C08D46E59CA57CDA048D48A0E2805A65E386148DD2E13E7E5CA30DADA",
    "audit_rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root.py":
        "0624B1E5434F9BCAF3770676BE95E52940B811C201F2028E92BCBF82B1CA7283",
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_independent_audit_root_20260825.json":
        "A9FC83782EC1172A010FB293D8A09B3C3D611F5F27E7145160FA7B6F6441F40A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    upper = load("rank8_delta1_new_leaf_gate_source47_root_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source47_independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    order45 = load(
        "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root_20260825.json"
    )
    order45_audit = load(
        "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_"
        "independent_audit_root_20260825.json"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_47"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_47"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert order45["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45"
    assert order45_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45"
    )
    assert order45["aggregate"]["regions"] == order45_audit["aggregate"]["regions"] == 228
    assert order45["aggregate"]["coefficients"] == order45_audit["aggregate"]["coefficients"] == 273000
    assert order45["aggregate"]["negative"] == order45_audit["aggregate"]["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source46-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_46"
        ),
        "theorem": (
            "Let A be a tree of order at least 46, v any vertex, and form A+w "
            "by attaching a new leaf w at v. Then the Newton Delta1 terminal "
            "residual at the new root w is nonnegative."
        ),
        "logical_bridge": [
            "The independently audited source-47 gate supplies all endpoints and separate concavity for every D order at least 46.",
            "Masks 0,1,2 cover D order 45 because they apply for every D order at least 26.",
            "The independently reconstructed Q5-compatible exact-F certificate supplies mask 3 at D order 45.",
            "Thus all four endpoints and, by separate concavity, the whole rectangle are nonnegative for every D order at least 45.",
            "Since |D|=|A|-1, the full Delta1 inserted-leaf gate holds for |A|>=46.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": [
            {"first_D_order": 45, "last_D_order": 45},
            *upper["mask3_order_partition"],
        ],
        "D_order_cutoff": 45,
        "source_A_order_cutoff": 46,
        "extended_tree_order_cutoff": 47,
        "order45_certificate_aggregate": order45["aggregate"],
        "order45_certificate_ordered_region_digest_sha256": (
            order45_audit["aggregate"]["ordered_region_digest_sha256"]
        ),
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This closes only the Delta1 gate when the inserted leaf is the root "
            "and |A|>=46. Source orders 27..45, the Delta2/3 new-leaf gates, "
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
