#!/usr/bin/env python3
"""Deterministic exact sign probe for g1=A6(C)+P5(C,D)."""

from __future__ import annotations

from collections import Counter
import os
import random

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import random_forest, rows


def evaluators():
    raw = reconstruct(1)
    variables = tuple(sorted(raw.free_symbols, key=str))
    a6 = sp.expand(raw.subs({symbol: 0 for symbol in variables if str(symbol).startswith("d")}))
    polar = sp.expand(raw - a6)
    return variables, sp.lambdify(variables, a6, "math"), sp.lambdify(variables, polar, "math")


def data(variables, crows, drows):
    values = {}
    for prefix, four in (("c", crows), ("d", drows)):
        for family, row in zip("EUVW", four):
            for rank, value in enumerate(row):
                values[f"{prefix}{family}{rank}"] = value
    return tuple(values[str(variable)] for variable in variables)


def main():
    rng = random.Random(993617)
    variables, eval_a6, eval_p5 = evaluators()
    counts = {name: Counter() for name in ("A6", "P5", "g1")}
    minima = {name: None for name in counts}
    trials = int(os.environ.get("G1_POLAR_TRIALS", "50000"))
    for trial in range(trials):
        order = rng.randrange(2, 151)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        retained = {node for node in graph if rng.randrange(2)}
        crows = rows(graph, u, v)
        drows = rows(graph.subgraph(retained).copy(), u, v)
        args = data(variables, crows, drows)
        a6 = int(eval_a6(*args))
        p5 = int(eval_p5(*args))
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for name, value in (("A6", a6), ("P5", p5), ("g1", a6 + p5)):
            sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
            counts[name][sign] += 1
            record = (value, order, graph6, u, v, len(retained))
            minima[name] = record if minima[name] is None or record < minima[name] else minima[name]
        if a6 + p5 < 0:
            break
    print("TRIALS", trial + 1)
    for name in counts:
        print(name, "SIGNS", dict(counts[name]), "MINIMUM", minima[name])
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_SCALAR_POLARIZATION_SIGNS_G1_NONADJACENT")


if __name__ == "__main__":
    main()
