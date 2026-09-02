#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=38, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json"
SHARDS = ((23, 24), (25, 26), (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 37))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py":
        "18FB3906349B3F51BAAF2D276C98A4D4C2C2E54630F3FA3F76CD4768165ECB9D",
    "audit_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py":
        "2C7AA808CB7D0DFFCB2F3C87A08FED23D195C613DDB7427ABD4A340BC209B49E",
    "prove_rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38.py":
        "1B49DA1A17E50F1C1A530E0C540063F8C10A91FD4D9301D6A6F3AFAF83B43F65",
    "rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38_20260825.json":
        "4A595B5805125ED0906B8EE9CE37DA7D95B780EFB14B73474BF7E2F90457E65D",
    "audit_rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38.py":
        "AB7FAA43B05EE2307C0A01A88935C17050C7599BC1CE8264F1A1A68EEAECDF0B",
    "rank8_delta1_new_leaf_mask3_order38_small_F22_independent_audit_delta1d38_20260825.json":
        "3D1D8A1650C73BAF44C46A18535040AC3DE3E5231A7DFED6B4D10457F3D94FA7",
    "audit_rank8_delta1_order38_bound_chain_delta1d38.py":
        "15BA4F219AC6F8836BFB795AFA5B2ED26015E7111F9EB12A16CA7CA3AA103CFC",
    "rank8_delta1_order38_bound_chain_independent_audit_delta1d38_20260825.json":
        "6E1D011E11116E2D7ED0DA23D57843FD30151BF63C1874268820FC6E4D116F19",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_delta1d38_20260825.json":
        "974941C8B7384478DB18486EEE9D4DA282C9269C646DEA345ED38AADC6D15DB0",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_independent_audit_delta1d38_20260825.json":
        "8738F56ABA5C4AA7E0B672AF9CA4A43E0EB7E611CFB2B0DAEA4CADF7C24E8AE5",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_25_26_delta1d38_20260825.json":
        "BA46665E5FBEAA2DDA450B93B5DD61FA69D9A3EF255495173280860629E60021",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_25_26_independent_audit_delta1d38_20260825.json":
        "92C0BEC46E61D25F79A0423A67341B61D467A654063CFC513A76DE9744F7D54D",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_27_28_delta1d38_20260825.json":
        "9316A5FC677F922C3280FE9B9976013CDEB198F68A17A165EEFA8E84B99B98B7",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_27_28_independent_audit_delta1d38_20260825.json":
        "0E5E94FCC24F733AB9C3169CA59ECA02DC57D3B371D8207BD519F9D28E115DB9",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_29_30_delta1d38_20260825.json":
        "6EDA65FED05393AE4BA3C402671341A9B0E868B4E332D59BC8DBCB06BEB284A2",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_29_30_independent_audit_delta1d38_20260825.json":
        "E9556B8486E6D5EA06C30A07D34A20066AB28B17BECD6E1F137ED3AC949BCA73",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_31_32_delta1d38_20260825.json":
        "C274BC1847EFE1B9D2D892F516ACE37B1E45672C6F30935A7D65B209383A27C7",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_31_32_independent_audit_delta1d38_20260825.json":
        "739B766C8F61FF7FED9457FFFF3DCD70B1C4D2B296D08A288B3E4A5D56CEC80F",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_33_34_delta1d38_20260825.json":
        "649A4FD3F72C5F7108E469D14B2FDC5F83511C118CADECAE54CBD25BECEFA67E",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_33_34_independent_audit_delta1d38_20260825.json":
        "DA45A27A5A0630EB70A8341F896FDF370C83187AFE0C5F023A17A8036C3F39C2",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_35_36_delta1d38_20260825.json":
        "6890346FFA68D518A8952E2EF8AE91101B0927BDF193A1DD95F9EA178850710B",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_35_36_independent_audit_delta1d38_20260825.json":
        "F7FCB422B5CC7A7D256B90B7262D28D5386322116ABDDD11526C2592E3929427",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_37_37_delta1d38_20260825.json":
        "DA0E3C337A395B7399F3D9C7FD45EE25F7F74FB8134A3D5894C64D9FF6AE2C77",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_37_37_independent_audit_delta1d38_20260825.json":
        "0CED42C9761F44D1135B81233C20A5C50686436FFDBE4057F14523413A6D00C5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order38_small_F22_"
        "delta1d38_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order38_small_F22_"
        "independent_audit_delta1d38_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order38_bound_chain_independent_audit_"
        "delta1d38_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_F_ORDER_AT_MOST_22"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_"
        "F_ORDER_AT_MOST_22"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER38_BOUND_CHAIN"
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
            "rank8_delta1_new_leaf_mask3_order38_exact_F_"
            f"{first}_{last}_delta1d38_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order38_exact_F_"
            f"{first}_{last}_independent_audit_delta1d38_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_38_"
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
    assert exact_coverage == list(range(23, 38))

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
        "schema": "rank8-delta1-new-leaf-mask3-order38-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_38",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=38."
        ),
        "D_order": 38,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 22},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=37. The small branch covers "
            "0<=|F|<=22 and the exact shards cover every integer 23<=|F|<=37."
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
            "This certificate closes only endpoint mask 3 at D order 38. "
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
