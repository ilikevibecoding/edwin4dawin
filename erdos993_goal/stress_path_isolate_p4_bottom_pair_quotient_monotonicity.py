#!/usr/bin/env python3
"""Stress coordinate monotonicity of the bottom-pair quotient.

For the bottom-pair layer-lift residual, write

  F(m,x,e;z)=z(1+z)^(2m+x-1) P(m,x,e;z).

Test whether P is coefficientwise nondecreasing in m and x.
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-min", type=int, default=3)
    parser.add_argument("--m-max", type=int, default=8)
    parser.add_argument("--x-max", type=int, default=6)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series

    @functools.cache
    def bottom_pair(m_value, s_value, x_value, parity):
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
    def reduced_polynomial(m_value, x_value, parity):
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

    cache = {}
    failures = []
    checks = 0
    minimum = None
    base_records = []
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

        for parity in (0, 1):
            base = cache[(parity, args.m_min, 0)]
            negative_base = [
                {
                    "quotient_order": order,
                    "coefficient": coefficient,
                }
                for order, coefficient in enumerate(base)
                if coefficient < 0
            ]
            failures.extend(
                {
                    "kind": "negative_base",
                    "parity_epsilon": parity,
                    "m": args.m_min,
                    "x": 0,
                    **item,
                }
                for item in negative_base
            )
            base_records.append(
                {
                    "parity_epsilon": parity,
                    "m": args.m_min,
                    "x": 0,
                    "degree": len(base) - 1,
                    "coefficient_count": len(base),
                    "negative_coefficient_count": len(
                        negative_base
                    ),
                    "smallest_coefficient": min(base),
                    "coefficients": base,
                }
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
                maximum = max(len(old), len(new))
                for order in range(maximum):
                    residual = (
                        new[order] if order < len(new) else 0
                    ) - (
                        old[order] if order < len(old) else 0
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
            "MONOTONICITY_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_QUOTIENT_"
            "MONOTONICITY_STRESS"
        ),
        "domain": (
            f"{args.m_min}<=m<={args.m_max}, "
            f"0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "factorization": "F=z(1+z)^(2m+x-1)P",
        "candidate": (
            "P is coefficientwise nondecreasing separately in m,x"
        ),
        "polynomials": len(cache),
        "base_polynomials": base_records,
        "coefficient_comparisons": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_quotient_monotonicity_"
        "stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
