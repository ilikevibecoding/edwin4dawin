#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=41 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order41_assembly_"
    "independent_audit_delta1d41_20260825.json"
)
SHARDS = ((26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 37), (38, 39), (40, 40))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order41_delta1d41.py":
        "67F96798EDAB374DBCA89F20560B5E75FFCA3B5EBC93A31C517F2A787418553C",
    "rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json":
        "2712CB0DE3DC5236C4E4419F1765D0B5B6EA12658FF7E99DCC47EE5DE6D29360",
    "audit_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py":
        "B1F57DBEE6BF2C11740BFFB726D62871E3785ADAF305C072DFC968CCBB4A1DCC",
    "rank8_delta1_new_leaf_mask3_order41_small_F25_independent_audit_delta1d41_20260825.json":
        "5187287BDDD4F98FBCB2D7F9DD47F2F55C028C91122970F02B056CFC68F56CEB",
    "rank8_delta1_order41_bound_chain_independent_audit_delta1d41_20260825.json":
        "AD31ECFD2BA893FC5743CD4C8BEA7F68A3B0E32F99A4DC9C8A66A1F8F93BDCFC",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_independent_audit_delta1d41_20260825.json":
        "6EF16701DA6B949DF1434A17908AA764C820D8EF797CDC8CDB7798D4F7C0F5C4",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_28_29_independent_audit_delta1d41_20260825.json":
        "CC56FC084AA750F36BAFC3A5210ACBD8AD0932EEFB118FFA2CDBD1E62C974415",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_30_31_independent_audit_delta1d41_20260825.json":
        "547AEC9AFF8C297B3D54DD7875AC8B1F1C33036CAAEA3E9CBA8A9241E9685239",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_32_33_independent_audit_delta1d41_20260825.json":
        "8FAA2FF6E636F8EBA8CB03E1B987E988EBA5FD671A785F093257A1BA6ED26102",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_34_35_independent_audit_delta1d41_20260825.json":
        "A5A0C4430FCCC66C03617A970E061A8253DA512D053138A261FFA58D9D720BC6",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_36_37_independent_audit_delta1d41_20260825.json":
        "17710530BA6D7EAD3F909D071E55E250B2ACCA6812A928D42015CD78006E06FB",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_38_39_independent_audit_delta1d41_20260825.json":
        "B5DF0130F97F76D40D039FF7122C2A75839E66C829566A731F81559CCAD358F5",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_40_40_independent_audit_delta1d41_20260825.json":
        "70278E9E204CE23B218EA6EFA9371B00736C0060FAF34186D2BFD40C4DE35A82",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load("rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order41_small_F25_"
        "independent_audit_delta1d41_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order41_bound_chain_independent_audit_"
        "delta1d41_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_41"
    assert assembled["D_order"] == 41
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_"
        "F_ORDER_AT_MOST_25"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER41_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 480

    coverage = list(range(0, 26))
    totals = {
        key: small["aggregate"][key]
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    digest = hashlib.sha256()
    digest.update(
        (
            "small:"
            + small["aggregate"]["ordered_region_digest_sha256"]
            + "\n"
        ).encode()
    )
    endpoint_hashes = {small["raw_endpoint_numerator"]["sha256"]}
    for first, last in SHARDS:
        name = (
            "rank8_delta1_new_leaf_mask3_order41_exact_F_"
            f"{first}_{last}_independent_audit_delta1d41_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["F_orders"] == list(range(first, last + 1))
        coverage.extend(audit["F_orders"])
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
        for key in totals:
            totals[key] += audit["aggregate"][key]
        digest.update(
            (
                f"{first}-{last}:"
                + audit["aggregate"]["ordered_region_digest_sha256"]
                + "\n"
            ).encode()
        )
    assert coverage == list(range(41))
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }
    assert totals == assembled["aggregate"] == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    assert assembled["ordered_partition_digest_sha256"] == digest.hexdigest().upper()
    assert assembled["F_order_partition"] == [
        {"first_F_order": 0, "last_F_order": 25},
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
            "rank8-delta1-new-leaf-mask3-order41-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_41",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 40 without gaps",
            "all 1,156,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 41,
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
