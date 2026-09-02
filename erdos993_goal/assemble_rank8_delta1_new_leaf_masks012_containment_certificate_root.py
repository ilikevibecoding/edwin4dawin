#!/usr/bin/env python3
"""Fail-closed assembly of the three proved Delta1 new-leaf endpoint masks."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"

EXPECTED = {
    "probe_rank8_delta1_new_leaf_normalized_containment_box_root.py":
        "F4B18C4C96521F7325558DF681DA81A20A3B167BD05145F292F1C69F77D82A3D",
    "rank8_delta1_new_leaf_normalized_containment_box_probe_root_20260825.json":
        "ECFD97D7D4D0A44616F5A6A5EBD171669A514312D582E5FE043FBCD767A49E4A",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "verify_uniform_vk_large_order_reduction.py":
        "F340C4C1C45B9F10B7794DD17139594E4EC9789CA988870A46BB11B1D0DFF5B8",
    "uniform_vk_large_order_reduction_exact_20260816.json":
        "6BE4C4D6E01C1EBE7F48CA9F70AF579E0036C47EB26B7F5415E8D5FF28D5B4C5",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m00_q_corner_agent_20260823.json":
        "BDAB997A79167BFD9901F923AAC37D00C1D5BB3E895EC91958DB4EB78C63533A",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m01_q_corner_agent_20260823.json":
        "CE705E49A47B4D60D7DF0C1A19039E2B4D867D6C96FD8A8ADB06D5560DA091C4",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m02_q_corner_agent_20260823.json":
        "4703B2BAB732FD982CCADEDBE0D571885D3A62E178D5CACD0990DE76AF40FE06",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    primary = load(
        "rank8_delta1_new_leaf_normalized_containment_box_probe_root_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    theorem = load("uniform_vk_large_order_reduction_exact_20260816.json")
    assert primary["status"] == (
        "OPEN_BERNSTEIN_NEGATIVE_CONTAINMENT_BOX_METHOD_OBSTRUCTION"
    )
    assert audit["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    assert theorem["status"] == "PASS_EXACT_UNIFORM_VK_LARGE_ORDER_REDUCTION"
    assert theorem["theorems"]["extension_mean"] == "mu_s >= n-3s+2s/n"
    assert len(primary["corners"]) == 4
    assert len(audit["rows"]) == 3

    certified = []
    for mask in range(3):
        primary_row = primary["corners"][mask]
        audit_row = audit["rows"][mask]
        assert primary_row["mask"] == audit_row["mask"] == mask
        assert primary_row["endpoint_names"] == audit_row["endpoint_names"]
        assert primary_row["positive_denominator"] == audit_row["positive_denominator"]
        assert primary_row["homogeneous_degree"] == audit_row["homogeneous_degree"]
        assert primary_row["normalized_power_terms"] == audit_row["normalized_power_terms"]
        assert primary_row["bernstein"] == audit_row["bernstein"]
        assert primary_row["vertices"] == audit_row["vertices"]
        assert audit_row["bernstein"]["negative"] == 0
        assert Fraction(audit_row["bernstein"]["minimum"]) > 0
        certified.append(
            {
                "mask": mask,
                "endpoint_names": audit_row["endpoint_names"],
                "positive_denominator": audit_row["positive_denominator"],
                "raw_numerator_sha256": audit_row["raw_numerator"]["sha256"],
                "normalized_power_terms": audit_row["normalized_power_terms"],
                "bernstein_degrees": audit_row["bernstein"]["degrees"],
                "bernstein_coefficients": audit_row["bernstein"]["coefficients"],
                "minimum": audit_row["bernstein"]["minimum"],
                "ordered_sha256": audit_row["bernstein"]["ordered_sha256"],
            }
        )

    open_row = primary["corners"][3]
    assert open_row["mask"] == 3
    assert open_row["bernstein"]["negative"] == 302
    assert open_row["vertices"]["negative"] == 3
    assert Fraction(open_row["vertices"]["minimum"]) < 0

    payload = {
        "schema": "rank8-delta1-new-leaf-masks012-containment-certificate-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY",
        "theorem": (
            "Let A be a tree of order n>=27, v a vertex, D=A-v, F=A-N[v], "
            "and w a new leaf attached at v and used as the root. At Newton rank "
            "Delta1, the new-leaf residual is nonnegative at endpoint masks 0, 1, "
            "and 2 for (c8,d7) in {0,Q7(C)_upper} x {0,Q6(D)_upper}."
        ),
        "proof_chain": [
            "The exact new-leaf recurrence is C'=C+xD, H'=C, C=D+xF.",
            "The previously certified selected-degree theorem gives d5/d6<=39/74 and d4/d5<=65/186 for |D|>=26.",
            "Induced-subforest containment gives 0<=f_i<=d_i for i=4,5,6.",
            "The primary exact expansion and an import-independent reconstruction agree on every raw numerator fingerprint.",
            "Every tensor-product Bernstein coefficient of each normalized numerator is nonnegative on the enclosing five-dimensional unit box.",
            "The Q denominators are positive on the actual forest domain because d4,d5,d6>0.",
        ],
        "certified_masks": certified,
        "remaining_mask": {
            "mask": 3,
            "endpoint_names": open_row["endpoint_names"],
            "status": "OPEN_NO_SIGN_CLAIM",
            "broad_box_negative_bernstein_coefficients": open_row["bernstein"]["negative"],
            "broad_box_negative_vertices": open_row["vertices"]["negative"],
            "warning": (
                "These negatives occur in a deliberately enlarged compatibility box. "
                "They are a method obstruction, not a graph counterexample."
            ),
        },
        "nonimplications": (
            "Because endpoint mask 3 is open, this certificate does not prove the "
            "entire Delta1 new-leaf gate, connected Q8, forest Q8, rank-eight PGC, "
            "or Erdos Problem 993."
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
