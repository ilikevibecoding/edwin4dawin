#!/usr/bin/env python3
"""Stress the common positive factor in the lift's Newton polynomial.

Let A_r=Delta^r D(-1), and F(z)=sum_r A_r z^r.  Sample
factorizations suggest the stronger form

  F(z) = (1+z)^(2c+2m+x-1) z^delta P(z),

where delta=1 for odd parity or for even parity with c=0, and P has
nonnegative integer coefficients.  This script checks that exact
claim over a finite parameter grid.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
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
    parser.add_argument("--c-max", type=int, default=4)
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=2)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cases = 0
    divisions = 0
    quotient_checks = 0
    failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for c in range(args.c_max + 1):
                for m in range(args.m_max + 1):
                    if c + m < 4:
                        continue
                    for x in range(args.x_max + 1):
                        degree = (
                            4 * c
                            + 4 * m
                            + 2 * x
                            + 9
                            + 2 * parity
                        )
                        values = [
                            internal_group(
                                c, m + 1, s, x, parity
                            )
                            - internal_group(
                                c, m, s, x, parity
                            )
                            for s in range(-1, degree + 1)
                        ]
                        coefficients = []
                        for _ in range(degree + 1):
                            coefficients.append(values[0])
                            values = [
                                values[index + 1]
                                - values[index]
                                for index in range(
                                    len(values) - 1
                                )
                            ]
                        exponent = 2 * c + 2 * m + x - 1
                        quotient = coefficients
                        for division in range(exponent):
                            quotient, remainder = (
                                divide_by_one_plus_z(quotient)
                            )
                            divisions += 1
                            if remainder:
                                failures.append(
                                    {
                                        "kind": "factor_remainder",
                                        "parity_epsilon": parity,
                                        "c": c,
                                        "m": m,
                                        "x": x,
                                        "division": division + 1,
                                        "remainder": remainder,
                                    }
                                )
                                break
                        delta = int(parity == 1 or c == 0)
                        if delta:
                            if not quotient or quotient[0] != 0:
                                failures.append(
                                    {
                                        "kind": "missing_z_factor",
                                        "parity_epsilon": parity,
                                        "c": c,
                                        "m": m,
                                        "x": x,
                                        "constant": (
                                            quotient[0]
                                            if quotient
                                            else None
                                        ),
                                    }
                                )
                            else:
                                quotient = quotient[1:]
                        for order, coefficient in enumerate(quotient):
                            quotient_checks += 1
                            record = {
                                "parity_epsilon": parity,
                                "c": c,
                                "m": m,
                                "x": x,
                                "quotient_order": order,
                                "coefficient": coefficient,
                            }
                            if (
                                minimum is None
                                or coefficient
                                < minimum["coefficient"]
                            ):
                                minimum = record
                            if coefficient < 0:
                                failures.append(
                                    {"kind": "negative_quotient", **record}
                                )
                        cases += 1
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "NEWTON_FACTOR_STRESS"
            if not failures
            else "FAIL"
        ),
        "parameter_domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "claimed_common_factor": (
            "(1+z)^(2c+2m+x-1), with an additional z when "
            "epsilon=1 or c=0"
        ),
        "cases": cases,
        "exact_factor_divisions": divisions,
        "quotient_coefficient_checks": quotient_checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_general_layer_lift_newton_factor_"
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
