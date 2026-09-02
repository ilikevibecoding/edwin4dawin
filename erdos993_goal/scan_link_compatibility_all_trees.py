#!/usr/bin/env python3
"""Audit collective one-deletion link compatibility exactly.

For the quadratic rank-free floor form Q and rank q, the link vectors
x_L over independent (q-1)-sets satisfy

    sum_L x_L = q*x_global.

This scanner tests

    Q(sum_L x_L) >= sum_L Q(x_L)

over all unlabeled trees in scope.
"""

from __future__ import annotations

import argparse
import json
from itertools import combinations
from pathlib import Path

import networkx as nx

from scan_denominator_free_payment_tree_dp import tree_moment_jet


def quadratic(vector: tuple[int, int, int, int, int]) -> int:
    mass, h2, h3, c0, c1 = vector
    return (
        h2 * h2
        + 4 * h2 * c0
        - mass * h3
        - 3 * mass * c1
        - mass * mass
    )


def rank_three_vector(
    residual: int,
    adjacency: list[int],
    edges: list[tuple[int, int]],
) -> tuple[int, int, int, int, int] | None:
    order = residual.bit_count()
    if order < 2:
        return None
    degrees = {}
    rest = residual
    while rest:
        bit = rest & -rest
        vertex = bit.bit_length() - 1
        rest ^= bit
        degrees[vertex] = (adjacency[vertex] & residual).bit_count()
    edge_count = 0
    edge_degree_product = 0
    for left, right in edges:
        if left in degrees and right in degrees:
            edge_count += 1
            edge_degree_product += degrees[left] * degrees[right]
    s1 = 2 * edge_count
    s2 = sum(degree**2 for degree in degrees.values())
    s3 = sum(degree**3 for degree in degrees.values())
    components = order - edge_count
    mass = order * (order - 1) - s1
    if mass == 0:
        return None
    h2 = (
        order * (order - 1) ** 2
        - 2 * (order - 1) * s1
        + s2
    )
    h3 = (
        order * (order - 1) ** 3
        - 3 * (order - 1) ** 2 * s1
        + 3 * (order - 1) * s2
        - s3
    )
    c0 = order * (components - 1) + s2 - s1
    sum_degree_c = (
        (components - 1) * s1
        + 2 * edge_degree_product
        - s2
    )
    c1 = (order - 1) * c0 - sum_degree_c
    return mass, h2, h3, c0, c1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=16)
    parser.add_argument("--maximum-q", type=int, default=3)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    checked_trees = checked_ranks = failures = 0
    best = None
    first_failure = None
    order_counts = {}

    for order in range(2, args.maximum_order + 1):
        order_trees = order_checks = 0
        for tree in nx.nonisomorphic_trees(order):
            order_trees += 1
            adjacency = [0] * order
            closed = [0] * order
            edges = list(tree.edges())
            for left, right in edges:
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
            for vertex in range(order):
                closed[vertex] = adjacency[vertex] | (1 << vertex)
            all_mask = (1 << order) - 1
            global_jet = tree_moment_jet(tree)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()

            for q in range(2, args.maximum_q + 1):
                global_moments = global_jet.get(q)
                if not global_moments or global_moments[1] == 0:
                    continue
                _, mass, h2, h3, edge0, h_edge = global_moments
                global_vector = (
                    mass,
                    h2,
                    h3,
                    mass - edge0,
                    h2 - h_edge,
                )

                vector_sum = [0] * 5
                local_quadratic_sum = 0
                local_links = 0
                for vertices in combinations(range(order), q - 1):
                    mask = 0
                    forbidden = 0
                    valid = True
                    for vertex in vertices:
                        if adjacency[vertex] & mask:
                            valid = False
                            break
                        mask |= 1 << vertex
                        forbidden |= closed[vertex]
                    if not valid:
                        continue
                    vector = rank_three_vector(
                        all_mask & ~forbidden,
                        adjacency,
                        edges,
                    )
                    if vector is None:
                        continue
                    local_links += 1
                    local_quadratic_sum += quadratic(vector)
                    for index in range(5):
                        vector_sum[index] += vector[index]

                expected_sum = tuple(
                    q * value for value in global_vector
                )
                if tuple(vector_sum) != expected_sum:
                    raise AssertionError(
                        (
                            "link sum identity",
                            order,
                            q,
                            code,
                            tuple(vector_sum),
                            expected_sum,
                        )
                    )
                aggregate = quadratic(tuple(vector_sum))
                gap = aggregate - local_quadratic_sum
                normalized_denominator = vector_sum[0] ** 2
                witness = {
                    "tree_order": order,
                    "rank_q": q,
                    "graph6": code,
                    "local_links": local_links,
                    "aggregate_quadratic": aggregate,
                    "local_quadratic_sum": local_quadratic_sum,
                    "compatibility_gap": gap,
                }
                checked_ranks += 1
                order_checks += 1
                if gap < 0:
                    failures += 1
                    if first_failure is None:
                        first_failure = witness
                if (
                    best is None
                    or gap * best[1]
                    < best[0] * normalized_denominator
                ):
                    best = (
                        gap,
                        normalized_denominator,
                        witness,
                    )
        checked_trees += order_trees
        order_counts[str(order)] = {
            "unlabeled_trees": order_trees,
            "checked_ranks": order_checks,
        }
        print(
            f"order={order} trees={order_trees} "
            f"checks={checked_ranks} failures={failures}",
            flush=True,
        )

    if best is None:
        raise AssertionError("no compatibility rank checked")
    report = {
        "status": (
            "NO_LINK_COMPATIBILITY_FAILURE_FOUND"
            if failures == 0
            else "LINK_COMPATIBILITY_FAILURE_FOUND"
        ),
        "scope": (
            "Exact audit over all unlabeled trees and q values in "
            "scope; not a general proof."
        ),
        "maximum_order": args.maximum_order,
        "maximum_q": args.maximum_q,
        "checked_trees": checked_trees,
        "checked_ranks": checked_ranks,
        "failures": failures,
        "minimum_normalized_gap": {
            "exact": f"{best[0]}/{best[1]}",
            "decimal": best[0] / best[1],
            **best[2],
        },
        "first_failure": first_failure,
        "order_counts": order_counts,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
