#!/usr/bin/env python3
"""Exact-F Delta1 mask-3 bridge with the forest-Q5 boundary kept coupled."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-slabs-below-cap", type=int, default=2)
    parser.add_argument("--x-slabs-above-cap", type=int, default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value, f_value = args.D_order, args.F_order
    assert 26 <= n_value <= 34 and 9 <= f_value < n_value

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n, m = sp.Integer(n_value), sp.Integer(f_value)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_int = int(sp.floor(mu4))
    mu4_frac = sp.cancel(mu4 - mu4_int)
    phi4 = sp.cancel(
        (1 - mu4_frac) * sp.binomial(mu4_int - 1, 2)
        + mu4_frac * sp.binomial(mu4_int, 2)
    )
    mu5 = sp.cancel(2 * phi4 / mu4)
    x_lower, x_upper = sp.cancel(6 / (n - 5)), sp.cancel(6 / mu5)
    y_lower, y_upper = sp.cancel(5 / (n - 4)), sp.cancel(5 / mu4)
    cap_cross_x = sp.cancel(12 * y_upper / (10 - y_upper))
    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    assert mu4_f > 0
    rank4_ratio = sp.cancel(5 / mu4_f)

    floors = {
        rank: math.comb(n_value, rank)
        - f_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    a4 = sp.Rational(math.comb(f_value, 4), floors[4])
    a5 = sp.Rational(math.comb(f_value, 5), floors[5])
    a6 = sp.Rational(math.comb(f_value, 6), floors[6])

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    pieces = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        count = args.x_slabs_below_cap
        for i in range(count):
            pieces.append((
                "coupled_q5",
                x_lower + (upper - x_lower) * sp.Rational(i, count),
                x_lower + (upper - x_lower) * sp.Rational(i + 1, count),
            ))
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        count = args.x_slabs_above_cap
        for i in range(count):
            pieces.append((
                "ordinary_upper",
                lower + (x_upper - lower) * sp.Rational(i, count),
                lower + (x_upper - lower) * sp.Rational(i + 1, count),
            ))
    assert pieces

    rows = []
    for x_index, (cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = q5_cap if cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        y_piece_max = (
            sp.cancel(10 * x1 / (x1 + 12))
            if cap_mode == "coupled_q5" else y_upper
        )
        ratio_absolute_low = sp.cancel(a4 * y_lower / rank4_ratio)
        ratio_absolute_high = sp.cancel(a4 * y_piece_max / rank4_ratio)
        u6_break = sp.cancel(a6 / (sp.cancel((m - 5) * x1 / 6)))
        breaks = {sp.Integer(0), a5}
        for value in (ratio_absolute_low, ratio_absolute_high, u6_break):
            if 0 < value < a5:
                breaks.add(value)
        u_breaks = tuple(sorted(breaks))
        for u_index, (lo, hi) in enumerate(zip(u_breaks, u_breaks[1:])):
            u5 = lo + (hi - lo) * S
            midpoint = (lo + hi) / 2
            y_midpoint = (y_lower + y_piece_max) / 2
            f4_mode = (
                "ratio"
                if rank4_ratio * midpoint <= a4 * y_midpoint
                else "absolute"
            )
            f4_value = (
                rank4_ratio * x * u5 * V4
                if f4_mode == "ratio"
                else a4 * x * y * V4
            )
            f6_mode = "shadow" if hi <= u6_break else "absolute"
            f6_value = (
                sp.cancel((m - 5) / 6) * x * u5 * V6
                if f6_mode == "shadow"
                else a6 * V6
            )
            rational_expression = endpoint.subs(
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
            numerator, denominator = sp.fraction(sp.cancel(rational_expression))
            assert all(
                value > 0
                for value in (
                    denominator.subs({X: 0, Y: 0, S: 0, V4: 0, V6: 0}),
                    denominator.subs({X: 1, Y: 1, S: 1, V4: 1, V6: 1}),
                )
            )
            polynomial = sp.Poly(
                sp.expand(numerator), X, Y, S, V4, V6, domain=sp.QQ
            )
            result = base.audit(polynomial)
            assert result["negative"] == 0, (
                x_index, u_index, cap_mode, f4_mode, f6_mode, result
            )
            assert result["negative_vertices"] == 0 and "adaptive" not in result
            rows.append(
                {
                    "x_piece": x_index,
                    "x_interval": [str(x0), str(x1)],
                    "q5_cap_mode": cap_mode,
                    "u5_interval": [str(lo), str(hi)],
                    "f4_mode": f4_mode,
                    "f6_mode": f6_mode,
                    "cleared_positive_denominator": str(denominator),
                    **result,
                }
            )
            print(
                "PASS", n_value, f_value, x_index, u_index,
                cap_mode, f4_mode, f6_mode, flush=True,
            )

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-q5-coupled-root-v1",
        "status": (
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_Q5_COUPLED"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value} "
            f"and |F|={f_value}."
        ),
        "D_order": n_value,
        "F_order": f_value,
        "q5_cap_cross_x": str(cap_cross_x),
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12), retained exactly below its crossing with the ordinary y cap.",
            "edge_union_floor": "i_k(D)>=C(N,k)-M*C(N-2,k-2).",
            "rank4_forest_ratio": "f4<=(5/mu4(F))f5, combined with the exact-order absolute cap.",
            "rank6_shadow": "6f6<=(M-5)f5.",
        },
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
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
