#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=41, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order41_delta1d41_20260825.json"
SHARDS = ((26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 37), (38, 39), (40, 40))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py":
        "6F21EF8B9577F83C845DCBCDB0A0CA628C9639F16807457E27129319850E8872",
    "audit_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py":
        "B1F57DBEE6BF2C11740BFFB726D62871E3785ADAF305C072DFC968CCBB4A1DCC",
    "prove_rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41.py":
        "B4EF136A3250154737502130AE5E6FF26FB8C09CF7315901B0F619CE1E9B7B87",
    "rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41_20260825.json":
        "839106E16721FF4E92A648801743D642E376757AB88AEA359B32C6383E441961",
    "audit_rank8_delta1_new_leaf_mask3_order41_small_F25_delta1d41.py":
        "3EF10D889E4CB82340B09B7F1DFDB6269A8D1A7ACA6129823D00BB8C8DD61653",
    "rank8_delta1_new_leaf_mask3_order41_small_F25_independent_audit_delta1d41_20260825.json":
        "5187287BDDD4F98FBCB2D7F9DD47F2F55C028C91122970F02B056CFC68F56CEB",
    "audit_rank8_delta1_order41_bound_chain_delta1d41.py":
        "D8765DE3B711226D196E62EE4B2F3FBC41A8C3D3F690EF902F125BCE580F9F08",
    "rank8_delta1_order41_bound_chain_independent_audit_delta1d41_20260825.json":
        "AD31ECFD2BA893FC5743CD4C8BEA7F68A3B0E32F99A4DC9C8A66A1F8F93BDCFC",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_delta1d41_20260825.json":
        "C663A580BC634A47768F8554A2777639A5B91EEA1454C6A1F97ECCAA968AE4F1",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_independent_audit_delta1d41_20260825.json":
        "6EF16701DA6B949DF1434A17908AA764C820D8EF797CDC8CDB7798D4F7C0F5C4",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_28_29_delta1d41_20260825.json":
        "FE56F1B2CF738D537E58246092D186280E751C0DDD85A9FAE5A5C1EBE816D3B9",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_28_29_independent_audit_delta1d41_20260825.json":
        "CC56FC084AA750F36BAFC3A5210ACBD8AD0932EEFB118FFA2CDBD1E62C974415",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_30_31_delta1d41_20260825.json":
        "7B5B9438B9930C3DDAEEC53D16077E0DDDD7E09A745B3B3CE1C794E440475F26",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_30_31_independent_audit_delta1d41_20260825.json":
        "547AEC9AFF8C297B3D54DD7875AC8B1F1C33036CAAEA3E9CBA8A9241E9685239",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_32_33_delta1d41_20260825.json":
        "28F578CA810B1B4B5F2D9C49DB01F7C557E361D11B09A6B06072F0E8BA59D8D6",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_32_33_independent_audit_delta1d41_20260825.json":
        "8FAA2FF6E636F8EBA8CB03E1B987E988EBA5FD671A785F093257A1BA6ED26102",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_34_35_delta1d41_20260825.json":
        "B0235397809DFF28497C5CDCF8283A514116C0A108AE36C61F48E30D01AA3E5A",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_34_35_independent_audit_delta1d41_20260825.json":
        "A5A0C4430FCCC66C03617A970E061A8253DA512D053138A261FFA58D9D720BC6",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_36_37_delta1d41_20260825.json":
        "0A68CB20BCB622B66CB815C82A12C120D698A86A4A742C0749C73F2C8D3A8AB7",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_36_37_independent_audit_delta1d41_20260825.json":
        "17710530BA6D7EAD3F909D071E55E250B2ACCA6812A928D42015CD78006E06FB",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_38_39_delta1d41_20260825.json":
        "E440F7B5BEB2F5768E32C4E8BD3DC6C0B5D523DA0D159AFC9DE6F9C7D91B709B",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_38_39_independent_audit_delta1d41_20260825.json":
        "B5DF0130F97F76D40D039FF7122C2A75839E66C829566A731F81559CCAD358F5",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_40_40_delta1d41_20260825.json":
        "C78C61A2D5A24B3AA4B6DFEE1859B1AAFDFA7499EE1A302FB141A7FB6DE189EC",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_40_40_independent_audit_delta1d41_20260825.json":
        "70278E9E204CE23B218EA6EFA9371B00736C0060FAF34186D2BFD40C4DE35A82",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order41_small_F25_"
        "delta1d41_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order41_small_F25_"
        "independent_audit_delta1d41_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order41_bound_chain_independent_audit_"
        "delta1d41_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_F_ORDER_AT_MOST_25"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_"
        "F_ORDER_AT_MOST_25"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER41_BOUND_CHAIN"
    assert small_audit["primary"]["sha256"] == actual[small_name]
    aggregate_keys = ("regions", "coefficients", "negative", "zero", "positive")
    assert all(
        small["aggregate"][key] == small_audit["aggregate"][key]
        for key in aggregate_keys
    )
    assert small["aggregate"] == {
        "regions": 4, "coefficients": 4200,
        "negative": 0, "zero": 0, "positive": 4200,
    }

    exact_coverage = []
    exact_primaries = []
    exact_audits = []
    for first, last in SHARDS:
        primary_name = (
            "rank8_delta1_new_leaf_mask3_order41_exact_F_"
            f"{first}_{last}_delta1d41_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order41_exact_F_"
            f"{first}_{last}_independent_audit_delta1d41_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_41_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["primary"]["sha256"] == actual[primary_name]
        assert all(
            primary["aggregate"][key] == audit["aggregate"][key]
            for key in aggregate_keys
        )
        assert primary["aggregate"]["regions"] == len(expected_orders) * 64
        assert primary["aggregate"]["coefficients"] == len(expected_orders) * 76800
        assert primary["aggregate"]["negative"] == 0
        assert primary["aggregate"]["zero"] == 0
        exact_coverage.extend(expected_orders)
        exact_primaries.append(primary)
        exact_audits.append(audit)
    assert exact_coverage == list(range(26, 41))

    totals = {
        key: small["aggregate"][key]
        + sum(primary["aggregate"][key] for primary in exact_primaries)
        for key in aggregate_keys
    }
    assert totals == {
        "regions": 964,
        "coefficients": 1156200,
        "negative": 0,
        "zero": 0,
        "positive": 1156200,
    }
    digest = hashlib.sha256()
    digest.update(
        (
            "small:"
            + small_audit["aggregate"]["ordered_region_digest_sha256"]
            + "\n"
        ).encode()
    )
    for audit in exact_audits:
        digest.update(
            (
                f"{audit['F_orders'][0]}-{audit['F_orders'][-1]}:"
                + audit["aggregate"]["ordered_region_digest_sha256"]
                + "\n"
            ).encode()
        )

    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order41-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_41",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=41."
        ),
        "D_order": 41,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 25},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=40. The small branch covers "
            "0<=|F|<=25 and the exact shards cover every integer 26<=|F|<=40."
        ),
        "analytic_bound_chain": {
            "status": bounds["status"],
            "mu4_floor": bounds["mu4_floor"],
            "mu5_floor": bounds["mu5_floor"],
            "x_bounds": bounds["x_bounds"],
            "y_bounds": bounds["y_bounds"],
            "exact_switch_checks": bounds["exact_switch_checks"],
        },
        "aggregate": totals,
        "ordered_partition_digest_sha256": digest.hexdigest().upper(),
        "raw_endpoint_numerator_sha256": small_audit[
            "raw_endpoint_numerator"
        ]["sha256"],
        "cleared_endpoint_denominator": "2744*d5**4*(d6 + f5)",
        "independent_reconstruction": (
            "Every primary box is replayed from the canonical endpoint "
            "transcript by an auditor importing neither producer nor probe."
        ),
        "proof_boundary": (
            "This certificate closes only endpoint mask 3 at D order 41. "
            "Masks 0-2 and separate endpoint concavity are assembled elsewhere."
        ),
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
