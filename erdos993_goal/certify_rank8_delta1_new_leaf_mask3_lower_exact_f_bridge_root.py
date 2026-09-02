#!/usr/bin/env python3
"""Exact rational bridge for one low-order Delta1 mask-3 (|D|,|F|) cell."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, default=8)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value = args.D_order
    f_value = args.F_order
    assert 26 <= n_value <= 34
    assert 8 <= f_value < n_value
    assert args.x_slabs >= 1

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n = sp.Integer(n_value)
    m = sp.Integer(f_value)
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
    assert mu4_f_floor > 0
    rank4_ratio_cap = sp.cancel(5 / mu4_f_floor)

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

        shadow_multiplier = sp.cancel((m - 5) * x_hi / 6)
        u6_break = sp.cancel(a6 / shadow_multiplier)
        u5_break_set = {sp.Integer(0), a5}
        if 0 < u6_break < a5:
            u5_break_set.add(u6_break)
        u5_breaks = tuple(sorted(u5_break_set))
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            u5 = lo + (hi - lo) * S
            u6_mode = "shadow" if hi <= u6_break else "absolute"
            f6_value = (
                sp.cancel((m - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow"
                else a6 * V6
            )
            f4_value = rank4_ratio_cap * x * u5 * V4
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
            assert result["negative"] == 0, (x_index, u_index, result)
            assert result["negative_vertices"] == 0
            assert "adaptive" not in result
            rows.append(
                {
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "y_interval": [str(y_lower), str(y_cap)],
                    "u5_interval": [str(lo), str(hi)],
                    "u4_mode": "exact_F_rank4_ratio",
                    "u6_mode": u6_mode,
                    **result,
                }
            )
            print(
                "PASS", n_value, f_value, x_index, u_index, u6_mode,
                flush=True,
            )

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-f-bridge-root-v1",
        "status": (
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_BRIDGE"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value} "
            f"and |F|={f_value}."
        ),
        "D_order": n_value,
        "F_order": f_value,
        "partition": {
            "normalized_x_breaks": [str(value) for value in x_breaks],
            "u5_rule": "split where the rank-6 shadow meets the absolute cap",
        },
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "edge_count_identity": "|F|=|E(D)|.",
            "edge_union_floor": "i_k(D)>=C(N,k)-M*C(N-2,k-2).",
            "absolute_caps": "f_k<=C(M,k), k=4,5,6.",
            "rank4_forest_ratio": "f4<=(5/mu4(F))f5.",
            "rank6_shadow": "6f6<=(M-5)f5.",
            "sign_engine": "exact rational tensor Bernstein coefficients",
        },
        "edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "rank4_ratio_cap": str(rank4_ratio_cap),
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
        "dependencies": {
            "endpoint_source": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"
            ),
            "bernstein_source": sha256(
                HERE / "probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root.py"
            ),
            "forest_q5_theorem": sha256(
                HERE / "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md"
            ),
        },
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
