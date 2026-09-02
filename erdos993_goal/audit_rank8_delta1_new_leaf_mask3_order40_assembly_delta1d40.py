#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=40 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order40_assembly_"
    "independent_audit_delta1d40_20260825.json"
)
SHARDS = ((25, 26), (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 38), (39, 39))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order40_delta1d40.py":
        "DE2EFD4AAEB6B6CEA3A5986121B09D89151CA674BD75DDCCA79AD8F3F99D3577",
    "rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json":
        "787F91A54C710E024AE8944DBF6C98686E5FD99B48E271BA50767A4C9DB96B46",
    "audit_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py":
        "9AB1AA6631B6C006D60985D9AD4AB590604077468A661084A4729219D18E4043",
    "rank8_delta1_new_leaf_mask3_order40_small_F24_independent_audit_delta1d40_20260825.json":
        "302F7B53E68FE7B10CF7F92BAD3AE743F3E6E2E7B3C2BA94B96EF138AFF4BE7C",
    "rank8_delta1_order40_bound_chain_independent_audit_delta1d40_20260825.json":
        "B0286456A0707F1059268E8CC50941025F9B6D8D21E0F79A91F8FF87323EBC9C",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_independent_audit_delta1d40_20260825.json":
        "85194D8F2895810492871296CCC24A0F529B080610516D6E2DD1007E576CB3F6",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_27_28_independent_audit_delta1d40_20260825.json":
        "34722F3901BC266308EC158A523B36A521916C3E104682D6D3D526FD5655E47F",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_29_30_independent_audit_delta1d40_20260825.json":
        "AE84D5ADE4FBE60AA43AA6F561129AD0A2B0C50EAE3628613C2CFECED727167A",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_31_32_independent_audit_delta1d40_20260825.json":
        "CB20FD1DD2A13E56130BCEF31EB68553EBA180B7E2DAA648ABD374E64A8057DA",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_33_34_independent_audit_delta1d40_20260825.json":
        "049BB68B09ADCB1DDB5CE7DBA7D73FC8E945D4D00A4AE8A36B8659D278D7A682",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_35_36_independent_audit_delta1d40_20260825.json":
        "A34459507F99DA79AFD4DD7552306A2CDDA3328960407CF21D8E3FE9C75DB141",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_37_38_independent_audit_delta1d40_20260825.json":
        "D461FD977053F27136E693F095DF6A083C5DF7F3B26FB066D02A1D94A9E3A24B",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_39_39_independent_audit_delta1d40_20260825.json":
        "432B0481D08CF658795AADB4C496E10109B8FD65CEF37EBA8C48C0DF11783CC5",
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
    assembled = load("rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order40_small_F24_"
        "independent_audit_delta1d40_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order40_bound_chain_independent_audit_"
        "delta1d40_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40"
    assert assembled["D_order"] == 40
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_"
        "F_ORDER_AT_MOST_24"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER40_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 480

    coverage = list(range(0, 25))
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
            "rank8_delta1_new_leaf_mask3_order40_exact_F_"
            f"{first}_{last}_independent_audit_delta1d40_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_"
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
    assert coverage == list(range(40))
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
        {"first_F_order": 0, "last_F_order": 24},
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
            "rank8-delta1-new-leaf-mask3-order40-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 39 without gaps",
            "all 1,156,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 40,
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
