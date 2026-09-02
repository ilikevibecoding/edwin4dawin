#!/usr/bin/env python3
"""Finite exact census of the 28 large internal-ordinary parent forms.

Evaluate every Newton parent form on every ordered pair of distinct vertices
in one component of every unlabeled forest through order twelve, split by
adjacent versus connected-nonadjacent parent marks.  This determines whether
the cellwise sign target is even true on realized parent rows.  It is finite
evidence only unless a negative exact value is found.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_large_parent_forms_finite_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LARGE_PARENT_FORMS_FINITE_ROOT"


def padded(row, maximum=6):
    return tuple(row[index] if index < len(row) else 0 for index in range(maximum + 1))


def main() -> None:
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
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    reduced = sp.expand(expression.subs(rules))
    _degrees, coefficients = tensor_binomial(reduced, (h, k))
    ordered = [(index, form) for index, form in sorted(coefficients.items()) if form != 0]
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    evaluator = sp.lambdify(variables, [form for _index, form in ordered], modules="math")

    minima = {
        geometry: {index: None for index, _form in ordered}
        for geometry in ("adjacent", "connected_nonadjacent")
    }
    witnesses = {geometry: {} for geometry in minima}
    negatives = []
    pairs = checks = 0
    per_order = {}
    digest = hashlib.sha256()
    for order in range(1, 13):
        local_pairs = 0
        local_negatives = 0
        for graph in forest_graphs(order):
            erow = padded(poly_forest(graph))
            for pmark in graph:
                for vmark in graph:
                    if pmark == vmark or not nx.has_path(graph, pmark, vmark):
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
                    geometry = "adjacent" if graph.has_edge(pmark, vmark) else "connected_nonadjacent"
                    digest.update(
                        f"{order}:{nx.to_graph6_bytes(graph, header=False).decode().strip()}:"
                        f"{pmark}:{vmark}:{values};".encode()
                    )
                    for (index, _form), value in zip(ordered, values):
                        if minima[geometry][index] is None or value < minima[geometry][index]:
                            minima[geometry][index] = value
                            witnesses[geometry][index] = {
                                "value": value,
                                "order": order,
                                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                "marks_p_v": [pmark, vmark],
                            }
                        if value < 0:
                            local_negatives += 1
                            if len(negatives) < 40:
                                negatives.append({
                                    "h_index": index[0], "k_index": index[1],
                                    "geometry": geometry, "value": value,
                                    "order": order,
                                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                    "marks_p_v": [pmark, vmark],
                                })
                    local_pairs += 1
        pairs += local_pairs
        checks += local_pairs * len(ordered)
        per_order[str(order)] = {
            "ordered_connected_parent_pairs": local_pairs,
            "negative_form_values": local_negatives,
        }
        print("FINITE", order, local_pairs, local_negatives, flush=True)

    report = {
        "marker": MARKER,
        "orders": [1, 12],
        "parent_forms": len(ordered),
        "ordered_connected_parent_pairs": pairs,
        "exact_form_checks": checks,
        "negative_values": sum(row["negative_form_values"] for row in per_order.values()),
        "first_negatives": negatives,
        "minima": {
            geometry: {
                f"h{index[0]}_k{index[1]}": value
                for index, value in rows_minimum.items()
            }
            for geometry, rows_minimum in minima.items()
        },
        "minimizing_witnesses": {
            geometry: {
                f"h{index[0]}_k{index[1]}": witness
                for index, witness in rows_witness.items()
            }
            for geometry, rows_witness in witnesses.items()
        },
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "scope": "Finite exact evidence only unless a negative realized parent form is found.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "pairs": pairs,
        "checks": checks,
        "negative_values": report["negative_values"],
        "first_negative": negatives[0] if negatives else None,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
