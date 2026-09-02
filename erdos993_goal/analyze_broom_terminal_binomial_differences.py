#!/usr/bin/env python3
"""Audit binomial positivity of the broom/path terminal decorations."""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from analyze_deepest_support_leaf_bundle_differences import (
    forward_coefficients,
)
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def broom(
    path_length: int,
    root_leaves: int = 0,
    support_leaves: int = 0,
    isolates: int = 0,
) -> tuple[nx.Graph, int, int]:
    """Build v--...--s with the three indicated decorations."""
    graph = nx.path_graph(path_length + 1)
    root = 0
    support = path_length
    next_vertex = path_length + 1
    for _ in range(root_leaves):
        graph.add_edge(root, next_vertex)
        next_vertex += 1
    for _ in range(support_leaves):
        graph.add_edge(support, next_vertex)
        next_vertex += 1
    for _ in range(isolates):
        graph.add_node(next_vertex)
        next_vertex += 1
    return graph, root, support


def grouped(
    graph: nx.Graph, root: int, support: int, q: int
) -> dict[str, int]:
    blocks = recursive_blocks_fast(graph, root, support, q)
    return {
        "shadow_phi": (
            blocks["root"] + blocks["phi"] + blocks["mass"]
        ),
        "component_square": blocks["psi"] + blocks["chi"],
        "total": sum(blocks.values()),
    }


def main() -> None:
    checked = 0
    failures: list[dict] = []
    degree_bound_by_rank = {}
    for path_length in range(1, 11):
        for q in range(4, 10):
            bound = 2 * q + 6
            degree_bound_by_rank[str(q)] = bound
            for parameter in (
                "root_leaves",
                "support_leaves",
                "isolates",
            ):
                sequences = {
                    "shadow_phi": [],
                    "component_square": [],
                    "total": [],
                }
                for value in range(bound + 1):
                    kwargs = {parameter: value}
                    graph, root, support = broom(
                        path_length, **kwargs
                    )
                    values = grouped(graph, root, support, q)
                    for name in sequences:
                        sequences[name].append(values[name])
                for block, values in sequences.items():
                    for difference_order, coefficient in enumerate(
                        forward_coefficients(values)
                    ):
                        checked += 1
                        if coefficient < 0:
                            failures.append(
                                {
                                    "path_length": path_length,
                                    "rank_q": q,
                                    "parameter": parameter,
                                    "block": block,
                                    "difference_order": difference_order,
                                    "coefficient": coefficient,
                                }
                            )
    report = {
        "status": (
            "PASS_BROOM_TERMINAL_UNIVARIATE_BINOMIAL_POSITIVITY"
            if not failures
            else "FAIL_BROOM_TERMINAL_UNIVARIATE_BINOMIAL_POSITIVITY"
        ),
        "maximum_path_length": 10,
        "ranks": "4..9",
        "degree_bounds": degree_bound_by_rank,
        "parameters": [
            "root_leaves",
            "support_leaves",
            "isolates",
        ],
        "checked_coefficients": checked,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": (
            "Separate univariate binomial positivity does not by "
            "itself prove multivariate coefficient positivity."
        ),
    }
    Path(
        "broom_terminal_binomial_differences_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
