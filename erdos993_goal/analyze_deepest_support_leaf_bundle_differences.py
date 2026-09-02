#!/usr/bin/env python3
"""Audit binomial-basis coefficients in a deepest-support leaf bundle.

Fix a rooted core tree in which ``s`` is a deepest leaf.  Attach d
ordinary leaf children to s, then evaluate the recursive Theta-core
gap for attaching one more child.  For fixed rank every block is a
polynomial in d.  Its forward differences at d=0 are its coefficients
in the binomial basis C(d,k).  Nonnegative coefficients would reduce
the deepest-support case to finitely many lower-link inequalities.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def add_leaf_bundle(
    core: nx.Graph, support: int, count: int
) -> nx.Graph:
    graph = core.copy()
    next_vertex = max(graph, default=-1) + 1
    for offset in range(count):
        graph.add_edge(support, next_vertex + offset)
    return graph


def forward_coefficients(values: list[int]) -> list[int]:
    result = []
    row = values[:]
    while row:
        result.append(row[0])
        row = [
            row[index + 1] - row[index]
            for index in range(len(row) - 1)
        ]
    return result


def main() -> None:
    checks = 0
    negative: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        "shadow_phi": None,
        "component_square": None,
        "total": None,
    }
    corpus_counts: dict[str, int] = {}

    def audit_core(core0: nx.Graph, family: str) -> None:
        nonlocal checks
        core = nx.convert_node_labels_to_integers(core0)
        order = len(core)
        code = nx.to_graph6_bytes(
            core, header=False
        ).decode("ascii").strip()
        corpus_counts[family] = corpus_counts.get(family, 0) + 1
        for root in core:
            distances = nx.single_source_shortest_path_length(core, root)
            maximum_distance = max(distances.values())
            if maximum_distance == 0:
                continue
            for support in [
                vertex
                for vertex in distances
                if core.degree(vertex) == 1
                and distances[vertex] == maximum_distance
            ]:
                for q in range(4, min(order + 5, 10)):
                    degree_bound = 2 * q + 6
                    sequences = {
                        "shadow_phi": [],
                        "component_square": [],
                        "total": [],
                    }
                    for d in range(degree_bound + 1):
                        graph = add_leaf_bundle(core, support, d)
                        blocks = recursive_blocks_fast(
                            graph, root, support, q
                        )
                        sequences["shadow_phi"].append(
                            blocks["root"]
                            + blocks["phi"]
                            + blocks["mass"]
                        )
                        sequences["component_square"].append(
                            blocks["psi"] + blocks["chi"]
                        )
                        sequences["total"].append(sum(blocks.values()))
                    for name, values in sequences.items():
                        coefficients = forward_coefficients(values)
                        for difference_order, value in enumerate(
                            coefficients
                        ):
                            record = {
                                "family": family,
                                "core_order": order,
                                "graph6": code,
                                "root": root,
                                "support": support,
                                "rank_q": q,
                                "block": name,
                                "difference_order": difference_order,
                                "coefficient": value,
                            }
                            checks += 1
                            if (
                                minima[name] is None
                                or value < minima[name][0]
                            ):
                                minima[name] = (value, record)
                            if value < 0:
                                negative.append(record)

    for order in range(3, 8):
        for tree in nx.nonisomorphic_trees(order):
            audit_core(tree, "connected_tree")
    for forest in nx.graph_atlas_g():
        if (
            3 <= len(forest) <= 7
            and nx.is_forest(forest)
            and not nx.is_connected(forest)
        ):
            audit_core(forest, "disconnected_atlas_forest")
    report = {
        "status": (
            "PASS_NONNEGATIVE_DEEPEST_BUNDLE_BINOMIAL_COEFFICIENTS"
            if not negative
            else "FAIL_NONNEGATIVE_DEEPEST_BUNDLE_BINOMIAL_COEFFICIENTS"
        ),
        "maximum_core_order": 7,
        "corpus_graph_counts": corpus_counts,
        "checked_coefficients": checks,
        "negative_count": len(negative),
        "first_negative_coefficients": negative[:30],
        "minima": {
            name: item[1] if item is not None else None
            for name, item in minima.items()
        },
        "warning": (
            "This is a structural diagnostic.  Even a clean finite "
            "result would not prove coefficient positivity for every "
            "inner rooted forest."
        ),
    }
    Path(
        "deepest_support_leaf_bundle_binomial_"
        "differences_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
