#!/usr/bin/env python3
"""Independent audit of the full large-order Delta1 inserted-leaf gate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_large_order_gate_independent_audit_root_20260825.json"
)

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_large_order_gate_root.py":
        "935A074C8CD77629622CD0E4B68211380BBC7FEC1E9F48A09073E4B8AA589B18",
    "rank8_delta1_new_leaf_large_order_gate_root_20260825.json":
        "0FEB949C9E347F20C8E5F1B93F524A390283220E9E116D8A1A7D0B4F661CA4C3",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_mask3_large_order_shadow_box_independent_audit_root_20260825.json":
        "B0AA2DEFE60FD5FAA81C0EEDC7B397EB0158A014147C651B9F39CDE857B451ED",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json":
        "5F378D85698D363468C0D078EDBCD3EC56BE02A18E1D2A56D4497B8DEA0C72DD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    assembled = json.loads(
        (HERE / "rank8_delta1_new_leaf_large_order_gate_root_20260825.json").read_text(
            encoding="utf-8"
        )
    )
    masks012 = json.loads(
        (
            HERE / "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    mask3 = json.loads(
        (
            HERE
            / "rank8_delta1_new_leaf_mask3_large_order_shadow_box_"
              "independent_audit_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    symbolic = json.loads(
        (
            HERE
            / "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert assembled["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_181"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert mask3["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
        "FOR_D_ORDER_AT_LEAST_180"
    )
    assert assembled["D_order_cutoff"] == 180
    assert assembled["source_A_order_cutoff"] == 181
    assert assembled["extended_tree_order_cutoff"] == 182

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
        "schema": "rank8-delta1-new-leaf-large-order-full-gate-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_SOURCE_A_ORDER_AT_LEAST_181"
        ),
        "verified": [
            "all four endpoint masks are present with no gap or overlap",
            "masks 0-2 have their exact containment-box certificate",
            "mask 3 has its import-independent large-order shadow-box audit",
            "the independently reconstructed raw Delta1 gate is quadratic and coefficientwise concave in c8 and d7 separately",
            "successive one-variable concavity reduces the rectangle minimum to the four certified corners",
            "|D|=|A|-1 converts the cutoff 180 into source order 181",
        ],
        "independent_curvatures": independent_curvatures,
        "endpoint_masks": endpoint_masks,
        "source_A_order_cutoff": 181,
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
