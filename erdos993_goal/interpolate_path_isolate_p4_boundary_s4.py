#!/usr/bin/env python3
"""Recover the s=4 boundary residual in a positive Newton basis.

For each parity, multiply the normalized residual by its known
positive m-denominator product.  The result is a polynomial in
c,m,x.  Exact grid values determine its tensor Newton expansion

  sum a_ijk binom(c,i) binom(m,j) binom(x,k).

Nonnegative a_ijk give a positivity certificate on all nonnegative
integer parameters.  One extra grid layer is included in every
coordinate to audit the stated degree bounds.
"""

from __future__ import annotations

import json
import math
import functools
import argparse
from fractions import Fraction
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


DISTANCE = 4


def degree_bounds(distance: int, parity: int) -> tuple[int, int, int]:
    if parity == 0:
        return (
            2 * distance + 4,
            3 * distance + 7,
            2 * distance + 2,
        )
    return (
        2 * distance + 3,
        3 * distance + 5,
        2 * distance + 1,
    )


def denominator_product(m_value: int, parity: int) -> int:
    first = 1 if parity == 0 else 2
    return math.prod(
        m_value + shift
        for shift in range(first, DISTANCE + 6)
    )


def normalized_residual(
    c_value: int,
    m_value: int,
    x_value: int,
    parity: int,
) -> Fraction:
    difference = cached_group(
        c_value, m_value + 1, x_value, parity
    ) - cached_group(c_value, m_value, x_value, parity)
    central = math.comb(2 * m_value + parity, m_value)
    return Fraction(difference, central)


@functools.cache
def cached_group(
    c_value: int,
    m_value: int,
    x_value: int,
    parity: int,
) -> int:
    return internal_group(
        c_value, m_value, DISTANCE, x_value, parity
    )


def initial_differences(values: list[Fraction]) -> list[Fraction]:
    row = list(values)
    result = []
    while row:
        result.append(row[0])
        row = [
            row[index + 1] - row[index]
            for index in range(len(row) - 1)
        ]
    return result


