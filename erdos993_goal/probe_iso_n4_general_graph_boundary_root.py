#!/usr/bin/env python3
"""Test fixed-rank marked N inequalities beyond forests.

This is a route diagnostic: it tests whether the all-forest N_4 target could
follow from a theorem for arbitrary independence complexes/graphs.  Every
atlas graph is checked exactly, followed by a deterministic random-graph
stress.  This remains finite evidence rather than a universal theorem.
"""

from __future__ import annotations

import hashlib
import argparse
import itertools
import json
import random
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    return tuple(out)


def marked_values(graph: nx.Graph, ranks: tuple[int, ...]) -> list[tuple[int, int, int, int]]:
    """Return (u,v,rank,N_rank) by an induced-mask DP."""
    vertices = list(graph)
    index = {vertex: i for i, vertex in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for vertex in vertices:
        i = index[vertex]
        for neighbor in graph.neighbors(vertex):
            adjacency[i] |= 1 << index[neighbor]
    cache: dict[int, tuple[int, ...]] = {0: (1,)}

    def poly(mask: int) -> tuple[int, ...]:
        if mask in cache:
            return cache[mask]
        bit = mask & -mask
        i = bit.bit_length() - 1
        excluded = poly(mask ^ bit)
        included_tail = poly(mask & ~bit & ~adjacency[i])
        included = (0,) + included_tail
        cache[mask] = add(excluded, included)
        return cache[mask]

    def at(row: tuple[int, ...], k: int) -> int:
        return row[k] if 0 <= k < len(row) else 0

    full_mask = (1 << len(vertices)) - 1
    e = poly(full_mask)
    values = []
    for u, v in itertools.combinations(range(len(vertices)), 2):
        a = poly(full_mask & ~(1 << u))
        b = poly(full_mask & ~(1 << v))
        c = poly(full_mask & ~(1 << u) & ~(1 << v))
        for r in ranks:
            value = (
                2 * r * at(e, r) * at(c, r - 2)
                - (r + 1) * at(e, r + 1) * at(c, r - 3)
                + at(e, r - 1) * (2 * at(c, r - 3) - (r + 1) * at(c, r - 1))
                + at(a, r) * (-(r + 1) * at(b, r - 2) - at(c, r - 3))
                + at(a, r - 1) * (2 * r * at(b, r - 1) + 2 * at(c, r - 2))
                + at(a, r - 2) * (-(r + 1) * at(b, r) + 2 * at(b, r - 2) - at(c, r - 1))
                - at(b, r) * at(c, r - 3)
                + 2 * at(b, r - 1) * at(c, r - 2)
                - at(b, r - 2) * at(c, r - 1)
            )
            values.append((vertices[u], vertices[v], r, value))
    return values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random", type=int, default=1000)
    parser.add_argument("--random-n", type=int, default=15)
    parser.add_argument("--ranks", type=str, default="4")
    args = parser.parse_args()
    ranks = tuple(sorted({int(value) for value in args.ranks.split(",") if value}))
    checks = 0
    minima: dict[str, dict | None] = {
        f"r{rank}_{name}": None
        for rank in ranks
        for name in ("all_graphs", "bipartite", "triangle_free", "chordal")
    }
    negatives: list[dict] = []
    negative_signatures: set[tuple[int, str, tuple[str, ...]]] = set()
    atlas_graphs = [graph for graph in nx.graph_atlas_g() if len(graph) >= 2]
    rng = random.Random(993_082_901)
    random_graphs = []
    for _ in range(args.random):
        order = rng.randint(8, args.random_n)
        probability = rng.uniform(0.03, 0.97)
        random_graphs.append(nx.gnp_random_graph(order, probability, seed=rng.randrange(1 << 63)))

    # Exact structured obstructions found after the small/random scan.  The
    # split graph has a clique of size 18 completely joined to an independent
    # set of size 11.  Marking two clique vertices gives N_4=-1705.  The
    # complete bipartite graph K_(10,26), with two marks in its 10-side, gives
    # N_4=-36102.  They show that any successful N_4 theorem must retain more
    # than generic downset/flag/bipartite structure.
    split = nx.Graph()
    split.add_nodes_from(range(29))
    split.add_edges_from(itertools.combinations(range(18), 2))
    split.add_edges_from((left, right) for left in range(18) for right in range(18, 29))
    structured_graphs = [split, nx.complete_bipartite_graph(10, 26)]

    for source, graph in itertools.chain(
        (("atlas", graph) for graph in atlas_graphs),
        (("random", graph) for graph in random_graphs),
        (("structured", graph) for graph in structured_graphs),
    ):
        if len(graph) < 2:
            continue
        classes = {
            "all_graphs": True,
            "bipartite": nx.is_bipartite(graph),
            "triangle_free": sum(nx.triangles(graph).values()) == 0,
            "chordal": nx.is_chordal(graph),
        }
        for u, v, rank, value in marked_values(graph, ranks):
            checks += 1
            witness = {
                "N": value,
                "rank": rank,
                "order": len(graph),
                "graph6": graph6(graph),
                "edges": (
                    sorted([sorted(edge) for edge in graph.edges()])
                    if len(graph) <= 12
                    else None
                ),
                "edge_count": graph.number_of_edges(),
                "degree_sequence": sorted((degree for _, degree in graph.degree()), reverse=True),
                "marks": [u, v],
                "source": source,
            }
            for name, applies in classes.items():
                key = f"r{rank}_{name}"
                if applies and (
                    minima[key] is None or value < minima[key]["N"]
                ):
                    minima[key] = witness
            signature_classes = tuple(k for k, x in classes.items() if x)
            signature = (rank, source, signature_classes)
            if value < 0 and signature not in negative_signatures:
                negatives.append(witness | {"classes": list(signature_classes)})
                negative_signatures.add(signature)

    report = {
        "marker": (
            "PASS_EXACT_FINITE_NO_NR_NEGATIVE_FOR_GENERAL_GRAPHS"
            if not negatives
            else "FOUND_EXACT_NEGATIVE_NR_GENERAL_GRAPH"
        ),
        "ranks": ranks,
        "checks": checks,
        "atlas_graphs": len(atlas_graphs),
        "random_graphs": len(random_graphs),
        "structured_graphs": len(structured_graphs),
        "minima": minima,
        "first_negatives": negatives,
        "scope": (
            "Finite general-graph route evidence only; no all-graph or "
            "all-forest theorem is asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_nr_general_graph_boundary_root_20260829.json").write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
