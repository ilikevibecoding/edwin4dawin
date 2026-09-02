#!/usr/bin/env python3
"""Print minimal-case target Schur rows of grouped base kernels."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_target_rows import A, T, V, add, multiply, power, target_row
from probe_path_isolate_p4_group_finite_kernel_target_cone import evaluate_kernel
from probe_path_isolate_p4_group_grouped_tail_reciprocal_hcu import reciprocal, scale


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    c_value, m_value, x_value = 1, 3, 0
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            cap = 100
            base = {}
            for kernel in kernels:
                j = kernel["numerator_order"]
                source = evaluate_kernel(kernel, c_value, m_value, x_value, cap)
                source = multiply(source, power(V, maximum - j, cap), cap)
                base = add(base, scale(source, maximum - j + 1))
            exponent_a = 2 * c_value + m_value + x_value - 3
            exponent_t = 2 * m_value + parity - 4
            full = multiply(base, power(A, exponent_a, cap), cap)
            full = multiply(full, power(T, exponent_t, cap), cap)
            reversed_full, degree = reciprocal(full)
            offset = 5 if coordinate == "m" else 4
            original_target = m_value + maximum + offset
            target = degree - original_target
            row = [reversed_full.get((i, 2 * target - i), 0) for i in range(target + 1)]
            schur = []
            previous = 0
            for value in row:
                schur.append(value - previous)
                previous = value
            print(
                json.dumps(
                    {
                        "parity": parity,
                        "coordinate": coordinate,
                        "bidegree": degree,
                        "reciprocal_target": target,
                        "original_target_audit": target_row(full, original_target),
                        "edge_to_center_coefficients": row,
                        "schur_coefficients": schur,
                    }
                )
            )


if __name__ == "__main__":
    main()
