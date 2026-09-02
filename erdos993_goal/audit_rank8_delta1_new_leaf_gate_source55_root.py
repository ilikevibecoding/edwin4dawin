#!/usr/bin/env python3
"""Independent audit of the full Delta1 inserted-leaf gate for |A|>=55."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_gate_source55_independent_audit_root_20260825.json"
)

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source55_root.py":
        "BF7D5B6404F79ED8A371354C7B2D210F28E765287C1325EC03DC1159999ADFBA",
    "rank8_delta1_new_leaf_gate_source55_root_20260825.json":
        "BB31F7DE802FF6415EBC7C761E99D04541B63264F00F3421FBAB177602CF7941",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_mask3_orders54_179_F_split_independent_audit_root_20260825.json":
        "A99F485ADE8B9DB4A1E514165D2F3E06193907F5FF98AE722CF793EE86D4AF4B",
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_independent_audit_root_20260825.json":
        "B0AA2DEFE60FD5FAA81C0EEDC7B397EB0158A014147C651B9F39CDE857B451ED",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json":
        "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def polynomial_record(expression: sp.Expr) -> dict[str, object]:
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [
                [list(monomial), str(coefficient)]
                for monomial, coefficient in terms
            ],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return {
        "terms": len(terms),
        "negative": sum(1 for _, coefficient in terms if coefficient < 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load("rank8_delta1_new_leaf_gate_source55_root_20260825.json")
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    finite = load(
        "rank8_delta1_new_leaf_mask3_orders54_179_F_split_"
        "independent_audit_root_20260825.json"
    )
    infinite = load(
        "rank8_delta1_new_leaf_mask3_large_order_shadow_box_"
        "independent_audit_root_20260825.json"
    )
    symbolic = load(
        "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"
    )

    assert assembled["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_55"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert finite["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_54_THROUGH_179"
    )
    assert infinite["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_AT_LEAST_180"
    )
    assert finite["aggregate"]["orders"] == 126
    assert finite["aggregate"]["regions"] == 693
    assert finite["aggregate"]["coefficients"] == 703080
    assert finite["aggregate"]["negative"] == 0
    assert finite["orders"][0]["D_order"] == 54
    assert finite["orders"][-1]["D_order"] == 179
    assert [row["D_order"] for row in finite["orders"]] == list(range(54, 180))
    assert assembled["mask3_order_partition"] == [
        {"first_D_order": 54, "last_D_order": 179},
        {"first_D_order": 180, "last_D_order": None},
    ]
    assert assembled["D_order_cutoff"] == 54
    assert assembled["source_A_order_cutoff"] == 55
    assert assembled["extended_tree_order_cutoff"] == 56

    gate = transcript.delta1_new_leaf_gate()
    independent_curvatures = {}
    symbolic_delta1 = symbolic["families"]["new_leaf_root_raw"][1]
    for variable, symbol in (("c8", transcript.c[8]), ("d7", transcript.d[7])):
        assert sp.Poly(gate, symbol).degree() == 2
        curvature = sp.expand(sp.diff(gate, symbol, 2))
        record = polynomial_record(curvature)
        reference = symbolic_delta1["top_variable_derivatives"][variable][
            "second_derivative"
        ]
        assert record["terms"] == reference["terms"] == 4
        assert record["negative"] == reference["negative"] == 4
        assert record["positive"] == reference["positive"] == 0
        assert record["sha256"] == reference["sha256"]
        assert all(coefficient <= 0 for _, coefficient in sp.Poly(curvature).terms())
        independent_curvatures[variable] = record

    endpoint_masks = [row["mask"] for row in masks012["certified_masks"]] + [3]
    assert endpoint_masks == [0, 1, 2, 3]
    assert assembled["endpoint_inventory"] == [
        {"mask": 0, "endpoint_names": ["zero", "zero"]},
        {"mask": 1, "endpoint_names": ["Q7(C)_upper", "zero"]},
        {"mask": 2, "endpoint_names": ["zero", "Q6(D)_upper"]},
        {"mask": 3, "endpoint_names": ["Q7(C)_upper", "Q6(D)_upper"]},
    ]

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source55-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_55"
        ),
        "verified": [
            "all four endpoint masks are present with no gap or overlap",
            "masks 0-2 have their exact containment-box certificate",
            "mask 3 has an import-independent audit for every integer D order 54 through 179",
            "mask 3 has a separate import-independent symbolic tail certificate for every D order at least 180",
            "the independently reconstructed Delta1 gate is separately concave in c8 and d7",
            "successive concavity reduces the rectangle minimum to the four certified corners",
            "|D|=|A|-1 converts D order 54 into source order 55",
        ],
        "finite_mask3_aggregate": finite["aggregate"],
        "independent_curvatures": independent_curvatures,
        "endpoint_masks": endpoint_masks,
        "source_A_order_cutoff": 55,
        "proof_boundary": assembled["proof_boundary"],
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
