#!/usr/bin/env python3
"""Audit the D=39 cutoff and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order39_split_diagnostic_audit_delta1d39_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_cutoff_search_root.py":
        "F05D1F07E28E24DF29DA71948CFA51D276C70DE53EDBB99DD65CD14D5962122C",
    "rank8_delta1_mask3_q5_small_N39_M23_s2_probe_delta1d39_20260825.json":
        "08E3209DA092ED38AF59C1DDB8079A522A3AE5C0D3DE5BAB6AA0C1B336E6440A",
    "rank8_delta1_mask3_q5_small_N39_M24_s2_probe_delta1d39_20260825.json":
        "29226912BDB236A8775F0A2B4AB2BF098834B4CA0B5A3716E17BC2EF23F50640",
    "prove_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "A8F48C5A51F319209944550B2B9F55D3FF75FC08FC9A907AA2DB7ED116F94C69",
    "audit_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "76C6938C734DBA7E1A1E2842CD21064B2F483AEA7ABED42A4EFB568E42A58DA6",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_delta1d39_20260825.json":
        "F68A22FEC919DBF82468F908341A3200339B38DA53F47F17E948B66E4D919B80",
    "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_independent_audit_delta1d39_20260825.json":
        "910E64C6545049A78F73128EE6FC06FF85FA95ED908FF833AFF5BA3E59E09E6D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small23 = load(
        "rank8_delta1_mask3_q5_small_N39_M23_s2_probe_delta1d39_20260825.json"
    )
    coarse24 = load(
        "rank8_delta1_mask3_q5_small_N39_M24_s2_probe_delta1d39_20260825.json"
    )
    exact = load(
        "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_delta1d39_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_"
        "independent_audit_delta1d39_20260825.json"
    )
    assert small23["D_order"] == coarse24["D_order"] == 39
    assert small23["F_order_at_most"] == 23
    assert coarse24["F_order_at_most"] == 24
    assert small23["aggregate"] == {
        "coefficients": 4200, "negative": 0, "zero": 0, "positive": 4200
    }
    assert coarse24["aggregate"] == {
        "coefficients": 4200, "negative": 10, "zero": 0, "positive": 4190
    }
    negative_rows = [row for row in coarse24["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 10 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse24["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m24 = Fraction(105, 272)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m24 * f5

    assert exact["F_orders"] == audit["F_orders"] == [24, 25]
    assert exact["aggregate"] == {
        "regions": 128, "coefficients": 153600,
        "negative": 0, "zero": 0, "positive": 153600,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert audit["aggregate"][key] == exact["aggregate"][key]
    assert audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order39_exact_F_24_25_delta1d39_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order39-split-diagnostic-audit-v1",
        "status": "PASS_D39_SPLIT_AT_23_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT",
        "small_cutoff": 23,
        "exact_orders_begin": 24,
        "coarse_M24_negative": {
            "negative_coefficients": 10,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M24_rank4_ratio_cap": str(ratio_cap_m24),
            "violated_constraint": "f4 <= (105/272) f5",
        },
        "exact_replay_24_25": exact["aggregate"],
        "conclusion": (
            "The cutoff-24 negative belongs only to the coarse independent-cap "
            "relaxation. It violates the sound exact-M=24 forest ratio and is "
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
