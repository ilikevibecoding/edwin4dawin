#!/usr/bin/env python3
"""Independent small-order audit of the all-root weighted-core tree DP.

This deliberately reconstructs each expanded tree as an ordinary edge list and
counts independent sets by exhaustive bit masks.  It then compares the literal
full-tree and closed-neighbourhood-deletion polynomials with the optimized
weighted-core routines used by the n=23 certificate.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from itertools import combinations
from math import comb
from pathlib import Path

from enumerate_rank7_b2_42_root_profile_all_partitions import (
    multiset_permutations,
)
from verify_rank7_allroots_high_correlation_direct_delta import (
    delete_closed_neighborhood_core_root_polynomial,
)
from verify_rank7_r1_high_correlation_direct_delta import (
    delete_root_and_neighbor_polynomial,
    full_tree_polynomial,
    partitions,
    tree_shapes,
)


def expanded_tree(adjacency, leaf_slots):
    order = len(adjacency)
    edges = []
    for u in range(order):
        for v in adjacency[u]:
            if u < v:
                edges.append((u, v))
    leaves_by_core = [[] for _ in range(order)]
    next_vertex = order
    for u, count in enumerate(leaf_slots):
        for _ in range(count):
            leaves_by_core[u].append(next_vertex)
            edges.append((u, next_vertex))
            next_vertex += 1
    return next_vertex, tuple(edges), tuple(tuple(row) for row in leaves_by_core)


def brute_independence_polynomial(n, edges, deleted=()):
    deleted_mask = sum(1 << v for v in deleted)
    available = [v for v in range(n) if not (deleted_mask >> v) & 1]
    coefficients = [0] * (len(available) + 1)
    for subset_size in range(len(available) + 1):
        for chosen in combinations(available, subset_size):
            mask = sum(1 << v for v in chosen)
            if all(not ((mask >> u) & 1 and (mask >> v) & 1) for u, v in edges):
                coefficients[subset_size] += 1
    while len(coefficients) > 1 and coefficients[-1] == 0:
        coefficients.pop()
    return tuple(coefficients)


def closed_neighborhood(root, n, edges):
    deleted = {root}
    for u, v in edges:
        if u == root:
            deleted.add(v)
        elif v == root:
            deleted.add(u)
    return tuple(sorted(deleted))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=10)
    parser.add_argument("--b2-min", type=int, default=6)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    by_beta = defaultdict(list)
    for part in partitions(args.n - 2, args.n - 2):
        beta = sum(comb(value, 2) for value in part)
        if beta >= args.b2_min:
            by_beta[beta].append(tuple(part))

    counts = {"weighted_cores": 0, "full_checks": 0, "core_root_checks": 0,
              "pendant_root_checks": 0}
    for beta in sorted(by_beta, reverse=True):
        for partition in by_beta[beta]:
            order = len(partition)
            for weights in multiset_permutations(partition):
                for tree in tree_shapes(order):
                    degrees = tuple(tree.degree(v) for v in range(order))
                    if any(degrees[v] > weights[v] + 1 for v in range(order)):
                        continue
                    leaf_slots = tuple(weights[v] + 1 - degrees[v] for v in range(order))
                    adjacency = tuple(tuple(tree.neighbors(v)) for v in range(order))
                    actual_n, edges, leaves_by_core = expanded_tree(adjacency, leaf_slots)
                    assert actual_n == args.n
                    brute_full = brute_independence_polynomial(actual_n, edges)
                    assert full_tree_polynomial(adjacency, leaf_slots) == brute_full[:8]
                    counts["weighted_cores"] += 1
                    counts["full_checks"] += 1

                    for root in range(order):
                        optimized = delete_closed_neighborhood_core_root_polynomial(
                            adjacency, leaf_slots, root
                        )
                        brute = brute_independence_polynomial(
                            actual_n, edges, closed_neighborhood(root, actual_n, edges)
                        )
                        assert optimized == brute[: len(optimized)], (
                            beta, partition, root, optimized, brute
                        )
                        counts["core_root_checks"] += 1

                        if leaves_by_core[root]:
                            leaf = leaves_by_core[root][0]
                            optimized = delete_root_and_neighbor_polynomial(
                                adjacency, leaf_slots, root
                            )
                            brute = brute_independence_polynomial(
                                actual_n, edges, closed_neighborhood(leaf, actual_n, edges)
                            )
                            assert optimized == brute[: len(optimized)], (
                                beta, partition, leaf, optimized, brute
                            )
                            counts["pendant_root_checks"] += 1

    report = {
        "status": "PASS_INDEPENDENT_EXPLICIT_TREE_AUDIT",
        "scope": {"n": args.n, "B2_min": args.b2_min},
        "method": "explicit expanded edge lists plus exhaustive independent-subset masks",
        "counts": counts,
    }
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
