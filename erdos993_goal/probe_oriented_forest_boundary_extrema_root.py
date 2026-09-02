#!/usr/bin/env python3
"""Finite extrema table for pointed out-boundary coefficients of oriented forests."""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=7)
    parser.add_argument("--output", type=Path, default=Path("oriented_forest_boundary_extrema_root_20260829.json"))
    args = parser.parse_args()
    records = {}
    orientations = subset_checks = 0
    for n in range(1, args.max_order + 1):
        extrema = [0] * (n + 1)
        witnesses = [None] * (n + 1)
        family = [nx.path_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for tree_index, tree0 in enumerate(family):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            edges = sorted(tuple(sorted(edge)) for edge in tree.edges())
            for states in itertools.product(range(3), repeat=len(edges)):
                out = [0] * n
                directed = []
                for (u, v), state in zip(edges, states):
                    if state == 1:
                        out[u] |= 1 << v
                        directed.append((u, v))
                    elif state == 2:
                        out[v] |= 1 << u
                        directed.append((v, u))
                orientations += 1
                for point in range(n):
                    counts = [0] * (n + 1)
                    point_bit = 1 << point
                    for subset in range(1 << n):
                        if not subset & point_bit:
                            continue
                        boundary = 0
                        active = subset
                        while active:
                            bit = active & -active
                            boundary |= out[bit.bit_length() - 1]
                            active ^= bit
                        boundary &= ~subset
                        counts[boundary.bit_count()] += 1
                        subset_checks += 1
                    for excess, count in enumerate(counts):
                        if count > extrema[excess]:
                            extrema[excess] = count
                            witnesses[excess] = {
                                "tree_index": tree_index,
                                "point": point,
                                "directed_edges": directed,
                            }
        rows = []
        for excess, count in enumerate(extrema):
            rows.append({
                "excess": excess,
                "maximum_count": count,
                "binomial_n_minus_1": comb(n - 1, excess) if excess <= n - 1 else 0,
                "target_capacity": excess * comb(n, excess) if excess else 0,
                "witness": witnesses[excess],
            })
        records[str(n)] = rows
        print("ORDER", n, [(row["excess"], row["maximum_count"]) for row in rows], flush=True)
    report = {
        "status": "PASS_FINITE_EXTREMA_TABLE_ONLY",
        "max_order": args.max_order,
        "orientations": orientations,
        "subset_checks": subset_checks,
        "records": records,
        "scope": "finite extrema evidence only; not an all-order boundary theorem",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
