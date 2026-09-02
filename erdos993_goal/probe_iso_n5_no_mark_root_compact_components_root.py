#!/usr/bin/env python3
"""Finite exact census for the compact no-mark-root g1 components.

This probes M5, C5, N4, and M5+3C5+2N4 on every unordered marked pair in
the graph-atlas forests and every nonisomorphic tree through a chosen order.
It is diagnostic evidence only; it does not turn the observed signs into an
all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_isolate_adjacent_coupling_root import rcoefficient
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_no_mark_root_compact_components_probe_root_20260829.json"
MARKER = "PROBE_EXACT_ISO_N5_NO_MARK_ROOT_COMPACT_COMPONENTS_ROOT"


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    bucket["zero"] += int(value == 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def h_block(a: tuple[int, ...]) -> int:
    return (
        2 * at(a, 1) * at(a, 4) - 5 * at(a, 1) * at(a, 5)
        - 6 * at(a, 1) * at(a, 6) + 6 * at(a, 2) * at(a, 3)
        - 8 * at(a, 2) * at(a, 5) + 5 * at(a, 3) ** 2
        + 6 * at(a, 3) * at(a, 4)
    )


def l_block(a: tuple[int, ...], b: tuple[int, ...]) -> int:
    return 2 * (
        at(a, 1) * at(b, 3) - 2 * at(a, 1) * at(b, 4)
        - 3 * at(a, 1) * at(b, 5) + 2 * at(a, 2) * at(b, 2)
        + 2 * at(a, 2) * at(b, 3) - at(a, 2) * at(b, 4)
        + at(a, 3) * at(b, 1) + 2 * at(a, 3) * at(b, 2)
        + 4 * at(a, 3) * at(b, 3) - 2 * at(a, 4) * at(b, 1)
        - at(a, 4) * at(b, 2) - 3 * at(a, 5) * at(b, 1)
    )


def k_block(b: tuple[int, ...], c: tuple[int, ...]) -> int:
    return (
        2 * at(b, 1) * at(c, 2) - 3 * at(b, 1) * at(c, 3)
        - 6 * at(b, 1) * at(c, 4) + 2 * at(b, 2) * at(c, 1)
        + 6 * at(b, 2) * at(c, 2) + 4 * at(b, 2) * at(c, 3)
        - 3 * at(b, 3) * at(c, 1)
        + 4 * at(b, 3) * at(c, 2) - 6 * at(b, 4) * at(c, 1)
    )


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    cache: dict[frozenset[int], tuple[int, ...]] = {}

    def row(deleted: frozenset[int]) -> tuple[int, ...]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = tuple(poly_forest(reduced))
        return cache[deleted]

    E = row(frozenset())
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            W = row(frozenset((u, v)))
            rows = (
                E,
                row(frozenset((u,))),
                row(frozenset((v,))),
                W,
            )
            m5 = nested2(rows, 4, 5)
            c5 = rcoefficient(rows, 4, 4) - rcoefficient(rows, 3, 5)
            n4_vector = four_minor_vector(graph, u, v)
            n4 = n4_vector[4] if len(n4_vector) > 4 else 0
            sufficient = m5 + 3 * c5
            g1 = sufficient + 2 * n4
            closed_u = {u, *graph.neighbors(u)}
            closed_v = {v, *graph.neighbors(v)}
            A = W
            B = row(frozenset({u} | closed_v))
            C = row(frozenset({v} | closed_u))
            epsilon = int(not graph.has_edge(u, v))
            D = row(frozenset(closed_u | closed_v)) if epsilon else (1,)
            h_value = h_block(A)
            lb_value = l_block(A, B)
            lc_value = l_block(A, C)
            kbc_value = k_block(B, C)
            kad_value = epsilon * k_block(A, D)
            assert sufficient == h_value + lb_value + lc_value + kbc_value + kad_value
            witness = {
                "n": len(graph),
                "u": int(u),
                "v": int(v),
                "alpha_W": len(W) - 1,
                "in_natural_rank5_domain": 5 <= (len(W) - 1) + 2,
                "graph6": graph6(graph),
                "polynomial": E,
            }
            update(report["M5"], m5, witness)
            update(report["C5"], c5, witness)
            update(report["N4"], n4, witness)
            update(report["M5_plus_3C5"], sufficient, witness)
            update(report["g1_no_mark_root"], g1, witness)
            update(report["partition_H"], h_value, witness)
            update(report["partition_L_AB"], lb_value, witness)
            update(report["partition_L_AC"], lc_value, witness)
            update(report["partition_K_BC"], kbc_value, witness)
            update(report["partition_epsilon_K_AD"], kad_value, witness)
            report["marked_cells"] += 1


def bucket() -> dict:
    return {"checks": 0, "negative": 0, "zero": 0, "minimum": None}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=14)
    args = parser.parse_args()
    report = {
        "marker": MARKER,
        "tree_orders": [8, args.max_tree_order],
        "forests": 0,
        "marked_cells": 0,
        "M5": bucket(),
        "C5": bucket(),
        "N4": bucket(),
        "M5_plus_3C5": bucket(),
        "g1_no_mark_root": bucket(),
        "partition_H": bucket(),
        "partition_L_AB": bucket(),
        "partition_L_AC": bucket(),
        "partition_K_BC": bucket(),
        "partition_epsilon_K_AD": bucket(),
        "identity": "g1(no-mark-root)=M5+3*C5+2*N4",
        "scope": "Finite exact census only; no all-order sign theorem is asserted.",
    }
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            report["forests"] += 1
    for order in range(8, args.max_tree_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            audit(nx.convert_node_labels_to_integers(graph), report)
            report["forests"] += 1

    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
