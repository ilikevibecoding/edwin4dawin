#!/usr/bin/env python3
"""Test coefficientwise j <-> 2m-j reflection pairing for aligned cores."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_r2m_original_layer_positivity import (
    add_weighted,
    one_plus_power,
    shifted,
)
from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power


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
    core = aligned_core(case, direction, 40)
    core_degree = max(max(position) for position in core)
    full_degree = a + 2 * b + r + core_degree
    lower = (
        3 * (m_value + int(direction == "m"))
        + 5
        + int(coordinate == "m")
    )
    at_power = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    layers = []
    for j in range(r + 1):
        factor = shifted(one_plus_power(r - j, 1), j, 0)
        factor = multiply(at_power, factor, full_degree)
        layers.append(multiply(core, factor, full_degree))
    pair_records = []
    total_negative_pairs = 0
    negative_positions = set()
    for j in range(m_value + 1):
        paired = dict(layers[j])
        if j != r - j:
            add_weighted(paired, layers[r - j], 1)
        negatives = {
            position: value for position, value in paired.items()
            if position[0] >= lower and position[1] >= lower and value < 0
        }
        total_negative_pairs += len(negatives)
        negative_positions.update(negatives)
        pair_records.append({
            "j": j,
            "reflected_j": r - j,
            "negative_count": len(negatives),
            "first_negatives": [
                {"position": list(position), "value": value}
                for position, value in list(negatives.items())[:10]
            ],
        })
        print(package, direction, j, len(negatives), flush=True)
    return {
        "case": list(case),
        "ambient_direction": direction,
        "a": a,
        "b": b,
        "r": r,
        "core_degree": core_degree,
        "full_degree": full_degree,
        "quadrant_lower": lower,
        "pair_count": len(pair_records),
        "negative_pair_coefficient_count": total_negative_pairs,
        "position_with_negative_pair_count": len(negative_positions),
        "pair_records": pair_records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all-boundary", action="store_true")
    parser.add_argument("--far", action="store_true")
    args = parser.parse_args()
    if args.all_boundary and args.far:
        raise ValueError("choose at most one mode")
    if args.all_boundary:
        cases = []
        for parity in (0, 1):
            for coordinate in ("x", "c", "m"):
                cases.append(("group", parity, coordinate, 1, 3, 0))
            for coordinate in ("x", "m"):
                cases.append(("bottom", parity, coordinate, 0, 3, 0))
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_j_reflection_pairs_all_boundary_probe_20260802.json"
        )
    elif args.far:
        cases = [
            ("group", 0, "m", 1, 24, 48),
            ("bottom", 1, "x", 0, 24, 48),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_j_reflection_pairs_far_probe_20260802.json"
        )
    else:
        cases = [
            ("group", 0, "m", 1, 12, 24),
            ("bottom", 1, "x", 0, 12, 24),
            ("group", 0, "m", 1, 12, 0),
            ("bottom", 1, "x", 0, 12, 0),
        ]
        output_name = (
            "path_isolate_p4_affine_parameter_monotonicity_"
            "aligned_core_j_reflection_pairs_probe_20260802.json"
        )
    records = []
    for case in cases:
        directions = ("x", "c", "m") if case[0] == "group" else ("x", "m")
        for direction in directions:
            record = audit(case, direction)
            records.append(record)
            print(
                case[0], case[5], direction,
                record["negative_pair_coefficient_count"],
                flush=True,
            )
    report = {
        "status": "PASS_FINITE_J_REFLECTION_PAIRS"
        if all(not record["negative_pair_coefficient_count"] for record in records)
        else "FAIL",
        "records": records,
        "warning": "Finite exact parameter points only.",
    }
    Path(output_name).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(report["status"])


if __name__ == "__main__":
    main()
