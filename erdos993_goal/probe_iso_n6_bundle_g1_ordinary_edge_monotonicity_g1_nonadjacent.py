#!/usr/bin/env python3
"""Deterministic exact probe for deleting an edge internal to W=C-{u,v}."""

from __future__ import annotations

from collections import Counter
import os
import random

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, random_forest, rows


def main():
    rng = random.Random(993612)
    value = evaluator()
    signs = Counter()
    leaf_signs = Counter()
    retained_edge_signs = Counter()
    minimum = None
    maximum = None
    cells = 0
    for trial in range(int(os.environ.get("G1_EDGE_TRIALS", "50000"))):
        order = rng.randrange(4, 151)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        candidates = [
            edge for edge in graph.edges()
            if u not in edge and v not in edge
        ]
        if not candidates:
            continue
        left, right = rng.choice(candidates)
        retained = {node for node in graph if rng.randrange(2)}
        crows = rows(graph, u, v)
        drows = rows(graph.subgraph(retained).copy(), u, v)
        with_edge = value(crows, drows)
        reduced = graph.copy()
        reduced.remove_edge(left, right)
        crows0 = rows(reduced, u, v)
        drows0 = rows(reduced.subgraph(retained).copy(), u, v)
        without_edge = value(crows0, drows0)
        delta = with_edge - without_edge
        key = "negative" if delta < 0 else "positive" if delta > 0 else "zero"
        signs[key] += 1
        if graph.degree(left) == 1 or graph.degree(right) == 1:
            leaf_signs[key] += 1
        if left in retained and right in retained:
            retained_edge_signs[key] += 1
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        record = (delta, order, graph6, u, v, left, right, len(retained), with_edge, without_edge)
        minimum = record if minimum is None or record < minimum else minimum
        maximum = record if maximum is None or record > maximum else maximum
        cells += 1
    print("CELLS", cells)
    print("SIGNS", dict(signs))
    print("LEAF_EDGE_SIGNS", dict(leaf_signs))
    print("RETAINED_EDGE_SIGNS", dict(retained_edge_signs))
    print("MINIMUM", minimum)
    print("MAXIMUM", maximum)
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_EDGE_MONOTONICITY_G1_NONADJACENT")


if __name__ == "__main__":
    main()
