#!/usr/bin/env python3
"""Exact low-order D/F split probe using coefficientwise path floors."""

from __future__ import annotations

import itertools
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
from probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root import (
    adaptive_audit,
    power_to_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_low_order_F_split_path_floor_probe_root_20260825.json"
N_VALUE = 54
SMALL_F_MAX_ORDER = 37
COUPLED_F_ORDER_F6_SHADOW = False
COUPLED_F6_USE_COUPLED_ABOVE_ONE = False
COUPLED_F_ORDER_F4_RATIO = False
COUPLED_F4_USE_RATIO_ABOVE_SWITCH = False


def audit(polynomial: sp.Poly) -> dict[str, object]:
    degrees, tensor = power_to_bernstein_fast(polynomial)
    negative = sum(value < 0 for value in tensor.values())
    zero = sum(value == 0 for value in tensor.values())
    positive = sum(value > 0 for value in tensor.values())
    digest = hashlib.sha256()
    for index in sorted(tensor):
        digest.update((",".join(map(str, index)) + ":" + str(tensor[index]) + "\n").encode())
    corner_indices = itertools.product(*((0, degree) for degree in degrees))
    negative_vertices = sum(tensor[index] < 0 for index in corner_indices)
    minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
    result = {
        "power_terms": len(polynomial.terms()),
        "degrees": list(degrees),
        "coefficients": len(tensor),
        "negative": negative,
        "zero": zero,
        "positive": positive,
        "negative_vertices": negative_vertices,
        "minimum_index": list(minimum_index),
        "minimum": str(minimum),
        "ordered_sha256": digest.hexdigest().upper(),
    }
    if negative and not negative_vertices:
        result["adaptive"] = adaptive_audit(polynomial)
    return result


def main() -> None:
    endpoint, metadata = corner.new_leaf_corner(1, 3)
    N = sp.Integer(N_VALUE)
    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (N - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (N - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
    if COUPLED_F_ORDER_F6_SHADOW:
        # F=A-N[v] omits at least one vertex of D=A-v, so |F|<=N-1.
        # Keeping x=d5/d6 inside 6 f6 <= (|F|-5) f5 gives the sharper
        # coupled bound u6 <= (N-6)*x*u5/6, rather than maximizing x first.
        k6 = sp.cancel((N - 6) / mu5_floor)
    else:
        k6 = sp.cancel((N - 5) / mu5_floor)

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x = x_lower + (x_upper - x_lower) * X
    y = y_lower + (y_upper - y_lower) * Y

    large_min = sp.Integer(SMALL_F_MAX_ORDER + 1)
    tF = sp.cancel((large_min - 7) * (large_min - 8) / (large_min - 3))
    l4 = sp.cancel((N - 4) / tF)
    ratio_break = sp.cancel((1 - k4) / (l4 - k4))
    u6_break = sp.cancel(1 / k6)
    assert 0 < ratio_break < u6_break < 1

    small = sp.Integer(SMALL_F_MAX_ORDER)
    # Coefficientwise path minimality, extended from trees to forests by
    # adding component bridges, gives i_k(D)>=i_k(P_N)=C(N-k+1,k).
    d4_floor = math.comb(int(N - 3), 4)
    d5_floor = math.comb(int(N - 4), 5)
    d6_floor = math.comb(int(N - 5), 6)
    assert d4_floor > 0 and d5_floor > 0 and d6_floor > 0
    a4 = sp.Rational(math.comb(int(small), 4), d4_floor)
    a5 = sp.Rational(math.comb(int(small), 5), d5_floor)
    a6 = sp.Rational(math.comb(int(small), 6), d6_floor)
    small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    if COUPLED_F_ORDER_F6_SHADOW:
        small_k6 = sp.cancel((small - 5) * x_upper / 6)
        small_u6_break = sp.cancel(a6 / small_k6)
    else:
        small_u6_break = sp.cancel(a6 / k6)
    assert 0 < small_u6_break < a5

    large_scope = f"F_order_at_least_{int(large_min)}"
    small_scope = f"F_order_at_most_{int(small)}"
    specs = [
        (large_scope, "low", 0, ratio_break, "ratio", "shadow"),
        (
            large_scope, "middle", ratio_break, u6_break,
            "ratio" if COUPLED_F4_USE_RATIO_ABOVE_SWITCH else "missing",
            "shadow",
        ),
        (
            large_scope,
            "high",
            u6_break,
            1,
            "ratio" if COUPLED_F4_USE_RATIO_ABOVE_SWITCH else "missing",
            "shadow" if COUPLED_F6_USE_COUPLED_ABOVE_ONE else "free",
        ),
    ]
    small_breaks = {sp.Integer(0), a5, small_u6_break}
    if 0 < small_u4_break < a5:
        small_breaks.add(small_u4_break)
    ordered_small_breaks = sorted(small_breaks)
    for index, (lo, hi) in enumerate(zip(ordered_small_breaks, ordered_small_breaks[1:])):
        midpoint = (lo + hi) / 2
        u4_mode = "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
        u6_mode = "shadow" if k6 * midpoint <= a6 else "absolute"
        specs.append(
            (small_scope, f"interval_{index}", lo, hi, u4_mode, u6_mode)
        )
    rows = []
    for scope, region, lo, hi, u4_mode, u6_mode in specs:
        u5 = lo + (hi - lo) * S
        if u4_mode == "ratio":
            u4_upper = l4 * u5
        elif u4_mode == "missing":
            u4_upper = 1 - k4 * (1 - u5)
        else:
            u4_upper = a4
        u4 = u4_upper * V4
        if u6_mode == "shadow":
            if COUPLED_F_ORDER_F6_SHADOW:
                maximum_F_order = small if scope == small_scope else N - 1
                u6 = sp.cancel((maximum_F_order - 5) / 6) * x * u5 * V6
            else:
                u6 = k6 * u5 * V6
        elif u6_mode == "absolute":
            u6 = a6 * V6
        else:
            u6 = V6
        if u4_mode == "ratio" and COUPLED_F_ORDER_F4_RATIO:
            # Keep y=d4/d5 coupled: 5 f5/f4 >= mu4(F)>=tF, hence
            # f4 <= (5/tF) f5 = (5/tF)*x*u5.
            f4_value = sp.cancel(5 / tF) * x * u5 * V4
        else:
            f4_value = x * y * u4
        normalized = sp.expand(
            endpoint.subs(
                {
                    corner.leaf.d[6]: 1,
                    corner.leaf.d[5]: x,
                    corner.leaf.d[4]: x * y,
                    corner.leaf.f[6]: u6,
                    corner.leaf.f[5]: x * u5,
                    corner.leaf.f[4]: f4_value,
                },
                simultaneous=True,
            )
        )
        polynomial = sp.Poly(normalized, X, Y, S, V4, V6, domain=sp.QQ)
        result = audit(polynomial)
        rows.append(
            {
                "scope": scope,
                "region": region,
                "u5_interval": [str(lo), str(hi)],
                **result,
            }
        )
        print(
            scope, region, "NEG", result["negative"],
            "VERTEX_NEG", result["negative_vertices"],
            "ADAPTIVE", result.get("adaptive", {}).get("status"), flush=True,
        )
    payload = {
        "schema": "rank8-delta1-mask3-order54-F-order-split-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": N_VALUE,
        "endpoint_names": metadata["endpoint_names"],
        "ratio_bounds": {
            "x_d5_over_d6": [str(x_lower), str(x_upper)],
            "y_d4_over_d5": [str(y_lower), str(y_upper)],
            "k4": str(k4),
            "k6": str(k6),
        },
        "F_order_split": {
            "small_max": SMALL_F_MAX_ORDER,
            "large_min": SMALL_F_MAX_ORDER + 1,
            "large_mu4_floor": str(tF),
            "large_l4": str(l4),
            "small_absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
            "D_path_lower_d4_d5_d6": [d4_floor, d5_floor, d6_floor],
            "small_u4_switch": str(small_u4_break),
            "small_u6_switch": str(small_u6_break),
            "coupled_F_order_F6_shadow": COUPLED_F_ORDER_F6_SHADOW,
            "coupled_F6_used_above_one": COUPLED_F6_USE_COUPLED_ABOVE_ONE,
            "coupled_F_order_F4_ratio": COUPLED_F_ORDER_F4_RATIO,
            "coupled_F4_ratio_used_above_switch": COUPLED_F4_USE_RATIO_ABOVE_SWITCH,
        },
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
