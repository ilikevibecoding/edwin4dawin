#!/usr/bin/env python3
"""Stress full Newton positivity of the bottom-pair layer lift.

For fixed m,x,epsilon, expand

  B(m+1,s,x,epsilon)-B(m,s,x,epsilon)

in the Newton basis binom(s+1,r).  This checks all s>=-1 at each
sampled parameter point, not only an initial range of s.
"""

from __future__ import annotations

import argparse
import functools
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def divide_by_one_plus_z(
    coefficients: list[int],
) -> tuple[list[int], int]:
    if len(coefficients) <= 1:
        return [], coefficients[0] if coefficients else 0
    quotient = [coefficients[0]]
    for coefficient in coefficients[1:-1]:
        quotient.append(coefficient - quotient[-1])
    remainder = coefficients[-1] - quotient[-1]
    while quotient and quotient[-1] == 0:
        quotient.pop()
    return quotient, remainder


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", default="4,5,6,8,10")
    parser.add_argument("--x-values", default="0,4,12,32,45")
    args = parser.parse_args()
    m_values = sorted(
        {int(value) for value in args.m_values.split(",")}
    )
    x_values = sorted(
        {int(value) for value in args.x_values.split(",")}
    )

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series

    @functools.cache
    def bottom_pair(
        m_value: int,
        s_value: int,
        x_value: int,
        parity: int,
    ) -> int:
        layer = 2 * m_value + parity
        q_value = m_value + s_value + 2
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

    parameter_cases = 0
    coefficient_checks = 0
    failures = []
    minimum = None
    factor_divisions = 0
    quotient_checks = 0
    minimum_quotient = None
    observed_z_orders = []
    try:
        for parity in (0, 1):
            for m_value in m_values:
                for x_value in x_values:
                    degree_bound = (
                        4 * m_value
                        + 2 * x_value
                        + 13
                        + 2 * parity
                    )
                    values = [
                        bottom_pair(
                            m_value + 1,
                            s_value,
                            x_value,
                            parity,
                        )
                        - bottom_pair(
                            m_value,
                            s_value,
                            x_value,
                            parity,
                        )
                        for s_value in range(
                            -1, degree_bound + 2
                        )
                    ]
                    parameter_cases += 1
                    coefficients = []
                    for order in range(degree_bound + 1):
                        coefficient = values[0]
                        coefficients.append(coefficient)
                        coefficient_checks += 1
                        record = {
                            "parity_epsilon": parity,
                            "m": m_value,
                            "x": x_value,
                            "newton_order": order,
                            "coefficient": coefficient,
                        }
                        if (
                            minimum is None
                            or coefficient < minimum["coefficient"]
                        ):
                            minimum = record
                        if coefficient < 0:
                            failures.append(record)
                        values = [
                            values[index + 1] - values[index]
                            for index in range(len(values) - 1)
                        ]
                    if any(values):
                        failures.append(
                            {
                                "kind": "degree_bound",
                                "parity_epsilon": parity,
                                "m": m_value,
                                "x": x_value,
                                "degree_bound": degree_bound,
                                "remaining_differences": values,
                            }
                        )

                    quotient = list(coefficients)
                    factor_exponent = 2 * m_value + x_value - 1
                    for division in range(factor_exponent):
                        quotient, remainder = divide_by_one_plus_z(
                            quotient
                        )
                        factor_divisions += 1
                        if remainder:
                            failures.append(
                                {
                                    "kind": "factor_remainder",
                                    "parity_epsilon": parity,
                                    "m": m_value,
                                    "x": x_value,
                                    "division": division + 1,
                                    "claimed_exponent": (
                                        factor_exponent
                                    ),
                                    "remainder": remainder,
                                }
                            )
                            break
                    z_order = 0
                    while (
                        z_order < len(quotient)
                        and quotient[z_order] == 0
                    ):
                        z_order += 1
                    observed_z_orders.append(
                        {
                            "parity_epsilon": parity,
                            "m": m_value,
                            "x": x_value,
                            "z_order": z_order,
                        }
                    )
                    reduced = quotient[z_order:]
                    for order, coefficient in enumerate(reduced):
                        quotient_checks += 1
                        record = {
                            "parity_epsilon": parity,
                            "m": m_value,
                            "x": x_value,
                            "quotient_order": order,
                            "coefficient": coefficient,
                        }
                        if (
                            minimum_quotient is None
                            or coefficient
                            < minimum_quotient["coefficient"]
                        ):
                            minimum_quotient = record
                        if coefficient < 0:
                            failures.append(
                                {
                                    "kind": "negative_quotient",
                                    **record,
                                }
                            )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_NEWTON_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_NEWTON_STRESS"
        ),
        "m_values": m_values,
        "x_values": x_values,
        "degree_bound": "4m+2x+13+2epsilon",
        "parameter_cases": parameter_cases,
        "newton_coefficient_checks": coefficient_checks,
        "minimum": minimum,
        "claimed_common_factor": "(1+z)^(2m+x-1)",
        "exact_factor_divisions": factor_divisions,
        "observed_z_orders_after_common_factor": (
            observed_z_orders
        ),
        "quotient_coefficient_checks": quotient_checks,
        "minimum_quotient_coefficient": minimum_quotient,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only in m,x.",
    }
    Path(
        "path_isolate_p4_bottom_pair_lift_newton_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
