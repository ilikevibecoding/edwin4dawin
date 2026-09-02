#!/usr/bin/env python3
"""Exact dyadic Bernstein refinement probe for the rank-7 G1 J4/E5 cone.

The frozen coarse probe uses one 3x3 tensor Bernstein net on [0,1]^2.
Negative Bernstein coefficients are not negative values.  This probe applies
exact de Casteljau subdivision until each subbox has a nonnegative net or an
exact negative dyadic corner is found.  It is exploratory: unresolved boxes
and negative relaxed values are reported fail-closed.
"""

from __future__ import annotations

from fractions import Fraction

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone


def split_curve(values):
    a, b, c = values
    middle = (a + 2 * b + c) / 4
    return (
        (a, (a + b) / 2, middle),
        (middle, (b + c) / 2, c),
    )


def split_axis(net, axis):
    left = [[None] * 3 for _ in range(3)]
    right = [[None] * 3 for _ in range(3)]
    if axis == 0:
        for column in range(3):
            lo, hi = split_curve(tuple(net[row][column] for row in range(3)))
            for row in range(3):
                left[row][column] = lo[row]
                right[row][column] = hi[row]
    else:
        for row in range(3):
            lo, hi = split_curve(tuple(net[row][column] for column in range(3)))
            left[row] = list(lo)
            right[row] = list(hi)
    return left, right


def dyadic_refine(controls, maximum_depth=18, maximum_boxes=2_000_000):
    net = [list(controls[3 * row:3 * row + 3]) for row in range(3)]
    # box=(net,s0,s1,t0,t1,depth); all endpoints are exact Fractions.
    stack = [(net, Fraction(0), Fraction(1), Fraction(0), Fraction(1), 0)]
    boxes = 0
    deepest = 0
    minimum_control = min(controls)
    while stack:
        current, s0, s1, t0, t1, depth = stack.pop()
        boxes += 1
        deepest = max(deepest, depth)
        local_minimum = min(value for row in current for value in row)
        minimum_control = min(minimum_control, local_minimum)
        if local_minimum >= 0:
            continue
        corners = (
            (current[0][0], s0, t0),
            (current[0][2], s0, t1),
            (current[2][0], s1, t0),
            (current[2][2], s1, t1),
        )
        negative = min(corners)
        if negative[0] < 0:
            return {
                "status": "negative_relaxed_value",
                "value": negative[0],
                "s": negative[1],
                "t": negative[2],
                "boxes": boxes,
                "depth": depth,
                "minimum_control": minimum_control,
            }
        if depth >= maximum_depth or boxes >= maximum_boxes:
            return {
                "status": "unresolved",
                "boxes": boxes,
                "depth": depth,
                "minimum_control": minimum_control,
                "box": (s0, s1, t0, t1),
            }
        # Alternate axes.  Exact tensor subdivision preserves the polynomial.
        axis = depth % 2
        first, second = split_axis(current, axis)
        if axis == 0:
            middle = (s0 + s1) / 2
            stack.append((second, middle, s1, t0, t1, depth + 1))
            stack.append((first, s0, middle, t0, t1, depth + 1))
        else:
            middle = (t0 + t1) / 2
            stack.append((second, s0, s1, middle, t1, depth + 1))
            stack.append((first, s0, s1, t0, middle, depth + 1))
    return {
        "status": "certified_nonnegative",
        "boxes": boxes,
        "depth": deepest,
        "minimum_control": minimum_control,
    }


def scan_order(order):
    counts = {
        "profiles": 0,
        "coarse": 0,
        "refined": 0,
        "negative": 0,
        "unresolved": 0,
        "boxes": 0,
        "max_depth": 0,
    }
    first_failure = None
    for raw in cone.partitions(order - 2):
        parts = tuple(raw)
        if parts[0] < 3 or sum(value >= 2 for value in parts) < 3:
            continue
        counts["profiles"] += 1
        value, degrees, controls, p4, jmax = cone.relaxed(order, parts)
        if value >= 0:
            counts["coarse"] += 1
            continue
        result = dyadic_refine(controls)
        counts["boxes"] += result["boxes"]
        counts["max_depth"] = max(counts["max_depth"], result["depth"])
        if result["status"] == "certified_nonnegative":
            counts["refined"] += 1
        elif result["status"] == "negative_relaxed_value":
            counts["negative"] += 1
            candidate = (
                result["value"], parts, result["s"], result["t"], p4, jmax
            )
            first_failure = (
                candidate
                if first_failure is None or candidate < first_failure
                else first_failure
            )
        else:
            counts["unresolved"] += 1
            if first_failure is None:
                first_failure = ("unresolved", parts, result)
    return counts, first_failure


def main():
    for order in range(11, 32):
        counts, failure = scan_order(order)
        print(order, counts, "FAILURE", failure, flush=True)


if __name__ == "__main__":
    main()
