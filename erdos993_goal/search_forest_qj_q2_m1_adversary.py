#!/usr/bin/env python3
"""Exact adversarial search for the conditional all-rank q_j<=q_2 route.

This is search evidence only, not a proof.  It tests

    2*i_2(F)*z_j(F) <= j*i_j(F)*z_2(F),

where z_j counts one-edge (j+1)-sets, on complete small tree censuses and
deterministic/random forest families.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import networkx as nx

from audit_terminal_q3_low_newton_adversarial_agent import (
    TreeMessages,
    pair_product,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_qj_q2_m1_adversarial_search_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def forest_rows(forest: nx.Graph) -> tuple[list[int], list[int]]:
    zero, one = [1], [0]
    for vertices in nx.connected_components(forest):
        component = nx.convert_node_labels_to_integers(forest.subgraph(vertices).copy())
        if component.number_of_nodes() == 1:
            component_zero, component_one = [1, 1], [0]
        else:
            component_zero, component_one = TreeMessages(component).whole_tree()
        zero, one = pair_product(zero, one, component_zero, component_one)
    return zero, one


def audit_graph(graph: nx.Graph, label: str) -> tuple[int, dict[str, object] | None, int]:
    zero, one = forest_rows(graph)
    if len(zero) <= 2:
        return 0, None, 0
    a = zero[2]
    z2 = one[3] if len(one) > 3 else 0
    minimum: dict[str, object] | None = None
    checks = 0
    for j in range(3, len(zero)):
        b = zero[j]
        if not b:
            continue
        zj = one[j + 1] if len(one) > j + 1 else 0
        gap = j * b * z2 - 2 * a * zj
        checks += 1
        item = {
            "label": label,
            "order": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "components": nx.number_connected_components(graph),
            "j": j,
            "i2": str(a),
            "z2": str(z2),
            "ij": str(b),
            "zj": str(zj),
            "gap": str(gap),
            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
        }
        if minimum is None or gap < int(minimum["gap"]):
            minimum = item
        if gap < 0:
            return checks, item, gap
    return checks, minimum, int(minimum["gap"]) if minimum else 0


def main() -> None:
    total_graphs = 0
    total_checks = 0
    global_minimum: dict[str, object] | None = None

    def consume(graph: nx.Graph, label: str) -> None:
        nonlocal total_graphs, total_checks, global_minimum
        checks, minimum, gap = audit_graph(graph, label)
        total_graphs += 1
        total_checks += checks
        if minimum is not None and (
            global_minimum is None or gap < int(global_minimum["gap"])
        ):
            global_minimum = minimum
        assert minimum is None or gap >= 0, minimum

    # Complete unlabeled-tree census through order 17.
    tree_counts: dict[str, int] = {}
    for order in range(3, 18):
        count = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            consume(tree, f"unlabeled_tree_n{order}_{index}")
            count += 1
        tree_counts[str(order)] = count

    # Deterministic path/star/broom/double-star forest mixtures.
    family_count = 0
    for order in range(18, 101):
        components = [nx.path_graph(order), nx.star_graph(order - 1)]
        for left in range(1, order):
            right = order - left
            components.append(nx.disjoint_union(nx.path_graph(left), nx.path_graph(right)))
            components.append(nx.disjoint_union(nx.star_graph(left - 1), nx.path_graph(right)))
        for index, graph in enumerate(components):
            consume(graph, f"deterministic_n{order}_{index}")
            family_count += 1

    # Seeded random forests obtained by deleting edges of random trees.
    rng = random.Random(993_20260829)
    random_count = 0
    for order in (18, 24, 32, 48, 64, 96):
        for index in range(500):
            graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 31))
            deletion_probability = rng.random() * 0.9
            graph.remove_edges_from([
                edge for edge in list(graph.edges())
                if rng.random() < deletion_probability
            ])
            consume(graph, f"random_forest_n{order}_{index}")
            random_count += 1

    report = {
        "schema": "forest-qj-q2-m1-adversarial-search-v1",
        "date": "2026-08-29",
        "status": "PASS_NO_COUNTEREXAMPLE_SEARCH_EVIDENCE_NOT_PROOF",
        "inequality_tested": "2*i2(F)*z_j(F)<=j*i_j(F)*z_2(F), j>=3",
        "coverage": {
            "complete_unlabeled_trees": tree_counts,
            "deterministic_families": family_count,
            "seeded_random_forests": random_count,
            "total_graphs": total_graphs,
            "rank_checks": total_checks,
        },
        "minimum_gap": global_minimum,
        "scope": (
            "No counterexample in this finite/adversarial search. This is not "
            "an all-order proof and cannot be used as one in the m=1 theorem."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"graphs={total_graphs} rank_checks={total_checks}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
