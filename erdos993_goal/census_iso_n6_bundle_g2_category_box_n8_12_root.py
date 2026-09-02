#!/usr/bin/env python3
"""Exact unlabeled-forest census of the rank-six g2 category-box minimum."""

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
OUTPUT = HERE / "iso_n6_bundle_g2_category_box_census_n8_12_exact_root_20260831.json"
MARKER = "PASS_EXACT_FINITE_ISO_N6_BUNDLE_G2_CATEGORY_BOX_N8_12_ROOT"


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
    argument_names = tuple(map(str, cvars))
    evaluate_base = sp.lambdify(cvars, base, "math")
    evaluate_derivatives = [sp.lambdify(cvars, value, "math") for value in derivatives]

    per_order = {}
    total_cells = total_negative = 0
    stream = hashlib.sha256()
    for order in range(8, 13):
        local_cells = local_negative = 0
        minimum = None
        witness = None
        graph_count = 0
        for graph0 in forest_graphs(order):
            graph_count += 1
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u in graph:
                for v in graph:
                    if u >= v:
                        continue
                    values = category_counts(graph, u, v)
                    arguments = tuple(values[name] for name in argument_names)
                    value = int(evaluate_base(*arguments))
                    selected = []
                    for dvar, evaluator in zip(dvars, evaluate_derivatives):
                        coefficient = int(evaluator(*arguments))
                        if coefficient < 0:
                            cap_name = "C" + str(dvar)[1:]
                            cap = values[cap_name]
                            value += coefficient * cap
                            selected.append(str(dvar))
                    stream.update(
                        f"{order}|{graph6}|{u}|{v}|{value}|{','.join(selected)};".encode()
                    )
                    local_cells += 1
                    local_negative += int(value < 0)
                    if minimum is None or value < minimum:
                        common = len(set(graph.neighbors(u)) & set(graph.neighbors(v)))
                        minimum = value
                        witness = {
                            "value": value,
                            "graph6": graph6,
                            "degree_sequence": sorted((degree for _, degree in graph.degree()), reverse=True),
                            "components": sorted((len(component) for component in nx.connected_components(graph)), reverse=True),
                            "marks": [u, v],
                            "mark_degrees": [graph.degree(u), graph.degree(v)],
                            "marks_adjacent": graph.has_edge(u, v),
                            "common_neighbors": common,
                            "negative_D_categories": selected,
                        }
        per_order[str(order)] = {
            "unlabeled_forests": graph_count,
            "marked_cells": local_cells,
            "negative": local_negative,
            "minimum": minimum,
            "witness": witness,
        }
        total_cells += local_cells
        total_negative += local_negative
        print("ORDER", order, "CELLS", local_cells, "MIN", minimum, flush=True)

    assert total_negative == 0
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2 independent D-category containment-box minimum",
        "orders": [8, 12],
        "total_marked_cells": total_cells,
        "negative": total_negative,
        "per_order": per_order,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "role": "exact finite evidence only; no all-order theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_marked_cells": total_cells,
        "negative": total_negative,
        "minima": {order: row["minimum"] for order, row in per_order.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
