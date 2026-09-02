#!/usr/bin/env python3
"""Stress positivity and a layer lift for H(j,0)+H(j,1).

Write j=2m+epsilon and q=m+s+2.  In terms of the internal
fixed-intersection group G,

  B_0(m,s,x) = G(0,m,s,x,0)
                 + 2m G(1,m-1,s,x,1),

  B_1(m,s,x) = G(0,m,s,x,1)
                 + (2m+1) G(1,m,s-1,x,0).

These are exactly H(j,0)+H(j,1).  Test B>=0 and the candidate
two-layer lift B(m+1,s,x)>=B(m,s,x).
"""

from __future__ import annotations

import argparse
import functools
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-min", type=int, default=3)
    parser.add_argument("--m-max", type=int, default=14)
    parser.add_argument("--s-min", type=int, default=-1)
    parser.add_argument("--s-max", type=int, default=18)
    parser.add_argument(
        "--x-values",
        default="0,4,12,20,32,40,44,45,48,52,56,60,80,100,120",
    )
    args = parser.parse_args()
    x_values = sorted(
        {int(value) for value in args.x_values.split(",")}
    )

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
        if layer == 0:
            return int(h_zero)
        h_one = layer * sum(
            math.comb(layer - 1, u_value)
            * kernel(1 + u_value, layer - u_value)
            for u_value in range(layer)
        )
        return int(h_zero + h_one)

    value_checks = 0
    lift_checks = 0
    negative_values = []
    negative_lifts = []
    minimum_value = None
    minimum_lift = None
    try:
        for parity in (0, 1):
            for m_value in range(args.m_min, args.m_max + 1):
                for s_value in range(args.s_min, args.s_max + 1):
                    q_value = m_value + s_value + 2
                    if q_value < 5:
                        continue
                    for x_value in x_values:
                        value = bottom_pair(
                            m_value, s_value, x_value, parity
                        )
                        lifted = (
                            bottom_pair(
                                m_value + 1,
                                s_value,
                                x_value,
                                parity,
                            )
                            - value
                        )
                        value_record = {
                            "parity_epsilon": parity,
                            "m": m_value,
                            "s": s_value,
                            "x": x_value,
                            "value": value,
                        }
                        lift_record = {
                            **value_record,
                            "lift_residual": lifted,
                        }
                        value_checks += 1
                        lift_checks += 1
                        if (
                            minimum_value is None
                            or value < minimum_value["value"]
                        ):
                            minimum_value = value_record
                        if (
                            minimum_lift is None
                            or lifted
                            < minimum_lift["lift_residual"]
                        ):
                            minimum_lift = lift_record
                        if value < 0:
                            negative_values.append(value_record)
                        if lifted < 0:
                            negative_lifts.append(lift_record)
    finally:
        direct.path_row_series = original

    passed = not negative_values and not negative_lifts
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_STRESS"
            if passed
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_STRESS"
        ),
        "domain": (
            f"{args.m_min}<=m<={args.m_max}, "
            f"{args.s_min}<=s<={args.s_max}, q=m+s+2>=5, "
            f"x in {x_values}, epsilon in {{0,1}}"
        ),
        "tested_claims": [
            "H(j,0)+H(j,1)>=0",
            "B(m+1,s,x,epsilon)>=B(m,s,x,epsilon)",
        ],
        "value_checks": value_checks,
        "lift_checks": lift_checks,
        "minimum_value": minimum_value,
        "minimum_lift_residual": minimum_lift,
        "negative_value_count": len(negative_values),
        "negative_lift_count": len(negative_lifts),
        "first_negative_values": negative_values[:50],
        "first_negative_lifts": negative_lifts[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
