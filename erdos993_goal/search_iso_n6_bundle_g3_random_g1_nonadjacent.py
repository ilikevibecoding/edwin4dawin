#!/usr/bin/env python3
"""Deterministic random falsification search for rank-six bundle g3."""

from __future__ import annotations

import random

import networkx as nx
import sympy as sp

import explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent as structure
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import numeric_g3
from probe_iso_leaf_cross_remainder_root import poly_forest


def row(graph, maximum=7):
    values = poly_forest(graph)
    return tuple(values[k] if k < len(values) else 0 for k in range(maximum + 1))


def rows(graph, u, v):
    result = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(row(reduced))
    return tuple(result)


def random_forest(rng, order):
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    # Random recursive forest, deliberately spanning sparse to nearly-tree.
    for vertex in range(1, order):
        if rng.random() < 0.78:
            graph.add_edge(vertex, rng.randrange(vertex))
    assert nx.is_forest(graph)
    return graph


def main():
    rng = random.Random(993603)
    raw, _ = structure.reconstruct_g3()
    structural, _ = structure.structural_substitution()
    cpart, _ = structure.partition_substitution("C", "c", 7)
    dpart, _ = structure.partition_substitution("D", "d", 6)
    partitioned = sp.expand(raw.subs(structural).subs(cpart).subs(dpart))
    dvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("D")), key=str))
    cvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("C")), key=str))
    nvar = next(x for x in partitioned.free_symbols if str(x) == "n")
    zero_d = sp.expand(partitioned.subs({x: 0 for x in dvars}))
    base_eval = sp.lambdify((nvar, *cvars), zero_d, modules="math")
    derivative_evals = [
        sp.lambdify((nvar, *cvars), sp.diff(partitioned, dvar), modules="math")
        for dvar in dvars
    ]
    symbol = {str(value): value for value in partitioned.free_symbols}
    def s(name):
        return symbol[name]
    coarse = sp.expand(zero_d
        - (7*s("CB3") + s("CW2") + 7*s("CW3"))*s("CA3")
        - (7*s("CA3") + s("CW2") + 7*s("CW3"))*s("CB3")
        - 7*s("CA6") - 7*s("CB6")
        - (s("CA3") + 7*s("CA4") + s("CB3") + 7*s("CB4")
           + 2*s("CW3") + 7*s("CW4") + 7*s("CZ4"))*s("CW2")
        - 2*s("CW3")**2 - 2*(nvar + 6)*s("CW5") - 7*s("CW6")
        - 7*s("CW2")*s("CZ4") - 7*s("CZ6")
    )
    coarse_eval = sp.lambdify((nvar, *cvars), coarse, modules="math")

    arbitrary_min = None
    support_min = None
    box_minimum = None
    coarse_minimum = None
    arbitrary_negative = support_negative = 0
    trials = 20000
    for trial in range(trials):
        order = rng.randrange(2, 61)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        crows = rows(graph, u, v)
        category = {}
        for rank in range(2, 8):
            category[f"CW{rank}"] = crows[3][rank]
            category[f"CA{rank}"] = crows[1][rank] - crows[3][rank]
            category[f"CB{rank}"] = crows[2][rank] - crows[3][rank]
            category[f"CZ{rank}"] = crows[0][rank] - crows[1][rank] - crows[2][rank] + crows[3][rank]
        cvalues = tuple(category[str(symbol)] for symbol in cvars)
        box_value = int(base_eval(order, *cvalues))
        box_selected = {}
        for dvar, evaluate_derivative in zip(dvars, derivative_evals):
            coefficient = int(evaluate_derivative(order, *cvalues))
            cap_name = "C" + str(dvar)[1:]
            cap = category[cap_name]
            selected = cap if coefficient < 0 else 0
            box_selected[str(dvar)] = selected
            box_value += coefficient * selected
        box_record = (
            box_value, order, nx.to_graph6_bytes(graph, header=False).decode().strip(),
            u, v, box_selected,
        )
        box_minimum = box_record if box_minimum is None or box_record < box_minimum else box_minimum
        coarse_value = int(coarse_eval(order, *cvalues))
        coarse_record = (
            coarse_value, order, nx.to_graph6_bytes(graph, header=False).decode().strip(), u, v,
        )
        coarse_minimum = coarse_record if coarse_minimum is None or coarse_record < coarse_minimum else coarse_minimum
        if order >= 6 and coarse_value < 0:
            print("COARSE_NEGATIVE", trial, coarse_minimum)
            break
        if box_value < 0:
            print("BOX_NEGATIVE", trial, box_minimum)
            break

        retained = {node for node in graph if rng.random() < rng.random()}
        dgraph = graph.subgraph(retained).copy()
        arbitrary = numeric_g3(crows, rows(dgraph, u, v))
        record = (arbitrary, order, nx.to_graph6_bytes(graph, header=False).decode().strip(), u, v, sorted(retained))
        arbitrary_min = record if arbitrary_min is None or record < arbitrary_min else arbitrary_min
        arbitrary_negative += int(arbitrary < 0)

        chosen = []
        for component in nx.connected_components(graph):
            if rng.random() < 0.8:
                chosen.append(rng.choice(tuple(component)))
        support_graph = graph.copy()
        support_graph.remove_nodes_from(chosen)
        support = numeric_g3(crows, rows(support_graph, u, v))
        record = (support, order, nx.to_graph6_bytes(graph, header=False).decode().strip(), u, v, sorted(chosen))
        support_min = record if support_min is None or record < support_min else support_min
        support_negative += int(support < 0)

        if arbitrary < 0 or support < 0:
            print("NEGATIVE", trial, "arbitrary", arbitrary_min, "support", support_min)
            break
    print("TRIALS", trial + 1)
    print("ARBITRARY_NEGATIVE", arbitrary_negative, "MIN", arbitrary_min)
    print("SUPPORT_NEGATIVE", support_negative, "MIN", support_min)
    print("CONTAINMENT_BOX_MIN", box_minimum)
    print("COARSE_LOWER_MIN", coarse_minimum)


if __name__ == "__main__":
    main()
