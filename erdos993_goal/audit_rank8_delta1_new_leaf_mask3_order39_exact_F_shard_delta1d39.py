#!/usr/bin/env python3
"""Import-independent audit of one D=39 exact-F mask-3 certificate shard."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
N_VALUE = 39
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)
PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py":
        "A8F48C5A51F319209944550B2B9F55D3FF75FC08FC9A907AA2DB7ED116F94C69",
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary_path = Path(args.primary).resolve()
    assert sha256(primary_path) == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-order39-exact-F-shard-v1"
    )
    assert primary["D_order"] == N_VALUE
    exact_orders = tuple(int(value) for value in primary["F_orders"])
    assert exact_orders == tuple(range(exact_orders[0], exact_orders[-1] + 1))
    assert 24 <= exact_orders[0] <= exact_orders[-1] <= 38
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
        f"F_ORDERS_{exact_orders[0]}_THROUGH_{exact_orders[-1]}"
    )
    assert primary["partition"] == {
        "normalized_x_breaks": [str(value) for value in X_BREAKS],
        "normalized_y_breaks": [str(value) for value in Y_BREAKS],
    }

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(denominator) == "2744*d5**4*(d6 + f5)"

    n = sp.Integer(N_VALUE)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    missing_constant = sp.cancel(4 / (n - 4))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)

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
    expected_regions = len(exact_orders) * 64
    assert len(rows) == expected_regions
    digest = hashlib.sha256()
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    row_index = 0
    for f_order_value in exact_orders:
        m = sp.Integer(f_order_value)
        mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
        ratio_cap = sp.cancel(5 / mu4_f_floor)
        for x_index, (x_lo_norm, x_hi_norm) in enumerate(
            zip(X_BREAKS, X_BREAKS[1:])
        ):
            x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
            x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
            x = x_lo + (x_hi - x_lo) * X
            q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
            y_cap = min(y_upper, q5_y_cap)
            for y_lo_norm, y_hi_norm in zip(Y_BREAKS, Y_BREAKS[1:]):
                y_slab_lower = y_lower + (y_cap - y_lower) * y_lo_norm
                y_slab_upper = y_lower + (y_cap - y_lower) * y_hi_norm
                y = y_slab_lower + (y_slab_upper - y_slab_lower) * Y
                ratio_envelope = sp.cancel(ratio_cap / y_slab_lower)
                missing_slope = sp.cancel(missing_constant / y_slab_lower)
                switch = sp.cancel(
                    (1 - missing_slope) / (ratio_envelope - missing_slope)
                )
                assert sp.factor(
                    switch
                    - (y_slab_lower - missing_constant)
                    / (ratio_cap - missing_constant)
                ) == 0
                assert 0 < switch < 1
                for region, lo, hi in (
                    ("ratio", sp.Integer(0), switch),
                    ("missing", switch, sp.Integer(1)),
                ):
                    reference = rows[row_index]
                    row_index += 1
                    assert reference["F_order"] == f_order_value
                    assert reference["x_slab"] == x_index
                    assert reference["normalized_x_interval"] == [
                        str(x_lo_norm), str(x_hi_norm)
                    ]
                    assert reference["x_interval"] == [str(x_lo), str(x_hi)]
                    assert reference["q5_y_cap_at_right_endpoint"] == str(
                        q5_y_cap
                    )
                    assert reference["y_cap"] == str(y_cap)
                    assert reference["normalized_y_interval"] == [
                        str(y_lo_norm), str(y_hi_norm)
                    ]
                    assert reference["y_interval"] == [
                        str(y_slab_lower), str(y_slab_upper)
                    ]
                    assert reference["region"] == region
                    assert reference["u5_interval"] == [str(lo), str(hi)]
                    assert reference["mu4_F_floor"] == str(mu4_f_floor)
                    assert reference["rank4_ratio_cap"] == str(ratio_cap)
                    assert reference["rank6_shadow_multiplier"] == str(
                        sp.cancel((m - 5) / 6)
                    )

                    u5 = lo + (hi - lo) * S
                    f4_value = (
                        ratio_cap * x * u5 * V4
                        if region == "ratio"
                        else (
                            x * y - missing_constant * x * (1 - u5)
                        ) * V4
                    )
                    f6_value = sp.cancel((m - 5) / 6) * x * u5 * V6
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
                    polynomial = sp.Poly(
                        expression, X, Y, S, V4, V6, domain=sp.QQ
                    )
                    result = independent.bernstein_record(polynomial)
                    assert reference["power_terms"] == len(polynomial.terms())
                    for key, value in result.items():
                        assert reference[key] == value, (
                            f_order_value, x_index, y_lo_norm, region, key
                        )
                    assert result["negative"] == 0 and result["zero"] == 0
                    totals["regions"] += 1
                    for key in ("coefficients", "negative", "zero", "positive"):
                        totals[key] += result[key]
                    digest.update(
                        (
                            f"{f_order_value}:{x_index}:{y_lo_norm}:{y_hi_norm}:"
                            f"{region}:{result['ordered_sha256']}\n"
                        ).encode()
                    )
        print("INDEPENDENT_EXACT_F_PASS", f_order_value, flush=True)

    assert row_index == len(rows)
    assert primary["aggregate"] == totals
    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-order39-exact-F-shard-"
            "independent-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_39_"
            f"F_ORDERS_{exact_orders[0]}_THROUGH_{exact_orders[-1]}"
        ),
        "D_order": N_VALUE,
        "F_orders": list(exact_orders),
        "independence": (
            "This audit imports neither the producer nor any probe. It "
            "reconstructs the endpoint from the canonical transcript and "
            "recomputes every exact rational Bernstein coefficient."
        ),
        "raw_endpoint_numerator": raw,
        "q5_normalized_identity": str(q5_normalized),
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {"path": str(primary_path), "sha256": sha256(primary_path)},
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
