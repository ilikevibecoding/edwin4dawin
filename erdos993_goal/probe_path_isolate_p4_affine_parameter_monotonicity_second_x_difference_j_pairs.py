#!/usr/bin/env python3
"""Test reflected V-layers for the second aligned x-difference."""

from __future__ import annotations

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


def second_core(case):
    package, parity, coordinate, c_value, m_value, x_value = case
    next_case = (package, parity, coordinate, c_value, m_value, x_value + 1)
    current = aligned_core(case, "x", 40)
    following = aligned_core(next_case, "x", 40)
    result = multiply(A, following, 50)
    add_weighted(result, current, -1)
    return result


def audit(case):
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
    core = second_core(case)
    core_degree = max(max(position) for position in core)
    full_degree = a + 2 * b + r + core_degree
    lower = 3 * m_value + 5 + int(coordinate == "m")
    at_power = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    records = []
    total_negative_count = 0
    for j in range(m_value + 1):
        pair = {}
        for reflected in {j, r - j}:
            factor = shifted(one_plus_power(r - reflected, 1), reflected, 0)
            factor = multiply(at_power, factor, full_degree)
            layer = multiply(core, factor, full_degree)
            add_weighted(pair, layer, 1)
        negatives = {
            position: value for position, value in pair.items()
            if position[0] >= lower and position[1] >= lower and value < 0
        }
        total_negative_count += len(negatives)
        records.append({"j": j, "negative_count": len(negatives)})
        print(package, j, len(negatives), flush=True)
    return {
        "case": list(case),
        "quadrant_lower": lower,
        "negative_pair_coefficient_count": total_negative_count,
        "pair_records": records,
    }


def main():
    cases = [
        ("group", 0, "m", 1, 24, 48),
        ("bottom", 1, "x", 0, 24, 48),
    ]
    records = [audit(case) for case in cases]
    status = (
        "PASS_FINITE_SECOND_X_DIFFERENCE_J_PAIRS"
        if all(not record["negative_pair_coefficient_count"] for record in records)
        else "FAIL"
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "second_x_difference_j_pairs_probe_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
