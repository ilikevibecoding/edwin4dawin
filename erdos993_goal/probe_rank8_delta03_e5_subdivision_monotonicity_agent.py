#!/usr/bin/env python3
"""Exact exploratory subdivision-monotonicity probe for the open cubic e=5 layer."""

from __future__ import annotations

import json
import random
from pathlib import Path

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03,
    five_cubic_path,
    forest_poly,
)
from probe_rank8_delta03_e5_five_cubic_t_root_motion_agent import build as five_cubic_t


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_subdivision_monotonicity_probe_agent_20260825.json"


def subdivide(adjacency: list[list[int]], edge: tuple[int, int]) -> tuple[list[list[int]], int]:
    left, right = edge
    out = [row.copy() for row in adjacency]
    out[left].remove(right)
    out[right].remove(left)
    inserted = len(out)
    out.append([left, right])
    out[left].append(inserted)
    out[right].append(inserted)
    return out, inserted


def edges(adjacency: list[list[int]]) -> list[tuple[int, int]]:
    return [(left, right) for left, row in enumerate(adjacency) for right in row if left < right]


def main() -> None:
    source = random.Random(0x5EBD_1A15_10A_20260825)
    increment_failures = [0] * 4
    inserted_nonpositive = [0] * 4
    checks = 0
    inserted_checks = 0
    witnesses = []
    for sample in range(96):
        while True:
            lengths = tuple(source.randint(1, 6) for _ in range(11))
            if 1 + sum(lengths) >= 27:
                break
        if sample % 2:
            adjacency, _ = five_cubic_path(lengths[10], lengths[:10])
            skeleton = "five_cubic_path"
        else:
            adjacency, _ = five_cubic_t(lengths)
            skeleton = "five_cubic_t"
        old_core = forest_poly(adjacency)
        roots = list(range(len(adjacency)))
        source.shuffle(roots)
        roots = roots[: min(20, len(roots))]
        old_values = {
            root: deltas03(old_core, forest_poly(adjacency, frozenset({root})))
            for root in roots
        }
        candidate_edges = edges(adjacency)
        source.shuffle(candidate_edges)
        for edge in candidate_edges[: min(10, len(candidate_edges))]:
            extended, inserted = subdivide(adjacency, edge)
            new_core = forest_poly(extended)
            for root in roots:
                new_values = deltas03(new_core, forest_poly(extended, frozenset({root})))
                for rank in range(4):
                    increment = new_values[rank] - old_values[root][rank]
                    if increment <= 0:
                        increment_failures[rank] += 1
                        if len(witnesses) < 16:
                            witnesses.append({
                                "sample": sample,
                                "skeleton": skeleton,
                                "lengths": lengths,
                                "edge": edge,
                                "root": root,
                                "rank": rank,
                                "increment": increment,
                            })
                checks += 1
            values = deltas03(new_core, forest_poly(extended, frozenset({inserted})))
            for rank, value in enumerate(values):
                if value <= 0:
                    inserted_nonpositive[rank] += 1
            inserted_checks += 1
    payload = {
        "schema": "rank8-delta03-e5-subdivision-monotonicity-probe-agent-v1",
        "status": "PROBE_ONLY",
        "tree_samples": 96,
        "old_root_increment_checks": checks,
        "inserted_root_checks": inserted_checks,
        "nonpositive_old_root_increments_by_delta": increment_failures,
        "nonpositive_inserted_root_values_by_delta": inserted_nonpositive,
        "first_increment_witnesses": witnesses,
        "scope_guard": "Random exact probe only; not theorem evidence.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
