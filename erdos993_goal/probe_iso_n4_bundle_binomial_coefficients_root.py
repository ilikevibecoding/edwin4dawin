#!/usr/bin/env python3
"""Probe the binomial-basis coefficients of the rank-four bundle payment.

For each marked forest base, unmarked support, and M=0..6, evaluate the exact
whole-bundle payment Gamma_M and finite-difference it.  The symbolic derivation
shows degree at most six, with the sixth coefficient identically zero and the
fifth equal to 50 on genuine four-minor tuples.  This probe tests the remaining
four coefficients on exact forest cells.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json

import networkx as nx

from derive_iso_leaf_bundle_telescope_agent import bundle_components
from probe_iso_leaf_cross_remainder_root import graph6


def differences(values: list[int]) -> list[int]:
    coefficients = []
    while values:
        coefficients.append(values[0])
        values = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    return coefficients


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=9)
    args = parser.parse_args()
    minima: dict[int, dict | None] = {rank: None for rank in range(7)}
    negatives = {rank: 0 for rank in range(7)}
    cells = 0

    graphs = []
    for order in range(3, args.max_tree_order + 1):
        graphs.extend(nx.nonisomorphic_trees(order))
    graphs.extend(
        nx.convert_node_labels_to_integers(graph)
        for graph in nx.graph_atlas_g()
        if len(graph) >= 3 and nx.is_forest(graph)
    )

    for graph in graphs:
        vertices = tuple(graph)
        for marks in itertools.combinations(vertices, 2):
            for support in vertices:
                if support in marks:
                    continue
                values = [0]
                for number in range(1, 7):
                    pieces = bundle_components(graph, marks, support, number, 4)
                    values.append(sum(pieces))
                coefficients = differences(values)
                assert coefficients[0] == 0
                assert coefficients[5] == 50
                assert coefficients[6] == 0
                for rank, value in enumerate(coefficients):
                    witness = {
                        "value": value,
                        "binomial_rank": rank,
                        "order": len(graph),
                        "graph6": graph6(graph),
                        "marks": marks,
                        "support": support,
                        "gamma_0_to_6": values,
                    }
                    if minima[rank] is None or value < minima[rank]["value"]:
                        minima[rank] = witness
                    negatives[rank] += int(value < 0)
                cells += 1

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_BINOMIAL_COEFFICIENTS",
        "tree_order_max": args.max_tree_order,
        "marked_support_cells": cells,
        "minima": minima,
        "negative_counts": negatives,
        "scope": "Finite exact forest evidence only.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
