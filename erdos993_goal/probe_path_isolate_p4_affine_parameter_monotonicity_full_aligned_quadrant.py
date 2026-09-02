#!/usr/bin/env python3
"""Directly test a full aligned difference without layer diagnostics."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)
from probe_path_isolate_p4_affine_target_rows import A, T, V, multiply, power


def audit(case, direction):
    package, parity, coordinate, c_value, m_value, x_value = case
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    core = aligned_core(case, direction, 40)
    core_degree = max(max(position) for position in core)
    full_degree = a + 2 * b + r + core_degree
    full = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    full = multiply(full, power(V, r, full_degree), full_degree)
    full = multiply(full, core, full_degree)
    lower = 3 * (m_value + int(direction == "m")) + 5 + int(coordinate == "m")
    negatives = {
        position: value for position, value in full.items()
        if position[0] >= lower and position[1] >= lower and value < 0
    }
    return {
        "case": list(case),
        "ambient_direction": direction,
        "quadrant_lower": lower,
        "negative_count": len(negatives),
        "first_negatives": [
            {"position": list(position), "value": value}
            for position, value in list(negatives.items())[:20]
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--x", type=int, required=True)
    args = parser.parse_args()
    cases = [
        ("group", 0, "m", 1, args.m, args.x),
        ("bottom", 1, "x", 0, args.m, args.x),
    ]
    records = []
    for case in cases:
        for direction in ("x", "m"):
            record = audit(case, direction)
            records.append(record)
            print(case[0], direction, record["negative_count"], flush=True)
    status = "PASS" if all(not record["negative_count"] for record in records) else "FAIL"
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"full_aligned_quadrant_m{args.m}_x{args.x}_probe_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
