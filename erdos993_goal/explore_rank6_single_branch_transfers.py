#!/usr/bin/env python3
"""Test one-subtree transfers between adjacent branch-core vertices."""

from __future__ import annotations

import argparse

import networkx as nx

from explore_rank6_branch_merge_shifts import (
    branch_pairs,
    strong_margin,
)


def transfer(tree, source, target, path, moving_neighbor):
    shifted = tree.copy()
    shifted.remove_edge(source, moving_neighbor)
    shifted.add_edge(target, moving_neighbor)
    assert nx.is_tree(shifted)
    return shifted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=18)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--maximum-trees", type=int, default=500)
    parser.add_argument("--failure-limit", type=int, default=10)
    args = parser.parse_args()

    scanned = 0
    rooted = 0
    failures = []
    largest_best_delta = None
    largest_witness = None
    for tree_index, tree in enumerate(nx.nonisomorphic_trees(args.order)):
        if tree_index < args.start_index:
            continue
        if scanned >= args.maximum_trees:
            break
        scanned += 1
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
                    source_path_neighbor = (
                        path[-2] if source == path[-1] else path[1]
                    )
                    for moving in tree.neighbors(source):
                        if moving == source_path_neighbor:
                            continue
                        shifted = transfer(
                            tree, source, target, path, moving
                        )
                        new = strong_margin(shifted, root)
                        candidates.append(
                            (
                                new - old,
                                source,
                                target,
                                moving,
                                sum(
                                    shifted.degree(v) >= 3
                                    for v in shifted
                                ),
                                nx.to_graph6_bytes(
                                    shifted, header=False
                                )
                                .decode("ascii")
                                .strip(),
                            )
                        )
            if not candidates:
                continue
            best = min(candidates)
            if (
                largest_best_delta is None
                or best[0] > largest_best_delta
            ):
                largest_best_delta = best[0]
                largest_witness = (
                    tree_index,
                    root,
                    old,
                    best,
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip(),
                )
            if best[0] >= 0:
                failures.append(
                    (
                        tree_index,
                        root,
                        old,
                        best,
                        nx.to_graph6_bytes(tree, header=False)
                        .decode("ascii")
                        .strip(),
                    )
                )
                if len(failures) >= args.failure_limit:
                    break
        if len(failures) >= args.failure_limit:
            break

    print(
        f"n={args.order} scanned={scanned:,} rooted={rooted:,} "
        f"largest_best_delta={largest_best_delta} "
        f"largest_witness={largest_witness}"
    )
    print(f"failures={len(failures)} first={failures[:3]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
