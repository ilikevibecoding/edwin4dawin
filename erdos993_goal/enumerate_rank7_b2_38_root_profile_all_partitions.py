#!/usr/bin/env python3
"""Exact all-compatible-partition core census for n=23, B2=38, r=1, x=4."""
from __future__ import annotations

import heapq
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_b2_38_root_profile_all_partitions_exact_20260817.json"
PARTITIONS = (
    (8, 4, 3, 2, 1, 1, 1, 1),
    (8, 4, 2, 2, 2, 2, 1),
    (7, 5, 4, 2, 1, 1, 1),
    (6, 6, 4, 2, 2, 1),
    (6, 5, 4, 4, 2),
)


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
    edges.append((heapq.heappop(leaves), heapq.heappop(leaves)))
    return tuple(edges)


def statistics(weights, edges):
    order = len(weights)
    core_degree = [0] * order
    neighbors = [[] for _ in range(order)]
    edge_correlation = 0
    brooms = 0
    for left, right in edges:
        x, y = weights[left], weights[right]
        core_degree[left] += 1
        core_degree[right] += 1
        neighbors[left].append(y)
        neighbors[right].append(x)
        edge_correlation += x * y
        brooms += comb(x, 2) * y + comb(y, 2) * x
    stars = sum(comb(value + 1, 4) for value in weights)
    paths = sum(
        values[i] * values[j]
        for values in neighbors
        for i in range(len(values))
        for j in range(i + 1, len(values))
    )
    leaf_slots = [weights[i] + 1 - core_degree[i] for i in range(order)]
    return core_degree, leaf_slots, edge_correlation, stars + brooms + paths, {
        "stars": stars,
        "brooms": brooms,
        "paths": paths,
    }


def enumerate_partition(weights):
    order = len(weights)
    total_codes = order ** (order - 2) if order >= 2 else 1
    degree_feasible = root_feasible = 0
    by_edge = {}
    sequences = itertools.product(range(order), repeat=max(order - 2, 0))
    for sequence in sequences:
        occurrences = [0] * order
        for vertex in sequence:
            occurrences[vertex] += 1
        core_degree = [value + 1 for value in occurrences]
        if any(core_degree[i] > weights[i] + 1 for i in range(order)):
            continue
        degree_feasible += 1
        # The distinguished root is a leaf at some x=4 vertex.
        if not any(
            weights[i] == 4 and core_degree[i] <= weights[i]
            for i in range(order)
        ):
            continue
        root_feasible += 1
        edges = decode_prufer(sequence, order)
        checked_degree, leaf_slots, edge, connected_four, shapes = statistics(weights, edges)
        assert checked_degree == core_degree
        assert all(value >= 0 for value in leaf_slots)
        assert any(weights[i] == 4 and leaf_slots[i] >= 1 for i in range(order))
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
    return {
        "partition": list(weights),
        "B2": sum(comb(value, 2) for value in weights),
        "B3": sum(comb(value, 3) for value in weights),
        "total_codes": total_codes,
        "degree_feasible_codes": degree_feasible,
        "root_feasible_codes": root_feasible,
        "edge_rows": {str(edge): by_edge[edge] for edge in sorted(by_edge, reverse=True)},
    }


def exact_c5(order, beta, gamma, edge, connected_four, c4):
    acoef = (
        sp.Rational(3, 2) * order**3
        - 20 * order**2
        + sp.Rational(133, 2) * order
        - 20
    )
    bcoef = 4 * order**2 - 35 * order + 49
    ccoef = 4 * order**2 - 30 * order + 34
    margin = (
        acoef * beta
        - bcoef * gamma
        - ccoef * (edge - (order - 3))
        + 5 * (order - 3) * (connected_four - (order - 4))
    )
    return sp.factor(
        ((order - 7) * (order - 8) * c4 + margin) / (5 * (order - 3))
    )


def main() -> int:
    order, beta = 23, 38
    c4_constant = comb(order - 3, 4) + (order - 5) * beta + (order - 3)
    assert c4_constant == 5549
    partition_reports = [enumerate_partition(weights) for weights in PARTITIONS]
    combined = {}
    for report in partition_reports:
        assert report["B2"] == beta
        gamma = report["B3"]
        for edge_text, row in report["edge_rows"].items():
            edge = int(edge_text)
            c4 = c4_constant - gamma - edge
            c5 = exact_c5(order, beta, gamma, edge, row["V_min"], c4)
            candidate = {
                "c5_min": str(c5),
                "partition": report["partition"],
                "B3": gamma,
                "E": edge,
                "V_min": row["V_min"],
                "core_witness": row,
            }
            current = combined.get(c4)
            if current is None or c5 < sp.Rational(current["c5_min"]):
                combined[c4] = candidate

    critical = {}
    for c4 in range(5384, 5396):
        if c4 in combined:
            critical[str(c4)] = combined[c4]
        else:
            critical[str(c4)] = {"status": "IMPOSSIBLE_FOR_ALL_COMPATIBLE_PARTITIONS"}

    # The second frontier is essential at c4=5385.
    assert critical["5384"]["partition"] == list(PARTITIONS[0])
    assert critical["5384"]["V_min"] == 644
    assert critical["5385"]["partition"] == list(PARTITIONS[1])
    assert critical["5385"]["E"] == 104
    assert critical["5385"]["V_min"] > 0

    report = {
        "status": "PASS_EXACT_B2_38_ROOT_PROFILE_ALL_COMPATIBLE_PARTITIONS",
        "scope": {
            "n": order,
            "B2": beta,
            "root_profile": "r=1 and the root is a leaf adjacent to an x=4 vertex",
        },
        "method": "exact Prüfer census of every compatible excess partition, with exact V and exact motif-identity c5",
        "compatible_partitions": partition_reports,
        "critical_c4_rows": critical,
        "all_c4_rows": {str(value): combined[value] for value in sorted(combined)},
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary = {
        "status": report["status"],
        "partition_counts": [
            {
                "partition": item["partition"],
                "total": item["total_codes"],
                "degree_feasible": item["degree_feasible_codes"],
                "root_feasible": item["root_feasible_codes"],
                "edge_levels": len(item["edge_rows"]),
            }
            for item in partition_reports
        ],
        "critical": {
            key: (
                value
                if value.get("status")
                else {
                    "c5_min": value["c5_min"],
                    "partition": value["partition"],
                    "B3": value["B3"],
                    "E": value["E"],
                    "V_min": value["V_min"],
                }
            )
            for key, value in critical.items()
        },
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
