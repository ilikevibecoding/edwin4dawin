#!/usr/bin/env python3
"""Inspect signed one-axis layer shapes at the hardest corner coefficient."""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)


@functools.cache
def choose(n, k):
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def local(core, a, b, r, u, v, k, j):
    return sum(
        coefficient
        * choose(a + b - k, v - pw - b + k - j)
        * choose(a + k + r - j, u - pz - k)
        for (pz, pw), coefficient in core.items()
    )


def sign_blocks(values):
    blocks = []
    for index, value in enumerate(values):
        if not value:
            continue
        sign = 1 if value > 0 else -1
        if not blocks or blocks[-1]["sign"] != sign:
            blocks.append({"sign": sign, "start": index, "end": index})
        else:
            blocks[-1]["end"] = index
    return blocks


def shape(values):
    positive = sum(value for value in values if value > 0)
    negative = -sum(value for value in values if value < 0)
    paired = [
        values[index] + values[len(values) - 1 - index]
        for index in range((len(values) + 1) // 2)
    ]
    return {
        "length": len(values),
        "blocks": sign_blocks(values),
        "negative_count": sum(value < 0 for value in values),
        "positive_mass": positive,
        "negative_mass": negative,
        "negative_over_positive": float(negative / positive) if positive else None,
        "total": positive - negative,
        "reflection_pair_failure_count": sum(value < 0 for value in paired),
        "minimum_reflection_pair_sum": min(paired),
    }


def audit(package, parity, coordinate, m_value):
    case = (
        package, parity, coordinate,
        1 if package == "group" else 0,
        m_value, 0,
    )
    direction = "m"
    a = (m_value - 1 if package == "group" else m_value - 3)
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    lower = 3 * (m_value + 1) + 5 + int(coordinate == "m")
    core = aligned_core(case, direction, 40)
    k_values = []
    j_values = [0] * (r + 1)
    for k in range(b + 1):
        k_value = 0
        for j in range(r + 1):
            value = choose(b, k) * choose(r, j) * local(
                core, a, b, r, lower, lower, k, j
            )
            k_value += value
            j_values[j] += value
        k_values.append(k_value)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "ambient_direction": direction,
        "m": m_value,
        "offset": [0, 0],
        "k_shape": shape(k_values),
        "j_shape": shape(j_values),
    }


def main():
    records = []
    for m_value in (3, 6, 9, 12, 15, 24, 36):
        for package, parity, coordinate in (
            ("group", 0, "m"),
            ("bottom", 1, "x"),
        ):
            record = audit(package, parity, coordinate, m_value)
            records.append(record)
            print(
                package, m_value,
                record["k_shape"]["blocks"],
                record["j_shape"]["blocks"],
                record["k_shape"]["negative_over_positive"],
                record["j_shape"]["negative_over_positive"],
                flush=True,
            )
    report = {"status": "PROBE", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "corner_layer_shapes_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
