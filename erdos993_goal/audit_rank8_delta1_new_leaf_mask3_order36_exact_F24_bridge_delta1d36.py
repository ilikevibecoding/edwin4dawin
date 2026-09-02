#!/usr/bin/env python3
"""Import-independent audit of the D=36 exact-|F|=24 bridge."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_delta1d36_20260825.json"
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_independent_audit_delta1d36_20260825.json"
N_VALUE = 36
F_ORDER = 24
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_order36_exact_F24_bridge_delta1d36.py":
        "5C200FBD4968E886829B855E179D56B3CD3BAC91D88F6E40BF769CDE5B6E3E51",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "verify_rank5_three_halves_convolution_cones.py":
        "06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary_sha256 = sha256(PRIMARY)
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["schema"] == "rank8-delta1-new-leaf-mask3-order36-exact-F24-bridge-v1"
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_F_ORDER_24_BRIDGE"
    )
    assert primary["D_order"] == N_VALUE
    assert primary["F_order"] == F_ORDER

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(denominator) == "2744*d5**4*(d6 + f5)"

    n = sp.Integer(N_VALUE)
    small = sp.Integer(F_ORDER)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_integer = int(sp.floor(mu4_floor))
    mu4_fraction = sp.cancel(mu4_floor - mu4_integer)
    phi_mu4 = sp.cancel(
        (1 - mu4_fraction) * sp.binomial(mu4_integer - 1, 2)
        + mu4_fraction * sp.binomial(mu4_integer, 2)
    )
    mu5_floor = sp.cancel(2 * phi_mu4 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    mu4_f_floor = sp.cancel((small - 7) * (small - 8) / (small - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f_floor)
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    floors = {
        rank: math.comb(N_VALUE, rank)
        - F_ORDER * math.comb(N_VALUE - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(F_ORDER, 4), floors[4])
    a5 = sp.Rational(math.comb(F_ORDER, 5), floors[5])
    a6 = sp.Rational(math.comb(F_ORDER, 6), floors[6])
    assert primary["partition"] == {
        "normalized_x_breaks": [str(value) for value in X_BREAKS],
        "u5_partition_rule": (
            "For each x slab, split at min(a5,a6/(((M-5)/6)*x_hi))."
        ),
    }
    assert primary["edge_count_sensitive_floors_d4_d5_d6"] == [
        floors[rank] for rank in (4, 5, 6)
    ]
    assert primary["absolute_caps_u4_u5_u6"] == [str(a4), str(a5), str(a6)]

    yy = sp.Symbol("yy")
    global_x = x_lower + (x_upper - x_lower) * X
    q5 = 10 * independent.transcript.d[5] ** 2
    q5 -= independent.transcript.d[4] * independent.transcript.d[5]
    q5 -= 12 * independent.transcript.d[4] * independent.transcript.d[6]
    q5_normalized = sp.factor(
        q5.subs(
            {
                independent.transcript.d[6]: 1,
                independent.transcript.d[5]: global_x,
                independent.transcript.d[4]: global_x * yy,
            },
            simultaneous=True,
        )
    )
    assert sp.factor(
        q5_normalized - global_x * (10 * global_x - yy * (global_x + 12))
    ) == 0

    rows = primary["rows"]
    assert len(rows) == 4
    digest = hashlib.sha256()
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    row_index = 0
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(X_BREAKS, X_BREAKS[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        y = y_lower + (y_cap - y_lower) * Y
        u6_break = sp.cancel(a6 / (sp.cancel((small - 5) * x_hi / 6)))
        u5_breaks = (
            (sp.Integer(0), a5)
            if u6_break >= a5
            else (sp.Integer(0), u6_break, a5)
        )
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            reference = rows[row_index]
            row_index += 1
            u6_mode = "shadow" if u_index == 0 else "absolute"
            assert reference["x_slab"] == x_index
            assert reference["normalized_x_interval"] == [
                str(x_lo_norm), str(x_hi_norm)
            ]
            assert reference["x_interval"] == [str(x_lo), str(x_hi)]
            assert reference["q5_y_cap_at_right_endpoint"] == str(q5_y_cap)
            assert reference["y_interval"] == [str(y_lower), str(y_cap)]
            assert reference["u5_interval"] == [str(lo), str(hi)]
            assert reference["u4_mode"] == "exact_F_rank4_ratio"
            assert reference["u6_mode"] == u6_mode

            u5 = lo + (hi - lo) * S
            f4_value = rank4_ratio_cap * x * u5 * V4
            f6_value = (
                sp.cancel((small - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow" else a6 * V6
            )
            expression = sp.expand(
                numerator.subs(
                    {
                        independent.transcript.d[6]: 1,
                        independent.transcript.d[5]: x,
                        independent.transcript.d[4]: x * y,
                        independent.transcript.f[6]: f6_value,
                        independent.transcript.f[5]: x * u5,
                        independent.transcript.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            result = independent.bernstein_record(polynomial)
            assert reference["power_terms"] == len(polynomial.terms())
            for key, value in result.items():
                assert reference[key] == value, (x_index, u_index, key)
            assert result["negative"] == 0 and result["zero"] == 0
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += result[key]
            digest.update(
                f"{x_index}:{u_index}:{result['ordered_sha256']}\n".encode()
            )

    assert primary["aggregate"] == totals
    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-order36-exact-F24-bridge-"
            "independent-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            "F_ORDER_24_BRIDGE"
        ),
        "D_order": N_VALUE,
        "F_order": F_ORDER,
        "independence": (
            "This audit imports neither the producer nor any probe. It "
            "reconstructs the endpoint from the canonical transcript and "
            "recomputes every exact rational Bernstein coefficient."
        ),
        "raw_endpoint_numerator": raw,
        "q5_normalized_identity": str(q5_normalized),
        "edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {"path": str(PRIMARY), "sha256": primary_sha256},
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
