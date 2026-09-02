#!/usr/bin/env python3
"""Audit the degree-excess wedge cap and close finite g1 orders 8..11.

The degree-excess lemma is all-order.  The finite part constructs every
unlabelled forest as a multiset of unlabelled tree components, then checks
every unordered marked pair and every distinct parent.  It independently
evaluates Gamma_1 from cached forest independence polynomials and compares it
to the root configuration form.  This file does not prove the separate
large-order polynomial cone.
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
ROOT_SOURCE = HERE / "derive_iso_n4_bundle_g1_configuration_root.py"
ROOT_REPORT = HERE / "iso_n4_bundle_g1_configuration_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_degree_excess_finite_exact_agent_20260829.json"
EXPECTED_FORESTS = {8: 76, 9: 153, 10: 329, 11: 710}


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def multiply(left, right, cap=5):
    answer = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                answer[i + j] += a * b
    return tuple(answer)


def add(left, right):
    return tuple(
        (left[k] if k < len(left) else 0) + (right[k] if k < len(right) else 0)
        for k in range(max(len(left), len(right)))
    )


def independence_prefix(graph, removed=frozenset(), cap=5):
    remaining = set(graph).difference(removed)
    seen = set()

    def visit(vertex, parent):
        seen.add(vertex)
        excluded = (1,)
        included = (0, 1)
        for child in graph.neighbors(vertex):
            if child == parent or child in removed:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included), cap)
            included = multiply(included, child_excluded, cap)
        return excluded, included

    result = (1,)
    for root in sorted(remaining):
        if root in seen:
            continue
        excluded, included = visit(root, None)
        result = multiply(result, add(excluded, included), cap)
    return result


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


def isolate_once(rows):
    return tuple(
        tuple(at(row, rank) + at(row, rank - 1) for rank in range(6))
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(at(row, rank) + at(drow, rank - 1) for rank in range(6))
        for row, drow in zip(rows, drows)
    )


def direct_g1(polynomial, u, v, parent):
    crows = tuple(
        polynomial(frozenset(removed))
        for removed in ((), (u,), (v,), (u, v))
    )
    drows = tuple(
        polynomial(frozenset((parent, *removed)))
        for removed in ((), (u,), (v,), (u, v))
    )
    t0 = add_xd(crows, drows)
    t1 = add_xd(isolate_once(crows), drows)
    return int(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))


def wedges(graph):
    return sum(comb(degree, 2) for _, degree in graph.degree())


def neighbor_excess(graph, vertex):
    return sum(graph.degree(neighbor) - 1 for neighbor in graph.neighbors(vertex))


def connected_edge_subsets(graph, size):
    count = 0
    for selected in itertools.combinations(tuple(graph.edges()), size):
        vertices = set(itertools.chain.from_iterable(selected))
        if len(vertices) != size + 1:
            continue
        test = nx.Graph()
        test.add_edges_from(selected)
        count += int(nx.is_connected(test))
    return count


def stars3(graph):
    return sum(comb(degree, 3) for _, degree in graph.degree())


def c2(value):
    return value * (value - 1) // 2


def i5_configuration(graph):
    n = len(graph)
    e = graph.number_of_edges()
    s = wedges(graph)
    r3 = connected_edge_subsets(graph, 3)
    h = stars3(graph)
    r4 = connected_edge_subsets(graph, 4)
    mixed = s * (e - 2) - 2 * r3 - h
    return (
        comb(n, 5)
        - e * comb(n - 2, 3)
        + s * comb(n - 3, 2)
        + (comb(e, 2) - s) * (n - 4)
        - r3 * (n - 4)
        - mixed
        + r4
    )


def component_types(maximum_order):
    types = []
    for order in range(1, maximum_order + 1):
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for local_index, graph0 in enumerate(candidates):
            graph = nx.convert_node_labels_to_integers(graph0)
            types.append((order, local_index, graph))
    return types


def unlabelled_forests(order, types):
    chosen = []

    def recurse(remaining, start):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][2] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            chosen.append(index)
            yield from recurse(remaining - size, index)
            chosen.pop()

    yield from recurse(order, 0)


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(24 * expression), *symbols)
    terms = [(monomial, int(coefficient)) for monomial, coefficient in polynomial.terms()]

    def evaluate(values):
        vector = tuple(values[str(symbol)] for symbol in symbols)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % 24 == 0
        return numerator // 24

    return evaluate


def configuration_data(graph, u, v, parent, cache):
    dgraph = cache["deleted_graphs"][parent]
    return {
        "n": len(graph),
        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
        "C_connected3_E": cache["r3"],
        "C_connected3_U": cache["r3_deleted"][u],
        "C_connected3_V": cache["r3_deleted"][v],
        "C_connected4_E": cache["r4"],
        "C_neighbor_excess_u": cache["neighbor_excess"][u],
        "C_neighbor_excess_v": cache["neighbor_excess"][v],
        "C_stars3_E": cache["stars3"],
        "C_wedges_E": cache["wedges"],
        "D_connected3_E": cache["r3_deleted"][parent],
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


def graph_cache(graph):
    deleted_graphs = {}
    r3_deleted = {}
    for vertex in graph:
        reduced = graph.copy()
        reduced.remove_node(vertex)
        deleted_graphs[vertex] = reduced
        r3_deleted[vertex] = connected_edge_subsets(reduced, 3)
    return {
        "deleted_graphs": deleted_graphs,
        "r3_deleted": r3_deleted,
        "r3": connected_edge_subsets(graph, 3),
        "r4": connected_edge_subsets(graph, 4),
        "stars3": stars3(graph),
        "wedges": wedges(graph),
        "neighbor_excess": {vertex: neighbor_excess(graph, vertex) for vertex in graph},
    }


def degree_excess_upper(graph, special):
    e = graph.number_of_edges()
    if e == 0:
        return 0
    marked = 0
    distinguished_wedges = 0
    for vertex in special:
        degree = graph.degree(vertex)
        positive = int(degree > 0)
        marked += degree - positive
        distinguished_wedges += comb(degree, 2)
    remainder = e - 1 - marked
    assert remainder >= 0
    return distinguished_wedges + comb(remainder + 1, 2)


def finite_audit(expression):
    evaluate = exact_evaluator(expression)
    types = component_types(max(EXPECTED_FORESTS))
    total_forests = 0
    total_cells = 0
    minimum = None
    minimum_wedge_slack = None
    by_order = {}
    i5_checks = 0
    direct_checks = 0
    for order, expected in EXPECTED_FORESTS.items():
        local_forests = 0
        local_cells = 0
        local_minimum = None
        for forest_index, graph0 in enumerate(unlabelled_forests(order, types)):
            graph = nx.convert_node_labels_to_integers(graph0)
            assert nx.is_forest(graph) and len(graph) == order
            cache = graph_cache(graph)
            polynomial_cache = {}

            def polynomial(removed):
                if removed not in polynomial_cache:
                    polynomial_cache[removed] = independence_prefix(graph, removed, 5)
                return polynomial_cache[removed]

            direct_i5 = at(polynomial(frozenset()), 5)
            configured_i5 = i5_configuration(graph)
            assert direct_i5 == configured_i5
            i5_checks += 1
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    upper = degree_excess_upper(graph, (u, v, parent))
                    wedge_slack = upper - cache["wedges"]
                    assert wedge_slack >= 0
                    minimum_wedge_slack = (
                        wedge_slack
                        if minimum_wedge_slack is None
                        else min(minimum_wedge_slack, wedge_slack)
                    )
                    configured = evaluate(configuration_data(graph, u, v, parent, cache))
                    direct = direct_g1(polynomial, u, v, parent)
                    assert configured == direct
                    assert direct >= 0
                    direct_checks += 1
                    record = {
                        "g1": direct,
                        "order": order,
                        "forest_index": forest_index,
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "edges": sorted([sorted(edge) for edge in graph.edges()]),
                        "marks": [u, v],
                        "parent": parent,
                        "wedge_upper_slack": wedge_slack,
                    }
                    if minimum is None or direct < minimum["g1"]:
                        minimum = record
                    if local_minimum is None or direct < local_minimum:
                        local_minimum = direct
                    total_cells += 1
                    local_cells += 1
            total_forests += 1
            local_forests += 1
        assert local_forests == expected, (order, local_forests, expected)
        expected_cells = expected * comb(order, 2) * (order - 2)
        assert local_cells == expected_cells
        by_order[str(order)] = {
            "unlabelled_forests": local_forests,
            "marked_parent_cells": local_cells,
            "minimum_g1": local_minimum,
        }
    return {
        "orders": [min(EXPECTED_FORESTS), max(EXPECTED_FORESTS)],
        "unlabelled_forests": total_forests,
        "marked_parent_cells": total_cells,
        "by_order": by_order,
        "minimum": minimum,
        "minimum_degree_excess_wedge_slack": minimum_wedge_slack,
        "independent_i5_checks": i5_checks,
        "independent_direct_Gamma1_checks": direct_checks,
        "generation": (
            "unique multisets of NetworkX nonisomorphic free-tree component "
            "types, including K1; forest counts independently pinned by order"
        ),
    }


def symbolic_degree_excess_lemma():
    n, y = sp.symbols("n y", integer=True, nonnegative=True)
    edgeless = sp.factor((n - 1) * (65 * n**3 - 89 * n**2 - 238 * n + 192) / 24)
    shifted_inner = sp.expand((65 * n**3 - 89 * n**2 - 238 * n + 192).subs(n, y + 3))
    assert shifted_inner == 65 * y**3 + 496 * y**2 + 983 * y + 432
    return {
        "positive_degree_excess_identity": (
            "If c_plus is the number of nontrivial components, then the number "
            "of positive-degree vertices is e+c_plus, so sum_{d>0}(d-1)="
            "2e-(e+c_plus)=e-c_plus<=e-1."
        ),
        "convex_merge_identity": (
            "C(a+1,2)+C(b+1,2)<=C(a+b+1,2), with exact slack a*b>=0; "
            "iteration concentrates all undistinguished excess into one vertex."
        ),
        "conclusion": (
            "For distinct u,v,p with z_i=1_{d_i>0}, x_i=d_i-z_i, and "
            "r=e-1-x_u-x_v-x_p>=0: S<=sum_i C(d_i,2)+C(r+1,2)."
        ),
        "edgeless_g1": str(edgeless),
        "edgeless_inner_shift_n_equals_3_plus_y": str(shifted_inner),
    }


def main():
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    assert root["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_CONFIGURATION_FORM"
    expression = sp.sympify(root["deepest_singleton_ordinary_form"])
    finite = finite_audit(expression)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_DEGREE_EXCESS_AND_ORDERS8_11_AGENT",
        "degree_excess_lemma": symbolic_degree_excess_lemma(),
        "finite_all_forest_audit": finite,
        "scope": (
            "Universal degree-excess wedge cap, universal edgeless branch, and "
            "complete exact g1 verification for all forests of orders 8..11. "
            "The nonempty large-order residual cone remains a separate obligation."
        ),
        "dependencies": {
            ROOT_SOURCE.name: hashlib.sha256(ROOT_SOURCE.read_bytes()).hexdigest().upper(),
            ROOT_REPORT.name: hashlib.sha256(ROOT_REPORT.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(report["marker"])
    print("FORESTS", finite["unlabelled_forests"], "CELLS", finite["marked_parent_cells"])
    print("MINIMUM", json.dumps(finite["minimum"], sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
