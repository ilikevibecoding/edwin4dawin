#!/usr/bin/env python3
"""Complete finite census for nonadjacent-mark rank-five no-parent g2.

For distinct nonadjacent marks u,v in a forest G, put

    A = G-u-v,
    B = G-({u} union N[v]),
    C = G-({v} union N[u]),
    D = G-(N[u] union N[v]).

Then g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D).  This source
enumerates every unlabeled forest of order 2 through 14 and every unordered
nonedge, and independently reconstructs g2 from the four raw rows.  It is a
finite certificate only.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt import (
    KNOWN_FOREST_COUNTS,
    a2,
    forest_graphs,
    k2,
    l2,
    raw_g2,
    update_minimum,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_nonadjacent_all_forest_finite_census_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_FINITE_ISO_N5_G2_NONADJACENT_ALL_FOREST_RANK5_G2_ALT"


def main() -> None:
    rows: dict[str, dict] = {}
    global_bucket = {"checks": 0, "zero": 0, "minimum": None, "smallest_positive": None}
    total_forests = 0
    total_cells = 0
    ordered_digest = hashlib.sha256()

    for order in range(2, 15):
        forest_count = 0
        cell_count = 0
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
            for u, v in itertools.combinations(graph.nodes(), 2):
                if graph.has_edge(u, v):
                    continue
                cell_count += 1
                a = row((u, v))
                closed_u = {u, *graph.neighbors(u)}
                closed_v = {v, *graph.neighbors(v)}
                b = row({u, *closed_v})
                c = row({v, *closed_u})
                d = row(closed_u | closed_v)
                partition_value = (
                    a2(a) + l2(a, b) + l2(a, c) + k2(b, c) + k2(a, d)
                )
                raw_value = raw_g2((e, row((u,)), row((v,)), a))
                assert partition_value == raw_value, (
                    "partition mismatch", order, forest_index, u, v,
                    partition_value, raw_value,
                )
                assert raw_value >= 0, (
                    "negative nonadjacent g2", order, forest_index, u, v, raw_value,
                )
                witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": graph6,
                    "nonedge": [int(u), int(v)],
                }
                update_minimum(bucket, raw_value, witness)
                update_minimum(global_bucket, raw_value, witness)
                ordered_digest.update(
                    f"{order}|{forest_index}|{graph6}|{u}|{v}|{raw_value};".encode()
                )

        assert forest_count == KNOWN_FOREST_COUNTS[order], (
            order, forest_count, KNOWN_FOREST_COUNTS[order]
        )
        assert cell_count == bucket["checks"]
        total_forests += forest_count
        total_cells += cell_count
        rows[str(order)] = {
            "unlabeled_forests": forest_count,
            "nonadjacent_mark_cells": cell_count,
            "zero_cells": bucket["zero"],
            "minimum": bucket["minimum"],
            "smallest_positive": bucket["smallest_positive"],
        }
        print(json.dumps({"order": order, **rows[str(order)]}, sort_keys=True), flush=True)

    assert total_cells == global_bucket["checks"]
    report = {
        "marker": MARKER,
        "theorem": (
            "No-parent g2 is nonnegative for every nonadjacent-mark cell in every "
            "unlabeled forest of order 2 through 14."
        ),
        "orders": [2, 14],
        "unlabeled_forests": total_forests,
        "nonadjacent_mark_cells": total_cells,
        "global_zero_cells": global_bucket["zero"],
        "global_minimum": global_bucket["minimum"],
        "global_smallest_positive": global_bucket["smallest_positive"],
        "ordered_cell_stream_sha256": ordered_digest.hexdigest().upper(),
        "rows": rows,
        "algebra": {
            "occupation_rows": (
                "W=A, U=A+xB, V=A+xC, E=A+xB+xC+x^2D"
            ),
            "partition": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)",
            "raw_reconstruction_terms": 42,
            "raw_reconstruction_checked_cellwise": True,
        },
        "completeness": {
            "generation": "nondecreasing multisets of every nonisomorphic tree type",
            "known_unlabeled_forest_counts_checked": True,
            "every_unordered_nonedge_checked": True,
        },
        "dependencies_sha256": {
            "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py": hashlib.sha256(
                (HERE / "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py").read_bytes()
            ).hexdigest().upper(),
        },
        "scope": (
            "Complete finite nonadjacent-mark census only. No extrapolation and no "
            "claim about all-order g2, all N5, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "unlabeled_forests": total_forests,
        "nonadjacent_mark_cells": total_cells,
        "global_minimum": global_bucket["minimum"],
        "global_smallest_positive": global_bucket["smallest_positive"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
