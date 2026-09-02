#!/usr/bin/env python3
"""Exact obstruction to using the tree CS4 margin on the whole forest G.

The proved rank-four component-surplus theorem applies to a connected tree.
This file tests the formally identical global expression on forests and gives
an infinite exact counterfamily.  It does not refute the tree theorem, the g1
claim, or a future componentwise/convolution-weighted use of that theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    at,
    independent_poly_bruteforce,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank4_component_surplus_forest_extension_obstruction_bundle_g1_agent_20260829.json"


def one_edge_five_sets(graph):
    return sum(
        graph.subgraph(chosen).number_of_edges() == 1
        for chosen in itertools.combinations(graph.nodes(), 5)
    )


def margin(graph):
    n = len(graph)
    edges = graph.number_of_edges()
    wedges = sum(comb(degree, 2) for _, degree in graph.degree())
    matching2 = comb(edges, 2) - wedges
    i4 = at(independent_poly_bruteforce(graph), 4)
    s4 = one_edge_five_sets(graph)
    width = comb(n - 2, 2) if n >= 4 else 0
    return {
        "value": 4 * matching2 * i4 - width * s4,
        "n": n,
        "edges": edges,
        "m2": matching2,
        "i4": i4,
        "s4": s4,
        "width": width,
    }


def main():
    # Infinite family F_k=K2 disjoint union k isolated vertices.
    family_checks = []
    for isolates in range(3, 11):
        graph = nx.disjoint_union(nx.path_graph(2), nx.empty_graph(isolates))
        result = margin(graph)
        expected_s4 = comb(isolates, 3)
        expected_width = comb(isolates, 2)
        expected_margin = -expected_width * expected_s4
        assert result["m2"] == 0
        assert result["s4"] == expected_s4
        assert result["width"] == expected_width
        assert result["value"] == expected_margin < 0
        family_checks.append({"isolates_k": isolates, **result})

    negative = []
    total_forests = 0
    by_order = {}
    for order in range(3, 8):
        local_forests = 0
        local_negative = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            result = margin(graph)
            if result["value"] < 0:
                record = {
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "component_orders": sorted(map(len, nx.connected_components(graph))),
                    **result,
                }
                negative.append(record)
                local_negative += 1
            total_forests += 1
            local_forests += 1
        by_order[str(order)] = {
            "forests": local_forests,
            "negative_global_margins": local_negative,
        }
    first_negative = min(negative, key=lambda row: (row["n"], row["value"]))
    minimum = min(negative, key=lambda row: row["value"])

    report = {
        "marker": "EXACT_OBSTRUCTION_RANK4_COMPONENT_SURPLUS_GLOBAL_FOREST_EXTENSION_BUNDLE_G1_AGENT",
        "counterfamily": {
            "forest": "F_k=K2 disjoint_union k K1, k>=3",
            "parameters": "n=k+2, m2=0, s4=C(k,3), W=C(k,2)",
            "margin": "4*m2*i4-W*s4=-C(k,2)*C(k,3)<0",
            "sample_checks": family_checks,
        },
        "smallest_counterexample": first_negative,
        "finite_atlas_diagnostic": {
            "scope": "All graph-atlas forests of orders 3..7.",
            "forests": total_forests,
            "negative": len(negative),
            "minimum": minimum,
            "by_order": by_order,
        },
        "interpretation": (
            "The connected-tree CS4 theorem cannot be applied unchanged to a "
            "disconnected support-deleted forest G. This does not obstruct a "
            "componentwise theorem with the correct isolate/convolution weights; "
            "it also does not produce a negative g1 residual."
        ),
        "scope": "Exact obstruction to one relaxation only, not a counterexample to g1.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "counterfamily": report["counterfamily"]["margin"],
        "smallest_counterexample": first_negative,
        "finite_atlas_diagnostic": {
            key: value for key, value in report["finite_atlas_diagnostic"].items()
            if key != "by_order"
        },
        "interpretation": report["interpretation"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
