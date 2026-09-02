#!/usr/bin/env python3
"""Probe whether deleting a bridge can only improve the forest q3<=q2 margin.

This is diagnostic, not a theorem certificate.  It enumerates unlabeled trees,
deletes every edge, and compares the exact cross-multiplied margins

    M(F) = 3 i_3(F) s_2(F) - 2 i_2(F) s_3(F).

If M(T)>=0 implied M(T-e)>=0 by a monotonic margin comparison, the all-tree
theorem would immediately lift to two-component forests.  The output records
the first failure of the strongest naive comparison M(T-e)>=M(T).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx


def choose(n: int, k: int) -> int:
    if k < 0 or n < k:
        return 0
    out = 1
    for j in range(1, k + 1):
        out = out * (n - j + 1) // j
    return out


def invariants(graph: nx.Graph) -> dict[str, int]:
    n = graph.number_of_nodes()
    m = graph.number_of_edges()
    wedges = sum(choose(graph.degree(v), 2) for v in graph)
    matchings = choose(m, 2) - wedges
    connected_three_edges = 0
    edges = list(graph.edges())
    for a in range(len(edges)):
        for b in range(a + 1, len(edges)):
            for c in range(b + 1, len(edges)):
                vertices = set(edges[a]) | set(edges[b]) | set(edges[c])
                if len(vertices) == 4:
                    connected_three_edges += 1
    i2 = choose(n, 2) - m
    i3 = choose(n, 3) - m * (n - 2) + wedges
    s2 = m * (n - 2) - 2 * wedges
    s3 = (
        m * choose(n - 2, 2)
        - 2 * (wedges * (n - 3) + matchings)
        + 3 * connected_three_edges
    )
    margin = 3 * i3 * s2 - 2 * i2 * s3
    return {
        "n": n,
        "m": m,
        "wedges": wedges,
        "t4": connected_three_edges,
        "i2": i2,
        "i3": i3,
        "s2": s2,
        "s3": s3,
        "margin": margin,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=13)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    records = 0
    min_forest_margin = None
    min_delta = None
    first_decrease = None
    first_negative = None
    for n in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(n):
            tree_data = invariants(tree)
            for edge in list(tree.edges()):
                forest = tree.copy()
                forest.remove_edge(*edge)
                forest_data = invariants(forest)
                delta = forest_data["margin"] - tree_data["margin"]
                records += 1
                item = {
                    "tree_graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    "deleted_edge": list(edge),
                    "tree": tree_data,
                    "forest": forest_data,
                    "delta": delta,
                }
                if min_forest_margin is None or forest_data["margin"] < min_forest_margin[0]:
                    min_forest_margin = (forest_data["margin"], item)
                if min_delta is None or delta < min_delta[0]:
                    min_delta = (delta, item)
                if delta < 0 and first_decrease is None:
                    first_decrease = item
                if forest_data["margin"] < 0 and first_negative is None:
                    first_negative = item
    report = {
        "schema": "forest-q3-q2-bridge-deletion-probe-v1",
        "max_order": args.max_order,
        "records": records,
        "minimum_forest_margin": min_forest_margin[1],
        "minimum_delta": min_delta[1],
        "first_margin_decrease": first_decrease,
        "first_negative_forest_margin": first_negative,
        "status": "PASS_DIAGNOSTIC_NO_NEGATIVE" if first_negative is None else "FAIL_COUNTEREXAMPLE",
    }
    text = json.dumps(report, indent=2) + "\n"
    if args.out:
        args.out.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
