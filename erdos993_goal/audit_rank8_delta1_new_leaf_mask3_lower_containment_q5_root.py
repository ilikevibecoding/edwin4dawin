#!/usr/bin/env python3
"""Import-independent replay of a |F|=|D|-1 containment/Q5 bridge."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent
import audit_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root as helper


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "certify_rank8_delta1_new_leaf_mask3_lower_containment_q5_root.py"
HELPER = HERE / "audit_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root.py"
EXPECTED_HELPER_SHA256 = "E7AC431BE844CB873317B195B1F79BADC08A397BE4BCC641AA60786711C3675E"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert sha256(HELPER) == EXPECTED_HELPER_SHA256
    primary_path = Path(args.primary).resolve()
    output = Path(args.output).resolve()
    primary_sha256 = sha256(primary_path)
    assert primary_sha256 == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-lower-containment-q5-root-v1"
    )
    n_value, f_value = int(primary["D_order"]), int(primary["F_order"])
    assert 26 <= n_value <= 34 and f_value == n_value - 1
    assert primary["status"] == (
        f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
        f"F_ORDER_{f_value}_CONTAINMENT_Q5"
    )
    assert primary["source_sha256"] == sha256(PRODUCER)

    gate = independent.transcript.delta1_new_leaf_gate()
    endpoint, endpoint_denominator = independent.transcript.endpoint_numerator(
        gate, 3
    )
    raw = independent.canonical_record(endpoint)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(endpoint_denominator) == "2744*d5**4*(d6 + f5)"

    n, m = sp.Integer(n_value), sp.Integer(f_value)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_integer = int(sp.floor(mu4))
    mu4_fraction = sp.cancel(mu4 - mu4_integer)
    phi4 = sp.cancel(
        (1 - mu4_fraction) * sp.binomial(mu4_integer - 1, 2)
        + mu4_fraction * sp.binomial(mu4_integer, 2)
    )
    mu5 = sp.cancel(2 * phi4 / mu4)
    x_lower, x_upper = sp.cancel(6 / (n - 5)), sp.cancel(6 / mu5)
    y_lower, y_upper = sp.cancel(5 / (n - 4)), sp.cancel(5 / mu4)
    cap_cross_x = sp.cancel(12 * y_upper / (10 - y_upper))
    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f)
    rank6_shadow_cap = sp.cancel((m - 5) / 6)
    q5_switch_ratio = sp.cancel(10 / (2 * m - 9))
    assert primary["rank4_ratio_cap"] == str(rank4_ratio_cap)
    assert primary["rank6_shadow_cap"] == str(rank6_shadow_cap)

    below = int(primary["partition"]["x_slabs_below_D_q5_cap"])
    above = int(primary["partition"]["x_slabs_above_D_q5_cap"])
    assert primary["partition"] == {
        "x_slabs_below_D_q5_cap": below,
        "x_slabs_above_D_q5_cap": above,
        "D_q5_cap_cross_x": str(cap_cross_x),
        "rank4_ratio_switch": str(q5_switch_ratio),
    }
    pieces: list[tuple[str, sp.Expr, sp.Expr]] = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        for index in range(below):
            pieces.append(
                (
                    "coupled_q5",
                    x_lower + (upper - x_lower) * sp.Rational(index, below),
                    x_lower
                    + (upper - x_lower) * sp.Rational(index + 1, below),
                )
            )
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        for index in range(above):
            pieces.append(
                (
                    "ordinary_upper",
                    lower + (x_upper - lower) * sp.Rational(index, above),
                    lower
                    + (x_upper - lower) * sp.Rational(index + 1, above),
                )
            )

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
    references = primary["rows"]
    assert len(references) == 2 * len(pieces)
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    digest = hashlib.sha256()
    row_index = 0

    for x_index, (d_cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        d_q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = d_q5_cap if d_cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        f5_value = x * S
        specs = (
            ("containment_shadow", q5_switch_ratio * T, rank6_shadow_cap),
            (
                "containment_forest_q5",
                q5_switch_ratio
                + (rank4_ratio_cap - q5_switch_ratio) * T,
                None,
            ),
        )
        for f_cap_mode, z, fixed_cap in specs:
            reference = references[row_index]
            row_index += 1
            f4_value = z * f5_value
            rank6_cap = (
                fixed_cap
                if fixed_cap is not None
                else sp.cancel((10 - z) / (12 * z))
            )
            f6_value = rank6_cap * f5_value * V6
            substitutions = {
                independent.transcript.d[6]: sp.Integer(1),
                independent.transcript.d[5]: x,
                independent.transcript.d[4]: x * y,
                independent.transcript.f[6]: f6_value,
                independent.transcript.f[5]: f5_value,
                independent.transcript.f[4]: f4_value,
            }
            numerator, denominator = helper.cleared_substitution(
                endpoint, substitutions
            )
            positive_record, sign = helper.denominator_record(
                denominator, variables
            )
            if sign < 0:
                numerator = -numerator
            polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
            result = independent.bernstein_record(polynomial)
            result = {"power_terms": len(polynomial.terms()), **result}

            assert reference["x_piece"] == x_index
            assert reference["x_interval"] == [str(x0), str(x1)]
            assert reference["D_q5_cap_mode"] == d_cap_mode
            assert reference["F_q5_cap_mode"] == f_cap_mode
            assert reference["u5_interval"] == ["0", "1"]
            assert reference["rank4_ratio_parameterization"] == str(sp.factor(z))
            assert reference["rank6_ratio_cap"] == str(sp.factor(rank6_cap))
            assert reference["cleared_positive_denominator"] == positive_record
            for key, value in result.items():
                assert reference[key] == value, (x_index, f_cap_mode, key)
            assert result["negative"] == 0 and result["negative_vertices"] == 0

            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += int(result[key])
            digest.update(
                f"{x_index}:{f_cap_mode}:{result['ordered_sha256']}\n".encode()
            )
            print(
                "AUDIT_PASS", n_value, f_value, x_index,
                f_cap_mode, flush=True,
            )
            del numerator, denominator, polynomial, substitutions
            sp.core.cache.clear_cache()
            gc.collect()

    assert row_index == len(references)
    assert primary["aggregate"] == totals
    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-lower-containment-q5-"
            "independent-audit-v1"
        ),
        "status": (
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_CONTAINMENT_Q5_AUDIT"
        ),
        "D_order": n_value,
        "F_order": f_value,
        "independence": (
            "Imports neither producer. Reconstructs the endpoint from the "
            "canonical transcript and independently replays induced "
            "containment, Q5(D), Q5(F), the rank-4 forest ratio, the rank-6 "
            "shadow, every denominator, and every rational Bernstein coefficient."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {"path": str(primary_path), "sha256": primary_sha256},
        "producer_source_sha256": sha256(PRODUCER),
        "independent_helper_sha256": sha256(HELPER),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print(
        "REGIONS", totals["regions"],
        "COEFFICIENTS", totals["coefficients"], flush=True,
    )
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
