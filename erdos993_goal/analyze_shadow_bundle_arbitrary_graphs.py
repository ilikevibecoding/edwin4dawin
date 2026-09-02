#!/usr/bin/env python3
"""Test deepest-bundle shadow positivity beyond forests.

Only the shadow block is used here, so the computation makes sense
for arbitrary graphs.  If binomial-basis positivity persists for
cyclic cores, the likely proof should use independence-polynomial
minor structure rather than acyclicity.
"""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

import networkx as nx

from analyze_deepest_support_leaf_bundle_differences import (
    add_leaf_bundle,
    forward_coefficients,
)


def truncated_independence_counter(
    graph: nx.Graph, maximum_rank: int
):
    vertices = sorted(graph)
    index = {vertex: position for position, vertex in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for vertex in vertices:
        mask = 0
        for neighbor in graph[vertex]:
            mask |= 1 << index[neighbor]
        adjacency[index[vertex]] = mask

    @functools.lru_cache(maxsize=None)
    def polynomial(alive: int) -> tuple[int, ...]:
        if not alive:
            return (1,) + (0,) * maximum_rank
        edge_found = False
        chosen = -1
        best_degree = -1
        scan = alive
        while scan:
            bit = scan & -scan
            vertex = bit.bit_length() - 1
            degree = (adjacency[vertex] & alive).bit_count()
            if degree:
                edge_found = True
            if degree > best_degree:
                best_degree = degree
                chosen = vertex
            scan -= bit
        if not edge_found:
            order = alive.bit_count()
            return tuple(
                math.comb(order, rank)
                if rank <= order
                else 0
                for rank in range(maximum_rank + 1)
            )
        absent = polynomial(alive & ~(1 << chosen))
        selected = polynomial(
            alive & ~(1 << chosen) & ~adjacency[chosen]
        )
        return tuple(
            absent[rank]
            + (selected[rank - 1] if rank else 0)
            for rank in range(maximum_rank + 1)
        )

    def counts(removed: set[int]) -> tuple[int, ...]:
        alive = (1 << len(vertices)) - 1
        for vertex in removed:
            alive &= ~(1 << index[vertex])
        return polynomial(alive)

    return counts


def shadow_block(
    graph: nx.Graph, root: int, support: int, q: int
) -> int:
    counts = truncated_independence_counter(graph, q)
    root_closed = {root} | set(graph[root])
    J = counts({root})
    R = counts(root_closed)
    K = counts({root, support})
    lower = graph.subgraph(set(graph) - {support})
    lower_root_closed = {root} | set(lower[root])
    Rlower = counts(lower_root_closed | {support})
    M, X = J[q - 1], J[q]
    r, t = R[q - 1], R[q]
    m, k = K[q - 2], K[q - 1]
    a, b = Rlower[q - 2], Rlower[q - 1]
    return (
        4 * M * m
        + 2 * M * k
        + 2 * X * m
        - 2 * a * k
        + (2 * q - 1) * (M * b + m * t)
        + 2 * b * m
        - (2 * q + 1) * (X * a + k * r)
    )


def main() -> None:
    checked_graphs = checked_coefficients = 0
    failures: list[dict] = []
    for graph0 in nx.graph_atlas_g():
        if (
            len(graph0) < 3
            or len(graph0) > 7
            or not nx.is_connected(graph0)
            or nx.is_forest(graph0)
        ):
            continue
        core = nx.convert_node_labels_to_integers(graph0)
        leaves = [
            vertex for vertex in core if core.degree(vertex) == 1
        ]
        if not leaves:
            continue
        checked_graphs += 1
        code = nx.to_graph6_bytes(
            core, header=False
        ).decode("ascii").strip()
        for root in core:
            for support in [
                leaf
                for leaf in leaves
                if leaf != root
            ]:
                for q in range(4, 9):
                    values = [
                        shadow_block(
                            add_leaf_bundle(core, support, d),
                            root,
                            support,
                            q,
                        )
                        for d in range(2 * q + 7)
                    ]
                    coefficients = forward_coefficients(values)
                    checked_coefficients += len(coefficients)
                    for order, value in enumerate(coefficients):
                        if value < 0:
                            failures.append(
                                {
                                    "graph6": code,
                                    "core_order": len(core),
                                    "root": root,
                                    "support": support,
                                    "rank_q": q,
                                    "difference_order": order,
                                    "coefficient": value,
                                }
                            )
                            if len(failures) >= 30:
                                break
                    if len(failures) >= 30:
                        break
                if len(failures) >= 30:
                    break
            if len(failures) >= 30:
                break
        if len(failures) >= 30:
            break
    report = {
        "status": (
            "PASS_CYCLIC_CORE_SHADOW_BINOMIAL_POSITIVITY"
            if not failures
            else "FAIL_CYCLIC_CORE_SHADOW_BINOMIAL_POSITIVITY"
        ),
        "maximum_atlas_order": 7,
        "checked_cyclic_core_graphs": checked_graphs,
        "checked_coefficients": checked_coefficients,
        "support_scope": "every nonroot leaf of each cyclic core",
        "failure_count": len(failures),
        "failures": failures,
        "interpretation": (
            "A clean result would indicate that the shadow block's "
            "bundle positivity is not forest-specific."
        ),
    }
    Path(
        "shadow_bundle_arbitrary_graphs_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
