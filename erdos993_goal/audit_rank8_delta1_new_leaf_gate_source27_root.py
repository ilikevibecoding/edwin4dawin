#!/usr/bin/env python3
"""Independent fail-closed audit of the global Delta1 inserted-leaf gate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_gate_source27_"
    "independent_audit_root_20260826.json"
)

EXPECTED = {
    "assemble_rank8_delta1_new_leaf_gate_source27_root.py":
        "762EB7024A71A95971261E7E11E54171EAEEF5E730FD4A7F11FFE46E729FDCA6",
    "rank8_delta1_new_leaf_gate_source27_root_20260826.json":
        "FEBB01E569A1B9D21B376A7EF735291AF05CD33C221F2D8DA3B2B12D406C2E4C",
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "rank8_delta1_new_leaf_gate_source36_independent_audit_delta1d35_20260825.json":
        "EE864DBA461EB41E24A1BB71253C7A52929A4456B5CC3FE21810EF811D2CC742",
    "rank8_delta1_new_leaf_mask3_D26_complete_root_20260826.json":
        "2DE12A23232E6C0A36F52E1A3D454A6587AAE038DE665C5245C0F440A7132160",
    "rank8_delta1_new_leaf_mask3_D27_complete_root_20260826.json":
        "F4053DF0C97CA3A07E8536385EB4DFE57FEF5998359C4D4048C2EC61D0C48204",
    "rank8_delta1_new_leaf_mask3_D28_complete_root_20260826.json":
        "FDB5A5B54798895D587532A62946A3AD9F21919882D7C039BFC79490D3CD7984",
    "rank8_delta1_new_leaf_mask3_D29_complete_root_20260826.json":
        "84952116C7A94B337F42D137E17525A2587F572F9D655CAD90EB7DE811A87EAE",
    "rank8_delta1_new_leaf_mask3_D30_complete_root_20260826.json":
        "1D38CDA2925FE7FA6F3E96A12934797B85C163015533F48036E393F2E9D2B545",
    "rank8_delta1_new_leaf_mask3_D31_complete_root_20260826.json":
        "160E697C87180916C48FBA2BDA00190E98B2FFC8ABACBD13D873420B71FB6A86",
    "rank8_delta1_new_leaf_mask3_D32_complete_root_20260826.json":
        "83AA59B90B3411245598A4D22D630A8ABDF552DBE2D61811A945E9C944D35CC1",
    "rank8_delta1_new_leaf_mask3_D33_complete_root_20260826.json":
        "444B1BBA6A212DAE48D2F7BD7EBB4A4E8CA360A6CDB2B4DD529309F2A207C403",
    "rank8_delta1_new_leaf_mask3_D34_complete_root_20260826.json":
        "31B6BE7615FE1ABAD9FE48C465696641791AE091181488D348DB7A29C825DBEF",
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
        "zero": sum(1 for _, coefficient in terms if coefficient == 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    assembled = load("rank8_delta1_new_leaf_gate_source27_root_20260826.json")
    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source36_"
        "independent_audit_delta1d35_20260825.json"
    )
    assert assembled["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_EVERY_SOURCE_A_ORDER_AT_LEAST_27"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_36"
    )

    gate = transcript.delta1_new_leaf_gate()
    curvatures = {}
    for variable, symbol in (("c8", transcript.c[8]), ("d7", transcript.d[7])):
        assert sp.Poly(gate, symbol).degree() == 2
        curvature = sp.expand(sp.diff(gate, symbol, 2))
        record = polynomial_record(curvature)
        assert record["terms"] == 4
        assert record["negative"] == 4
        assert record["zero"] == record["positive"] == 0
        assert all(coefficient < 0 for _, coefficient in sp.Poly(curvature).terms())
        reference = assembled["concavity_fingerprints"][variable]
        assert reference == {
            "terms": record["terms"],
            "negative": record["negative"],
            "positive": record["positive"],
            "sha256": record["sha256"],
            "orientation": "COEFFICIENTWISE_NONPOSITIVE",
        }
        curvatures[variable] = record

    endpoint_masks = [row["mask"] for row in masks012["certified_masks"]] + [3]
    assert endpoint_masks == [0, 1, 2, 3]
    assert assembled["endpoint_inventory"] == [
        {"mask": 0, "endpoint_names": ["zero", "zero"]},
        {"mask": 1, "endpoint_names": ["Q7(C)_upper", "zero"]},
        {"mask": 2, "endpoint_names": ["zero", "Q6(D)_upper"]},
        {"mask": 3, "endpoint_names": ["Q7(C)_upper", "Q6(D)_upper"]},
    ]

    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    ordered_digest = hashlib.sha256()
    finite_rows = assembled["finite_D26_34"]["rows"]
    assert len(finite_rows) == 9
    for index, order in enumerate(range(26, 35)):
        name = f"rank8_delta1_new_leaf_mask3_D{order}_complete_root_20260826.json"
        source = load(name)
        reference = finite_rows[index]
        assert source["status"] == (
            "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_MASK3_"
            f"FOR_D_ORDER_{order}"
        )
        assert source["D_order"] == order
        assert source["F_orders"] == list(range(order))
        assert source["raw_endpoint_numerator_sha256"] == (
            "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
        )
        assert source["cleared_endpoint_denominator"] == (
            "2744*d5**4*(d6 + f5)"
        )
        assert source["aggregate"]["negative"] == 0
        assert source["aggregate"]["zero"] == 0
        assert source["aggregate"]["positive"] == source["aggregate"]["coefficients"]
        assert reference == {
            "D_order": order,
            "F_orders": [0, order - 1],
            "aggregate": source["aggregate"],
            "ordered_partition_digest_sha256": (
                source["ordered_partition_digest_sha256"]
            ),
            "report": {"path": name, "sha256": actual[name]},
        }
        for key in totals:
            totals[key] += int(source["aggregate"][key])
        ordered_digest.update(
            f"{order}:{source['ordered_partition_digest_sha256']}\n".encode()
        )

    finite_aggregate = {
        **totals,
        "ordered_order_digest_sha256": ordered_digest.hexdigest().upper(),
    }
    assert finite_aggregate == assembled["finite_D26_34"]["aggregate"]
    assert finite_aggregate["negative"] == finite_aggregate["zero"] == 0
    assert finite_aggregate["positive"] == finite_aggregate["coefficients"]

    expected_partition = [
        {"first_D_order": order, "last_D_order": order}
        for order in range(26, 35)
    ] + [{"first_D_order": 35, "last_D_order": None}]
    assert assembled["mask3_order_partition"] == expected_partition
    assert assembled["D_order_cutoff"] == 26
    assert assembled["source_A_order_cutoff"] == 27
    assert assembled["extended_tree_order_cutoff"] == 28

    payload = {
        "schema": (
            "rank8-delta1-new-leaf-full-gate-source27-"
            "independent-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_EVERY_SOURCE_A_ORDER_AT_LEAST_27"
        ),
        "verified": [
            "the canonical gate is separately concave in c8 and d7",
            "all four endpoint masks are present",
            "masks 0 through 2 hold for every D order at least 26",
            "mask 3 has exact independently assembled coverage at every D order 26 through 34",
            "the independently audited source-36 theorem covers every D order at least 35",
            "the D-order partition has no gap or overlap and converts to source order at least 27",
        ],
        "independent_curvatures": curvatures,
        "endpoint_masks": endpoint_masks,
        "finite_D26_34_aggregate": finite_aggregate,
        "mask3_order_partition": expected_partition,
        "source_A_order_cutoff": 27,
        "assembled": {
            "path": "rank8_delta1_new_leaf_gate_source27_root_20260826.json",
            "sha256": actual[
                "rank8_delta1_new_leaf_gate_source27_root_20260826.json"
            ],
        },
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("FINITE_REGIONS", finite_aggregate["regions"])
    print("FINITE_COEFFICIENTS", finite_aggregate["coefficients"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
