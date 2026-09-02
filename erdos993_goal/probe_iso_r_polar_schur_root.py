#!/usr/bin/env python3
"""Probe the polarized R term in the ordinary third-leaf remainder.

For the support-resolved tuples A=C+xH, exact quadratic algebra gives

  R(Full)-R(A)-zwR(C)=(z+w)R(C)+2zw B_R(H,C).

This script tests central/Schur differences of the integer polynomial
2B_R(H,C)=R(H+C)-R(H)-R(C) on exact finite forest instances.  It determines
whether the two summands can be proved separately or require coupled payment.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_isolate_adjacent_coupling_root import rcoefficient


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_r_polar_schur_probe_root_20260829.json"


def rows(graph: nx.Graph, u: int, v: int) -> tuple[tuple[int, ...], ...]:
    out = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        out.append(tuple(poly_forest(reduced)))
    return tuple(out)


def at(row: tuple[int, ...], k: int) -> int:
    return row[k] if 0 <= k < len(row) else 0


def recover_h(a: tuple[int, ...], c: tuple[int, ...]) -> tuple[int, ...]:
    # A=C+xH, coefficient by coefficient.
    degree = max(len(a), len(c))
    h = tuple(at(a, k + 1) - at(c, k + 1) for k in range(degree))
    while len(h) > 1 and h[-1] == 0:
        h = h[:-1]
    assert all(value >= 0 for value in h)
    assert all(at(a, k) == at(c, k) + at(h, k - 1) for k in range(degree + 1))
    return h


def add_rows(left, right):
    out = []
    for a, b in zip(left, right):
        out.append(tuple(at(a, k) + at(b, k) for k in range(max(len(a), len(b)))))
    return tuple(out)


def polar2_coefficient(h, c, a: int, b: int) -> int:
    return (
        rcoefficient(add_rows(h, c), a, b)
        - rcoefficient(h, a, b)
        - rcoefficient(c, a, b)
    )


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
    if witness["b"] <= witness["alpha"]:
        bucket["supported_checks"] += 1
        if value < 0:
            bucket["supported_negative"] += 1
        if bucket["supported_minimum"] is None or value < bucket["supported_minimum"]["value"]:
            bucket["supported_minimum"] = {"value": value, **witness}
    if witness["target_rank"] < witness["cutoff"]:
        bucket["prefix_checks"] += 1
        if value < 0:
            bucket["prefix_negative"] += 1
        if bucket["prefix_minimum"] is None or value < bucket["prefix_minimum"]["value"]:
            bucket["prefix_minimum"] = {"value": value, **witness}


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    alpha = len(poly_forest(graph)) - 1
    cutoff = (2 * alpha + 1) // 3
    for z in [x for x in graph if graph.degree(x) == 1]:
        support = next(iter(graph.neighbors(z)))
        deleted_graph = graph.copy()
        deleted_graph.remove_node(z)
        lower_graph = graph.copy()
        lower_graph.remove_nodes_from((z, support))
        for index, u in enumerate(vertices):
            for v in vertices[index + 1 :]:
                if z in (u, v) or support in (u, v):
                    continue
                arows = rows(deleted_graph, u, v)
                crows = rows(lower_graph, u, v)
                hrows = tuple(recover_h(a, c) for a, c in zip(arows, crows))
                max_degree = 2 * max(map(len, arows)) + 2
                for total in range(2, max_degree + 1):
                    for a in range(0, (total - 1) // 2 + 1):
                        b = total - a
                        if b - a < 2:
                            continue
                        value = (
                            polar2_coefficient(hrows, crows, a + 1, b - 1)
                            - polar2_coefficient(hrows, crows, a, b)
                        )
                        distance = b - a
                        bucket = report["by_distance"].setdefault(
                            str(distance),
                            {
                                "checks": 0,
                                "negative": 0,
                                "zero": 0,
                                "minimum": None,
                                "supported_checks": 0,
                                "supported_negative": 0,
                                "supported_minimum": None,
                                "prefix_checks": 0,
                                "prefix_negative": 0,
                                "prefix_minimum": None,
                            },
                        )
                        update(
                            bucket,
                            value,
                            {
                                "n": len(graph),
                                "alpha": alpha,
                                "u": int(u),
                                "v": int(v),
                                "z": int(z),
                                "support": int(support),
                                "a": a,
                                "b": b,
                                "target_rank": b + 1,
                                "cutoff": cutoff,
                                "graph6": graph6(graph),
                            },
                        )


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_R_POLAR_SCHUR_TERM",
        "identity": "ordinary R remainder=(z+w)R(C)+2zw B_R(H,C)",
        "by_distance": {},
        "scope": "Finite exact forest census only; signs are not an all-order proof.",
    }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 4 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            forests += 1
    for n in range(8, 10):
        for graph in nx.nonisomorphic_trees(n):
            audit(graph, report)
            forests += 1
    report["forests"] = forests
    buckets = report["by_distance"].values()
    report["total_checks"] = sum(x["checks"] for x in buckets)
    report["total_negative"] = sum(x["negative"] for x in buckets)
    buckets = report["by_distance"].values()
    report["supported_checks"] = sum(x["supported_checks"] for x in buckets)
    report["supported_negative"] = sum(x["supported_negative"] for x in buckets)
    buckets = report["by_distance"].values()
    report["prefix_checks"] = sum(x["prefix_checks"] for x in buckets)
    report["prefix_negative"] = sum(x["prefix_negative"] for x in buckets)
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
