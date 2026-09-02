#!/usr/bin/env python3
"""Audit the D=37 split and exclude the first coarse negative vertex."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_order37_split_diagnostic_audit_delta1d37_20260825.json"
PINNED = {
    "probe_rank8_delta1_mask3_q5_small_N37_M21_exact_transfer_delta1d37.py":
        "16631EFD6BF9A5761D732A41CA2B7708BD05321B112270AB78008DE6E351CEF6",
    "rank8_delta1_mask3_q5_small_N37_M21_exact_transfer_s2_probe_delta1d37_20260825.json":
        "308376BD2B4F09CFB1334B08AA1F095C8CA02C1E36CEF5ED6B7CB15AF564C62D",
    "prove_rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37.py":
        "473B49227528DF77F873B7E611F485D0A1F1EF40422343FB53E4FEC36A727B27",
    "rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37_20260825.json":
        "4588038446273FF703AB59F43472DC8BA2EEF1E5E9EC2FDD7553D8852BFD07DD",
    "audit_rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37.py":
        "F1D7567DD55B92BB00306504D089E3828A417D63DA46561F44B4F8037C2FD1F6",
    "rank8_delta1_new_leaf_mask3_order37_small_F20_independent_audit_delta1d37_20260825.json":
        "BC4B6038DE3B94E2C3060417E495DCA674978D44D1FAC08A073B9F4493C49342",
    "prove_rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37.py":
        "F54FF3C4308192BD232E09AA29CDB05D94A4F396C1BC33D40B39B7FABD55C4B1",
    "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37_20260825.json":
        "1EC9699A830E9B4F0727568BD975D83270CBA4F7B947B4EEB3A54A2FB025AFCC",
    "audit_rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_delta1d37.py":
        "38B613C175E5B81CB26EE94A86AEE419C96065A11329F4619FAF31D868C95CCF",
    "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_independent_audit_delta1d37_20260825.json":
        "BE8A89377A719040B518AB6FC96A13E0C8ACCB775AC73A7702314DAFECD6CCF5",
    "audit_rank8_delta1_order37_bound_chain_delta1d37.py":
        "5F3E848DC823033ACFA23335F39DCDD7B28C76135B3AB96C72DCF7FBDA21AAD8",
    "rank8_delta1_order37_bound_chain_independent_audit_delta1d37_20260825.json":
        "EBA3CC04FCEA010905624CC15BD3D4F927BF0E0B6571ABD1D63403BEDCA6C3AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    small = load(
        "rank8_delta1_new_leaf_mask3_order37_small_F20_delta1d37_20260825.json"
    )
    small_audit = load(
        "rank8_delta1_new_leaf_mask3_order37_small_F20_"
        "independent_audit_delta1d37_20260825.json"
    )
    coarse = load(
        "rank8_delta1_mask3_q5_small_N37_M21_exact_transfer_s2_"
        "probe_delta1d37_20260825.json"
    )
    bridge = load(
        "rank8_delta1_new_leaf_mask3_order37_exact_F21_"
        "bridge_delta1d37_20260825.json"
    )
    bridge_audit = load(
        "rank8_delta1_new_leaf_mask3_order37_exact_F21_bridge_"
        "independent_audit_delta1d37_20260825.json"
    )
    assert small["D_order"] == coarse["D_order"] == bridge["D_order"] == 37
    assert small["F_order_at_most"] == 20
    assert coarse["F_order_at_most"] == bridge["F_order"] == 21
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
    ratio_cap_m21 = Fraction(45, 91)
    assert f5 == 0 and f4 > 0
    assert f4 > ratio_cap_m21 * f5

    assert bridge["aggregate"] == {
        "regions": 4, "coefficients": 4200,
        "negative": 0, "zero": 0, "positive": 4200,
    }
    for key in ("regions", "coefficients", "negative", "zero", "positive"):
        assert bridge_audit["aggregate"][key] == bridge["aggregate"][key]
    assert bridge_audit["primary"]["sha256"] == actual[
        "rank8_delta1_new_leaf_mask3_order37_exact_F21_"
        "bridge_delta1d37_20260825.json"
    ]

    payload = {
        "schema": "rank8-delta1-order37-split-diagnostic-audit-v1",
        "status": (
            "PASS_D37_SPLIT_AT_20_FIRST_COARSE_NEGATIVE_"
            "IS_RELAXATION_ARTIFACT"
        ),
        "small_cutoff": 20,
        "exact_bridge_orders": [21, 22, 23],
        "ordinary_exact_orders_begin": 24,
        "coarse_M21_negative": {
            "negative_coefficients": 5,
            "negative_vertices": 2,
            "minimum_index": row["minimum_index"],
            "minimum": row["minimum"],
        },
        "incompatibility_certificate": {
            "vertex_u5": str(u5),
            "vertex_f5": str(f5),
            "vertex_f4": str(f4),
            "exact_M21_rank4_ratio_cap": str(ratio_cap_m21),
            "violated_constraint": "f4 <= (45/91) f5",
        },
        "exact_bridge_M21_replay": bridge["aggregate"],
        "conclusion": (
            "The first coarse negative belongs only to the independent-cap "
            "relaxation. It violates the sound exact-M=21 forest ratio and "
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
