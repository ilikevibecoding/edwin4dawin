#!/usr/bin/env python3
"""Finite exact diagnostics for the parent-rooted g1 residual.

This independently checks the algebraic parent-deletion substitution against
actual forests and measures whether the universal high-motif payment can be
dropped without further compensation.  A finite clean scan is evidence only;
a negative residual is a route obstruction, not a negative FML gap.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n4_bundle_g1_configuration_moments_agent import (
    connected_edge_subsets,
    direct_g1,
    invariant_data,
    neighbor_excess,
)


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_residual_probe_root_20260829.json"


def three_edge_five(graph: nx.Graph) -> int:
    count = 0
    for chosen in itertools.combinations(tuple(graph.edges()), 3):
        if len(set(itertools.chain.from_iterable(chosen))) == 5:
            count += 1
    return count


def exact_evaluator(expression: sp.Expr):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(24 * expression), *symbols)
    terms = [(monomial, int(coefficient)) for monomial, coefficient in polynomial.terms()]

    def evaluate(values: dict[str, int]) -> int:
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, power in zip(vector, monomial):
                if power:
                    term *= base**power
            numerator += term
        assert numerator % 24 == 0
        return numerator // 24

    return names, evaluate


def main() -> None:
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    expression = sp.sympify(dependency["rooted_residual"])
    names, evaluate = exact_evaluator(expression)

    cells = 0
    negative_residuals = 0
    minimum = None
    minimum_total = None
    by_order: dict[str, int] = {}
    for order in range(3, 8):
        local = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            r3 = connected_edge_subsets(graph, 3)
            r4 = connected_edge_subsets(graph, 4)
            q35 = three_edge_five(graph)
            r3_minus = {}
            for vertex in graph:
                reduced = graph.copy()
                reduced.remove_node(vertex)
                r3_minus[vertex] = connected_edge_subsets(reduced, 3)
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    data = invariant_data(graph, u, v, parent)
                    rooted_values = {
                        **data,
                        "degree_p": graph.degree(parent),
                        "neighbor_excess_p": neighbor_excess(graph, parent),
                        "adjacent_pu": int(graph.has_edge(parent, u)),
                        "adjacent_pv": int(graph.has_edge(parent, v)),
                        "common_neighbor_pu": len(
                            set(graph.neighbors(parent)) & set(graph.neighbors(u))
                        ),
                        "common_neighbor_pv": len(
                            set(graph.neighbors(parent)) & set(graph.neighbors(v))
                        ),
                    }
                    residual = evaluate(rooted_values)
                    high = (
                        2 * (order - 4) * r3
                        + 5 * q35
                        - 5 * r4
                        + (5 * order - 4) * (r3_minus[u] + r3_minus[v])
                        + 5 * r3_minus[parent]
                    )
                    total = direct_g1(graph, u, v, parent)
                    assert total == high + residual
                    assert high >= 0 and total >= 0
                    record = {
                        "order_G": order,
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "edges": sorted([sorted(edge) for edge in graph.edges()]),
                        "marks": [u, v],
                        "parent": parent,
                        "g1": total,
                        "high_motif_payment": high,
                        "parent_rooted_residual": residual,
                    }
                    if minimum is None or residual < minimum["parent_rooted_residual"]:
                        minimum = record
                    if minimum_total is None or total < minimum_total["g1"]:
                        minimum_total = record
                    negative_residuals += int(residual < 0)
                    cells += 1
                    local += 1
        by_order[str(order)] = local

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL",
        "orders_G": [3, 7],
        "marked_parent_cells": cells,
        "negative_parent_rooted_residuals": negative_residuals,
        "minimum_parent_rooted_residual": minimum,
        "minimum_total_g1": minimum_total,
        "by_order": by_order,
        "interpretation": (
            "A negative residual only shows that the proved high-motif payment "
            "cannot be discarded wholesale; total g1 remains nonnegative in every cell."
        ),
        "dependency": {
            "file": DEPENDENCY.name,
            "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "scope": "Complete exact graph-atlas forest probe through order seven; no all-order theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
