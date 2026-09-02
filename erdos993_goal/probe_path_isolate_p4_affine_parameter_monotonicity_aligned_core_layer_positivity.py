#!/usr/bin/env python3
"""Test one-axis positivity of the finite-core aligned parameter recurrences."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_r2m_original_layer_positivity import (
    add_weighted,
    one_plus_power,
    quadrant_negatives,
    shifted,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from probe_path_isolate_p4_affine_target_rows import A, T, V, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def numeric_source(case, cap):
    package, parity, coordinate, c_value, m_value, x_value = case
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    base = evaluate(to_sparse(d_expression), c_value, m_value, x_value, cap)
    reserve = evaluate(
        to_sparse(reserve_expression), c_value, m_value, x_value, cap
    )
    add_weighted(base, reserve, m_value)
    return base


def aligned_core(case, direction, cap):
    package, parity, coordinate, c_value, m_value, x_value = case
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
    old = numeric_source(case, cap)
    new = numeric_source(new_case, cap)
    if direction == "x":
        positive_factor = A
        old_shift = 0
    elif direction == "c":
        positive_factor = power(A, 2, cap)
        old_shift = 0
    else:
        positive_factor = multiply(
            multiply(A, power(T, 2, cap), cap), power(V, 2, cap), cap
        )
        old_shift = 3
    core = multiply(new, positive_factor, cap)
    add_weighted(core, shifted(old, old_shift, old_shift), -1)
    return core


def audit(case, direction):
    package, parity, coordinate, c_value, m_value, x_value = case
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    # The source bidegrees are at most 31 after the largest alignment factor.
    core = aligned_core(case, direction, 40)
    core_degree = max(max(position) for position in core)
    full_degree = a + 2 * b + r + core_degree
    # Rebuild without the temporary cap if a future source exceeds it.
    if core_degree >= 40:
        core = aligned_core(case, direction, core_degree + 10)
        core_degree = max(max(position) for position in core)
        full_degree = a + 2 * b + r + core_degree
    lower = (
        3 * (m_value + int(direction == "m"))
        + 5
        + int(coordinate == "m")
    )

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
        layer = multiply(core, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        k_negative_layer_coefficients += len(negatives)
        k_negative_positions.update(negatives)
        add_weighted(k_total, layer, math.comb(b, k))

    at_power = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    j_total = {}
    j_negative_positions = set()
    j_negative_layer_coefficients = 0
    for j in range(r + 1):
        factor = shifted(one_plus_power(r - j, 1), j, 0)
        factor = multiply(at_power, factor, full_degree)
        layer = multiply(core, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        j_negative_layer_coefficients += len(negatives)
        j_negative_positions.update(negatives)
        add_weighted(j_total, layer, math.comb(r, j))

    positions = {
        position for position in set(k_total) | set(j_total)
        if position[0] >= lower and position[1] >= lower
    }
    total_negatives = [
        position for position in positions if k_total.get(position, 0) < 0
    ]
    reconstruction_failures = [
        position for position in positions
        if k_total.get(position, 0) != j_total.get(position, 0)
    ]
    both = k_negative_positions & j_negative_positions
    return {
        "case": list(case),
        "ambient_direction": direction,
        "a": a,
        "b": b,
        "r": r,
        "core_degree": core_degree,
        "full_degree": full_degree,
        "quadrant_lower": lower,
        "total_negative_count": len(total_negatives),
        "reconstruction_failure_count": len(reconstruction_failures),
        "k_negative_layer_coefficient_count": k_negative_layer_coefficients,
        "k_position_with_negative_layer_count": len(k_negative_positions),
        "j_negative_layer_coefficient_count": j_negative_layer_coefficients,
        "j_position_with_negative_layer_count": len(j_negative_positions),
        "position_obstructed_on_both_axes_count": len(both),
        "both_axis_obstruction_offsets": [
            [i - lower, j - lower] for i, j in sorted(both)
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--next-rays", action="store_true")
    parser.add_argument("--minimal-boundary", action="store_true")
    args = parser.parse_args()
    if args.next_rays and args.minimal_boundary:
        raise ValueError("choose at most one mode")
    if args.minimal_boundary:
        cases = [
            ("group", 0, "m", 1, 12, 0),
            ("bottom", 1, "x", 0, 12, 0),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_layer_positivity_minimal_boundary_probe_20260802.json"
        )
    elif args.next_rays:
        cases = [
            ("group", 0, "m", 1, 9, 18),
            ("bottom", 1, "x", 0, 9, 18),
            ("group", 0, "m", 1, 15, 30),
            ("bottom", 1, "x", 0, 15, 30),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_layer_positivity_next_rays_probe_20260802.json"
        )
    else:
        cases = [
            ("group", 0, "m", 1, 12, 24),
            ("bottom", 1, "x", 0, 12, 24),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_layer_positivity_probe_20260802.json"
        )
    records = []
    for case in cases:
        if args.next_rays:
            directions = ("x", "m")
        elif case[0] == "group":
            directions = ("x", "c", "m")
        else:
            directions = ("x", "m")
        for direction in directions:
            record = audit(case, direction)
            records.append(record)
            print(json.dumps(record, indent=2), flush=True)
    report = {"status": "PROBE", "records": records}
    Path(output_name).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
