#!/usr/bin/env python3
"""Probe the compact ordinary FML split on the induction-closed rank domain.

The earlier compact census restricted to r<L(alpha(B)).  The cutoff audit
shows that the nonnegative leaf recurrence instead exposes ranks through
alpha(W)+2, where W is the four-minor row B-{u,v}.  This diagnostic checks the
same A/B split on exactly that larger supported domain.  It is finite evidence
and may produce route obstructions; it is not a positivity theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_compact_ordinary_component_signs_root import (
    add_rows,
    fresh,
    graph6,
    r_difference,
    recover_h,
    rows,
    update,
)
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_induction_domain_probe_root_20260829.json"


def audit(graph: nx.Graph, report: dict) -> None:
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

                four_minor_graph = lower_graph.copy()
                four_minor_graph.remove_nodes_from((u, v))
                w_alpha = len(poly_forest(four_minor_graph)) - 1
                for rank in range(2, w_alpha + 3):
                    adjacent = 2 * nested2(c_rows, rank - 1, rank)
                    nested_polar = (
                        nested2(sum_rows, rank - 1, rank - 1)
                        - nested2(h_rows, rank - 1, rank - 1)
                        - nested2(c_rows, rank - 1, rank - 1)
                    )
                    A = adjacent + nested_polar
                    B = r_difference(sum_rows, h_rows, rank)
                    full_gap = (
                        nested2(full_rows, rank, rank)
                        - nested2(a_rows, rank, rank)
                        - nested2(c_rows, rank - 1, rank - 1)
                    )
                    assert A + B == full_gap
                    witness = {
                        "order": len(graph),
                        "rank": rank,
                        "alpha_W": w_alpha,
                        "u": int(u),
                        "v": int(v),
                        "z": int(z),
                        "support": int(support),
                        "graph6": graph6(graph),
                    }
                    update(report["A"], A, witness)
                    update(report["B"], B, witness)
                    update(report["full"], full_gap, witness)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-tree-order", type=int, default=10)
    args = parser.parse_args()

    report = {
        "marker": "PROBE_EXACT_ISO_COMPACT_ORDINARY_INDUCTION_DOMAIN",
        "domain": "2<=r<=alpha(B-{z,s,u,v})+2",
        "A": fresh(),
        "B": fresh(),
        "full": fresh(),
        "scope": "Finite exact route diagnostic only; no all-order sign is claimed.",
    }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 4 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            forests += 1
    for n in range(8, args.max_tree_order + 1):
        for graph in nx.nonisomorphic_trees(n):
            audit(graph, report)
            forests += 1
    report["forests"] = forests
    report["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
