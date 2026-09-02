#!/usr/bin/env python3
"""Exact positive-core census for the n=23, B2=38 rooted profile.

The fixed excess partition is (8,4,3,2,1,1,1,1).  Every tree with this
degree sequence is obtained from a tree on the eight positive-excess
vertices by attaching the forced number of leaves.  Prüfer codes enumerate
all labeled positive cores exactly.
"""
from __future__ import annotations

import heapq
import itertools
import json
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_b2_38_root_profile_core_exact_20260817.json"
WEIGHTS = (8, 4, 3, 2, 1, 1, 1, 1)


def decode_prufer(sequence, order):
    degree = [1] * order
    for vertex in sequence:
        degree[vertex] += 1
    leaves = [vertex for vertex, value in enumerate(degree) if value == 1]
    heapq.heapify(leaves)
    edges = []
    for vertex in sequence:
        leaf = heapq.heappop(leaves)
        edges.append((leaf, vertex))
        degree[leaf] -= 1
        degree[vertex] -= 1
        if degree[vertex] == 1:
            heapq.heappush(leaves, vertex)
    first = heapq.heappop(leaves)
    second = heapq.heappop(leaves)
    edges.append((first, second))
    return tuple(edges)


def statistics(edges):
    order = len(WEIGHTS)
    core_degree = [0] * order
    neighbors = [[] for _ in range(order)]
    edge_correlation = 0
    brooms = 0
    for left, right in edges:
        x, y = WEIGHTS[left], WEIGHTS[right]
        core_degree[left] += 1
        core_degree[right] += 1
        neighbors[left].append(y)
        neighbors[right].append(x)
        edge_correlation += x * y
        brooms += comb(x, 2) * y + comb(y, 2) * x
    # Full degrees are x+1, regardless of the positive-core shape.
    stars = sum(comb(value + 1, 4) for value in WEIGHTS)
    paths = 0
    for values in neighbors:
        paths += sum(
            values[i] * values[j]
            for i in range(len(values))
            for j in range(i + 1, len(values))
        )
    connected_four = stars + brooms + paths
    leaf_slots = [WEIGHTS[i] + 1 - core_degree[i] for i in range(order)]
    return core_degree, leaf_slots, edge_correlation, connected_four, {
        "stars": stars,
        "brooms": brooms,
        "paths": paths,
    }


def main() -> int:
    order = len(WEIGHTS)
    assert sum(WEIGHTS) + 2 == 23
    assert sum(comb(value, 2) for value in WEIGHTS) == 38
    assert sum(comb(value, 3) for value in WEIGHTS) == 61

    total_codes = order ** (order - 2)
    feasible_codes = 0
    root_feasible_codes = 0
    by_edge = {}
    for sequence in itertools.product(range(order), repeat=order - 2):
        occurrences = [0] * order
        for vertex in sequence:
            occurrences[vertex] += 1
        core_degree = [value + 1 for value in occurrences]
        if any(core_degree[i] > WEIGHTS[i] + 1 for i in range(order)):
            continue
        feasible_codes += 1
        # The r=1, x=4 profile requires the root q to use a leaf slot at a
        # weight-four vertex.  Here vertex 1 is the unique weight-four vertex.
        if core_degree[1] > WEIGHTS[1]:
            continue
        root_feasible_codes += 1
        edges = decode_prufer(sequence, order)
        checked_degree, leaf_slots, edge, connected_four, shapes = statistics(edges)
        assert checked_degree == core_degree
        assert all(value >= 0 for value in leaf_slots)
        assert leaf_slots[1] >= 1
        current = by_edge.get(edge)
        if current is None or connected_four < current["V_min"]:
            by_edge[edge] = {
                "V_min": connected_four,
                "sequence": list(sequence),
                "core_edges": [list(item) for item in edges],
                "core_degree": core_degree,
                "leaf_slots": leaf_slots,
                "shape_terms": shapes,
            }

    assert total_codes == 262144
    assert feasible_codes > 0
    assert root_feasible_codes > 0
    maximum_edge = max(by_edge)
    assert maximum_edge == 104
    assert by_edge[maximum_edge]["V_min"] == 644
    rows = [
        {"E": edge, **by_edge[edge]}
        for edge in sorted(by_edge, reverse=True)
    ]
    report = {
        "status": "PASS_EXACT_B2_38_ROOT_PROFILE_POSITIVE_CORE_CENSUS",
        "scope": {
            "n": 23,
            "B2": 38,
            "B3": 61,
            "excess_partition": list(WEIGHTS),
            "root_profile": "r=1 and the root is a leaf adjacent to the unique x=4 vertex",
        },
        "method": "all labeled Prüfer codes on the eight positive-excess vertices, with exact degree-cap and root-leaf-slot filters",
        "total_prufer_codes": total_codes,
        "degree_feasible_codes": feasible_codes,
        "root_feasible_codes": root_feasible_codes,
        "edge_levels": len(rows),
        "E_max": maximum_edge,
        "V_at_E_max": by_edge[maximum_edge]["V_min"],
        "rows": rows,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "rows"}, indent=2))
    print("edge rows", [(row["E"], row["V_min"]) for row in rows])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
