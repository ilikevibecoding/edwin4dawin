#!/usr/bin/env python3
"""Exact conditioning probe for a future interval/GPU sign screen."""

from __future__ import annotations

import json
import random
from pathlib import Path

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03,
    five_cubic_path,
    forest_poly,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_float_screen_condition_probe_agent_20260825.json"
DEGREES = (28, 28, 27, 26)


def forward(values: list[int]) -> list[int]:
    out = []
    current = values
    while current:
        out.append(current[0])
        current = [right - left for left, right in zip(current, current[1:])]
    return out


def value(lengths: list[int]) -> list[int]:
    adjacency, _ = five_cubic_path(lengths[10], tuple(lengths[:10]))
    core = forest_poly(adjacency)
    return deltas03(core, forest_poly(adjacency, frozenset({0})))


def main() -> None:
    source = random.Random(0xF10A7_5C8EEA_20260825)
    minimum_ratio = [None] * 4
    minimum_nonzero_ratio = [None] * 4
    zero_inside_degree = [0] * 4
    worst = [None] * 4
    for sample in range(128):
        lengths = []
        for index in range(11):
            maximum = 8 if index in (0, 2, 5, 7) else 7
            lengths.append(source.randint(1, maximum))
        varying = source.randrange(11)
        lengths[varying] = 8 if varying in (0, 2, 5, 7) else 7
        shift = max(0, 28 - (1 + sum(lengths)))
        initial = lengths[varying]
        rows = [[] for _ in range(4)]
        for point in range(29):
            lengths[varying] = initial + shift + point
            values = value(lengths)
            for rank in range(4):
                rows[rank].append(values[rank])
        for rank in range(4):
            coefficients = forward(rows[rank])
            maximum_value = max(abs(item) for item in rows[rank])
            for degree, coefficient in enumerate(coefficients[: DEGREES[rank] + 1]):
                if coefficient == 0:
                    zero_inside_degree[rank] += 1
                    continue
                ratio = abs(coefficient) / ((1 << degree) * maximum_value)
                if minimum_nonzero_ratio[rank] is None or ratio < minimum_nonzero_ratio[rank]:
                    minimum_nonzero_ratio[rank] = ratio
                    worst[rank] = [sample, varying, degree, str(coefficient), str(maximum_value)]
            positive = [
                abs(coefficient) / ((1 << degree) * maximum_value)
                for degree, coefficient in enumerate(coefficients[: DEGREES[rank] + 1])
                if coefficient > 0
            ]
            local = min(positive)
            minimum_ratio[rank] = local if minimum_ratio[rank] is None else min(minimum_ratio[rank], local)
    payload = {
        "schema": "rank8-delta03-float-screen-condition-probe-agent-v1",
        "status": "PROBE_ONLY",
        "ray_samples": 128,
        "minimum_positive_coefficient_over_2k_max_sample_by_delta": minimum_ratio,
        "minimum_nonzero_absolute_ratio_by_delta": minimum_nonzero_ratio,
        "zero_coefficients_inside_degree_by_delta": zero_inside_degree,
        "worst_nonzero_records": worst,
        "scope_guard": "Conditioning probe only; floating point is not theorem evidence.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
