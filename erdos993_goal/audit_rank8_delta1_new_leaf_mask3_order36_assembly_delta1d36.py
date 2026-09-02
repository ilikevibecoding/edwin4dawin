#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=36 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order36_assembly_"
    "independent_audit_delta1d36_20260825.json"
)
BRIDGES = (20, 21, 22, 23, 24)
SHARDS = ((25, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order36_delta1d36.py":
        "162A0F61F6224E61B47F290E07872EBBAB1C788B41AB18A218A7E54954900E7E",
    "rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json":
        "343ECCC16637FC8DABEAAD4C6C8188D13DCB9E5D94DA8904B236BA0C1F04823E",
    "rank8_delta1_new_leaf_mask3_order36_small_F19_independent_audit_delta1d36_20260825.json":
        "CC06D4127C99D4EEAAD3718160339C42BD0C1439905909F0C36955993C82C2AB",
    "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_independent_audit_delta1d36_20260825.json":
        "7F935023FB65D8DEA0A1D043A9B60C6AE00FF9447BA2DE1AC192C3356AE5ECDF",
    "rank8_delta1_new_leaf_mask3_order36_exact_F21_bridge_independent_audit_delta1d36_20260825.json":
        "E16247140681E07163015338A205D77A696F0C9CB0C931F047EC1090EC42CFE9",
    "rank8_delta1_new_leaf_mask3_order36_exact_F22_bridge_independent_audit_delta1d36_20260825.json":
        "1586B2BC90A939535F03527F468DE439A9AE72AAB8F44F57F3669AD0BE7E54CB",
    "rank8_delta1_new_leaf_mask3_order36_exact_F23_bridge_independent_audit_delta1d36_20260825.json":
        "4D0B1B991140FC45821FD6A06B207B1E4EE5A64BDD0256B91063E4C6E8EC73CE",
    "rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_independent_audit_delta1d36_20260825.json":
        "98356E437251788BB0B36502486810A393F0369D2C85E527C2DCED9E7C41FD09",
    "rank8_delta1_order36_bound_chain_independent_audit_delta1d36_20260825.json":
        "27C866739491E00B96D008903BE4CA7815D4A26F35FBD1440D74639860119DA1",
    "rank8_delta1_order36_split_diagnostic_audit_delta1d36_20260825.json":
        "EA4BB358E56F5F9AB19B4FE88A9E02E540F73F951467597627C2B5A5B11E469E",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_25_25_independent_audit_delta1d36_20260825.json":
        "3192A9978323FC57A8DA8DB767E108F78863C36191B792B571FD71C8108EA037",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_26_27_independent_audit_delta1d36_20260825.json":
        "66DC94C4945BC62FF972DBEFC5C7130FF29A22B21000A9C0A3998E2BEAC4496B",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_28_29_independent_audit_delta1d36_20260825.json":
        "EF31E0BC3847EEA55177E577B933373817629EB3C0BCC6395B6ACFF1F148CEDF",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_30_31_independent_audit_delta1d36_20260825.json":
        "78A73AD5FA4DAF2935172A5B99B016C2CD8567D438540777803CD2A37C57B9F8",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_32_33_independent_audit_delta1d36_20260825.json":
        "2F65457A3976253E11BDE7EDAE85EF38EFFED4BB2DE9FDEF8B921415D1C50459",
    "rank8_delta1_new_leaf_mask3_order36_exact_F_34_35_independent_audit_delta1d36_20260825.json":
        "5759F35A7D95EB80CF06B2265B337B791BA187E8E39286480527A546DA78AD98",
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
    assert len(EXPECTED) == 18
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load("rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order36_small_F19_"
        "independent_audit_delta1d36_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order36_bound_chain_independent_audit_"
        "delta1d36_20260825.json"
    )
    split = load(
        "rank8_delta1_order36_split_diagnostic_audit_delta1d36_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_36"
    assert assembled["D_order"] == 36
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER36_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 352
    assert split["small_cutoff"] == 19

    coverage = list(range(20))
    audits = [("small", small)]
    for order in BRIDGES:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order36_exact_"
            f"F{order}_bridge_independent_audit_delta1d36_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDER_{order}_BRIDGE"
        )
        coverage.append(order)
        audits.append((f"bridge-{order}", audit))
    for first, last in SHARDS:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order36_exact_F_"
            f"{first}_{last}_independent_audit_delta1d36_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["F_orders"] == list(range(first, last + 1))
        coverage.extend(audit["F_orders"])
        audits.append((f"{first}-{last}", audit))
    assert coverage == list(range(36))

    keys = ("regions", "coefficients", "negative", "zero", "positive")
    totals = {key: sum(audit["aggregate"][key] for _, audit in audits) for key in keys}
    assert totals == assembled["aggregate"] == {
        "regions": 732, "coefficients": 876600,
        "negative": 0, "zero": 0, "positive": 876600,
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
        {"first_F_order": 0, "last_F_order": 19},
        *[{"first_F_order": order, "last_F_order": order} for order in BRIDGES],
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
            "rank8-delta1-new-leaf-mask3-order36-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_36",
        "verified": [
            "the small branch, five exact cap-ratio bridges, and every ordinary exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 35 without gaps",
            "all 876,600 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, switch, and split-diagnostic chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 36,
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
