#!/usr/bin/env python3
"""Import-independent audit of the D=35, |F|=26 forest-Q5 bridge."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / (
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
    "delta1d35_20260825.json"
)
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
    "independent_audit_delta1d35_20260825.json"
)
N_VALUE = 35
F_ORDER = 26
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py":
        "9E7935F5C76A1E9DE0EA8E15BEA987F8F142D8A6B99146EFF0F3FEE9163BF2AD",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
    "independent_audit_root_20260825.json":
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


def positive_denominator_record(
    denominator: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    coefficients = polynomial.coeffs()
    assert coefficients and all(value >= 0 for value in coefficients)
    assert polynomial.eval(dict.fromkeys(variables, 0)) > 0
    return {
        "expression": str(sp.factor(denominator)),
        "power_terms": len(polynomial.terms()),
        "minimum_power_coefficient": str(min(coefficients)),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary_sha256 = sha256(PRIMARY)
    assert primary_sha256 == (
        "9EFF65DF0C24C7B418EAA3BBA21FFFB2D7162A3F4CB9FCD91B8DDB1C64114CED"
    )
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-order35-exact-F26-q5-bridge-v1"
    )
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_F_ORDER_26_Q5_BRIDGE"
    )
    assert primary["D_order"] == N_VALUE
    assert primary["F_order"] == F_ORDER
    assert primary["source_sha256"] == PINNED[
        "prove_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py"
    ]

    gate = independent.transcript.delta1_new_leaf_gate()
    endpoint, endpoint_denominator = independent.transcript.endpoint_numerator(
        gate, 3
    )
    raw = independent.canonical_record(endpoint)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(endpoint_denominator) == "2744*d5**4*(d6 + f5)"

    n = sp.Integer(N_VALUE)
    m = sp.Integer(F_ORDER)
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
    mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f_floor)
    rank6_shadow_cap = sp.cancel((m - 5) / 6)
    q5_switch_ratio = sp.Rational(10, 43)
    normalized_rank4_switch = sp.cancel(
        q5_switch_ratio / rank4_ratio_cap
    )
    assert primary["partition"] == {
        "normalized_x_breaks": [str(value) for value in X_BREAKS],
        "normalized_rank4_switch": str(normalized_rank4_switch),
        "rank4_ratio_switch": str(q5_switch_ratio),
        "regions": ["shadow", "forest_q5"],
    }

    floors = {
        rank: math.comb(N_VALUE, rank)
        - F_ORDER * math.comb(N_VALUE - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    absolute_caps = {
        rank: sp.Rational(math.comb(F_ORDER, rank), floors[rank])
        for rank in (4, 5, 6)
    }
    assert primary["edge_count_sensitive_floors_d4_d5_d6"] == [
        floors[rank] for rank in (4, 5, 6)
    ]
    assert primary["absolute_caps_u4_u5_u6"] == [
        str(absolute_caps[rank]) for rank in (4, 5, 6)
    ]

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
    yy = sp.Symbol("yy")
    global_x = x_lower + (x_upper - x_lower) * X
    q5_d = 10 * independent.transcript.d[5] ** 2
    q5_d -= independent.transcript.d[4] * independent.transcript.d[5]
    q5_d -= 12 * independent.transcript.d[4] * independent.transcript.d[6]
    q5_d_normalized = sp.factor(
        q5_d.subs(
            {
                independent.transcript.d[6]: 1,
                independent.transcript.d[5]: global_x,
                independent.transcript.d[4]: global_x * yy,
            },
            simultaneous=True,
        )
    )
    assert sp.factor(
        q5_d_normalized
        - global_x * (10 * global_x - yy * (global_x + 12))
    ) == 0

    rows = primary["rows"]
    assert len(rows) == 8
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
        u5 = absolute_caps[5] * S
        f5_value = x * u5
        assert rank6_shadow_cap * x_hi * absolute_caps[5] <= absolute_caps[6]

        for coupling_region in ("shadow", "forest_q5"):
            reference = rows[row_index]
            row_index += 1
            if coupling_region == "shadow":
                normalized_rank4 = normalized_rank4_switch * T
                rank6_ratio_cap = rank6_shadow_cap
                normalized_rank4_interval = [
                    "0", str(normalized_rank4_switch)
                ]
            else:
                normalized_rank4 = (
                    normalized_rank4_switch
                    + (1 - normalized_rank4_switch) * T
                )
                rank4_ratio = rank4_ratio_cap * normalized_rank4
                rank6_ratio_cap = sp.cancel(
                    (10 - rank4_ratio) / (12 * rank4_ratio)
                )
                normalized_rank4_interval = [
                    str(normalized_rank4_switch), "1"
                ]
                assert sp.factor(
                    rank6_ratio_cap.subs(T, 0) - rank6_shadow_cap
                ) == 0
            rank4_ratio = rank4_ratio_cap * normalized_rank4

            assert reference["x_slab"] == x_index
            assert reference["normalized_x_interval"] == [
                str(x_lo_norm), str(x_hi_norm)
            ]
            assert reference["x_interval"] == [str(x_lo), str(x_hi)]
            assert reference["q5_y_cap_at_right_endpoint"] == str(q5_y_cap)
            assert reference["y_interval"] == [str(y_lower), str(y_cap)]
            assert reference["u5_interval"] == ["0", str(absolute_caps[5])]
            assert reference["coupling_region"] == coupling_region
            assert reference["normalized_rank4_interval"] == normalized_rank4_interval
            assert reference["rank6_ratio_cap"] == str(
                sp.factor(rank6_ratio_cap)
            )

            f4_value = rank4_ratio * f5_value
            f6_value = rank6_ratio_cap * f5_value * V6
            rational_expression = sp.cancel(
                endpoint.subs(
                    {
                        independent.transcript.d[6]: 1,
                        independent.transcript.d[5]: x,
                        independent.transcript.d[4]: x * y,
                        independent.transcript.f[6]: f6_value,
                        independent.transcript.f[5]: f5_value,
                        independent.transcript.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            numerator, denominator = sp.fraction(rational_expression)
            denominator_record = positive_denominator_record(
                denominator, variables
            )
            assert reference["cleared_positive_denominator"] == denominator_record
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = independent.bernstein_record(polynomial)
            assert reference["power_terms"] == len(polynomial.terms())
            for key, value in result.items():
                assert reference[key] == value, (
                    x_index, coupling_region, key
                )
            assert result["negative"] == 0 and result["zero"] == 0
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += result[key]
            digest.update(
                (
                    f"{x_index}:{coupling_region}:"
                    f"{result['ordered_sha256']}\n"
                ).encode()
            )

    assert row_index == len(rows)
    assert primary["aggregate"] == totals
    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-order35-exact-F26-q5-bridge-"
            "independent-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_"
            "F_ORDER_26_Q5_BRIDGE"
        ),
        "D_order": N_VALUE,
        "F_order": F_ORDER,
        "independence": (
            "This audit imports neither the producer nor any probe. It "
            "reconstructs the endpoint from the canonical transcript and "
            "recomputes every exact rational Bernstein coefficient, including "
            "the positive denominator clearing in the forest-Q5 region."
        ),
        "raw_endpoint_numerator": raw,
        "D_q5_normalized_identity": str(q5_d_normalized),
        "F_q5_ratio_identity": (
            "10-r-12*r*b>=0, so b<=(10-r)/(12*r) for r>0"
        ),
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
