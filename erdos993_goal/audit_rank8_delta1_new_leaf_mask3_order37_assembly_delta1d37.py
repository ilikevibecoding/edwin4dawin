#!/usr/bin/env python3
"""Independent fail-closed audit of the assembled D=37 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order37_assembly_"
    "independent_audit_delta1d37_20260825.json"
)
BRIDGES = (21, 22, 23)
SHARDS = ((24, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 36))
EXPECTED = {
    "assemble_rank8_delta1_new_leaf_mask3_order37_delta1d37.py":
        "130A33A0A48A299DE9583C0A214C1295764518EBD65830A2AFA3B9FBC2466726",
    "rank8_delta1_new_leaf_mask3_order37_delta1d37_20260825.json":
        "2211E11221BD888678A85A058067C82C5E991E606AE7BDC8A8B376D3D5F961BE",
    "rank8_delta1_new_leaf_mask3_order37_small_F20_independent_audit_delta1d37_20260825.json":
        "BC4B6038DE3B94E2C3060417E495DCA674978D44D1FAC08A073B9F4493C49342",
    "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_independent_audit_delta1d37_20260825.json":
        "BE8A89377A719040B518AB6FC96A13E0C8ACCB775AC73A7702314DAFECD6CCF5",
    "rank8_delta1_new_leaf_mask3_order37_exact_F22_bridge_independent_audit_delta1d37_20260825.json":
        "B2A9384EFB633454BC99A79732EC44ABBBDB24BCCCAC3A5EB50C6A9423B34B39",
    "rank8_delta1_new_leaf_mask3_order37_exact_F23_bridge_independent_audit_delta1d37_20260825.json":
        "8F826B180E8697AF3A68265BED2D6DF59DC755BE11045299A632E65172A6B6A4",
    "rank8_delta1_order37_bound_chain_independent_audit_delta1d37_20260825.json":
        "EBA3CC04FCEA010905624CC15BD3D4F927BF0E0B6571ABD1D63403BEDCA6C3AB",
    "rank8_delta1_order37_split_diagnostic_audit_delta1d37_20260825.json":
        "1C77F20BC936894147BFBB57170916E40F991450BB933998E67FB576029F3A86",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_24_25_independent_audit_delta1d37_20260825.json":
        "FA65DB1CE32509D403E1FD1F663DD37086EAC9D1524006731E6BAAAC35020EF4",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_26_27_independent_audit_delta1d37_20260825.json":
        "1D1E52F347637FD7A3B22A6798A65B3E6AA7B9659710C5518C62BFDB05D8E652",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_28_29_independent_audit_delta1d37_20260825.json":
        "3C4BC8AB7EE64E32134E9A6B458B16F44938CDD148CB5A60BEDE72D3B347C80E",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_30_31_independent_audit_delta1d37_20260825.json":
        "3BA25BEA4E45BD2C3591346B87D988496851CFF5DD63D3A349190B8148132C2A",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_32_33_independent_audit_delta1d37_20260825.json":
        "E0791BE9EB3011BA0319DA5C6F824A289C59B5C15B2A4825F368016AB618EDB5",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_34_35_independent_audit_delta1d37_20260825.json":
        "424159720139A024EC4A17201B096A103BFCBA7B646D12DCE4129AB51439C7AE",
    "rank8_delta1_new_leaf_mask3_order37_exact_F_36_36_independent_audit_delta1d37_20260825.json":
        "5263C61AF076BE52716182ACDA2EBADACD01BE7CD9194B87DFA4EBCCA20B6F61",
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
    assert len(EXPECTED) == 17
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    assembled = load("rank8_delta1_new_leaf_mask3_order37_delta1d37_20260825.json")
    small = load(
        "rank8_delta1_new_leaf_mask3_order37_small_F20_"
        "independent_audit_delta1d37_20260825.json"
    )
    bounds = load(
        "rank8_delta1_order37_bound_chain_independent_audit_"
        "delta1d37_20260825.json"
    )
    split = load(
        "rank8_delta1_order37_split_diagnostic_audit_delta1d37_20260825.json"
    )
    assert assembled["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_37"
    assert assembled["D_order"] == 37
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER37_BOUND_CHAIN"
    assert bounds["exact_switch_checks"] == 416
    assert split["small_cutoff"] == 20

    coverage = list(range(21))
    audits = [("small", small)]
    for order in BRIDGES:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order37_exact_"
            f"F{order}_bridge_independent_audit_delta1d37_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDER_{order}_BRIDGE"
        )
        coverage.append(order)
        audits.append((f"bridge-{order}", audit))
    for first, last in SHARDS:
        audit = load(
            "rank8_delta1_new_leaf_mask3_order37_exact_F_"
            f"{first}_{last}_independent_audit_delta1d37_20260825.json"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_37_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["F_orders"] == list(range(first, last + 1))
        coverage.extend(audit["F_orders"])
        audits.append((f"{first}-{last}", audit))
    assert coverage == list(range(37))

    keys = ("regions", "coefficients", "negative", "zero", "positive")
    totals = {
        key: sum(audit["aggregate"][key] for _, audit in audits)
        for key in keys
    }
    assert totals == assembled["aggregate"] == {
        "regions": 850, "coefficients": 1018200,
        "negative": 0, "zero": 0, "positive": 1018200,
    }
    digest = hashlib.sha256()
    endpoint_hashes = set()
    for label, audit in audits:
        digest.update(
            (
                f"{label}:"
                + audit["aggregate"]["ordered_region_digest_sha256"]
                + "\n"
            ).encode()
        )
        endpoint_hashes.add(audit["raw_endpoint_numerator"]["sha256"])
    assert assembled["ordered_partition_digest_sha256"] == digest.hexdigest().upper()
    assert endpoint_hashes == {
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    }
    assert assembled["F_order_partition"] == [
        {"first_F_order": 0, "last_F_order": 20},
        *[
            {"first_F_order": order, "last_F_order": order}
            for order in BRIDGES
        ],
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
            "rank8-delta1-new-leaf-mask3-order37-assembly-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_37",
        "verified": [
            "the small branch, three exact cap-ratio bridges, and every ordinary exact-F shard have independent tensor replays",
            "the integer F-order partition is exactly 0 through 36 without gaps",
            "all 1,018,200 Bernstein coefficients are strictly positive",
            "the analytic ratio, Q5, two-extension, floor, switch, and split-diagnostic chain is pinned and replayed",
            "the canonical endpoint numerator and positive denominator are reconstructed",
        ],
        "D_order": 37,
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
