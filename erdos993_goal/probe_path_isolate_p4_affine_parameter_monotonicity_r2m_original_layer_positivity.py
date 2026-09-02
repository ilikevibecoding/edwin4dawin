#!/usr/bin/env python3
"""Test one-axis positivity of the original r=2m half-reserve quadrant."""

from __future__ import annotations

import argparse
import functools
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from probe_path_isolate_p4_affine_target_rows import A, T, V, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


@functools.cache
def one_plus_power(exponent: int, variable: int):
    return {
        (index, 0) if variable == 0 else (0, index): math.comb(exponent, index)
        for index in range(exponent + 1)
    }


def shifted(source, dz: int, dw: int):
    return {(i + dz, j + dw): value for (i, j), value in source.items()}


def quadrant_negatives(source, lower):
    return {
        position: value
        for position, value in source.items()
        if position[0] >= lower and position[1] >= lower and value < 0
    }


def add_weighted(target, source, weight):
    for position, value in source.items():
        updated = target.get(position, 0) + weight * value
        if updated:
            target[position] = updated
        elif position in target:
            del target[position]


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value = case
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    source = to_sparse(d_expression + m_value * reserve_expression)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    source_degree = max(max(monomial[0], monomial[1]) for monomial in source)
    full_degree = a + 2 * b + r + source_degree
    lower = 3 * m_value + 5 + int(coordinate == "m")
    numeric_source = evaluate(source, c_value, m_value, x_value, full_degree)

    v_power = power(V, r, full_degree)
    k_total = {}
    k_negative_positions = set()
    k_negative_layer_coefficients = 0
    for k in range(b + 1):
        factor = shifted(
            multiply(
                one_plus_power(a + k, 0),
                one_plus_power(a + b - k, 1),
                full_degree,
            ),
            k,
            b - k,
        )
        factor = multiply(factor, v_power, full_degree)
        layer = multiply(numeric_source, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        k_negative_layer_coefficients += len(negatives)
        k_negative_positions.update(negatives)
        add_weighted(k_total, layer, math.comb(b, k))
        print(package, "k", k, len(negatives), flush=True)

    at_power = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    j_total = {}
    j_negative_positions = set()
    j_negative_layer_coefficients = 0
    for j in range(r + 1):
        factor = shifted(one_plus_power(r - j, 1), j, 0)
        factor = multiply(at_power, factor, full_degree)
        layer = multiply(numeric_source, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        j_negative_layer_coefficients += len(negatives)
        j_negative_positions.update(negatives)
        add_weighted(j_total, layer, math.comb(r, j))
        print(package, "j", j, len(negatives), flush=True)

    positions = {
        position for position in set(k_total) | set(j_total)
        if position[0] >= lower and position[1] >= lower
    }
    reconstruction_failures = [
        position for position in positions
        if k_total.get(position, 0) != j_total.get(position, 0)
    ]
    total_negatives = [
        position for position in positions if k_total.get(position, 0) < 0
    ]
    both_axis_obstructions = k_negative_positions & j_negative_positions
    obstruction_offsets = [
        (i - lower, j - lower) for i, j in both_axis_obstructions
    ]
    return {
        "case": list(case),
        "a": a,
        "b": b,
        "r": r,
        "source_degree": source_degree,
        "full_degree": full_degree,
        "quadrant_lower": lower,
        "quadrant_position_count": len(positions),
        "total_negative_count": len(total_negatives),
        "reconstruction_failure_count": len(reconstruction_failures),
        "k_negative_layer_coefficient_count": k_negative_layer_coefficients,
        "k_position_with_negative_layer_count": len(k_negative_positions),
        "j_negative_layer_coefficient_count": j_negative_layer_coefficients,
        "j_position_with_negative_layer_count": len(j_negative_positions),
        "position_obstructed_on_both_axes_count": len(both_axis_obstructions),
        "maximum_obstruction_offset_sum": max(
            (i + j for i, j in obstruction_offsets), default=None
        ),
        "maximum_obstruction_coordinate_offset": max(
            (max(i, j) for i, j in obstruction_offsets), default=None
        ),
        "both_axis_obstruction_offsets": [
            list(item) for item in sorted(obstruction_offsets)
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--next-rays", action="store_true")
    args = parser.parse_args()
    if args.next_rays:
        cases = [
            ("group", 0, "m", 1, 9, 18),
            ("bottom", 1, "x", 0, 9, 18),
            ("group", 0, "m", 1, 15, 30),
            ("bottom", 1, "x", 0, 15, 30),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_r2m_"
            "original_layer_positivity_next_rays_probe_20260802.json"
        )
    else:
        cases = [
            ("group", 0, "m", 1, 3, 0),
            ("bottom", 1, "x", 0, 3, 0),
            ("group", 0, "m", 1, 6, 12),
            ("bottom", 1, "x", 0, 6, 12),
            ("group", 0, "m", 1, 12, 24),
            ("bottom", 1, "x", 0, 12, 24),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_r2m_"
            "original_layer_positivity_probe_20260802.json"
        )
    records = []
    for case in cases:
        record = audit(case)
        records.append(record)
        print(json.dumps(record, indent=2), flush=True)
    report = {"status": "PROBE", "records": records}
    Path(output_name).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
