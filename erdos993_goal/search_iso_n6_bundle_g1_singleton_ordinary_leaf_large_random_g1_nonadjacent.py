#!/usr/bin/env python3
"""Deterministic falsification search for the singleton-ordinary leaf delta.

Exploratory only.  Build a core forest R, attach a new support s to q and one
or more leaf children, set D=C-p, and evaluate the exact rank-six g1 leaf
increment.  No all-order claim follows from a clean run.
"""

from __future__ import annotations

import os
import random

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import (
    evaluator, random_forest, rows,
)


def main():
    rng = random.Random(993_611_031)
    value = evaluator()
    trials = int(os.environ.get("G1_LEAF_TRIALS", "5000"))
    minimum = None
    negative = 0
    for trial in range(trials):
        n = rng.randrange(4, 151)
        core = random_forest(rng, n)
        nonedges = [pair for pair in nx.non_edges(core)]
        if not nonedges:
            continue
        u, v = rng.choice(nonedges)
        ordinary = [node for node in core if node not in (u, v)]
        q = rng.choice(ordinary)
        p = q if rng.random() < 0.5 else rng.choice([node for node in ordinary if node != q])
        # Bias toward the unresolved low-sibling region.
        t = rng.randrange(0, min(12, (11 * n - 1) // 10) + 1)
        graph = core.copy()
        support = n
        chosen = n + 1
        graph.add_nodes_from(range(n, n + t + 2))
        graph.add_edge(q, support)
        graph.add_edge(support, chosen)
        for sibling in range(n + 2, n + t + 2):
            graph.add_edge(support, sibling)
        dgraph = graph.copy()
        dgraph.remove_node(p)
        reduced = graph.copy()
        reduced.remove_node(chosen)
        dreduced = dgraph.copy()
        dreduced.remove_node(chosen)
        delta = (
            value(rows(graph, u, v), rows(dgraph, u, v))
            - value(rows(reduced, u, v), rows(dreduced, u, v))
        )
        record = (delta, n, t, p == q, u, v, p, q)
        minimum = record if minimum is None or record < minimum else minimum
        if delta < 0:
            negative += 1
            print("GENUINE_NEGATIVE", trial, record)
            break
        if (trial + 1) % 500 == 0:
            print("PROGRESS", trial + 1, "MIN", minimum, flush=True)
    print("TRIALS", trial + 1, "NEGATIVE", negative, "MIN", minimum)
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
