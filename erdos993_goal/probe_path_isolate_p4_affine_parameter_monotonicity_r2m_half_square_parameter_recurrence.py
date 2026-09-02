#!/usr/bin/env python3
"""Test square-aligned parameter recurrences for B+mP at r=2m."""

from __future__ import annotations

import functools
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


@functools.cache
def build_square(
    package: str, parity: int, coordinate: str,
    c_value: int, m_value: int, x_value: int,
):
    base_source, reserve_source, kernel_degree = endpoint_sources(
        package, parity, coordinate, 1, 1
    )
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    target = a + 2 * b + kernel_degree - (
        m_value + 5 + int(coordinate == "m")
    )
    base = evaluate(base_source, c_value, m_value, x_value, target)
    reserve = evaluate(reserve_source, c_value, m_value, x_value, target)
    for factor, exponent in ((A, a), (S, b), (W, 2 * m_value)):
        factor_power = power(factor, exponent, target)
        base = multiply(base, factor_power, target)
        reserve = multiply(reserve, factor_power, target)
    return add_scaled(base, reserve, m_value), target


def audit_direction(
    package: str, parity: int, coordinate: str,
    c_value: int, m_value: int, x_value: int, direction: str,
) -> dict:
    old, old_target = build_square(
        package, parity, coordinate, c_value, m_value, x_value
    )
    new_parameters = {
        "c": c_value + int(direction == "c"),
        "m": m_value + int(direction == "m"),
        "x": x_value + int(direction == "x"),
    }
    new, new_target = build_square(
        package, parity, coordinate,
        new_parameters["c"], new_parameters["m"], new_parameters["x"],
    )
    target_growth = {"x": 1, "c": 2, "m": 4}[direction]
    assert new_target - old_target == target_growth
    negatives = []
    minimum = None
    for i in range(new_target + 1):
        for j in range(new_target + 1):
            value = new.get((i, j), 0) - old.get(
                (i - target_growth, j - target_growth), 0
            )
            if minimum is None or value < minimum["value"]:
                minimum = {"position": [i, j], "value": value}
            if value < 0:
                negatives.append({"position": [i, j], "value": value})
    return {
        "direction": direction,
        "old_target": old_target,
        "new_target": new_target,
        "negative_count": len(negatives),
        "minimum": minimum,
        "first_negatives": negatives[:20],
    }


def main() -> None:
    requested = [
        ("group", 0, "m", 1, 12, 24),
        ("bottom", 1, "x", 0, 12, 24),
        ("group", 0, "m", 1, 24, 48),
        ("bottom", 1, "x", 0, 24, 48),
    ]
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            requested.append(("group", parity, coordinate, 1, 3, 0))
        for coordinate in ("x", "m"):
            requested.append(("bottom", parity, coordinate, 0, 3, 0))
    records = []
    for case in requested:
        package = case[0]
        directions = ("x", "m", "c") if package == "group" else ("x", "m")
        audits = [audit_direction(*case, direction) for direction in directions]
        record = {
            "package": package,
            "parity": case[1],
            "coordinate": case[2],
            "c": case[3] if package == "group" else None,
            "m": case[4],
            "x": case[5],
            "directions": audits,
        }
        records.append(record)
        print(
            package,
            [(item["direction"], item["negative_count"], item["minimum"])
             for item in audits], flush=True,
        )
    failures = [
        item for record in records for item in record["directions"]
        if item["negative_count"]
    ]
    report = {
        "status": "PASS_FINITE_ALIGNED_HALF_SQUARE_RECURRENCE"
        if not failures else "FAIL",
        "failure_count": len(failures),
        "records": records,
        "warning": "Finite exact parameter points only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_r2m_"
        "half_square_parameter_recurrence_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
