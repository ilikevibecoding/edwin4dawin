#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=35 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order35_assembly_"
    "independent_audit_delta1d35_20260825.json"
)
BRIDGES = tuple(range(19, 26))
SHARDS = ((27, 28), (29, 30), (31, 32), (33, 34))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order35_delta1d35.py": "609EF70A91DF7770D4827D3806EA7157C9E4106D5344CAA33313D3829793468E",
    "rank8_delta1_new_leaf_mask3_order35_delta1d35_20260825.json": "B394850E6B8B7A56931E571BF805E517A855C2B244104FF74A6D22A2B36E5828",
    "rank8_delta1_new_leaf_mask3_order35_small_F18_independent_audit_delta1d35_20260825.json": "24C76F4E06047D369BD64608EEEA80B164DFC89DD6D9E251710B1CF5E258BC0C",
    "rank8_delta1_new_leaf_mask3_order35_exact_F19_bridge_independent_audit_delta1d35_20260825.json": "01C5B42182850BD9861E8F8216E7411D3F68D407E680E085BD8A9AFDB09B2E6F",
    "rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_independent_audit_delta1d35_20260825.json": "FC88749C07E78B5553FF49A0E2E3FDDF333394DC7776CF324996946D6631F00F",
    "rank8_delta1_new_leaf_mask3_order35_exact_F21_bridge_independent_audit_delta1d35_20260825.json": "6FED7DC1DBF88893CF2ECC7A21AB7EDDA4B818E03765CF4A30EDCC797233B8AB",
    "rank8_delta1_new_leaf_mask3_order35_exact_F22_bridge_independent_audit_delta1d35_20260825.json": "192532B21B0BC7B367ADB09C61B30ED749FC48F1D8292D2BA1FC1AFCA346A385",
    "rank8_delta1_new_leaf_mask3_order35_exact_F23_bridge_independent_audit_delta1d35_20260825.json": "53544F6E409E1679EDFD24502E0AFF8ED8161484053870EC06744B0D49691933",
    "rank8_delta1_new_leaf_mask3_order35_exact_F24_bridge_independent_audit_delta1d35_20260825.json": "0FFD18390AB83778FCA63FAF127B93854644773F86E7A69DF311028AC65DD232",
    "rank8_delta1_new_leaf_mask3_order35_exact_F25_bridge_independent_audit_delta1d35_20260825.json": "23B8661CA6EA5C33AFB7484D25C45443BABFB3EAE587541E47A0FB30643086AB",
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_independent_audit_delta1d35_20260825.json": "E66E2A870CFB8AF0C6E1401AAC804B543C2EE3DB22B18E9C1DFF840CD563B15C",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_27_28_independent_audit_delta1d35_20260825.json": "6CDE85A620131A5BCEDE1BAAF0A434D2B67A1FE2E2E0B3E471C6E663EE9391AB",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_29_30_independent_audit_delta1d35_20260825.json": "F5ACF4F67CDBB9EB61D282D905E4968CFC35D5AF4838E644AC64782A1FBDDC7F",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_31_32_independent_audit_delta1d35_20260825.json": "B3A9E4D0BC5BFE60887E843CCB3D73B5AC84EB53F58C099FD96907B20B68704B",
    "rank8_delta1_new_leaf_mask3_order35_exact_F_33_34_independent_audit_delta1d35_20260825.json": "CFCE8C4BF6E911D244A2C44E42FB77BE7FD5FCD4F1E83C7CF2B4508BEBDFF1F9",
    "rank8_delta1_order35_bound_chain_independent_audit_delta1d35_20260825.json": "E54886D7C745B143961A542B56CC8B4DD2D5AAF62581D2B0F68B6C075CC856F7",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py": "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py": "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load(
        "rank8_delta1_new_leaf_mask3_order35_delta1d35_20260825.json"
    )
    small = load(
        "rank8_delta1_new_leaf_mask3_order35_small_F18_"
        "independent_audit_delta1d35_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order35_bound_chain_independent_audit_delta1d35_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_35"
    assert assembled["D_order"] == 35
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER35_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 256
    assert bounds["M26_q5_coupling"]["rank4_ratio_switch"] == "10/43"

    coverage = list(range(19))
    audits = [("small", small)]
    for order in BRIDGES:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order35_exact_"
            f"F{order}_bridge_independent_audit_delta1d35_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDER_{order}_BRIDGE"
        )
        coverage.append(order)
        audits.append((f"bridge-{order}", audit))

    q5_audit = load(
        "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
        "independent_audit_delta1d35_20260825.json"
    )
    assert q5_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
        "F_ORDER_26_Q5_BRIDGE"
    )
    coverage.append(26)
    audits.append(("q5-bridge-26", q5_audit))

    for first, last in SHARDS:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order35_exact_F_"
            f"{first}_{last}_independent_audit_delta1d35_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["F_orders"] == list(range(first, last + 1))
        coverage.extend(audit["F_orders"])
        audits.append((f"{first}-{last}", audit))
    assert coverage == list(range(35))

    keys = ("regions", "coefficients", "negative", "zero", "positive")
    totals = {key: sum(audit["aggregate"][key] for _, audit in audits) for key in keys}
    assert totals == assembled["aggregate"] == {
        "regions": 556, "coefficients": 675000,
        "negative": 0, "zero": 0, "positive": 675000,
    }
    digest = hashlib.sha256()
    endpoint_hashes = set()
    for label, audit in audits:
        digest.update(
            (f"{label}:" + audit["aggregate"]["ordered_region_digest_sha256"] + "\n").encode()
        )
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
    assert assembled["ordered_partition_digest_sha256"] == digest.hexdigest().upper()
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }
    assert assembled["F_order_partition"] == [
        {"first_F_order": 0, "last_F_order": 18},
        *[{"first_F_order": order, "last_F_order": order} for order in BRIDGES],
        {"first_F_order": 26, "last_F_order": 26, "coupling": "forest_Q5"},
        *[
            {"first_F_order": first, "last_F_order": last}
            for first, last in SHARDS
        ],
    ]

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw["sha256"] in endpoint_hashes
    assert str(denominator) == assembled["cleared_endpoint_denominator"]

    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-order35-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_35",
        "verified": [
            "small, seven cap-ratio bridges, the forest-Q5 bridge, and four ordinary shards all have independent tensor replays",
            "the integer F-order partition is exactly 0 through 34 without gaps",
            "all 675,000 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5 coupling, two-extension floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 35,
        "F_orders": coverage,
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator": raw,
        "cleared_endpoint_denominator": str(denominator),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
