#!/usr/bin/env python3
"""Stress-test largest-root-branch monotonicity for sibling surplus.

For a rooted tree H with a distinguished leaf w adjacent to the root v,
put, in factorial coordinates at q=3,

    C_3(H,v,w) =
      Ehat_3(H,v) - Ehat_3(H-w,v)
      - 18 Lambdahat_2(H-{v,w}).

Here Ehat_q(H,v) is the sharp-Lambda remainder represented by attaching
one additional designated leaf at v.  The candidate tested is

    C_3(H,v,w) >= C_3(H-B,v,w),

where B is a largest root branch other than the distinguished singleton
branch {w}.  This is a possible simplification of the sibling local-
reserve proof, not a consequence used elsewhere.

Only ranks through five are needed at q=3.  The script uses an exact
tree dynamic program that counts independent subsets and subsets
inducing exactly one edge, avoiding full independence polynomials.
"""

from __future__ import annotations

import argparse
import json
import random
from math import factorial
from pathlib import Path

import networkx as nx

from scan_rooted_cross_W6_lambda_pruning import rooted_quantities
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


MAXIMUM_RANK = 5


def adjacency(tree: nx.Graph) -> list[list[int]]:
    return [list(tree[vertex]) for vertex in range(len(tree))]


def truncated_sequences(
    adj: list[list[int]],
    banned: frozenset[int] = frozenset(),
    maximum_rank: int = MAXIMUM_RANK,
) -> tuple[list[int], list[int]]:
    """Return factorial f_k and g_k through maximum_rank exactly."""
    order = len(adj)
    active = [vertex not in banned for vertex in range(order)]
    seen = [False] * order

    # Forest accumulator indexed by (edge count 0/1, cardinality).
    total = [[[0] * (maximum_rank + 1) for _ in range(2)] for _ in range(1)]
    forest = [[0] * (maximum_rank + 1) for _ in range(2)]
    forest[0][0] = 1

    for start in range(order):
        if not active[start] or seen[start]:
            continue
        parent = [-2] * order
        parent[start] = -1
        seen[start] = True
        stack = [start]
        traversal: list[int] = []
        while stack:
            vertex = stack.pop()
            traversal.append(vertex)
            for neighbor in adj[vertex]:
                if active[neighbor] and not seen[neighbor]:
                    seen[neighbor] = True
                    parent[neighbor] = vertex
                    stack.append(neighbor)

        node_dp: dict[int, list[list[list[int]]]] = {}
        for vertex in reversed(traversal):
            # dp[selected root][edge count 0/1][cardinality]
            dp = [
                [[0] * (maximum_rank + 1) for _ in range(2)]
                for _ in range(2)
            ]
            dp[0][0][0] = 1
            dp[1][0][1] = 1
            for child in adj[vertex]:
                if parent[child] != vertex:
                    continue
                child_dp = node_dp.pop(child)
                merged = [
                    [[0] * (maximum_rank + 1) for _ in range(2)]
                    for _ in range(2)
                ]
                for selected in range(2):
                    for edges_left in range(2):
                        for size_left, count_left in enumerate(
                            dp[selected][edges_left]
                        ):
                            if not count_left:
                                continue
                            for child_selected in range(2):
                                crossing = selected * child_selected
                                for edges_right in range(2):
                                    edge_total = (
                                        edges_left + edges_right + crossing
                                    )
                                    if edge_total > 1:
                                        continue
                                    for size_right, count_right in enumerate(
                                        child_dp[child_selected][edges_right]
                                    ):
                                        size_total = size_left + size_right
                                        if (
                                            count_right
                                            and size_total <= maximum_rank
                                        ):
                                            merged[selected][edge_total][
                                                size_total
                                            ] += count_left * count_right
                dp = merged
            node_dp[vertex] = dp

        component = [[0] * (maximum_rank + 1) for _ in range(2)]
        root_dp = node_dp[start]
        for selected in range(2):
            for edge_count in range(2):
                for size in range(maximum_rank + 1):
                    component[edge_count][size] += root_dp[selected][
                        edge_count
                    ][size]

        merged_forest = [[0] * (maximum_rank + 1) for _ in range(2)]
        for edges_left in range(2):
            for size_left, count_left in enumerate(forest[edges_left]):
                if not count_left:
                    continue
                for edges_right in range(2):
                    edge_total = edges_left + edges_right
                    if edge_total > 1:
                        continue
                    for size_right, count_right in enumerate(
                        component[edges_right]
                    ):
                        size_total = size_left + size_right
                        if count_right and size_total <= maximum_rank:
                            merged_forest[edge_total][size_total] += (
                                count_left * count_right
                            )
        forest = merged_forest

    independent = forest[0]
    one_edge = forest[1]
    f = [
        factorial(rank) * independent[rank]
        for rank in range(maximum_rank + 1)
    ]
    g = [
        0
        if rank < 2
        else factorial(rank - 2) * one_edge[rank]
        for rank in range(maximum_rank + 1)
    ]
    return f, g


