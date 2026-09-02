#!/usr/bin/env python3
"""Hybrid ratio/absolute exact-F bridge for low-order Delta1 mask 3."""

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
    parser.add_argument("--x-slabs", type=int, default=8)
    parser.add_argument("--y-slabs", type=int, default=4)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value, f_value = args.D_order, args.F_order
    assert 26 <= n_value <= 34 and 9 <= f_value < n_value
    assert args.x_slabs >= 1 and args.y_slabs >= 1

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
    x_breaks = tuple(
        sp.Rational(i, args.x_slabs) for i in range(args.x_slabs + 1)
    )
    rows = []
    for x_index, (x0n, x1n) in enumerate(zip(x_breaks, x_breaks[1:])):
        x0 = x_lower + (x_upper - x_lower) * x0n
        x1 = x_lower + (x_upper - x_lower) * x1n
        x = x0 + (x1 - x0) * X
        q5_cap = sp.cancel(10 * x1 / (x1 + 12))
        y_cap = min(y_upper, q5_cap)
        assert y_lower <= y_cap
        y_breaks = tuple(
            y_lower + (y_cap - y_lower) * sp.Rational(i, args.y_slabs)
            for i in range(args.y_slabs + 1)
        )
        for y_index, (y0, y1) in enumerate(zip(y_breaks, y_breaks[1:])):
            y = y0 + (y1 - y0) * Y
            ratio_absolute_low = sp.cancel(a4 * y0 / rank4_ratio)
            ratio_absolute_high = sp.cancel(a4 * y1 / rank4_ratio)
            u6_break = sp.cancel(a6 / (sp.cancel((m - 5) * x1 / 6)))
            breaks = {sp.Integer(0), a5}
            for value in (ratio_absolute_low, ratio_absolute_high, u6_break):
                if 0 < value < a5:
                    breaks.add(value)
            u_breaks = tuple(sorted(breaks))

            for u_index, (lo, hi) in enumerate(zip(u_breaks, u_breaks[1:])):
                midpoint = (lo + hi) / 2
                y_midpoint = (y0 + y1) / 2
                u5 = lo + (hi - lo) * S
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
                assert result["negative"] == 0, (
                    x_index, y_index, u_index, f4_mode, f6_mode, result
                )
                assert result["negative_vertices"] == 0 and "adaptive" not in result
                rows.append(
                    {
                        "x_slab": x_index,
                        "y_slab": y_index,
                        "normalized_x_interval": [str(x0n), str(x1n)],
                        "x_interval": [str(x0), str(x1)],
                        "y_interval": [str(y0), str(y1)],
                        "u5_interval": [str(lo), str(hi)],
                        "f4_mode": f4_mode,
                        "f6_mode": f6_mode,
                        **result,
                    }
                )
                print(
                    "PASS", n_value, f_value, x_index, y_index, u_index,
                    f4_mode, f6_mode, flush=True,
                )

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-f-hybrid-root-v1",
        "status": (
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_HYBRID"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value} "
            f"and |F|={f_value}."
        ),
        "D_order": n_value,
        "F_order": f_value,
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "edge_union_floor": "i_k(D)>=C(N,k)-M*C(N-2,k-2).",
            "absolute_caps": "f_k<=C(M,k), k=4,5,6.",
            "rank4_forest_ratio": "f4<=(5/mu4(F))f5.",
            "rank6_shadow": "6f6<=(M-5)f5.",
            "hybrid_rule": "Each subbox uses either valid rank4 bound; the partition follows their crossing envelope.",
        },
        "partition": {
            "normalized_x_breaks": [str(v) for v in x_breaks],
            "y_slabs_per_x_slab": args.y_slabs,
        },
        "edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "rank4_ratio_cap": str(rank4_ratio),
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
