#!/usr/bin/env python3
"""Test reflection pairings of the aligned repaired bottom-pair lift."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_bottom_pair_lift_summand_suffix import paired_term
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import numeric_path_row_series


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-max", type=int, default=16)
    parser.add_argument("--s-max", type=int, default=14)
    args = parser.parse_args()
    x_values = (0, 4, 12, 32, 44, 45, 48, 60, 100)
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    failures = []
    checks = 0
    minimum = None
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
                            q_value + 1,
                            length + 2,
                            maximum,
                            return_states=True,
                        )
                        old_kernel = make_kernel(old_states, old_lower)
                        new_kernel = make_kernel(new_states, old_states)
                        values = [paired_term(new_kernel, j + 2, 0)]
                        values.extend(
                            paired_term(new_kernel, j + 2, u + 1)
                            - paired_term(old_kernel, j, u)
                            for u in range(j + 1)
                        )
                        values.append(
                            paired_term(new_kernel, j + 2, j + 2)
                        )
                        size = len(values)
                        for index in range((size + 1) // 2):
                            opposite = size - 1 - index
                            value = values[index]
                            if opposite != index:
                                value += values[opposite]
                            checks += 1
                            record = {
                                "parity": parity,
                                "m": m_value,
                                "s": s_value,
                                "x": x_value,
                                "index": index,
                                "opposite": opposite,
                                "value": value,
                            }
                            if minimum is None or value < minimum["value"]:
                                minimum = record
                            if value < 0:
                                failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": "PASS" if not failures else "FAIL",
        "pairing": "aligned index k paired with j+2-k",
        "m_range": f"3..{args.m_max}",
        "s_range": f"-1..{args.s_max}",
        "x_values": list(x_values),
        "checks": checks,
        "failure_count": len(failures),
        "minimum": minimum,
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_reflection_stress_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
