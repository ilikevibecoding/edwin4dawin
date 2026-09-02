#!/usr/bin/env python3
"""Exact finite parent census for every small-broom ordinary g1 row.

For each ell=1,...,7 the g1 expression is expanded in ``binom(k,j)``,
``j=0,...,6``.  This script evaluates all 49 resulting parent forms on
every unlabeled parent forest through order eleven and every ordered pair of
distinct parent marks.  Nonnegativity of the seven Newton coefficients for
a fixed ell proves all integer collision-leaf counts k>=0 on that cell.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json"
PASS_MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_ALL_PARENT_FINITE_ROOT"
FAIL_MARKER = "COUNTEREXAMPLE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_ALL_PARENT_FINITE_ROOT"
MAXIMUM_PARENT_ORDER = 11
CELLS = tuple((ell, k_index) for ell in range(1, 8) for k_index in range(7))


def padded(row, maximum=6):
    return tuple(row[index] if index < len(row) else 0 for index in range(maximum + 1))


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    forms_by_cell = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank],
                rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank],
                rows["Z"][rank]: zrow[rank],
            })
        degrees, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degrees == (6,)
        assert set(coefficients) == {(index,) for index in range(7)}
        for k_index in range(7):
            assert coefficients[(k_index,)] != 0
            forms_by_cell[(ell, k_index)] = coefficients[(k_index,)]
    assert set(forms_by_cell) == set(CELLS)

    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    evaluator = sp.lambdify(
        variables, [forms_by_cell[cell] for cell in CELLS], modules="math"
    )

    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {geometry: {cell: None for cell in CELLS} for geometry in geometries}
    witnesses = {geometry: {} for geometry in geometries}
    negatives = []
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
                    pgraph = graph.copy()
                    pgraph.remove_node(pmark)
                    vgraph = graph.copy()
                    vgraph.remove_node(vmark)
                    wgraph = graph.copy()
                    wgraph.remove_nodes_from((pmark, vmark))
                    parent_rows = tuple(map(padded, (
                        erow,
                        poly_forest(pgraph),
                        poly_forest(vgraph),
                        poly_forest(wgraph),
                    )))
                    arguments = tuple(
                        value for row in parent_rows for value in row[1:7]
                    )
                    values = tuple(int(value) for value in evaluator(*arguments))
                    assert len(values) == len(CELLS)
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
                    for cell, value in zip(CELLS, values):
                        if minima[geometry][cell] is None or value < minima[geometry][cell]:
                            minima[geometry][cell] = value
                            witnesses[geometry][cell] = {
                                "value": value,
                                "parent_order": order,
                                "A_order": order - 2,
                                "graph6": graph6,
                                "marks_p_v": [pmark, vmark],
                            }
                        if value < 0:
                            local_negatives += 1
                            if len(negatives) < 32:
                                negatives.append({
                                    "cell_ell_k_index": list(cell),
                                    "value": value,
                                    "parent_order": order,
                                    "graph6": graph6,
                                    "marks_p_v": [pmark, vmark],
                                    "geometry": geometry,
                                })
                    local_pairs += 1
                    local_checks += len(CELLS)
        total_pairs += local_pairs
        total_checks += local_checks
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_mark_pairs": local_pairs,
            "geometry_counts": local_geometry,
            "exact_cell_checks": local_checks,
            "negative_values": local_negatives,
        }
        print(
            "FINITE_SMALL_ORDINARY",
            order,
            local_forests,
            local_pairs,
            local_checks,
            local_negatives,
            flush=True,
        )

    negative_count = sum(row["negative_values"] for row in per_order.values())
    passed = negative_count == 0
    marker = PASS_MARKER if passed else FAIL_MARKER
    report = {
        "marker": marker,
        "parent_orders": [1, MAXIMUM_PARENT_ORDER],
        "A_orders_covered": [0, MAXIMUM_PARENT_ORDER - 2],
        "small_lengths": [1, 7],
        "cells": [list(cell) for cell in CELLS],
        "ordered_mark_pairs": total_pairs,
        "exact_cell_checks": total_checks,
        "negative_values": negative_count,
        "first_negative_witnesses": negatives,
        "minima": {
            geometry: {
                f"ell{cell[0]}_k{cell[1]}": value
                for cell, value in geometry_minima.items()
            }
            for geometry, geometry_minima in minima.items()
        },
        "minimizing_witnesses": {
            geometry: {
                f"ell{cell[0]}_k{cell[1]}": value
                for cell, value in geometry_witnesses.items()
            }
            for geometry, geometry_witnesses in witnesses.items()
        },
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "status": (
            "complete exact finite parent base for all 49 small-broom rows"
            if passed else
            "exact finite counterexample to the proposed small-broom parent-form positivity"
        ),
        "scope": (
            "All ell=1..7 and integer k>=0 for internal-spine ordinary-parent "
            "g1 when the parent-side forest has order at most eleven.  Large "
            "parent forests, the whole mode, other modes, and Erdos Problem "
            "993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "A_orders_covered": report["A_orders_covered"],
        "ordered_mark_pairs": total_pairs,
        "exact_cell_checks": total_checks,
        "negative_values": negative_count,
        "first_negative_witnesses": negatives,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
