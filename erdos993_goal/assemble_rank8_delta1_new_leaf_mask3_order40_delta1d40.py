#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=40, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json"
SHARDS = ((25, 26), (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 38), (39, 39))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py":
        "3F8EBBD9EB30FF97D87A0D5F187BD2EFD4C516FCDA0A7A2DB63D85ED855F3BB6",
    "audit_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py":
        "9AB1AA6631B6C006D60985D9AD4AB590604077468A661084A4729219D18E4043",
    "prove_rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40.py":
        "AE50B058D008E49C2E32B4431F46FAA6DFCCD965C1988928362AEC9E2F0501C7",
    "rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40_20260825.json":
        "A3C854C9A6DB7E6415D1744EA150D1A116FE077847734037D2E80B99DE835B3D",
    "audit_rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40.py":
        "3E68D1EAB4522B63E82C7ED7E382E97857920F39D89906A2D724690FA06AC458",
    "rank8_delta1_new_leaf_mask3_order40_small_F24_independent_audit_delta1d40_20260825.json":
        "302F7B53E68FE7B10CF7F92BAD3AE743F3E6E2E7B3C2BA94B96EF138AFF4BE7C",
    "audit_rank8_delta1_order40_bound_chain_delta1d40.py":
        "D1FBE4FE53C7F254FBC4BDBEBC55C84E1734584D7368C2D6FCDB7740D32BA447",
    "rank8_delta1_order40_bound_chain_independent_audit_delta1d40_20260825.json":
        "B0286456A0707F1059268E8CC50941025F9B6D8D21E0F79A91F8FF87323EBC9C",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_delta1d40_20260825.json":
        "F4A004DD97DC83BC290D311BAD23C7B57416B2E0C24BFDAAC263182E7489E731",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_independent_audit_delta1d40_20260825.json":
        "85194D8F2895810492871296CCC24A0F529B080610516D6E2DD1007E576CB3F6",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_27_28_delta1d40_20260825.json":
        "84E85F534396E28DF1BC2FAB2F9893F348E5E8ADCEC76CC4F6AE491E263D740E",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_27_28_independent_audit_delta1d40_20260825.json":
        "34722F3901BC266308EC158A523B36A521916C3E104682D6D3D526FD5655E47F",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_29_30_delta1d40_20260825.json":
        "0E9CD50167C16EE96CCE3716A7778AE107138DF4DA67FB8808F06A2A876804C9",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_29_30_independent_audit_delta1d40_20260825.json":
        "AE84D5ADE4FBE60AA43AA6F561129AD0A2B0C50EAE3628613C2CFECED727167A",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_31_32_delta1d40_20260825.json":
        "8EF214A1877624ACF8A4BAD8F6E9CCCBFD62E009E9D657A7D80FFB86E5FDD5CE",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_31_32_independent_audit_delta1d40_20260825.json":
        "CB20FD1DD2A13E56130BCEF31EB68553EBA180B7E2DAA648ABD374E64A8057DA",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_33_34_delta1d40_20260825.json":
        "1FAF62D510CCB148C10817EDD356A6A9E9624BC7199BC6E0725AD050A95C357F",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_33_34_independent_audit_delta1d40_20260825.json":
        "049BB68B09ADCB1DDB5CE7DBA7D73FC8E945D4D00A4AE8A36B8659D278D7A682",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_35_36_delta1d40_20260825.json":
        "E32060DA21EE2B7F71901916FC260026E416FC44611D9A4B56229AE3CD885349",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_35_36_independent_audit_delta1d40_20260825.json":
        "A34459507F99DA79AFD4DD7552306A2CDDA3328960407CF21D8E3FE9C75DB141",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_37_38_delta1d40_20260825.json":
        "A458215ACAD62F0182EE7CF55E8CB8F9CADCC693A97E49E8F85DF47D287113EE",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_37_38_independent_audit_delta1d40_20260825.json":
        "D461FD977053F27136E693F095DF6A083C5DF7F3B26FB066D02A1D94A9E3A24B",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_39_39_delta1d40_20260825.json":
        "37D44C05A5979FDAB36626B3D7633DEE2687B723488E50BA92DF30137FC96704",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_39_39_independent_audit_delta1d40_20260825.json":
        "432B0481D08CF658795AADB4C496E10109B8FD65CEF37EBA8C48C0DF11783CC5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order40_small_F24_"
        "delta1d40_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order40_small_F24_"
        "independent_audit_delta1d40_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order40_bound_chain_independent_audit_"
        "delta1d40_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_F_ORDER_AT_MOST_24"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_"
        "F_ORDER_AT_MOST_24"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER40_BOUND_CHAIN"
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
            "rank8_delta1_new_leaf_mask3_order40_exact_F_"
            f"{first}_{last}_delta1d40_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order40_exact_F_"
            f"{first}_{last}_independent_audit_delta1d40_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_40_"
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
    assert exact_coverage == list(range(25, 40))

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
        "schema": "rank8-delta1-new-leaf-mask3-order40-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_40",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=40."
        ),
        "D_order": 40,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 24},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=39. The small branch covers "
            "0<=|F|<=24 and the exact shards cover every integer 25<=|F|<=39."
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
            "This certificate closes only endpoint mask 3 at D order 40. "
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
