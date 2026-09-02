#!/usr/bin/env python3
"""Deterministic non-promotional falsification search for rank-six bundle g1."""

from __future__ import annotations

import random
from collections import Counter
import os

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1
from explore_iso_n6_bundle_g1_universal_cone_g1_nonadjacent import coarse_containment_lower
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from probe_iso_leaf_cross_remainder_root import poly_forest


def row(graph, maximum=7):
    values = poly_forest(graph)
    return tuple(values[k] if k < len(values) else 0 for k in range(maximum + 1))


def rows(graph, u, v):
    answer = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        answer.append(row(reduced))
    return tuple(answer)


def random_forest(rng, order):
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    retention = rng.random()
    for vertex in range(1, order):
        if rng.random() < retention:
            graph.add_edge(vertex, rng.randrange(vertex))
    assert nx.is_forest(graph)
    return graph


def evaluator():
    expression = reconstruct(1)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, four in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", four):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))
    return value


def categories(crows):
    answer = {}
    for rank in range(2, 8):
        answer[f"CW{rank}"] = crows[3][rank]
        answer[f"CA{rank}"] = crows[1][rank] - crows[3][rank]
        answer[f"CB{rank}"] = crows[2][rank] - crows[3][rank]
        answer[f"CZ{rank}"] = crows[0][rank] - crows[1][rank] - crows[2][rank] + crows[3][rank]
    return answer


def main():
    rng = random.Random(993601)
    value = evaluator()
    _, partitioned, _, _ = doubly_partitioned_g1()
    dvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("D")), key=str))
    cvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("C")), key=str))
    zero = sp.expand(partitioned.subs({x: 0 for x in dvars}))
    base_eval = sp.lambdify(cvars, zero, "math")
    derivative_evals = [sp.lambdify(cvars, sp.diff(partitioned, x), "math") for x in dvars]
    coarse, _, _ = coarse_containment_lower(partitioned)
    coarse_eval = sp.lambdify(cvars, coarse, "math")

    minima = {"arbitrary": None, "support": None, "box": None, "coarse": None}
    negative = {key: 0 for key in minima}
    derivative_signs = {str(x): Counter() for x in dvars}
    trials = int(os.environ.get("G1_TRIALS", "30000"))
    for trial in range(trials):
        order = rng.randrange(2, 101)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        crows = rows(graph, u, v)
        cat = categories(crows)
        cvalues = tuple(cat[str(x)] for x in cvars)

        box = int(base_eval(*cvalues))
        for dvar, derivative in zip(dvars, derivative_evals):
            coefficient = int(derivative(*cvalues))
            derivative_signs[str(dvar)]["negative" if coefficient < 0 else "positive" if coefficient > 0 else "zero"] += 1
            cap = cat["C" + str(dvar)[1:]]
            box += coefficient * (cap if coefficient < 0 else 0)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        record = (box, order, graph6, u, v)
        minima["box"] = record if minima["box"] is None or record < minima["box"] else minima["box"]
        negative["box"] += box < 0
        coarse_value = int(coarse_eval(*cvalues))
        record = (coarse_value, order, graph6, u, v)
        minima["coarse"] = record if minima["coarse"] is None or record < minima["coarse"] else minima["coarse"]
        negative["coarse"] += coarse_value < 0

        retained = {node for node in graph if rng.random() < rng.random()}
        arbitrary = value(crows, rows(graph.subgraph(retained).copy(), u, v))
        record = (arbitrary, order, graph6, u, v, len(retained))
        minima["arbitrary"] = record if minima["arbitrary"] is None or record < minima["arbitrary"] else minima["arbitrary"]
        negative["arbitrary"] += arbitrary < 0

        deleted = []
        for component in nx.connected_components(graph):
            if rng.random() < 0.85:
                deleted.append(rng.choice(tuple(component)))
        support_graph = graph.copy()
        support_graph.remove_nodes_from(deleted)
        support = value(crows, rows(support_graph, u, v))
        record = (support, order, graph6, u, v, len(deleted))
        minima["support"] = record if minima["support"] is None or record < minima["support"] else minima["support"]
        negative["support"] += support < 0

        if arbitrary < 0 or support < 0:
            print("GENUINE_NEGATIVE", trial, minima)
            break
    print("TRIALS", trial + 1)
    for key in minima:
        print(key.upper(), "NEGATIVE", negative[key], "MIN", minima[key])
    for name in sorted(derivative_signs):
        print("DERIVATIVE_SIGNS", name, dict(derivative_signs[name]))


if __name__ == "__main__":
    main()
