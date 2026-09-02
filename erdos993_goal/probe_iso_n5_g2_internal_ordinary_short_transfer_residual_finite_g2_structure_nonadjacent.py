#!/usr/bin/env python3
"""Finite exact sign reconnaissance for short-broom g2 transfer residuals."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from audit_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_independent_g1_nonadjacent import (
    add,
    independence_row,
    scale,
    shift,
    specialize,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_short_transfer_residual_finite_probe_g2_structure_nonadjacent_20260830.json"
MARKER = "EXPLORED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SHORT_TRANSFER_RESIDUAL_FINITE_G2_STRUCTURE_NONADJACENT"


def four_parent_rows(graph, p, v):
    result = []
    for removed in ((), (p,), (v,), (p, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(independence_row(reduced))
    return tuple(result)


def expression_data():
    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))
    one_x = lambda row: add(row, shift(row))
    one_2x = lambda row: add(row, scale(shift(row), 2))
    base = (E, E, V, V)
    leaf = (add(E, shift(P)), E, add(V, shift(W)), V)
    path = (
        add(one_x(E), shift(P)), one_x(E),
        add(one_x(V), shift(W)), one_x(V),
    )
    original = {
        1: ((one_x(E), E, one_x(V), V), (P, P, W, W), leaf, base),
        2: ((one_2x(E), one_x(E), one_2x(V), one_x(V)),
            (one_x(P), P, one_x(W), W), path, leaf),
    }
    result = {}
    for ell, (crows, drows, image_c, image_d) in original.items():
        target = specialize(raw_g2, generic_c, generic_d, crows, drows)
        image = specialize(raw_g2, generic_c, generic_d, image_c, image_d)
        result[ell] = (sp.expand(target), sp.expand(image), (E, P, V, W))
    return result


def main():
    expressions = expression_data()
    minima = {}
    negatives = {ell: {geometry: 0 for geometry in ("adjacent", "connected_nonadjacent", "disconnected")} for ell in (1, 2)}
    cells = {geometry: 0 for geometry in ("adjacent", "connected_nonadjacent", "disconnected")}
    forests = [
        nx.convert_node_labels_to_integers(graph)
        for graph in nx.graph_atlas_g()
        if 2 <= len(graph) <= 7 and nx.is_forest(graph)
    ]
    for graph in forests:
        for p, v in itertools.permutations(graph, 2):
            if graph.has_edge(p, v):
                geometry = "adjacent"
            elif nx.has_path(graph, p, v):
                geometry = "connected_nonadjacent"
            else:
                geometry = "disconnected"
            cells[geometry] += 1
            actual_rows = four_parent_rows(graph, p, v)
            for ell, (target, image, symbolic_rows) in expressions.items():
                rules = {
                    symbol: value
                    for symbolic, actual in zip(symbolic_rows, actual_rows)
                    for symbol, value in zip(symbolic, actual)
                }
                target_value = int(target.subs(rules))
                image_value = int(image.subs(rules))
                residual = target_value - image_value
                if residual < 0:
                    negatives[ell][geometry] += 1
                key = f"ell{ell}_{geometry}"
                record = {
                    "residual": residual,
                    "target": target_value,
                    "transfer_image": image_value,
                    "order": len(graph),
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "p": p,
                    "v": v,
                    "degrees": sorted((degree for _node, degree in graph.degree()), reverse=True),
                }
                if key not in minima or residual < minima[key]["residual"]:
                    minima[key] = record
                assert target_value >= 0  # finite evidence only
                assert image_value >= 0  # frozen-mode instances, independently numerical here

    report = {
        "marker": MARKER,
        "atlas_orders": [2, 7],
        "forests": len(forests),
        "ordered_parent_cells": cells,
        "negative_residual_counts": negatives,
        "minima": minima,
        "status": "finite exact reconnaissance only; target/image checks are not all-order proofs",
        "scope": "Only ell=1,2 k=0 transfer residuals on the graph atlas through order 7.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
