#!/usr/bin/env python3
"""Probe a second leaf recursion inside the two phase blocks.

The first recursion attaches a child at a deepest support s.  This
diagnostic asks whether its shadow and component-square blocks are
themselves super-recursive when an unrelated leaf z of the remaining
core is pruned:

    A_q(B;s)-A_q(B-z;s)-A_(q-1)(B-{z,t};s) >= 0,

and likewise for B, where t supports z.  A clean result would provide
a double induction on the core forest.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


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
    checks = 0
    failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        "shadow_phi": None,
        "component_square": None,
        "total": None,
    }
    for order in range(5, 10):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                distances = nx.single_source_shortest_path_length(
                    tree, root
                )
                maximum = max(distances.values())
                for support in [
                    vertex
                    for vertex in tree
                    if tree.degree(vertex) == 1
                    and distances[vertex] == maximum
                ]:
                    for leaf in [
                        vertex
                        for vertex in tree
                        if tree.degree(vertex) == 1
                        and vertex not in {root, support}
                    ]:
                        parent = next(iter(tree[leaf]))
                        if parent in {root, support}:
                            continue
                        smaller = tree.subgraph(
                            set(tree) - {leaf}
                        ).copy()
                        lower = tree.subgraph(
                            set(tree) - {leaf, parent}
                        ).copy()
                        if support not in lower or root not in lower:
                            continue
                        for q in range(4, order + 5):
                            large = grouped(tree, root, support, q)
                            small = grouped(smaller, root, support, q)
                            down = grouped(
                                lower, root, support, q - 1
                            )
                            for name in large:
                                value = (
                                    large[name]
                                    - small[name]
                                    - down[name]
                                )
                                record = {
                                    "order": order,
                                    "graph6": code,
                                    "root": root,
                                    "first_support": support,
                                    "second_leaf": leaf,
                                    "second_support": parent,
                                    "rank_q": q,
                                    "block": name,
                                    "second_recursive_margin": value,
                                }
                                checks += 1
                                if (
                                    minima[name] is None
                                    or value < minima[name][0]
                                ):
                                    minima[name] = (value, record)
                                if value < 0:
                                    failures.append(record)
    report = {
        "status": (
            "PASS_SECOND_LEAF_PHASE_RECURSION_PROBE"
            if not failures
            else "FAIL_SECOND_LEAF_PHASE_RECURSION_PROBE"
        ),
        "maximum_tree_order": 9,
        "checked_block_margins": checks,
        "failure_count": len(failures),
        "first_failures": failures[:30],
        "minima": {
            name: item[1] if item is not None else None
            for name, item in minima.items()
        },
        "warning": (
            "This diagnostic tests an auxiliary double recursion; "
            "it is not the original conjecture."
        ),
    }
    Path(
        "second_leaf_phase_recursion_probe_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
