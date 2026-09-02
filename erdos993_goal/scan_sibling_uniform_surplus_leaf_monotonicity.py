#!/usr/bin/env python3
"""Audit leaf monotonicity of the corrected sibling local reserve.

For a rooted forest H with a distinguished leaf w supported by v, put

    C_q(H,v,w) =
      Ehat_q(H,v) - Ehat_q(H-w,v)
      - q^2 Lambdahat_(q-1)(H-{v,w}).

This uses the corrected coefficient one.  The stronger candidate is

    C_q(H,v,w) - C_q(H-z,v,w)
      >= q^2 C_(q-1)(Q,v,w),

where Q=H-z for an isolate, Q=H-{z,s} when z has support s!=v,
and the lower term is omitted when s=v.  The deletion must preserve
the distinguished edge vw.  In connected trees every such leaf z is
checked.  In disconnected forests an adaptive deletion rule is used:
first another leaf in the root component, then an external isolate,
then an external leaf of maximum support degree.

If proved, repeated pruning reduces the sibling local-reserve case to
the edge K_2, where C_q=0.  The computations here are exact finite
evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from scan_nested_sharp_lambda_local_reserve import (
    cached_rooted_quantities,
    graph_signature,
    lower_lambda,
)


SURPLUS_CACHE: dict[
    tuple[
        tuple[int, ...],
        tuple[tuple[int, int], ...],
        int,
        int,
    ],
    dict[int, int],
] = {}


def sibling_surplus(
    forest: nx.Graph, root: int, distinguished_leaf: int
) -> dict[int, int]:
    nodes, edges = graph_signature(forest)
    key = (nodes, edges, root, distinguished_leaf)
    if key in SURPLUS_CACHE:
        return SURPLUS_CACHE[key]
    if (
        forest.degree(distinguished_leaf) != 1
        or next(iter(forest[distinguished_leaf])) != root
    ):
        raise ValueError("distinguished leaf must be supported by root")

    smaller = forest.subgraph(
        set(forest) - {distinguished_leaf}
    ).copy()
    reserve_graph = smaller.subgraph(
        set(smaller) - {root}
    ).copy()
    sharp_large = cached_rooted_quantities(forest, root)[2]
    sharp_small = cached_rooted_quantities(smaller, root)[2]
    ranks = set(sharp_large) | set(sharp_small)
    result: dict[int, int] = {}
    for q in ranks:
        if q < 3:
            continue
        result[q] = (
            sharp_large.get(q, 0)
            - sharp_small.get(q, 0)
            - q * q * lower_lambda(reserve_graph, q)
        )
    SURPLUS_CACHE[key] = result
    return result


def adaptive_deletions(
    forest: nx.Graph, root: int, distinguished_leaf: int
) -> tuple[list[int], str]:
    root_component = set(nx.node_connected_component(forest, root))
    root_leaves = [
        vertex
        for vertex in root_component
        if vertex not in {root, distinguished_leaf}
        and forest.degree(vertex) == 1
    ]
    if root_leaves:
        return root_leaves, "root_component_other_leaf"

    external = [
        vertex
        for vertex in forest
        if vertex not in root_component and forest.degree(vertex) <= 1
    ]
    isolates = [
        vertex for vertex in external if forest.degree(vertex) == 0
    ]
    if isolates:
        return isolates, "external_isolate"
    if not external:
        return [], "terminal_distinguished_edge"
    maximum_support_degree = max(
        forest.degree(next(iter(forest[leaf])))
        for leaf in external
    )
    return (
        [
            leaf
            for leaf in external
            if forest.degree(next(iter(forest[leaf])))
            == maximum_support_degree
        ],
        "external_maximum_support_degree",
    )


def audit_deletion(
    forest: nx.Graph,
    root: int,
    distinguished_leaf: int,
    removed: int,
    family: str,
    parameters: dict,
    rule: str,
) -> dict:
    if removed in {root, distinguished_leaf}:
        raise ValueError("cannot remove root or distinguished leaf")
    if forest.degree(removed) > 1:
        raise ValueError("removed vertex must be a leaf or isolate")
    smaller = forest.subgraph(set(forest) - {removed}).copy()
    large_values = sibling_surplus(
        forest, root, distinguished_leaf
    )
    small_values = sibling_surplus(
        smaller, root, distinguished_leaf
    )
    if forest.degree(removed) == 0:
        lower_graph = smaller
    else:
        support = next(iter(forest[removed]))
        lower_graph = (
            None
            if support == root
            else forest.subgraph(
                set(forest) - {removed, support}
            ).copy()
        )
    lower_values = (
        sibling_surplus(
            lower_graph, root, distinguished_leaf
        )
        if lower_graph is not None
        else {}
    )
    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    ranks = (
        set(large_values)
        | set(small_values)
        | {rank + 1 for rank in lower_values}
    )
    for q in ranks:
        raw_margin = large_values.get(q, 0) - small_values.get(q, 0)
        scaled_lower = (
            q * q * lower_values.get(q - 1, 0)
            if lower_graph is not None
            else 0
        )
        margin = raw_margin - scaled_lower
        record = {
            "family": family,
            "parameters": parameters,
            "adaptive_rule": rule,
            "root": root,
            "distinguished_leaf": distinguished_leaf,
            "removed": removed,
            "rank_q": q,
            "large_uniform_sibling_surplus": large_values.get(q, 0),
            "small_uniform_sibling_surplus": small_values.get(q, 0),
            "raw_leaf_increment": raw_margin,
            "scaled_lower_rank_sibling_surplus": scaled_lower,
            "recursive_leaf_monotonicity_margin": margin,
        }
        if margin < 0:
            failures.append(record)
        if minimum is None or margin < minimum[0]:
            minimum = (margin, record)
        checks += 1
    return {
        "checks": checks,
        "failures": failures,
        "minimum": minimum[1] if minimum is not None else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-tree-order", type=int, default=10)
    parser.add_argument("--atlas-forest-order", type=int, default=7)
    parser.add_argument("--random-forests", type=int, default=100)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993786)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_uniform_surplus_leaf_monotonicity_"
            "certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    instances = checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    rule_counts: dict[str, int] = {}

    def consume(result: dict, rule: str) -> None:
        nonlocal instances, checks, minimum
        instances += 1
        checks += result["checks"]
        failures.extend(result["failures"])
        rule_counts[rule] = rule_counts.get(rule, 0) + 1
        candidate = result["minimum"]
        if candidate is not None and (
            minimum is None
            or candidate["recursive_leaf_monotonicity_margin"]
            < minimum[0]
        ):
            minimum = (
                candidate["recursive_leaf_monotonicity_margin"],
                candidate,
            )

    for order in range(3, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            leaves = [
                vertex
                for vertex in tree
                if tree.degree(vertex) == 1
            ]
            for distinguished_leaf in leaves:
                root = next(iter(tree[distinguished_leaf]))
                for removed in leaves:
                    if removed in {root, distinguished_leaf}:
                        continue
                    rule = "connected_any_other_leaf"
                    consume(
                        audit_deletion(
                            tree,
                            root,
                            distinguished_leaf,
                            removed,
                            "unlabeled_tree",
                            {"order": order, "graph6": code},
                            rule,
                        ),
                        rule,
                    )

    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 3
            or order > args.atlas_forest_order
            or not nx.is_forest(forest0)
            or nx.is_tree(forest0)
        ):
            continue
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for distinguished_leaf in [
            vertex
            for vertex in forest
            if forest.degree(vertex) == 1
        ]:
            root = next(iter(forest[distinguished_leaf]))
            eligible, rule = adaptive_deletions(
                forest, root, distinguished_leaf
            )
            for removed in eligible:
                consume(
                    audit_deletion(
                        forest,
                        root,
                        distinguished_leaf,
                        removed,
                        "atlas_disconnected_forest",
                        {"order": order, "graph6": code},
                        rule,
                    ),
                    rule,
                )

    # Retain the path that refutes coefficient two as a deterministic
    # check that the corrected surplus prunes in the expected direction.
    path = nx.path_graph(13)
    consume(
        audit_deletion(
            path,
            1,
            0,
            12,
            "coefficient_two_path_counterexample",
            {
                "order": 13,
                "graph6": nx.to_graph6_bytes(path, header=False)
                .decode("ascii")
                .strip(),
            },
            "connected_any_other_leaf",
        ),
        "connected_any_other_leaf",
    )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 3, args.random_maximum_order)
        distinguished = [
            vertex
            for vertex in forest
            if forest.degree(vertex) == 1
        ]
        if not distinguished:
            continue
        distinguished_leaf = rng.choice(distinguished)
        root = next(iter(forest[distinguished_leaf]))
        eligible, rule = adaptive_deletions(
            forest, root, distinguished_leaf
        )
        if not eligible:
            continue
        removed = rng.choice(eligible)
        consume(
            audit_deletion(
                forest,
                root,
                distinguished_leaf,
                removed,
                "random_forest",
                {
                    "sample": sample,
                    "order": len(forest),
                    "components": nx.number_connected_components(forest),
                },
                rule,
            ),
            rule,
        )

    report = {
        "status": (
            "PASS_SIBLING_UNIFORM_SURPLUS_LEAF_MONOTONICITY"
            if not failures
            else "FAIL_SIBLING_UNIFORM_SURPLUS_LEAF_MONOTONICITY"
        ),
        "claim": (
            "C_q(H,v,w)-C_q(H-z,v,w) "
            ">= q^2 C_(q-1)(Q,v,w)"
        ),
        "surplus_definition": (
            "C_q = Delta Ehat_q - q^2 Lambdahat_(q-1)"
        ),
        "maximum_unlabeled_tree_order": args.maximum_tree_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_deletions": instances,
        "checked_ranks": checks,
        "adaptive_rule_counts": rule_counts,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_margin": minimum[1] if minimum is not None else None,
        "logical_consequence_if_proved": (
            "Repeated pruning reduces the sibling uniform local "
            "reserve to K_2, where it is zero."
        ),
        "warning": "Exact finite evidence, not a proof.",
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
