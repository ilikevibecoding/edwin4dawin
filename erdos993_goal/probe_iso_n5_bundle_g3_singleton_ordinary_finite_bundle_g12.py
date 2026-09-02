#!/usr/bin/env python3
"""Exact exhaustive finite branch for singleton-ordinary rank-five g3."""

from __future__ import annotations

import functools
import itertools
from collections import Counter

import networkx as nx

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import g3_rows


def unlabeled_forests(order):
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def row_cache(graph):
    n = len(graph)
    neighbours = [sum(1 << w for w in graph.neighbors(v)) for v in range(n)]

    @functools.lru_cache(None)
    def polynomial(mask):
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        bit = mask & -mask
        v = bit.bit_length() - 1
        without = polynomial(mask ^ bit)
        without_closed = polynomial(mask & ~bit & ~neighbours[v])
        return tuple(without[k] + (without_closed[k - 1] if k else 0) for k in range(7))

    full = (1 << n) - 1

    def removed(vertices):
        mask = full
        for vertex in vertices:
            mask &= ~(1 << vertex)
        return polynomial(mask)

    return removed, polynomial


def main():
    total = 0
    minimum = None
    rows = {}
    for order in range(3, 13):
        forests = configs = 0
        local_min = None
        for graph in unlabeled_forests(order):
            forests += 1
            removed, _cache = row_cache(graph)
            for u, v in itertools.combinations(range(order), 2):
                crows = tuple(removed(r) for r in ((), (u,), (v,), (u, v)))
                for p in range(order):
                    if p in (u, v):
                        continue
                    drows = tuple(removed(r) for r in ((p,), (p, u), (p, v), (p, u, v)))
                    value = g3_rows(crows, drows)
                    assert value >= 0, (order, graph.edges(), u, v, p, value)
                    configs += 1
                    total += 1
                    local_min = value if local_min is None else min(local_min, value)
                    minimum = value if minimum is None else min(minimum, value)
        rows[order] = (forests, configs, local_min)
        print(order, rows[order], "total", total, flush=True)
    print("PASS", total, minimum, rows)


if __name__ == "__main__":
    main()
