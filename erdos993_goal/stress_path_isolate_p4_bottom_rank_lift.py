#!/usr/bin/env python3
"""Exact stress test of the candidate h=0 stable rank lift.

The candidate inequality is

    H_q^L(j,0) >= H_(q-1)^(L-2)(j,0),

with L=2q-4+x.  The two sides therefore have the same stable excess
x.  This is evidence only, not a proof.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import (
    group,
    make_kernel,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=20)
    parser.add_argument("--x-max", type=int, default=8)
    parser.add_argument("--layer-max", type=int, default=16)
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
                    args.layer_max, 2 * q - 3
                )
                states_q = direct.terminal_series(
                    q,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q1_same = direct.terminal_series(
                    q - 1,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q1_short = direct.terminal_series(
                    q - 1,
                    length - 2,
                    maximum,
                    return_states=True,
                )
                states_q2_short = direct.terminal_series(
                    q - 2,
                    length - 2,
                    maximum,
                    return_states=True,
                )
                kernel_q = make_kernel(
                    states_q, states_q1_same
                )
                kernel_q1_short = make_kernel(
                    states_q1_short, states_q2_short
                )
                for j in range(maximum + 1):
                    residual = (
                        group(kernel_q, j, 0)
                        - group(kernel_q1_short, j, 0)
                    )
                    checks += 1
                    record = {
                        "q": q,
                        "x": x,
                        "j": j,
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
            "PASS_PATH_ISOLATE_P4_BOTTOM_RANK_LIFT_STRESS"
            if not failures
            else "FAIL"
        ),
        "inequality": (
            "H_q^L(j,0) >= H_(q-1)^(L-2)(j,0)"
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
        "path_isolate_p4_bottom_rank_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
