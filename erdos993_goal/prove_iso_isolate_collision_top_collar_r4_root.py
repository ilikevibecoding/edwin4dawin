#!/usr/bin/env python3
"""Prove isolate and collision FML on the rank-four top collar.

For either mode, r=4=alpha(W)+2 implies alpha(W)=2, where
W=B-{u,v}.  Because W is a forest it is bipartite, hence |W|<=4 and
|B|<=6.  We can therefore enumerate every labelled simple graph on four,
five, and six vertices, retain exactly the forests and every ordered marked
pair with alpha(W)=2, and check every eligible isolate or marked-support leaf
using literal independent-set enumeration and exact integer arithmetic.

Enumerating labelled graphs is deliberately redundant: it makes completeness
of the finite classification independent of any graph-atlas catalogue.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_isolate_collision_top_collar_r4_exact_root_20260829.json"
RANK = 4


def coefficient(row: list[int], index: int) -> int:
    return row[index] if 0 <= index < len(row) else 0


def edge_mask_graph(order: int, edges: tuple[tuple[int, int], ...], mask: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    graph.add_edges_from(edge for index, edge in enumerate(edges) if mask & (1 << index))
    return graph


def polynomial_rows(graph: nx.Graph, u: int, v: int) -> tuple[tuple[int, ...], ...]:
    rows = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        rows.append(tuple(poly_forest(reduced)))
    return tuple(rows)


def cross_check_vector(graph: nx.Graph, u: int, v: int, vector: list[int]) -> None:
    """Check the closed N_r formula against an independent kernel evaluation."""
    rows = polynomial_rows(graph, u, v)
    for rank in range(len(vector)):
        assert 2 * coefficient(vector, rank) == nested2(rows, rank, rank)


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["cells"] += 1
    if value == 0:
        bucket["zero"] += 1
    if value < 0:
        bucket["negative"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def main() -> None:
    stats = {
        "isolate": {"cells": 0, "zero": 0, "negative": 0, "minimum": None},
        "collision": {"cells": 0, "zero": 0, "negative": 0, "minimum": None},
    }
    totals = {
        "simple_graphs": 0,
        "forests": 0,
        "ordered_marked_pairs": 0,
        "top_collar_pairs": 0,
        "kernel_cross_checks": 0,
    }
    by_order = {}

    for order in range(4, 7):
        edges = tuple(itertools.combinations(range(order), 2))
        local = {
            "simple_graphs": 1 << len(edges),
            "forests": 0,
            "ordered_marked_pairs": 0,
            "top_collar_pairs": 0,
            "isolate_cells": 0,
            "collision_cells": 0,
        }
        totals["simple_graphs"] += local["simple_graphs"]

        for mask in range(1 << len(edges)):
            graph = edge_mask_graph(order, edges, mask)
            if not nx.is_forest(graph):
                continue
            local["forests"] += 1
            totals["forests"] += 1

            for u in range(order):
                for v in range(order):
                    if u == v:
                        continue
                    local["ordered_marked_pairs"] += 1
                    totals["ordered_marked_pairs"] += 1
                    W = graph.copy()
                    W.remove_nodes_from((u, v))
                    alpha_W = len(poly_forest(W)) - 1
                    if alpha_W != 2:
                        continue
                    assert len(W) <= 4
                    assert RANK == alpha_W + 2
                    local["top_collar_pairs"] += 1
                    totals["top_collar_pairs"] += 1

                    full = four_minor_vector(graph, u, v)
                    cross_check_vector(graph, u, v, full)
                    totals["kernel_cross_checks"] += 1
                    for z in range(order):
                        if z in (u, v):
                            continue
                        degree = graph.degree(z)
                        if degree == 0:
                            deleted_graph = graph.copy()
                            deleted_graph.remove_node(z)
                            deleted = four_minor_vector(deleted_graph, u, v)
                            cross_check_vector(deleted_graph, u, v, deleted)
                            totals["kernel_cross_checks"] += 1
                            value = (
                                coefficient(full, RANK)
                                - coefficient(deleted, RANK)
                                - coefficient(deleted, RANK - 1)
                            )
                            witness = {
                                "order": order,
                                "edge_mask": mask,
                                "edges": list(graph.edges()),
                                "u": u,
                                "v": v,
                                "z": z,
                                "full_N4": coefficient(full, RANK),
                                "deleted_N4": coefficient(deleted, RANK),
                                "lower_N3": coefficient(deleted, RANK - 1),
                            }
                            update(stats["isolate"], value, witness)
                            local["isolate_cells"] += 1
                        elif degree == 1:
                            support = next(iter(graph.neighbors(z)))
                            if support not in (u, v):
                                continue
                            deleted_graph = graph.copy()
                            deleted_graph.remove_node(z)
                            deleted = four_minor_vector(deleted_graph, u, v)
                            cross_check_vector(deleted_graph, u, v, deleted)
                            totals["kernel_cross_checks"] += 1
                            value = coefficient(full, RANK) - coefficient(deleted, RANK)
                            witness = {
                                "order": order,
                                "edge_mask": mask,
                                "edges": list(graph.edges()),
                                "u": u,
                                "v": v,
                                "z": z,
                                "support": support,
                                "full_N4": coefficient(full, RANK),
                                "deleted_N4": coefficient(deleted, RANK),
                            }
                            update(stats["collision"], value, witness)
                            local["collision_cells"] += 1

        by_order[str(order)] = local

    # Frozen after the first exact labelled-graph replay.  These assertions
    # make accidental scope drift or enumeration changes fail loudly.
    expected_totals = {
        "simple_graphs": 33856,
        "forests": 3261,
        "ordered_marked_pairs": 94236,
        "top_collar_pairs": 24828,
        "kernel_cross_checks": 27852,
    }
    expected_cells = {"isolate": 1008, "collision": 2016}
    expected_minima = {"isolate": 2, "collision": 4}

    assert totals == expected_totals, (totals, expected_totals)
    actual_cells = {name: item["cells"] for name, item in stats.items()}
    actual_minima = {name: item["minimum"]["value"] for name, item in stats.items()}
    assert actual_cells == expected_cells, (actual_cells, expected_cells)
    assert actual_minima == expected_minima, (actual_minima, expected_minima)
    assert all(item["negative"] == 0 for item in stats.values())

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_TOP_COLLAR_R4",
        "normalization": (
            "Displayed gaps are in N_r units; twice each value is the doubled "
            "diagonal coefficient returned by the independent kernel evaluator."
        ),
        "theorem": (
            "For every isolate or marked-support collision FML cell in a marked "
            "forest, if r=4=alpha(W)+2, then the corresponding FML gap is "
            "nonnegative."
        ),
        "finite_reduction": {
            "top_collar": "r=4=alpha(W)+2 implies alpha(W)=2",
            "forest_bound": "W is bipartite, so |W|<=2 alpha(W)=4",
            "ambient_bound": "B is W plus the two marks, so 4<=|B|<=6",
            "enumeration": (
                "Every labelled simple graph on 4, 5, and 6 vertices; retain "
                "exactly the forests, every ordered marked pair with alpha(W)=2, "
                "and every eligible isolate or leaf adjacent to a mark."
            ),
        },
        "totals": totals,
        "by_order": by_order,
        "gap_statistics": stats,
        "scope_boundary": (
            "This proves only the isolate and collision modes on the single "
            "boundary layer r=4=alpha(W)+2.  It does not cover alpha(W)>=3, "
            "ordinary cells, ranks r>=5, all FML, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
