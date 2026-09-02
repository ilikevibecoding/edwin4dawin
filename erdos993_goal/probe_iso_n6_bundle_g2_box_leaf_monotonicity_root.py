#!/usr/bin/env python3
"""Test leaf-deletion monotonicity of the exact rank-six g2 box minimum."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from search_iso_n6_bundle_g2_category_box_root import category_counts


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_box_leaf_monotonicity_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_BOX_LEAF_MONOTONICITY_ROOT"


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
    cvars = tuple(sorted(expression.free_symbols - set(dvars), key=str))
    names = tuple(map(str, cvars))
    evaluate_base = sp.lambdify(cvars, base, "math")
    evaluate_derivatives = [sp.lambdify(cvars, value, "math") for value in derivatives]

    def box(graph: nx.Graph, u: int, v: int) -> int:
        values = category_counts(graph, u, v)
        arguments = tuple(values[name] for name in names)
        value = int(evaluate_base(*arguments))
        for dvar, evaluator in zip(dvars, evaluate_derivatives):
            coefficient = int(evaluator(*arguments))
            if coefficient < 0:
                value += coefficient * values["C" + str(dvar)[1:]]
        return value

    cells = negative = 0
    minimum_delta = None
    witness = None
    stream = hashlib.sha256()
    for order in range(3, 11):
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u in graph:
                for v in graph:
                    if u >= v:
                        continue
                    before = box(graph, u, v)
                    for leaf in graph:
                        if leaf in (u, v) or graph.degree(leaf) > 1:
                            continue
                        reduced = graph.copy()
                        reduced.remove_node(leaf)
                        after = box(reduced, u, v)
                        delta = before - after
                        stream.update(
                            f"{order}|{graph6}|{u}|{v}|{leaf}|{before}|{after}|{delta};".encode()
                        )
                        cells += 1
                        negative += int(delta < 0)
                        if minimum_delta is None or delta < minimum_delta:
                            minimum_delta = delta
                            witness = {
                                "delta": delta, "before": before, "after": after,
                                "order": order, "graph6": graph6,
                                "marks": [u, v], "leaf": leaf,
                                "leaf_parent": next(iter(graph.neighbors(leaf)), None),
                            }

    report = {
        "marker": MARKER,
        "orders": [3, 10],
        "leaf_deletion_cells": cells,
        "negative_delta": negative,
        "minimum_delta": minimum_delta,
        "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic leaf monotonicity test; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
