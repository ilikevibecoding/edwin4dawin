#!/usr/bin/env python3
"""Verify the deepest-support structure and factorization on small trees."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from random_leaf_gsb_local_payment import tree_polynomial


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])
ONE_PLUS_X = fmpz_poly([1, 1])


def induced_polynomial(graph: nx.Graph, vertices: set[int]) -> fmpz_poly:
    ordered = sorted(vertices)
    relabel = {old: new for new, old in enumerate(ordered)}
    adjacency = [
        [
            relabel[neighbor]
            for neighbor in graph[old]
            if neighbor in relabel
        ]
        for old in ordered
    ]
    return tree_polynomial(adjacency)


def component_away_from(
    graph: nx.Graph, start: int, blocked: int
) -> set[int]:
    seen = {blocked}
    stack = [start]
    component = set()
    while stack:
        vertex = stack.pop()
        if vertex in seen:
            continue
        seen.add(vertex)
        component.add(vertex)
        stack.extend(graph[vertex])
    return component


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    configurations = factor_checks = 0
    failures = []
    maximum_side_height = 0

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        tree_count = 0
        for source in trees:
            tree_count += 1
            graph = nx.convert_node_labels_to_integers(
                source, ordering="sorted"
            )
            for center in nx.center(graph):
                distances = nx.single_source_shortest_path_length(
                    graph, center
                )
                height = max(distances.values())
                deepest_leaves = [
                    vertex
                    for vertex, distance in distances.items()
                    if distance == height and graph.degree(vertex) == 1
                ]
                for leaf in deepest_leaves:
                    configurations += 1
                    if height < 2:
                        continue
                    path = nx.shortest_path(graph, center, leaf)
                    support = path[-2]
                    root = path[-3]
                    parent = path[-4] if height >= 3 else None

                    leaf_children = {
                        neighbor
                        for neighbor in graph[support]
                        if distances[neighbor] == height
                    }
                    if leaf not in leaf_children or any(
                        graph.degree(vertex) != 1
                        for vertex in leaf_children
                    ):
                        failures.append(
                            {
                                "type": "support_not_terminal",
                                "order": order,
                                "center": center,
                                "leaf": leaf,
                            }
                        )
                        continue

                    removed = {support, *leaf_children}
                    retained = set(graph) - removed
                    residual = graph.subgraph(retained).copy()
                    side_neighbors = [
                        neighbor
                        for neighbor in residual[root]
                        if neighbor != parent
                    ]
                    side_sizes = []
                    for neighbor in side_neighbors:
                        component = component_away_from(
                            residual, neighbor, root
                        )
                        side_height = max(
                            nx.shortest_path_length(
                                residual, root, vertex
                            )
                            for vertex in component
                        )
                        maximum_side_height = max(
                            maximum_side_height, side_height
                        )
                        if side_height > 2:
                            failures.append(
                                {
                                    "type": "side_branch_too_deep",
                                    "order": order,
                                    "center": center,
                                    "leaf": leaf,
                                    "root": root,
                                    "side_height": side_height,
                                }
                            )
                            continue
                        leaves = component - {neighbor}
                        if any(
                            residual.degree(vertex) != 1
                            or root in residual[vertex]
                            for vertex in leaves
                        ):
                            failures.append(
                                {
                                    "type": "side_branch_not_star",
                                    "order": order,
                                    "center": center,
                                    "leaf": leaf,
                                    "root": root,
                                }
                            )
                            continue
                        side_sizes.append(len(leaves))

                    inward = (
                        set()
                        if parent is None
                        else component_away_from(residual, parent, root)
                    )
                    p_poly = induced_polynomial(residual, inward)
                    e_poly = (
                        ONE
                        if parent is None
                        else induced_polynomial(
                            residual, inward - {parent}
                        )
                    )
                    k_poly = ONE
                    total_leaves = 0
                    for leaves in side_sizes:
                        k_poly *= ONE_PLUS_X**leaves + X
                        total_leaves += leaves
                    l_poly = ONE_PLUS_X**total_leaves

                    deletion = induced_polynomial(
                        residual, retained - {root}
                    )
                    closed = {root, *residual[root]}
                    link = induced_polynomial(
                        residual, retained - closed
                    )
                    whole = induced_polynomial(residual, retained)
                    factor_checks += 3
                    if deletion != p_poly * k_poly:
                        failures.append(
                            {
                                "type": "deletion_factorization",
                                "order": order,
                                "center": center,
                                "leaf": leaf,
                            }
                        )
                    if link != e_poly * l_poly:
                        failures.append(
                            {
                                "type": "link_factorization",
                                "order": order,
                                "center": center,
                                "leaf": leaf,
                            }
                        )
                    if whole != deletion + X * link:
                        failures.append(
                            {
                                "type": "root_recursion",
                                "order": order,
                                "center": center,
                                "leaf": leaf,
                            }
                        )
        print(
            f"order={order} trees={tree_count} "
            f"configurations={configurations} failures={len(failures)}",
            flush=True,
        )

    report = {
        "status": "PASS" if not failures else "FAIL",
        "max_order": args.max_order,
        "configurations": configurations,
        "factor_checks": factor_checks,
        "maximum_side_height": maximum_side_height,
        "failures": failures[:10],
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

