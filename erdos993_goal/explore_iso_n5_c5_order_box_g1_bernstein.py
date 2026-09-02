#!/usr/bin/env python3
"""Finite diagnostic for a path-floor/binomial-ceiling C5 relaxation.

For actual adjacent marked forest cells, retain the exact A row and only the
orders of the two neighborhood-deleted forests B,C.  Replace each remaining
coefficient independently by its path-minimal lower or edgeless upper bound
and minimize the exact C5 occupation split over all corners.  This is only a
relaxation probe, not a theorem.
"""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def path_floor(order, rank):
    top = order - rank + 1
    return comb(top, rank) if top >= rank >= 0 else 0


def upper(order, rank):
    return comb(order, rank) if order >= rank >= 0 else 0


def h(a):
    return at(a, 3) ** 2 - at(a, 1) * at(a, 5)


def ell(a, b):
    return -at(a, 1) * at(b, 4) + at(a, 2) * at(b, 3) + at(a, 3) * at(b, 2) - at(a, 4) * at(b, 1)


def k(b, c):
    return -at(b, 1) * at(c, 3) + 2 * at(b, 2) * at(c, 2) - at(b, 3) * at(c, 1)


def corners(order):
    fixed = [1, order]
    bounds = [(path_floor(order, rank), upper(order, rank)) for rank in range(2, 5)]
    for bits in itertools.product((0, 1), repeat=3):
        yield tuple(fixed + [bounds[j][bits[j]] for j in range(3)])


def audit(graph, result):
    local = result["by_order"].setdefault(str(len(graph)), {"cells": 0, "negative": 0, "minimum": None})
    for u, v in graph.edges():
        agraph = graph.copy(); agraph.remove_nodes_from((u, v))
        a = tuple(poly_forest(agraph))
        mb = len(graph) - 1 - graph.degree(v)
        mc = len(graph) - 1 - graph.degree(u)
        minimum = None
        masks = None
        for bi, b in enumerate(corners(mb)):
            for ci, c in enumerate(corners(mc)):
                value = h(a) + ell(a, b) + ell(a, c) + k(b, c)
                if minimum is None or value < minimum:
                    minimum, masks = value, (bi, ci)
        result["cells"] += 1
        result["negative"] += int(minimum < 0)
        local["cells"] += 1
        local["negative"] += int(minimum < 0)
        witness = {
            "value": minimum, "order": len(graph), "u": u, "v": v,
            "orders_B_C": [mb, mc], "corner_indices": masks,
            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
        }
        if result["minimum"] is None or minimum < result["minimum"]["value"]:
            result["minimum"] = witness
        if local["minimum"] is None or minimum < local["minimum"]["value"]:
            local["minimum"] = witness


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=12)
    args = parser.parse_args()
    result = {"cells": 0, "negative": 0, "minimum": None, "by_order": {}}
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= 7 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), result)
    for order in range(8, args.max_tree_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            audit(nx.convert_node_labels_to_integers(graph), result)
    result["scope"] = "Finite relaxation diagnostic only."
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
