#!/usr/bin/env python3
"""Exact terminal-isolate burden scan over the NetworkX graph atlas."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx


def independence_counts(graph: nx.Graph, deleted: int | None = None) -> list[int]:
    vertices = [v for v in graph if v != deleted]
    position = {v: i for i, v in enumerate(vertices)}
    forbidden = [0] * len(vertices)
    for v in vertices:
        mask = 1 << position[v]
        for w in graph[v]:
            if w in position:
                mask |= 1 << position[w]
        forbidden[position[v]] = mask

    counts = [0] * (len(vertices) + 1)
    for subset in range(1 << len(vertices)):
        remaining = subset
        independent = True
        while remaining:
            bit = remaining & -remaining
            i = bit.bit_length() - 1
            if (subset ^ bit) & forbidden[i]:
                independent = False
                break
            remaining ^= bit
        if independent:
            counts[subset.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def coefficient(values: list[int], rank: int) -> int:
    return values[rank] if 0 <= rank < len(values) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    graphs = [g for g in nx.graph_atlas_g() if len(g) > 0]
    checks = failures = rooted_graphs = 0
    minimum: Fraction | None = None
    minimum_item = None
    first_failure = None

    for atlas_index, graph in enumerate(graphs):
        graph = nx.convert_node_labels_to_integers(graph)
        base = independence_counts(graph)
        total = [
            coefficient(base, rank) + coefficient(base, rank - 1)
            for rank in range(len(base) + 1)
        ]
        for root in graph:
            rooted_graphs += 1
            avoiding = independence_counts(graph, deleted=root)
            for rank in range(1, len(total)):
                bm = total[rank - 1]
                br = total[rank]
                if not bm or not br or br < bm:
                    continue
                u = Fraction(rank * br, bm)
                rho_previous = Fraction(
                    bm - coefficient(avoiding, rank - 1), bm
                )
                rho = Fraction(
                    br - coefficient(avoiding, rank), br
                )
                burden = (
                    rank * (u + 1) * rho_previous
                    - (rank + 1) * u * rho
                )
                margin = -burden
                checks += 1
                item = {
                    "atlas_index": atlas_index,
                    "order": len(graph),
                    "size": graph.number_of_edges(),
                    "edges": sorted(map(list, graph.edges())),
                    "root": root,
                    "rank": rank,
                    "burden": str(burden),
                }
                if burden > 0:
                    failures += 1
                    if first_failure is None:
                        first_failure = item
                if minimum is None or margin < minimum:
                    minimum = margin
                    minimum_item = item

    report = {
        "status": "COUNTEREXAMPLE" if failures else "PASS_NOT_PROOF",
        "graphs": len(graphs),
        "maximum_order": max(map(len, graphs)),
        "rooted_graphs": rooted_graphs,
        "checks": checks,
        "failures": failures,
        "minimum_margin": (
            None
            if minimum is None
            else {"exact": str(minimum), **minimum_item}
        ),
        "first_failure": first_failure,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

