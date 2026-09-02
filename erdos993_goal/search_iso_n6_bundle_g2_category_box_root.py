#!/usr/bin/env python3
"""Deterministic search of the exact rank-six g2 D-category box minimum.

For a fixed marked forest C, g2 is affine in the sixteen W/A/B/Z categories
of an induced minor D.  Since 0<=DXk<=CXk, the independent containment-box
minimum is obtained by choosing each endpoint according to the exact signed
derivative.  This search is falsification evidence only, not a theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import random
from collections import Counter
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_category_box_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_CATEGORY_BOX_ROOT"


def category_counts(graph: nx.Graph, u: int, v: int) -> dict[str, int]:
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        values = poly_forest(reduced)
        rows.append(tuple(values[k] if k < len(values) else 0 for k in range(8)))
    ce, cu, cv, cw = rows
    result = {"n": len(graph)}
    for rank in range(2, 8):
        result.update({
            f"CW{rank}": cw[rank],
            f"CA{rank}": cu[rank] - cw[rank],
            f"CB{rank}": cv[rank] - cw[rank],
            f"CZ{rank}": ce[rank] - cu[rank] - cv[rank] + cw[rank],
        })
    return result


def random_forest(rng: random.Random, order: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    for vertex in range(1, order):
        if rng.random() < 0.84:
            graph.add_edge(vertex, rng.randrange(vertex))
    assert nx.is_forest(graph)
    return graph


def main() -> None:
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(
        reconstruct().subs(structural).subs(cpartition).subs(dpartition)
    )
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    base = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    derivatives = tuple(sp.expand(sp.diff(expression, symbol)) for symbol in dvars)
    cvars = tuple(sorted(
        (expression.free_symbols - set(dvars)), key=str
    ))
    names = tuple(map(str, cvars))
    evaluate_base = sp.lambdify(cvars, base, "math")
    evaluate_derivatives = [sp.lambdify(cvars, value, "math") for value in derivatives]

    def evaluate(values: dict[str, int]):
        arguments = tuple(values[name] for name in names)
        value = int(evaluate_base(*arguments))
        selected = []
        coefficients = {}
        for dvar, derivative, evaluator in zip(dvars, derivatives, evaluate_derivatives):
            coefficient = int(evaluator(*arguments))
            coefficients[str(dvar)] = coefficient
            cap_name = "C" + str(dvar)[1:]
            if coefficient < 0:
                cap = values[cap_name]
                value += coefficient * cap
                selected.append((str(dvar), cap, coefficient))
        return value, selected, coefficients

    finite_cells = finite_negative = 0
    finite_minimum = None
    finite_witness = None
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(graph, 2):
            values = category_counts(graph, u, v)
            value, selected, _coefficients = evaluate(values)
            stream.update(f"{len(graph)}|{graph6}|{u}|{v}|{value};".encode())
            finite_cells += 1
            finite_negative += int(value < 0)
            if finite_minimum is None or value < finite_minimum:
                finite_minimum = value
                finite_witness = {
                    "value": value, "order": len(graph), "graph6": graph6,
                    "u": u, "v": v, "selected_D_corner": selected,
                }

    rng = random.Random(993621)
    trials = 50000
    random_negative = 0
    random_minimum = None
    random_witness = None
    mixed_labels = (
        "DA3", "DA5", "DB3", "DB5", "DW2", "DW3", "DW4", "DZ4"
    )
    patterns = Counter()
    sign_ranges = {
        label: {"minimum": None, "maximum": None, "last_negative_order": None,
                "last_nonnegative_order": None}
        for label in mixed_labels
    }
    for trial in range(trials):
        order = rng.randrange(8, 121)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        values = category_counts(graph, u, v)
        value, selected, coefficients = evaluate(values)
        pattern = tuple(label for label in mixed_labels if coefficients[label] < 0)
        patterns[pattern] += 1
        for label in mixed_labels:
            coefficient = coefficients[label]
            row = sign_ranges[label]
            row["minimum"] = coefficient if row["minimum"] is None else min(row["minimum"], coefficient)
            row["maximum"] = coefficient if row["maximum"] is None else max(row["maximum"], coefficient)
            key = "last_negative_order" if coefficient < 0 else "last_nonnegative_order"
            row[key] = order if row[key] is None else max(row[key], order)
        if random_minimum is None or value < random_minimum:
            random_minimum = value
            random_witness = {
                "value": value, "trial": trial, "order": order,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "u": u, "v": v, "selected_D_corner": selected,
            }
        if value < 0:
            random_negative += 1
            break

    report = {
        "marker": MARKER,
        "coefficient": "rank-six bundle g2",
        "D_categories": list(map(str, dvars)),
        "finite_atlas": {
            "orders": [2, 7], "marked_cells": finite_cells,
            "negative": finite_negative, "minimum": finite_minimum,
            "witness": finite_witness,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "random": {
            "orders": [8, 120], "planned_trials": trials,
            "completed_trials": trial + 1, "negative": random_negative,
            "minimum": random_minimum, "witness": random_witness,
            "seed": 993621,
            "mixed_derivative_sign_patterns": [
                {"negative_labels": list(pattern), "count": count}
                for pattern, count in patterns.most_common()
            ],
            "mixed_derivative_ranges": sign_ranges,
        },
        "status": "diagnostic independent containment-box search; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite": report["finite_atlas"],
        "random": report["random"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
