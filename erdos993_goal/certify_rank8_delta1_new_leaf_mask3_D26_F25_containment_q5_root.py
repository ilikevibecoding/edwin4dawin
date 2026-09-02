#!/usr/bin/env python3
"""Exact D=26, F=25 Delta1 mask-3 bridge using F subset D containment."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base
import certify_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root as helper


N_VALUE = 26
F_ORDER = 25
HELPER = "certify_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root.py"
HELPER_SHA256 = "D7C75FA11EA76ABE2CA790645C0F8892B5102C005AEDF1B6DB314E8C92FF7C82"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--x-slabs-below-cap", type=int, default=4)
    parser.add_argument("--x-slabs-above-cap", type=int, default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert args.x_slabs_below_cap >= 1 and args.x_slabs_above_cap >= 1
    here = Path(__file__).resolve().parent
    assert sha256(here / HELPER) == HELPER_SHA256

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n, m = sp.Integer(N_VALUE), sp.Integer(F_ORDER)
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
    assert 0 < q5_switch_ratio < rank4_ratio_cap

    pieces: list[tuple[str, sp.Expr, sp.Expr]] = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        for index in range(args.x_slabs_below_cap):
            count = args.x_slabs_below_cap
            pieces.append(
                (
                    "coupled_q5",
                    x_lower + (upper - x_lower) * sp.Rational(index, count),
                    x_lower + (upper - x_lower) * sp.Rational(index + 1, count),
                )
            )
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        for index in range(args.x_slabs_above_cap):
            count = args.x_slabs_above_cap
            pieces.append(
                (
                    "ordinary_upper",
                    lower + (x_upper - lower) * sp.Rational(index, count),
                    lower + (x_upper - lower) * sp.Rational(index + 1, count),
                )
            )
    assert pieces

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
    rows = []
    for x_index, (d_cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        d_q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = d_q5_cap if d_cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        f5_value = x * S

        for f_cap_mode, z, fixed_cap in (
            (
                "containment_shadow",
                q5_switch_ratio * T,
                rank6_shadow_cap,
            ),
            (
                "containment_forest_q5",
                q5_switch_ratio
                + (rank4_ratio_cap - q5_switch_ratio) * T,
                None,
            ),
        ):
            f4_value = z * f5_value
            rank6_cap = (
                fixed_cap
                if fixed_cap is not None
                else sp.cancel((10 - z) / (12 * z))
            )
            f6_value = rank6_cap * f5_value * V6
            substitutions = {
                base.corner.leaf.d[6]: sp.Integer(1),
                base.corner.leaf.d[5]: x,
                base.corner.leaf.d[4]: x * y,
                base.corner.leaf.f[6]: f6_value,
                base.corner.leaf.f[5]: f5_value,
                base.corner.leaf.f[4]: f4_value,
            }
            numerator, denominator = helper.cleared_substitution(
                endpoint, substitutions
            )
            denominator_record, denominator_sign = helper.positive_denominator_record(
                denominator, variables
            )
            if denominator_sign < 0:
                numerator = -numerator
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = helper.coefficient_audit(polynomial)
            assert result["negative"] == 0, (
                x_index, d_cap_mode, f_cap_mode, result
            )
            assert result["negative_vertices"] == 0
            rows.append(
                {
                    "x_piece": x_index,
                    "x_interval": [str(x0), str(x1)],
                    "D_q5_cap_mode": d_cap_mode,
                    "F_q5_cap_mode": f_cap_mode,
                    "u5_interval": ["0", "1"],
                    "rank4_ratio_parameterization": str(sp.factor(z)),
                    "rank6_ratio_cap": str(sp.factor(rank6_cap)),
                    "cleared_positive_denominator": denominator_record,
                    **result,
                }
            )
            print(
                "PASS", N_VALUE, F_ORDER, x_index,
                d_cap_mode, f_cap_mode, flush=True,
            )
            del numerator, denominator, polynomial, substitutions
            sp.core.cache.clear_cache()
            gc.collect()

    totals = {
        key: sum(int(row[key]) for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-D26-F25-containment-q5-root-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_26_F_ORDER_25_CONTAINMENT_Q5",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=26 and |F|=25."
        ),
        "D_order": N_VALUE,
        "F_order": F_ORDER,
        "partition": {
            "x_slabs_below_D_q5_cap": args.x_slabs_below_cap,
            "x_slabs_above_D_q5_cap": args.x_slabs_above_cap,
            "D_q5_cap_cross_x": str(cap_cross_x),
            "rank4_ratio_switch": str(q5_switch_ratio),
        },
        "lemmas": {
            "D_q5_compatibility": "Q5(D)>=0 gives d4/d5<=10x/(x+12).",
            "F_q5_compatibility": "Q5(F)>=0 gives f6/f5<=(10-z)/(12z).",
            "induced_subforest_containment": "F is induced in D, hence f5<=d5.",
            "rank4_forest_ratio": "f4/f5<=5/mu4(F).",
            "rank6_shadow": "6f6<=(25-5)f5.",
        },
        "rank4_ratio_cap": str(rank4_ratio_cap),
        "rank6_shadow_cap": str(rank6_shadow_cap),
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
        "dependencies": {HELPER: HELPER_SHA256},
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REGIONS", len(rows), "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
