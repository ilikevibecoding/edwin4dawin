#!/usr/bin/env python3
"""Independent exact replay of the false leaf-majority OLC candidate."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx

from hit_curvature_reserve_stress import degree_two_broom, planted_state


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    graph = degree_two_broom()
    attachment = 2
    assert graph.degree(attachment) == 2
    first_new_vertex = len(graph)
    for offset in range(6):
        graph.add_edge(attachment, first_new_vertex + offset)

    assert nx.is_tree(graph)
    leaves = sum(degree == 1 for _, degree in graph.degree())
    nonleaves = len(graph) - leaves
    assert leaves == 18
    assert nonleaves == 16

    polynomial = planted_state(graph, 0, None, {}).t
    expected = [
        1,
        34,
        528,
        5000,
        32513,
        154912,
        563099,
        1603733,
        3642922,
        6674810,
        9924127,
        11987433,
        11722535,
        9202113,
        5715687,
        2747111,
        987051,
        250659,
        40642,
        3357,
        58,
        1,
    ]
    assert polynomial == expected

    k = 20
    ordinary_gap = (
        polynomial[k] * polynomial[k]
        - polynomial[k - 1] * polynomial[k + 1]
    )
    ordered_gap = (
        k * polynomial[k] * polynomial[k]
        - (k + 1) * polynomial[k - 1] * polynomial[k + 1]
    )
    assert ordinary_gap == 7
    assert ordered_gap == -3217

    first_descent = next(
        (
            rank
            for rank in range(len(polynomial) - 1)
            if polynomial[rank + 1] < polynomial[rank]
        ),
        None,
    )
    assert first_descent is not None
    assert all(
        polynomial[rank + 1] <= polynomial[rank]
        for rank in range(first_descent, len(polynomial) - 1)
    )

    report = {
        "status": "VERIFIED_FALSE_LEAF_MAJORITY_OLC_CANDIDATE",
        "exact_integer_arithmetic": True,
        "order": len(graph),
        "leaves": leaves,
        "nonleaves": nonleaves,
        "leaf_surplus": leaves - nonleaves,
        "attachment_vertex": attachment,
        "attachment_vertex_original_degree": 2,
        "attached_leaves": 6,
        "edges": sorted([sorted(edge) for edge in graph.edges()]),
        "graph6": nx.to_graph6_bytes(graph, header=False)
        .decode("ascii")
        .strip(),
        "polynomial": polynomial,
        "rank": k,
        "ordered_lc_gap": ordered_gap,
        "ordinary_lc_gap": ordinary_gap,
        "unimodal": True,
        "conclusion": (
            "The global inequality leaves >= nonleaves + 2 does not imply "
            "ordered log-concavity. The example remains log-concave at the "
            "failing ordered rank and remains unimodal, so it is not a "
            "counterexample to Erdos Problem 993."
        ),
    }
    payload = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(payload, encoding="utf-8")
    print(payload, end="")


if __name__ == "__main__":
    main()
