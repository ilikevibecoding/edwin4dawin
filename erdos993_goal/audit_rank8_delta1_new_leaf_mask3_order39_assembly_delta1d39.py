#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=39 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order39_assembly_"
    "independent_audit_delta1d39_20260825.json"
)
SHARDS = ((24, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 37), (38, 38))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order39_delta1d39.py":
        "4AAFBF0921EE7269AAD75E4956FFE0091A693D6E00011DCBBFCDDDD44D3D7B4F",
    "rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json":
        "43BA2B9BEA6D09B3C8ACD59D84E9FC4449C32C8C0E4534542DF938E0362574FC",
    "audit_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "76C6938C734DBA7E1A1E2842CD21064B2F483AEA7ABED42A4EFB568E42A58DA6",
    "rank8_delta1_new_leaf_mask3_order39_small_F23_independent_audit_delta1d39_20260825.json":
        "EDBFC216F4C99E79B5999904CBCD3DCDE303D9A0B14B0A31678CFF6F07BB4923",
    "rank8_delta1_order39_bound_chain_independent_audit_delta1d39_20260825.json":
        "77B90700811F3882C1EDFEDFA74124D86CCF875539B66E4595DA5A5D8D8D6C62",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_independent_audit_delta1d39_20260825.json":
        "910E64C6545049A78F73128EE6FC06FF85FA95ED908FF833AFF5BA3E59E09E6D",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_26_27_independent_audit_delta1d39_20260825.json":
        "C42C645A48552A614F87A2A5D0C9A8EED695A691F801134731B8F94401BAFD0B",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_28_29_independent_audit_delta1d39_20260825.json":
        "A1AA761D7CDB7D57D9115239D062B186BFF77F83DFE1ACC61B090817C0C68AD9",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_30_31_independent_audit_delta1d39_20260825.json":
        "11A1877F41DA722B43488B67E3E8EE4DB02DF06DF18C58BE543CB3C14BFAFF8A",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_32_33_independent_audit_delta1d39_20260825.json":
        "F8C35237050D2C870E1C478176B9ECB44EBE55E3CB06E7735D315FEB16BEB828",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_34_35_independent_audit_delta1d39_20260825.json":
        "DC56FCB9FAEC130C00C158B35E86693F6336AC644ABE5CBFE26E636BFE5CFF8E",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_36_37_independent_audit_delta1d39_20260825.json":
        "9152F3A525682591134BC64B91F8EA0A63C7EFD2FE1EA44058BE3DC08C3145B4",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_38_38_independent_audit_delta1d39_20260825.json":
        "BD26F72A53531C4B7ECFC2B725C30E9A57CCA94B0CE524EE7A2F71532423265D",
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
    assembled = load("rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order39_small_F23_"
        "independent_audit_delta1d39_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order39_bound_chain_independent_audit_"
        "delta1d39_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_39"
    assert assembled["D_order"] == 39
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
        "F_ORDER_AT_MOST_23"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER39_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 480

    coverage = list(range(0, 24))
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
            "rank8_delta1_new_leaf_mask3_order39_exact_F_"
            f"{first}_{last}_independent_audit_delta1d39_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
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
    assert coverage == list(range(39))
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
        {"first_F_order": 0, "last_F_order": 23},
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
            "rank8-delta1-new-leaf-mask3-order39-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_39",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 38 without gaps",
            "all 1,156,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 39,
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
