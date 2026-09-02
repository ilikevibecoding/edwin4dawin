#!/usr/bin/env python3
"""Exact coupled-F Delta1 mask-3 probe with large-F y subdivisions."""

from __future__ import annotations

import hashlib
import itertools
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
OUTPUT = HERE / "rank8_delta1_mask3_coupled_F_y_slabs_probe_root_20260825.json"
N_VALUE = 50
SMALL_F_MAX_ORDER = 33
LARGE_Y_SLABS = 4


def audit(polynomial: sp.Poly) -> dict[str, object]:
    degrees, tensor = power_to_bernstein_fast(polynomial)
    negative = sum(value < 0 for value in tensor.values())
    zero = sum(value == 0 for value in tensor.values())
    positive = sum(value > 0 for value in tensor.values())
    digest = hashlib.sha256()
    for index in sorted(tensor):
        digest.update(
            (",".join(map(str, index)) + ":" + str(tensor[index]) + "\n").encode()
        )
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
    small = sp.Integer(SMALL_F_MAX_ORDER)
    large_min = small + 1
    assert LARGE_Y_SLABS >= 1

    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (N - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (N - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x = x_lower + (x_upper - x_lower) * X
    tF = sp.cancel((large_min - 7) * (large_min - 8) / (large_min - 3))

    rows = []
    large_slab_metadata = []
    for slab in range(LARGE_Y_SLABS):
        normalized_lo = sp.Rational(slab, LARGE_Y_SLABS)
        normalized_hi = sp.Rational(slab + 1, LARGE_Y_SLABS)
        y_slab_lower = y_lower + (y_upper - y_lower) * normalized_lo
        y = y_lower + (y_upper - y_lower) * (
            normalized_lo + (normalized_hi - normalized_lo) * Y
        )
        l4 = sp.cancel(5 / (tF * y_slab_lower))
        ratio_break = sp.cancel((1 - k4) / (l4 - k4))
        assert 0 < ratio_break < 1
        large_slab_metadata.append(
            {
                "slab": slab,
                "normalized_y_interval": [str(normalized_lo), str(normalized_hi)],
                "actual_y_lower": str(y_slab_lower),
                "large_l4": str(l4),
                "u5_ratio_switch": str(ratio_break),
            }
        )
        for region, lo, hi, u4_mode in (
            ("ratio", sp.Integer(0), ratio_break, "ratio"),
            ("missing", ratio_break, sp.Integer(1), "missing"),
        ):
            u5 = lo + (hi - lo) * S
            if u4_mode == "ratio":
                # 5f5/f4>=mu4(F)>=tF, retaining x=d5/d6.
                f4_value = sp.cancel(5 / tF) * x * u5 * V4
            else:
                u4 = (1 - k4 * (1 - u5)) * V4
                f4_value = x * y * u4
            # |F|<=N-1 and 6f6<=(|F|-5)f5, retaining x=d5/d6.
            f6_value = sp.cancel((N - 6) / 6) * x * u5 * V6
            expression = sp.expand(
                endpoint.subs(
                    {
                        corner.leaf.d[6]: 1,
                        corner.leaf.d[5]: x,
                        corner.leaf.d[4]: x * y,
                        corner.leaf.f[6]: f6_value,
                        corner.leaf.f[5]: x * u5,
                        corner.leaf.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            result = audit(sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ))
            rows.append(
                {
                    "scope": f"F_order_at_least_{int(large_min)}",
                    "region": f"y_slab_{slab}_{region}",
                    "normalized_y_interval": [str(normalized_lo), str(normalized_hi)],
                    "u5_interval": [str(lo), str(hi)],
                    **result,
                }
            )
            print(
                "LARGE", slab, region, "NEG", result["negative"],
                "VERTEX_NEG", result["negative_vertices"], flush=True,
            )

    # Small-F side: binomial ceilings divided by coefficientwise path floors.
    y = y_lower + (y_upper - y_lower) * Y
    d4_floor = math.comb(int(N - 3), 4)
    d5_floor = math.comb(int(N - 4), 5)
    d6_floor = math.comb(int(N - 5), 6)
    a4 = sp.Rational(math.comb(int(small), 4), d4_floor)
    a5 = sp.Rational(math.comb(int(small), 5), d5_floor)
    a6 = sp.Rational(math.comb(int(small), 6), d6_floor)
    small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    small_k6 = sp.cancel((small - 5) * x_upper / 6)
    small_u6_break = sp.cancel(a6 / small_k6)
    assert 0 < small_u6_break < a5
    breaks = {sp.Integer(0), a5, small_u6_break}
    if 0 < small_u4_break < a5:
        breaks.add(small_u4_break)
    ordered_breaks = sorted(breaks)
    for index, (lo, hi) in enumerate(zip(ordered_breaks, ordered_breaks[1:])):
        midpoint = (lo + hi) / 2
        u4_mode = "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
        # This conservative selector uses the large-F worst multiplier; either
        # selected upper bound remains valid on the whole interval.
        large_k6 = sp.cancel((N - 6) / mu5_floor)
        u6_mode = "shadow" if large_k6 * midpoint <= a6 else "absolute"
        u5 = lo + (hi - lo) * S
        if u4_mode == "missing":
            u4 = (1 - k4 * (1 - u5)) * V4
        else:
            u4 = a4 * V4
        if u6_mode == "shadow":
            f6_value = sp.cancel((small - 5) / 6) * x * u5 * V6
        else:
            f6_value = a6 * V6
        expression = sp.expand(
            endpoint.subs(
                {
                    corner.leaf.d[6]: 1,
                    corner.leaf.d[5]: x,
                    corner.leaf.d[4]: x * y,
                    corner.leaf.f[6]: f6_value,
                    corner.leaf.f[5]: x * u5,
                    corner.leaf.f[4]: x * y * u4,
                },
                simultaneous=True,
            )
        )
        result = audit(sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ))
        rows.append(
            {
                "scope": f"F_order_at_most_{int(small)}",
                "region": f"interval_{index}",
                "normalized_y_interval": ["0", "1"],
                "u5_interval": [str(lo), str(hi)],
                "u4_mode": u4_mode,
                "u6_mode": u6_mode,
                **result,
            }
        )
        print(
            "SMALL", index, u4_mode, u6_mode, "NEG", result["negative"],
            "VERTEX_NEG", result["negative_vertices"], flush=True,
        )

    payload = {
        "schema": "rank8-delta1-mask3-coupled-F-y-slabs-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "D_order": N_VALUE,
        "endpoint_names": metadata["endpoint_names"],
        "ratio_bounds": {
            "x_d5_over_d6": [str(x_lower), str(x_upper)],
            "y_d4_over_d5": [str(y_lower), str(y_upper)],
            "k4": str(k4),
        },
        "F_order_split": {
            "small_max": SMALL_F_MAX_ORDER,
            "large_min": SMALL_F_MAX_ORDER + 1,
            "large_mu4_floor": str(tF),
            "large_y_slabs": LARGE_Y_SLABS,
            "large_slab_metadata": large_slab_metadata,
            "small_absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
            "D_path_lower_d4_d5_d6": [d4_floor, d5_floor, d6_floor],
            "small_u4_switch": str(small_u4_break),
            "small_u6_switch": str(small_u6_break),
        },
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
