#!/usr/bin/env python3
"""Delta1 mask-3 exact-F bridge with coupled Q5 and rank-4 switch."""

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

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []
    for x_index, (cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = q5_cap if cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        switch4 = sp.cancel(a4 * y / rank4_ratio)
        switch_min = sp.cancel(a4 * y_lower / rank4_ratio)
        y_piece_max = (
            sp.cancel(10 * x1 / (x1 + 12))
            if cap_mode == "coupled_q5" else y_upper
        )
        switch_max = sp.cancel(a4 * y_piece_max / rank4_ratio)
        assert 0 < switch_min <= switch_max < a5

        for region, u5, f4_value in (
            (
                "ratio",
                switch4 * S,
                rank4_ratio * x * switch4 * S * V4,
            ),
            (
                "absolute",
                switch4 + (a5 - switch4) * S,
                a4 * x * y * V4,
            ),
        ):
            # The extension-shadow inequality 6 f6 <= (M-5) f5 is valid
            # throughout both rank-4 regions.  Keeping it coupled to u5 is
            # strictly sharper than replacing it by the independent absolute
            # cap in the high-u5 region (and avoids an artificial endpoint
            # that no forest is required to realize).
            f6_mode = "shadow"
            f6_value = sp.cancel((m - 5) / 6) * x * u5 * V6
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
            polynomial = sp.Poly(
                sp.expand(numerator), X, Y, S, V4, V6, domain=sp.QQ
            )
            result = base.audit(polynomial)
            assert result["negative"] == 0, (
                x_index, cap_mode, region, f6_mode, result
            )
            assert result["negative_vertices"] == 0 and "adaptive" not in result
            rows.append(
                {
                    "x_piece": x_index,
                    "x_interval": [str(x0), str(x1)],
                    "q5_cap_mode": cap_mode,
                    "u5_region": region,
                    "u5_switch": "a4*y/rank4_ratio",
                    "f4_mode": region,
                    "f6_mode": f6_mode,
                    "cleared_positive_denominator": str(denominator),
                    **result,
                }
            )
            print(
                "PASS", n_value, f_value, x_index, cap_mode,
                region, f6_mode, flush=True,
            )

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-q5-f4coupled-root-v2",
        "status": (
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_Q5_F4_COUPLED"
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
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12), retained exactly below its ordinary-cap crossing.",
            "rank4_coupled_partition": "u5 is split exactly at a4*y/(5/mu4(F)), where the rank4 ratio and absolute caps agree.",
            "rank6_shadow": "Both rank-4 regions retain the valid coupled bound 6f6<=(M-5)f5.",
            "edge_union_floor": "i_k(D)>=C(N,k)-M*C(N-2,k-2).",
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
