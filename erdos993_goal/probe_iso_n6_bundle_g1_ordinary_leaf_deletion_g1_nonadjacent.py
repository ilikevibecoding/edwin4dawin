#!/usr/bin/env python3
"""Deterministic exact probe for deleting an ordinary leaf from C and D."""

from __future__ import annotations

from collections import Counter
import os
import random

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, random_forest, rows


def main():
    rng = random.Random(993613)
    value = evaluator()
    signs = Counter()
    classes = {}
    minimum = None
    maximum = None
    cells = 0
    for _ in range(int(os.environ.get("G1_LEAF_TRIALS", "50000"))):
        order = rng.randrange(4, 151)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        leaves = [node for node in graph if node not in (u, v) and graph.degree(node) <= 1]
        if not leaves:
            continue
        leaf = rng.choice(leaves)
        parent = next(iter(graph.neighbors(leaf)), None)
        retained = {node for node in graph if rng.randrange(2)}
        leaf_retained = leaf in retained
        crows = rows(graph, u, v)
        drows = rows(graph.subgraph(retained).copy(), u, v)
        before = value(crows, drows)
        reduced = graph.copy()
        reduced.remove_node(leaf)
        retained.discard(leaf)
        after = value(rows(reduced, u, v), rows(reduced.subgraph(retained).copy(), u, v))
        delta = before - after
        sign = "negative" if delta < 0 else "positive" if delta > 0 else "zero"
        signs[sign] += 1
        label = (
            "isolated" if parent is None else "mark_parent" if parent in (u, v) else "ordinary_parent",
            "leaf_retained" if leaf_retained else "leaf_deleted",
            "parent_retained" if parent in retained else "parent_deleted",
        )
        classes.setdefault(label, Counter())[sign] += 1
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        record = (delta, order, graph6, u, v, leaf, parent, before, after)
        minimum = record if minimum is None or record < minimum else minimum
        maximum = record if maximum is None or record > maximum else maximum
        cells += 1
    print("CELLS", cells)
    print("SIGNS", dict(signs))
    for label in sorted(classes, key=str):
        print("CLASS", label, dict(classes[label]))
    print("MINIMUM", minimum)
    print("MAXIMUM", maximum)
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_DELETION_G1_NONADJACENT")
if __name__ == "__main__":
    main()
