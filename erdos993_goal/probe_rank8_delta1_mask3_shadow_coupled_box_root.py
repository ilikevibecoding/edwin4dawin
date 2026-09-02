#!/usr/bin/env python3
"""Diagnostic Bernstein test of two cross-rank shadow constraints for mask 3."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_new_leaf_normalized_containment_box_root as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_shadow_coupled_box_probe_root_20260825.json"


def main() -> None:
    numerator, metadata = base.corners_once()[3]
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    original_variables = base.VARIABLES
    rows = []
    for order in range(171, 181):
        order_value = sp.Integer(order)
        x_bound = sp.cancel(
            6 * order_value / (order_value**2 - 15 * order_value + 10)
        )
        y_bound = sp.cancel(
            5 * order_value / (order_value**2 - 12 * order_value + 8)
        )
        k4 = sp.cancel(4 / ((order_value - 4) * y_bound))
        k6 = sp.cancel((order_value - 5) * x_bound / 6)
        for region in ("low_u5", "high_u5"):
            if region == "low_u5":
                u5 = S / k6
                u6 = S * V6
            else:
                u5 = 1 / k6 + (1 - 1 / k6) * S
                u6 = V6
            u4_upper = 1 - k4 * (1 - u5)
            u4 = u4_upper * V4
            normalized = sp.expand(
                numerator.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x_bound * X,
                        base.corner.leaf.d[4]: x_bound * y_bound * X * Y,
                        base.corner.leaf.f[6]: u6,
                        base.corner.leaf.f[5]: x_bound * X * u5,
                        base.corner.leaf.f[4]: x_bound * y_bound * X * Y * u4,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
            saved = base.VARIABLES
            base.VARIABLES = (X, Y, S, V4, V6)
            try:
                result = base.bernstein(polynomial)
                vertices = base.vertex_audit(normalized)
            finally:
                base.VARIABLES = saved
            rows.append(
                {
                    "order_N": order,
                    "d5_over_d6_upper": str(x_bound),
                    "d4_over_d5_upper": str(y_bound),
                    "k4": str(k4),
                    "k6": str(k6),
                    "region": region,
                    "u5": str(u5),
                    "u6": str(u6),
                    "u4": str(u4),
                    "normalized_power_terms": len(polynomial.terms()),
                    "bernstein": result,
                    "vertices": vertices,
                }
            )
            print(
                "N", order, "REGION", region,
                "NEG", result["negative"], "MIN", result["minimum"],
                "VERTEX_NEG", vertices["negative"],
                "VERTEX_MIN_AT", vertices["minimum_vertex"], flush=True,
            )
    payload = {
        "schema": "rank8-delta1-mask3-shadow-coupled-box-probe-v1",
        "status": (
            "PASS_DIAGNOSTIC_EXACT_MASK3_ON_SHADOW_COUPLED_ENCLOSURE"
            if all(row["bernstein"]["negative"] == 0 for row in rows)
            else "OPEN_BERNSTEIN_NEGATIVE_SHADOW_COUPLED_ENCLOSURE"
        ),
        "endpoint_names": metadata["endpoint_names"],
        "constraints": {
            "missing_shadow": "4(d5-f5)<=(N-4)(d4-f4)",
            "internal_shadow": "6f6<=(N-5)f5",
            "order_dependent_consequences": [
                "U4<=1-k4(N)(1-U5), k4(N)=4/((N-4)y_upper(N))",
                "U6<=k6(N)U5, k6(N)=((N-5)/6)x_upper(N)",
            ],
        },
        "regions": rows,
        "warning": (
            "This is a diagnostic until the two combinatorial inequalities, their "
            "N-uniform constants, the endpoint construction, and this Bernstein "
            "transform receive an independent fail-closed audit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
