#!/usr/bin/env python3
"""Probe Schur coefficients of the R-form third-leaf remainder.

For an ordinary unmarked leaf z--s and marked forest (B;u,v), set

  S = R(B)-R(B-z)-zw R(B-{z,s}).

The coefficientwise positivity of S is automatic from polarization, but the
stronger two-variable Schur positivity is equivalent to each homogeneous
slice increasing toward its diagonal.  This finite exact probe tests those
successive differences.  Collision and isolate modes use their natural
lower terms.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_isolate_adjacent_coupling_root import rcoefficient


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_r_leaf_schur_remainder_probe_root_20260829.json"


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def rows(graph: nx.Graph, u: int, v: int) -> tuple[tuple[int, ...], ...]:
    out = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        out.append(tuple(poly_forest(reduced)))
    return tuple(out)


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    if value < 0:
        bucket["negative"] += 1
    if value == 0:
        bucket["zero"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}
    if witness["b"] <= witness["alpha"]:
        bucket["supported_checks"] += 1
        if value < 0:
            bucket["supported_negative"] += 1
        if value == 0:
            bucket["supported_zero"] += 1
        if (
            bucket["supported_minimum"] is None
            or value < bucket["supported_minimum"]["value"]
        ):
            bucket["supported_minimum"] = {"value": value, **witness}


def audit_remainder(
    graph: nx.Graph,
    u: int,
    v: int,
    z: int,
    mode: str,
    deleted_graph: nx.Graph,
    lower_graph: nx.Graph | None,
    report: dict,
) -> None:
    full = rows(graph, u, v)
    deleted = rows(deleted_graph, u, v)
    lower = rows(lower_graph, u, v) if lower_graph is not None else None

    def scoeff(a: int, b: int) -> int:
        value = rcoefficient(full, a, b) - rcoefficient(deleted, a, b)
        if lower is not None:
            value -= rcoefficient(lower, a - 1, b - 1)
        return value

    max_degree = 2 * len(full[0]) + 2
    alpha = len(full[0]) - 1
    for total in range(1, max_degree + 1):
        for a in range(0, (total - 1) // 2 + 1):
            b = total - a
            if b - a < 2:
                continue
            value = scoeff(a + 1, b - 1) - scoeff(a, b)
            distance = b - a
            bucket = report[mode]["by_distance"].setdefault(
                str(distance),
                {
                    "checks": 0,
                    "negative": 0,
                    "zero": 0,
                    "minimum": None,
                    "supported_checks": 0,
                    "supported_negative": 0,
                    "supported_zero": 0,
                    "supported_minimum": None,
                },
            )
            witness = {
                "mode": mode,
                "n": len(graph),
                "u": int(u),
                "v": int(v),
                "z": int(z),
                "a": a,
                "b": b,
                "alpha": alpha,
                "graph6": graph6(graph),
            }
            update(bucket, value, witness)


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    leaves = [z for z in graph if graph.degree(z) == 1]
    isolates = [z for z in graph if graph.degree(z) == 0]
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            for z in leaves:
                if z in (u, v):
                    continue
                support = next(iter(graph.neighbors(z)))
                deleted = graph.copy()
                deleted.remove_node(z)
                if support in (u, v):
                    audit_remainder(graph, u, v, z, "collision", deleted, None, report)
                else:
                    lower = graph.copy()
                    lower.remove_nodes_from((z, support))
                    audit_remainder(graph, u, v, z, "ordinary", deleted, lower, report)
            for z in isolates:
                if z in (u, v):
                    continue
                deleted = graph.copy()
                deleted.remove_node(z)
                audit_remainder(graph, u, v, z, "isolate", deleted, deleted, report)


def main() -> None:
    report = {"marker": "PROBE_EXACT_ISO_R_LEAF_SCHUR_REMAINDER"}
    for mode in ("ordinary", "collision", "isolate"):
        report[mode] = {"by_distance": {}}
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
    for mode in ("ordinary", "collision", "isolate"):
        buckets = report[mode]["by_distance"].values()
        report[mode]["total_checks"] = sum(x["checks"] for x in buckets)
        report[mode]["total_negative"] = sum(x["negative"] for x in buckets)
        buckets = report[mode]["by_distance"].values()
        report[mode]["supported_checks"] = sum(x["supported_checks"] for x in buckets)
        report[mode]["supported_negative"] = sum(
            x["supported_negative"] for x in buckets
        )
    report["scope"] = (
        "Finite exact atlas/tree census only. A clean Schur remainder would "
        "still require an all-order forest proof."
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
