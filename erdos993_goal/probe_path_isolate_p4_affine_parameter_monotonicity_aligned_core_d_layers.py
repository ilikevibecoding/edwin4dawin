#!/usr/bin/env python3
"""Test d=2k-j layers on the residual aligned-core corner."""

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


def audit(case, direction, maximum_corner_sum):
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
    lower = (
        3 * (m_value + int(direction == "m"))
        + 5
        + int(coordinate == "m")
    )
    core = aligned_core(case, direction, 40)
    negative_layers = []
    total_failures = []
    position_records = []
    for s in range(maximum_corner_sum + 1):
        for t in range(maximum_corner_sum + 1 - s):
            u, v = lower + s, lower + t
            layers = []
            total = 0
            for d in range(-r, 2 * b + 1):
                value = 0
                for k in range(b + 1):
                    j = 2 * k - d
                    if 0 <= j <= r:
                        value += (
                            choose(b, k) * choose(r, j)
                            * local(core, a, b, r, u, v, k, j)
                        )
                if value:
                    layers.append((d, value))
                    total += value
                    if value < 0:
                        negative_layers.append({"offset": [s, t], "d": d, "value": value})
            if total < 0:
                total_failures.append({"offset": [s, t], "value": total})
            position_records.append({
                "offset": [s, t],
                "negative_d_layer_count": sum(value < 0 for _, value in layers),
                "nonzero_d_layer_count": len(layers),
                "total": total,
            })
            print(package, direction, s, t, position_records[-1]["negative_d_layer_count"], flush=True)
    return {
        "case": list(case),
        "ambient_direction": direction,
        "maximum_corner_sum": maximum_corner_sum,
        "core_term_count": len(core),
        "position_count": len(position_records),
        "total_failure_count": len(total_failures),
        "negative_d_layer_count": len(negative_layers),
        "position_with_negative_d_layer_count": sum(
            item["negative_d_layer_count"] > 0 for item in position_records
        ),
        "first_negative_d_layers": negative_layers[:30],
        "position_records": position_records,
    }


def main():
    requested = [
        (("bottom", 1, "x", 0, 12, 0), "m", 6),
        (("group", 0, "m", 1, 12, 0), "m", 8),
        (("bottom", 1, "x", 0, 12, 0), "x", 6),
        (("group", 0, "m", 1, 12, 0), "x", 8),
    ]
    records = []
    for case, direction, corner in requested:
        record = audit(case, direction, corner)
        records.append(record)
        print(json.dumps({key: value for key, value in record.items() if key != "position_records"}, indent=2), flush=True)
    report = {"status": "PROBE", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "aligned_core_d_layers_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
