#!/usr/bin/env python3
"""Audit the nested monotonicity of the recursive leaf mixed payment.

For a forest H with a distinguished vertex v, let H+v* denote the
forest obtained by attaching a new leaf at v, and define

    M_q(H,v) =
      U_q(H+v*) - U_q(H) - (P_(q-1)(H-v)-S_(q-1)(H-v)^2).

The component-local candidate checked here is

    M_q(H,v) >= M_q(H-w,v)

for q>=2 and every degree-at-most-one vertex w distinct from v in
the same component as v.  Unrestricted pruning across components is
false; the script records the smallest known negative control.  If
the component-local statement is proved, pruning the root component
reduces the problem to an isolated root plus the untouched components.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import payment_residuals
from scan_edge_survival_ratio_dominance import random_forest
from verify_edge_survival_payment_reduction import galvin_tree


def residuals(graph: nx.Graph):
    return payment_residuals(graph) if graph else ({}, {}, {})


def mixed_payment(graph: nx.Graph, root: int) -> dict[int, int]:
    extended = graph.copy()
    new_leaf = max(graph.nodes, default=-1) + 1
    while new_leaf in extended:
        new_leaf += 1
    extended.add_edge(root, new_leaf)

    strong_graph, _, _ = residuals(graph)
    strong_extended, _, _ = residuals(extended)
    deleted = graph.subgraph(set(graph) - {root}).copy()
    _, lower_reserve, _ = residuals(deleted)

    ranks = set(strong_graph) | set(strong_extended)
    return {
        q: (
            strong_extended.get(q, 0)
            - strong_graph.get(q, 0)
            - lower_reserve.get(q - 1, 0)
        )
        for q in ranks
        if q >= 2
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=11)
    parser.add_argument("--random-forests", type=int, default=200)
    parser.add_argument("--random-maximum-order", type=int, default=80)
    parser.add_argument("--seed", type=int, default=993885)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "nested_leaf_mixed_monotonicity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_forests = checked_deletions = checked_ranks = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None

    def audit(
        graph: nx.Graph,
        root: int,
        removed: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checked_deletions, checked_ranks, minimum
        if root == removed or graph.degree(removed) > 1:
            raise ValueError("invalid rooted deletion")
        if not nx.has_path(graph, root, removed):
            raise ValueError("root and removed vertex must share a component")
        large = mixed_payment(graph, root)
        smaller_graph = graph.subgraph(set(graph) - {removed}).copy()
        small = mixed_payment(smaller_graph, root)
        ranks = set(large) | set(small)
        for q in ranks:
            gap = large.get(q, 0) - small.get(q, 0)
            denominator = max(1, abs(large.get(q, 0)))
            normalized = Fraction(gap, denominator)
            record = {
                "family": family,
                "parameters": parameters,
                "root": root,
                "removed": removed,
                "removed_degree": graph.degree(removed),
                "rank_q": q,
                "large_mixed_payment": large.get(q, 0),
                "small_mixed_payment": small.get(q, 0),
                "gap": gap,
                "normalized_gap": str(normalized),
            }
            checked_ranks += 1
            if gap < 0:
                failures.append(record)
            if minimum is None or normalized < minimum[0]:
                minimum = (normalized, record)
        checked_deletions += 1

    for order in range(2, args.exhaustive_order + 1):
        order_trees = order_deletions = 0
        for tree0 in nx.nonisomorphic_trees(order):
            order_trees += 1
            tree = nx.convert_node_labels_to_integers(tree0)
            checked_forests += 1
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
            for root in tree:
                for leaf in leaves:
                    if leaf == root:
                        continue
                    audit(
                        tree,
                        root,
                        leaf,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                    )
                    order_deletions += 1
        print(
            f"order={order} trees={order_trees} "
            f"rooted_deletions={order_deletions} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        graph = random_forest(rng, 3, args.random_maximum_order)
        candidates = [
            v
            for v in graph
            if graph.degree(v) == 1
            and len(nx.node_connected_component(graph, v)) >= 2
        ]
        if not candidates:
            continue
        removed = rng.choice(candidates)
        component = nx.node_connected_component(graph, removed)
        roots = [v for v in component if v != removed]
        root = rng.choice(roots)
        checked_forests += 1
        audit(
            graph,
            root,
            removed,
            "random_forest",
            {
                "sample": sample,
                "order": len(graph),
                "components": nx.number_connected_components(graph),
            },
        )

    # Unrestricted pruning is false when the removed vertex is outside
    # the root component.  The forest is 2K2 + K1, rooted at the
    # isolate; deleting an endpoint of either edge gives gap -52 at q=2.
    negative_control = nx.Graph()
    negative_control.add_nodes_from(range(5))
    negative_control.add_edges_from([(0, 2), (3, 4)])
    control_large = mixed_payment(negative_control, 1)
    control_small = mixed_payment(
        negative_control.subgraph({1, 2, 3, 4}).copy(), 1
    )
    control_gap = control_large.get(2, 0) - control_small.get(2, 0)
    if control_gap != -52:
        raise AssertionError(("cross-component negative control", control_gap))

    hard_records = []
    for branches, arms in [(14, 8), (21, 11)]:
        tree = galvin_tree(branches, arms)
        leaves = [v for v in tree if tree.degree(v) == 1]
        removed = leaves[-1]
        roots = [0, 1, 1 + branches]
        before_checks = checked_ranks
        before_failures = len(failures)
        for root in roots:
            if root != removed:
                audit(
                    tree,
                    root,
                    removed,
                    "galvin_tree",
                    {
                        "branches": branches,
                        "arms": arms,
                        "order": len(tree),
                    },
                )
        checked_forests += 1
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
                "rank_checks": checked_ranks - before_checks,
                "failures": len(failures) - before_failures,
            }
        )

    report = {
        "status": (
            "PASS_NESTED_LEAF_MIXED_MONOTONICITY_CANDIDATE"
            if not failures
            else "FAIL_NESTED_LEAF_MIXED_MONOTONICITY_CANDIDATE"
        ),
        "candidate": (
            "M_q(H,v)>=M_q(H-w,v) for q>=2, root v, and "
            "degree-at-most-one w distinct from v in the same component"
        ),
        "logical_consequence_if_proved": (
            "Pruning the root component reduces M_q to the base case "
            "of an isolated root plus the untouched other components."
        ),
        "cross_component_negative_control": {
            "forest": "2K2 disjoint_union K1",
            "root": "the isolated vertex",
            "removed": "an endpoint of one K2",
            "rank_q": 2,
            "gap": control_gap,
        },
        "checked_forests": checked_forests,
        "checked_rooted_deletions": checked_deletions,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_normalized_gap": (
            minimum[1] if minimum is not None else None
        ),
        "hard_family_records": hard_records,
        "warning": (
            "This is an exact finite audit, not a proof of nested "
            "leaf monotonicity."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
