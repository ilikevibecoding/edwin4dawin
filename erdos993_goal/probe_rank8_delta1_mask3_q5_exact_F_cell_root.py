#!/usr/bin/env python3
"""Probe one exact-F mask-3 slice with Q5(D) and exact missing shadow."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, default=8)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value = args.D_order
    f_order_value = args.F_order
    assert 18 <= f_order_value < n_value
    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n = sp.Integer(n_value)
    m = sp.Integer(f_order_value)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
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
        for y_lo_norm, y_hi_norm in zip(Y_BREAKS, Y_BREAKS[1:]):
            y_slab_lower = y_lower + (y_cap - y_lower) * y_lo_norm
            y = y_lower + (y_cap - y_lower) * (
                y_lo_norm + (y_hi_norm - y_lo_norm) * Y
            )
            ratio_envelope = sp.cancel(5 / (mu4_f_floor * y_slab_lower))
            switch = sp.cancel((1 - k4) / (ratio_envelope - k4))
            assert 0 < switch < 1
            for region, lo, hi in (
                ("ratio", sp.Integer(0), switch),
                ("missing", switch, sp.Integer(1)),
            ):
                u5 = lo + (hi - lo) * S
                f4_value = (
                    sp.cancel(5 / mu4_f_floor) * x * u5 * V4
                    if region == "ratio"
                    else (
                        x * y - sp.cancel(4 / (n - 4)) * x * (1 - u5)
                    ) * V4
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
                        "x_slab": x_index,
                        "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                        "x_interval": [str(x_lo), str(x_hi)],
                        "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                        "normalized_y_interval": [str(y_lo_norm), str(y_hi_norm)],
                        "y_interval": [str(y_slab_lower), str(
                            y_lower + (y_cap - y_lower) * y_hi_norm
                        )],
                        "region": region,
                        "u5_interval": [str(lo), str(hi)],
                        "missing_envelope": (
                            "exact_y_dependent" if region == "missing" else None
                        ),
                        **result,
                    }
                )
                print(
                    "CELL", x_index, str(y_lo_norm), str(y_hi_norm), region,
                    "NEG", result["negative"],
                    "VERTEX_NEG", result["negative_vertices"], flush=True,
                )
    payload = {
        "schema": "rank8-delta1-mask3-q5-exact-F-cell-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": n_value,
        "F_order": f_order_value,
        "x_slabs": args.x_slabs,
        "endpoint_names": metadata["endpoint_names"],
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
