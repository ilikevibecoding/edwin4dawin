#!/usr/bin/env python3
"""Stress coordinatewise monotonicity of the reduced Newton polynomial.

For the general layer-lift residual let

  F(z)=sum_r Delta^r D(-1) z^r
      =(1+z)^(2c+2m+x-1) P(c,m,x,epsilon;z).

The reduced polynomials observed so far have nonnegative
coefficients.  This script tests the stronger possibility that P is
coefficientwise nondecreasing in c, m, and x.  Such recurrences would
reduce its positivity to boundary parameter families.
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


def reduced_polynomial(
    c: int,
    m: int,
    x: int,
    parity: int,
) -> list[int]:
    degree = 4 * c + 4 * m + 2 * x + 9 + 2 * parity
    values = [
        internal_group(c, m + 1, s, x, parity)
        - internal_group(c, m, s, x, parity)
        for s in range(-1, degree + 1)
    ]
    coefficients = []
    for _ in range(degree + 1):
        coefficients.append(values[0])
        values = [
            values[index + 1] - values[index]
            for index in range(len(values) - 1)
        ]
    quotient = coefficients
    for _ in range(2 * c + 2 * m + x - 1):
        quotient, remainder = divide_by_one_plus_z(quotient)
        assert remainder == 0
    return quotient


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=4)
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=3)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cache = {}
    failures = []
    checks = 0
    minimum = None
    try:
        for parity in (0, 1):
            for c in range(args.c_max + 1):
                for m in range(args.m_max + 1):
                    if c + m < 4:
                        continue
                    for x in range(args.x_max + 1):
                        cache[(parity, c, m, x)] = (
                            reduced_polynomial(
                                c, m, x, parity
                            )
                        )

        for key, old in cache.items():
            parity, c, m, x = key
            for coordinate, new_key in (
                ("c", (parity, c + 1, m, x)),
                ("m", (parity, c, m + 1, x)),
                ("x", (parity, c, m, x + 1)),
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
                        "c": c,
                        "m": m,
                        "x": x,
                        "order": order,
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
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "NEWTON_QUOTIENT_MONOTONICITY_STRESS"
            if not failures
            else "FAIL"
        ),
        "parameter_domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, epsilon in {{0,1}}"
        ),
        "candidate": (
            "P(c,m,x,epsilon;z) is coefficientwise "
            "nondecreasing separately in c,m,x"
        ),
        "polynomials": len(cache),
        "coefficient_comparisons": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_general_layer_lift_newton_quotient_"
        "monotonicity_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
