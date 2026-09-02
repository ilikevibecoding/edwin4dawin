#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=38 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order38_assembly_"
    "independent_audit_delta1d38_20260825.json"
)
SHARDS = ((23, 24), (25, 26), (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 37))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order38_delta1d38.py":
        "03B307F1526A90DDB6B3D8DEC774851799A62A1CA8F7A9F5AF6E6D89B4966A9D",
    "rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json":
        "9FBA55E56968D39575E03B04558335505773842046C7EA9FA3F3E5B2EA30E32D",
    "audit_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py":
        "2C7AA808CB7D0DFFCB2F3C87A08FED23D195C613DDB7427ABD4A340BC209B49E",
    "rank8_delta1_new_leaf_mask3_order38_small_F22_independent_audit_delta1d38_20260825.json":
        "3D1D8A1650C73BAF44C46A18535040AC3DE3E5231A7DFED6B4D10457F3D94FA7",
    "rank8_delta1_order38_bound_chain_independent_audit_delta1d38_20260825.json":
        "6E1D011E11116E2D7ED0DA23D57843FD30151BF63C1874268820FC6E4D116F19",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_independent_audit_delta1d38_20260825.json":
        "8738F56ABA5C4AA7E0B672AF9CA4A43E0EB7E611CFB2B0DAEA4CADF7C24E8AE5",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_25_26_independent_audit_delta1d38_20260825.json":
        "92C0BEC46E61D25F79A0423A67341B61D467A654063CFC513A76DE9744F7D54D",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_27_28_independent_audit_delta1d38_20260825.json":
        "0E5E94FCC24F733AB9C3169CA59ECA02DC57D3B371D8207BD519F9D28E115DB9",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_29_30_independent_audit_delta1d38_20260825.json":
        "E9556B8486E6D5EA06C30A07D34A20066AB28B17BECD6E1F137ED3AC949BCA73",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_31_32_independent_audit_delta1d38_20260825.json":
        "739B766C8F61FF7FED9457FFFF3DCD70B1C4D2B296D08A288B3E4A5D56CEC80F",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_33_34_independent_audit_delta1d38_20260825.json":
        "DA45A27A5A0630EB70A8341F896FDF370C83187AFE0C5F023A17A8036C3F39C2",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_35_36_independent_audit_delta1d38_20260825.json":
        "F7FCB422B5CC7A7D256B90B7262D28D5386322116ABDDD11526C2592E3929427",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_37_37_independent_audit_delta1d38_20260825.json":
        "0CED42C9761F44D1135B81233C20A5C50686436FFDBE4057F14523413A6D00C5",
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
    assembled = load("rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order38_small_F22_"
        "independent_audit_delta1d38_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order38_bound_chain_independent_audit_"
        "delta1d38_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_38"
    assert assembled["D_order"] == 38
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_"
        "F_ORDER_AT_MOST_22"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER38_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 480

    coverage = list(range(0, 23))
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
            "rank8_delta1_new_leaf_mask3_order38_exact_F_"
            f"{first}_{last}_independent_audit_delta1d38_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_"
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
    assert coverage == list(range(38))
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
        {"first_F_order": 0, "last_F_order": 22},
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
            "rank8-delta1-new-leaf-mask3-order38-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_38",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 37 without gaps",
            "all 1,156,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 38,
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
