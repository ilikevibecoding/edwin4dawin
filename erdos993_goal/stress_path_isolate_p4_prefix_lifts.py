#!/usr/bin/env python3
"""Stress the three sequence-level prefix lifts.

For D(c,m,s,x,e)=G(c,m+1,s,x,e)-G(c,m,s,x,e), test

  D(c+1,m) >= S^2 D(c,m),
  D(c,m+1) >= S^2 D(c,m),
  D(c,m,x+1) >= S D(c,m,x),

where (Sf)(s)=sum_{t=-1}^s f(t).
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
    parser.add_argument("--m-max", type=int, default=6)
    parser.add_argument("--x-max", type=int, default=2)
    parser.add_argument("--s-max", type=int, default=12)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    failures = []
    checks = 0
    minima = {"c": None, "m": None, "x": None}

    @functools.cache
    def residual(
        c_value: int,
        m_value: int,
        s_value: int,
        x_value: int,
        parity: int,
    ) -> int:
        return internal_group(
            c_value, m_value + 1, s_value, x_value, parity
        ) - internal_group(
            c_value, m_value, s_value, x_value, parity
        )

    try:
        for parity in (0, 1):
            for c_value in range(args.c_max + 1):
                for m_value in range(args.m_max + 1):
                    if c_value + m_value < 4:
                        continue
                    for x_value in range(args.x_max + 1):
                        values = [
                            residual(
                                c_value,
                                m_value,
                                s_value,
                                x_value,
                                parity,
                            )
                            for s_value in range(-1, args.s_max + 1)
                        ]
                        first_prefix = []
                        running = 0
                        for value in values:
                            running += value
                            first_prefix.append(running)
                        second_prefix = []
                        running = 0
                        for value in first_prefix:
                            running += value
                            second_prefix.append(running)

                        for index, s_value in enumerate(
                            range(-1, args.s_max + 1)
                        ):
                            candidates = {
                                "c": residual(
                                    c_value + 1,
                                    m_value,
                                    s_value,
                                    x_value,
                                    parity,
                                )
                                - second_prefix[index],
                                "m": residual(
                                    c_value,
                                    m_value + 1,
                                    s_value,
                                    x_value,
                                    parity,
                                )
                                - second_prefix[index],
                                "x": residual(
                                    c_value,
                                    m_value,
                                    s_value,
                                    x_value + 1,
                                    parity,
                                )
                                - first_prefix[index],
                            }
                            for coordinate, value in candidates.items():
                                checks += 1
                                record = {
                                    "coordinate": coordinate,
                                    "residual": value,
                                    "parity_epsilon": parity,
                                    "c": c_value,
                                    "m": m_value,
                                    "s": s_value,
                                    "x": x_value,
                                }
                                if (
                                    minima[coordinate] is None
                                    or value
                                    < minima[coordinate]["residual"]
                                ):
                                    minima[coordinate] = record
                                if value < 0:
                                    failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_PREFIX_LIFT_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_PREFIX_LIFT_STRESS"
        ),
        "domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"c+m>=4, 0<=x<={args.x_max}, "
            f"-1<=s<={args.s_max}, epsilon in {{0,1}}"
        ),
        "candidates": {
            "c": "D(c+1,m,s,x) >= S^2 D(c,m,.,x)(s)",
            "m": "D(c,m+1,s,x) >= S^2 D(c,m,.,x)(s)",
            "x": "D(c,m,s,x+1) >= S D(c,m,.,x)(s)",
        },
        "exact_checks": checks,
        "minima": minima,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_prefix_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
