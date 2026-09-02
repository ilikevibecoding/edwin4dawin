#!/usr/bin/env python3
"""Stress ordinary positivity after removing the residual's zero block.

For n=s+1 and E=2c+2m+x-1, exact Newton factorizations imply that the
residual polynomial f(n) is divisible by

  (n+1)(n+2)...(n+E).

This script converts f from its exact Newton coefficients to ordinary
monomials, divides by the rising factorial using rational polynomial
arithmetic, and checks that every quotient coefficient is
nonnegative.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def binomial_polynomial(order: int) -> list[Fraction]:
    coefficients = [Fraction(1)]
    for root in range(order):
        updated = [Fraction(0)] * (len(coefficients) + 1)
        for power, coefficient in enumerate(coefficients):
            updated[power] -= root * coefficient
            updated[power + 1] += coefficient
        coefficients = updated
    divisor = 1
    for value in range(2, order + 1):
        divisor *= value
    return [coefficient / divisor for coefficient in coefficients]


def add_scaled(
    target: list[Fraction],
    source: list[Fraction],
    scalar: int,
) -> None:
    if len(target) < len(source):
        target.extend([Fraction(0)] * (len(source) - len(target)))
    for index, coefficient in enumerate(source):
        target[index] += scalar * coefficient


def rising_polynomial(order: int) -> list[Fraction]:
    coefficients = [Fraction(1)]
    for root in range(1, order + 1):
        updated = [Fraction(0)] * (len(coefficients) + 1)
        for power, coefficient in enumerate(coefficients):
            updated[power] += root * coefficient
            updated[power + 1] += coefficient
        coefficients = updated
    return coefficients


def divide_exact(
    numerator: list[Fraction],
    denominator: list[Fraction],
) -> tuple[list[Fraction], list[Fraction]]:
    numerator = list(numerator)
    while numerator and numerator[-1] == 0:
        numerator.pop()
    quotient = [Fraction(0)] * max(
        0, len(numerator) - len(denominator) + 1
    )
    while len(numerator) >= len(denominator):
        shift = len(numerator) - len(denominator)
        scalar = numerator[-1] / denominator[-1]
        quotient[shift] = scalar
        for index, coefficient in enumerate(denominator):
            numerator[index + shift] -= scalar * coefficient
        while numerator and numerator[-1] == 0:
            numerator.pop()
    return quotient, numerator


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=4)
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=3)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cases = 0
    coefficient_checks = 0
    failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for c_value in range(args.c_max + 1):
                for m_value in range(args.m_max + 1):
                    if c_value + m_value < 4:
                        continue
                    for x_value in range(args.x_max + 1):
                        degree = (
                            4 * c_value
                            + 4 * m_value
                            + 2 * x_value
                            + 9
                            + 2 * parity
                        )
                        values = [
                            internal_group(
                                c_value,
                                m_value + 1,
                                support,
                                x_value,
                                parity,
                            )
                            - internal_group(
                                c_value,
                                m_value,
                                support,
                                x_value,
                                parity,
                            )
                            for support in range(-1, degree + 1)
                        ]
                        newton = []
                        for _ in range(degree + 1):
                            newton.append(values[0])
                            values = [
                                values[index + 1] - values[index]
                                for index in range(len(values) - 1)
                            ]
                        ordinary: list[Fraction] = []
                        for order, coefficient in enumerate(newton):
                            add_scaled(
                                ordinary,
                                binomial_polynomial(order),
                                coefficient,
                            )
                        exponent = (
                            2 * c_value
                            + 2 * m_value
                            + x_value
                            - 1
                        )
                        quotient, remainder = divide_exact(
                            ordinary,
                            rising_polynomial(exponent),
                        )
                        if remainder:
                            failures.append(
                                {
                                    "kind": "nonzero_remainder",
                                    "parity_epsilon": parity,
                                    "c": c_value,
                                    "m": m_value,
                                    "x": x_value,
                                    "remainder": [
                                        str(value) for value in remainder
                                    ],
                                }
                            )
                        for order, coefficient in enumerate(quotient):
                            coefficient_checks += 1
                            record = {
                                "parity_epsilon": parity,
                                "c": c_value,
                                "m": m_value,
                                "x": x_value,
                                "ordinary_quotient_order": order,
                                "coefficient": str(coefficient),
                            }
                            if (
                                minimum is None
                                or coefficient
                                < Fraction(minimum["coefficient"])
                            ):
                                minimum = record
                            if coefficient < 0:
                                failures.append(
                                    {
                                        "kind": "negative_quotient",
                                        **record,
                                    }
                                )
                        cases += 1
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_ORDINARY_RISING_QUOTIENT_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_ORDINARY_RISING_QUOTIENT_STRESS"
        ),
        "domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "factor": "product(n+k,k=1..E), E=2c+2m+x-1",
        "cases": cases,
        "ordinary_quotient_coefficient_checks": coefficient_checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_ordinary_rising_quotient_"
        "stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
