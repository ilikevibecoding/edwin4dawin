#!/usr/bin/env python3
"""Exact diagnostics for direct low-rank four-minor N positivity."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6, mul, poly_forest


def new_bucket() -> dict[str, object]:
    return {"checks": 0, "negatives": 0, "minimum_relevant": None}


def nested_from_rows(
    e: list[int], u: list[int], v: list[int], w: list[int], rank: int
) -> int:
    c = lambda row, index: row[index] if 0 <= index < len(row) else 0
    r = rank
    return (
        2 * r * c(e, r) * c(w, r - 2)
        - (r + 1) * c(e, r + 1) * c(w, r - 3)
        + c(e, r - 1) * (2 * c(w, r - 3) - (r + 1) * c(w, r - 1))
        + c(u, r) * (-(r + 1) * c(v, r - 2) - c(w, r - 3))
        + c(u, r - 1) * (2 * r * c(v, r - 1) + 2 * c(w, r - 2))
        + c(u, r - 2)
        * (-(r + 1) * c(v, r) + 2 * c(v, r - 2) - c(w, r - 1))
        - c(v, r) * c(w, r - 3)
        + 2 * c(v, r - 1) * c(w, r - 2)
        - c(v, r - 2) * c(w, r - 1)
    )


def four_rows(graph: nx.Graph, u: int, v: int) -> tuple[list[int], ...]:
    rows = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        rows.append(poly_forest(reduced))
    return tuple(rows)


def audit(
    graph: nx.Graph,
    source: str,
    ranks: tuple[int, ...],
    buckets: dict[int, dict[str, object]],
    pairs: tuple[tuple[int, int], ...] | None = None,
    base: dict | None = None,
) -> None:
    vertices = tuple(graph)
    if pairs is None:
        pairs = tuple((u, v) for u in vertices for v in vertices if u != v)
    for u, v in pairs:
        vector = four_minor_vector(graph, u, v)
        w_graph = graph.copy()
        w_graph.remove_nodes_from((u, v))
        alpha_w = len(poly_forest(w_graph)) - 1
        for rank in ranks:
            if rank > alpha_w + 2:
                continue
            value = vector[rank] if rank < len(vector) else 0
            bucket = buckets[rank]
            bucket["checks"] += 1
            if value < 0:
                bucket["negatives"] += 1
            witness = {
                "value": value,
                "source": source,
                "order": len(graph),
                "rank": rank,
                "alpha_W": alpha_w,
                "u": u,
                "v": v,
                "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
                "polynomial": poly_forest(graph),
            }
            if base:
                witness.update(base)
            old = bucket["minimum_relevant"]
            if old is None or value < old["value"]:
                bucket["minimum_relevant"] = witness


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=12)
    parser.add_argument("--max-isolates", type=int, default=30)
    parser.add_argument("--random", type=int, default=500)
    parser.add_argument("--random-max-order", type=int, default=60)
    parser.add_argument("--random-pairs", type=int, default=30)
    parser.add_argument("--ranks", type=str, default="4,5,6")
    args = parser.parse_args()
    ranks = tuple(sorted({int(value) for value in args.ranks.split(",") if value}))
    buckets = {rank: new_bucket() for rank in ranks}
    structures = {"trees": 0, "atlas": 0, "isolate_paddings": 0, "random": 0}

    for order in range(2, args.max_tree_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            audit(graph, "nonisomorphic_tree", ranks, buckets)
            structures["trees"] += 1
    atlas = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            atlas.append(graph)
            audit(graph, "atlas_forest", ranks, buckets)
            structures["atlas"] += 1
    for base_graph in atlas:
        base_vertices = tuple(base_graph)
        base_pairs = tuple(
            (u, v) for u in base_vertices for v in base_vertices if u != v
        )
        for u, v in base_pairs:
            base_rows = four_rows(base_graph, u, v)
            alpha_w0 = len(base_rows[3]) - 1
            for isolates in range(1, args.max_isolates + 1):
                factor = [math.comb(isolates, index) for index in range(isolates + 1)]
                rows = tuple(mul(factor, row) for row in base_rows)
                for rank in ranks:
                    if rank > alpha_w0 + isolates + 2:
                        continue
                    value = nested_from_rows(*rows, rank)
                    bucket = buckets[rank]
                    bucket["checks"] += 1
                    if value < 0:
                        bucket["negatives"] += 1
                    witness = {
                        "value": value,
                        "source": "atlas_plus_isolates",
                        "order": len(base_graph) + isolates,
                        "rank": rank,
                        "alpha_W": alpha_w0 + isolates,
                        "u": u,
                        "v": v,
                        "graph6": graph6(base_graph),
                        "base_order": len(base_graph),
                        "isolates": isolates,
                    }
                    old = bucket["minimum_relevant"]
                    if old is None or value < old["value"]:
                        bucket["minimum_relevant"] = witness
                structures["isolate_paddings"] += 1

    rng = random.Random(993_082_904)
    for _ in range(args.random):
        order = rng.randint(2, args.random_max_order)
        graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 63))
        graph.remove_edges_from(edge for edge in list(graph.edges()) if rng.random() < 0.2)
        pairs = tuple(tuple(rng.sample(tuple(graph), 2)) for _ in range(args.random_pairs))
        audit(graph, "deterministic_random_forest", ranks, buckets, pairs)
        structures["random"] += 1

    report = {
        "marker": "PROBE_EXACT_DIRECT_N_LOW_RANKS",
        "parameters": vars(args),
        "structures": structures,
        "by_rank": buckets,
        "scope": "finite exact evidence only unless a negative counterexample is found",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