def sharp_three(
    adj: list[list[int]],
    root: int,
    banned: frozenset[int],
    cache: dict[frozenset[int], tuple[list[int], list[int]]],
) -> int:
    def sequences(
        excluded: frozenset[int],
    ) -> tuple[list[int], list[int]]:
        if excluded not in cache:
            cache[excluded] = truncated_sequences(adj, excluded)
        return cache[excluded]

    f_h, g_h = sequences(banned)
    without_root = banned | {root}
    f_g, g_g = sequences(without_root)
    outside_closed = without_root | {
        neighbor
        for neighbor in adj[root]
        if neighbor not in banned
    }
    f_r, _ = sequences(outside_closed)
    q = 3
    A = at(f_h, q)
    B = at(f_h, q + 1)
    C = at(f_h, q + 2)
    X = at(g_h, q + 2)
    a = at(f_g, q - 1)
    b = at(f_g, q)
    c = at(f_g, q + 1)
    e = at(g_g, q + 1)
    r = at(f_r, q)
    absent = 2 * B * b + b * b - 2 * A * c - 3 * A * r
    gamma = (
        2 * A * a * q
        - 6 * A * a
        - A * c
        - 3 * A * e
        + 2 * B * b
        - C * a
        - 3 * X * a
        - 2 * a * c
        - 3 * a * r
        + 2 * b * b
    )
    return absent + q * gamma


def lower_lambda_two(
    adj: list[list[int]],
    banned: frozenset[int],
    cache: dict[frozenset[int], tuple[list[int], list[int]]],
) -> int:
    if banned not in cache:
        cache[banned] = truncated_sequences(adj, banned)
    f, g = cache[banned]
    a, b, c, e = at(f, 2), at(f, 3), at(f, 4), at(g, 4)
    return b * b - a * c - 3 * a * e


def sibling_surplus_three(
    adj: list[list[int]],
    root: int,
    leaf: int,
    banned: frozenset[int],
    cache: dict[frozenset[int], tuple[list[int], list[int]]],
) -> int:
    if leaf in banned or root in banned:
        raise ValueError("root and distinguished leaf must remain active")
    if leaf not in adj[root]:
        raise ValueError("distinguished vertex must be a root leaf")
    sharp_large = sharp_three(adj, root, banned, cache)
    leaf_banned = banned | {leaf}
    sharp_small = sharp_three(adj, root, leaf_banned, cache)
    reserve_graph = leaf_banned | {root}
    lower_lambda = lower_lambda_two(adj, reserve_graph, cache)
    return sharp_large - sharp_small - 18 * lower_lambda


def root_branches(
    adj: list[list[int]], root: int
) -> dict[int, frozenset[int]]:
    branches: dict[int, frozenset[int]] = {}
    for neighbor in adj[root]:
        found = {neighbor}
        stack = [(neighbor, root)]
        while stack:
            vertex, parent = stack.pop()
            for next_vertex in adj[vertex]:
                if next_vertex != parent and next_vertex != root:
                    found.add(next_vertex)
                    stack.append((next_vertex, vertex))
        branches[neighbor] = frozenset(found)
    return branches


