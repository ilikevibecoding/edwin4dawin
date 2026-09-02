#!/usr/bin/env python3
"""Test branch-merging tree shifts against the strong rank-6 margin.

For branch vertices u,v whose connecting path has only degree-2
internal vertices, a generalized tree shift moves every off-path
neighbor of one endpoint to the other endpoint.  The shifted endpoint
becomes a leaf, so the number of branch vertices drops by one.

This script asks whether every rooted non-spider tree has at least one
such shift that does not increase S_6.  It is exploratory, not a proof.
"""

from __future__ import annotations

import argparse

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(poly, rank):
    return poly[rank] if rank < len(poly) else 0


def strong_margin(tree, root):
    engine = MaskIndependencePolynomial(tree)
    mask = (1 << len(tree)) - 1
    whole = engine.polynomial(mask)
    deleted = engine.polynomial(
        mask & ~(1 << engine.position[root])
    )
    d, e = coefficient(whole, 4), coefficient(whole, 5)
    h, k = coefficient(deleted, 4), coefficient(deleted, 5)
    return d * (2 * e + d) - 24 * (e * h - d * k)


def branch_pairs(tree):
    branches = [vertex for vertex in tree if tree.degree(vertex) >= 3]
    for index, left in enumerate(branches):
        for right in branches[index + 1 :]:
            path = nx.shortest_path(tree, left, right)
            if all(tree.degree(vertex) == 2 for vertex in path[1:-1]):
                yield left, right, path


def shift(tree, source, target, path):
    shifted = tree.copy()
    source_path_neighbor = (
        path[-2] if source == path[-1] else path[1]
    )
    moving = [
        neighbor
        for neighbor in tree.neighbors(source)
        if neighbor != source_path_neighbor
    ]
    for neighbor in moving:
        shifted.remove_edge(source, neighbor)
        shifted.add_edge(target, neighbor)
    assert nx.is_tree(shifted)
    assert shifted.degree(source) == 1
    return shifted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=8)
    parser.add_argument("--maximum-order", type=int, default=13)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--maximum-trees", type=int)
    parser.add_argument("--failure-limit", type=int, default=10)
    args = parser.parse_args()

    for order in range(args.minimum_order, args.maximum_order + 1):
        rooted = 0
        eligible = 0
        failures = []
        largest_best_delta = None
        largest_witness = None
        direction_stats = {
            "toward-root": 0,
            "away-root": 0,
            "either": 0,
        }
        scanned_trees = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            if tree_index < args.start_index:
                continue
            if (
                args.maximum_trees is not None
                and scanned_trees >= args.maximum_trees
            ):
                break
            scanned_trees += 1
            if sum(tree.degree(v) >= 3 for v in tree) < 2:
                continue
            pairs = list(branch_pairs(tree))
            if not pairs:
                continue
            for root in (v for v in tree if tree.degree(v) == 1):
                rooted += 1
                old = strong_margin(tree, root)
                candidates = []
                for left, right, path in pairs:
                    for source, target in ((left, right), (right, left)):
                        shifted = shift(tree, source, target, path)
                        assert (
                            sum(shifted.degree(v) >= 3 for v in shifted)
                            < sum(tree.degree(v) >= 3 for v in tree)
                        )
                        new = strong_margin(shifted, root)
                        delta = new - old
                        root_distance_source = nx.shortest_path_length(
                            tree, root, source
                        )
                        root_distance_target = nx.shortest_path_length(
                            tree, root, target
                        )
                        direction = (
                            "toward-root"
                            if root_distance_target < root_distance_source
                            else "away-root"
                        )
                        candidates.append(
                            (
                                delta,
                                direction,
                                source,
                                target,
                                nx.to_graph6_bytes(
                                    shifted, header=False
                                )
                                .decode("ascii")
                                .strip(),
                            )
                        )
                if not candidates:
                    continue
                eligible += 1
                best = min(candidates)
                if (
                    largest_best_delta is None
                    or best[0] > largest_best_delta
                ):
                    largest_best_delta = best[0]
                    largest_witness = (
                        tree_index,
                        root,
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                        old,
                        best,
                    )
                nonincreasing = [
                    candidate
                    for candidate in candidates
                    if candidate[0] <= 0
                ]
                directions = {
                    candidate[1] for candidate in nonincreasing
                }
                if not nonincreasing:
                    failures.append(
                        (
                            tree_index,
                            root,
                            nx.to_graph6_bytes(tree, header=False)
                            .decode("ascii")
                            .strip(),
                            old,
                            min(candidates),
                        )
                    )
                    if len(failures) >= args.failure_limit:
                        break
                elif len(directions) == 2:
                    direction_stats["either"] += 1
                else:
                    direction_stats[next(iter(directions))] += 1
            if len(failures) >= args.failure_limit:
                break
        print(
            f"n={order} rooted={rooted:,} eligible={eligible:,} "
            f"largest_best_delta={largest_best_delta} "
            f"largest_witness={largest_witness}",
            flush=True,
        )
        print(
            f"  failures={len(failures)} first={failures[:3]} "
            f"directions={direction_stats}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
