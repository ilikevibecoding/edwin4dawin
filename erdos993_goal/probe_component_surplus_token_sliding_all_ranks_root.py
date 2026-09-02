#!/usr/bin/env python3
"""Bounded diagnostic for the all-rank token-sliding surplus inequality."""

from __future__ import annotations

import argparse
import itertools
import math

import networkx as nx


def independent(edges, chosen):
    selected = set(chosen)
    return all(not (u in selected and v in selected) for u, v in edges)


def row(tree, rank):
    vertices = tuple(tree)
    edges = tuple(tree.edges())
    count = sum(
        independent(edges, chosen)
        for chosen in itertools.combinations(vertices, rank)
    )
    closed = {v: {v, *tree.neighbors(v)} for v in vertices}
    slides = 0
    for u, v in edges:
        allowed = tuple(x for x in vertices if x not in closed[u] | closed[v])
        slides += sum(
            independent(edges, chosen)
            for chosen in itertools.combinations(allowed, rank - 1)
        )
    n = len(vertices)
    w = math.comb(n - 2, 2)
    surplus = sum(math.comb(tree.degree(v) - 1, 2) for v in vertices)
    matching_two = w - surplus
    return rank * matching_two * count - w * slides, count, slides


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=11)
    parser.add_argument("--max-rank", type=int, default=6)
    args = parser.parse_args()
    for rank in range(2, args.max_rank + 1):
        minimum = None
        checked = 0
        for n in range(max(4, rank), args.max_order + 1):
            for index, tree in enumerate(nx.nonisomorphic_trees(n)):
                margin, count, slides = row(tree, rank)
                if not count:
                    continue
                candidate = (
                    margin,
                    n,
                    index,
                    count,
                    slides,
                    nx.to_graph6_bytes(tree, header=False).decode().strip(),
                )
                minimum = candidate if minimum is None else min(minimum, candidate)
                checked += 1
                if margin < 0:
                    print(f"RANK {rank} FAIL {candidate}", flush=True)
                    break
            if minimum is not None and minimum[0] < 0:
                break
        if minimum is not None and minimum[0] >= 0:
            print(f"RANK {rank} PASS_DIAGNOSTIC checked={checked} minimum={minimum}", flush=True)


if __name__ == "__main__":
    main()
