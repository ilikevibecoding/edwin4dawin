#!/usr/bin/env python3
"""Exact exploratory probe for residual shape as a root moves on a path edge.

This is deliberately a probe, not theorem evidence.  It rebuilds five-cubic-path
trees by generic forest DP and records where Delta_0..Delta_3 attain their
minimum as an internal root moves along one fixed subdivided edge.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_internal_root_shape_probe_agent_20260825.json"
MAX_DEGREE = 9


def poly_add(left: list[int], right: list[int]) -> list[int]:
    return [a + b for a, b in zip(left, right)]


def poly_mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_DEGREE + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right[: MAX_DEGREE + 1 - i]):
            out[i + j] += a * b
    return out


def forest_poly(adjacency: list[list[int]], removed: frozenset[int] = frozenset()) -> list[int]:
    seen = set(removed)

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1] + [0] * MAX_DEGREE
        included = [0, 1] + [0] * (MAX_DEGREE - 1)
        for child in adjacency[vertex]:
            if child == parent or child in removed:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = poly_mul(excluded, poly_add(child_excluded, child_included))
            included = poly_mul(included, child_excluded)
        return excluded, included

    result = [1] + [0] * MAX_DEGREE
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        result = poly_mul(result, poly_add(excluded, included))
    return result


def smooth(coefficients: list[int], rank: int, sibling_count: int) -> int:
    return sum(
        math.comb(sibling_count, j) * coefficients[rank - j]
        for j in range(min(rank, sibling_count) + 1)
    )


def residual(core: list[int], deleted: list[int], sibling_count: int) -> int:
    p7 = smooth(core, 7, sibling_count) + deleted[6]
    p8 = smooth(core, 8, sibling_count) + deleted[7]
    p9_open = sum(
        math.comb(sibling_count, j) * core[9 - j]
        for j in range(1, min(9, sibling_count) + 1)
    )
    return (
        8 * core[7] * deleted[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core[8] * core[8] - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7] * deleted[7] - deleted[6] * deleted[7])
    )


def deltas03(core: list[int], deleted: list[int]) -> list[int]:
    values = [residual(core, deleted, sibling_count) for sibling_count in range(1, 5)]
    out = [values[0]]
    for _ in range(3):
        values = [right - left for left, right in zip(values, values[1:])]
        out.append(values[0])
    return out


def attach_path(adjacency: list[list[int]], parent: int, distance: int) -> list[int]:
    current = parent
    vertices = []
    for _ in range(distance):
        child = len(adjacency)
        adjacency.append([current])
        adjacency[current].append(child)
        current = child
        vertices.append(current)
    return vertices


def attach(adjacency: list[list[int]], parent: int, distance: int) -> int:
    return attach_path(adjacency, parent, distance)[-1]


def five_cubic_path(
    center_pendant: int,
    other_lengths: tuple[int, ...],
) -> tuple[list[list[int]], dict[str, list[int]]]:
    """Return the tree and representative edge paths, endpoints included."""
    assert len(other_lengths) == 10
    adjacency: list[list[int]] = [[]]
    center = 0
    inner_spine = attach_path(adjacency, center, other_lengths[0])
    left_inner = inner_spine[-1]
    inner_pendant = attach_path(adjacency, left_inner, other_lengths[1])
    outer_spine = attach_path(adjacency, left_inner, other_lengths[2])
    left_outer = outer_spine[-1]
    outer_pendant = attach_path(adjacency, left_outer, other_lengths[3])
    attach(adjacency, left_outer, other_lengths[4])
    right_inner = attach(adjacency, center, other_lengths[5])
    attach(adjacency, right_inner, other_lengths[6])
    right_outer = attach(adjacency, right_inner, other_lengths[7])
    attach(adjacency, right_outer, other_lengths[8])
    attach(adjacency, right_outer, other_lengths[9])
    center_pendant_vertices = attach_path(adjacency, center, center_pendant)
    assert sum(len(row) == 3 for row in adjacency) == 5
    return adjacency, {
        "center_pendant": [center, *center_pendant_vertices],
        "inner_pendant": [left_inner, *inner_pendant],
        "outer_pendant": [left_outer, *outer_pendant],
        "inner_spine": [center, *inner_spine],
        "outer_spine": [left_inner, *outer_spine],
    }


def main() -> None:
    random_source = random.Random(0x993_20260825)
    samples = []
    endpoint_minima = [0] * 4
    boundary7_minima = [0] * 4
    interior_strict_minima = [0] * 4
    vertex_endpoint_global_minima = [0] * 4
    internal_below_both_vertex_endpoints = [0] * 4
    plateau_checks = 0
    plateau_failures = []
    all_edge_endpoint_domination_failures = {
        orbit: [0] * 4
        for orbit in ("center_pendant", "inner_pendant", "outer_pendant", "inner_spine", "outer_spine")
    }
    all_edge_checks = {orbit: 0 for orbit in all_edge_endpoint_domination_failures}
    all_edge_internal_minimum_locations = {
        orbit: [{"adjacent": 0, "within_six": 0, "deep": 0} for _ in range(4)]
        for orbit in all_edge_endpoint_domination_failures
    }
    for sample in range(256):
        other = tuple(random_source.randint(2, 18) for _ in range(10))
        center_pendant = random_source.randint(2, 30)
        adjacency, edge_paths = five_cubic_path(center_pendant, other)
        path_vertices = edge_paths["center_pendant"][1:]
        core = forest_poly(adjacency)
        vertex_endpoint_rows = [
            deltas03(core, forest_poly(adjacency, frozenset({0}))),
            deltas03(core, forest_poly(adjacency, frozenset({path_vertices[-1]}))),
        ]
        rows = []
        for position, root in enumerate(path_vertices[:-1], start=1):
            deleted = forest_poly(adjacency, frozenset({root}))
            rows.append({
                "position": position,
                "near_gap": position - 1,
                "tail": center_pendant - position,
                "h6": deleted[6],
                "h7": deleted[7],
                "delta": deltas03(core, deleted),
            })
        for rank in range(4):
            minimum = min(row["delta"][rank] for row in rows)
            minimizers = [row["position"] for row in rows if row["delta"][rank] == minimum]
            if any(position in (1, center_pendant - 1) for position in minimizers):
                endpoint_minima[rank] += 1
            if any(min(position - 1, center_pendant - position) <= 6 for position in minimizers):
                boundary7_minima[rank] += 1
            if all(1 < position < center_pendant - 1 for position in minimizers):
                interior_strict_minima[rank] += 1
            endpoint_value = min(row[rank] for row in vertex_endpoint_rows)
            if endpoint_value <= minimum:
                vertex_endpoint_global_minima[rank] += 1
            if minimum < endpoint_value:
                internal_below_both_vertex_endpoints[rank] += 1
        stable = [row for row in rows if row["near_gap"] >= 7 and row["tail"] >= 7]
        if len(stable) >= 2:
            plateau_checks += 1
            first = (stable[0]["h6"], stable[0]["h7"], stable[0]["delta"])
            if any((row["h6"], row["h7"], row["delta"]) != first for row in stable[1:]):
                plateau_failures.append(sample)
        if sample < 16:
            samples.append({
                "other_lengths": other,
                "center_pendant": center_pendant,
                "vertex_endpoint_delta": vertex_endpoint_rows,
                "rows": rows,
            })

        for orbit, vertices in edge_paths.items():
            endpoint_rows = [
                deltas03(core, forest_poly(adjacency, frozenset({vertices[0]}))),
                deltas03(core, forest_poly(adjacency, frozenset({vertices[-1]}))),
            ]
            internal_rows = [
                deltas03(core, forest_poly(adjacency, frozenset({vertex})))
                for vertex in vertices[1:-1]
            ]
            assert internal_rows
            all_edge_checks[orbit] += 1
            for rank in range(4):
                endpoint_minimum = min(row[rank] for row in endpoint_rows)
                internal_minimum = min(row[rank] for row in internal_rows)
                if internal_minimum < endpoint_minimum:
                    all_edge_endpoint_domination_failures[orbit][rank] += 1
                minimizers = [
                    index
                    for index, row in enumerate(internal_rows, start=1)
                    if row[rank] == internal_minimum
                ]
                boundary_distance = min(
                    min(index, len(vertices) - 1 - index)
                    for index in minimizers
                )
                bucket = "adjacent" if boundary_distance == 1 else "within_six" if boundary_distance <= 6 else "deep"
                all_edge_internal_minimum_locations[orbit][rank][bucket] += 1

    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-internal-root-shape-probe-agent-v1",
        "status": "PROBE_ONLY",
        "sample_count": 256,
        "endpoint_minimum_counts_by_delta": endpoint_minima,
        "within_six_of_endpoint_minimum_counts_by_delta": boundary7_minima,
        "strictly_nonendpoint_minimum_counts_by_delta": interior_strict_minima,
        "vertex_endpoint_global_minimum_counts_by_delta": vertex_endpoint_global_minima,
        "internal_below_both_vertex_endpoints_by_delta": internal_below_both_vertex_endpoints,
        "stable_plateau_checks": plateau_checks,
        "stable_plateau_failures": plateau_failures,
        "all_edge_endpoint_domination_checks": all_edge_checks,
        "all_edge_internal_below_both_endpoints_by_delta": all_edge_endpoint_domination_failures,
        "all_edge_internal_minimum_locations": all_edge_internal_minimum_locations,
        "sample_rows": samples,
        "scope_guard": "Exploratory exact arithmetic only; random samples do not prove an orbit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ENDPOINT_MIN", endpoint_minima)
    print("BOUNDARY7_MIN", boundary7_minima)
    print("STRICT_INTERIOR_MIN", interior_strict_minima)
    print("VERTEX_ENDPOINT_GLOBAL_MIN", vertex_endpoint_global_minima)
    print("INTERNAL_BELOW_BOTH_VERTEX_ENDPOINTS", internal_below_both_vertex_endpoints)
    print("PLATEAU", plateau_checks, len(plateau_failures))
    print("ALL_EDGE_INTERNAL_BELOW_BOTH_ENDPOINTS", all_edge_endpoint_domination_failures)
    print("ALL_EDGE_INTERNAL_MINIMUM_LOCATIONS", all_edge_internal_minimum_locations)


if __name__ == "__main__":
    main()
