#!/usr/bin/env python3
"""Audit the D=42 cutoff and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order42_split_diagnostic_audit_delta1d42_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_cutoff_search_root.py":
        "F05D1F07E28E24DF29DA71948CFA51D276C70DE53EDBB99DD65CD14D5962122C",
    "rank8_delta1_mask3_q5_small_N42_M26_s2_probe_delta1d42_20260825.json":
        "AAD871D3BA4B5DC3F4A27625C1703349F3CF87EB69E747D72A687CCE8E56D5C0",
    "rank8_delta1_mask3_q5_small_N42_M27_s2_probe_delta1d42_20260825.json":
        "CD9327306AC78D4B37A2F7E35034E6C4737BDDD3A5EE1B74B5D3987D81CE46A6",
    "prove_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py":
        "72532F39C0A55ECD40D22BFF4A577DBEC36F9C4B9EDBA8F0D716FB60BE33F459",
    "audit_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py":
        "A3492F30806A5DFF496ADE7A003516D4374E0ACDA4D9EBAF818BB27B86183051",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_delta1d42_20260825.json":
        "851A4BB7DB8341FF388659C621C3F937EFEA09FA6DF79C4537612C1D234AB207",
    "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_independent_audit_delta1d42_20260825.json":
        "85B27E9374BB094D6A38A11267BA5E539FDEA147415BE23DCBD44F927FA0CB7E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small26 = load(
        "rank8_delta1_mask3_q5_small_N42_M26_s2_probe_delta1d42_20260825.json"
    )
    coarse27 = load(
        "rank8_delta1_mask3_q5_small_N42_M27_s2_probe_delta1d42_20260825.json"
    )
    exact = load(
        "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_delta1d42_20260825.json"
    )
    audit = load(
        "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_"
        "independent_audit_delta1d42_20260825.json"
    )
    assert small26["D_order"] == coarse27["D_order"] == 42
    assert small26["F_order_at_most"] == 26
    assert coarse27["F_order_at_most"] == 27
    assert small26["aggregate"] == {
        "coefficients": 4200, "negative": 0, "zero": 0, "positive": 4200
    }
    assert coarse27["aggregate"] == {
        "coefficients": 4200, "negative": 5, "zero": 0, "positive": 4195
    }
    negative_rows = [row for row in coarse27["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 5 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    # This tensor vertex has X=0,Y=1,S=0,V4=1,V6=0.  Therefore u5=0,
    # hence f5=0, while the independent absolute u4 cap chooses f4>0.
    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse27["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m27 = Fraction(6, 19)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m27 * f5

    # Every realizable exact-M=27 forest obeys f4 <= (6/19) f5.
    # The independently replayed exact shard covers M=27 and M=28 and
    # has no negative or zero Bernstein coefficient.
    assert exact["F_orders"] == audit["F_orders"] == [27, 28]
    assert exact["aggregate"] == {
        "regions": 128, "coefficients": 153600,
        "negative": 0, "zero": 0, "positive": 153600,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert audit["aggregate"][key] == exact["aggregate"][key]
    assert audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order42_exact_F_27_28_delta1d42_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order42-split-diagnostic-audit-v1",
        "status": "PASS_D42_SPLIT_AT_26_FIRST_COARSE_NEGATIVE_IS_RELAXATION_ARTIFACT",
        "small_cutoff": 26,
        "exact_orders_begin": 27,
        "coarse_M27_negative": {
            "negative_coefficients": 5,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M27_rank4_ratio_cap": str(ratio_cap_m27),
            "violated_constraint": "f4 <= (6/19) f5",
        },
        "exact_replay_27_28": exact["aggregate"],
        "conclusion": (
            "The cutoff-27 negative belongs only to the coarse independent-cap "
            "relaxation. It violates the sound exact-M=27 forest ratio and is "
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
