#!/usr/bin/env python3
"""Certify a bipartite counterexample to graph-general shadow pruning.

Use the Bhattacharyya--Kahn graph G(a,b): V1 has b-a vertices,
V2 and V3 each have a vertices, V1--V2 is complete bipartite, and
V2--V3 is a perfect matching.  Add a root adjacent to all of V1 and
to a support leaf s.  For the first child attached to s, the recursive
shadow cross is negative at (a,b,q)=(22,31,23).

The construction is bipartite but cyclic, so this does not affect the
forest target.  It shows that acyclicity, not only bipartiteness, is
needed in the shadow-block proof.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import networkx as nx


def inner_count(a: int, b: int, rank: int) -> int:
    if not 0 <= rank <= b:
        return 0
    return (
        (2**rank - 1) * math.comb(a, rank)
        + math.comb(b, rank)
    )


def matching_count(a: int, rank: int) -> int:
    if not 0 <= rank <= a:
        return 0
    return 2**rank * math.comb(a, rank)


def shadow_cross(a: int, b: int, q: int) -> int:
    m = inner_count(a, b, q - 2)
    k_lower = inner_count(a, b, q - 1)
    M = k_lower + m
    X = inner_count(a, b, q) + k_lower
    a_lower = matching_count(a, q - 2)
    b_lower = matching_count(a, q - 1)
    r = b_lower
    t = matching_count(a, q)
    return (
        4 * M * m
        + 2 * M * k_lower
        + 2 * X * m
        - 2 * a_lower * k_lower
        + (2 * q - 1) * (M * b_lower + m * t)
        + 2 * b_lower * m
        - (2 * q + 1) * (X * a_lower + k_lower * r)
    )


def construction(a: int, b: int) -> tuple[nx.Graph, int, int]:
    graph = nx.Graph()
    root, support = 0, 1
    graph.add_edge(root, support)
    v1 = list(range(2, 2 + b - a))
    v2 = list(range(2 + b - a, 2 + b))
    v3 = list(range(2 + b, 2 + b + a))
    graph.add_edges_from((root, vertex) for vertex in v1)
    graph.add_edges_from(
        (left, right) for left in v1 for right in v2
    )
    graph.add_edges_from(zip(v2, v3))
    return graph, root, support


def main() -> None:
    witness = (22, 31, 23)
    a, b, q = witness
    value = shadow_cross(a, b, q)
    assert value == -1533040468272654

    graph, root, support = construction(a, b)
    assert len(graph) == a + b + 2 == 55
    assert nx.is_bipartite(graph)
    assert graph.degree(support) == 1
    assert next(iter(graph[support])) == root

    smaller_failures = []
    threshold_hits = []
    for test_a in range(1, 54):
        for test_b in range(test_a + 1, 54):
            order = test_a + test_b + 2
            if order > 55:
                continue
            for test_q in range(4, test_b + 2):
                test_value = shadow_cross(test_a, test_b, test_q)
                if test_value < 0:
                    record = {
                        "order": order,
                        "a": test_a,
                        "b": test_b,
                        "rank_q": test_q,
                        "shadow_cross": test_value,
                    }
                    threshold_hits.append(record)
                    if order < 55:
                        smaller_failures.append(record)
    assert not smaller_failures
    assert threshold_hits == [
        {
            "order": 55,
            "a": 22,
            "b": 31,
            "rank_q": 23,
            "shadow_cross": value,
        }
    ]

    report = {
        "status": "PASS_BIPARTITE_SHADOW_COUNTEREXAMPLE",
        "parameters": {"a": a, "b": b, "rank_q": q},
        "graph_order": len(graph),
        "graph_is_bipartite": True,
        "shadow_cross_A_over_4": value,
        "grouped_shadow_block_A": 4 * value,
        "minimality_within_Bhattacharyya_Kahn_family": {
            "checked_all_parameters_with_order_at_most": 55,
            "negative_instances": threshold_hits,
        },
        "coefficient_formula": (
            "i_t(G(a,b))=(2^t-1)C(a,t)+C(b,t); "
            "i_t(G(a,b)-V1)=2^t C(a,t)"
        ),
        "scope": (
            "This refutes a bipartite-graph strengthening of the "
            "shadow pruning block.  The graph contains cycles and "
            "does not refute the forest target."
        ),
    }
    Path(
        "shadow_bundle_bipartite_counterexample_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
