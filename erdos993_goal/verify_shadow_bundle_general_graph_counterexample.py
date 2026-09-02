#!/usr/bin/env python3
"""Certify a cyclic counterexample to graph-general shadow pruning.

At rank q=6, let the rooted core have a root v adjacent to a leaf s
and to an isolated vertex x of the inner graph.  The rest of the inner
graph is four disjoint copies of K_N.  The recursive shadow block for
attaching the first child to s is

    -N^6 (N^2-64N-64).

It is therefore negative first at N=65.  This does not affect the
forest conjecture; it proves that a successful switching proof must
use forest/sparsity structure rather than arbitrary graph minors.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import sympy as sp

from analyze_shadow_bundle_arbitrary_graphs import shadow_block


def construction(size: int) -> tuple[nx.Graph, int, int]:
    graph = nx.Graph()
    root, support, isolated_neighbor = 0, 1, 2
    graph.add_edges_from(
        [(root, support), (root, isolated_neighbor)]
    )
    next_vertex = 3
    for _ in range(4):
        clique = list(range(next_vertex, next_vertex + size))
        graph.add_edges_from(
            (left, right)
            for index, left in enumerate(clique)
            for right in clique[index + 1 :]
        )
        next_vertex += size
    return graph, root, support


def main() -> None:
    N = sp.symbols("N", integer=True, positive=True)
    q = 6
    # H=4K_N has i_4=N^4 and i_3=4N^3.  Adding the isolated
    # inner vertex x gives the three required levels of G.
    m = N**4 + 4 * N**3
    u = N**4
    k = 0
    a = N**4
    b = 0
    c = 0
    expression = sp.factor(
        -2 * a * k * q
        - a * k
        - 2 * a * q * u
        - 3 * a * u
        + 2 * b * m * q
        + b * m
        - 2 * b * u
        + 2 * c * m * q
        - c * m
        + 2 * k * m
        + 4 * m**2
        + 8 * m * u
        + 2 * u**2
    )
    expected = -N**6 * (N**2 - 64 * N - 64)
    assert sp.expand(expression - expected) == 0

    replays = []
    for size in (64, 65):
        graph, root, support = construction(size)
        direct = shadow_block(graph, root, support, q)
        formula = int(expected.subs(N, size))
        assert direct == formula
        replays.append(
            {
                "N": size,
                "graph_order": len(graph),
                "direct_shadow_cross": direct,
                "factored_formula": formula,
                "sign": (
                    1 if direct > 0 else (-1 if direct < 0 else 0)
                ),
            }
        )

    report = {
        "status": "PASS_GENERAL_GRAPH_SHADOW_COUNTEREXAMPLE",
        "rank_q": q,
        "family": (
            "root joined to support leaf s and an inner isolate x; "
            "inner remainder is 4 disjoint K_N"
        ),
        "factorization": str(expression),
        "first_negative_integer_parameter": 65,
        "first_counterexample_order": 3 + 4 * 65,
        "replays": replays,
        "scope": (
            "This refutes only a graph-general strengthening.  The "
            "construction is not a forest and does not refute the "
            "Erdos forest conjecture or the forest pruning target."
        ),
    }
    Path(
        "shadow_bundle_general_graph_counterexample_"
        "20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
