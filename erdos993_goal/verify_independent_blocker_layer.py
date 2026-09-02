#!/usr/bin/env python3
"""Verify the independent-blocker identities on every small tree root."""

from __future__ import annotations

import argparse
import json
from math import comb
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


def independent_masks(graph: nx.Graph, vertices: list[int]):
    local = {vertex: index for index, vertex in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for vertex, index in local.items():
        for neighbor in graph[vertex]:
            if neighbor in local:
                adjacency[index] |= 1 << local[neighbor]
    for mask in range(1 << len(vertices)):
        remaining = mask
        valid = True
        while remaining:
            bit = remaining & -remaining
            index = bit.bit_length() - 1
            remaining ^= bit
            if adjacency[index] & remaining:
                valid = False
                break
        if valid:
            yield mask


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=13)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    trees_checked = roots_checked = polynomial_checks = 0
    independent_sets_summed = 0
    failures = []

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for source in trees:
            order_trees += 1
            trees_checked += 1
            graph = nx.convert_node_labels_to_integers(
                source, ordering="sorted"
            )
            all_vertices = set(graph)
            for root in graph:
                roots_checked += 1
                neighbors = sorted(graph[root])
                classes = [
                    set(graph[neighbor]) - {root}
                    for neighbor in neighbors
                ]
                blocker_union = set().union(*classes) if classes else set()
                lower = sorted(
                    all_vertices - {root} - set(neighbors) - blocker_union
                )

                if sum(map(len, classes)) != len(blocker_union):
                    failures.append(
                        {
                            "type": "blocker_classes_overlap",
                            "order": order,
                            "root": root,
                        }
                    )
                    continue
                if graph.subgraph(blocker_union).number_of_edges():
                    failures.append(
                        {
                            "type": "blocker_union_not_independent",
                            "order": order,
                            "root": root,
                        }
                    )
                    continue
                if any(
                    len(set(graph[vertex]) & blocker_union) > 1
                    for vertex in lower
                ):
                    failures.append(
                        {
                            "type": "lower_vertex_blocks_twice",
                            "order": order,
                            "root": root,
                        }
                    )
                    continue

                reconstructed_deletion = fmpz_poly()
                reconstructed_link = fmpz_poly()
                for mask in independent_masks(graph, lower):
                    independent_sets_summed += 1
                    selected = {
                        lower[index]
                        for index in range(len(lower))
                        if mask & (1 << index)
                    }
                    available = [
                        sum(
                            not (set(graph[blocker]) & selected)
                            for blocker in blocker_class
                        )
                        for blocker_class in classes
                    ]
                    deletion_piece = ONE
                    for count in available:
                        deletion_piece *= (
                            fmpz_poly(
                                [comb(count, rank) for rank in range(count + 1)]
                            )
                            + X
                        )
                    shift = X ** len(selected)
                    reconstructed_deletion += shift * deletion_piece
                    reconstructed_link += (
                        shift * ONE_PLUS_X ** sum(available)
                    )

                actual_deletion = induced_polynomial(
                    graph, all_vertices - {root}
                )
                actual_link = induced_polynomial(
                    graph, all_vertices - {root} - set(neighbors)
                )
                whole = induced_polynomial(graph, all_vertices)
                polynomial_checks += 3
                if reconstructed_deletion != actual_deletion:
                    failures.append(
                        {
                            "type": "deletion_identity",
                            "order": order,
                            "root": root,
                        }
                    )
                if reconstructed_link != actual_link:
                    failures.append(
                        {
                            "type": "link_identity",
                            "order": order,
                            "root": root,
                        }
                    )
                if whole != actual_deletion + X * actual_link:
                    failures.append(
                        {
                            "type": "root_recursion",
                            "order": order,
                            "root": root,
                        }
                    )
        print(
            f"order={order} trees={order_trees} roots={roots_checked} "
            f"summands={independent_sets_summed} failures={len(failures)}",
            flush=True,
        )

    report = {
        "status": "PASS" if not failures else "FAIL",
        "max_order": args.max_order,
        "trees_checked": trees_checked,
        "roots_checked": roots_checked,
        "independent_sets_summed": independent_sets_summed,
        "polynomial_checks": polynomial_checks,
        "failures": failures[:10],
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
