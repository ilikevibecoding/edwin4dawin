#!/usr/bin/env python3
"""Exact corner diagnostic combining ratio transfer and D/F shadows."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_combined_shadow_vertices_probe_root_20260825.json"


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    coordinates = (
        corner.leaf.d[4], corner.leaf.d[5], corner.leaf.d[6],
        corner.leaf.f[4], corner.leaf.f[5], corner.leaf.f[6],
    )
    polynomial = sp.Poly(endpoint, *coordinates, domain=sp.QQ)

    def evaluate(values: tuple[sp.Expr, ...]) -> sp.Expr:
        total = sp.Integer(0)
        for powers, coefficient in polynomial.terms():
            term = coefficient
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return sp.cancel(total)

    rows = []
    for order in range(26, 101):
        N = sp.Integer(order)
        mu4_min = sp.cancel((N - 7) * (N - 8) / (N - 3))
        # Uniform constants valid throughout the ratio box.
        k4 = sp.cancel(4 * mu4_min / (5 * (N - 4)))
        mu5_floor = sp.cancel(mu4_min - 3 + 2 / mu4_min)
        k6 = sp.cancel((N - 5) / mu5_floor)
        minimum_F_order = N - 12
        tF = sp.cancel((minimum_F_order - 7) * (minimum_F_order - 8) / (minimum_F_order - 3))
        l4 = sp.cancel((N - 4) / tF)
        u4_break = sp.cancel((1 - k4) / (l4 - k4))
        u6_break = sp.cancel(1 / k6)
        assert 0 < u4_break < u6_break < 1

        specs = (
            ("low", 0, u4_break, "ratio", "coupled"),
            ("middle", u4_break, u6_break, "missing", "coupled"),
            ("high", u6_break, 1, "missing", "free"),
        )
        for ratio_mode in ("coupled", "independent", "static_zero_lower"):
          for region, lo, hi, u4_mode, u6_mode in specs:
            negative = []
            zero = 0
            minimum = None
            minimum_corner = None
            for a, b, s, v4, v6 in itertools.product((0, 1), repeat=5):
                if ratio_mode == "static_zero_lower":
                    x = sp.Integer(0) if b == 0 else sp.cancel(6 / mu5_floor)
                    y = sp.Integer(0) if a == 0 else sp.cancel(5 / mu4_min)
                else:
                    mu4 = mu4_min if a == 0 else N - 4
                    mu5_lower = (
                        sp.cancel(mu4 - 3 + 2 / mu4)
                        if ratio_mode == "coupled"
                        else mu5_floor
                    )
                    mu5 = mu5_lower if b == 0 else N - 5
                    x = sp.cancel(6 / mu5)
                    y = sp.cancel(5 / mu4)
                u5 = lo if s == 0 else hi
                u4_upper = l4 * u5 if u4_mode == "ratio" else 1 - k4 * (1 - u5)
                u4 = u4_upper * v4
                u6 = k6 * u5 * v6 if u6_mode == "coupled" else sp.Integer(v6)
                value = evaluate((x * y, x, 1, x * y * u4, x * u5, u6))
                vertex = (a, b, s, v4, v6)
                if minimum is None or value < minimum:
                    minimum = value
                    minimum_corner = vertex
                if value < 0:
                    negative.append({"corner": list(vertex), "value": str(value)})
                elif value == 0:
                    zero += 1
            row = {
                "order_N": order,
                "ratio_mode": ratio_mode,
                "region": region,
                "mu4_min": str(mu4_min),
                "mu5_floor": str(mu5_floor),
                "k4": str(k4),
                "k6": str(k6),
                "tF": str(tF),
                "l4": str(l4),
                "u5_interval": [str(lo), str(hi)],
                "negative_vertices": negative,
                "zero_vertices": zero,
                "minimum_corner": list(minimum_corner),
                "minimum": str(minimum),
            }
            rows.append(row)
            print(
                "N", order, ratio_mode, region,
                "NEG", len(negative), "MIN", minimum, flush=True,
            )
    payload = {
        "schema": "rank8-delta1-mask3-combined-shadow-vertices-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "endpoint_names": metadata["endpoint_names"],
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
