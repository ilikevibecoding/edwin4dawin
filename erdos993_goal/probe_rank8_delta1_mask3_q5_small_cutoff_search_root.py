#!/usr/bin/env python3
"""Search Q5-compatible small-F boxes for lower Delta1 mask-3 orders."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-max", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value = args.D_order
    small_value = args.F_max
    assert 26 <= n_value and 6 <= small_value < n_value
    assert args.x_slabs >= 1

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n = sp.Integer(n_value)
    small = sp.Integer(small_value)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)

    floors = {
        rank: math.comb(n_value, rank)
        - small_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    a4 = sp.Rational(math.comb(small_value, 4), floors[4])
    a5 = sp.Rational(math.comb(small_value, 5), floors[5])
    a6 = sp.Rational(math.comb(small_value, 6), floors[6])
    u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    u6_break = sp.cancel(
        a6 / sp.cancel((small - 5) * x_upper / 6)
    )
    breaks = {sp.Integer(0), a5}
    if 0 < u4_break < a5:
        breaks.add(u4_break)
    if 0 < u6_break < a5:
        breaks.add(u6_break)
    u5_breaks = sorted(breaks)
    x_breaks = tuple(
        sp.Rational(index, args.x_slabs)
        for index in range(args.x_slabs + 1)
    )
    rows = []
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(x_breaks, x_breaks[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            midpoint = (lo + hi) / 2
            u5 = lo + (hi - lo) * S
            u4_mode = (
                "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
            )
            f4_value = (
                (x * y - sp.cancel(4 / (n - 4)) * x * (1 - u5)) * V4
                if u4_mode == "missing"
                else x * y * a4 * V4
            )
            shadow_cap = sp.cancel((small - 5) / 6) * x * u5
            u6_mode = (
                "shadow"
                if sp.cancel((small - 5) / 6) * x_upper * midpoint <= a6
                else "absolute"
            )
            f6_value = (shadow_cap if u6_mode == "shadow" else a6) * V6
            expression = sp.expand(
                endpoint.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x,
                        base.corner.leaf.d[4]: x * y,
                        base.corner.leaf.f[6]: f6_value,
                        base.corner.leaf.f[5]: x * u5,
                        base.corner.leaf.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            result = base.audit(
                sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            )
            rows.append(
                {
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "y_interval": [str(y_lower), str(y_cap)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "u5_interval": [str(lo), str(hi)],
                    "u4_mode": u4_mode,
                    "u4_missing_envelope": (
                        "exact_y_dependent" if u4_mode == "missing" else None
                    ),
                    "u6_mode": u6_mode,
                    **result,
                }
            )
            print(
                "CELL", x_index, u_index, u4_mode, u6_mode,
                "NEG", result["negative"],
                "VERTEX_NEG", result["negative_vertices"], flush=True,
            )

    payload = {
        "schema": "rank8-delta1-mask3-q5-small-cutoff-search-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": n_value,
        "F_order_at_most": small_value,
        "x_slabs": args.x_slabs,
        "endpoint_names": metadata["endpoint_names"],
        "edge_count_sensitive_floors": {str(k): value for k, value in floors.items()},
        "absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "u4_break": str(u4_break),
        "u6_break": str(u6_break),
        "rows": rows,
        "aggregate": {
            key: sum(row[key] for row in rows)
            for key in ("coefficients", "negative", "zero", "positive")
        },
    }
    output = Path(args.output).resolve()
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("AGGREGATE", payload["aggregate"], flush=True)


if __name__ == "__main__":
    main()
