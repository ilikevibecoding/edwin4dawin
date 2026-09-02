#!/usr/bin/env python3
"""Exact Q5-compatible probe for the |D|=45, |F|<=30 mask-3 branch."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_order45_q5_compatibility_probe_root_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n_value = 45
    small_value = 30
    n = sp.Integer(n_value)
    small = sp.Integer(small_value)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)

    # Since D has N-M components and M=|F|=|E(D)|, the elementary union
    # bound over the M edges sharpens all three absolute coefficient floors.
    floors = {
        k: math.comb(n_value, k)
        - small_value * math.comb(n_value - 2, k - 2)
        for k in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(small_value, 4), floors[4])
    a5 = sp.Rational(math.comb(small_value, 5), floors[5])
    a6 = sp.Rational(math.comb(small_value, 6), floors[6])
    small_u6_break = sp.cancel(
        a6 / (sp.cancel((small - 5) * x_upper / 6))
    )
    assert 0 < small_u6_break < a5
    u5_breaks = (sp.Integer(0), small_u6_break, a5)
    normalized_x_breaks = (sp.Integer(0), sp.Rational(1, 2), sp.Integer(1))

    rows = []
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(normalized_x_breaks, normalized_x_breaks[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        # Q5(D)>=0 is y<=10x/(x+12).  The right side is increasing, so
        # its value at the slab's right endpoint gives a rigorous rectangle.
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            u5 = lo + (hi - lo) * S
            u6_mode = "shadow" if u_index == 0 else "absolute"
            f6_value = (
                sp.cancel((small - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow"
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
                        base.corner.leaf.f[4]: x * y * a4 * V4,
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
                    "u6_mode": u6_mode,
                    **result,
                }
            )
            print(
                "CELL", x_index, u_index, "NEG", result["negative"],
                "VERTEX_NEG", result["negative_vertices"], flush=True,
            )

    payload = {
        "schema": "rank8-delta1-mask3-order45-q5-compatibility-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": n_value,
        "F_order_at_most": small_value,
        "endpoint_names": metadata["endpoint_names"],
        "q5_compatibility": "10*d5^2-d4*d5-12*d4*d6>=0",
        "edge_count_identity": "|F|=|E(D)|",
        "edge_count_sensitive_floors": {str(k): floors[k] for k in floors},
        "normalized_x_breaks": [str(value) for value in normalized_x_breaks],
        "absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "rows": rows,
        "aggregate": {
            key: sum(row[key] for row in rows)
            for key in ("coefficients", "negative", "zero", "positive")
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("AGGREGATE", payload["aggregate"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
