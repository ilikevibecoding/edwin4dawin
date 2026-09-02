#!/usr/bin/env python3
"""Exact exploratory root-motion probe on the five-cubic-T skeleton."""

from __future__ import annotations

import json
import random
from pathlib import Path

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    attach_path,
    deltas03,
    forest_poly,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_root_motion_probe_agent_20260825.json"


def build(lengths: tuple[int, ...]) -> tuple[list[list[int]], dict[str, list[int]]]:
    assert len(lengths) == 11
    adjacency: list[list[int]] = [[]]
    center = 0
    short_left_path = attach_path(adjacency, center, lengths[0])
    short_left = short_left_path[-1]
    short_pendant = attach_path(adjacency, short_left, lengths[1])
    attach_path(adjacency, short_left, lengths[2])
    short_right = attach_path(adjacency, center, lengths[3])[-1]
    attach_path(adjacency, short_right, lengths[4])
    attach_path(adjacency, short_right, lengths[5])
    center_middle_path = attach_path(adjacency, center, lengths[6])
    middle = center_middle_path[-1]
    middle_pendant = attach_path(adjacency, middle, lengths[7])
    middle_outer_path = attach_path(adjacency, middle, lengths[8])
    outer = middle_outer_path[-1]
    outer_pendant = attach_path(adjacency, outer, lengths[9])
    attach_path(adjacency, outer, lengths[10])
    assert sum(len(row) == 3 for row in adjacency) == 5
    return adjacency, {
        "center_short_outer_spine": [center, *short_left_path],
        "center_middle_spine": [center, *center_middle_path],
        "middle_long_outer_spine": [middle, *middle_outer_path],
        "short_outer_pendant": [short_left, *short_pendant],
        "middle_pendant": [middle, *middle_pendant],
        "long_outer_pendant": [outer, *outer_pendant],
    }


def main() -> None:
    source = random.Random(0xF1_5EC0_B1C_20260825)
    orbits = (
        "center_short_outer_spine",
        "center_middle_spine",
        "middle_long_outer_spine",
        "short_outer_pendant",
        "middle_pendant",
        "long_outer_pendant",
    )
    failures = {
        orbit: {
            "endpoint": [0] * 4,
            "adjacent": [0] * 4,
        }
        for orbit in orbits
    }
    minimum_locations = {
        orbit: [{"adjacent": 0, "within_six": 0, "deep": 0} for _ in range(4)]
        for orbit in orbits
    }
    checked = {orbit: 0 for orbit in orbits}
    for _sample in range(512):
        while True:
            lengths = tuple(source.randint(1, 5) for _ in range(11))
            if 1 + sum(lengths) >= 28:
                break
        adjacency, paths = build(lengths)
        core = forest_poly(adjacency)
        root_values = [
            deltas03(core, forest_poly(adjacency, frozenset({root})))
            for root in range(len(adjacency))
        ]
        for orbit, vertices in paths.items():
            if len(vertices) <= 2:
                continue
            checked[orbit] += 1
            for rank in range(4):
                internal_minimum = min(root_values[root][rank] for root in vertices[1:-1])
                endpoint_minimum = min(root_values[vertices[0]][rank], root_values[vertices[-1]][rank])
                adjacent_minimum = min(root_values[vertices[1]][rank], root_values[vertices[-2]][rank])
                if internal_minimum < endpoint_minimum:
                    failures[orbit]["endpoint"][rank] += 1
                if internal_minimum < adjacent_minimum:
                    failures[orbit]["adjacent"][rank] += 1
                minimizers = [
                    index
                    for index, root in enumerate(vertices[1:-1], start=1)
                    if root_values[root][rank] == internal_minimum
                ]
                distance = min(min(index, len(vertices) - 1 - index) for index in minimizers)
                bucket = "adjacent" if distance == 1 else "within_six" if distance <= 6 else "deep"
                minimum_locations[orbit][rank][bucket] += 1
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-root-motion-probe-agent-v1",
        "status": "PROBE_ONLY",
        "sample_count": 512,
        "checked_paths_by_orbit": checked,
        "failure_counts_by_orbit": failures,
        "internal_minimum_locations_by_orbit": minimum_locations,
        "scope_guard": "Random exact probe only; not theorem evidence.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("PROBE_ONLY")
    print("FAILURES", failures)
    print("LOCATIONS", minimum_locations)


if __name__ == "__main__":
    main()
