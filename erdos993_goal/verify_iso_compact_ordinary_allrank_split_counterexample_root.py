#!/usr/bin/env python3
"""Freeze the smallest-order all-rank obstruction to the compact A/B split.

The strict-prefix census suggested separate positivity of

  A_r = diag((z+w)N(C)+2zw B_N(H,C)),
  B_r = diag(-(z-w)^2[R(C+H)-R(H)]/2).

That separation is false on the induction-closed collar r<=alpha(W)+2.
An eight-vertex path has B_5=-2 at r=alpha(W)+2, while A_5=390 and the
coupled full FML gap is 388.  This script recomputes the witness by literal
independent-subset enumeration and exhausts every atlas forest of order at
most seven to certify the minimal order.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_allrank_split_counterexample_exact_root_20260829.json"

WITNESS_EDGES = (
    (0, 1),
    (0, 5),
    (1, 2),
    (2, 3),
    (3, 4),
    (5, 6),
    (6, 7),
)
MARK_U = 5
MARK_V = 7
LEAF_Z = 4
SUPPORT_S = 3
RANK = 5


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def trim(row: list[int]) -> tuple[int, ...]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return tuple(row)


def independence_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    """Literal enumeration of every vertex subset."""
    vertices = tuple(graph)
    position = {vertex: index for index, vertex in enumerate(vertices)}
    edges = tuple((position[u], position[v]) for u, v in graph.edges())
    row = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        if any((mask >> u) & 1 and (mask >> v) & 1 for u, v in edges):
            continue
        row[mask.bit_count()] += 1
    return trim(row)


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        at(left, rank) + at(right, rank)
        for rank in range(max(len(left), len(right)))
    )


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def add_rows(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def kernel2(row: tuple[int, ...], a: int, b: int) -> int:
    return (
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def leaf2(A, C, a: int, b: int) -> int:
    return (
        kernel2(add(A, shift(C)), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2(rows, a: int, b: int) -> int:
    E, U, V, W = rows
    return (
        leaf2(add(E, shift(U)), add(V, shift(W)), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def rcoefficient(rows, a: int, b: int) -> int:
    E, U, V, W = rows
    return (
        at(W, a - 2) * at(E, b)
        + at(E, a) * at(W, b - 2)
        + at(V, a - 1) * at(U, b - 1)
        + at(U, a - 1) * at(V, b - 1)
    )


def four_rows(graph: nx.Graph, u: int, v: int):
    out = []
    for deleted in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(deleted)
        out.append(independence_polynomial(reduced))
    return tuple(out)


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def ordinary_cell(graph: nx.Graph, u: int, v: int, z: int, rank: int) -> dict:
    assert graph.degree(z) == 1
    support = next(iter(graph.neighbors(z)))
    assert len({u, v, z, support}) == 4

    deleted = graph.copy()
    deleted.remove_node(z)
    C_graph = graph.copy()
    C_graph.remove_nodes_from((z, support))
    H_graph = graph.copy()
    H_graph.remove_nodes_from({support, *graph.neighbors(support)})

    full_rows = four_rows(graph, u, v)
    deleted_rows = four_rows(deleted, u, v)
    C_rows = four_rows(C_graph, u, v)
    H_rows = four_rows(H_graph, u, v)
    S_rows = add_rows(C_rows, H_rows)

    adjacent = 2 * nested2(C_rows, rank - 1, rank)
    nested_polar = (
        nested2(S_rows, rank - 1, rank - 1)
        - nested2(H_rows, rank - 1, rank - 1)
        - nested2(C_rows, rank - 1, rank - 1)
    )
    A_piece = adjacent + nested_polar

    R_inner_S = rcoefficient(S_rows, rank - 1, rank - 1)
    R_inner_H = rcoefficient(H_rows, rank - 1, rank - 1)
    R_outer_S = rcoefficient(S_rows, rank - 2, rank)
    R_outer_H = rcoefficient(H_rows, rank - 2, rank)
    B_piece = 2 * (
        (R_inner_S - R_inner_H) - (R_outer_S - R_outer_H)
    )

    full_gap = (
        nested2(full_rows, rank, rank)
        - nested2(deleted_rows, rank, rank)
        - nested2(C_rows, rank - 1, rank - 1)
    )
    assert A_piece + B_piece == full_gap

    return {
        "support": support,
        "full_rows": full_rows,
        "deleted_rows": deleted_rows,
        "C_rows": C_rows,
        "H_rows": H_rows,
        "S_rows": S_rows,
        "alpha_W": len(C_rows[3]) - 1,
        "adjacent_N": adjacent,
        "nested_N_polar": nested_polar,
        "A_piece": A_piece,
        "R_inner_S": R_inner_S,
        "R_inner_H": R_inner_H,
        "R_outer_S": R_outer_S,
        "R_outer_H": R_outer_H,
        "B_piece": B_piece,
        "full_gap": full_gap,
    }


def minimal_order_census() -> dict:
    forests = 0
    configurations = 0
    cells = 0
    minima = {"A": None, "B": None, "full_gap": None}
    by_order: dict[str, dict[str, int]] = {}
    for order in range(4, 8):
        order_forests = 0
        order_configurations = 0
        order_cells = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            order_forests += 1
            vertices = tuple(graph)
            for z in [vertex for vertex in graph if graph.degree(vertex) == 1]:
                support = next(iter(graph.neighbors(z)))
                available = [x for x in vertices if x not in (z, support)]
                for index, u in enumerate(available):
                    for v in available[index + 1 :]:
                        # alpha(W) is independent of rank, so obtain it once.
                        probe = ordinary_cell(graph, u, v, z, 2)
                        alpha_W = probe["alpha_W"]
                        order_configurations += 1
                        for rank in range(2, alpha_W + 3):
                            item = ordinary_cell(graph, u, v, z, rank)
                            order_cells += 1
                            values = {
                                "A": item["A_piece"],
                                "B": item["B_piece"],
                                "full_gap": item["full_gap"],
                            }
                            for name, value in values.items():
                                if minima[name] is None or value < minima[name]:
                                    minima[name] = value
                            assert item["A_piece"] >= 0
                            assert item["B_piece"] >= 0
                            assert item["full_gap"] >= 0
        by_order[str(order)] = {
            "forests": order_forests,
            "configurations": order_configurations,
            "cells": order_cells,
        }
        forests += order_forests
        configurations += order_configurations
        cells += order_cells
    return {
        "max_order": 7,
        "forests": forests,
        "configurations": configurations,
        "cells": cells,
        "negative_A": 0,
        "negative_B": 0,
        "negative_full_gap": 0,
        "minima": minima,
        "by_order": by_order,
        "enumeration": "Every unlabeled graph in the NetworkX graph atlas, restricted exactly to forests.",
    }


def main() -> None:
    witness = nx.Graph()
    witness.add_nodes_from(range(8))
    witness.add_edges_from(WITNESS_EDGES)
    assert nx.is_tree(witness)
    assert sorted(dict(witness.degree()).values()) == [1, 1, 2, 2, 2, 2, 2, 2]
    assert graph6(witness) == "GhE?GC"
    assert next(iter(witness.neighbors(LEAF_Z))) == SUPPORT_S

    cell = ordinary_cell(witness, MARK_U, MARK_V, LEAF_Z, RANK)
    expected_C = (
        (1, 6, 10, 4),
        (1, 5, 7, 2),
        (1, 5, 6, 1),
        (1, 4, 4, 1),
    )
    expected_H = (
        (1, 5, 6, 1),
        (1, 4, 4),
        (1, 4, 3),
        (1, 3, 2),
    )
    assert cell["C_rows"] == expected_C
    assert cell["H_rows"] == expected_H
    assert cell["alpha_W"] == 3 and RANK == cell["alpha_W"] + 2
    assert cell["adjacent_N"] == 146
    assert cell["nested_N_polar"] == 244
    assert cell["A_piece"] == 390
    assert (
        cell["R_inner_S"],
        cell["R_inner_H"],
        cell["R_outer_S"],
        cell["R_outer_H"],
    ) == (4, 0, 5, 0)
    assert cell["B_piece"] == -2
    assert cell["full_gap"] == 388

    census = minimal_order_census()
    source_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "marker": "PASS_EXACT_ISO_COMPACT_ORDINARY_ALLRANK_SPLIT_COUNTEREXAMPLE",
        "normalization": "All compact pieces and the full gap are in doubled diagonal units.",
        "domain": "Induction-closed collar 2<=r<=alpha(W)+2.",
        "witness": {
            "graph": "P8",
            "graph6": graph6(witness),
            "vertices": list(range(8)),
            "edges": WITNESS_EDGES,
            "marks": {"u": MARK_U, "v": MARK_V},
            "ordinary_leaf": {"z": LEAF_Z, "support": SUPPORT_S},
            "rank": RANK,
            "alpha_W": cell["alpha_W"],
            "rank_boundary": "r=alpha(W)+2",
            "full_independence_polynomial": cell["full_rows"][0],
            "C_rows": {name: row for name, row in zip("EUVW", cell["C_rows"])},
            "H_rows": {name: row for name, row in zip("EUVW", cell["H_rows"])},
            "S_rows": {name: row for name, row in zip("EUVW", cell["S_rows"])},
            "A_decomposition": {
                "adjacent_N": cell["adjacent_N"],
                "nested_N_polar": cell["nested_N_polar"],
                "A_piece": cell["A_piece"],
            },
            "B_decomposition": {
                "R_increment_inner_4_4": cell["R_inner_S"] - cell["R_inner_H"],
                "R_increment_outer_3_5": cell["R_outer_S"] - cell["R_outer_H"],
                "B_piece": cell["B_piece"],
            },
            "full_gap": cell["full_gap"],
        },
        "minimal_order_census": census,
        "obstruction": {
            "refutes": (
                "Separate nonnegativity of the R-Schur piece B_r on the "
                "induction-closed collar r<=alpha(W)+2."
            ),
            "does_not_refute": (
                "The strict-prefix A/B evidence, the coupled full FML gap, "
                "forest ISO, or Erdos Problem 993."
            ),
            "forced_pivot": (
                "Retain A_r+B_r or introduce a rigorous cross-rank telescope; "
                "a componentwise all-rank A/B induction cannot close."
            ),
        },
        "scope": (
            "Exact finite counterexample and minimal-order census only. "
            "The positive full gap on this witness is not an all-forest proof."
        ),
        "source_sha256": source_sha256,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    report_sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()
    print(json.dumps(report, indent=2, sort_keys=True))
    print("SOURCE_SHA256", source_sha256)
    print("REPORT_SHA256", report_sha256)
    print(report["marker"])


if __name__ == "__main__":
    main()
