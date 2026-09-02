#!/usr/bin/env python3
"""Stress a normalized two-layer lift for the P4 bottom group.

For epsilon in {0,1}, set

    R_epsilon(m,s,x)
      = H_q^L(2m+epsilon,0) / binom(2m+epsilon,m),
    q=m+s+2, L=2q-4+x.

The candidate inequality is R_epsilon(m+1,s,x)>=R_epsilon(m,s,x).
Together with fixed bases m=3, this would prove the bottom group at
all layers and ranks.  The audit is exact finite evidence only.
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


def bottom_group(m: int, s: int, x: int, parity: int) -> int:
    q = m + s + 2
    length = 2 * q - 4 + x
    j = 2 * m + parity
    states = direct.terminal_series(
        q, length, j, return_states=True
    )
    states_lower = direct.terminal_series(
        q - 1, length, j, return_states=True
    )
    return group(
        make_kernel(states, states_lower), j, 0
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-max", type=int, default=15)
    parser.add_argument("--s-max", type=int, default=12)
    parser.add_argument("--x-max", type=int, default=6)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for m in range(3, args.m_max + 1):
                old_central = math.comb(
                    2 * m + parity, m
                )
                new_central = math.comb(
                    2 * m + 2 + parity, m + 1
                )
                for s in range(args.s_max + 1):
                    for x in range(args.x_max + 1):
                        old = bottom_group(
                            m, s, x, parity
                        )
                        new = bottom_group(
                            m + 1, s, x, parity
                        )
                        # Exact cross multiplication of R_new-R_old.
                        residual = (
                            new * old_central
                            - old * new_central
                        )
                        checks += 1
                        record = {
                            "parity_epsilon": parity,
                            "m": m,
                            "s": s,
                            "x": x,
                            "cross_multiplied_residual": residual,
                        }
                        if (
                            minimum is None
                            or residual
                            < minimum[
                                "cross_multiplied_residual"
                            ]
                        ):
                            minimum = record
                        if residual < 0:
                            failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_LAYER_LIFT_STRESS"
            if not failures
            else "FAIL"
        ),
        "candidate": (
            "H(2m+2+epsilon,0)/C(2m+2+epsilon,m+1)"
            " >= H(2m+epsilon,0)/C(2m+epsilon,m), "
            "with q and L increased by 1 and 2"
        ),
        "m_range": f"3..{args.m_max}",
        "s_range": f"0..{args.s_max}",
        "x_range": f"0..{args.x_max}",
        "exact_checks": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_layer_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
