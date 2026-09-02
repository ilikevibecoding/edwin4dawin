#!/usr/bin/env python3
"""Exact Newton interpolation for a fixed bottom-pair diagonal.

For B=H(j,0)+H(j,1), j=2m+epsilon, interpolate both

  B / binom(2m+epsilon,m)

and

  (B(m+1)-B(m)) / binom(2m+epsilon,m)

after multiplication by a declared positive denominator product.
The variables are M=m-3 and x.  One extra grid layer in each
coordinate audits the stated polynomial degree bounds.
"""

from __future__ import annotations

import argparse
import functools
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
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


def tensor_newton_2d(
    values: list[list[Fraction]],
) -> list[list[Fraction]]:
    m_count = len(values)
    x_count = len(values[0])
    along_m = [
        [Fraction(0) for _ in range(x_count)]
        for _ in range(m_count)
    ]
    for x_index in range(x_count):
        differences = initial_differences(
            [
                values[m_index][x_index]
                for m_index in range(m_count)
            ]
        )
        for m_order, coefficient in enumerate(differences):
            along_m[m_order][x_index] = coefficient
    result = [
        [Fraction(0) for _ in range(x_count)]
        for _ in range(m_count)
    ]
    for m_order in range(m_count):
        differences = initial_differences(along_m[m_order])
        for x_order, coefficient in enumerate(differences):
            result[m_order][x_order] = coefficient
    return result


