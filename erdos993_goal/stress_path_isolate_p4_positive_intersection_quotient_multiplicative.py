#!/usr/bin/env python3
"""Stress multiplicative quotient recurrences on the c>=1 lift.

For

  F=(1+z)^(2c+2m+x-1) z^epsilon P,

test whether each unit of stable path length contributes the common
positive multiplier 1+2z:

  P(c+1,m,x) >= (1+2z)^2 P(c,m,x),
  P(c,m+1,x) >= (1+2z)^2 P(c,m,x),
  P(c,m,x+1) >= (1+2z) P(c,m,x).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_bottom_pair_quotient_multiplicative import (
    multiply,
)
from stress_path_isolate_p4_general_layer_lift_newton_quotient_monotonicity import (
    reduced_polynomial,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=5)
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=4)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cache: dict[tuple[int, int, int, int], list[int]] = {}
    failures = []
    checks = 0
    minimum = None
    multipliers = {
        "c": [1, 4, 4],
        "m": [1, 4, 4],
        "x": [1, 2],
    }
    try:
        for parity in (0, 1):
            for c_value in range(1, args.c_max + 1):
                for m_value in range(args.m_max + 1):
                    if c_value + m_value < 4:
                        continue
                    for x_value in range(args.x_max + 1):
                        cache[
                            (
                                parity,
                                c_value,
                                m_value,
                                x_value,
                            )
                        ] = reduced_polynomial(
                            c_value,
                            m_value,
                            x_value,
                            parity,
                        )

        for key, old in cache.items():
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
                        "c": c_value,
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
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "QUOTIENT_MULTIPLICATIVE_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "QUOTIENT_MULTIPLICATIVE_STRESS"
        ),
        "domain": (
            f"1<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, "
            "epsilon in {0,1}"
        ),
        "factorization": (
            "F=(1+z)^(2c+2m+x-1) z^epsilon P"
        ),
        "candidate_recurrences": {
            "c": "P(c+1,m,x)>=(1+2z)^2 P(c,m,x)",
            "m": "P(c,m+1,x)>=(1+2z)^2 P(c,m,x)",
            "x": "P(c,m,x+1)>=(1+2z) P(c,m,x)",
        },
        "polynomials": len(cache),
        "coefficient_comparisons": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_positive_intersection_quotient_"
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
