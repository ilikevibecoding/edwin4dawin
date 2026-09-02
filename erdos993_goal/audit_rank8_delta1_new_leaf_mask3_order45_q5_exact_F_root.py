#!/usr/bin/env python3
"""Import-independent audit of the Q5-compatible mask-3 order-45 block."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_"
    "independent_audit_root_20260825.json"
)
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)
X_BREAKS = (sp.Integer(0), sp.Rational(1, 2), sp.Integer(1))

PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root.py":
        "20B7A384F6A68980F99696364E94054A3E2B65ECB84FCC5CEC73EFD069DF599B",
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root_20260825.json":
        "C1C76F5C08D46E59CA57CDA048D48A0E2805A65E386148DD2E13E7E5CA30DADA",
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
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary = json.loads(
        (
            HERE / "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45"
    assert primary["partition"] == {
        "small_F_max_order": 30,
        "small_normalized_x_breaks": [str(value) for value in X_BREAKS],
        "exact_F_orders": list(range(31, 45)),
        "exact_normalized_y_breaks": [str(value) for value in Y_BREAKS],
    }

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw["sha256"] == "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    assert str(denominator) == "2744*d5**4*(d6 + f5)"

    n = sp.Integer(45)
    small_order = 30
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    global_x = x_lower + (x_upper - x_lower) * X

    # Independently verify the Q5 conversion used by the curved compatibility
    # cut: Q5(D)>=0 iff y<=10x/(x+12) in these positive coordinates.
    q5 = 10 * independent.transcript.d[5] ** 2
    q5 -= independent.transcript.d[4] * independent.transcript.d[5]
    q5 -= 12 * independent.transcript.d[4] * independent.transcript.d[6]
    yy = sp.Symbol("yy")
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

    specs = []
    for f_order_value in range(31, 45):
        m = sp.Integer(f_order_value)
        mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
        for y_lo_norm, y_hi_norm in zip(Y_BREAKS, Y_BREAKS[1:]):
            y_slab_lower = y_lower + (y_upper - y_lower) * y_lo_norm
            ratio_envelope = sp.cancel(5 / (mu4_f_floor * y_slab_lower))
            switch = sp.cancel((1 - k4) / (ratio_envelope - k4))
            assert 0 < switch < 1
            specs.extend(
                [
                    {
                        "kind": "exact", "F_order": f_order_value,
                        "region": "ratio", "ylo": y_lo_norm,
                        "yhi": y_hi_norm, "lo": sp.Integer(0),
                        "hi": switch, "mu4_f_floor": mu4_f_floor,
                    },
                    {
                        "kind": "exact", "F_order": f_order_value,
                        "region": "missing", "ylo": y_lo_norm,
                        "yhi": y_hi_norm, "lo": switch,
                        "hi": sp.Integer(1), "mu4_f_floor": mu4_f_floor,
                    },
                ]
            )

    floors = {
        rank: math.comb(45, rank) - small_order * math.comb(43, rank - 2)
        for rank in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(small_order, 4), floors[4])
    a5 = sp.Rational(math.comb(small_order, 5), floors[5])
    a6 = sp.Rational(math.comb(small_order, 6), floors[6])
    u6_break = sp.cancel(
        a6 / sp.cancel((sp.Integer(small_order) - 5) * x_upper / 6)
    )
    u5_breaks = (sp.Integer(0), u6_break, a5)
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(X_BREAKS, X_BREAKS[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            specs.append(
                {
                    "kind": "small", "x_index": x_index,
                    "xlo_norm": x_lo_norm, "xhi_norm": x_hi_norm,
                    "xlo": x_lo, "xhi": x_hi, "y_cap": y_cap,
                    "q5_y_cap": q5_y_cap, "u_index": u_index,
                    "lo": lo, "hi": hi,
                    "u6_mode": "shadow" if u_index == 0 else "absolute",
                }
            )

    assert len(specs) == len(primary["rows"]) == 228
    digest = hashlib.sha256()
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    for spec, reference in zip(specs, primary["rows"]):
        lo, hi = spec["lo"], spec["hi"]
        u5 = lo + (hi - lo) * S
        if spec["kind"] == "exact":
            f_order_value = spec["F_order"]
            region = spec["region"]
            ylo, yhi = spec["ylo"], spec["yhi"]
            x = global_x
            y = y_lower + (y_upper - y_lower) * (ylo + (yhi - ylo) * Y)
            if region == "ratio":
                f4_value = (
                    sp.cancel(5 / spec["mu4_f_floor"]) * x * u5 * V4
                )
            else:
                f4_value = x * y * (1 - k4 * (1 - u5)) * V4
            f6_value = (
                sp.cancel((sp.Integer(f_order_value) - 5) / 6)
                * x * u5 * V6
            )
            assert reference["scope"] == f"F_order_exactly_{f_order_value}"
            assert reference["F_order"] == f_order_value
            assert reference["region"] == region
            assert reference["normalized_y_interval"] == [str(ylo), str(yhi)]
            digest_prefix = f"exact:{f_order_value}:{ylo}:{yhi}:{region}"
        else:
            x = spec["xlo"] + (spec["xhi"] - spec["xlo"]) * X
            y = y_lower + (spec["y_cap"] - y_lower) * Y
            f4_value = x * y * a4 * V4
            f6_value = (
                sp.cancel((sp.Integer(small_order) - 5) / 6) * x * u5 * V6
                if spec["u6_mode"] == "shadow"
                else a6 * V6
            )
            assert reference["scope"] == "F_order_at_most_30"
            assert reference["x_slab"] == spec["x_index"]
            assert reference["normalized_x_interval"] == [
                str(spec["xlo_norm"]), str(spec["xhi_norm"])
            ]
            assert reference["x_interval"] == [str(spec["xlo"]), str(spec["xhi"])]
            assert reference["y_interval"] == [str(y_lower), str(spec["y_cap"])]
            assert reference["q5_y_cap_at_right_endpoint"] == str(spec["q5_y_cap"])
            assert reference["u6_mode"] == spec["u6_mode"]
            digest_prefix = f"small:{spec['x_index']}:{spec['u_index']}"
        assert reference["u5_interval"] == [str(lo), str(hi)]
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
            assert reference[key] == value, (digest_prefix, key)
        assert result["negative"] == 0
        totals["regions"] += 1
        for key in ("coefficients", "negative", "zero", "positive"):
            totals[key] += result[key]
        digest.update(
            f"{digest_prefix}:{result['ordered_sha256']}\n".encode()
        )

    assert primary["small_edge_count_sensitive_floors_d4_d5_d6"] == [
        floors[rank] for rank in (4, 5, 6)
    ]
    assert primary["aggregate"] == {
        "regions": totals["regions"],
        "coefficients": totals["coefficients"],
        "negative": totals["negative"],
        "zero": totals["zero"],
        "positive": totals["positive"],
    }
    payload = {
        "schema": "rank8-delta1-mask3-order45-q5-exact-F-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45",
        "independence": (
            "This audit imports neither the order-45 producer nor its probe. "
            "It reconstructs all 228 boxes from the canonical endpoint transcript."
        ),
        "raw_endpoint_numerator": raw,
        "q5_normalized_identity": str(q5_normalized),
        "small_edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
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