def evaluate_newton(
    coefficients: list[list[Fraction]],
    m_shift: int,
    x_value: int,
) -> Fraction:
    return sum(
        coefficient
        * math.comb(m_shift, m_order)
        * math.comb(x_value, x_order)
        for m_order, row in enumerate(coefficients)
        for x_order, coefficient in enumerate(row)
        if coefficient
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--distance", type=int, default=6)
    parser.add_argument("--degree-m", type=int)
    parser.add_argument("--degree-x", type=int)
    args = parser.parse_args()
    distance = args.distance
    if distance < 0:
        raise ValueError("distance must be nonnegative")
    degree_m = (
        args.degree_m
        if args.degree_m is not None
        else 3 * distance + 10
    )
    degree_x = (
        args.degree_x
        if args.degree_x is not None
        else 2 * distance + 2
    )
    denominator_last_shift = distance + 5

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series

    @functools.cache
    def bottom_pair(
        m_value: int, x_value: int, parity: int
    ) -> int:
        layer = 2 * m_value + parity
        q_value = m_value + distance + 2
        length = 2 * q_value - 4 + x_value
        states = direct.terminal_series(
            q_value, length, layer, return_states=True
        )
        states_lower = direct.terminal_series(
            q_value - 1,
            length,
            layer,
            return_states=True,
        )
        kernel = make_kernel(states, states_lower)
        h_zero = sum(
            math.comb(layer, u_value)
            * kernel(u_value, layer - u_value)
            for u_value in range(layer + 1)
        )
        h_one = layer * sum(
            math.comb(layer - 1, u_value)
            * kernel(1 + u_value, layer - u_value)
            for u_value in range(layer)
        )
        return int(h_zero + h_one)

    def denominator(m_value: int) -> int:
        return math.prod(
            m_value + shift
            for shift in range(1, denominator_last_shift + 1)
        )

    reports = []
    total_failures = 0
    try:
        for parity in (0, 1):
            m_count = degree_m + 2
            x_count = degree_x + 2
            grids = {
                "pair": [
                    [Fraction(0) for _ in range(x_count)]
                    for _ in range(m_count)
                ],
                "lift": [
                    [Fraction(0) for _ in range(x_count)]
                    for _ in range(m_count)
                ],
            }
            print(
                f"evaluating epsilon={parity}: "
                f"{m_count*x_count} grid points",
                flush=True,
            )
            for m_shift in range(m_count):
                m_value = m_shift + 3
                central = math.comb(
                    2 * m_value + parity, m_value
                )
                positive_denominator = denominator(m_value)
                for x_value in range(x_count):
                    pair = bottom_pair(
                        m_value, x_value, parity
                    )
                    lifted = (
                        bottom_pair(
                            m_value + 1, x_value, parity
                        )
                        - pair
                    )
                    grids["pair"][m_shift][x_value] = (
                        Fraction(pair, central)
                        * positive_denominator
                    )
                    grids["lift"][m_shift][x_value] = (
                        Fraction(lifted, central)
                        * positive_denominator
                    )

            for kind, grid in grids.items():
                coefficients = tensor_newton_2d(grid)
                nonzero = []
                negative = []
                audit = []
                for m_order, row in enumerate(coefficients):
                    for x_order, coefficient in enumerate(row):
                        if not coefficient:
                            continue
                        item = {
                            "orders_M_x": [m_order, x_order],
                            "numerator": coefficient.numerator,
                            "denominator": coefficient.denominator,
                        }
                        nonzero.append(item)
                        if coefficient < 0:
                            negative.append(item)
                        if (
                            m_order > degree_m
                            or x_order > degree_x
                        ):
                            audit.append(item)

                external_failures = []
                for offset in range(1, 7):
                    test_m_shift = degree_m + 1 + offset
                    test_x = degree_x + 1 + 2 * offset
                    test_m = test_m_shift + 3
                    central = math.comb(
                        2 * test_m + parity, test_m
                    )
                    if kind == "pair":
                        direct_value = Fraction(
                            bottom_pair(
                                test_m, test_x, parity
                            ),
                            central,
                        ) * denominator(test_m)
                    else:
                        direct_value = Fraction(
                            bottom_pair(
                                test_m + 1,
                                test_x,
                                parity,
                            )
                            - bottom_pair(
                                test_m, test_x, parity
                            ),
                            central,
                        ) * denominator(test_m)
                    interpolated = evaluate_newton(
                        coefficients, test_m_shift, test_x
                    )
                    if interpolated != direct_value:
                        external_failures.append(
                            {
                                "M": test_m_shift,
                                "x": test_x,
                                "direct": str(direct_value),
                                "interpolated": str(interpolated),
                            }
                        )

                canonical = "\n".join(
                    f"{item['orders_M_x']}:"
                    f"{item['numerator']}/{item['denominator']}"
                    for item in nonzero
                )
                failures = (
                    len(negative)
                    + len(audit)
                    + len(external_failures)
                )
                total_failures += failures
                reports.append(
                    {
                        "parity_epsilon": parity,
                        "quantity": kind,
                        "degree_bound_M_x": [
                            degree_m,
                            degree_x,
                        ],
                        "grid_shape": [m_count, x_count],
                        "positive_denominator": (
                            "product(m+i,i=1.."
                            f"{denominator_last_shift})"
                        ),
                        "nonzero_newton_coefficient_count": len(
                            nonzero
                        ),
                        "negative_newton_coefficient_count": len(
                            negative
                        ),
                        "degree_audit_violation_count": len(audit),
                        "external_validation_failure_count": len(
                            external_failures
                        ),
                        "smallest_nonzero_coefficient": (
                            min(
                                (
                                    Fraction(
                                        item["numerator"],
                                        item["denominator"],
                                    )
                                    for item in nonzero
                                ),
                                default=Fraction(0),
                            ).__str__()
                        ),
                        "first_negative_coefficients": negative[:30],
                        "first_degree_audit_violations": audit[:30],
                        "external_validation_failures": (
                            external_failures
                        ),
                        "coefficient_sha256": hashlib.sha256(
                            canonical.encode("utf-8")
                        ).hexdigest(),
                    }
                )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_DISTANCE_"
            "NEWTON_INTERPOLATION"
            if total_failures == 0
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_DISTANCE_"
            "NEWTON_INTERPOLATION"
        ),
        "support_distance_s": distance,
        "shift": "m=3+M",
        "failure_count": total_failures,
        "reports": reports,
        "warning": (
            "The degree bounds require the separate fixed-support "
            "path-binomial architecture justification."
        ),
    }
    Path(
        "path_isolate_p4_bottom_pair_fixed_distance_"
        f"s{distance}_newton_interpolation_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if total_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
