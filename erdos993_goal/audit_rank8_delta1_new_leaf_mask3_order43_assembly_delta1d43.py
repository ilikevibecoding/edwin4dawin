#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=43 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order43_assembly_"
    "independent_audit_delta1d43_20260825.json"
)
SHARDS = ((18, 23), (24, 29), (30, 35), (36, 42))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order43_delta1d43.py":
        "2894BCB5802DFE0DDB10A63565160AE0FD60F4F03D924C75B1302C1A130B11DF",
    "rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json":
        "DD8A2D5A76C6406BBA2056D540E89C8FA82A987895F0924A3156ECA3A429D68E",
    "audit_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43.py":
        "B11EFD7CEEC5066A0FFE473DA634390A75A7D385373C67EBEF2754F3A3AE7DFD",
    "rank8_delta1_new_leaf_mask3_order43_small_F17_independent_audit_delta1d43_20260825.json":
        "9F2D021B7EADD5DD4602CCA27868C3E45AE64AF5FE68BCEF5E0233FB6A635A9F",
    "rank8_delta1_order43_bound_chain_independent_audit_delta1d43_20260825.json":
        "98DA1F1AADB651E85881EFBD11433A0461DDD639D5A0C0D1D168F336A0F57F00",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_18_23_independent_audit_delta1d43_20260825.json":
        "7D3F0479CD079D71CC1902525C1CD79454FBF4F1D55523BBF4C77DE9F4906D84",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_24_29_independent_audit_delta1d43_20260825.json":
        "A5054EBCA66EFB7F5229EF5EDBFE89A3B7255C67329607491EDEBD242BBB7286",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_30_35_independent_audit_delta1d43_20260825.json":
        "0B6A484EDFEAA3756606EB1DC2ED819ABEC4D226DDA606E532F444EB412C7EE6",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_36_42_independent_audit_delta1d43_20260825.json":
        "07C106467B7E4F8F1401C14A1E1327F621997B3355C724834A87CDF5A981B53C",
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
    assembled = load("rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order43_small_F17_"
        "independent_audit_delta1d43_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order43_bound_chain_independent_audit_"
        "delta1d43_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_43"
    assert assembled["D_order"] == 43
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_"
        "F_ORDER_AT_MOST_17"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER43_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 800

    coverage = list(range(0, 18))
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
            "rank8_delta1_new_leaf_mask3_order43_exact_F_"
            f"{first}_{last}_independent_audit_delta1d43_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_"
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
    assert coverage == list(range(43))
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }
    assert totals == assembled["aggregate"] == {
        "regions": 1604,
        "coefficients": 1924200,
        "negative": 0,
        "zero": 0,
        "positive": 1924200,
    }
    assert assembled["ordered_partition_digest_sha256"] == digest.hexdigest().upper()
    assert assembled["F_order_partition"] == [
        {"first_F_order": 0, "last_F_order": 17},
        {"first_F_order": 18, "last_F_order": 23},
        {"first_F_order": 24, "last_F_order": 29},
        {"first_F_order": 30, "last_F_order": 35},
        {"first_F_order": 36, "last_F_order": 42},
    ]

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw["sha256"] in endpoint_hashes
    assert str(denominator) == assembled["cleared_endpoint_denominator"]

    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-order43-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_43",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 42 without gaps",
            "all 1,924,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 43,
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
