#!/usr/bin/env python3
"""Prove the coupled ordinary FML gap on the rank-four top collar.

At r=4 and r=alpha(W)+2 one has alpha(W)=2.  Since W is a forest,
|W|<=2 alpha(W)=4, so D=C_E has at most six vertices after restoring the
two marks.  This turns the theorem into a finite exact classification.

The verifier enumerates every unlabeled forest D of orders two through six,
every marked pair with alpha(D-{u,v})=2, and every possible neighbor set of
the deleted support s that reconstructs a forest after adjoining s and its
leaf z.  Literal independent-subset enumeration then checks the original
and compact formulas with exact integers.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from verify_iso_compact_ordinary_allrank_split_counterexample_root import (
    graph6,
    independence_polynomial,
    ordinary_cell,
    rcoefficient,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_top_collar_r4_exact_root_20260829.json"
RANK = 4


def source_paired(cell: dict) -> tuple[int, int]:
    C = cell["C_rows"]
    curvature = 2 * (
        rcoefficient(C, RANK - 1, RANK - 1)
        - rcoefficient(C, RANK - 2, RANK)
    )
    isolate = cell["adjacent_N"] + curvature
    cross = cell["nested_N_polar"] + cell["B_piece"] - curvature
    assert isolate + cross == cell["full_gap"]
    return isolate, cross


def bucket() -> dict:
    return {"minimum": None, "zero": 0, "negative": 0}


def update(target: dict, value: int, witness: dict) -> None:
    if value == 0:
        target["zero"] += 1
    if value < 0:
        target["negative"] += 1
    if target["minimum"] is None or value < target["minimum"]["value"]:
        target["minimum"] = {"value": value, **witness}


def main() -> None:
    stats = {name: bucket() for name in ("A", "B", "isolate", "cross", "full_gap")}
    totals = {"D_forests": 0, "marked_cores": 0, "reconstructed_cells": 0}
    by_order = {}

    for order in range(2, 7):
        local = {"D_forests": 0, "marked_cores": 0, "reconstructed_cells": 0}
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            D = nx.convert_node_labels_to_integers(graph0)
            vertices = tuple(D)
            local["D_forests"] += 1
            for u, v in itertools.combinations(vertices, 2):
                W = D.copy()
                W.remove_nodes_from((u, v))
                if len(independence_polynomial(W)) - 1 != 2:
                    continue
                # A forest is bipartite, so alpha(W)>=|W|/2.  This is also
                # checked directly for every retained core.
                assert len(W) <= 4
                local["marked_cores"] += 1

                # Reconstruct every possible B by adjoining the support s,
                # its ordinary leaf z, and an arbitrary support-neighbor set
                # T in D.  Filtering on acyclicity is exactly the forest rule.
                for mask in range(1 << order):
                    B = D.copy()
                    support = order
                    leaf = order + 1
                    B.add_edge(support, leaf)
                    support_neighbors = [
                        vertex for vertex in vertices if (mask >> vertex) & 1
                    ]
                    B.add_edges_from((support, vertex) for vertex in support_neighbors)
                    if not nx.is_forest(B):
                        continue

                    cell = ordinary_cell(B, u, v, leaf, RANK)
                    assert cell["support"] == support
                    assert cell["alpha_W"] == 2
                    assert RANK == cell["alpha_W"] + 2
                    isolate, cross = source_paired(cell)
                    values = {
                        "A": cell["A_piece"],
                        "B": cell["B_piece"],
                        "isolate": isolate,
                        "cross": cross,
                        "full_gap": cell["full_gap"],
                    }
                    witness = {
                        "D_order": order,
                        "D_graph6": graph6(D),
                        "D_edges": list(D.edges()),
                        "u": u,
                        "v": v,
                        "support_neighbors": support_neighbors,
                    }
                    for name, value in values.items():
                        update(stats[name], value, witness)
                        assert value >= 0
                    local["reconstructed_cells"] += 1

        by_order[str(order)] = local
        for name in totals:
            totals[name] += local[name]

    assert totals == {
        "D_forests": 41,
        "marked_cores": 129,
        "reconstructed_cells": 1453,
    }
    expected_minima = {
        "A": 120,
        "B": 0,
        "isolate": 68,
        "cross": 4,
        "full_gap": 126,
    }
    assert {name: item["minimum"]["value"] for name, item in stats.items()} == expected_minima
    assert all(item["negative"] == 0 for item in stats.values())

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R4",
        "normalization": "All displayed gaps are in doubled diagonal units.",
        "theorem": (
            "For every ordinary unmarked leaf cell in a marked forest, if "
            "r=4=alpha(W)+2, then the coupled compact gap G_4=A_4+B_4 is "
            "at least 126, hence positive."
        ),
        "finite_reduction": {
            "top_collar": "r=4=alpha(W)+2 implies alpha(W)=2",
            "forest_bound": "|W|<=2 alpha(W)=4 by bipartiteness",
            "core_bound": "D=W plus the two marks, so |D|<=6",
            "reconstruction": (
                "Every original B is obtained from D by adjoining support s, "
                "leaf z, and a subset T of D adjacent to s; retaining exactly "
                "the acyclic reconstructions is equivalent to B being a forest."
            ),
        },
        "exhaustive_classification": {
            **totals,
            "by_D_order": by_order,
            "enumeration": (
                "Every unlabeled D forest in the NetworkX graph atlas through "
                "order six, every marked pair with alpha(W)=2, and all 2^|D| "
                "support-neighbor subsets filtered exactly by acyclicity."
            ),
        },
        "component_statistics": stats,
        "important_scope_boundary": (
            "This is an all-forest theorem for the single boundary layer "
            "r=4=alpha(W)+2. It does not cover rank four when alpha(W)>=3, "
            "any rank r>=5, or the full conjecture."
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
