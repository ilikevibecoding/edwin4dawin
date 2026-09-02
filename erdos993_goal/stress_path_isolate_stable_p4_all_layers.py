#!/usr/bin/env python3
"""Exact stress test of every low isolate layer in stable path P4."""

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
    parser.add_argument("--q-max", type=int, default=30)
    parser.add_argument("--layer-max", type=int, default=16)
    parser.add_argument("--x-max", type=int, default=12)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    checks = 0
    failures = []
    minimum = None
    try:
        for q in range(5, args.q_max + 1):
            maximum = min(args.layer_max + 1, 2 * q - 2)
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                upper = direct.terminal_series(q, length, maximum)
                lower = direct.terminal_series(
                    q - 1, length, maximum - 1
                )
                for layer in range(maximum):
                    value = int(upper[layer + 1] - lower[layer])
                    record = {
                        "q": q,
                        "x": x,
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
            "PASS_PATH_ISOLATE_STABLE_P4_ALL_LAYER_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_STABLE_P4_ALL_LAYER_STRESS"
        ),
        "q_range": f"5..{args.q_max}",
        "input_layer_cap": args.layer_max,
        "x_range": f"0..{args.x_max}",
        "exact_checks": checks,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minimum": minimum[1] if minimum else None,
        "warning": (
            "This is exact finite evidence for the all-layer stable "
            "path P4 recurrence, not a proof."
        ),
    }
    Path(
        "path_isolate_stable_p4_all_layer_stress_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
