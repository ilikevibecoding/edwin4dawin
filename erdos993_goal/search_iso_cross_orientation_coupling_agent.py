#!/usr/bin/env python3
"""Exact finite search for the cross-orientation Q+D coupling.

For a marked forest (B;u,v), put

    U=I(B-u), V=I(B-v), W=I(B-{u,v}), P=U+xW.

The candidate stopping payment is C_k=Q_k(P)+D_k(V,W).  This script checks
k=4,5 on exhaustive nonisomorphic trees through a configurable order,
all atlas forests, and a deterministic random forest stress.  A clean run is
finite evidence only; a negative value is an exact counterexample.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random

import networkx as nx

from probe_iso_leaf_cross_remainder_root import add, graph6, iso, mul, poly_forest


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def leaf_d(left: list[int], right: list[int], rank: int) -> int:
    a = lambda index: coefficient(left, index)
    c = lambda index: coefficient(right, index)
    return (
        c(rank - 1) ** 2
        + 2 * rank * a(rank) * c(rank - 1)
        + 2 * a(rank - 1) * c(rank - 2)
        - (rank + 1) * a(rank - 1) * c(rank)
        - (rank + 1) * c(rank - 2) * a(rank + 1)
        - c(rank - 2) * c(rank)
    )


def shift(row: list[int]) -> list[int]:
    return [0, *row]


def reserve(row: list[int], rank: int) -> int:
    p = lambda index: coefficient(row, index)
    return (
        2 * rank * p(rank) ** 2
        - p(rank - 1) * p(rank)
        - 2 * (rank + 1) * p(rank - 1) * p(rank + 1)
    )


def new_bucket() -> dict[str, object]:
    return {
        "checks": 0,
        "negative_coupling": 0,
        "negative_payment_after_reserve": 0,
        "minimum_coupling": None,
        "minimum_payment_after_reserve": None,
    }


def update(bucket: dict[str, object], coupling: int, payment: int, witness: dict) -> None:
    bucket["checks"] += 1
    if coupling < 0:
        bucket["negative_coupling"] += 1
    if payment < 0:
        bucket["negative_payment_after_reserve"] += 1
    if bucket["minimum_coupling"] is None or coupling < bucket["minimum_coupling"]["value"]:
        bucket["minimum_coupling"] = {"value": coupling, **witness}
    if (
        bucket["minimum_payment_after_reserve"] is None
        or payment < bucket["minimum_payment_after_reserve"]["value"]
    ):
        bucket["minimum_payment_after_reserve"] = {"value": payment, **witness}


def audit(
    graph: nx.Graph,
    source: str,
    ranks: tuple[int, ...],
    buckets: dict[int, dict[str, object]],
    pairs: tuple[tuple[int, int], ...] | None = None,
) -> None:
    vertices = tuple(graph)
    cache: dict[frozenset[int], list[int]] = {}

    def polynomial(deleted: frozenset[int]) -> list[int]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = poly_forest(reduced)
        return cache[deleted]

    marked_pairs = pairs
    if marked_pairs is None:
        marked_pairs = tuple((u, v) for u in vertices for v in vertices if u != v)
    for u, v in marked_pairs:
        U = polynomial(frozenset((u,)))
        V = polynomial(frozenset((v,)))
        W = polynomial(frozenset((u, v)))
        P = add(U, shift(W))
        for rank in ranks:
            d = leaf_d(V, W, rank)
            q = iso(P, rank)
            coupling = q + d
            s = reserve(P, rank)
            payment_twice = 2 * coupling - s
            assert 2 * coupling == s + payment_twice
            witness = {
                "source": source,
                "order": len(graph),
                "rank": rank,
                "u": int(u),
                "v": int(v),
                "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
                "Q": q,
                "D": d,
                "reserve": s,
                "payment_twice": payment_twice,
                "U": U,
                "V": V,
                "W": W,
                "P": P,
            }
            update(buckets[rank], coupling, payment_twice, witness)


def audit_isolate_padding(
    graph: nx.Graph,
    max_isolates: int,
    ranks: tuple[int, ...],
    buckets: dict[int, dict[str, object]],
) -> int:
    vertices = tuple(graph)
    cache: dict[frozenset[int], list[int]] = {}

    def polynomial(deleted: frozenset[int]) -> list[int]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = poly_forest(reduced)
        return cache[deleted]

    checks = 0
    for u in vertices:
        for v in vertices:
            if u == v:
                continue
            U0 = polynomial(frozenset((u,)))
            V0 = polynomial(frozenset((v,)))
            W0 = polynomial(frozenset((u, v)))
            for isolates in range(max_isolates + 1):
                factor = [1]
                for _ in range(isolates):
                    factor = add(factor, shift(factor))
                U, V, W = mul(factor, U0), mul(factor, V0), mul(factor, W0)
                P = add(U, shift(W))
                for rank in ranks:
                    d = leaf_d(V, W, rank)
                    q = iso(P, rank)
                    coupling = q + d
                    s = reserve(P, rank)
                    payment_twice = 2 * coupling - s
                    witness = {
                        "source": "atlas_base_plus_isolates",
                        "base_order": len(graph),
                        "order": len(graph) + isolates,
                        "isolates": isolates,
                        "rank": rank,
                        "u": int(u),
                        "v": int(v),
                        "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
                        "Q": q,
                        "D": d,
                        "reserve": s,
                        "payment_twice": payment_twice,
                        "U": U,
                        "V": V,
                        "W": W,
                        "P": P,
                    }
                    update(buckets[rank], coupling, payment_twice, witness)
                    checks += 1
    return checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=13)
    parser.add_argument("--random", type=int, default=2000)
    parser.add_argument("--random-max-order", type=int, default=40)
    parser.add_argument("--isolate-padding", type=int, default=0)
    parser.add_argument(
        "--ranks",
        type=str,
        default="4,5",
        help="comma-separated ranks to audit",
    )
    parser.add_argument(
        "--random-pairs",
        type=int,
        default=0,
        help="sample this many ordered marks per random forest; zero means all",
    )
    args = parser.parse_args()

    ranks = tuple(sorted({int(value) for value in args.ranks.split(",") if value}))
    if not ranks or min(ranks) < 2:
        raise ValueError("--ranks must contain integers at least 2")
    buckets = {rank: new_bucket() for rank in ranks}
    structures = {"trees": 0, "atlas_forests": 0, "random_forests": 0}
    for order in range(2, args.max_tree_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            audit(tree, "nonisomorphic_tree", ranks, buckets)
            structures["trees"] += 1
    atlas_graphs = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            audit(graph, "atlas_forest", ranks, buckets)
            atlas_graphs.append(graph)
            structures["atlas_forests"] += 1
    isolate_padding_checks = 0
    if args.isolate_padding:
        for graph in atlas_graphs:
            isolate_padding_checks += audit_isolate_padding(
                graph, args.isolate_padding, ranks, buckets
            )
    structures["isolate_padding_rank_checks"] = isolate_padding_checks

    rng = random.Random(993_082_905)
    for _ in range(args.random):
        order = rng.randint(2, args.random_max_order)
        forest = nx.random_labeled_tree(order, seed=rng.randrange(1 << 63))
        forest.remove_edges_from(
            edge for edge in list(forest.edges()) if rng.random() < 0.2
        )
        pairs = None
        if args.random_pairs:
            vertices = tuple(forest)
            pairs = tuple(
                (u, v)
                for u, v in (
                    (rng.choice(vertices), rng.choice(vertices))
                    for _ in range(args.random_pairs * 2)
                )
                if u != v
            )[: args.random_pairs]
        audit(forest, "deterministic_random_forest", ranks, buckets, pairs)
        structures["random_forests"] += 1

    assert all(bucket["negative_coupling"] == 0 for bucket in buckets.values())
    report = {
        "marker": "PROBE_EXACT_ISO_CROSS_ORIENTATION_COUPLING_R4_R5",
        "parameters": vars(args),
        "structures": structures,
        "by_rank": buckets,
        "scope": (
            "Finite exact evidence only.  Zero negative coupling values do "
            "not prove the universal cross-orientation lemma."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
