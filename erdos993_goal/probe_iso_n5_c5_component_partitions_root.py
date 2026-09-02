#!/usr/bin/env python3
"""Finite exact sign census for the four compact C5 partition blocks.

This tests H_C=a3^2-a1a5, L_C(A,B), K_C(B,C), and epsilon K_C(A,D)
on actual marked forests.  It is diagnostic only and makes no all-order claim.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_isolate_adjacent_coupling_root import rcoefficient
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_component_partitions_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_C5_COMPONENT_PARTITIONS_ROOT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def h(a):
    return at(a, 3) ** 2 - at(a, 1) * at(a, 5)


def ell(a, b):
    return -at(a, 1) * at(b, 4) + at(a, 2) * at(b, 3) + at(a, 3) * at(b, 2) - at(a, 4) * at(b, 1)


def k(b, c):
    return -at(b, 1) * at(c, 3) + 2 * at(b, 2) * at(c, 2) - at(b, 3) * at(c, 1)


def bucket():
    return {"checks": 0, "negative": 0, "minimum": None}


def update(bucket, value, witness):
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def audit(graph, report):
    cache = {}

    def row(deleted):
        key = frozenset(deleted)
        if key not in cache:
            reduced = graph.copy(); reduced.remove_nodes_from(key)
            cache[key] = tuple(poly_forest(reduced))
        return cache[key]

    e = row(())
    vertices = tuple(graph)
    for index, u in enumerate(vertices):
        for v in vertices[index + 1:]:
            a = row((u, v))
            closed_u = {u, *graph.neighbors(u)}
            closed_v = {v, *graph.neighbors(v)}
            b = row({u} | closed_v)
            c = row({v} | closed_u)
            epsilon = int(not graph.has_edge(u, v))
            d = row(closed_u | closed_v) if epsilon else (1,)
            values = {
                "H": h(a), "L_AB": ell(a, b), "L_AC": ell(a, c),
                "K_BC": k(b, c), "epsilon_K_AD": epsilon * k(a, d),
            }
            rows = (e, row((u,)), row((v,)), a)
            total = rcoefficient(rows, 4, 4) - rcoefficient(rows, 3, 5)
            assert total == sum(values.values())
            witness = {
                "order": len(graph), "u": u, "v": v,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            }
            for name, value in values.items():
                update(report[name], value, witness)
            update(report["C5"], total, witness)
            report["marked_cells"] += 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=12)
    args = parser.parse_args()
    report = {"marker": MARKER, "marked_cells": 0, "forests": 0}
    for name in ("H", "L_AB", "L_AC", "K_BC", "epsilon_K_AD", "C5"):
        report[name] = bucket()
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report); report["forests"] += 1
    for order in range(8, args.max_tree_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            audit(nx.convert_node_labels_to_integers(graph), report); report["forests"] += 1
    report["tree_orders"] = [8, args.max_tree_order]
    report["scope"] = "Finite exact census only; no all-order component sign claim."
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
