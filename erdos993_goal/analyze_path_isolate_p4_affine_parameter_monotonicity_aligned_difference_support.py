#!/usr/bin/env python3
"""Map where the globally signed aligned recurrence escapes its protected square."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    A,
    S,
    add_scaled,
    endpoint_sources,
    evaluate,
)
from probe_path_isolate_p4_affine_target_rows import multiply, power


W = {(1, 0): 1, (0, 1): 1, (1, 1): 1}


def parameters(package, coordinate, c_value, m_value, x_value):
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value - 4
        if package == "group" else 2 * m_value - 5
    )
    # Parity is added by the caller.
    return a, b


def build(package, parity, coordinate, c_value, m_value, x_value):
    base_source, reserve_source, kernel_degree = endpoint_sources(
        package, parity, coordinate, 1, 1
    )
    a, b0 = parameters(package, coordinate, c_value, m_value, x_value)
    b = b0 + parity
    protected_target = a + 2 * b + kernel_degree - (
        m_value + 5 + int(coordinate == "m")
    )
    full_target = a + 2 * b + 2 * m_value + kernel_degree
    base = evaluate(base_source, c_value, m_value, x_value, full_target)
    reserve = evaluate(reserve_source, c_value, m_value, x_value, full_target)
    for factor, exponent in ((A, a), (S, b), (W, 2 * m_value)):
        factor_power = power(factor, exponent, full_target)
        base = multiply(base, factor_power, full_target)
        reserve = multiply(reserve, factor_power, full_target)
    return add_scaled(base, reserve, m_value), protected_target, full_target


def audit(case, direction):
    package, parity, coordinate, c_value, m_value, x_value = case
    old, old_target, old_full = build(*case)
    new_parameters = {
        "c": c_value + int(direction == "c"),
        "m": m_value + int(direction == "m"),
        "x": x_value + int(direction == "x"),
    }
    new_case = (
        package,
        parity,
        coordinate,
        new_parameters["c"],
        new_parameters["m"],
        new_parameters["x"],
    )
    new, new_target, new_full = build(*new_case)
    growth = {"x": 1, "c": 2, "m": 4}[direction]
    assert new_target - old_target == growth
    # For m-growth the full bidegree grows by seven, while the protected
    # target grows by four.  The recurrence is aligned to the protected
    # target, so no equality of the full degrees is expected.
    positions = set(new) | {
        (i + growth, j + growth) for i, j in old
    }
    negatives = []
    for i, j in positions:
        value = new.get((i, j), 0) - old.get((i - growth, j - growth), 0)
        if value < 0:
            negatives.append((i, j, value))
    inside = [item for item in negatives if item[0] <= new_target and item[1] <= new_target]
    one_side = [
        item for item in negatives
        if (item[0] <= new_target) != (item[1] <= new_target)
    ]
    both = [item for item in negatives if item[0] > new_target and item[1] > new_target]
    min_excess = min(
        (max(i - new_target, j - new_target) for i, j, _ in negatives),
        default=None,
    )
    min_sum_excess = min(
        (i + j - 2 * new_target for i, j, _ in negatives),
        default=None,
    )
    return {
        "direction": direction,
        "new_target": new_target,
        "new_full_target": new_full,
        "negative_count": len(negatives),
        "inside_count": len(inside),
        "one_side_count": len(one_side),
        "both_sides_count": len(both),
        "minimum_max_coordinate_excess": min_excess,
        "minimum_sum_excess": min_sum_excess,
        "first_by_sum": [
            {"position": [i, j], "value": value}
            for i, j, value in sorted(negatives, key=lambda item: (item[0] + item[1], item[0]))[:20]
        ],
    }


def main():
    cases = [
        ("group", 0, "m", 1, 3, 0),
        ("bottom", 1, "x", 0, 3, 0),
        ("group", 0, "m", 1, 6, 12),
        ("bottom", 1, "x", 0, 6, 12),
        ("group", 0, "m", 1, 12, 24),
        ("bottom", 1, "x", 0, 12, 24),
    ]
    records = []
    for case in cases:
        directions = ("x", "m", "c") if case[0] == "group" else ("x", "m")
        result = {
            "case": list(case),
            "directions": [audit(case, direction) for direction in directions],
        }
        records.append(result)
        print(
            case[0],
            [(item["direction"], item["negative_count"], item["inside_count"],
              item["one_side_count"], item["both_sides_count"],
              item["minimum_sum_excess"])
             for item in result["directions"]],
            flush=True,
        )
    report = {
        "status": "PASS_PROTECTED_SUPPORT"
        if all(not item["inside_count"] for record in records for item in record["directions"])
        else "FAIL",
        "records": records,
        "warning": "Finite exact support map only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_aligned_"
        "difference_support_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
