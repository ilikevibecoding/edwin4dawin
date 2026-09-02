#!/usr/bin/env python3
"""Stress exact central coefficients of grouped base and full tails."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from probe_path_isolate_p4_affine_target_rows import A, T, V, add, multiply, power
from probe_path_isolate_p4_group_finite_kernel_target_cone import evaluate_kernel
from probe_path_isolate_p4_group_grouped_tail_reciprocal_hcu import scale


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    parameter_points = [
        (1, 3, 0),
        (1, 3, 4),
        (1, 3, 12),
        (1, 3, 24),
        (1, 12, 0),
        (1, 12, 24),
        (4, 7, 0),
        (4, 7, 12),
        (8, 3, 0),
        (8, 3, 24),
    ]
    records = []
    failures = []
    negative_counts = {"base": 0, "combined": 0}
    worst_compensation = None
    smallest_combined = None
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            for c_value, m_value, x_value in parameter_points:
                exponent_a = 2 * c_value + m_value + x_value - 3
                exponent_t = 2 * m_value + parity - 4
                offset = 5 if coordinate == "m" else 4
                maximum_target = m_value + maximum + 60 + offset
                p_kernel = {}
                base_kernel = {}
                for kernel in kernels:
                    j = kernel["numerator_order"]
                    source = evaluate_kernel(
                        kernel, c_value, m_value, x_value, maximum_target
                    )
                    source = multiply(
                        source,
                        power(V, maximum - j, maximum_target),
                        maximum_target,
                    )
                    p_kernel = add(p_kernel, source)
                    base_kernel = add(
                        base_kernel, scale(source, maximum - j + 1)
                    )
                for factor, exponent in ((A, exponent_a), (T, exponent_t)):
                    factor_power = power(factor, exponent, maximum_target)
                    p_kernel = multiply(p_kernel, factor_power, maximum_target)
                    base_kernel = multiply(
                        base_kernel, factor_power, maximum_target
                    )
                elevated_p = p_kernel
                elevated_base = base_kernel
                last_nonzero = -1
                minimum = None
                for tail in range(61):
                    order = maximum + tail
                    target = m_value + order + offset
                    base_value = elevated_base.get((target, target), 0)
                    p_value = elevated_p.get((target, target), 0)
                    values = {
                        "base": base_value,
                        "combined": base_value + tail * p_value,
                    }
                    combined_value = values["combined"]
                    combined_record = {
                        "parity": parity,
                        "coordinate": coordinate,
                        "c": c_value,
                        "m": m_value,
                        "x": x_value,
                        "tail": tail,
                        "base": base_value,
                        "P": p_value,
                        "combined": combined_value,
                    }
                    if (
                        smallest_combined is None
                        or combined_value < smallest_combined["combined"]
                    ):
                        smallest_combined = combined_record
                    if base_value < 0 and p_value > 0 and tail > 0:
                        required_fraction = Fraction(-base_value, tail * p_value)
                        if (
                            worst_compensation is None
                            or required_fraction
                            > Fraction(
                                worst_compensation["required_fraction_numerator"],
                                worst_compensation["required_fraction_denominator"],
                            )
                        ):
                            worst_compensation = {
                                **combined_record,
                                "required_fraction_numerator": required_fraction.numerator,
                                "required_fraction_denominator": required_fraction.denominator,
                                "required_fraction_decimal": float(required_fraction),
                            }
                    for kind, value in values.items():
                        if value < 0:
                            negative_counts[kind] += 1
                            failures.append(
                                {
                                    "parity": parity,
                                    "coordinate": coordinate,
                                    "c": c_value,
                                    "m": m_value,
                                    "x": x_value,
                                    "tail": tail,
                                    "kind": kind,
                                    "value": value,
                                }
                            )
                    if values["base"] or values["combined"]:
                        last_nonzero = tail
                    positive_values = [value for value in values.values() if value > 0]
                    if positive_values:
                        local_minimum = min(positive_values)
                        if minimum is None or local_minimum < minimum:
                            minimum = local_minimum
                    elevated_p = multiply(elevated_p, V, maximum_target)
                    elevated_base = multiply(
                        elevated_base, V, maximum_target
                    )
                records.append(
                    {
                        "parity": parity,
                        "coordinate": coordinate,
                        "c": c_value,
                        "m": m_value,
                        "x": x_value,
                        "tail_range": [0, 60],
                        "last_nonzero_tail": last_nonzero,
                        "smallest_positive_value": minimum,
                    }
                )
                print(parity, coordinate, c_value, m_value, x_value, flush=True)
    report = {
        "status": "PROBE",
        "case_count": len(records) * 61 * 2,
        "parameter_point_count": len(parameter_points),
        "negative_count": len(failures),
        "negative_counts_by_kind": negative_counts,
        "smallest_combined_record": smallest_combined,
        "worst_negative_base_compensation_record": worst_compensation,
        "first_failures": failures[:30],
        "records": records,
    }
    Path("path_isolate_p4_group_base_central_tail_range_probe_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
