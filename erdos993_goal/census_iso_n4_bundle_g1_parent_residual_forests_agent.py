#!/usr/bin/env python3
"""Complete exact finite census of the deepest-ordinary g1 residual.

Every unlabeled forest of orders 3 through 11 is generated uniquely as a
multiset of unlabeled tree components.  For every unordered marked pair
u,v and every distinct parent p, this evaluates the exact parent-rooted
residual after the separately proved high-motif payment.

This is a finite census, not an all-order proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_residual_forest_census_agent_20260829.json"
FOREST_COUNTS = {
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
}


def unlabeled_forests(order: int):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))

    answer = []

    def extend(remaining: int, start: int, chosen: list[int]):
        if remaining == 0:
            answer.append(
                nx.disjoint_union_all([tree_types[index][1] for index in chosen])
            )
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            extend(remaining - size, index, [*chosen, index])

    extend(order, 0, [])
    return answer


def exact_rational_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = [
        (monomial, int(coefficient * denominator))
        for monomial, coefficient in polynomial.terms()
    ]

    def evaluate(values):
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            value = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    value *= base**exponent
            numerator += value
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def graph_data(graph: nx.Graph):
    degrees = dict(graph.degree())
    neighbors = {vertex: set(graph.neighbors(vertex)) for vertex in graph}
    excess = {
        vertex: sum(degrees[neighbor] - 1 for neighbor in neighbors[vertex])
        for vertex in graph
    }
    common = {
        (left, right): len(neighbors[left] & neighbors[right])
        for left in graph
        for right in graph
        if left != right
    }
    return {
        "n": len(graph),
        "edges": graph.number_of_edges(),
        "wedges": sum(comb(degree, 2) for degree in degrees.values()),
        "degrees": degrees,
        "neighbors": neighbors,
        "excess": excess,
        "common": common,
    }


def values(data, u, v, parent):
    degrees = data["degrees"]
    neighbors = data["neighbors"]
    return {
        "n": data["n"],
        "C_common_neighbor": data["common"][(u, v)],
        "C_neighbor_excess_u": data["excess"][u],
        "C_neighbor_excess_v": data["excess"][v],
        "C_wedges_E": data["wedges"],
        "adjacent": int(v in neighbors[u]),
        "degree_u": degrees[u],
        "degree_v": degrees[v],
        "edge_count": data["edges"],
        "parent_adjacent_u": int(u in neighbors[parent]),
        "parent_adjacent_v": int(v in neighbors[parent]),
        "parent_common_neighbor_u": data["common"][(parent, u)],
        "parent_common_neighbor_v": data["common"][(parent, v)],
        "parent_degree": degrees[parent],
        "parent_neighbor_excess": data["excess"][parent],
    }


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == (
        "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT"
    )
    expression = sp.sympify(dependency["parent_rooted_form"])
    evaluate = exact_rational_evaluator(expression)

    total_forests = 0
    total_cells = 0
    negative = 0
    zero = 0
    minimum = None
    by_order = {}
    for order in range(3, 12):
        forests = unlabeled_forests(order)
        assert len(forests) == FOREST_COUNTS[order]
        local_cells = 0
        local_minimum = None
        for graph in forests:
            data = graph_data(graph)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(graph.nodes(), 2):
                for parent in graph.nodes():
                    if parent in (u, v):
                        continue
                    residual = evaluate(values(data, u, v, parent))
                    witness = {
                        "value": residual,
                        "order": order,
                        "graph6": graph6,
                        "edges": list(graph.edges()),
                        "marks": [u, v],
                        "parent": parent,
                    }
                    if minimum is None or residual < minimum["value"]:
                        minimum = witness
                    if local_minimum is None or residual < local_minimum["value"]:
                        local_minimum = witness
                    negative += int(residual < 0)
                    zero += int(residual == 0)
                    total_cells += 1
                    local_cells += 1
        expected_cells = FOREST_COUNTS[order] * comb(order, 2) * (order - 2)
        assert local_cells == expected_cells
        by_order[str(order)] = {
            "forest_types": len(forests),
            "marked_parent_cells": local_cells,
            "minimum": local_minimum,
        }
        total_forests += len(forests)
        print(json.dumps({"order": order, **by_order[str(order)]}, sort_keys=True), flush=True)

    assert negative == 0
    report = {
        "marker": "PASS_EXACT_FINITE_CENSUS_ISO_N4_BUNDLE_G1_PARENT_RESIDUAL_FORESTS_N3_TO_N11_AGENT",
        "finite_census": {
            "orders": [3, 11],
            "forest_types": total_forests,
            "marked_parent_cells": total_cells,
            "negative": negative,
            "zero": zero,
            "minimum": minimum,
            "by_order": by_order,
        },
        "generation": (
            "Every unlabeled forest is generated uniquely as a nondecreasing "
            "multiset of nonisomorphic tree components; all unordered u,v and "
            "all distinct p are then checked."
        ),
        "conclusion": (
            "The exact residual after the proved high-motif payment is positive "
            "on every deepest-ordinary singleton-parent cell with 3<=|G|<=11."
        ),
        "scope": (
            "Complete finite census only. It does not prove the residual for "
            "|G|>=12 or cover parent equal to a mark or a non-singleton support."
        ),
        "dependency": {
            "report": DEPENDENCY.name,
            "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "finite_census"}, indent=2, sort_keys=True))
    print(json.dumps({key: value for key, value in report["finite_census"].items() if key != "by_order"}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
