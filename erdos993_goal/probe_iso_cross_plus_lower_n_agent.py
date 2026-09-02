#!/usr/bin/env python3
"""Probe the coupling that would absorb the lower-N branch.

In the reassembled Q_(k+1) identity, C_k(B;u,v) appears beside N_(k+1)(B).
After one ordinary third-leaf step z~s, the desired terminal is

    J_k=C_k(B;u,v)+N_k(B-{z,s};u,v).

For an isolated third vertex z, the child is B-z.  A negative value is an
exact obstruction to this proposed truncation; a clean finite run is only
evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import add, graph6, iso, poly_forest
from search_iso_cross_orientation_coupling_agent import leaf_d, shift


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def cross_coupling(graph: nx.Graph, u: int, v: int, rank: int) -> int:
    def polynomial(deleted: tuple[int, ...]) -> list[int]:
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        return poly_forest(reduced)

    u_row = polynomial((u,))
    v_row = polynomial((v,))
    w_row = polynomial((u, v))
    p_row = add(u_row, shift(w_row))
    return iso(p_row, rank) + leaf_d(v_row, w_row, rank)


def new_bucket() -> dict[str, object]:
    return {"checks": 0, "negatives": 0, "minimum": None}


def update(bucket: dict[str, object], value: int, witness: dict) -> None:
    bucket["checks"] += 1
    if value < 0:
        bucket["negatives"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def audit_graph(
    graph: nx.Graph,
    source: str,
    ranks: tuple[int, ...],
    buckets: dict[int, dict[str, object]],
    triples: tuple[tuple[int, int, int], ...] | None = None,
) -> None:
    vertices = tuple(graph)
    if triples is None:
        triples = tuple(
            (u, v, z)
            for u in vertices
            for v in vertices
            for z in vertices
            if u != v and z not in (u, v) and graph.degree(z) <= 1
        )
    cross_cache: dict[tuple[int, int, int], int] = {}
    n_cache: dict[tuple[frozenset[int], int, int], list[int]] = {}
    for u, v, z in triples:
        if graph.degree(z) > 1 or u == v or z in (u, v):
            continue
        deleted: frozenset[int]
        kind: str
        if graph.degree(z) == 0:
            deleted = frozenset((z,))
            kind = "isolate"
        else:
            support = next(iter(graph.neighbors(z)))
            if support in (u, v):
                continue
            deleted = frozenset((z, support))
            kind = "ordinary"
        key = (deleted, u, v)
        if key not in n_cache:
            child = graph.copy()
            child.remove_nodes_from(deleted)
            n_cache[key] = four_minor_vector(child, u, v)
        vector = n_cache[key]
        for rank in ranks:
            cross_key = (u, v, rank)
            if cross_key not in cross_cache:
                cross_cache[cross_key] = cross_coupling(graph, u, v, rank)
            cross = cross_cache[cross_key]
            nested = coefficient(vector, rank)
            value = cross + nested
            update(
                buckets[rank],
                value,
                {
                    "source": source,
                    "kind": kind,
                    "order": len(graph),
                    "rank": rank,
                    "u": u,
                    "v": v,
                    "z": z,
                    "deleted": sorted(deleted),
                    "graph6": graph6(nx.convert_node_labels_to_integers(graph)),
                    "C": cross,
                    "N_child": nested,
                    "polynomial": poly_forest(graph),
                },
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=12)
    parser.add_argument("--random", type=int, default=1000)
    parser.add_argument("--random-max-order", type=int, default=45)
    parser.add_argument("--random-triples", type=int, default=40)
    parser.add_argument("--ranks", type=str, default="4,5,6,7,8")
    args = parser.parse_args()
    ranks = tuple(sorted({int(value) for value in args.ranks.split(",") if value}))
    buckets = {rank: new_bucket() for rank in ranks}
    structures = {"trees": 0, "atlas_forests": 0, "random_forests": 0}

    for order in range(3, args.max_tree_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            audit_graph(tree, "nonisomorphic_tree", ranks, buckets)
            structures["trees"] += 1
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 3 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            audit_graph(graph, "atlas_forest", ranks, buckets)
            structures["atlas_forests"] += 1

    rng = random.Random(993_082_907)
    for _ in range(args.random):
        order = rng.randint(3, args.random_max_order)
        graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 63))
        graph.remove_edges_from(edge for edge in list(graph.edges()) if rng.random() < 0.2)
        eligible = [z for z in graph if graph.degree(z) <= 1]
        triples = []
        for _ in range(args.random_triples * 3):
            u, v = rng.sample(tuple(graph), 2)
            z = rng.choice(eligible)
            if z not in (u, v):
                triples.append((u, v, z))
            if len(triples) == args.random_triples:
                break
        audit_graph(
            graph,
            "deterministic_random_forest",
            ranks,
            buckets,
            tuple(triples),
        )
        structures["random_forests"] += 1

    report = {
        "marker": "PROBE_EXACT_CROSS_PLUS_LOWER_N_COUPLING",
        "parameters": vars(args),
        "structures": structures,
        "by_rank": buckets,
        "scope": (
            "Finite evidence only if no negative occurs.  Any negative is "
            "an exact counterexample to the proposed lower-N absorption."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
