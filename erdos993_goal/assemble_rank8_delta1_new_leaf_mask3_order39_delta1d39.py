#!/usr/bin/env python3
"""Fail-closed assembly of the complete D=39, Delta1 mask-3 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json"
SHARDS = ((24, 25), (26, 27), (28, 29), (30, 31), (32, 33), (34, 35), (36, 37), (38, 38))
EXPECTED = {
    "prove_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "A8F48C5A51F319209944550B2B9F55D3FF75FC08FC9A907AA2DB7ED116F94C69",
    "audit_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "76C6938C734DBA7E1A1E2842CD21064B2F483AEA7ABED42A4EFB568E42A58DA6",
    "prove_rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39.py":
        "D1ED421A6CCCD0D1B243F4C54DC0F4CCAEB8844F021780249CB627EF1E1CF684",
    "rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39_20260825.json":
        "686090115CD0643715B74A279B9871D8869C2013BF33FC0D61DA31813B52B8BD",
    "audit_rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39.py":
        "C1A5932094DC19E3CB0095F0268E22945E7FD625845224C5F94F6E7D11013803",
    "rank8_delta1_new_leaf_mask3_order39_small_F23_independent_audit_delta1d39_20260825.json":
        "EDBFC216F4C99E79B5999904CBCD3DCDE303D9A0B14B0A31678CFF6F07BB4923",
    "audit_rank8_delta1_order39_bound_chain_delta1d39.py":
        "8A4B27B61DA6F71A65D93358C00A18A0C26C0010631595BAF3CDF5459B695F6B",
    "rank8_delta1_order39_bound_chain_independent_audit_delta1d39_20260825.json":
        "77B90700811F3882C1EDFEDFA74124D86CCF875539B66E4595DA5A5D8D8D6C62",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_delta1d39_20260825.json":
        "F68A22FEC919DBF82468F908341A3200339B38DA53F47F17E948B66E4D919B80",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_independent_audit_delta1d39_20260825.json":
        "910E64C6545049A78F73128EE6FC06FF85FA95ED908FF833AFF5BA3E59E09E6D",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_26_27_delta1d39_20260825.json":
        "E3D44243C9D3949ECE9AC0998CB6DF279E50B2C278E057DBB2A54A6277737F32",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_26_27_independent_audit_delta1d39_20260825.json":
        "C42C645A48552A614F87A2A5D0C9A8EED695A691F801134731B8F94401BAFD0B",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_28_29_delta1d39_20260825.json":
        "C0CBB35C358E8A900CCE22029AA71FDB912398078EBCBC0F7BF038461A20E277",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_28_29_independent_audit_delta1d39_20260825.json":
        "A1AA761D7CDB7D57D9115239D062B186BFF77F83DFE1ACC61B090817C0C68AD9",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_30_31_delta1d39_20260825.json":
        "944332E61766343B4BA34C5EA9A1BD43E213A2FC821ACF5BBE1EC8CEE8D989A9",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_30_31_independent_audit_delta1d39_20260825.json":
        "11A1877F41DA722B43488B67E3E8EE4DB02DF06DF18C58BE543CB3C14BFAFF8A",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_32_33_delta1d39_20260825.json":
        "641B4E663EB47445FEA800A585B8348B6E9ABED074945731FA4363D8E11AA2AE",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_32_33_independent_audit_delta1d39_20260825.json":
        "F8C35237050D2C870E1C478176B9ECB44EBE55E3CB06E7735D315FEB16BEB828",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_34_35_delta1d39_20260825.json":
        "9EC7B4511E9A1CADFD86EFD9A8B1EC868925A268B19A38FAD0E9F5FBD7FE4455",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_34_35_independent_audit_delta1d39_20260825.json":
        "DC56FCB9FAEC130C00C158B35E86693F6336AC644ABE5CBFE26E636BFE5CFF8E",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_36_37_delta1d39_20260825.json":
        "F7064642B22F58EB5D4E2A5BA8A7CCB4F83A575ED2633AFCB2D492A570A52EC8",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_36_37_independent_audit_delta1d39_20260825.json":
        "9152F3A525682591134BC64B91F8EA0A63C7EFD2FE1EA44058BE3DC08C3145B4",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_38_38_delta1d39_20260825.json":
        "7A9A5C2C310DF5271D6BDF4A478648076D92DC62A4F15DAEE8F5DC6DE739EE9E",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_38_38_independent_audit_delta1d39_20260825.json":
        "BD26F72A53531C4B7ECFC2B725C30E9A57CCA94B0CE524EE7A2F71532423265D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    small_name = (
        "rank8_delta1_new_leaf_mask3_order39_small_F23_"
        "delta1d39_20260825.json"
    )
    small_audit_name = (
        "rank8_delta1_new_leaf_mask3_order39_small_F23_"
        "independent_audit_delta1d39_20260825.json"
    )
    small = load(small_name)
    small_audit = load(small_audit_name)
    bounds = load(
        "rank8_delta1_order39_bound_chain_independent_audit_"
        "delta1d39_20260825.json"
    )
    assert small["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_F_ORDER_AT_MOST_23"
    )
    assert small_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
        "F_ORDER_AT_MOST_23"
    )
    assert bounds["status"] == "PASS_INDEPENDENT_EXACT_DELTA1_ORDER39_BOUND_CHAIN"
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
            "rank8_delta1_new_leaf_mask3_order39_exact_F_"
            f"{first}_{last}_delta1d39_20260825.json"
        )
        audit_name = (
            "rank8_delta1_new_leaf_mask3_order39_exact_F_"
            f"{first}_{last}_independent_audit_delta1d39_20260825.json"
        )
        primary = load(primary_name)
        audit = load(audit_name)
        expected_orders = list(range(first, last + 1))
        assert primary["F_orders"] == audit["F_orders"] == expected_orders
        assert primary["status"] == (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
            f"F_ORDERS_{first}_THROUGH_{last}"
        )
        assert audit["status"] == (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
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
    assert exact_coverage == list(range(24, 39))

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
        "schema": "rank8-delta1-new-leaf-mask3-order39-assembled-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_39",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=39."
        ),
        "D_order": 39,
        "F_order_partition": [
            {"first_F_order": 0, "last_F_order": 23},
            *[
                {"first_F_order": first, "last_F_order": last}
                for first, last in SHARDS
            ],
        ],
        "coverage": (
            "A tree has deg_A(v)>=1, so |F|<=38. The small branch covers "
            "0<=|F|<=23 and the exact shards cover every integer 24<=|F|<=38."
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
            "This certificate closes only endpoint mask 3 at D order 39. "
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
