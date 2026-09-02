#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=43, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json"
SHARDS = ((18, 23), (24, 29), (30, 35), (36, 42))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43.py":
        "E04C43AC27C1C795A1A3698E8851D9BA5168FD58FF4DE48978AD964EF127E4F4",
    "audit_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43.py":
        "B11EFD7CEEC5066A0FFE473DA634390A75A7D385373C67EBEF2754F3A3AE7DFD",
    "prove_rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43.py":
        "1765BFAC5EE1AC0B3A2790DD5286EEB383EF2254273258715E2AB22D5DE05210",
    "rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43_20260825.json":
        "D30AB7AC32B5FCFF5249D3757C014321C0C5A938C40FA67227E5A624842553E6",
    "audit_rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43.py":
        "42007F4C6738D397C9FB59137BD9B79507B8F6A1AA71C48B8CF36D4E8B10AC3E",
    "rank8_delta1_new_leaf_mask3_order43_small_F17_independent_audit_delta1d43_20260825.json":
        "9F2D021B7EADD5DD4602CCA27868C3E45AE64AF5FE68BCEF5E0233FB6A635A9F",
    "audit_rank8_delta1_order43_bound_chain_delta1d43.py":
        "9EA713D51EDC03CDCACE483074E6DDCA4CB92850C5FE2012D012D4171D1D6CF3",
    "rank8_delta1_order43_bound_chain_independent_audit_delta1d43_20260825.json":
        "98DA1F1AADB651E85881EFBD11433A0461DDD639D5A0C0D1D168F336A0F57F00",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_18_23_delta1d43_20260825.json":
        "8D4260683BC003B77B0DCDDC35B4CB6B9CF8C1616D62749C129401ECC52EB261",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_24_29_delta1d43_20260825.json":
        "14DF56E8C82F0CD09AEC0B794790EDC9B34DCD9824C9C3DFFD8529546072015F",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_30_35_delta1d43_20260825.json":
        "AE7CBAA67D4915A6ABC17A14D9CF233B8BA09DD2EA831C38DD65D9D4B0191162",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_36_42_delta1d43_20260825.json":
        "EE8D898F75069E1DBC669E9C0D2EBCEB6C4576B6FBCDB4358F38E0F00E159F61",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_18_23_independent_audit_delta1d43_20260825.json":
        "7D3F0479CD079D71CC1902525C1CD79454FBF4F1D55523BBF4C77DE9F4906D84",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_24_29_independent_audit_delta1d43_20260825.json":
        "A5054EBCA66EFB7F5229EF5EDBFE89A3B7255C67329607491EDEBD242BBB7286",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_30_35_independent_audit_delta1d43_20260825.json":
        "0B6A484EDFEAA3756606EB1DC2ED819ABEC4D226DDA606E532F444EB412C7EE6",
    "rank8_delta1_new_leaf_mask3_order43_exact_F_36_42_independent_audit_delta1d43_20260825.json":
        "07C106467B7E4F8F1401C14A1E1327F621997B3355C724834A87CDF5A981B53C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order43_small_F17_"
        "delta1d43_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order43_small_F17_"
        "independent_audit_delta1d43_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order43_bound_chain_independent_audit_"
        "delta1d43_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_F_ORDER_AT_MOST_17"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_"
        "F_ORDER_AT_MOST_17"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER43_BOUND_CHAIN"
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
            "rank8_delta1_new_leaf_mask3_order43_exact_F_"
            f"{first}_{last}_delta1d43_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order43_exact_F_"
            f"{first}_{last}_independent_audit_delta1d43_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_43_"
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
    assert exact_coverage == list(range(18, 43))

    totals = {
        key: small["aggregate"][key]
        + sum(primary["aggregate"][key] for primary in exact_primaries)
        for key in aggregate_keys
    }
    assert totals == {
        "regions": 1604,
        "coefficients": 1924200,
        "negative": 0,
        "zero": 0,
        "positive": 1924200,
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
        "schema": "rank8-delta1-new-leaf-mask3-order43-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_43",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=43."
        ),
        "D_order": 43,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 17},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=42. The small branch covers "
            "0<=|F|<=17 and the exact shards cover every integer 18<=|F|<=42."
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
            "This certificate closes only endpoint mask 3 at D order 43. "
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
