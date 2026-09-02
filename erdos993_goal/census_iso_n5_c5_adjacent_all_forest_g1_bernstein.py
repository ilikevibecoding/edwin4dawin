#!/usr/bin/env python3
"""Complete finite census for adjacent-mark rank-five C5.

The marked forest is G with adjacent marks u,v.  Put

    A = G-u-v,
    B = G-N[v],
    C = G-N[u].

For the adjacent case the exact mark-occupation split is

    C5 = H(A) + L(A,B) + L(A,C) + K(B,C),

where H,L,K are the four displayed coefficient forms below.  This source
enumerates every unlabeled forest of order 2 through 14 and every edge in
each forest.  It also independently reconstructs C5 from the four raw rows
(E,U,V,W) and checks the split cell by cell.

The result is a complete finite certificate only.  It makes no all-order
claim and does not prove M5+3*C5, g1, all N5, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_adjacent_all_forest_finite_census_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_FINITE_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_BERNSTEIN"
KNOWN_FOREST_COUNTS = {
    0: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
    12: 1601,
    13: 3658,
    14: 8599,
}


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def h_c(a: tuple[int, ...]) -> int:
    return at(a, 3) ** 2 - at(a, 1) * at(a, 5)


def ell_c(a: tuple[int, ...], b: tuple[int, ...]) -> int:
    return (
        -at(a, 1) * at(b, 4)
        + at(a, 2) * at(b, 3)
        + at(a, 3) * at(b, 2)
        - at(a, 4) * at(b, 1)
    )


def k_c(b: tuple[int, ...], c: tuple[int, ...]) -> int:
    return (
        -at(b, 1) * at(c, 3)
        + 2 * at(b, 2) * at(c, 2)
        - at(b, 3) * at(c, 1)
    )


def r_coefficient(rows: tuple[tuple[int, ...], ...], left: int, right: int) -> int:
    """Coefficient of the exact four-row defect form R(E,U,V,W)."""
    e, u, v, w = rows
    return (
        at(w, left - 2) * at(e, right)
        + at(e, left) * at(w, right - 2)
        + at(v, left - 1) * at(u, right - 1)
        + at(u, left - 1) * at(v, right - 1)
    )


def forest_graphs(order: int):
    """Yield every unlabeled forest of the requested order exactly once."""
    if order == 0:
        yield nx.Graph()
        return
    component_types: list[tuple[int, nx.Graph]] = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([component_types[index][1] for index in chosen])
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def update_minimum(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    bucket["zero"] += int(value == 0)
    if value > 0:
        current = bucket["smallest_positive"]
        if current is None or value < current["value"]:
            bucket["smallest_positive"] = {"value": value, **witness}
    current = bucket["minimum"]
    if current is None or value < current["value"]:
        bucket["minimum"] = {"value": value, **witness}


def main() -> None:
    rows: dict[str, dict] = {}
    global_bucket = {"checks": 0, "zero": 0, "minimum": None, "smallest_positive": None}
    total_forests = 0
    total_edges = 0
    ordered_digest = hashlib.sha256()

    for order in range(2, 15):
        forest_count = 0
        edge_count = 0
        bucket = {"checks": 0, "zero": 0, "minimum": None, "smallest_positive": None}
        for forest_index, graph in enumerate(forest_graphs(order)):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph)
            row_cache: dict[frozenset[int], tuple[int, ...]] = {}

            def row(deleted) -> tuple[int, ...]:
                key = frozenset(deleted)
                if key not in row_cache:
                    kept = [vertex for vertex in graph if vertex not in key]
                    row_cache[key] = tuple(poly_forest(graph.subgraph(kept)))
                return row_cache[key]

            e = row(())
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in graph.edges():
                edge_count += 1
                a = row((u, v))
                closed_u = {u, *graph.neighbors(u)}
                closed_v = {v, *graph.neighbors(v)}
                b = row(closed_v)
                c = row(closed_u)
                partition_value = h_c(a) + ell_c(a, b) + ell_c(a, c) + k_c(b, c)

                raw_rows = (e, row((u,)), row((v,)), a)
                raw_value = r_coefficient(raw_rows, 4, 4) - r_coefficient(raw_rows, 3, 5)
                assert partition_value == raw_value, (
                    "partition mismatch", order, forest_index, u, v,
                    partition_value, raw_value,
                )
                assert raw_value >= 0, (
                    "negative adjacent C5", order, forest_index, u, v, raw_value,
                )
                witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": graph6,
                    "edge": [int(u), int(v)],
                }
                update_minimum(bucket, raw_value, witness)
                update_minimum(global_bucket, raw_value, witness)
                ordered_digest.update(
                    f"{order}|{forest_index}|{graph6}|{u}|{v}|{raw_value};".encode()
                )

        assert forest_count == KNOWN_FOREST_COUNTS[order], (
            order, forest_count, KNOWN_FOREST_COUNTS[order]
        )
        assert edge_count == bucket["checks"]
        total_forests += forest_count
        total_edges += edge_count
        rows[str(order)] = {
            "unlabeled_forests": forest_count,
            "adjacent_mark_cells": edge_count,
            "zero_cells": bucket["zero"],
            "minimum": bucket["minimum"],
            "smallest_positive": bucket["smallest_positive"],
        }
        print(json.dumps({"order": order, **rows[str(order)]}, sort_keys=True), flush=True)

    assert total_edges == global_bucket["checks"]
    report = {
        "marker": MARKER,
        "theorem": (
            "C5 is nonnegative for every adjacent-mark cell in every unlabeled "
            "forest of order 2 through 14."
        ),
        "orders": [2, 14],
        "unlabeled_forests": total_forests,
        "adjacent_mark_cells": total_edges,
        "global_zero_cells": global_bucket["zero"],
        "global_minimum": global_bucket["minimum"],
        "global_smallest_positive": global_bucket["smallest_positive"],
        "ordered_cell_stream_sha256": ordered_digest.hexdigest().upper(),
        "rows": rows,
        "algebra": {
            "occupation_rows": "W=A, U=A+xB, V=A+xC, E=A+xB+xC",
            "partition": "C5=H_C(A)+L_C(A,B)+L_C(A,C)+K_C(B,C)",
            "H_C": "a3^2-a1*a5",
            "L_C": "-a1*b4+a2*b3+a3*b2-a4*b1",
            "K_C": "-b1*c3+2*b2*c2-b3*c1",
            "raw_reconstruction_checked_cellwise": True,
        },
        "completeness": {
            "generation": "nondecreasing multisets of every nonisomorphic tree type",
            "known_unlabeled_forest_counts_checked": True,
            "known_counts": {str(key): value for key, value in KNOWN_FOREST_COUNTS.items() if 2 <= key <= 14},
            "every_edge_checked": True,
        },
        "scope": (
            "Complete finite adjacent-mark census only. No extrapolation and no "
            "claim about M5+3*C5, g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "unlabeled_forests": total_forests,
        "adjacent_mark_cells": total_edges,
        "global_minimum": global_bucket["minimum"],
        "global_smallest_positive": global_bucket["smallest_positive"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
