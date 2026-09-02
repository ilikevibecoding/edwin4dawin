#!/usr/bin/env python3
"""Stress Newton-basis positivity of the general layer-lift residual.

For fixed c,m,x,epsilon, the residual

  D_s = G(c,m+1,s,x,epsilon)-G(c,m,s,x,epsilon)

is a polynomial in s.  Its predicted degree is at most

  4c+4m+2x+9+2epsilon.

This script checks that every forward difference at s=-1 is
nonnegative and that the next difference after the predicted degree
vanishes.  This is finite exact evidence for a possible uniform
Newton-basis proof.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import (
    make_kernel,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def internal_group(
    c: int,
    m: int,
    s: int,
    x: int,
    parity: int,
) -> int:
    d = 2 * m + parity
    q = c + m + s + 2
    length = 2 * q - 4 + x
    maximum = c + d
    states = direct.terminal_series(
        q, length, maximum, return_states=True
    )
    states_lower = direct.terminal_series(
        q - 1,
        length,
        maximum,
        return_states=True,
    )
    kernel = make_kernel(states, states_lower)
    return sum(
        math.comb(d, u)
        * kernel(c + u, c + d - u)
        for u in range(d + 1)
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=4)
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=2)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    parameter_cases = 0
    newton_coefficient_checks = 0
    degree_checks = 0
    failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for c in range(args.c_max + 1):
                for m in range(args.m_max + 1):
                    # This makes q>=5 already at s=-1.
                    if c + m < 4:
                        continue
                    for x in range(args.x_max + 1):
                        degree_bound = (
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
                            for s in range(
                                -1, degree_bound + 2
                            )
                        ]
                        parameter_cases += 1
                        for order in range(
                            degree_bound + 1
                        ):
                            coefficient = values[0]
                            newton_coefficient_checks += 1
                            record = {
                                "parity_epsilon": parity,
                                "c": c,
                                "m": m,
                                "x": x,
                                "newton_order": order,
                                "coefficient": coefficient,
                            }
                            if (
                                minimum is None
                                or coefficient
                                < minimum["coefficient"]
                            ):
                                minimum = record
                            if coefficient < 0:
                                failures.append(record)
                            values = [
                                values[index + 1]
                                - values[index]
                                for index in range(
                                    len(values) - 1
                                )
                            ]
                        degree_checks += 1
                        if any(values):
                            failures.append(
                                {
                                    "kind": "degree_bound",
                                    "parity_epsilon": parity,
                                    "c": c,
                                    "m": m,
                                    "x": x,
                                    "degree_bound": degree_bound,
                                    "next_difference": values,
                                }
                            )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "NEWTON_STRESS"
            if not failures
            else "FAIL"
        ),
        "parameter_domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "polynomial_variable": "s, based at s=-1",
        "degree_upper_bound": (
            "4c+4m+2x+9+2epsilon"
        ),
        "parameter_cases": parameter_cases,
        "newton_coefficient_checks": (
            newton_coefficient_checks
        ),
        "degree_bound_checks": degree_checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_general_layer_lift_newton_stress_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
