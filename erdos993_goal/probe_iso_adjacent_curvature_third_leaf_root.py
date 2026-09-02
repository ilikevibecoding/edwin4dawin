#!/usr/bin/env python3
"""Probe third-leaf recurrences for the isolate bridge invariants M and C.

For a marked forest (B;u,v), define

  M_r = 2[z^(r-1)w^r] N(B;u,v),
  C_r = R_(r-1,r-1)-R_(r-2,r).

This exact finite census tests the same ordinary/isolate/collision deletion
recurrences used for the diagonal nested invariant.  A clean result would be
evidence for a strengthened induction cone, not an all-order proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2
from probe_iso_isolate_adjacent_coupling_root import rcoefficient


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_adjacent_curvature_third_leaf_probe_root_20260829.json"


def rows(graph: nx.Graph, u: int, v: int) -> tuple[tuple[int, ...], ...]:
    values = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        values.append(tuple(poly_forest(reduced)))
    return tuple(values)


def invariant(values: tuple[tuple[int, ...], ...], rank: int) -> tuple[int, int]:
    adjacent = nested2(values, rank - 1, rank)
    curvature = (
        rcoefficient(values, rank - 1, rank - 1)
        - rcoefficient(values, rank - 2, rank)
    )
    return adjacent, curvature


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    if value < 0:
        bucket["negative"] += 1
    if value == 0:
        bucket["zero"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    alpha = len(poly_forest(graph)) - 1
    leaves = [z for z in graph if graph.degree(z) == 1]
    isolates = [z for z in graph if graph.degree(z) == 0]
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            full = rows(graph, u, v)
            for z in leaves:
                if z in (u, v):
                    continue
                support = next(iter(graph.neighbors(z)))
                deleted_graph = graph.copy()
                deleted_graph.remove_node(z)
                deleted = rows(deleted_graph, u, v)
                lower = None
                if support not in (u, v):
                    lower_graph = graph.copy()
                    lower_graph.remove_nodes_from((z, support))
                    lower = rows(lower_graph, u, v)
                mode = "collision" if support in (u, v) else "ordinary"
                for rank in range(2, alpha + 1):
                    fm, fc = invariant(full, rank)
                    dm, dc = invariant(deleted, rank)
                    lm = lc = 0
                    if lower is not None:
                        lm, lc = invariant(lower, rank - 1)
                    witness = {
                        "mode": mode,
                        "n": len(graph),
                        "rank": rank,
                        "u": int(u),
                        "v": int(v),
                        "z": int(z),
                        "support": int(support),
                        "graph6": graph6(graph),
                    }
                    update(report[mode]["adjacent"], fm - dm - lm, witness)
                    update(report[mode]["curvature"], fc - dc - lc, witness)
                    update(
                        report[mode]["coupled_gap"],
                        (fm + fc) - (dm + dc) - (lm + lc),
                        witness,
                    )

            for z in isolates:
                if z in (u, v):
                    continue
                deleted_graph = graph.copy()
                deleted_graph.remove_node(z)
                deleted = rows(deleted_graph, u, v)
                for rank in range(2, alpha + 1):
                    fm, fc = invariant(full, rank)
                    dm, dc = invariant(deleted, rank)
                    lm, lc = invariant(deleted, rank - 1)
                    witness = {
                        "mode": "isolate",
                        "n": len(graph),
                        "rank": rank,
                        "u": int(u),
                        "v": int(v),
                        "z": int(z),
                        "graph6": graph6(graph),
                    }
                    update(report["isolate"]["adjacent"], fm - dm - lm, witness)
                    update(report["isolate"]["curvature"], fc - dc - lc, witness)
                    update(
                        report["isolate"]["coupled_gap"],
                        (fm + fc) - (dm + dc) - (lm + lc),
                        witness,
                    )


def fresh_bucket() -> dict:
    return {"checks": 0, "negative": 0, "zero": 0, "minimum": None}


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_ADJACENT_CURVATURE_THIRD_LEAF_RECURRENCES"
    }
    for mode in ("ordinary", "collision", "isolate"):
        report[mode] = {
            "adjacent": fresh_bucket(),
            "curvature": fresh_bucket(),
            "coupled_gap": fresh_bucket(),
        }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 3 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            forests += 1
    for n in range(8, 10):
        for graph in nx.nonisomorphic_trees(n):
            audit(graph, report)
            forests += 1
    report["forests"] = forests
    report["scope"] = (
        "Finite exact atlas/tree census only. No all-order recurrence is "
        "claimed even when a bucket has zero negatives."
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
