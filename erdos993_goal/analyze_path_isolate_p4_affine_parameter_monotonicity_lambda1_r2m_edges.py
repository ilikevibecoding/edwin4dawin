#!/usr/bin/env python3
"""Analyze top-edge reserve utilization at lambda=1 and r=2m."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    A,
    S,
    endpoint_sources,
    evaluate,
)
from probe_path_isolate_p4_affine_target_rows import multiply, power


W = {(1, 0): 1, (0, 1): 1, (1, 1): 1}


def audit(
    package: str, parity: int, coordinate: str, c_value: int,
    m_value: int, x_value: int,
) -> dict:
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
    edge = []
    for index in range(target + 1):
        base_value = base.get((index, target), 0)
        reserve_value = reserve.get((index, target), 0)
        combined = base_value + 2 * m_value * reserve_value
        if base_value or reserve_value:
            utilization = (
                Fraction(-base_value, 2 * m_value * reserve_value)
                if base_value < 0 and reserve_value > 0 else None
            )
            edge.append(
                {
                    "index": index,
                    "offset_from_corner": target - index,
                    "base": base_value,
                    "reserve": reserve_value,
                    "combined": combined,
                    "utilization": utilization,
                }
            )
    square_positions = set(base) | set(reserve)
    half_square_negatives = []
    full_square_negatives = []
    half_square_minimum = None
    square_utilizations = []
    for position in square_positions:
        base_value = base.get(position, 0)
        reserve_value = reserve.get(position, 0)
        half_value = base_value + m_value * reserve_value
        full_value = base_value + 2 * m_value * reserve_value
        half_square_minimum = (
            half_value if half_square_minimum is None
            else min(half_square_minimum, half_value)
        )
        if half_value < 0:
            half_square_negatives.append((position, half_value))
        if full_value < 0:
            full_square_negatives.append((position, full_value))
        if base_value < 0 and reserve_value > 0:
            square_utilizations.append(
                (Fraction(-base_value, m_value * reserve_value), position)
            )
    utilization_entries = [item for item in edge if item["utilization"] is not None]
    maximum_utilization = max(
        utilization_entries,
        key=lambda item: item["utilization"],
        default=None,
    )
    maximum_square_utilization = max(square_utilizations, default=None)
    combined_values = [item["combined"] for item in edge]
    half_combined_values = [
        item["base"] + m_value * item["reserve"] for item in edge
    ]
    log_concavity_failures = [
        edge[index]["index"]
        for index in range(1, len(edge) - 1)
        if combined_values[index] ** 2
        < combined_values[index - 1] * combined_values[index + 1]
    ]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": 2 * m_value,
        "target": target,
        "full_reserve_target_value": (
            base.get((target, target), 0)
            + 2 * m_value * reserve.get((target, target), 0)
        ),
        "half_reserve_target_value": (
            base.get((target, target), 0)
            + m_value * reserve.get((target, target), 0)
        ),
        "edge_support_start": edge[0]["index"],
        "edge_support_end": edge[-1]["index"],
        "edge_length": len(edge),
        "negative_combined_count": sum(item["combined"] < 0 for item in edge),
        "minimum_combined": min(combined_values),
        "half_reserve_negative_count": sum(
            value < 0 for value in half_combined_values
        ),
        "minimum_half_reserve_combined": min(half_combined_values),
        "full_square_negative_count": len(full_square_negatives),
        "half_reserve_square_negative_count": len(half_square_negatives),
        "minimum_half_reserve_square_value": half_square_minimum,
        "first_half_reserve_square_negatives": [
            {"position": list(position), "value": value}
            for position, value in half_square_negatives[:20]
        ],
        "maximum_square_m_reserve_utilization": (
            {
                "position": list(maximum_square_utilization[1]),
                "ratio_numerator": maximum_square_utilization[0].numerator,
                "ratio_denominator": maximum_square_utilization[0].denominator,
                "ratio_float": float(maximum_square_utilization[0]),
            }
            if maximum_square_utilization else None
        ),
        "negative_base_count": sum(item["base"] < 0 for item in edge),
        "reserve_nonpositive_count": sum(item["reserve"] <= 0 for item in edge),
        "maximum_utilization": (
            {
                "index": maximum_utilization["index"],
                "offset_from_corner": maximum_utilization["offset_from_corner"],
                "ratio_numerator": maximum_utilization["utilization"].numerator,
                "ratio_denominator": maximum_utilization["utilization"].denominator,
                "ratio_float": float(maximum_utilization["utilization"]),
            }
            if maximum_utilization else None
        ),
        "ordinary_log_concavity_failure_count": len(log_concavity_failures),
        "ordinary_log_concavity_first_failures": log_concavity_failures[:20],
    }


def main() -> None:
    records = []
    for m_value in (12, 24, 48):
        x_value = 2 * m_value
        records.append(audit("group", 0, "m", 1, m_value, x_value))
        print(records[-1], flush=True)
        records.append(audit("bottom", 1, "x", 0, m_value, x_value))
        print(records[-1], flush=True)
    report = {
        "status": "PASS_FINITE_LAMBDA1_R2M_EDGES"
        if all(not record["negative_combined_count"] for record in records)
        else "FAIL",
        "records": records,
        "warning": "Finite exact edge sequences only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lambda1_"
        "r2m_edges_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
