#!/usr/bin/env python3
"""Fail-closed global Delta1 inserted-leaf gate for source order at least 27."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_gate_source27_root_20260826.json"

EXPECTED = {
    "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json":
        "D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "rank8_delta1_new_leaf_gate_source36_delta1d35_20260825.json":
        "B822BA3C62162D34DC8806A44435B6274E334BC1BCDA750973062DBA663EEED7",
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


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    masks012 = load(
        "rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json"
    )
    masks012_audit = load(
        "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
        "independent_audit_root_20260825.json"
    )
    upper = load("rank8_delta1_new_leaf_gate_source36_delta1d35_20260825.json")
    upper_audit = load(
        "rank8_delta1_new_leaf_gate_source36_"
        "independent_audit_delta1d35_20260825.json"
    )
    assert masks012["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_ENDPOINT_MASKS_0_1_2_ONLY"
    )
    assert masks012_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2"
    )
    assert upper["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_FULL_GATE_FOR_SOURCE_A_ORDER_AT_LEAST_36"
    )
    assert upper_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_FULL_GATE_"
        "FOR_SOURCE_A_ORDER_AT_LEAST_36"
    )
    assert upper["D_order_cutoff"] == 35
    assert upper["source_A_order_cutoff"] == 36
    assert upper["extended_tree_order_cutoff"] == 37

    rows = []
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    ordered_digest = hashlib.sha256()
    raw_fingerprint = None
    denominator = None
    for order in range(26, 35):
        name = f"rank8_delta1_new_leaf_mask3_D{order}_complete_root_20260826.json"
        row = load(name)
        assert row["status"] == (
            "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_MASK3_"
            f"FOR_D_ORDER_{order}"
        )
        assert row["D_order"] == order
        assert row["F_orders"] == list(range(order))
        assert row["aggregate"]["negative"] == 0
        assert row["aggregate"]["zero"] == 0
        assert row["aggregate"]["positive"] == row["aggregate"]["coefficients"]
        if raw_fingerprint is None:
            raw_fingerprint = row["raw_endpoint_numerator_sha256"]
            denominator = row["cleared_endpoint_denominator"]
        assert row["raw_endpoint_numerator_sha256"] == raw_fingerprint
        assert row["cleared_endpoint_denominator"] == denominator
        for key in totals:
            totals[key] += int(row["aggregate"][key])
        ordered_digest.update(
            f"{order}:{row['ordered_partition_digest_sha256']}\n".encode()
        )
        rows.append(
            {
                "D_order": order,
                "F_orders": [0, order - 1],
                "aggregate": row["aggregate"],
                "ordered_partition_digest_sha256": (
                    row["ordered_partition_digest_sha256"]
                ),
                "report": {"path": name, "sha256": actual[name]},
            }
        )

    assert raw_fingerprint == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert denominator == "2744*d5**4*(d6 + f5)"
    assert totals["negative"] == totals["zero"] == 0
    assert totals["positive"] == totals["coefficients"]

    partition = [
        {"first_D_order": order, "last_D_order": order}
        for order in range(26, 35)
    ] + [{"first_D_order": 35, "last_D_order": None}]
    assert [row["D_order"] for row in rows] == list(range(26, 35))
    assert upper["mask3_order_partition"][0] == {
        "first_D_order": 35,
        "last_D_order": 35,
    }

    payload = {
        "schema": "rank8-delta1-new-leaf-full-gate-source27-v1",
        "status": (
            "PASS_EXACT_AND_INDEPENDENT_DELTA1_NEW_LEAF_FULL_GATE_"
            "FOR_EVERY_SOURCE_A_ORDER_AT_LEAST_27"
        ),
        "theorem": (
            "Let A be any tree of order at least 27, let v be any vertex, "
            "and attach a new leaf w at v. At root w, the Newton Delta1 "
            "coefficient of the rank-eight terminal residual is nonnegative."
        ),
        "logical_bridge": [
            "The canonical Delta1 gate is separately concave in c8 and d7, so its minimum lies at one of four endpoint masks.",
            "The independently audited normalized containment theorem proves masks 0, 1, and 2 for every D order at least 26.",
            "The nine independently assembled exact certificates prove mask 3 for every D order 26 through 34 and every feasible F order 0 through D-1.",
            "The independently audited source-36 theorem proves all four masks, including mask 3, for every D order at least 35.",
            "These ranges partition every D order at least 26 without gaps; since |D|=|A|-1, every source order |A|>=27 is covered.",
        ],
        "endpoint_inventory": upper["endpoint_inventory"],
        "mask3_order_partition": partition,
        "finite_D26_34": {
            "rows": rows,
            "aggregate": {
                **totals,
                "ordered_order_digest_sha256": ordered_digest.hexdigest().upper(),
            },
        },
        "raw_endpoint_numerator_sha256": raw_fingerprint,
        "cleared_endpoint_denominator": denominator,
        "D_order_cutoff": 26,
        "source_A_order_cutoff": 27,
        "extended_tree_order_cutoff": 28,
        "concavity_fingerprints": upper["concavity_fingerprints"],
        "proof_boundary": (
            "This proves the complete Delta1 inserted-leaf-root gate for "
            "every source tree order at least 27. The connected-Q8 and "
            "forest-Q8 compositions are separate integration steps."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("D_ORDERS", 26, "THROUGH_INFINITY")
    print("FINITE_REGIONS", totals["regions"])
    print("FINITE_COEFFICIENTS", totals["coefficients"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
