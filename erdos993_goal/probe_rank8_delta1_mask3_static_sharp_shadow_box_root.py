#!/usr/bin/env python3
"""Exact Bernstein probe for a static sharp-shadow Delta1 mask-3 box."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
from probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root import (
    adaptive_audit,
    power_to_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_static_sharp_shadow_box_probe_root_20260825.json"
CUTOFF = 54


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    N = sp.Integer(CUTOFF)
    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_bound = sp.cancel(6 / mu5_floor)
    y_bound = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
    k6 = sp.cancel((N - 5) / mu5_floor)
    minimum_F_order = N - 12
    tF = sp.cancel(
        (minimum_F_order - 7) * (minimum_F_order - 8)
        / (minimum_F_order - 3)
    )
    l4 = sp.cancel((N - 4) / tF)
    u4_break = sp.cancel((1 - k4) / (l4 - k4))
    u6_break = sp.cancel(1 / k6)
    assert 0 < u4_break < u6_break < 1

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    specs = (
        ("low", 0, u4_break, "ratio", "coupled"),
        ("middle", u4_break, u6_break, "missing", "coupled"),
        ("high", u6_break, 1, "missing", "free"),
    )
    rows = []
    for region, lo, hi, u4_mode, u6_mode in specs:
        x = x_bound * X
        y = y_bound * Y
        u5 = lo + (hi - lo) * S
        u4_upper = l4 * u5 if u4_mode == "ratio" else 1 - k4 * (1 - u5)
        u4 = u4_upper * V4
        u6 = k6 * u5 * V6 if u6_mode == "coupled" else V6
        normalized = sp.expand(
            endpoint.subs(
                {
                    corner.leaf.d[6]: 1,
                    corner.leaf.d[5]: x,
                    corner.leaf.d[4]: x * y,
                    corner.leaf.f[6]: u6,
                    corner.leaf.f[5]: x * u5,
                    corner.leaf.f[4]: x * y * u4,
                },
                simultaneous=True,
            )
        )
        polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
        degrees, tensor = power_to_bernstein_fast(polynomial)
        negative = sum(value < 0 for value in tensor.values())
        negative_vertices = sum(
            tensor[index] < 0
            for index in itertools.product(*((0, degree) for degree in degrees))
        )
        minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
        base = {
            "region": region,
            "power_terms": len(polynomial.terms()),
            "degrees": list(degrees),
            "coefficients": len(tensor),
            "negative": negative,
            "negative_vertices": negative_vertices,
            "minimum_index": list(minimum_index),
            "minimum": str(minimum),
        }
        if negative and not negative_vertices:
            base["adaptive"] = adaptive_audit(polynomial)
        rows.append(base)
        print(
            "REGION", region, "TERMS", len(polynomial.terms()),
            "DEGREES", list(degrees), "NEG", negative,
            "VERTEX_NEG", negative_vertices,
            "ADAPTIVE", base.get("adaptive", {}).get("status"),
            flush=True,
        )
    payload = {
        "schema": "rank8-delta1-mask3-static-sharp-shadow-box-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "cutoff_D_order": CUTOFF,
        "endpoint_names": metadata["endpoint_names"],
        "constants": {
            "mu4_floor": str(mu4_floor),
            "mu5_floor": str(mu5_floor),
            "x_bound": str(x_bound),
            "y_bound": str(y_bound),
            "k4": str(k4),
            "k6": str(k6),
            "minimum_F_order": int(minimum_F_order),
            "tF": str(tF),
            "l4": str(l4),
            "u4_break": str(u4_break),
            "u6_break": str(u6_break),
        },
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
