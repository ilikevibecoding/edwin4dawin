#!/usr/bin/env python3
"""Prove the high-motif payment in deepest-ordinary bundle coefficient g1.

The exact g1 configuration form contains the only rank-five forest motifs in

  2(n-4) R3 + 5 Q35 - 5 R4
  + (5n-4)(R3(G-u)+R3(G-v)) + 5 R3(G-p).

Here R3 counts connected 3-edge subtrees on four vertices, Q35 counts
3-edge subsets spanning five vertices, and R4 counts connected 4-edge
subtrees on five vertices.  This file proves the displayed payment is
nonnegative (indeed at least 3 R4) for every forest.  The residual g1 form
remains open.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY_SOURCE = HERE / "derive_iso_n4_bundle_g1_deepest_configuration_agent.py"
DEPENDENCY_REPORT = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"


def edge_subsets(graph, size):
    return tuple(frozenset(chosen) for chosen in itertools.combinations(tuple(graph.edges()), size))


def vertices(edges):
    return set(itertools.chain.from_iterable(edges))


def connected_edge_set(edges):
    test = nx.Graph()
    test.add_edges_from(edges)
    return bool(test) and nx.is_connected(test)


def motif_counts(graph):
    r3_sets = tuple(
        chosen
        for chosen in edge_subsets(graph, 3)
        if len(vertices(chosen)) == 4 and connected_edge_set(chosen)
    )
    q35_sets = tuple(
        chosen for chosen in edge_subsets(graph, 3) if len(vertices(chosen)) == 5
    )
    r4_sets = tuple(
        chosen
        for chosen in edge_subsets(graph, 4)
        if len(vertices(chosen)) == 5 and connected_edge_set(chosen)
    )
    containments = sum(int(a < b) for a in r3_sets for b in r4_sets)
    leaf_sum = 0
    internal_sum = 0
    produced_q35 = set()
    for tree_edges in r4_sets:
        tree = nx.Graph()
        tree.add_edges_from(tree_edges)
        leaves = sum(int(tree.degree(vertex) == 1) for vertex in tree)
        leaf_sum += leaves
        internal_sum += 4 - leaves
        for removed in tree_edges:
            remainder = frozenset(edge for edge in tree_edges if edge != removed)
            if len(vertices(remainder)) == 5:
                produced_q35.add(remainder)
    return {
        "R3": len(r3_sets),
        "Q35": len(q35_sets),
        "R4": len(r4_sets),
        "containments": containments,
        "leaf_sum": leaf_sum,
        "internal_edge_sum": internal_sum,
        "produced_Q35": len(produced_q35),
    }


def finite_replay(max_tree_order):
    graphs = 0
    minimum_margin = None
    minimum_record = None
    for order in range(1, max_tree_order + 1):
        candidates = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        for graph0 in candidates:
            graph = nx.convert_node_labels_to_integers(graph0)
            counts = motif_counts(graph)
            margin = (
                2 * (order - 4) * counts["R3"]
                + 5 * counts["Q35"]
                - 5 * counts["R4"]
            )
            assert counts["containments"] == counts["leaf_sum"]
            assert counts["containments"] <= max(order - 4, 0) * counts["R3"]
            assert counts["produced_Q35"] == counts["internal_edge_sum"]
            assert counts["produced_Q35"] <= counts["Q35"]
            assert margin >= 3 * counts["R4"]
            record = {
                "order": order,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "margin": margin,
                **counts,
            }
            if minimum_margin is None or margin < minimum_margin:
                minimum_margin = margin
                minimum_record = record
            graphs += 1
    return {
        "scope": "finite exact replay on nonisomorphic connected trees only",
        "tree_orders": [1, max_tree_order],
        "tree_count": graphs,
        "minimum_record": minimum_record,
    }


def main():
    dependency = json.loads(DEPENDENCY_REPORT.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"
    n = sp.symbols("n")
    r3, ru, rv, q35, r4, dr3 = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V "
        "C_three_edge_five C_connected4_E D_connected3_E"
    )
    expected = sp.expand(
        2 * (n - 4) * r3
        + 5 * q35
        - 5 * r4
        + (5 * n - 4) * (ru + rv)
        + 5 * dr3
    )
    recorded = sp.sympify(dependency["motif_part"])
    assert sp.expand(expected - recorded) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT",
        "theorem": (
            "For every forest G on n vertices, 2(n-4)R3(G)+5Q35(G)-"
            "5R4(G)>=3R4(G)>=0. Hence the complete high-motif part of "
            "deepest-ordinary g1 is nonnegative."
        ),
        "proof": {
            "containment_count": (
                "Let P count containments A subset B with A a connected 3-edge "
                "subtree and B a connected 4-edge subtree. Every A has at most "
                "n-4 one-edge extensions in a forest, so P<=(n-4)R3."
            ),
            "leaf_count": (
                "For each five-vertex tree B with L(B) leaves, exactly L(B) "
                "edge deletions leave a connected 3-edge subtree; hence P=sum_B L(B)."
            ),
            "internal_count": (
                "Deleting any of the 4-L(B) internal edges yields a 3-edge "
                "subset spanning all five vertices. A forest has at most one "
                "edge joining two fixed components, so these outputs are unique; "
                "Q35>=sum_B(4-L(B))."
            ),
            "payment": (
                "2(n-4)R3+5Q35-5R4 >= sum_B[2L+5(4-L)-5] "
                "=sum_B(15-3L)>=3R4 because 2<=L<=4."
            ),
            "remaining_terms": (
                "(5n-4)(R3(G-u)+R3(G-v))+5R3(G-p) are nonnegative."
            ),
        },
        "exact_match_to_g1_configuration": True,
        "finite_replay": finite_replay(12),
        "scope": (
            "Universal theorem for one exact subpayment in deepest-ordinary g1. "
            "It does not prove the residual g1 form, arbitrary support cells, "
            "all N4, or Erdos Problem 993."
        ),
        "dependency": {
            "source": DEPENDENCY_SOURCE.name,
            "source_sha256": hashlib.sha256(DEPENDENCY_SOURCE.read_bytes()).hexdigest().upper(),
            "report": DEPENDENCY_REPORT.name,
            "report_sha256": hashlib.sha256(DEPENDENCY_REPORT.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
