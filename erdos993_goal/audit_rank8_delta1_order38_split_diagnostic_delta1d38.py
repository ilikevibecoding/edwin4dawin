#!/usr/bin/env python3
"""Audit the D=38 cutoff and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order38_split_diagnostic_audit_delta1d38_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_cutoff_search_root.py":
        "F05D1F07E28E24DF29DA71948CFA51D276C70DE53EDBB99DD65CD14D5962122C",
    "rank8_delta1_mask3_q5_small_N38_M22_s2_probe_delta1d38_20260825.json":
        "ACE000061EA6AAB29F73DF8C5D631A377596BF6A65491C716F8E5E544781BDFF",
    "rank8_delta1_mask3_q5_small_N38_M23_s2_probe_delta1d38_20260825.json":
        "25A668E129C549521B1B92D6BDFAB5D44CAB2BF40725BA1C803C28B17FCA90F5",
    "prove_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py":
        "18FB3906349B3F51BAAF2D276C98A4D4C2C2E54630F3FA3F76CD4768165ECB9D",
    "audit_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py":
        "2C7AA808CB7D0DFFCB2F3C87A08FED23D195C613DDB7427ABD4A340BC209B49E",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_delta1d38_20260825.json":
        "974941C8B7384478DB18486EEE9D4DA282C9269C646DEA345ED38AADC6D15DB0",
    "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_independent_audit_delta1d38_20260825.json":
        "8738F56ABA5C4AA7E0B672AF9CA4A43E0EB7E611CFB2B0DAEA4CADF7C24E8AE5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small22 = load(
        "rank8_delta1_mask3_q5_small_N38_M22_s2_probe_delta1d38_20260825.json"
    )
    coarse23 = load(
        "rank8_delta1_mask3_q5_small_N38_M23_s2_probe_delta1d38_20260825.json"
    )
    exact = load(
        "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_delta1d38_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_"
        "independent_audit_delta1d38_20260825.json"
    )
    assert small22["D_order"] == coarse23["D_order"] == 38
    assert small22["F_order_at_most"] == 22
    assert coarse23["F_order_at_most"] == 23
    assert small22["aggregate"] == {
        "coefficients": 4200, "negative": 0, "zero": 0, "positive": 4200
    }
    assert coarse23["aggregate"] == {
        "coefficients": 4200, "negative": 11, "zero": 0, "positive": 4189
    }
    negative_rows = [row for row in coarse23["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 11 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse23["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m23 = Fraction(5, 12)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m23 * f5

    assert exact["F_orders"] == audit["F_orders"] == [23, 24]
    assert exact["aggregate"] == {
        "regions": 128, "coefficients": 153600,
        "negative": 0, "zero": 0, "positive": 153600,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert audit["aggregate"][key] == exact["aggregate"][key]
    assert audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order38_exact_F_23_24_delta1d38_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order38-split-diagnostic-audit-v1",
        "status": "PASS_D38_SPLIT_AT_22_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT",
        "small_cutoff": 22,
        "exact_orders_begin": 23,
        "coarse_M23_negative": {
            "negative_coefficients": 11,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M23_rank4_ratio_cap": str(ratio_cap_m23),
            "violated_constraint": "f4 <= (5/12) f5",
        },
        "exact_replay_23_24": exact["aggregate"],
        "conclusion": (
            "The cutoff-23 negative belongs only to the coarse independent-cap "
            "relaxation. It violates the sound exact-M=23 forest ratio and is "
            "not a realizable counterexample."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
