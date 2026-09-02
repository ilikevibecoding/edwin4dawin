#!/usr/bin/env python3
"""Independent exact verification of the depth-64 mixed-forest beam result.

This verifier does not import the search or profiling code.  It reconstructs
every champion tree from its Prüfer code, recomputes its independence
polynomial by rooted-tree dynamic programming, multiplies the forest factors
with exact FLINT integers, and checks the reported unimodality margin.
"""

from __future__ import annotations

import hashlib
import heapq
import json
from pathlib import Path

from flint import fmpz_poly


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "patternboost_mixed_forest_beam_1000x400d64_20260813.json"
REPORT = HERE / "patternboost_mixed_forest_beam_champion_verified_20260813.json"


def prufer_edges(code_one_based: list[int]) -> list[tuple[int, int]]:
    code = [value - 1 for value in code_one_based]
    n = len(code) + 2
    degree = [1] * n
    for value in code:
        degree[value] += 1
    leaves = [vertex for vertex, value in enumerate(degree) if value == 1]
    heapq.heapify(leaves)
    edges: list[tuple[int, int]] = []
    for value in code:
        leaf = heapq.heappop(leaves)
        edges.append((leaf, value))
        degree[leaf] -= 1
        degree[value] -= 1
        if degree[value] == 1:
            heapq.heappush(leaves, value)
    left = heapq.heappop(leaves)
    right = heapq.heappop(leaves)
    edges.append((left, right))
    assert len(edges) == n - 1
    return edges


def tree_independence_polynomial(code_one_based: list[int]) -> fmpz_poly:
    n = len(code_one_based) + 2
    adjacency = [[] for _ in range(n)]
    for left, right in prufer_edges(code_one_based):
        adjacency[left].append(right)
        adjacency[right].append(left)

    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if parent[neighbor] == -2:
                parent[neighbor] = vertex
                order.append(neighbor)
    assert len(order) == n

    excluded = [fmpz_poly([1]) for _ in range(n)]
    included = [fmpz_poly([0, 1]) for _ in range(n)]
    for vertex in reversed(order):
        out = fmpz_poly([1])
        inn = fmpz_poly([0, 1])
        for child in adjacency[vertex]:
            if parent[child] != vertex:
                continue
            out *= excluded[child] + included[child]
            inn *= excluded[child]
        excluded[vertex] = out
        included[vertex] = inn
    return excluded[0] + included[0]


def coefficients(poly: fmpz_poly) -> list[int]:
    return [int(poly[index]) for index in range(poly.degree() + 1)]


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["status"] == "NO_COUNTEREXAMPLE"
    assert source["tested_mixed_products"] == 24_972_350
    champion = source["champion"]
    assert champion["depth"] == 60
    exact = champion["exact"]
    factors = exact["factors"]
    assert len(factors) == 60

    forest = fmpz_poly([1])
    component_checks = 0
    for factor in factors:
        rebuilt = tree_independence_polynomial(factor["prufer_code_one_based"])
        listed = [int(value) for value in factor["polynomial"]]
        assert coefficients(rebuilt) == listed
        forest *= rebuilt
        component_checks += 1

    values = coefficients(forest)
    first_descent = next(
        index for index in range(len(values) - 1)
        if values[index + 1] < values[index]
    )
    assert all(
        values[index + 1] <= values[index]
        for index in range(first_descent, len(values) - 1)
    )
    best_index = first_descent + 1
    for index in range(first_descent + 2, len(values) - 1):
        if (
            values[index + 1] * values[best_index]
            > values[best_index + 1] * values[index]
        ):
            best_index = index
    # Recheck every maximizing comparison without floating arithmetic.
    for index in range(first_descent + 1, len(values) - 1):
        assert (
            values[index + 1] * values[best_index]
            <= values[best_index + 1] * values[index]
        )

    recorded = exact["profile"]["best_post_descent_ratio"]
    assert first_descent == exact["profile"]["first_descent"] == 1067
    assert best_index == recorded["index"] == 1068
    assert values[best_index + 1] == recorded["numerator"]
    assert values[best_index] == recorded["denominator"]
    assert values[best_index + 1] < values[best_index]
    assert forest.degree() == exact["profile"]["degree"] == 1860
    assert exact["forest_order"] == 3600

    payload = {
        "status": "PASS_INDEPENDENT_EXACT_MIXED_FOREST_CHAMPION_VERIFICATION",
        "source_sha256": hashlib.sha256(source_bytes).hexdigest().upper(),
        "component_trees_rebuilt": component_checks,
        "forest_order": exact["forest_order"],
        "forest_independence_degree": forest.degree(),
        "first_descent": first_descent,
        "first_reascent": None,
        "best_post_descent_ratio": {
            "index": best_index,
            "numerator": values[best_index + 1],
            "denominator": values[best_index],
            "decimal": values[best_index + 1] / values[best_index],
            "strictly_below_one": True,
        },
        "scope_warning": (
            "This independently verifies the reported champion and search "
            "result format. It is finite counterexample-search evidence, not "
            "an all-order proof of forest unimodality."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("component_trees_rebuilt", component_checks)
    print("forest_order", exact["forest_order"])
    print("degree", forest.degree())
    print("best_ratio_decimal", payload["best_post_descent_ratio"]["decimal"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