def tensor_newton(
    values: list[list[list[Fraction]]],
) -> list[list[list[Fraction]]]:
    c_count = len(values)
    m_count = len(values[0])
    x_count = len(values[0][0])

    along_c = [
        [
            [Fraction(0) for _ in range(x_count)]
            for _ in range(m_count)
        ]
        for _ in range(c_count)
    ]
    for m_index in range(m_count):
        for x_index in range(x_count):
            coefficients = initial_differences(
                [
                    values[c_index][m_index][x_index]
                    for c_index in range(c_count)
                ]
            )
            for c_order, coefficient in enumerate(coefficients):
                along_c[c_order][m_index][x_index] = coefficient

    along_m = [
        [
            [Fraction(0) for _ in range(x_count)]
            for _ in range(m_count)
        ]
        for _ in range(c_count)
    ]
    for c_order in range(c_count):
        for x_index in range(x_count):
            coefficients = initial_differences(
                [
                    along_c[c_order][m_index][x_index]
                    for m_index in range(m_count)
                ]
            )
            for m_order, coefficient in enumerate(coefficients):
                along_m[c_order][m_order][x_index] = coefficient

    result = [
        [
            [Fraction(0) for _ in range(x_count)]
            for _ in range(m_count)
        ]
        for _ in range(c_count)
    ]
    for c_order in range(c_count):
        for m_order in range(m_count):
            coefficients = initial_differences(
                along_m[c_order][m_order]
            )
            for x_order, coefficient in enumerate(coefficients):
                result[c_order][m_order][x_order] = coefficient
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--distance", type=int, default=4)
    args = parser.parse_args()
    if args.distance < 0:
        raise ValueError("distance must be nonnegative")
    global DISTANCE
    DISTANCE = args.distance
    cached_group.cache_clear()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    reports = []
    try:
        for parity in (0, 1):
            degree_c, degree_m, degree_x = degree_bounds(
                DISTANCE, parity
            )
            # One extra layer audits the claimed coordinate degrees.
            c_count = degree_c + 2
            m_count = degree_m + 2
            x_count = degree_x + 2
            print(
                f"evaluating epsilon={parity}: "
                f"{c_count*m_count*x_count} grid points",
                flush=True,
            )
            values = [
                [
                    [
                        normalized_residual(
                            c_value,
                            m_value,
                            x_value,
                            parity,
                        )
                        * denominator_product(m_value, parity)
                        for x_value in range(x_count)
                    ]
                    for m_value in range(m_count)
                ]
                for c_value in range(c_count)
            ]
            print(
                f"transforming epsilon={parity}",
                flush=True,
            )
            coefficients = tensor_newton(values)
            nonzero = []
            negatives = []
            degree_violations = []
            for c_order in range(c_count):
                for m_order in range(m_count):
                    for x_order in range(x_count):
                        coefficient = coefficients[
                            c_order
                        ][m_order][x_order]
                        if coefficient:
                            item = {
                                "orders_c_m_x": [
                                    c_order,
                                    m_order,
                                    x_order,
                                ],
                                "numerator": coefficient.numerator,
                                "denominator": coefficient.denominator,
                            }
                            nonzero.append(item)
                            if coefficient < 0:
                                negatives.append(item)
                            if (
                                c_order > degree_c
                                or m_order > degree_m
                                or x_order > degree_x
                            ):
                                degree_violations.append(item)
            report = {
                "parity_epsilon": parity,
                "support_distance_s": DISTANCE,
                "denominator_product": (
                    f"product(m+i,i=1..{DISTANCE + 5})"
                    if parity == 0
                    else f"product(m+i,i=2..{DISTANCE + 5})"
                ),
                "claimed_degree_c_m_x": [
                    degree_c,
                    degree_m,
                    degree_x,
                ],
                "grid_shape": [c_count, m_count, x_count],
                "grid_point_count": c_count * m_count * x_count,
                "nonzero_newton_coefficient_count": len(nonzero),
                "negative_newton_coefficient_count": len(negatives),
                "degree_audit_violation_count": len(
                    degree_violations
                ),
                "smallest_nonzero_coefficient": (
                    {
                        "numerator": min(
                            Fraction(
                                item["numerator"],
                                item["denominator"],
                            )
                            for item in nonzero
                        ).numerator,
                        "denominator": min(
                            Fraction(
                                item["numerator"],
                                item["denominator"],
                            )
                            for item in nonzero
                        ).denominator,
                    }
                    if nonzero
                    else None
                ),
                "coefficients": nonzero,
                "first_negative_coefficients": negatives[:20],
                "first_degree_audit_violations": (
                    degree_violations[:20]
                ),
            }
            reports.append(report)
    finally:
        direct.path_row_series = original

    passed = all(
        report["negative_newton_coefficient_count"] == 0
        and report["degree_audit_violation_count"] == 0
        for report in reports
    )
    output = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOUNDARY_"
            f"S{DISTANCE}_GLOBAL_NEWTON_INTERPOLATION"
            if passed
            else "COMPLETE_PATH_ISOLATE_P4_BOUNDARY_"
            f"S{DISTANCE}_SIGNED_GLOBAL_NEWTON_INTERPOLATION"
        ),
        "reports": reports,
        "proof_scope": (
            "Exact tensor-Newton interpolation and one-layer degree "
            "audit. The degree bounds also follow from the fixed "
            "support atom formulas and are stated separately."
        ),
    }
    Path(
        f"path_isolate_p4_boundary_s{DISTANCE}_newton_"
        "interpolation_20260730.json"
    ).write_text(
        json.dumps(output, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": output["status"],
                "summaries": [
                    {
                        key: value
                        for key, value in report.items()
                        if key != "coefficients"
                    }
                    for report in reports
                ],
            },
            indent=2,
        )
    )
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
