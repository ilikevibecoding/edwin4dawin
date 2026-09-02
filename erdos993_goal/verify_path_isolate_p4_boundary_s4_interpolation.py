#!/usr/bin/env python3
"""Verify the recovered s=4 Newton formula outside its interpolation grid."""

from __future__ import annotations

import json
import math
import random
from fractions import Fraction
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def evaluate_newton(
    coefficients: list[dict],
    c_value: int,
    m_value: int,
    x_value: int,
) -> Fraction:
    total = Fraction(0)
    for item in coefficients:
        order_c, order_m, order_x = item["orders_c_m_x"]
        total += (
            Fraction(item["numerator"], item["denominator"])
            * math.comb(c_value, order_c)
            * math.comb(m_value, order_m)
            * math.comb(x_value, order_x)
        )
    return total


def denominator_product(m_value: int, parity: int) -> int:
    first = 1 if parity == 0 else 2
    return math.prod(m_value + shift for shift in range(first, 10))


def main() -> None:
    source = json.loads(
        Path(
            "path_isolate_p4_boundary_s4_newton_"
            "interpolation_20260730.json"
        ).read_text(encoding="utf-8")
    )
    generator = random.Random(993_20260730)
    cases = []
    failures = []
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    try:
        for report in source["reports"]:
            parity = report["parity_epsilon"]
            degree_c, degree_m, degree_x = report[
                "claimed_degree_c_m_x"
            ]
            for _ in range(25):
                # Every coordinate lies beyond its interpolation grid.
                c_value = generator.randint(
                    degree_c + 2, degree_c + 20
                )
                m_value = generator.randint(
                    degree_m + 2, degree_m + 20
                )
                x_value = generator.randint(
                    degree_x + 2, degree_x + 20
                )
                predicted_numerator = evaluate_newton(
                    report["coefficients"],
                    c_value,
                    m_value,
                    x_value,
                )
                predicted = predicted_numerator / (
                    denominator_product(m_value, parity)
                )
                actual = Fraction(
                    internal_group(
                        c_value,
                        m_value + 1,
                        4,
                        x_value,
                        parity,
                    )
                    - internal_group(
                        c_value,
                        m_value,
                        4,
                        x_value,
                        parity,
                    ),
                    math.comb(2 * m_value + parity, m_value),
                )
                record = {
                    "parity_epsilon": parity,
                    "c": c_value,
                    "m": m_value,
                    "x": x_value,
                    "difference_numerator": (
                        predicted - actual
                    ).numerator,
                    "difference_denominator": (
                        predicted - actual
                    ).denominator,
                }
                cases.append(record)
                if predicted != actual:
                    failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOUNDARY_S4_"
            "INTERPOLATION_EXTERNAL_VALIDATION"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_BOUNDARY_S4_"
            "INTERPOLATION_EXTERNAL_VALIDATION"
        ),
        "case_count": len(cases),
        "all_coordinates_beyond_interpolation_grid": True,
        "failure_count": len(failures),
        "cases": cases,
        "first_failures": failures[:20],
        "warning": (
            "External evaluations validate the recovered formula; "
            "the fixed-support degree bound makes the interpolation "
            "certificate exhaustive."
        ),
    }
    Path(
        "path_isolate_p4_boundary_s4_interpolation_"
        "external_validation_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
