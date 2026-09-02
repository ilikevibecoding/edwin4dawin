#!/usr/bin/env python3
"""Audit self-similar pruning of the sibling Theta core.

For a rooted forest H with a distinguished leaf w supported by v,
put J=H-{v,w} and define, in factorial coordinates,

    D_q(H,v,w) =
      Ehat_q(H,v)-Ehat_q(H-w,v)
      -2q^2 Lambdahat_(q-1)(J)
      +q^2 f_(q-1)(J)^2.

Equivalently, D is the coefficient-one sibling local reserve after
subtracting q^2 times the lower sharp-floor surplus
Theta=Lambdahat-f^2.  The candidate recursive pruning is

    D_q(H,v,w)-D_q(H-z,v,w)
      >= q^2 D_(q-1)(Q,v,w),

where Q=H-z for an isolate, Q=H-{z,s} when z has support s!=v,
and the lower term is omitted when s=v.  The deletion must preserve
the distinguished edge vw.

Connected trees audit every other leaf.  Disconnected forests use the
adaptive rule: another root-component leaf first, then an external
isolate, then an external leaf of maximum support degree.  This is
exact finite evidence, not a proof.
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
from scan_sibling_uniform_surplus_leaf_monotonicity import (
    adaptive_deletions,
)
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


CORE_CACHE: dict[
    tuple[
        tuple[int, ...],
        tuple[tuple[int, int], ...],
        int,
        int,
    ],
    dict[int, int],
] = {}


def theta_core(
    forest: nx.Graph, root: int, distinguished_leaf: int
) -> dict[int, int]:
    nodes, edges = graph_signature(forest)
    key = (nodes, edges, root, distinguished_leaf)
    if key in CORE_CACHE:
        return CORE_CACHE[key]
    if (
        forest.degree(distinguished_leaf) != 1
        or next(iter(forest[distinguished_leaf])) != root
    ):
        raise ValueError("distinguished leaf must be supported by root")

    smaller = forest.subgraph(
        set(forest) - {distinguished_leaf}
    ).copy()
    lower = smaller.subgraph(set(smaller) - {root}).copy()
    sharp_large = cached_rooted_quantities(forest, root)[2]
    sharp_small = cached_rooted_quantities(smaller, root)[2]
    lower_f, _ = factorial_sequences(lower)
    result: dict[int, int] = {}
    for q in set(sharp_large) | set(sharp_small):
        if q < 3:
            continue
        lam = lower_lambda(lower, q)
        mass = at(lower_f, q - 1)
        result[q] = (
            sharp_large.get(q, 0)
            - sharp_small.get(q, 0)
            - 2 * q * q * lam
            + q * q * mass * mass
        )
    CORE_CACHE[key] = result
    return result


def audit_deletion(
    forest: nx.Graph,
    root: int,
    distinguished_leaf: int,
    removed: int,
    family: str,
    parameters: dict,
    rule: str,
) -> dict:
    smaller = forest.subgraph(set(forest) - {removed}).copy()
    large = theta_core(forest, root, distinguished_leaf)
    small = theta_core(smaller, root, distinguished_leaf)
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
    lower = (
        theta_core(lower_graph, root, distinguished_leaf)
        if lower_graph is not None
        else {}
    )

    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    ranks = set(large) | set(small) | {
        rank + 1 for rank in lower
    }
    for q in ranks:
        scaled_lower = (
            q * q * lower.get(q - 1, 0)
            if lower_graph is not None
            else 0
        )
        margin = (
            large.get(q, 0)
            - small.get(q, 0)
            - scaled_lower
        )
        record = {
            "family": family,
            "parameters": parameters,
            "adaptive_rule": rule,
            "root": root,
            "distinguished_leaf": distinguished_leaf,
            "removed": removed,
            "rank_q": q,
            "large_theta_core": large.get(q, 0),
            "small_theta_core": small.get(q, 0),
            "scaled_lower_rank_theta_core": scaled_lower,
            "recursive_theta_core_margin": margin,
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
    parser.add_argument("--random-forests", type=int, default=50)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993791)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_pruning_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    deletions = checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    rule_counts: dict[str, int] = {}

    def consume(result: dict, rule: str) -> None:
        nonlocal deletions, checks, minimum
        deletions += 1
        checks += result["checks"]
        failures.extend(result["failures"])
        rule_counts[rule] = rule_counts.get(rule, 0) + 1
        candidate = result["minimum"]
        if candidate is not None and (
            minimum is None
            or candidate["recursive_theta_core_margin"] < minimum[0]
        ):
            minimum = (
                candidate["recursive_theta_core_margin"],
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
        leaves = [
            vertex
            for vertex in forest
            if forest.degree(vertex) == 1
        ]
        if not leaves:
            continue
        distinguished_leaf = rng.choice(leaves)
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
            "PASS_SIBLING_THETA_CORE_PRUNING_CANDIDATE"
            if not failures
            else "FAIL_SIBLING_THETA_CORE_PRUNING_CANDIDATE"
        ),
        "claim": (
            "D_q(H,v,w)-D_q(H-z,v,w) "
            ">= q^2 D_(q-1)(Q,v,w)"
        ),
        "theta_core_definition": (
            "D=Delta Ehat-2q^2 Lambdahat+q^2 f^2"
        ),
        "maximum_unlabeled_tree_order": args.maximum_tree_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_deletions": deletions,
        "checked_ranks": checks,
        "adaptive_rule_counts": rule_counts,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_margin": minimum[1] if minimum is not None else None,
        "logical_consequence_if_proved": (
            "D>=0 by pruning; adding the lower sharp-floor surplus "
            "gives the corrected sibling local reserve."
        ),
        "warning": "Exact finite evidence, not a proof.",
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
