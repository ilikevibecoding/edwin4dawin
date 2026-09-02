#!/usr/bin/env python3
"""Exhaust the n<10 parent base for the h+k=3 g1 diagonal.

The parent forest has two distinguished vertices p,v and A is obtained by
deleting them, so |A|<10 means parent order at most eleven.  This enumerates
every unlabeled forest through order eleven and every ordered pair p!=v,
including adjacent, connected-nonadjacent, and disconnected pairs, and checks
the four exact Newton cells with integer arithmetic.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal3_finite_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_FINITE_ALL_PARENT_ROOT"
CELLS = ((0, 3), (1, 2), (2, 1), (3, 0))
MAXIMUM_PARENT_ORDER = 11


def padded(row, maximum=6):
    return tuple(row[index] if index < len(row) else 0 for index in range(maximum + 1))


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    degrees, all_cells = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)
    forms = [all_cells[index] for index in CELLS]
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    evaluator = sp.lambdify(variables, forms, modules="math")

    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {
        geometry: {index: None for index in CELLS} for geometry in geometries
    }
    witnesses = {geometry: {} for geometry in geometries}
    total_pairs = total_checks = 0
    per_order = {}
    digest = hashlib.sha256()
    for order in range(1, MAXIMUM_PARENT_ORDER + 1):
        local_forests = local_pairs = local_checks = local_negatives = 0
        local_geometry = {geometry: 0 for geometry in geometries}
        for graph in forest_graphs(order):
            local_forests += 1
            erow = padded(poly_forest(graph))
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for pmark in graph:
                for vmark in graph:
                    if pmark == vmark:
                        continue
                    pgraph = graph.copy(); pgraph.remove_node(pmark)
                    vgraph = graph.copy(); vgraph.remove_node(vmark)
                    wgraph = graph.copy(); wgraph.remove_nodes_from((pmark, vmark))
                    prows = tuple(map(padded, (
                        erow,
                        poly_forest(pgraph),
                        poly_forest(vgraph),
                        poly_forest(wgraph),
                    )))
                    arguments = tuple(value for row in prows for value in row[1:7])
                    values = tuple(int(value) for value in evaluator(*arguments))
                    if graph.has_edge(pmark, vmark):
                        geometry = "adjacent"
                    elif nx.has_path(graph, pmark, vmark):
                        geometry = "connected_nonadjacent"
                    else:
                        geometry = "disconnected"
                    local_geometry[geometry] += 1
                    digest.update(
                        f"{order}:{graph6}:{pmark}:{vmark}:{values};".encode()
                    )
                    for index, value in zip(CELLS, values):
                        if minima[geometry][index] is None or value < minima[geometry][index]:
                            minima[geometry][index] = value
                            witnesses[geometry][index] = {
                                "value": value,
                                "parent_order": order,
                                "A_order": order - 2,
                                "graph6": graph6,
                                "marks_p_v": [pmark, vmark],
                            }
                        if value < 0:
                            local_negatives += 1
                    local_pairs += 1
                    local_checks += len(CELLS)
        assert local_negatives == 0
        total_pairs += local_pairs
        total_checks += local_checks
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_mark_pairs": local_pairs,
            "geometry_counts": local_geometry,
            "exact_cell_checks": local_checks,
            "negative_values": local_negatives,
        }
        print("FINITE_ALL", order, local_forests, local_pairs, local_checks, flush=True)

    report = {
        "marker": MARKER,
        "parent_orders": [1, MAXIMUM_PARENT_ORDER],
        "A_orders_covered": [0, MAXIMUM_PARENT_ORDER - 2],
        "cells": [list(index) for index in CELLS],
        "ordered_mark_pairs": total_pairs,
        "exact_cell_checks": total_checks,
        "negative_values": 0,
        "minima": {
            geometry: {
                f"h{index[0]}_k{index[1]}": value
                for index, value in geometry_minima.items()
            }
            for geometry, geometry_minima in minima.items()
        },
        "minimizing_witnesses": {
            geometry: {
                f"h{index[0]}_k{index[1]}": value
                for index, value in geometry_witnesses.items()
            }
            for geometry, geometry_witnesses in witnesses.items()
        },
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "status": "complete exact finite base for every parent forest and ordered mark pair with |A|<10",
        "scope": (
            "The four h+k=3 Newton cells in the ell>=8 internal-spine "
            "ordinary-parent g1 reduction, for parent order at most eleven."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "parent_orders": report["parent_orders"],
        "A_orders_covered": report["A_orders_covered"],
        "ordered_mark_pairs": total_pairs,
        "exact_cell_checks": total_checks,
        "negative_values": 0,
        "minima": report["minima"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
