#!/usr/bin/env python3
"""Probe monotonicity of the combined recursive gap under decorations.

For a rooted forest B with a distinguished nonroot leaf s, let
T_q(B;v,s) be the combined two-block first leaf-recursion gap.  The
three terminal decorations are:

* a new leaf at the root v;
* a new leaf at the first support s;
* a new isolated vertex.

If each addition never decreases T_q, decorated broom terminals
reduce to their bare v--s path.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


DECORATIONS = ("root_leaf", "support_leaf", "isolate")


def combined(graph: nx.Graph, root: int, support: int, q: int) -> int:
    return sum(recursive_blocks_fast(graph, root, support, q).values())


def decorated(
    graph: nx.Graph, root: int, support: int, kind: str
) -> nx.Graph:
    result = graph.copy()
    vertex = max(result.nodes, default=-1) + 1
    if kind == "root_leaf":
        result.add_edge(root, vertex)
    elif kind == "support_leaf":
        result.add_edge(support, vertex)
    elif kind == "isolate":
        result.add_node(vertex)
    else:
        raise ValueError(kind)
    return result


def main() -> None:
    checks = 0
    configurations = 0
    failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        kind: None for kind in DECORATIONS
    }

    def audit(
        graph: nx.Graph,
        root: int,
        support: int,
        ranks: range,
        family: str,
        identifier: str,
    ) -> None:
        nonlocal checks, configurations
        configurations += 1
        additions = {
            kind: decorated(graph, root, support, kind)
            for kind in DECORATIONS
        }
        for q in ranks:
            old = combined(graph, root, support, q)
            for kind, larger in additions.items():
                margin = combined(larger, root, support, q) - old
                record = {
                    "family": family,
                    "identifier": identifier,
                    "order": len(graph),
                    "root": root,
                    "support": support,
                    "rank_q": q,
                    "decoration": kind,
                    "increment": margin,
                }
                checks += 1
                if (
                    minima[kind] is None
                    or margin < minima[kind][0]
                ):
                    minima[kind] = (margin, record)
                if margin < 0:
                    failures.append(record)

    tree_count = 0
    for order in range(2, 9):
        for tree0 in nx.nonisomorphic_trees(order):
            tree_count += 1
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                component = nx.node_connected_component(tree, root)
                for support in component:
                    if support != root and tree.degree(support) == 1:
                        audit(
                            tree,
                            root,
                            support,
                            range(4, order + 5),
                            "tree",
                            code,
                        )

    atlas_count = 0
    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if order < 2 or order > 7 or not nx.is_forest(forest0):
            continue
        atlas_count += 1
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for root in forest:
            component = nx.node_connected_component(forest, root)
            for support in component:
                if support != root and forest.degree(support) == 1:
                    audit(
                        forest,
                        root,
                        support,
                        range(4, order + 5),
                        "atlas_forest",
                        code,
                    )

    rng = random.Random(993_884)
    random_count = 0
    for sample in range(80):
        forest = random_forest(rng, 10, 90)
        order = len(forest)
        eligible = [
            (root, support)
            for root in forest
            for support in nx.node_connected_component(forest, root)
            if support != root and forest.degree(support) == 1
        ]
        if not eligible:
            continue
        root, support = rng.choice(eligible)
        random_count += 1
        audit(
            forest,
            root,
            support,
            range(4, 13),
            "random_forest",
            str(sample),
        )

    report = {
        "status": (
            "PASS_TERMINAL_DECORATION_MONOTONICITY_PROBE"
            if not failures
            else "FAIL_TERMINAL_DECORATION_MONOTONICITY_PROBE"
        ),
        "tree_orders": "2..8",
        "tree_count": tree_count,
        "atlas_forest_orders": "2..7",
        "atlas_forest_count": atlas_count,
        "random_forest_count": random_count,
        "root_support_configurations": configurations,
        "checked_decoration_increments": checks,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minima": {
            kind: item[1] if item is not None else None
            for kind, item in minima.items()
        },
        "warning": (
            "This is exact finite evidence for an auxiliary monotonicity "
            "lemma, not a proof of the original conjecture."
        ),
    }
    Path(
        "terminal_decoration_monotonicity_probe_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
