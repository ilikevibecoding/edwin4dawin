#!/usr/bin/env python3
"""Exact stress test of the general unnormalized two-layer lift.

For

  G(c,m,s,x,e) = sum_u C(2m+e,u)
      Q_q^L(c+u,c+2m+e-u),
  q=c+m+s+2, L=2q-4+x,

test G(c,m+1,s,x,e)>=G(c,m,s,x,e).

The script also records failures of the tempting but false
central-binomial-normalized strengthening, so the two statements
cannot be confused.
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
    parser.add_argument("--c-max", type=int, default=12)
    parser.add_argument("--m-max", type=int, default=9)
    parser.add_argument("--s-max", type=int, default=8)
    parser.add_argument("--x-max", type=int, default=3)
    args = parser.parse_args()
    c_values = list(range(args.c_max + 1))
    for extra in (20, 50, 100):
        if extra not in c_values:
            c_values.append(extra)

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    normalized_failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for c in c_values:
                for m in range(args.m_max + 1):
                    old_central = math.comb(
                        2 * m + parity, m
                    )
                    new_central = math.comb(
                        2 * m + 2 + parity, m + 1
                    )
                    for s in range(-1, args.s_max + 1):
                        if c + m + s + 2 < 5:
                            continue
                        for x in range(args.x_max + 1):
                            old = internal_group(
                                c, m, s, x, parity
                            )
                            new = internal_group(
                                c, m + 1, s, x, parity
                            )
                            residual = new - old
                            checks += 1
                            record = {
                                "parity_epsilon": parity,
                                "c": c,
                                "m": m,
                                "s": s,
                                "x": x,
                                "residual": residual,
                            }
                            if (
                                minimum is None
                                or residual
                                < minimum["residual"]
                            ):
                                minimum = record
                            if residual < 0:
                                failures.append(record)

                            normalized_residual = (
                                new * old_central
                                - old * new_central
                            )
                            if normalized_residual < 0:
                                normalized_failures.append(
                                    {
                                        **record,
                                        "normalized_cross_"
                                        "residual": (
                                            normalized_residual
                                        ),
                                    }
                                )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_STRESS"
            if not failures
            else "FAIL"
        ),
        "candidate": (
            "G(c,m+1,s,x,epsilon) >= "
            "G(c,m,s,x,epsilon)"
        ),
        "c_values": c_values,
        "m_range": f"0..{args.m_max}",
        "s_range": f"-1..{args.s_max}",
        "x_range": f"0..{args.x_max}",
        "rank_restriction": "q=c+m+s+2>=5",
        "exact_checks": checks,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "false_strengthening": {
            "statement": (
                "G/binom(2m+epsilon,m) is nondecreasing"
            ),
            "failure_count": len(normalized_failures),
            "first_failures": normalized_failures[:20],
        },
        "warning": (
            "The unnormalized lift is finite exact evidence "
            "outside the separately proved s=-1,0,1,2,3 diagonals."
        ),
    }
    Path(
        "path_isolate_p4_general_layer_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
