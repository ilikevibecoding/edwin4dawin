#!/usr/bin/env python3
"""Test cumulative central reflected blocks for aligned parameter cores."""

from __future__ import annotations

import argparse
import json
import math
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
    def layer(j):
        factor = shifted(one_plus_power(r - j, 1), j, 0)
        factor = multiply(at_power, factor, full_degree)
        return multiply(core, factor, full_degree)
    cumulative = {}
    records = []
    entry_width = None
    for width in range(m_value + 1):
        added = {}
        if width == 0:
            weight = math.comb(r, m_value)
            add_weighted(
                added,
                layer(m_value),
                weight,
            )
        else:
            weight = math.comb(r, m_value - width)
            add_weighted(added, layer(m_value - width), weight)
            add_weighted(added, layer(m_value + width), weight)
        add_weighted(cumulative, added, 1)
        added_negatives = {
            position: value for position, value in added.items()
            if position[0] >= lower and position[1] >= lower and value < 0
        }
        negatives = {
            position: value for position, value in cumulative.items()
            if position[0] >= lower and position[1] >= lower and value < 0
        }
        if not negatives and entry_width is None:
            entry_width = width
        records.append({
            "central_half_width": width,
            "j_range": [m_value - width, m_value + width],
            "added_pair_negative_count": len(added_negatives),
            "negative_count": len(negatives),
            "first_negatives": [
                {"position": list(position), "value": value}
                for position, value in list(negatives.items())[:10]
            ],
        })
        print(package, direction, width, len(negatives), flush=True)
        if entry_width is not None:
            break
    return {
        "case": list(case),
        "ambient_direction": direction,
        "quadrant_lower": lower,
        "first_nonnegative_central_half_width": entry_width,
        "uses_exact_binomial_weights": True,
        "records": records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", type=int, nargs="+", default=[24])
    parser.add_argument("--directions", nargs="+", choices=("x", "m"), default=["x", "m"])
    parser.add_argument(
        "--packages",
        nargs="+",
        choices=("group", "bottom"),
        default=["group", "bottom"],
    )
    args = parser.parse_args()
    cases = []
    for m_value in args.m_values:
        if "group" in args.packages:
            cases.append(("group", 0, "m", 1, m_value, 2 * m_value))
        if "bottom" in args.packages:
            cases.append(("bottom", 1, "x", 0, m_value, 2 * m_value))
    records = []
    for case in cases:
        for direction in args.directions:
            record = audit(case, direction)
            records.append(record)
            print(
                case[0], direction,
                record["first_nonnegative_central_half_width"],
                flush=True,
            )
    report = {"status": "PROBE", "records": records}
    suffix = "_".join(str(value) for value in args.m_values)
    direction_suffix = "_".join(args.directions)
    package_suffix = "_".join(args.packages)
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"aligned_core_central_blocks_m{suffix}_{package_suffix}_{direction_suffix}_"
        "probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
