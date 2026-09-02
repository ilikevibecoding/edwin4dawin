#!/usr/bin/env python3
"""Probe diagonal central unimodality of the derivative-free R form.

For every symmetric total-degree slice, test whether coefficients of
R(E,U,V,W) weakly increase as the exponent pair moves one step toward the
diagonal.  The ISO isolate hierarchy only needs the two innermost steps, but
a full clean cone could expose a simpler all-order invariant.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_isolate_adjacent_coupling_root import rcoefficient


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_r_central_unimodality_probe_root_20260829.json"


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def audit(graph: nx.Graph, report: dict) -> None:
    cache: dict[frozenset[int], tuple[int, ...]] = {}

    def polynomial(deleted: frozenset[int]) -> tuple[int, ...]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = tuple(poly_forest(reduced))
        return cache[deleted]

    E = polynomial(frozenset())
    vertices = tuple(graph)
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            rows = (
                E,
                polynomial(frozenset((u,))),
                polynomial(frozenset((v,))),
                polynomial(frozenset((u, v))),
            )
            max_degree = 2 * len(E) + 2
            for total in range(1, max_degree + 1):
                for a in range(0, (total - 1) // 2 + 1):
                    b = total - a
                    if b - a < 2:
                        continue
                    outer = rcoefficient(rows, a, b)
                    inner = rcoefficient(rows, a + 1, b - 1)
                    value = inner - outer
                    distance = b - a
                    bucket = report["by_distance"].setdefault(
                        str(distance),
                        {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
                    )
                    bucket["checks"] += 1
                    if value < 0:
                        bucket["negative"] += 1
                    if value == 0:
                        bucket["zero"] += 1
                    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
                        bucket["minimum"] = {
                            "value": value,
                            "n": len(graph),
                            "u": int(u),
                            "v": int(v),
                            "a": a,
                            "b": b,
                            "graph6": graph6(graph),
                            "polynomial": E,
                        }


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_R_CENTRAL_UNIMODALITY",
        "by_distance": {},
        "scope": (
            "Finite exact atlas/tree census only. Zero negatives at a distance "
            "do not constitute an all-order proof."
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
    report["total_checks"] = sum(x["checks"] for x in report["by_distance"].values())
    report["total_negative"] = sum(x["negative"] for x in report["by_distance"].values())
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
