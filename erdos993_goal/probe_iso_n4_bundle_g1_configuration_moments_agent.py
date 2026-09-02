#!/usr/bin/env python3
"""Exact probes for the deepest-ordinary rank-four bundle coefficient g1.

This agent-owned file never asserts an all-order sign theorem.  It
independently checks the forest i5 inclusion-exclusion formula, rebuilds g1
directly as Gamma_1, and records finite forest/configuration diagnostics that
can be used to design (or refute) a proposed moment/shadow relaxation.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_nested_near_diagonal_root import nested2
from prove_iso_compact_ordinary_prefix_r2_r3_root import compact_pieces


HERE = Path(__file__).resolve().parent
ROOT_REPORT = HERE / "iso_n4_bundle_g1_configuration_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_configuration_moments_probe_agent_20260829.json"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return (
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def convolve_isolates(rows, number, maximum=5):
    return tuple(
        tuple(
            sum(comb(number, shift) * at(row, rank - shift) for shift in range(rank + 1))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(
            at(row, rank) + at(drow, rank - 1)
            for rank in range(max(6, len(row), len(drow) + 1))
        )
        for row, drow in zip(rows, drows)
    )


def independent_polynomial(graph):
    vertices = tuple(graph)
    values = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        chosen = {vertices[j] for j in range(len(vertices)) if mask & (1 << j)}
        if all(not (a in chosen and b in chosen) for a, b in graph.edges()):
            values[len(chosen)] += 1
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return tuple(values)


def minor_rows(graph, marks):
    u, v = marks
    result = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(independent_polynomial(reduced))
    return tuple(result)


def direct_g1(graph, u, v, parent):
    dgraph = graph.copy()
    dgraph.remove_node(parent)
    crows = minor_rows(graph, (u, v))
    drows = minor_rows(dgraph, (u, v))
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1), drows)
    gamma1 = nested(t1, 4) - nested(t0, 4) - nested(crows, 3)
    return int(gamma1)


def wedges(graph):
    return sum(comb(degree, 2) for _, degree in graph.degree())


def connected_edge_subsets(graph, edge_count):
    count = 0
    for chosen in itertools.combinations(tuple(graph.edges()), edge_count):
        vertices = set(itertools.chain.from_iterable(chosen))
        if len(vertices) != edge_count + 1:
            continue
        test = nx.Graph()
        test.add_edges_from(chosen)
        count += int(nx.is_connected(test))
    return count


def stars3(graph):
    return sum(comb(degree, 3) for _, degree in graph.degree())


def neighbor_excess(graph, vertex):
    return sum(graph.degree(neighbor) - 1 for neighbor in graph.neighbors(vertex))


def c2(x):
    return x * (x - 1) // 2


def i5_formula(graph):
    n = len(graph)
    e = graph.number_of_edges()
    s = wedges(graph)
    r = connected_edge_subsets(graph, 3)
    h = stars3(graph)
    w = connected_edge_subsets(graph, 4)
    mixed = s * (e - 2) - 2 * r - h
    return (
        comb(n, 5)
        - e * comb(n - 2, 3)
        + s * comb(n - 3, 2)
        + (comb(e, 2) - s) * (n - 4)
        - r * (n - 4)
        - mixed
        + w
    )


def invariant_data(graph, u, v, parent):
    dgraph = graph.copy()
    dgraph.remove_node(parent)
    gu = graph.copy(); gu.remove_node(u)
    gv = graph.copy(); gv.remove_node(v)
    return {
        "n": len(graph),
        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
        "C_connected3_E": connected_edge_subsets(graph, 3),
        "C_connected3_U": connected_edge_subsets(gu, 3),
        "C_connected3_V": connected_edge_subsets(gv, 3),
        "C_connected4_E": connected_edge_subsets(graph, 4),
        "C_neighbor_excess_u": neighbor_excess(graph, u),
        "C_neighbor_excess_v": neighbor_excess(graph, v),
        "C_stars3_E": stars3(graph),
        "C_wedges_E": wedges(graph),
        "D_connected3_E": connected_edge_subsets(dgraph, 3),
        "D_degree_u": dgraph.degree(u),
        "D_degree_v": dgraph.degree(v),
        "D_edges": dgraph.number_of_edges(),
        "D_neighbor_excess_u": neighbor_excess(dgraph, u),
        "D_neighbor_excess_v": neighbor_excess(dgraph, v),
        "D_wedges_E": wedges(dgraph),
        "adjacent": int(graph.has_edge(u, v)),
        "degree_u": graph.degree(u),
        "degree_v": graph.degree(v),
        "edge_count": graph.number_of_edges(),
    }


def evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(24 * expression), *symbols)
    terms = [(monomial, int(coefficient)) for monomial, coefficient in polynomial.terms()]

    def evaluate(values):
        assert {str(symbol) for symbol in symbols} == set(values)
        vector = tuple(values[str(symbol)] for symbol in symbols)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                term *= base**exponent
            numerator += term
        assert numerator % 24 == 0
        return numerator // 24

    return evaluate


def finite_probe(expression):
    evaluate = evaluator(expression)
    forest_checks = 0
    i5_checks = 0
    cells = 0
    minimum = None
    component_minima = {
        "compact_A_twice": None,
        "compact_B_twice": None,
        "isolate_source_twice": None,
        "cross_source_twice": None,
    }
    component_negatives = {key: 0 for key in component_minima}
    by_order = {}
    for order in range(3, 8):
        local = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            direct_i5 = at(independent_polynomial(graph), 5)
            assert direct_i5 == i5_formula(graph)
            i5_checks += 1
            forest_checks += 1
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    value = direct_g1(graph, u, v, parent)
                    data = invariant_data(graph, u, v, parent)
                    configured = evaluate(data)
                    assert value == configured, (
                        order,
                        nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        u,
                        v,
                        parent,
                        value,
                        configured,
                        data,
                    )
                    if value < 0:
                        raise AssertionError((order, nx.to_graph6_bytes(graph, header=False), u, v, parent, value, data))
                    dgraph = graph.copy(); dgraph.remove_node(parent)
                    crows = minor_rows(graph, (u, v))
                    drows = minor_rows(dgraph, (u, v))
                    compact_a, compact_b = map(int, compact_pieces(crows, drows, 4))
                    isolate_rows = convolve_isolates(crows, 1)
                    isolate_source = int(
                        nested2(isolate_rows, 4, 4)
                        - nested2(crows, 4, 4)
                        - nested2(crows, 3, 3)
                    )
                    components = {
                        "compact_A_twice": compact_a,
                        "compact_B_twice": compact_b,
                        "isolate_source_twice": isolate_source,
                        "cross_source_twice": 2 * value - isolate_source,
                    }
                    assert compact_a + compact_b == 2 * value
                    for key, component_value in components.items():
                        if component_value < 0:
                            component_negatives[key] += 1
                        component_row = {
                            "value": component_value,
                            "order_G": order,
                            "G_graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "marks": [u, v],
                            "parent": parent,
                        }
                        if component_minima[key] is None or component_value < component_minima[key]["value"]:
                            component_minima[key] = component_row
                    row = {
                        "g1": value,
                        "order_G": order,
                        "G_graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "G_edges": sorted([sorted(edge) for edge in graph.edges()]),
                        "marks": [u, v],
                        "parent": parent,
                        "data": data,
                    }
                    if minimum is None or (value, row["G_graph6"], u, v, parent) < (
                        minimum["g1"], minimum["G_graph6"], *minimum["marks"], minimum["parent"]
                    ):
                        minimum = row
                    cells += 1
                    local += 1
        by_order[str(order)] = local
    return {
        "orders_G": [3, 7],
        "forests": forest_checks,
        "i5_formula_checks": i5_checks,
        "marked_parent_cells": cells,
        "by_order": by_order,
        "minimum": minimum,
        "component_minima": component_minima,
        "component_negatives": component_negatives,
        "scope": "finite exact graph-atlas probe only; not an all-order proof",
    }


def main():
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    assert root["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_CONFIGURATION_FORM"
    expression = sp.sympify(root["deepest_singleton_ordinary_form"])
    finite = finite_probe(expression)
    report = {
        "marker": "PASS_EXACT_FINITE_ISO_N4_BUNDLE_G1_CONFIGURATION_AND_I5_PROBE_AGENT",
        "finite_probe": finite,
        "i5_audit": {
            "formula": root["i5_formula"],
            "classification": (
                "edge inclusion-exclusion: two edges are a wedge or matching; "
                "three-edge union <=5 is connected or wedge-plus-disjoint, with "
                "mixed=S(e-2)-2R-H; four-edge union <=5 is connected"
            ),
        },
        "dependency": {
            ROOT_REPORT.name: hashlib.sha256(ROOT_REPORT.read_bytes()).hexdigest().upper(),
        },
        "scope": "Independent formula/configuration replay and finite evidence only; no universal g1 sign theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(report["marker"])
    print("CELLS", finite["marked_parent_cells"], "MINIMUM", finite["minimum"]["g1"])
    print("MINIMUM_WITNESS", json.dumps(finite["minimum"], sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
