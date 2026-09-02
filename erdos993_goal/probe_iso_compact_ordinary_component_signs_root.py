#!/usr/bin/env python3
"""Probe the three compact pieces of the ordinary FML gap in the prefix.

For A=C+xH and Full=A+xC, the exact compact identity is

 N(Full)-N(A)-zwN(C)
  =(z+w)N(C)+2zw B_N(H,C)-delta[R(C+H)-R(H)].

This census tests the diagonal contribution of each of the three displayed
pieces separately at ranks r<L(alpha).  All arithmetic is doubled to remain
integral.  Finite signs are diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2
from probe_iso_isolate_adjacent_coupling_root import rcoefficient
from probe_iso_r_polar_schur_root import add_rows, recover_h, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_component_signs_probe_root_20260829.json"


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


def r_difference(sum_rows, h_rows, rank: int) -> int:
    """Twice diagonal coefficient of -delta[R(sum)-R(h)]."""
    diagonal = (
        rcoefficient(sum_rows, rank - 1, rank - 1)
        - rcoefficient(h_rows, rank - 1, rank - 1)
    )
    outer = (
        rcoefficient(sum_rows, rank - 2, rank)
        - rcoefficient(h_rows, rank - 2, rank)
    )
    return 2 * (diagonal - outer)


def audit(graph: nx.Graph, report: dict) -> None:
    alpha = len(poly_forest(graph)) - 1
    cutoff = (2 * alpha + 1) // 3
    vertices = tuple(graph)
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
                full_rows = rows(graph, u, v)
                a_rows = rows(deleted_graph, u, v)
                c_rows = rows(lower_graph, u, v)
                h_rows = tuple(recover_h(a, c) for a, c in zip(a_rows, c_rows))
                sum_rows = add_rows(h_rows, c_rows)
                for rank in range(2, cutoff):
                    # nested2 is twice the coefficient of N.
                    adjacent = 2 * nested2(c_rows, rank - 1, rank)
                    nested_polar = (
                        nested2(sum_rows, rank - 1, rank - 1)
                        - nested2(h_rows, rank - 1, rank - 1)
                        - nested2(c_rows, rank - 1, rank - 1)
                    )
                    r_schur = r_difference(sum_rows, h_rows, rank)
                    full_gap = (
                        nested2(full_rows, rank, rank)
                        - nested2(a_rows, rank, rank)
                        - nested2(c_rows, rank - 1, rank - 1)
                    )
                    assert adjacent + nested_polar + r_schur == full_gap
                    witness = {
                        "n": len(graph),
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank": rank,
                        "u": int(u),
                        "v": int(v),
                        "z": int(z),
                        "support": int(support),
                        "graph6": graph6(graph),
                    }
                    update(report["adjacent_N"], adjacent, witness)
                    update(report["nested_polar"], nested_polar, witness)
                    update(report["R_schur"], r_schur, witness)
                    update(
                        report["adjacent_plus_polar"], adjacent + nested_polar, witness
                    )
                    update(
                        report["polar_plus_R"], nested_polar + r_schur, witness
                    )
                    update(report["full_gap"], full_gap, witness)


def fresh() -> dict:
    return {"checks": 0, "negative": 0, "zero": 0, "minimum": None}


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_COMPACT_ORDINARY_PREFIX_COMPONENT_SIGNS",
        "adjacent_N": fresh(),
        "nested_polar": fresh(),
        "R_schur": fresh(),
        "adjacent_plus_polar": fresh(),
        "polar_plus_R": fresh(),
        "full_gap": fresh(),
        "scope": "Finite exact forest prefix census only; no all-order sign is claimed.",
    }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 4 and nx.is_forest(graph0):
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
