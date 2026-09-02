#!/usr/bin/env python3
"""Exact scaled-ratio Bernstein probe for Delta1 mask 3.

The common scale T=N0/N preserves the fact that d5/d6 and d4/d5 shrink
together as the residual order grows.  This avoids the impossible mixed-scale
vertices admitted by a zero-lower independent ratio box.
"""

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
OUTPUT = HERE / "rank8_delta1_mask3_scaled_static_shadow_box_probe_root_20260825.json"
CUTOFF = 54
INCLUDE_DEGREE12_SCOPE = False


def tensor_record(polynomial: sp.Poly) -> dict[str, object]:
    degrees, tensor = power_to_bernstein_fast(polynomial)
    corner_indices = itertools.product(*((0, degree) for degree in degrees))
    negative_vertices = sum(tensor[index] < 0 for index in corner_indices)
    minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
    negative = sum(value < 0 for value in tensor.values())
    record = {
        "power_terms": len(polynomial.terms()),
        "degrees": list(degrees),
        "coefficients": len(tensor),
        "negative": negative,
        "negative_vertices": negative_vertices,
        "minimum_index": list(minimum_index),
        "minimum": str(minimum),
    }
    if negative and not negative_vertices:
        record["adaptive"] = adaptive_audit(polynomial)
    return record


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    coordinates = (
        corner.leaf.d[4], corner.leaf.d[5], corner.leaf.d[6],
        corner.leaf.f[4], corner.leaf.f[5], corner.leaf.f[6],
    )
    endpoint_poly = sp.Poly(endpoint, *coordinates, domain=sp.QQ)
    N = sp.Integer(CUTOFF)
    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    scaled_x_upper = sp.cancel(N * 6 / mu5_floor)
    scaled_y_upper = sp.cancel(N * 5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
    k6 = sp.cancel((N - 5) / mu5_floor)
    minimum_F_order = N - 12
    tF = sp.cancel(
        (minimum_F_order - 7) * (minimum_F_order - 8)
        / (minimum_F_order - 3)
    )
    l4 = sp.cancel((N - 4) / tF)

    T, X, Y, S, V4, V6 = sp.symbols("T X Y S V4 V6", nonnegative=True)
    x_lower = sp.cancel(6 * T / (N - 5 * T))
    x_upper = sp.cancel(T * scaled_x_upper / N)
    y_lower = sp.cancel(5 * T / (N - 4 * T))
    y_upper = sp.cancel(T * scaled_y_upper / N)
    x = sp.cancel(x_lower + (x_upper - x_lower) * X)
    y = sp.cancel(y_lower + (y_upper - y_lower) * Y)
    x_numerator, x_denominator = sp.fraction(x)
    y_numerator, y_denominator = sp.fraction(y)
    if x_denominator.subs(T, 0) < 0:
        x_numerator, x_denominator = -x_numerator, -x_denominator
    if y_denominator.subs(T, 0) < 0:
        y_numerator, y_denominator = -y_numerator, -y_denominator
    assert x_denominator.subs(T, 1) > 0
    assert y_denominator.subs(T, 1) > 0
    endpoint_terms = endpoint_poly.terms()
    maximum_x_power = max(
        powers[0] + powers[1] + powers[3] + powers[4]
        for powers, _ in endpoint_terms
    )
    maximum_y_power = max(
        powers[0] + powers[3] for powers, _ in endpoint_terms
    )

    specs = []
    global_break = sp.cancel(1 / k6)
    specs.extend(
        [
            ("global", "low", 0, global_break, "missing", "coupled"),
            ("global", "high", global_break, 1, "missing", "free"),
        ]
    )
    degree12_break = sp.cancel((1 - k4) / (l4 - k4))
    if INCLUDE_DEGREE12_SCOPE:
        specs.extend(
            [
                ("degree_at_most_12", "low", 0, degree12_break, "ratio", "coupled"),
                (
                    "degree_at_most_12", "middle", degree12_break, global_break,
                    "missing", "coupled",
                ),
                (
                    "degree_at_most_12", "high", global_break, 1,
                    "missing", "free",
                ),
            ]
        )

    rows = []
    for scope, region, lo, hi, u4_mode, u6_mode in specs:
        u5 = lo + (hi - lo) * S
        u4_upper = l4 * u5 if u4_mode == "ratio" else 1 - k4 * (1 - u5)
        u4 = u4_upper * V4
        u6 = k6 * u5 * V6 if u6_mode == "coupled" else V6
        cleared_terms = []
        for powers, coefficient in endpoint_terms:
            d4_power, d5_power, _, f4_power, f5_power, f6_power = powers
            x_power = d4_power + d5_power + f4_power + f5_power
            y_power = d4_power + f4_power
            cleared_terms.append(
                coefficient
                * x_numerator**x_power
                * x_denominator**(maximum_x_power - x_power)
                * y_numerator**y_power
                * y_denominator**(maximum_y_power - y_power)
                * u4**f4_power
                * u5**f5_power
                * u6**f6_power
            )
        numerator = sp.expand(sum(cleared_terms, sp.Integer(0)))
        denominator = sp.factor(
            x_denominator**maximum_x_power
            * y_denominator**maximum_y_power
        )
        raw_poly = sp.Poly(numerator, T, X, Y, S, V4, V6, domain=sp.QQ)
        minimum_T_power = min(monomial[0] for monomial, _ in raw_poly.terms())
        reduced = sp.cancel(numerator / T**minimum_T_power)
        polynomial = sp.Poly(reduced, T, X, Y, S, V4, V6, domain=sp.QQ)
        result = tensor_record(polynomial)
        rows.append(
            {
                "scope": scope,
                "region": region,
                "u5_interval": [str(lo), str(hi)],
                "minimum_common_scale_power_removed": minimum_T_power,
                "positive_denominator": str(sp.factor(denominator)),
                **result,
            }
        )
        print(
            "SCOPE", scope, "REGION", region,
            "TERMS", result["power_terms"], "DEGREES", result["degrees"],
            "NEG", result["negative"], "VERTEX_NEG", result["negative_vertices"],
            "ADAPTIVE", result.get("adaptive", {}).get("status"),
            flush=True,
        )

    payload = {
        "schema": "rank8-delta1-mask3-scaled-static-shadow-box-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "cutoff_D_order": CUTOFF,
        "endpoint_names": metadata["endpoint_names"],
        "constants": {
            "mu4_floor": str(mu4_floor),
            "mu5_floor": str(mu5_floor),
            "scaled_x_interval": ["6", str(scaled_x_upper)],
            "scaled_y_interval": ["5", str(scaled_y_upper)],
            "k4": str(k4),
            "k6": str(k6),
            "minimum_F_order_for_degree12_scope": int(minimum_F_order),
            "tF": str(tF),
            "l4": str(l4),
            "global_u5_break": str(global_break),
            "degree12_u5_break": str(degree12_break),
        },
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
