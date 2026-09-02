#!/usr/bin/env python3
"""Test the second aligned x-difference on the protected NE quadrant."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_r2m_original_layer_positivity import (
    add_weighted,
)
from probe_path_isolate_p4_affine_target_rows import A, T, V, multiply, power


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value = case
    next_case = (package, parity, coordinate, c_value, m_value, x_value + 1)
    current = aligned_core(case, "x", 40)
    following = aligned_core(next_case, "x", 40)
    core_slope = dict(following)
    add_weighted(core_slope, current, -1)
    second_core = multiply(A, following, 50)
    add_weighted(second_core, current, -1)

    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    core_degree = max(max(position) for position in second_core)
    full_degree = a + 2 * b + r + core_degree
    outer = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    outer = multiply(outer, power(V, r, full_degree), full_degree)
    full = multiply(outer, second_core, full_degree)
    full_slope = multiply(outer, core_slope, full_degree)
    lower = 3 * m_value + 5 + int(coordinate == "m")
    protected_negatives = {
        position: value for position, value in full.items()
        if position[0] >= lower and position[1] >= lower and value < 0
    }
    global_negatives = {
        position: value for position, value in full.items() if value < 0
    }
    slope_protected_negatives = {
        position: value for position, value in full_slope.items()
        if position[0] >= lower and position[1] >= lower and value < 0
    }
    slope_global_negatives = {
        position: value for position, value in full_slope.items() if value < 0
    }
    return {
        "case": list(case),
        "quadrant_lower": lower,
        "second_core_term_count": len(second_core),
        "global_negative_count": len(global_negatives),
        "protected_negative_count": len(protected_negatives),
        "core_slope_global_negative_count": sum(value < 0 for value in core_slope.values()),
        "full_slope_global_negative_count": len(slope_global_negatives),
        "full_slope_protected_negative_count": len(slope_protected_negatives),
        "first_protected_negatives": [
            {"position": list(position), "value": value}
            for position, value in list(protected_negatives.items())[:20]
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", type=int, nargs="+", default=[3, 6, 12, 18, 24])
    parser.add_argument("--x-values", type=int, nargs="+", default=[0])
    args = parser.parse_args()
    records = []
    for m_value in args.m_values:
        for x_value in args.x_values:
            for case in (
                ("group", 0, "m", 1, m_value, x_value),
                ("bottom", 1, "x", 0, m_value, x_value),
            ):
                record = audit(case)
                records.append(record)
                print(
                    case[0], m_value, x_value,
                    record["protected_negative_count"],
                    flush=True,
                )
    status = (
        "PASS_FINITE_SECOND_X_DIFFERENCE"
        if all(not record["protected_negative_count"] for record in records)
        else "FAIL"
    )
    report = {"status": status, "records": records, "warning": "Finite exact evidence only."}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "second_x_difference_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)


if __name__ == "__main__":
    main()
