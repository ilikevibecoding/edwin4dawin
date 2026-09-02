#!/usr/bin/env python3
"""Audit the D=36 split and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order36_split_diagnostic_audit_delta1d36_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_N36_M20_exact_transfer_delta1d36.py":
        "A0515646AC62BB89A29CA648DD3C6C76C89BF6FCBDBE8F06A83CA6D30302002B",
    "rank8_delta1_mask3_q5_small_N36_M20_exact_transfer_s2_probe_delta1d36_20260825.json":
        "1BFD79C555D5AA36E8FC0BFC19FF2C832F964B49EB2FD7B44FECAE7CABD1E562",
    "prove_rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36.py":
        "2837682A800F896CF83B427BCD6A40EFA1B985A8B519F7828F4C51C5D62CF82D",
    "rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36_20260825.json":
        "CD4AEDE0491633C26298031DE35D2B31016C5603AB20E6DA7C0515E9CD5BBD1A",
    "audit_rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36.py":
        "E5E8517F1804E025527C2EB0A82D744C16938196162A08E26AC083B647DDCF75",
    "rank8_delta1_new_leaf_mask3_order36_small_F19_independent_audit_delta1d36_20260825.json":
        "CC06D4127C99D4EEAAD3718160339C42BD0C1439905909F0C36955993C82C2AB",
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36.py":
        "E867F0573C3638ABB429F55EF8A1FEFBF044AB5B3DE10B35BF96F44CEAAAF7A9",
    "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36_20260825.json":
        "BD333AFF238F2662021FE761CB8930054AF7A4503C3AC20ABA5279F09DBBC78F",
    "audit_rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_delta1d36.py":
        "C1A1E79E4B89665B0FBBC265CE95C1E1BB91FF49E80D8F1A15EC6DACB43CCC2D",
    "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_independent_audit_delta1d36_20260825.json":
        "7F935023FB65D8DEA0A1D043A9B60C6AE00FF9447BA2DE1AC192C3356AE5ECDF",
    "audit_rank8_delta1_order36_bound_chain_delta1d36.py":
        "AAE6C2941299738CDF54091A270A61C4D3C9923DB11D5E692973C7959868634F",
    "rank8_delta1_order36_bound_chain_independent_audit_delta1d36_20260825.json":
        "27C866739491E00B96D008903BE4CA7815D4A26F35FBD1440D74639860119DA1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small = load(
        "rank8_delta1_new_leaf_mask3_order36_small_F19_delta1d36_20260825.json"
    )
    small_audit = load(
        "rank8_delta1_new_leaf_mask3_order36_small_F19_"
        "independent_audit_delta1d36_20260825.json"
    )
    coarse = load(
        "rank8_delta1_mask3_q5_small_N36_M20_exact_transfer_s2_"
        "probe_delta1d36_20260825.json"
    )
    bridge = load(
        "rank8_delta1_new_leaf_mask3_order36_exact_F20_"
        "bridge_delta1d36_20260825.json"
    )
    bridge_audit = load(
        "rank8_delta1_new_leaf_mask3_order36_exact_F20_bridge_"
        "independent_audit_delta1d36_20260825.json"
    )
    assert small["D_order"] == coarse["D_order"] == bridge["D_order"] == 36
    assert small["F_order_at_most"] == 19
    assert coarse["F_order_at_most"] == bridge["F_order"] == 20
    assert small["aggregate"] == {
        "regions": 4, "coefficients": 4200,
        "negative": 0, "zero": 0, "positive": 4200,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert small_audit["aggregate"][key] == small["aggregate"][key]
    assert coarse["aggregate"] == {
        "regions": 4, "coefficients": 4200,
        "negative": 5, "zero": 0, "positive": 4195,
    }
    negative_rows = [row for row in coarse["rows"] if row["negative"]]
    assert len(negative_rows) == 1
    row = negative_rows[0]
    assert row["negative"] == 5 and row["negative_vertices"] == 2
    assert row["minimum_index"] == [0, 1, 0, 1, 0]

    x = Fraction(row["x_interval"][0])
    y = Fraction(row["y_interval"][1])
    u5 = Fraction(row["u5_interval"][0])
    a4 = Fraction(coarse["absolute_caps_u4_u5_u6"][0])
    f5 = x * u5
    f4 = x * y * a4
    ratio_cap_m20 = Fraction(85, 156)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m20 * f5

    assert bridge["aggregate"] == {
        "regions": 5, "coefficients": 5700,
        "negative": 0, "zero": 0, "positive": 5700,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert bridge_audit["aggregate"][key] == bridge["aggregate"][key]
    assert bridge_audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order36_exact_F20_"
        "bridge_delta1d36_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order36-split-diagnostic-audit-v1",
        "status": (
            "PASS_D36_SPLIT_AT_19_FIRST_COARSE_NEGATIVE_"
            "IS_RELAXATION_ARTIFACT"
        ),
        "small_cutoff": 19,
        "exact_bridge_orders": [20, 21, 22, 23, 24],
        "ordinary_exact_orders_begin": 25,
        "coarse_M20_negative": {
            "negative_coefficients": 5,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M20_rank4_ratio_cap": str(ratio_cap_m20),
            "violated_constraint": "f4 <= (85/156) f5",
        },
        "exact_bridge_M20_replay": bridge["aggregate"],
        "conclusion": (
            "The first coarse negative belongs only to the independent-cap "
            "relaxation. It violates the sound exact-M=20 forest ratio and "
            "is not a realizable counterexample."
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
