#!/usr/bin/env python3
"""Stress the two-layer lift after excluding h=c=0.

The original general lift is false only in the bottom intersection
family in the first extended audit.  This script tests whether the
surviving statement

    G(c,m+1,s,x,e) >= G(c,m,s,x,e),  c>=1,

and direct positivity of G hold on a wide stratified parameter grid.
"""

from __future__ import annotations

import argparse
import functools
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=4)
    parser.add_argument("--m-max", type=int, default=10)
    parser.add_argument("--s-max", type=int, default=14)
    parser.add_argument(
        "--x-values",
        default="0,12,20,32,40,44,45,48,52,56,60,80,100,120",
    )
    args = parser.parse_args()
    x_values = sorted(
        {int(value) for value in args.x_values.split(",")}
    )

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series

    @functools.cache
    def group(c_value, m_value, s_value, x_value, parity):
        return internal_group(
            c_value, m_value, s_value, x_value, parity
        )

    group_checks = 0
    lift_checks = 0
    negative_groups = []
    negative_lifts = []
    minimum_group = None
    minimum_lift = None
    try:
        for parity in (0, 1):
            for c_value in range(1, args.c_max + 1):
                for m_value in range(args.m_max + 1):
                    for s_value in range(-1, args.s_max + 1):
                        if c_value + m_value + s_value + 2 < 5:
                            continue
                        for x_value in x_values:
                            old = group(
                                c_value,
                                m_value,
                                s_value,
                                x_value,
                                parity,
                            )
                            new = group(
                                c_value,
                                m_value + 1,
                                s_value,
                                x_value,
                                parity,
                            )
                            residual = new - old
                            group_record = {
                                "parity_epsilon": parity,
                                "c": c_value,
                                "m": m_value,
                                "s": s_value,
                                "x": x_value,
                                "value": old,
                            }
                            lift_record = {
                                **group_record,
                                "lift_residual": residual,
                            }
                            group_checks += 1
                            lift_checks += 1
                            if (
                                minimum_group is None
                                or old < minimum_group["value"]
                            ):
                                minimum_group = group_record
                            if (
                                minimum_lift is None
                                or residual
                                < minimum_lift["lift_residual"]
                            ):
                                minimum_lift = lift_record
                            if old < 0:
                                negative_groups.append(group_record)
                            if residual < 0:
                                negative_lifts.append(lift_record)
    finally:
        direct.path_row_series = original

    passed = not negative_groups and not negative_lifts
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_LIFT_STRESS"
            if passed
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_LIFT_STRESS"
        ),
        "domain": (
            f"1<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"-1<=s<={args.s_max}, q=c+m+s+2>=5, "
            f"x in {x_values}, epsilon in {{0,1}}"
        ),
        "group_checks": group_checks,
        "lift_checks": lift_checks,
        "minimum_group": minimum_group,
        "minimum_lift_residual": minimum_lift,
        "negative_group_count": len(negative_groups),
        "negative_lift_count": len(negative_lifts),
        "first_negative_groups": negative_groups[:50],
        "first_negative_lifts": negative_lifts[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_positive_intersection_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
