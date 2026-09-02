#!/usr/bin/env python3
"""Finite falsification census for forest-edge monotonicity of the G1 leaf delta."""

from __future__ import annotations

from collections import Counter
import itertools

import networkx as nx
import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import binomial_basis, isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    replace_rows,
    structural,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


def row_data(prefix, four):
    return {
        f"{prefix}{family}{rank}": value
        for family, row in zip("EUVW", four)
        for rank, value in enumerate(row)
    }


def data(graph, mode, u, v, p, q=None):
    result = {"n": len(graph)} | row_data("R", rows(graph, u, v))
    sgraph = graph.copy()
    sgraph.remove_node(p if mode == "collision" else q)
    result |= row_data("S", rows(sgraph, u, v))
    if mode == "distinct":
        xgraph = graph.copy()
        xgraph.remove_node(p)
        ygraph = graph.copy()
        ygraph.remove_nodes_from((p, q))
        result |= row_data("X", rows(xgraph, u, v))
        result |= row_data("Y", rows(ygraph, u, v))
    return result


def main():
    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    ).subs(structural(rrows, n) | structural(srows, n - 1))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    ).subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    )
    coefficient_blocks = {
        "collision": binomial_basis(sp.expand(collision), t),
        "distinct": binomial_basis(sp.expand(distinct), t),
    }
    functions = {
        mode: [
            (tuple(sorted(value.free_symbols, key=str)),
             sp.lambdify(tuple(sorted(value.free_symbols, key=str)), value, "math"))
            for value in values
        ]
        for mode, values in coefficient_blocks.items()
    }
    signs = {mode: [Counter() for _ in range(8)] for mode in functions}
    maxima = {mode: [None] * 8 for mode in functions}
    cells = Counter()
    for graph0 in nx.graph_atlas_g():
        if not (3 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        components = {node: index for index, block in enumerate(nx.connected_components(graph)) for node in block}
        additions = [
            edge for edge in itertools.combinations(nodes, 2)
            if components[edge[0]] != components[edge[1]]
        ]
        for u, v in itertools.combinations(nodes, 2):
            if graph.has_edge(u, v):
                continue
            ordinary = tuple(node for node in nodes if node not in (u, v))
            mode_configs = [
                ("collision", p, None) for p in ordinary
            ] + [
                ("distinct", p, q) for p, q in itertools.permutations(ordinary, 2)
            ]
            for mode, p, q in mode_configs:
                before_data = data(graph, mode, u, v, p, q)
                before_values = [
                    int(evaluate(*(before_data[str(variable)] for variable in variables)))
                    for variables, evaluate in functions[mode]
                ]
                for edge in additions:
                    plus = graph.copy()
                    plus.add_edge(*edge)
                    if plus.has_edge(u, v):
                        continue
                    after_data = data(plus, mode, u, v, p, q)
                    margins = []
                    for index, (variables, evaluate) in enumerate(functions[mode]):
                        before_value = before_values[index]
                        after_value = int(evaluate(*(after_data[str(variable)] for variable in variables)))
                        margin = after_value - before_value
                        margins.append(margin)
                        label = "positive" if margin > 0 else "negative" if margin < 0 else "zero"
                        signs[mode][index][label] += 1
                        record = (margin, len(graph), tuple(sorted(graph.edges())), u, v, p, q, edge)
                        if maxima[mode][index] is None or record > maxima[mode][index]:
                            maxima[mode][index] = record
                    for sibling_count in range((11 * len(graph) - 1) // 10 + 1):
                        full_margin = sum(
                            sp.binomial(sibling_count, index) * margin
                            for index, margin in enumerate(margins)
                        )
                        if full_margin > 0:
                            print("POSITIVE_LOW_SIBLING_MARGINAL_COUNTEREXAMPLE", {
                                "mode": mode, "sibling_count": sibling_count,
                                "margin": int(full_margin), "order": len(graph),
                                "edges": tuple(sorted(graph.edges())),
                                "u": u, "v": v, "p": p, "q": q,
                                "added_edge": edge,
                                "binomial_margins": margins,
                            })
                            print("EXPLORATORY_ONLY_NO_MONOTONICITY_CLAIM")
                            return
                    cells[mode] += 1
    for mode in ("collision", "distinct"):
        print("MODE", mode, "CELLS", cells[mode])
        for index in range(8):
            print("COEFFICIENT", mode, index, dict(signs[mode][index]), "MAX", maxima[mode][index])
    print("EXPLORATORY_ONLY_NO_MONOTONICITY_CLAIM")


if __name__ == "__main__":
    main()
