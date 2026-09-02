#!/usr/bin/env python3
"""Test suffix positivity after aligning the repaired h=0,1 bottom pair."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_summands import audit
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import numeric_path_row_series


def paired_term(kernel, j: int, u: int) -> int:
    """The u-th summand of H(j,0)+H(j,1)."""

    return math.comb(j, u) * (
        kernel(u, j - u) + u * kernel(u, j - u + 1)
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-max", type=int, default=12)
    parser.add_argument("--s-max", type=int, default=10)
    args = parser.parse_args()
    x_values = (0, 4, 12, 32, 44, 45, 48, 60, 100)

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    cases = 0
    suffix_checks = 0
    maximum_transitions = 0
    failures = []
    minimum = None
    reconstruction_failures = []
    try:
        for parity in (0, 1):
            for m_value in range(3, args.m_max + 1):
                j = 2 * m_value + parity
                for s_value in range(-1, args.s_max + 1):
                    q_value = m_value + s_value + 2
                    if q_value < 5:
                        continue
                    for x_value in x_values:
                        length = 2 * q_value - 4 + x_value
                        maximum = j + 3
                        old_states = direct.terminal_series(
                            q_value, length, maximum, return_states=True
                        )
                        old_lower = direct.terminal_series(
                            q_value - 1, length, maximum, return_states=True
                        )
                        new_states = direct.terminal_series(
                            q_value + 1, length + 2, maximum, return_states=True
                        )
                        old_kernel = make_kernel(old_states, old_lower)
                        new_kernel = make_kernel(new_states, old_states)

                        values = [paired_term(new_kernel, j + 2, 0)]
                        values.extend(
                            paired_term(new_kernel, j + 2, u + 1)
                            - paired_term(old_kernel, j, u)
                            for u in range(j + 1)
                        )
                        values.append(paired_term(new_kernel, j + 2, j + 2))

                        transitions, suffixes = audit(values)
                        direct_residual = sum(
                            paired_term(new_kernel, j + 2, u)
                            for u in range(j + 3)
                        ) - sum(
                            paired_term(old_kernel, j, u)
                            for u in range(j + 1)
                        )
                        if sum(values) != direct_residual:
                            reconstruction_failures.append(
                                {
                                    "parity": parity,
                                    "m": m_value,
                                    "s": s_value,
                                    "x": x_value,
                                }
                            )
                        cases += 1
                        maximum_transitions = max(maximum_transitions, transitions)
                        for index, value in enumerate(suffixes):
                            suffix_checks += 1
                            record = {
                                "parity": parity,
                                "m": m_value,
                                "s": s_value,
                                "x": x_value,
                                "j": j,
                                "index": index,
                                "value": value,
                                "transitions": transitions,
                            }
                            if minimum is None or value < minimum["value"]:
                                minimum = record
                            if value < 0:
                                failures.append(record)
                        if cases % 100 == 0:
                            print(cases, len(failures), flush=True)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_SUMMAND_SUFFIX_STRESS"
            if not failures and not reconstruction_failures
            else "FAIL"
        ),
        "paired_sum_identity": (
            "B_j=sum_u binom(j,u)*(Q(u,j-u)+u*Q(u,j-u+1))"
        ),
        "m_range": f"3..{args.m_max}",
        "s_range": f"-1..{args.s_max}",
        "x_values": list(x_values),
        "cases": cases,
        "suffix_checks": suffix_checks,
        "maximum_sign_transitions": maximum_transitions,
        "minimum": minimum,
        "failure_count": len(failures),
        "reconstruction_failure_count": len(reconstruction_failures),
        "first_failures": failures[:50],
        "first_reconstruction_failures": reconstruction_failures[:20],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_lift_summand_suffix_stress_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures or reconstruction_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
