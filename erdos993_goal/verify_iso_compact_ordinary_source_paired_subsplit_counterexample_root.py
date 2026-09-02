#!/usr/bin/env python3
"""Freeze the smallest obstruction to the source-paired ordinary split.

The exact compensation identity writes the coupled ordinary gap as

    G_N(C,H)=L_N(C)+2 B_N(XC,XH).

This verifier shows that its second summand is not separately nonnegative:
an order-seven forest has cross=-112 at r=4, while the isolate reserve is
950 and the coupled gap is 838.  Every atlas forest of order at most six is
exhausted on the induction-closed collar to certify minimal order.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from verify_iso_compact_ordinary_allrank_split_counterexample_root import (
    graph6,
    ordinary_cell,
    rcoefficient,
)


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "iso_compact_ordinary_source_paired_subsplit_counterexample_exact_root_20260829.json"
)

WITNESS_EDGES = ((0, 1), (1, 2), (1, 4), (1, 5))
MARK_U = 3
MARK_V = 6
LEAF_Z = 0
RANK = 4


def source_paired(cell: dict, rank: int) -> tuple[int, int]:
    """Return (isolate reserve, X-cross) in doubled diagonal units."""
    C = cell["C_rows"]
    c_curvature = 2 * (
        rcoefficient(C, rank - 1, rank - 1)
        - rcoefficient(C, rank - 2, rank)
    )
    isolate = cell["adjacent_N"] + c_curvature
    cross = cell["nested_N_polar"] + cell["B_piece"] - c_curvature
    assert isolate + cross == cell["full_gap"]
    return isolate, cross


def minimal_order_census() -> dict:
    totals = {"forests": 0, "configurations": 0, "cells": 0}
    minima = {"isolate": None, "cross": None, "full_gap": None}
    negatives = {"isolate": 0, "cross": 0, "full_gap": 0}
    by_order = {}
    for order in range(4, 7):
        local = {"forests": 0, "configurations": 0, "cells": 0}
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            local["forests"] += 1
            vertices = tuple(graph)
            for z in [vertex for vertex in graph if graph.degree(vertex) == 1]:
                support = next(iter(graph.neighbors(z)))
                available = [x for x in vertices if x not in (z, support)]
                for index, u in enumerate(available):
                    for v in available[index + 1 :]:
                        probe = ordinary_cell(graph, u, v, z, 2)
                        local["configurations"] += 1
                        for rank in range(2, probe["alpha_W"] + 3):
                            cell = ordinary_cell(graph, u, v, z, rank)
                            isolate, cross = source_paired(cell, rank)
                            values = {
                                "isolate": isolate,
                                "cross": cross,
                                "full_gap": cell["full_gap"],
                            }
                            local["cells"] += 1
                            for name, value in values.items():
                                if minima[name] is None or value < minima[name]:
                                    minima[name] = value
                                if value < 0:
                                    negatives[name] += 1
                                assert value >= 0
        by_order[str(order)] = local
        for name in totals:
            totals[name] += local[name]
    return {
        **totals,
        "max_order": 6,
        "by_order": by_order,
        "minima": minima,
        "negative": negatives,
        "enumeration": (
            "Every unlabeled graph in the NetworkX graph atlas, restricted "
            "exactly to forests, every ordinary configuration, and every "
            "rank 2<=r<=alpha(W)+2."
        ),
    }


def main() -> None:
    witness = nx.Graph()
    witness.add_nodes_from(range(7))
    witness.add_edges_from(WITNESS_EDGES)
    assert nx.is_forest(witness)
    assert graph6(witness) == "FgP??"

    cell = ordinary_cell(witness, MARK_U, MARK_V, LEAF_Z, RANK)
    isolate, cross = source_paired(cell, RANK)
    assert cell["support"] == 1
    assert cell["alpha_W"] == 3
    assert cell["adjacent_N"] == 820
    assert cell["nested_N_polar"] == -80
    assert cell["A_piece"] == 740
    assert cell["B_piece"] == 98
    assert isolate == 950
    assert cross == -112
    assert cell["full_gap"] == 838

    census = minimal_order_census()
    assert census["forests"] == 36
    assert census["configurations"] == 487
    assert census["cells"] == 1263
    assert census["minima"] == {"isolate": 14, "cross": 4, "full_gap": 18}

    report = {
        "marker": (
            "PASS_EXACT_ISO_COMPACT_ORDINARY_SOURCE_PAIRED_SUBSPLIT_COUNTEREXAMPLE"
        ),
        "normalization": "All values are in doubled diagonal units.",
        "identity": "G_N(C,H)=L_N(C)+2 B_N(XC,XH)",
        "witness": {
            "order": 7,
            "graph6": graph6(witness),
            "vertices": list(range(7)),
            "edges": WITNESS_EDGES,
            "marks": {"u": MARK_U, "v": MARK_V},
            "ordinary_leaf": {"z": LEAF_Z, "support": cell["support"]},
            "rank": RANK,
            "alpha_W": cell["alpha_W"],
            "C_rows": {name: row for name, row in zip("EUVW", cell["C_rows"])},
            "H_rows": {name: row for name, row in zip("EUVW", cell["H_rows"])},
            "compact": {
                "adjacent_N": cell["adjacent_N"],
                "nested_N_polar": cell["nested_N_polar"],
                "A": cell["A_piece"],
                "B": cell["B_piece"],
            },
            "source_paired": {
                "isolate_reserve": isolate,
                "X_cross": cross,
                "full_gap": cell["full_gap"],
            },
        },
        "minimal_order_census": census,
        "obstruction": (
            "The X-cross term is not separately nonnegative, even at r=4. "
            "The isolate reserve and X-cross must remain coupled."
        ),
        "does_not_refute": (
            "The full coupled gap, the r=4 top-collar theorem, forest ISO, "
            "or Erdos Problem 993."
        ),
        "scope": (
            "Exact finite counterexample and exhaustive minimal-order census "
            "only."
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
