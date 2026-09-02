#!/usr/bin/env python3
"""Independent audit of the full Delta1 inserted-leaf gate for |A|>=46."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_gate_source46_independent_audit_root_20260825.json"
)

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source46_root.py":
        "C6BBE74A5228DCA26A09D0E728A8494792F3956EFFB48987E685C516E16D5630",
    "rank8_delta1_new_leaf_gate_source46_root_20260825.json":
        "FCEAE3E57DEA030CFAC92218B545A7C1783ED748D5A793C07F42B656011F7E9A",
    "rank8_delta1_new_leaf_gate_source47_independent_audit_root_20260825.json":
        "E2822C7001F15DA17CD01AEE1310A893E837A0C1397F9C9F1C2505FAC68C9928",
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_independent_audit_root_20260825.json":
        "A9FC83782EC1172A010FB293D8A09B3C3D611F5F27E7145160FA7B6F6441F40A",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
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
    assembled = load("rank8_delta1_new_leaf_gate_source46_root_20260825.json")
    upper = load(
        "rank8_delta1_new_leaf_gate_source47_independent_audit_root_20260825.json"
    )
    order45 = load(
        "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_"
        "independent_audit_root_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    symbolic = load(
        "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"
    )
    assert assembled["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_46"
    )
    assert upper["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_47"
    )
    assert order45["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert order45["aggregate"]["regions"] == 228
    assert order45["aggregate"]["coefficients"] == 273000
    assert order45["aggregate"]["negative"] == 0
    assert assembled["mask3_order_partition"] == [
        {"first_D_order": 45, "last_D_order": 45},
        {"first_D_order": 46, "last_D_order": 46},
        {"first_D_order": 47, "last_D_order": 47},
        {"first_D_order": 48, "last_D_order": 50},
        {"first_D_order": 51, "last_D_order": 53},
        {"first_D_order": 54, "last_D_order": 179},
        {"first_D_order": 180, "last_D_order": None},
    ]
    assert assembled["D_order_cutoff"] == 45
    assert assembled["source_A_order_cutoff"] == 46
    assert assembled["extended_tree_order_cutoff"] == 47

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
        "schema": "rank8-delta1-new-leaf-full-gate-source46-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_46"
        ),
        "verified": [
            "masks 0-2 cover every D order at least 26",
            "the Q5-compatible exact-F audit covers mask 3 at D order 45",
            "the source-47 audit covers mask 3 continuously from D order 46 onward",
            "the independently reconstructed gate is separately concave in c8 and d7",
            "all four endpoints and successive concavity cover the whole rectangle",
            "|D|=|A|-1 converts D order 45 into source order 46",
        ],
        "order45_mask3_aggregate": order45["aggregate"],
        "independent_curvatures": independent_curvatures,
        "endpoint_masks": endpoint_masks,
        "source_A_order_cutoff": 46,
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
