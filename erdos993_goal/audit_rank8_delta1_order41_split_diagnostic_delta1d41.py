#!/usr/bin/env python3
"""Audit the D=41 cutoff and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order41_split_diagnostic_audit_delta1d41_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_cutoff_search_root.py":
        "F05D1F07E28E24DF29DA71948CFA51D276C70DE53EDBB99DD65CD14D5962122C",
    "rank8_delta1_mask3_q5_small_N41_M25_s2_probe_delta1d41_20260825.json":
        "3C751DB14BE6B8E194DF57BC56279F0EA8CE9D33FBD8CB9C9C9DB7AC3C855398",
    "rank8_delta1_mask3_q5_small_N41_M26_s2_probe_delta1d41_20260825.json":
        "EB3D063884B90FAA93E8F6339AD5888150A401508D7FE2FB172E302EE8C57F81",
    "prove_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py":
        "6F21EF8B9577F83C845DCBCDB0A0CA628C9639F16807457E27129319850E8872",
    "audit_rank8_delta1_new_leaf_mask3_order41_exact_F_shard_delta1d41.py":
        "B1F57DBEE6BF2C11740BFFB726D62871E3785ADAF305C072DFC968CCBB4A1DCC",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_delta1d41_20260825.json":
        "C663A580BC634A47768F8554A2777639A5B91EEA1454C6A1F97ECCAA968AE4F1",
    "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_independent_audit_delta1d41_20260825.json":
        "6EF16701DA6B949DF1434A17908AA764C820D8EF797CDC8CDB7798D4F7C0F5C4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small25 = load(
        "rank8_delta1_mask3_q5_small_N41_M25_s2_probe_delta1d41_20260825.json"
    )
    coarse26 = load(
        "rank8_delta1_mask3_q5_small_N41_M26_s2_probe_delta1d41_20260825.json"
    )
    exact = load(
        "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_delta1d41_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_"
        "independent_audit_delta1d41_20260825.json"
    )
    assert small25["D_order"] == coarse26["D_order"] == 41
    assert small25["F_order_at_most"] == 25
    assert coarse26["F_order_at_most"] == 26
    assert small25["aggregate"] == {
        "coefficients": 4200, "negative": 0, "zero": 0, "positive": 4200
    }
    assert coarse26["aggregate"] == {
        "coefficients": 4200, "negative": 5, "zero": 0, "positive": 4195
    }
    negative_rows = [row for row in coarse26["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 5 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    # This tensor vertex has X=0,Y=1,S=0,V4=1,V6=0.  Therefore u5=0,
    # hence f5=0, while the independent absolute u4 cap chooses f4>0.
    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse26["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m26 = Fraction(115, 342)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m26 * f5

    # Every realizable exact-M=26 forest obeys f4 <= (115/342) f5.
    # The independently replayed exact shard covers M=26 and M=27 and
    # has no negative or zero Bernstein coefficient.
    assert exact["F_orders"] == audit["F_orders"] == [26, 27]
    assert exact["aggregate"] == {
        "regions": 128, "coefficients": 153600,
        "negative": 0, "zero": 0, "positive": 153600,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert audit["aggregate"][key] == exact["aggregate"][key]
    assert audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order41_exact_F_26_27_delta1d41_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order41-split-diagnostic-audit-v1",
        "status": "PASS_D41_SPLIT_AT_25_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT",
        "small_cutoff": 25,
        "exact_orders_begin": 26,
        "coarse_M26_negative": {
            "negative_coefficients": 5,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M26_rank4_ratio_cap": str(ratio_cap_m26),
            "violated_constraint": "f4 <= (115/342) f5",
        },
        "exact_replay_26_27": exact["aggregate"],
        "conclusion": (
            "The cutoff-26 negative belongs only to the coarse independent-cap "
            "relaxation. It violates the sound exact-M=26 forest ratio and is "
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
