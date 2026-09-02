#!/usr/bin/env python3
"""Stress a pointwise diagonal lift for the distinguished P4 kernel.

The general group lift would follow immediately from the two
pointwise statements

  Q_q^L(a,b) >= 0,
  Q_(q+1)^(L+2)(a+1,b+1) >= Q_q^L(a,b),

because the binomial weights also increase under
(d,u) -> (d+2,u+1).  This script tests both statements exactly in
the stable path range L=2q-4+x.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=18)
    parser.add_argument("--layer-max", type=int, default=18)
    parser.add_argument("--x-max", type=int, default=8)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    minima = {
        "kernel": None,
        "diagonal_lift": None,
        "symmetric_kernel": None,
        "symmetric_diagonal_lift": None,
    }
    try:
        for q in range(5, args.q_max + 1):
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                maximum = args.layer_max + 1
                states = direct.terminal_series(
                    q, length, maximum, return_states=True
                )
                states_lower = direct.terminal_series(
                    q - 1,
                    length,
                    maximum,
                    return_states=True,
                )
                states_new = direct.terminal_series(
                    q + 1,
                    length + 2,
                    maximum,
                    return_states=True,
                )
                kernel = make_kernel(states, states_lower)
                kernel_new = make_kernel(states_new, states)
                for a in range(args.layer_max + 1):
                    for b in range(args.layer_max + 1):
                        old = kernel(a, b)
                        lifted = kernel_new(a + 1, b + 1)
                        residual = lifted - old
                        symmetric_old = old + kernel(b, a)
                        symmetric_lifted = (
                            lifted + kernel_new(b + 1, a + 1)
                        )
                        for family, value in (
                            ("kernel", old),
                            ("diagonal_lift", residual),
                            ("symmetric_kernel", symmetric_old),
                            (
                                "symmetric_diagonal_lift",
                                symmetric_lifted - symmetric_old,
                            ),
                        ):
                            checks += 1
                            record = {
                                "family": family,
                                "q": q,
                                "x": x,
                                "layers": [a, b],
                                "value": value,
                                "old_kernel": old,
                                "lifted_kernel": lifted,
                                "symmetric_old_kernel": symmetric_old,
                                "symmetric_lifted_kernel": (
                                    symmetric_lifted
                                ),
                            }
                            if (
                                minima[family] is None
                                or value < minima[family]["value"]
                            ):
                                minima[family] = record
                            if value < 0:
                                failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_KERNEL_DIAGONAL_LIFT_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_KERNEL_DIAGONAL_LIFT_STRESS"
        ),
        "q_range": f"5..{args.q_max}",
        "stable_x_range": f"0..{args.x_max}",
        "layer_range": f"0..{args.layer_max}",
        "checks": checks,
        "minima": minima,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_kernel_diagonal_lift_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
