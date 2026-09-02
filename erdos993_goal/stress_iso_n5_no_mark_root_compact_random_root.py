#!/usr/bin/env python3
"""Deterministic large-order stress test for the no-mark-root g1 split.

This is discovery evidence only.  It samples labelled trees and forests at
orders beyond the exhaustive census and records exact integer minima for M5,
C5, M5+3C5, N4, and g1.  A negative row would be a useful exact obstruction;
nonnegative samples are not promoted to a theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_isolate_adjacent_coupling_root import rcoefficient
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_no_mark_root_compact_random_stress_root_20260829.json"
MARKER = "STRESS_EXACT_ISO_N5_NO_MARK_ROOT_COMPACT_RANDOM_ROOT"


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode().strip()


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def audit(graph: nx.Graph, pairs: list[tuple[int, int]], report: dict) -> None:
    cache: dict[frozenset[int], tuple[int, ...]] = {}

    def row(deleted: frozenset[int]) -> tuple[int, ...]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = tuple(poly_forest(reduced))
        return cache[deleted]

    e = row(frozenset())
    for u, v in pairs:
        rows = (e, row(frozenset((u,))), row(frozenset((v,))), row(frozenset((u, v))))
        m5 = nested2(rows, 4, 5)
        c5 = rcoefficient(rows, 4, 4) - rcoefficient(rows, 3, 5)
        n4 = four_minor_vector(graph, u, v)[4]
        sufficient = m5 + 3 * c5
        g1 = sufficient + 2 * n4
        witness = {
            "order": len(graph), "u": u, "v": v,
            "components": nx.number_connected_components(graph),
            "graph6": graph6(graph),
        }
        for name, value in (
            ("M5", m5), ("C5", c5), ("M5_plus_3C5", sufficient),
            ("N4", n4), ("g1", g1),
        ):
            update(report[name], value, witness)
        report["marked_cells"] += 1


def random_forest(order: int, rng: random.Random) -> nx.Graph:
    tree = nx.from_prufer_sequence([rng.randrange(order) for _ in range(order - 2)])
    # Randomly delete up to one quarter of its edges, retaining a forest.
    edges = list(tree.edges())
    rng.shuffle(edges)
    for edge in edges[: rng.randrange(max(1, order // 4 + 1))]:
        tree.remove_edge(*edge)
    return tree


def bucket() -> dict:
    return {"checks": 0, "negative": 0, "minimum": None}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples-per-order", type=int, default=500)
    parser.add_argument("--pairs-per-sample", type=int, default=12)
    args = parser.parse_args()
    rng = random.Random(993_20260829)
    orders = (15, 20, 30, 40, 60, 80)
    report = {
        "marker": MARKER,
        "seed": 993_20260829,
        "orders": list(orders),
        "samples_per_order": args.samples_per_order,
        "pairs_per_sample": args.pairs_per_sample,
        "marked_cells": 0,
        "M5": bucket(), "C5": bucket(), "M5_plus_3C5": bucket(),
        "N4": bucket(), "g1": bucket(),
        "scope": "Deterministic finite random stress only; no universal sign claim.",
    }
    for order in orders:
        all_pairs = [(u, v) for u in range(order) for v in range(u + 1, order)]
        for _ in range(args.samples_per_order):
            graph = random_forest(order, rng)
            pairs = rng.sample(all_pairs, min(args.pairs_per_sample, len(all_pairs)))
            audit(graph, pairs, report)
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
