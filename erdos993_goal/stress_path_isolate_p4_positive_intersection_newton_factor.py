#!/usr/bin/env python3
"""Stress full Newton factorization for the c>=1 group lift.

For

  D=G(c,m+1,s,x,e)-G(c,m,s,x,e),

test the complete polynomial factorization

  F(z)=(1+z)^(2c+2m+x-1) z^e P(z)

and coefficientwise positivity of P on a stratified large-excess
grid that excludes the refuted c=0 family.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_p4_general_layer_lift_newton_factor import (
    divide_by_one_plus_z,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def parse_values(text: str) -> list[int]:
    return sorted({int(value) for value in text.split(",")})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-values", default="1,2,4")
    parser.add_argument("--m-values", default="0,3,6")
    parser.add_argument("--x-values", default="0,12,45")
    args = parser.parse_args()
    c_values = parse_values(args.c_values)
    m_values = parse_values(args.m_values)
    x_values = parse_values(args.x_values)

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cases = 0
    newton_checks = 0
    divisions = 0
    quotient_checks = 0
    failures = []
    minimum_quotient = None
    quotient_cache = {}
    recurrence_checks = 0
    minimum_recurrence = None
    try:
        for parity in (0, 1):
            for c_value in c_values:
                for m_value in m_values:
                    if c_value + m_value < 4:
                        continue
                    for x_value in x_values:
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
                                s_value,
                                x_value,
                                parity,
                            )
                            - internal_group(
                                c_value,
                                m_value,
                                s_value,
                                x_value,
                                parity,
                            )
                            for s_value in range(-1, degree + 1)
                        ]
                        coefficients = []
                        for _ in range(degree + 1):
                            coefficients.append(values[0])
                            newton_checks += 1
                            values = [
                                values[index + 1]
                                - values[index]
                                for index in range(
                                    len(values) - 1
                                )
                            ]
                        quotient = coefficients
                        exponent = (
                            2 * c_value
                            + 2 * m_value
                            + x_value
                            - 1
                        )
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
                                        "c": c_value,
                                        "m": m_value,
                                        "x": x_value,
                                        "division": division + 1,
                                        "remainder": remainder,
                                    }
                                )
                                break
                        if parity:
                            if not quotient or quotient[0] != 0:
                                failures.append(
                                    {
                                        "kind": "missing_z_factor",
                                        "parity_epsilon": parity,
                                        "c": c_value,
                                        "m": m_value,
                                        "x": x_value,
                                    }
                                )
                            else:
                                quotient = quotient[1:]
                        for order, coefficient in enumerate(quotient):
                            quotient_checks += 1
                            record = {
                                "parity_epsilon": parity,
                                "c": c_value,
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
                        quotient_cache[
                            (
                                parity,
                                c_value,
                                m_value,
                                x_value,
                            )
                        ] = quotient
                        cases += 1

        for key, old in quotient_cache.items():
            parity, c_value, m_value, x_value = key
            for coordinate, new_key in (
                (
                    "c",
                    (
                        parity,
                        c_value + 1,
                        m_value,
                        x_value,
                    ),
                ),
                (
                    "m",
                    (
                        parity,
                        c_value,
                        m_value + 1,
                        x_value,
                    ),
                ),
                (
                    "x",
                    (
                        parity,
                        c_value,
                        m_value,
                        x_value + 1,
                    ),
                ),
            ):
                if new_key not in quotient_cache:
                    continue
                new = quotient_cache[new_key]
                maximum = max(len(old), len(new))
                for order in range(maximum):
                    residual = (
                        new[order] if order < len(new) else 0
                    ) - (
                        old[order] if order < len(old) else 0
                    )
                    recurrence_checks += 1
                    record = {
                        "coordinate": coordinate,
                        "parity_epsilon": parity,
                        "c": c_value,
                        "m": m_value,
                        "x": x_value,
                        "quotient_order": order,
                        "residual": residual,
                    }
                    if (
                        minimum_recurrence is None
                        or residual
                        < minimum_recurrence["residual"]
                    ):
                        minimum_recurrence = record
                    if residual < 0:
                        failures.append(
                            {
                                "kind": "negative_recurrence",
                                **record,
                            }
                        )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "NEWTON_FACTOR_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "NEWTON_FACTOR_STRESS"
        ),
        "domain": (
            f"c in {c_values}, m in {m_values}, c+m>=4, "
            f"x in {x_values}, epsilon in {{0,1}}"
        ),
        "factorization": (
            "F=(1+z)^(2c+2m+x-1) z^epsilon P"
        ),
        "cases": cases,
        "newton_coefficient_checks": newton_checks,
        "exact_factor_divisions": divisions,
        "quotient_coefficient_checks": quotient_checks,
        "minimum_quotient_coefficient": minimum_quotient,
        "coordinate_recurrence_comparisons": (
            recurrence_checks
        ),
        "minimum_coordinate_recurrence": minimum_recurrence,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_positive_intersection_newton_factor_"
        "stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
