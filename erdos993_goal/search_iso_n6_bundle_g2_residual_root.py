#!/usr/bin/env python3
"""Deterministically test the valid n>=8 rank-six g2 residual on forests.

The residual comes from the exact containment/elimination probe after all
ranks 7, 6, and 5 have been paid.  This search is diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_containment_elimination_probe_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_residual_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_RESIDUAL_ROOT"


def row(graph: nx.Graph, maximum: int = 4) -> tuple[int, ...]:
    values = poly_forest(graph)
    return tuple(values[k] if k < len(values) else 0 for k in range(maximum + 1))


def categories(graph: nx.Graph, u: int, v: int) -> dict[str, int]:
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(row(reduced))
    ce, cu, cv, cw = rows
    result = {"n": len(graph)}
    for rank in range(2, 5):
        result[f"W{rank}"] = cw[rank]
        result[f"A{rank}"] = cu[rank] - cw[rank]
        result[f"B{rank}"] = cv[rank] - cw[rank]
        result[f"Z{rank}"] = ce[rank] - cu[rank] - cv[rank] + cw[rank]
    return result


def random_forest(rng: random.Random, order: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    for vertex in range(1, order):
        if rng.random() < 0.82:
            graph.add_edge(vertex, rng.randrange(vertex))
    assert nx.is_forest(graph)
    return graph


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_G2_CONTAINMENT_ELIMINATION_ROOT"
    names = source["residual_summary"]["free_symbols"]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.together(sp.sympify(source["residual"], locals=symbols))
    numerator, denominator = sp.fraction(residual)
    denominator = sp.Integer(denominator)
    assert denominator > 0
    variables = tuple(symbols[name] for name in names)
    evaluate = sp.lambdify(variables, numerator, modules="math")

    minimum = None
    minimum_witness = None
    exact_cells = exact_negative = 0
    per_order = {}
    digest = hashlib.sha256()
    for order in range(8, 11):
        local_cells = local_negative = 0
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u in graph:
                for v in graph:
                    if u >= v:
                        continue
                    values = categories(graph, u, v)
                    value = int(evaluate(*(values[name] for name in names)))
                    digest.update(f"{order}:{graph6}:{u}:{v}:{value};".encode())
                    if value < 0:
                        local_negative += 1
                    if minimum is None or value < minimum:
                        minimum = value
                        minimum_witness = {
                            "numerator": value, "denominator": int(denominator),
                            "order": order, "graph6": graph6, "u": u, "v": v,
                        }
                    local_cells += 1
        exact_cells += local_cells
        exact_negative += local_negative
        per_order[str(order)] = {"cells": local_cells, "negative": local_negative}
        print("EXACT_RESIDUAL", order, local_cells, local_negative, minimum, flush=True)

    rng = random.Random(993602)
    random_trials = 30000
    random_negative = 0
    random_minimum = None
    random_witness = None
    for trial in range(random_trials):
        order = rng.randrange(11, 101)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        values = categories(graph, u, v)
        value = int(evaluate(*(values[name] for name in names)))
        if random_minimum is None or value < random_minimum:
            random_minimum = value
            random_witness = {
                "numerator": value, "denominator": int(denominator),
                "trial": trial, "order": order,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "u": u, "v": v,
            }
        random_negative += int(value < 0)
        if value < 0:
            print("RANDOM_NEGATIVE", random_witness, flush=True)
            break

    report = {
        "marker": MARKER,
        "input_sha256": hashlib.sha256(INPUT.read_bytes()).hexdigest().upper(),
        "residual_denominator": int(denominator),
        "exact_orders_8_10": {
            "cells": exact_cells, "negative": exact_negative,
            "minimum_numerator": minimum, "minimum_witness": minimum_witness,
            "per_order": per_order,
            "ordered_stream_sha256": digest.hexdigest().upper(),
        },
        "random_orders_11_100": {
            "planned_trials": random_trials,
            "completed_trials": trial + 1,
            "negative": random_negative,
            "minimum_numerator": random_minimum,
            "minimum_witness": random_witness,
            "seed": 993602,
        },
        "status": "diagnostic residual search; no universal theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exact": report["exact_orders_8_10"],
        "random": report["random_orders_11_100"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
