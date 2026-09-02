#!/usr/bin/env python3
"""Exact finite theorem for the index-72 singleton-ordinary leaf face.

The face has selected edge p-v, no other selected edge, one unmarked common
neighbour c of u,v, endpoint excesses xu=xv=1, and d(p)=1.  Consequently:

* p is the leaf adjacent to v;
* c has degree two, with neighbours u,v;
* every other neighbour of u or v is a leaf.

Thus the marked component is exactly the path p-v-c-u with ``a`` additional
leaves at u and ``b`` additional leaves at v.  Every forest on the remaining
vertices is an arbitrary disjoint factor H.  This source exhausts that exact
classification in orders 14 and 15 and evaluates the raw 54-term g1 with
literal rank-0..6 independence rows.  It is a finite face theorem only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from census_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    exact_scalar,
    forest_graphs,
    raw_g1_terms,
    row_recurrence,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n14_15_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_FINITE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_INDEX72_LEAF_N14_15_G1_BERNSTEIN"
DEPENDENCIES = (
    "census_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
)
RESIDUAL_FOREST_COUNTS = {0: 1, 1: 1, 2: 2, **KNOWN_FOREST_COUNTS}


def residual_forests(order: int):
    if order == 0:
        yield nx.empty_graph(0)
    else:
        yield from forest_graphs(order)


def marked_double_star(a: int, b: int, residual: nx.Graph):
    """Return G and fixed marks (u,v,p,c)=(0,1,2,3)."""
    graph = nx.Graph()
    graph.add_nodes_from(range(4 + a + b))
    u, v, p, center = 0, 1, 2, 3
    graph.add_edges_from(((p, v), (v, center), (center, u)))
    next_vertex = 4
    for _ in range(a):
        graph.add_edge(u, next_vertex)
        next_vertex += 1
    for _ in range(b):
        graph.add_edge(v, next_vertex)
        next_vertex += 1
    graph = nx.disjoint_union(graph, nx.convert_node_labels_to_integers(residual))
    return graph, (u, v, p, center)


def common_neighbors(graph: nx.Graph, left: int, right: int):
    return set(graph.neighbors(left)) & set(graph.neighbors(right))


def neighbor_excess(graph: nx.Graph, vertex: int) -> int:
    return sum(graph.degree(neighbor) - 1 for neighbor in graph.neighbors(vertex))


def main() -> None:
    terms = raw_g1_terms()
    total_cells = 0
    total_residual_forests = 0
    global_minimum = None
    global_smallest_positive = None
    ordered_digest = hashlib.sha256()
    order_rows = {}

    for order in (14, 15):
        order_cells = 0
        order_residual_forests = 0
        order_minimum = None
        order_smallest_positive = None
        residual_counts = {}
        for residual_order in range(order - 3):
            residual_count = 0
            leaf_sum = order - 4 - residual_order
            assert leaf_sum >= 0
            for residual_index, residual in enumerate(residual_forests(residual_order)):
                residual_count += 1
                residual_row = tuple(poly_forest(residual))
                residual_row += (0,) * (7 - len(residual_row))
                # Every ordered pair (a,b) with a+b=leaf_sum is a distinct
                # marked configuration parameter and must be retained.
                for a in range(leaf_sum + 1):
                    b = leaf_sum - a
                    graph, (u, v, p, center) = marked_double_star(a, b, residual)
                    assert len(graph) == order and nx.is_forest(graph)
                    assert graph.has_edge(p, v)
                    assert not graph.has_edge(u, v) and not graph.has_edge(p, u)
                    assert common_neighbors(graph, u, v) == {center}
                    assert common_neighbors(graph, p, u) == set()
                    assert common_neighbors(graph, p, v) == set()
                    assert graph.degree(p) == 1 and graph.degree(center) == 2
                    assert neighbor_excess(graph, u) == 1
                    assert neighbor_excess(graph, v) == 1
                    assert neighbor_excess(graph, p) == graph.degree(v) - 1

                    deleted_row = row_recurrence(graph)
                    full_row = deleted_row(0)
                    established = tuple(poly_forest(graph))
                    established += (0,) * (7 - len(established))
                    assert full_row == established[:7]
                    masks = (
                        0,
                        1 << u,
                        1 << v,
                        (1 << u) | (1 << v),
                        1 << p,
                        (1 << p) | (1 << u),
                        (1 << p) | (1 << v),
                        (1 << p) | (1 << u) | (1 << v),
                    )
                    rows = tuple(deleted_row(mask) for mask in masks)
                    value = exact_scalar(terms, rows)
                    if value < 0:
                        raise AssertionError(
                            "negative index72 leaf value", order,
                            residual_order, residual_index, a, b, value,
                            nx.to_graph6_bytes(residual, header=False).decode().strip(),
                        )
                    witness = {
                        "order": order,
                        "residual_order": residual_order,
                        "residual_index": residual_index,
                        "residual_graph6": nx.to_graph6_bytes(
                            residual, header=False
                        ).decode().strip(),
                        "a_u_leaves": a,
                        "b_v_leaves": b,
                        "value": value,
                    }
                    if order_minimum is None or value < order_minimum["value"]:
                        order_minimum = witness
                    if global_minimum is None or value < global_minimum["value"]:
                        global_minimum = witness
                    if value > 0:
                        if order_smallest_positive is None or value < order_smallest_positive["value"]:
                            order_smallest_positive = witness
                        if global_smallest_positive is None or value < global_smallest_positive["value"]:
                            global_smallest_positive = witness
                    ordered_digest.update(
                        f"{order}|{residual_order}|{residual_index}|{a}|{b}|{value}\n".encode()
                    )
                    order_cells += 1
            expected_residual_count = RESIDUAL_FOREST_COUNTS[residual_order]
            assert residual_count == expected_residual_count
            residual_counts[str(residual_order)] = residual_count
            order_residual_forests += residual_count

        expected_cells = sum(
            RESIDUAL_FOREST_COUNTS[h] * (order - 3 - h)
            for h in range(order - 3)
        )
        assert order_cells == expected_cells
        total_cells += order_cells
        total_residual_forests += order_residual_forests
        order_rows[str(order)] = {
            "classified_cells": order_cells,
            "residual_forest_instances": order_residual_forests,
            "residual_forest_counts": residual_counts,
            "minimum": order_minimum,
            "smallest_positive": order_smallest_positive,
        }
        print(json.dumps({"order": order, **order_rows[str(order)]}, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "theorem": (
            "Raw singleton-ordinary rank-five g1 is nonnegative on every "
            "index-72 exact p-leaf face in orders 14 and 15."
        ),
        "orders": [14, 15],
        "classified_cells": total_cells,
        "residual_forest_instances": total_residual_forests,
        "global_minimum": global_minimum,
        "global_smallest_positive": global_smallest_positive,
        "ordered_value_stream_sha256": ordered_digest.hexdigest().upper(),
        "rows": order_rows,
        "classification": (
            "The marked component is exactly p-v-c-u, with c degree two, "
            "a>=0 additional leaves at u, b>=0 additional leaves at v, "
            "and an arbitrary disjoint residual forest H."
        ),
        "raw_g1": {
            "term_count": len(terms),
            "row_rank_range": [0, 6],
            "configuration": "C=rows(G), D=rows(G-p)",
        },
        "completeness": {
            "all_a_b_pairs": True,
            "all_residual_unlabeled_forests": True,
            "known_residual_forest_counts_checked": True,
            "independence_rows": "literal bitmask recurrence through rank six",
            "full_rows_cross_checked": "poly_forest on every classified cell",
            "structural_flags_asserted_on_every_cell": True,
        },
        "scope": (
            "Exact finite index-72 p-leaf face theorem in orders 14 and 15 "
            "only. No other branch, all-mode, all-N5, or Problem 993 claim."
        ),
        "dependencies_sha256": {
            name: hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()
            for name in DEPENDENCIES
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "classified_cells": total_cells,
        "global_minimum": global_minimum,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
