#!/usr/bin/env python3
"""Probe near-diagonal coefficients of the bivariate nested ISO kernel.

The proved induction currently controls only diagonal coefficients N_r.  The
compact third-leaf identity also exposes coefficients one step off the
diagonal.  This exact finite census tests whether those coefficients have a
forest-specific sign.  A clean run is evidence only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_nested_near_diagonal_probe_root_20260829.json"


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    return tuple(out)


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def kernel2(row: tuple[int, ...], a: int, b: int) -> int:
    """Twice [z^a w^b] K(row), avoiding rational arithmetic."""
    return (
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2(A: tuple[int, ...], C: tuple[int, ...], a: int, b: int) -> int:
    return (
        kernel2(add(A, shift(C)), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2(rows: tuple[tuple[int, ...], ...], a: int, b: int) -> int:
    E, U, V, W = rows
    return (
        leaf2(add(E, shift(U)), add(V, shift(W)), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    cache: dict[frozenset[int], tuple[int, ...]] = {}

    def polynomial(deleted: frozenset[int]) -> tuple[int, ...]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = tuple(poly_forest(reduced))
        return cache[deleted]

    E = polynomial(frozenset())
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            rows = (
                E,
                polynomial(frozenset((u,))),
                polynomial(frozenset((v,))),
                polynomial(frozenset((u, v))),
            )
            for distance in range(0, 5):
                for r in range(max(1, distance), len(E) + 2):
                    a, b = r - distance, r
                    value2 = nested2(rows, a, b)
                    bucket = report["by_distance"][str(distance)]
                    bucket["checks"] += 1
                    if value2 < 0:
                        bucket["negative"] += 1
                    item = (value2, len(graph), r, u, v)
                    old = bucket["minimum"]
                    if old is None or value2 < old["twice_value"]:
                        bucket["minimum"] = {
                            "twice_value": value2,
                            "n": len(graph),
                            "r": r,
                            "u": int(u),
                            "v": int(v),
                            "graph6": graph6(graph),
                            "polynomial": E,
                        }


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_NESTED_NEAR_DIAGONAL",
        "by_distance": {
            str(distance): {"checks": 0, "negative": 0, "minimum": None}
            for distance in range(5)
        },
        "scope": (
            "Finite exact atlas/tree census only. A nonnegative distance-one "
            "row would still require an all-order proof and does not itself "
            "prove the third-leaf recurrence."
        ),
    }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            forests += 1
    for n in range(8, 11):
        for graph in nx.nonisomorphic_trees(n):
            audit(graph, report)
            forests += 1
    report["forests"] = forests
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
