#!/usr/bin/env python3
"""Test rank monotonicity of avoiding a root neighborhood in trees."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx

from random_leaf_gsb_local_payment import coeff, tree_polynomial


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--deletion-prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = failures = rooted_trees = 0
    first_failure = None
    minimum_margin = None
    minimum_item = None

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.generators.nonisomorphic_trees(order)
        )
        tree_count = 0
        for graph in trees:
            graph = nx.convert_node_labels_to_integers(
                graph, ordering="sorted"
            )
            tree_count += 1
            adjacency = [
                set(graph.neighbors(v)) for v in range(order)
            ]
            for root in range(order):
                rooted_trees += 1
                deletion = tree_polynomial(adjacency, deleted=root)
                removed = {root, *adjacency[root]}
                kept = [v for v in range(order) if v not in removed]
                relabel = {v: i for i, v in enumerate(kept)}
                residual = [
                    {
                        relabel[w]
                        for w in adjacency[v]
                        if w in relabel
                    }
                    for v in kept
                ]
                link = tree_polynomial(residual)
                maximum = max(deletion.degree(), link.degree())
                for rank in range(1, maximum + 1):
                    c_previous = int(coeff(deletion, rank - 1))
                    c_current = int(coeff(deletion, rank))
                    d_previous = int(coeff(link, rank - 1))
                    d_current = int(coeff(link, rank))
                    if not c_previous or not c_current:
                        continue
                    if (
                        args.deletion_prefix_only
                        and c_current < c_previous
                    ):
                        continue
                    margin = (
                        d_previous * c_current
                        - d_current * c_previous
                    )
                    checks += 1
                    item = {
                        "order": order,
                        "tree_index": tree_count - 1,
                        "root": root,
                        "rank": rank,
                        "root_degree": len(adjacency[root]),
                        "c_previous": c_previous,
                        "c_current": c_current,
                        "d_previous": d_previous,
                        "d_current": d_current,
                        "cleared_margin": margin,
                        "edges": sorted(map(list, graph.edges())),
                    }
                    if margin < 0:
                        failures += 1
                        if first_failure is None:
                            first_failure = item
                    if minimum_margin is None or margin < minimum_margin:
                        minimum_margin = margin
                        minimum_item = item
        print(
            f"order={order} trees={tree_count} rooted={rooted_trees} "
            f"checks={checks} failures={failures}",
            flush=True,
        )

    report = {
        "status": "COUNTEREXAMPLE" if failures else "PASS_NOT_PROOF",
        "max_order": args.max_order,
        "rooted_trees": rooted_trees,
        "checks": checks,
        "failures": failures,
        "minimum_margin": {
            "value": minimum_margin,
            **(minimum_item or {}),
        },
        "first_failure": first_failure,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
