#!/usr/bin/env python3
"""Exact random probe comparing retained/deleted states of the same removable leaf."""

from __future__ import annotations

from collections import Counter
import os
import random

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, random_forest, rows


def main():
    rng = random.Random(993619)
    value = evaluator()
    signs = Counter()
    classes = {}
    trials = int(os.environ.get("G1_LEAF_ORDER_TRIALS", "20000"))
    for _ in range(trials):
        order = rng.randrange(3, 151)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        leaves = [node for node in graph if node not in (u, v) and graph.degree(node) <= 1]
        if not leaves:
            continue
        leaf = rng.choice(leaves)
        parent = next(iter(graph.neighbors(leaf)), None)
        retained = {node for node in graph if node != leaf and rng.randrange(2)}
        reduced = graph.copy()
        reduced.remove_node(leaf)
        after = value(rows(reduced, u, v), rows(reduced.subgraph(retained).copy(), u, v))
        crows = rows(graph, u, v)
        deleted = value(crows, rows(graph.subgraph(retained).copy(), u, v)) - after
        retained_value = value(crows, rows(graph.subgraph(retained | {leaf}).copy(), u, v)) - after
        difference = retained_value - deleted
        sign = "negative" if difference < 0 else "positive" if difference > 0 else "zero"
        signs[sign] += 1
        label = (
            "isolated" if parent is None else "mark_parent" if parent in (u, v) else "ordinary_parent",
            "parent_retained" if parent in retained else "parent_deleted",
        )
        classes.setdefault(label, Counter())[sign] += 1
    print("SIGNS", dict(signs))
    for label in sorted(classes, key=str):
        print("CLASS", label, dict(classes[label]))
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_LEAF_RETENTION_ORDER_G1_NONADJACENT")


if __name__ == "__main__":
    main()
