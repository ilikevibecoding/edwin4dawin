#!/usr/bin/env python3
"""Test diagonal-polarization certificates for B+rP grouped kernels."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    add,
    load_kernel,
    multiply_v,
    shift_parameters,
)


def diagonal_layers(source, r_power: int):
    result = {}
    for (pz, pw, pc, pm, px), value in source.items():
        key = (pz + pw, pc, pm, px, r_power)
        result[key] = result.get(key, 0) + value
    return {key: value for key, value in result.items() if value}


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            p_kernel = {}
            base_kernel = {}
            for record in kernels:
                order = record["numerator_order"]
                value = multiply_v(load_kernel(record), maximum - order)
                p_kernel = add(p_kernel, value)
                base_kernel = add(base_kernel, value, maximum - order + 1)
            p_kernel = shift_parameters(p_kernel, 1, 3)
            base_kernel = shift_parameters(base_kernel, 1, 3)
            base_diagonal = diagonal_layers(base_kernel, 0)
            p_diagonal = diagonal_layers(p_kernel, 1)
            p_diagonal_without_r = {
                (degree, pc, pm, px, 0): value
                for (degree, pc, pm, px, _), value in p_diagonal.items()
            }
            r1_diagonal = dict(base_diagonal)
            for key, value in p_diagonal_without_r.items():
                r1_diagonal[key] = r1_diagonal.get(key, 0) + value
                if r1_diagonal[key] == 0:
                    del r1_diagonal[key]
            combined = dict(base_diagonal)
            for key, value in p_diagonal.items():
                combined[key] = combined.get(key, 0) + value
            negative_base = [
                (key, value) for key, value in base_diagonal.items() if value < 0
            ]
            negative_p = [
                (key, value) for key, value in p_diagonal.items() if value < 0
            ]
            negative_combined = [
                (key, value) for key, value in combined.items() if value < 0
            ]
            negative_r1 = [
                (key, value) for key, value in r1_diagonal.items() if value < 0
            ]
            records.append(
                {
                    "parity_epsilon": parity,
                    "coordinate": coordinate,
                    "base_diagonal_term_count": len(base_diagonal),
                    "P_diagonal_term_count": len(p_diagonal),
                    "combined_diagonal_term_count": len(combined),
                    "negative_base_diagonal_coefficient_count": len(negative_base),
                    "negative_P_diagonal_coefficient_count": len(negative_p),
                    "negative_combined_diagonal_coefficient_count": len(
                        negative_combined
                    ),
                    "negative_r_equals_1_diagonal_coefficient_count": len(
                        negative_r1
                    ),
                    "first_negative_base": [
                        {"degree_C_M_x_r": list(key), "coefficient": value}
                        for key, value in negative_base[:20]
                    ],
                    "first_negative_P": [
                        {"degree_C_M_x_r": list(key), "coefficient": value}
                        for key, value in negative_p[:20]
                    ],
                }
            )
    report = {"status": "ANALYSIS", "records": records}
    Path(
        "path_isolate_p4_group_combined_diagonal_polarization_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
