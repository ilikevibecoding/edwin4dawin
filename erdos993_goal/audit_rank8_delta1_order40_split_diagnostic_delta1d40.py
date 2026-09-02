#!/usr/bin/env python3
"""Audit the D=40 cutoff and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order40_split_diagnostic_audit_delta1d40_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_cutoff_search_root.py":
        "F05D1F07E28E24DF29DA71948CFA51D276C70DE53EDBB99DD65CD14D5962122C",
    "rank8_delta1_mask3_q5_small_N40_M24_s2_probe_delta1d40_20260825.json":
        "0B4A2746DB675C8B53D593073DEDB3D0CFD22D9ABA79579EF00ACB0C15BD0725",
    "rank8_delta1_mask3_q5_small_N40_M25_s2_probe_delta1d40_20260825.json":
        "C8A1D8216339932304F99C2A5165ADB79EAC5BA8CA1951A1E72F849F10A97EFC",
    "prove_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py":
        "3F8EBBD9EB30FF97D87A0D5F187BD2EFD4C516FCDA0A7A2DB63D85ED855F3BB6",
    "audit_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py":
        "9AB1AA6631B6C006D60985D9AD4AB590604077468A661084A4729219D18E4043",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_delta1d40_20260825.json":
        "F4A004DD97DC83BC290D311BAD23C7B57416B2E0C24BFDAAC263182E7489E731",
    "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_independent_audit_delta1d40_20260825.json":
        "85194D8F2895810492871296CCC24A0F529B080610516D6E2DD1007E576CB3F6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small24 = load(
        "rank8_delta1_mask3_q5_small_N40_M24_s2_probe_delta1d40_20260825.json"
    )
    coarse25 = load(
        "rank8_delta1_mask3_q5_small_N40_M25_s2_probe_delta1d40_20260825.json"
    )
    exact = load(
        "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_delta1d40_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_"
        "independent_audit_delta1d40_20260825.json"
    )
    assert small24["D_order"] == coarse25["D_order"] == 40
    assert small24["F_order_at_most"] == 24
    assert coarse25["F_order_at_most"] == 25
    assert small24["aggregate"] == {
        "coefficients": 4200, "negative": 0, "zero": 0, "positive": 4200
    }
    assert coarse25["aggregate"] == {
        "coefficients": 4200, "negative": 10, "zero": 0, "positive": 4190
    }
    negative_rows = [row for row in coarse25["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 10 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    # This tensor vertex has X=0,Y=1,S=0,V4=1,V6=0.  Therefore u5=0,
    # hence f5=0, while the independent absolute u4 cap chooses f4>0.
    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse25["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m25 = Fraction(55, 153)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m25 * f5

    # Every realizable exact-M=25 forest obeys f4 <= (55/153) f5.
    # The independently replayed exact shard covers M=25 and M=26 and
    # has no negative or zero Bernstein coefficient.
    assert exact["F_orders"] == audit["F_orders"] == [25, 26]
    assert exact["aggregate"] == {
        "regions": 128, "coefficients": 153600,
        "negative": 0, "zero": 0, "positive": 153600,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert audit["aggregate"][key] == exact["aggregate"][key]
    assert audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order40_exact_F_25_26_delta1d40_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order40-split-diagnostic-audit-v1",
        "status": "PASS_D40_SPLIT_AT_24_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT",
        "small_cutoff": 24,
        "exact_orders_begin": 25,
        "coarse_M25_negative": {
            "negative_coefficients": 10,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M25_rank4_ratio_cap": str(ratio_cap_m25),
            "violated_constraint": "f4 <= (55/153) f5",
        },
        "exact_replay_25_26": exact["aggregate"],
        "conclusion": (
            "The cutoff-25 negative belongs only to the coarse independent-cap "
            "relaxation. It violates the sound exact-M=25 forest ratio and is "
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
