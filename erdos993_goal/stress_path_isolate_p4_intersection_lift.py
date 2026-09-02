#!/usr/bin/env python3
"""Exact stress test of the candidate fixed-intersection lift.

The candidate inequality is

    (h+1) H_q^L(j+1,h+1)
        >= (j+1) H_(q-1)^L(j,h),

where H is the fixed-intersection group of the distinguished-isolate
P4 kernel and L=2q-4+x.  This is evidence only, not a proof.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_cross_polarizations import (
    cross_polarization,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def make_kernel(states, states_lower):
    cache: dict[tuple[int, int], int] = {}

    def kernel(a: int, b: int) -> int:
        tag = (a, b)
        if tag not in cache:
            cache[tag] = int(
                sum(
                    sign
                    * cross_polarization(
                        states,
                        states_lower,
                        phase_name,
                        a,
                        b,
                    )
                    for phase_name, sign in (
                        ("new", 1),
                        ("old", -1),
                        ("lower", -1),
                    )
                )
            )
        return cache[tag]

    return kernel


def group(kernel, j: int, h: int) -> int:
    return math.comb(j, h) * sum(
        math.comb(j - h, u)
        * kernel(h + u, j - u)
        for u in range(j - h + 1)
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=20)
    parser.add_argument("--x-max", type=int, default=8)
    parser.add_argument("--layer-max", type=int, default=14)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    minimum = None
    try:
        for q in range(6, args.q_max + 1):
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                maximum = min(
                    args.layer_max + 1, 2 * q - 3
                )
                states_q = direct.terminal_series(
                    q,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q1 = direct.terminal_series(
                    q - 1,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q2 = direct.terminal_series(
                    q - 2,
                    length,
                    maximum,
                    return_states=True,
                )
                kernel_q = make_kernel(states_q, states_q1)
                kernel_q1 = make_kernel(states_q1, states_q2)
                for j in range(
                    min(args.layer_max, maximum - 1) + 1
                ):
                    for h in range(j + 1):
                        upper = group(
                            kernel_q, j + 1, h + 1
                        )
                        lower = group(kernel_q1, j, h)
                        residual = (
                            (h + 1) * upper
                            - (j + 1) * lower
                        )
                        checks += 1
                        record = {
                            "q": q,
                            "x": x,
                            "j": j,
                            "h": h,
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
            "PASS_PATH_ISOLATE_P4_INTERSECTION_LIFT_STRESS"
            if not failures
            else "FAIL"
        ),
        "inequality": (
            "(h+1)H_q^L(j+1,h+1) >= "
            "(j+1)H_(q-1)^L(j,h)"
        ),
        "stable_length": "L=2q-4+x",
        "q_range": f"6..{args.q_max}",
        "x_range": f"0..{args.x_max}",
        "j_cap": args.layer_max,
        "exact_checks": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_intersection_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
