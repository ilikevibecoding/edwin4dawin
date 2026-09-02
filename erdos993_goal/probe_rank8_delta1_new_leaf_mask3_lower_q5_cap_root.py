#!/usr/bin/env python3
"""Probe the Delta1 mask-3 exact-F cells after enforcing the forest-Q5 cap."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, default=8)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert 26 <= args.D_order
    assert 1 <= args.F_order < args.D_order
    assert args.x_slabs >= 1

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n = sp.Integer(args.D_order)
    m = sp.Integer(args.F_order)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
    ratio_multiplier = sp.cancel(5 / (mu4_f_floor * y_lower))
    ratio_break = sp.cancel((1 - k4) / (ratio_multiplier - k4))
    assert 0 < ratio_break < 1

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []
    for slab in range(args.x_slabs):
        x_lo_norm = sp.Rational(slab, args.x_slabs)
        x_hi_norm = sp.Rational(slab + 1, args.x_slabs)
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        ratio_multiplier = sp.cancel(5 / (mu4_f_floor * y_lower))
        ratio_break = sp.cancel((1 - k4) / (ratio_multiplier - k4))
        for region, lo, hi in (
            ("ratio", sp.Integer(0), ratio_break),
            ("missing", ratio_break, sp.Integer(1)),
        ):
            u5 = lo + (hi - lo) * S
            f4_value = (
                sp.cancel(5 / mu4_f_floor) * x * u5 * V4
                if region == "ratio"
                else x * y * (1 - k4 * (1 - u5)) * V4
            )
            f6_value = sp.cancel((m - 5) / 6) * x * u5 * V6
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
                    "x_slab": slab,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "y_interval": [str(y_lower), str(y_cap)],
                    "region": region,
                    "u5_interval": [str(lo), str(hi)],
                    **result,
                }
            )
            print(
                "CELL", slab, region, "NEG", result["negative"],
                "VERTEX_NEG", result["negative_vertices"],
                "ADAPTIVE", result.get("adaptive", {}).get("status", "none"),
                flush=True,
            )

    payload = {
        "schema": "rank8-delta1-mask3-lower-q5-cap-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": args.D_order,
        "F_order": args.F_order,
        "x_slabs": args.x_slabs,
        "endpoint_names": metadata["endpoint_names"],
        "rows": rows,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
