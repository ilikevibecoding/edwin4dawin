#!/usr/bin/env python3
"""Exact stress test of path-specific P4 below the stable threshold.

This uses exact path moment formulas for every path length L>=2.
The adjacent-endpoint case L=1 is excluded because its two nominal
endpoint minors coalesce and must be handled from the actual graph.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=24)
    parser.add_argument("--layer-max", type=int, default=16)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    minimum = None
    try:
        for q in range(5, args.q_max + 1):
            maximum = min(args.layer_max + 1, 2 * q - 2)
            for length in range(2, 2 * q - 4):
                upper = direct.terminal_series(q, length, maximum)
                lower = direct.terminal_series(
                    q - 1, length, maximum - 1
                )
                for layer in range(maximum):
                    value = int(upper[layer + 1] - lower[layer])
                    record = {
                        "q": q,
                        "path_length_L": length,
                        "input_layer_j": layer,
                        "value": value,
                    }
                    checks += 1
                    if minimum is None or value < minimum[0]:
                        minimum = (value, record)
                    if value < 0:
                        failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_SHORT_LENGTH_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_SHORT_LENGTH_STRESS"
        ),
        "q_range": f"5..{args.q_max}",
        "path_lengths": "2<=L<2q-4",
        "input_layer_cap": args.layer_max,
        "exact_checks": checks,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minimum": minimum[1] if minimum else None,
        "excluded_case": (
            "L=1 adjacent endpoints; use actual graph interpolation"
        ),
        "warning": (
            "This is exact finite evidence, not an all-rank proof."
        ),
    }
    Path(
        "path_isolate_p4_short_length_stress_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
