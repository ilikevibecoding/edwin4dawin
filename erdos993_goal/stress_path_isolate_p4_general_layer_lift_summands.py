#!/usr/bin/env python3
"""Stress summand structure of the general unnormalized layer lift.

Map the old convolution index u to u+1 in the new convolution.  The
residual is then the sum of two new endpoint terms and

  binom(d+2,u+1) Q_new(c+u+1,c+d-u+1)
    - binom(d,u) Q_old(c+u,c+d-u).

This script checks exact suffix positivity and the observed number of
sign changes in that ordered residual list.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def audit(values: list[int]) -> tuple[int, list[int]]:
    signs = [value > 0 for value in values if value != 0]
    transitions = sum(
        signs[index] != signs[index - 1]
        for index in range(1, len(signs))
    )
    suffixes = []
    total = 0
    for value in reversed(values):
        total += value
        suffixes.append(total)
    suffixes.reverse()
    return transitions, suffixes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--c-max", type=int, default=8)
    parser.add_argument("--m-max", type=int, default=8)
    parser.add_argument("--s-max", type=int, default=8)
    parser.add_argument("--x-max", type=int, default=3)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cases = 0
    suffix_checks = 0
    max_transitions = 0
    failures = []
    minimum = None
    try:
        for parity in (0, 1):
            for c in range(args.c_max + 1):
                for m in range(args.m_max + 1):
                    d = 2 * m + parity
                    for s in range(-1, args.s_max + 1):
                        q = c + m + s + 2
                        if q < 5:
                            continue
                        for x in range(args.x_max + 1):
                            length = 2 * q - 4 + x
                            maximum = c + d + 2
                            old_states = direct.terminal_series(
                                q,
                                length,
                                maximum,
                                return_states=True,
                            )
                            old_lower = direct.terminal_series(
                                q - 1,
                                length,
                                maximum,
                                return_states=True,
                            )
                            new_states = direct.terminal_series(
                                q + 1,
                                length + 2,
                                maximum,
                                return_states=True,
                            )
                            old_kernel = make_kernel(
                                old_states, old_lower
                            )
                            new_kernel = make_kernel(
                                new_states, old_states
                            )
                            values = [
                                new_kernel(c, c + d + 2)
                            ]
                            values.extend(
                                math.comb(d + 2, u + 1)
                                * new_kernel(
                                    c + u + 1,
                                    c + d - u + 1,
                                )
                                - math.comb(d, u)
                                * old_kernel(
                                    c + u,
                                    c + d - u,
                                )
                                for u in range(d + 1)
                            )
                            values.append(
                                new_kernel(c + d + 2, c)
                            )
                            transitions, suffixes = audit(values)
                            cases += 1
                            max_transitions = max(
                                max_transitions, transitions
                            )
                            for index, value in enumerate(suffixes):
                                suffix_checks += 1
                                record = {
                                    "parity_epsilon": parity,
                                    "c": c,
                                    "m": m,
                                    "s": s,
                                    "x": x,
                                    "index": index,
                                    "value": value,
                                    "transitions": transitions,
                                }
                                if (
                                    minimum is None
                                    or value < minimum["value"]
                                ):
                                    minimum = record
                                if value < 0:
                                    failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "SUMMAND_SUFFIX_STRESS"
            if not failures
            else "FAIL"
        ),
        "parameter_domain": (
            f"0<=c<={args.c_max}, 0<=m<={args.m_max}, "
            f"-1<=s<={args.s_max}, 0<=x<={args.x_max}, "
            "epsilon in {0,1}, q>=5"
        ),
        "cases": cases,
        "suffix_checks": suffix_checks,
        "maximum_sign_transitions": max_transitions,
        "minimum": minimum,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_general_layer_lift_summand_suffix_"
        "stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
