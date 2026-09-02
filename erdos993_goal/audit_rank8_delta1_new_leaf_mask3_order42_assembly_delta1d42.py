#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=42 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order42_assembly_"
    "independent_audit_delta1d42_20260825.json"
)
SHARDS = ((27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 38), (39, 40), (41, 41))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order42_delta1d42.py":
        "53BBCD3AB0013BC27604F96736294561A732A62F147E638B3A3C67917DC5EE9A",
    "rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json":
        "8D429EC79FC4759455A762DA1A13E0C19B9D18A4235BEA5ACC34DCAAFA98DCF7",
    "audit_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py":
        "A3492F30806A5DFF496ADE7A003516D4374E0ACDA4D9EBAF818BB27B86183051",
    "rank8_delta1_new_leaf_mask3_order42_small_F26_independent_audit_delta1d42_20260825.json":
        "C6BA56CEFD2466F1EC2146420EF4C28ED74F88D0C7640890C78F3BCF24E493E7",
    "rank8_delta1_order42_bound_chain_independent_audit_delta1d42_20260825.json":
        "9F3E5C38C5399E584CCD8D306EAC391DDE654D0E1B0B271A7BC69EEDC855907A",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_independent_audit_delta1d42_20260825.json":
        "85B27E9374BB094D6A38A11267BA5E539FDEA147415BE23DCBD44F927FA0CB7E",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_29_30_independent_audit_delta1d42_20260825.json":
        "69488ABE8BCC493D8ACD98EA295A54B7842DD7D648BB5E25E778D5B9E38AB543",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_31_32_independent_audit_delta1d42_20260825.json":
        "6E566AEBDA02D7D7813766E61D3795BE3DDB3D6BF38621133CC6B5F43890CD92",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_33_34_independent_audit_delta1d42_20260825.json":
        "A5016D2625B15B681B2829107DF00E6E7C4E9526B5E6BD0EA277DD52BDE1F544",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_35_36_independent_audit_delta1d42_20260825.json":
        "5021FF2903C0E07467429282119F49EED57F0A4F7C4180FFF1703012644B7F36",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_37_38_independent_audit_delta1d42_20260825.json":
        "2A2342332D1EDA9DDBA30F7AC2DBAD51EAAABA47C270FC68092FCCC900225946",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_39_40_independent_audit_delta1d42_20260825.json":
        "BD93851B0918AC810620E9661A000B2ADCDE36656A1879A237D1F7EA4455B736",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_41_41_independent_audit_delta1d42_20260825.json":
        "313B6BC9C0141BBACE4A61B45EE4D70C5930653F8246877BB034808CF9DF9E30",
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
    assembled = load("rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order42_small_F26_"
        "independent_audit_delta1d42_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order42_bound_chain_independent_audit_"
        "delta1d42_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_42"
    assert assembled["D_order"] == 42
    assert small["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_"
        "F_ORDER_AT_MOST_26"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER42_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 480

    coverage = list(range(0, 27))
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
            "rank8_delta1_new_leaf_mask3_order42_exact_F_"
            f"{first}_{last}_independent_audit_delta1d42_20260825.json"
        )
        audit = load(name)
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_42_"
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
    assert coverage == list(range(42))
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
        {"first_F_order": 0, "last_F_order": 26},
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
            "rank8-delta1-new-leaf-mask3-order42-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_42",
        "verified": [
            "the small branch and every exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 41 without gaps",
            "all 1,156,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, and switch chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 42,
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
