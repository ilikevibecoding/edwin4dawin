#!/usr/bin/env python3
"""Exact bulk weighted-core census for every high-correlation r=1 profile.

For a tree of order n, put x_v=d(v)-1 and delete all degree-one vertices.
The remaining positive-excess vertices form a weighted tree.  This program
enumerates every excess partition with B2 above a chosen threshold, every
nonisomorphic positive-core shape, and every distinct placement of the
weights.  A positive leaf slot at a vertex of weight x is exactly the
feasibility condition for an r=1 root whose unique neighbour has excess x.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from math import comb
from pathlib import Path

import networkx as nx

from enumerate_rank7_b2_42_root_profile_all_partitions import (
    assignment_count,
    multiset_permutations,
    statistics,
)
from verify_rank7_terminal_broom_rooted_c4_moment import partitions


def tree_shapes(order: int):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        return (graph,)
    return tuple(nx.nonisomorphic_trees(order))


def exact_c5_integer(
    order: int,
    beta: int,
    gamma: int,
    edge: int,
    connected_four: int,
    c4: int,
) -> int:
    """The exact rank-(4,5) motif identity, cleared of half-integers."""
    twice_acoef = 3 * order**3 - 40 * order**2 + 133 * order - 40
    bcoef = 4 * order**2 - 35 * order + 49
    ccoef = 4 * order**2 - 30 * order + 34
    twice_margin = (
        twice_acoef * beta
        - 2 * bcoef * gamma
        - 2 * ccoef * (edge - (order - 3))
        + 10 * (order - 3) * (connected_four - (order - 4))
    )
    numerator = 2 * (order - 7) * (order - 8) * c4 + twice_margin
    denominator = 10 * (order - 3)
    quotient, remainder = divmod(numerator, denominator)
    assert remainder == 0
    return quotient


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=23)
    parser.add_argument("--b2-min", type=int, default=30)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    total_excess = args.n - 2
    selected = []
    for part in partitions(total_excess, total_excess):
        beta = sum(comb(value, 2) for value in part)
        if beta >= args.b2_min:
            selected.append((tuple(part), beta))
    assert selected

    shape_cache = {}
    rows = {}
    profile_partitions = defaultdict(set)
    counts = {
        "partitions": len(selected),
        "shape_assignment_pairs": 0,
        "degree_feasible_pairs": 0,
        "root_feasible_pairs": 0,
    }

    for partition, beta in selected:
        order = len(partition)
        shapes = shape_cache.setdefault(order, tree_shapes(order))
        expected_assignments = assignment_count(partition)
        gamma = sum(comb(value, 3) for value in partition)
        c4_constant = (
            comb(args.n - 3, 4) + (args.n - 5) * beta + (args.n - 3)
        )
        assignment_seen = 0
        for weights in multiset_permutations(partition):
            assignment_seen += 1
            for shape_index, tree in enumerate(shapes):
                counts["shape_assignment_pairs"] += 1
                degrees = [tree.degree(vertex) for vertex in range(order)]
                if any(degrees[i] > weights[i] + 1 for i in range(order)):
                    continue
                counts["degree_feasible_pairs"] += 1
                eligible_x = {
                    weights[i]
                    for i in range(order)
                    if degrees[i] <= weights[i]
                }
                if not eligible_x:
                    continue
                counts["root_feasible_pairs"] += 1
                core_degree, leaf_slots, edge, connected_four, terms = statistics(
                    tree, weights
                )
                assert core_degree == degrees
                assert all(value >= 0 for value in leaf_slots)
                c4 = c4_constant - gamma - edge
                c5 = exact_c5_integer(
                    args.n, beta, gamma, edge, connected_four, c4
                )
                witness = {
                    "c5_min": c5,
                    "partition": list(partition),
                    "B3": gamma,
                    "E": edge,
                    "V": connected_four,
                    "shape_index": shape_index,
                    "core_edges": [list(item) for item in tree.edges()],
                    "weights_by_vertex": list(weights),
                    "core_degree": core_degree,
                    "leaf_slots": leaf_slots,
                    "shape_terms": terms,
                }
                for neighbor_x in eligible_x:
                    key = (beta, neighbor_x, c4)
                    current = rows.get(key)
                    if current is None or c5 < current["c5_min"]:
                        rows[key] = witness
                    profile_partitions[(beta, neighbor_x)].add(partition)
        assert assignment_seen == expected_assignments

    profiles = {}
    for beta, neighbor_x in sorted(profile_partitions):
        profile_rows = {
            c4: rows[(beta, neighbor_x, c4)]
            for row_beta, row_x, c4 in rows
            if row_beta == beta and row_x == neighbor_x
        }
        assert profile_rows
        key = f"B2={beta},x={neighbor_x}"
        profiles[key] = {
            "B2": beta,
            "neighbor_x": neighbor_x,
            "compatible_partition_count": len(
                profile_partitions[(beta, neighbor_x)]
            ),
            "first_attainable_c4": min(profile_rows),
            "last_attainable_c4": max(profile_rows),
            "c4_rows": {
                str(c4): profile_rows[c4] for c4 in sorted(profile_rows)
            },
        }

    report = {
        "status": "PASS_EXACT_R1_HIGH_CORRELATION_BULK",
        "scope": {
            "n": args.n,
            "B2_min": args.b2_min,
            "root_profile": (
                "every r=1 root profile, grouped by the excess x of the "
                "root's unique neighbour"
            ),
        },
        "method": (
            "all excess partitions, all nonisomorphic positive-core trees, "
            "all distinct excess assignments, exact degree/root-slot filters, "
            "and exact E,V,c4,c5 identities"
        ),
        "counts": counts,
        "positive_core_shape_counts": {
            str(order): len(shapes) for order, shapes in sorted(shape_cache.items())
        },
        "profile_count": len(profiles),
        "row_count": len(rows),
        "profiles": profiles,
    }
    Path(args.output).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "scope": report["scope"],
                "counts": counts,
                "profile_count": len(profiles),
                "row_count": len(rows),
                "first_profiles": {
                    key: {
                        "first_attainable_c4": value["first_attainable_c4"],
                        "first_c5": value["c4_rows"][
                            str(value["first_attainable_c4"])
                        ]["c5_min"],
                    }
                    for key, value in list(profiles.items())[:20]
                },
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