def validate_truncated_dp(rng: random.Random, cases: int = 12) -> None:
    for _ in range(cases):
        order = rng.randint(2, 14)
        tree = nx.from_prufer_sequence(
            [rng.randrange(order) for _ in range(order - 2)]
        )
        adj = adjacency(tree)
        banned = frozenset(
            rng.sample(range(order), rng.randrange(min(order, 4)))
        )
        graph = tree.subgraph(set(tree) - set(banned)).copy()
        expected_f, expected_g = factorial_sequences(graph)
        actual_f, actual_g = truncated_sequences(adj, banned)
        for rank in range(MAXIMUM_RANK + 1):
            assert at(actual_f, rank) == at(expected_f, rank)
            assert at(actual_g, rank) == at(expected_g, rank)

        root = rng.randrange(order)
        exact_sharp = rooted_quantities(tree, root)[2].get(3, 0)
        computed_sharp = sharp_three(adj, root, frozenset(), {})
        assert computed_sharp == exact_sharp


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--random-trees", type=int, default=10000)
    parser.add_argument("--minimum-order", type=int, default=20)
    parser.add_argument("--maximum-order", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993785)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "largest_root_branch_sibling_surplus_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    validate_truncated_dp(rng)

    eligible = comparisons = 0
    minimum: tuple[int, dict] | None = None
    failure: dict | None = None
    for sample in range(args.random_trees):
        order = rng.randint(args.minimum_order, args.maximum_order)
        tree = nx.from_prufer_sequence(
            [rng.randrange(order) for _ in range(order - 2)]
        )
        adj = adjacency(tree)
        candidate_roots = [
            root
            for root in range(order)
            if len(adj[root]) >= 2
            and any(len(adj[neighbor]) == 1 for neighbor in adj[root])
        ]
        if not candidate_roots:
            continue
        eligible += 1
        root = rng.choice(candidate_roots)
        leaves = [
            neighbor for neighbor in adj[root] if len(adj[neighbor]) == 1
        ]
        leaf = rng.choice(leaves)
        branches = root_branches(adj, root)
        alternatives = [
            (neighbor, branch)
            for neighbor, branch in branches.items()
            if neighbor != leaf
        ]
        largest_size = max(len(branch) for _, branch in alternatives)
        largest = [
            (neighbor, branch)
            for neighbor, branch in alternatives
            if len(branch) == largest_size
        ]
        cache: dict[
            frozenset[int], tuple[list[int], list[int]]
        ] = {}
        full_value = sibling_surplus_three(
            adj, root, leaf, frozenset(), cache
        )
        for branch_root, branch in largest:
            reduced_value = sibling_surplus_three(
                adj, root, leaf, branch, cache
            )
            margin = full_value - reduced_value
            record = {
                "sample": sample,
                "order": order,
                "root": root,
                "distinguished_leaf": leaf,
                "root_degree": len(adj[root]),
                "root_branch_sizes": sorted(
                    (len(value) for value in branches.values()),
                    reverse=True,
                ),
                "deleted_branch_root": branch_root,
                "deleted_branch_size": len(branch),
                "full_sibling_surplus_q3": full_value,
                "reduced_sibling_surplus_q3": reduced_value,
                "monotonicity_margin": margin,
                "prufer_sequence": nx.to_prufer_sequence(tree),
            }
            comparisons += 1
            if minimum is None or margin < minimum[0]:
                minimum = (margin, record)
            if margin < 0:
                failure = record
                break
        if failure is not None:
            break
        if args.progress_every and (sample + 1) % args.progress_every == 0:
            print(
                json.dumps(
                    {
                        "processed": sample + 1,
                        "eligible": eligible,
                        "comparisons": comparisons,
                        "minimum_margin": (
                            minimum[0] if minimum is not None else None
                        ),
                    },
                    sort_keys=True,
                ),
                flush=True,
            )

    report = {
        "status": (
            "FAIL_LARGEST_ROOT_BRANCH_MONOTONICITY"
            if failure is not None
            else "PASS_RANDOM_LARGEST_ROOT_BRANCH_MONOTONICITY"
        ),
        "claim": (
            "C_3(H,v,w) >= C_3(H-B,v,w) for every largest "
            "root branch B other than {w}"
        ),
        "random_seed": args.seed,
        "requested_random_trees": args.random_trees,
        "eligible_random_trees": eligible,
        "comparisons": comparisons,
        "minimum": minimum[1] if minimum is not None else None,
        "failure": failure,
        "exact_truncated_dp_validated": True,
        "warning": "finite computational evidence, not a proof",
    }
    args.output.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    if failure is not None:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
