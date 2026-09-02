#!/usr/bin/env python3
"""Independent audit of the full Delta1 inserted-leaf gate for |A|>=41."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_gate_source41_"
    "independent_audit_delta1d40_20260825.json"
)
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source41_delta1d40.py":
        "3D18C80B0E29D691B8E7ED2EACBFBCEDC13355831DD1C3575B7E063D9665158E",
    "rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json":
        "EF2A31B3FAC3D02FB390FE92A7334D81B2B8B1844EF0B67AE5219E6F9E1AE146",
    "rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json":
        "3F1459BDE8E33BB6824E651A2964F87876D5E8FEE8EA06AC67AE904A68AF37A4",
    "rank8_delta1_new_leaf_mask3_order40_assembly_independent_audit_delta1d40_20260825.json":
        "EBB3489B2A1BB3B9B6E2B00ADEFD0B6B4656E96825045AA8EA1520ABAE43DB84",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json":
        "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
    "rank8_delta1_order40_bound_chain_independent_audit_delta1d40_20260825.json":
        "B0286456A0707F1059268E8CC50941025F9B6D8D21E0F79A91F8FF87323EBC9C",
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
    assembled = load("rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json")
    upper = load(
        "rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json"
    )
    order40 = load(
        "rank8_delta1_new_leaf_mask3_order40_assembly_"
        "independent_audit_delta1d40_20260825.json"
    )
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order40_bound_chain_independent_audit_"
        "delta1d40_20260825.json"
    )
    symbolic = load(
        "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"
    )
    assert assembled["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_41"
    )
    assert upper["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_42"
    )
    assert order40["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40"
    )
    assert masks012["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER40_BOUND_CHAIN"
    assert order40["aggregate"] == assembled["order40_certificate_aggregate"]
    assert order40["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert order40["F_orders"] == list(range(40))

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
    assert assembled["mask3_order_partition"] == [
        {"first_D_order": 40, "last_D_order": 40},
        {"first_D_order": 41, "last_D_order": 41},
        {"first_D_order": 42, "last_D_order": 42},
        {"first_D_order": 43, "last_D_order": 43},
        {"first_D_order": 44, "last_D_order": 44},
        {"first_D_order": 45, "last_D_order": 45},
        {"first_D_order": 46, "last_D_order": 46},
        {"first_D_order": 47, "last_D_order": 47},
        {"first_D_order": 48, "last_D_order": 50},
        {"first_D_order": 51, "last_D_order": 53},
        {"first_D_order": 54, "last_D_order": 179},
        {"first_D_order": 180, "last_D_order": None},
    ]
    assert assembled["D_order_cutoff"] == 40
    assert assembled["source_A_order_cutoff"] == 41
    assert assembled["extended_tree_order_cutoff"] == 42

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source41-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_41"
        ),
        "verified": [
            "masks 0-2 cover every D order at least 26",
            "the small/exact-F canonical replay covers mask 3 at D order 40",
            "the source-42 audit covers mask 3 continuously from D order 41 onward",
            "the sharp forest ratio, two-extension mu5 floor, Q5 cap, and all switches are independently checked",
            "the independently reconstructed gate is separately concave in c8 and d7",
            "all four endpoints and successive concavity cover the whole rectangle",
            "|D|=|A|-1 converts D order 40 into source order 41",
        ],
        "order40_mask3_aggregate": order40["aggregate"],
        "order40_bound_chain": {
            "mu4_floor": bounds["mu4_floor"],
            "mu5_floor": bounds["mu5_floor"],
            "exact_switch_checks": bounds["exact_switch_checks"],
        },
        "independent_curvatures": independent_curvatures,
        "endpoint_masks": endpoint_masks,
        "source_A_order_cutoff": 41,
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
