#!/usr/bin/env python3
"""Stress stronger multiplicative recurrences for the bottom-pair quotient.

For

  F(m,x,e;z)=z(1+z)^(2m+x-1) P(m,x,e;z),

test the path-extension recurrences suggested by exact base data:

  P(m,x+1) >= (1+2z) P(m,x),
  P(m+1,x) >= (1+2z)^2 P(m,x),

coefficientwise.
"""

from __future__ import annotations

import argparse
import functools
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton_factor import (
    divide_by_one_plus_z,
)
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def multiply(
    left: list[int], right: list[int]
) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for left_order, left_coefficient in enumerate(left):
        for right_order, right_coefficient in enumerate(right):
            result[left_order + right_order] += (
                left_coefficient * right_coefficient
            )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-min", type=int, default=3)
    parser.add_argument("--m-max", type=int, default=8)
    parser.add_argument("--x-max", type=int, default=6)
    args = parser.parse_args()

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

    @functools.cache
    def reduced_polynomial(
        m_value: int, x_value: int, parity: int
    ) -> list[int]:
        degree = (
            4 * m_value + 2 * x_value + 13 + 2 * parity
        )
        values = [
            bottom_pair(
                m_value + 1, s_value, x_value, parity
            )
            - bottom_pair(
                m_value, s_value, x_value, parity
            )
            for s_value in range(-1, degree + 1)
        ]
        coefficients = []
        for _ in range(degree + 1):
            coefficients.append(values[0])
            values = [
                values[index + 1] - values[index]
                for index in range(len(values) - 1)
            ]
        quotient = coefficients
        for _ in range(2 * m_value + x_value - 1):
            quotient, remainder = divide_by_one_plus_z(
                quotient
            )
            assert remainder == 0
        assert quotient and quotient[0] == 0
        return quotient[1:]

    multipliers = {
        "m": [1, 4, 4],
        "x": [1, 2],
    }
    cache: dict[tuple[int, int, int], list[int]] = {}
    failures = []
    checks = 0
    minimum = None
    try:
        for parity in (0, 1):
            for m_value in range(
                args.m_min, args.m_max + 1
            ):
                for x_value in range(args.x_max + 1):
                    cache[(parity, m_value, x_value)] = (
                        reduced_polynomial(
                            m_value, x_value, parity
                        )
                    )

        for key, old in cache.items():
            parity, m_value, x_value = key
            for coordinate, new_key in (
                ("m", (parity, m_value + 1, x_value)),
                ("x", (parity, m_value, x_value + 1)),
            ):
                if new_key not in cache:
                    continue
                new = cache[new_key]
                baseline = multiply(
                    old, multipliers[coordinate]
                )
                maximum = max(len(new), len(baseline))
                for order in range(maximum):
                    residual = (
                        new[order] if order < len(new) else 0
                    ) - (
                        baseline[order]
                        if order < len(baseline)
                        else 0
                    )
                    checks += 1
                    record = {
                        "coordinate": coordinate,
                        "parity_epsilon": parity,
                        "m": m_value,
                        "x": x_value,
                        "quotient_order": order,
                        "residual": residual,
                    }
                    if (
                        minimum is None
                        or residual < minimum["residual"]
                    ):
                        minimum = record
                    if residual < 0:
                        failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_QUOTIENT_"
            "MULTIPLICATIVE_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_QUOTIENT_"
            "MULTIPLICATIVE_STRESS"
        ),
        "domain": (
            f"{args.m_min}<=m<={args.m_max}, "
            f"0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "factorization": "F=z(1+z)^(2m+x-1)P",
        "candidate_recurrences": {
            "m": "P(m+1,x)>=(1+2z)^2 P(m,x)",
            "x": "P(m,x+1)>=(1+2z) P(m,x)",
        },
        "polynomials": len(cache),
        "coefficient_comparisons": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_quotient_"
        "multiplicative_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
