#!/usr/bin/env python3
"""Diagnose and strengthen the unresolved |D|=45, |F|<=30 branch."""

from __future__ import annotations

import itertools
import math

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base
from probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root import (
    power_to_bernstein_fast,
)


def audit_with_vertices(polynomial: sp.Poly) -> dict[str, object]:
    degrees, tensor = power_to_bernstein_fast(polynomial)
    corners = list(itertools.product(*((0, degree) for degree in degrees)))
    negative_corners = [
        {"index": list(index), "value": str(tensor[index])}
        for index in corners
        if tensor[index] < 0
    ]
    minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
    return {
        "degrees": list(degrees),
        "coefficients": len(tensor),
        "negative": sum(value < 0 for value in tensor.values()),
        "negative_vertices": negative_corners,
        "minimum_index": list(minimum_index),
        "minimum": str(minimum),
    }


def main() -> None:
    endpoint, _ = base.corner.new_leaf_corner(1, 3)
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
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x = x_lower + (x_upper - x_lower) * X
    y = y_lower + (y_upper - y_lower) * Y

    # Here |F|=|E(D)|: deleting v leaves deg(v) components in D, so both
    # quantities equal |D|-deg(v).  A union bound over the M edges of D gives
    # i_k(D) >= C(N,k)-M*C(N-2,k-2), much sharper than the path floor when
    # M is small.
    d4_floor = math.comb(n_value, 4) - small_value * math.comb(n_value - 2, 2)
    d5_floor = math.comb(n_value, 5) - small_value * math.comb(n_value - 2, 3)
    d6_floor = math.comb(n_value, 6) - small_value * math.comb(n_value - 2, 4)
    a4 = sp.Rational(math.comb(small_value, 4), d4_floor)
    a5 = sp.Rational(math.comb(small_value, 5), d5_floor)
    a6 = sp.Rational(math.comb(small_value, 6), d6_floor)
    b4 = sp.Rational(math.comb(small_value, 4), d6_floor)
    b5 = sp.Rational(math.comb(small_value, 5), d6_floor)
    b6 = a6
    small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    small_k6 = sp.cancel((small - 5) * x_upper / 6)
    small_u6_break = sp.cancel(a6 / small_k6)
    breaks = {sp.Integer(0), a5, small_u6_break}
    if 0 < small_u4_break < a5:
        breaks.add(small_u4_break)
    ordered_breaks = sorted(breaks)
    large_k6 = sp.cancel((n - 6) / mu5_floor)

    print("BOUNDS", {
        "x": (x_lower, x_upper), "y": (y_lower, y_upper),
        "a4": a4, "a5": a5, "a6": a6,
        "b4": b4, "b5": b5, "b6": b6,
        "u4_break": small_u4_break, "u6_break": small_u6_break,
        "breaks": ordered_breaks, "edge_count_floors": (d4_floor, d5_floor, d6_floor),
    })
    for index, (lo, hi) in enumerate(zip(ordered_breaks, ordered_breaks[1:])):
        midpoint = (lo + hi) / 2
        current_u4_mode = (
            "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
        )
        u6_mode = "shadow" if large_k6 * midpoint <= a6 else "absolute"
        u5 = lo + (hi - lo) * S
        f6_value = (
            sp.cancel((small - 5) / 6) * x * u5 * V6
            if u6_mode == "shadow"
            else a6 * V6
        )
        candidates = {
            "current": (
                x * y * (
                    (1 - k4 * (1 - u5))
                    if current_u4_mode == "missing"
                    else a4
                ) * V4
            ),
            "exact_missing": (
                (x * y - sp.Rational(4, n_value - 4) * x * (1 - u5)) * V4
            ),
            "direct_f4": b4 * V4,
        }
        for mode, f4_value in candidates.items():
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
            result = audit_with_vertices(
                sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            )
            print(
                "RESULT", index, str(lo), str(hi), current_u4_mode,
                u6_mode, mode, result,
            )

    # Test the boundary M=30 as an exact-F slice.  Here the forest ratio
    # f4 <= (5/mu4(F)) f5 removes the spurious f5=0<f4 corner admitted by
    # the coarse small-F box.
    m = sp.Integer(small_value)
    mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
    y_breaks = tuple(
        sp.Rational(value)
        for value in (
            0, sp.Rational(1, 4), sp.Rational(1, 2), sp.Rational(3, 4),
            sp.Rational(7, 8), sp.Rational(15, 16), sp.Rational(31, 32),
            sp.Rational(63, 64), 1,
        )
    )
    for y_lo, y_hi in zip(y_breaks, y_breaks[1:]):
        y_slab_lower = y_lower + (y_upper - y_lower) * y_lo
        y_slab = y_lower + (y_upper - y_lower) * (
            y_lo + (y_hi - y_lo) * Y
        )
        l4 = sp.cancel(5 / (mu4_f_floor * y_slab_lower))
        ratio_break = sp.cancel((1 - k4) / (l4 - k4))
        for region, lo, hi in (
            ("ratio", sp.Integer(0), ratio_break),
            ("missing", ratio_break, sp.Integer(1)),
        ):
            u5 = lo + (hi - lo) * S
            f4_value = (
                sp.cancel(5 / mu4_f_floor) * x * u5 * V4
                if region == "ratio"
                else x * y_slab * (1 - k4 * (1 - u5)) * V4
            )
            f6_value = sp.cancel((m - 5) / 6) * x * u5 * V6
            expression = sp.expand(
                endpoint.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x,
                        base.corner.leaf.d[4]: x * y_slab,
                        base.corner.leaf.f[6]: f6_value,
                        base.corner.leaf.f[5]: x * u5,
                        base.corner.leaf.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            result = audit_with_vertices(
                sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            )
            print(
                "EXACT30", str(y_lo), str(y_hi), region,
                str(ratio_break), result,
            )


if __name__ == "__main__":
    main()
