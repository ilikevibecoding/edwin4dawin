#!/usr/bin/env python3
"""Finite exact census of the 21 stable internal-ordinary g2 parent forms.

This is diagnostic only unless it finds an exact negative realized row.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path, path_coefficient, tensor_binomial,
)
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
MAXIMUM_ORDER = int(os.environ.get("ERDOS993_G2_INTERNAL_ORDINARY_FINITE_ORDER", "11"))
OUTPUT = HERE / (
    f"iso_n5_g2_internal_ordinary_stable_parent_forms_finite_n{MAXIMUM_ORDER}_"
    "rank5_g2_alt_20260830.json"
)
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_STABLE_PARENT_FORMS_FINITE_RANK5_G2_ALT"


def padded(row, maximum=6):
    return tuple(row[index] if index < len(row) else 0 for index in range(maximum + 1))


def main():
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        rules.update({
            rows["X"][rank]: x_value, rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value, rows["Z"][rank]: z_value,
        })
    _degrees, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (h, k))
    ordered = [(index, form) for index, form in sorted(coefficients.items()) if form != 0]
    assert len(ordered) == 21
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    evaluator = sp.lambdify(variables, [form for _index, form in ordered], modules="math")

    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {g: {index: None for index, _ in ordered} for g in geometries}
    witnesses = {g: {} for g in geometries}
    negatives = []
    pairs = checks = 0
    per_order = {}
    digest = hashlib.sha256()
    for order in range(2, MAXIMUM_ORDER + 1):
        local_forests = local_pairs = local_negatives = 0
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
                        erow, poly_forest(pgraph), poly_forest(vgraph), poly_forest(wgraph),
                    )))
                    arguments = tuple(value for row in prows for value in row[1:7])
                    values = tuple(int(value) for value in evaluator(*arguments))
                    geometry = (
                        "adjacent" if graph.has_edge(pmark, vmark) else
                        "connected_nonadjacent" if nx.has_path(graph, pmark, vmark) else
                        "disconnected"
                    )
                    digest.update(f"{order}:{graph6}:{pmark}:{vmark}:{values};".encode())
                    for (index, _form), value in zip(ordered, values):
                        if minima[geometry][index] is None or value < minima[geometry][index]:
                            minima[geometry][index] = value
                            witnesses[geometry][index] = {
                                "value": value, "order": order, "graph6": graph6,
                                "marks_p_v": [pmark, vmark],
                            }
                        if value < 0:
                            local_negatives += 1
                            if len(negatives) < 64:
                                negatives.append({
                                    "h_index": index[0], "k_index": index[1],
                                    "geometry": geometry, "value": value,
                                    "order": order, "graph6": graph6,
                                    "marks_p_v": [pmark, vmark],
                                })
                    local_pairs += 1
        pairs += local_pairs
        checks += local_pairs * len(ordered)
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_parent_pairs": local_pairs,
            "negative_form_values": local_negatives,
        }
        print("FINITE_G2_INTERNAL_ORDINARY", order, local_forests,
              local_pairs, local_negatives, flush=True)

    report = {
        "marker": MARKER, "orders": [2, MAXIMUM_ORDER],
        "parent_forms": len(ordered), "ordered_parent_pairs": pairs,
        "exact_form_checks": checks,
        "negative_values": sum(row["negative_form_values"] for row in per_order.values()),
        "first_negatives": negatives,
        "minima": {
            geometry: {f"h{i[0]}_k{i[1]}": value for i, value in values.items()}
            for geometry, values in minima.items()
        },
        "minimizing_witnesses": {
            geometry: {f"h{i[0]}_k{i[1]}": value for i, value in values.items()}
            for geometry, values in witnesses.items()
        },
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "scope": "Finite exact evidence only unless an exact negative realized parent form is found.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "pairs": pairs, "checks": checks,
        "negative_values": report["negative_values"],
        "first_negative": negatives[0] if negatives else None,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
