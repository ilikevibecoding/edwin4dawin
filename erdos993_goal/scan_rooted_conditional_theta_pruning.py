#!/usr/bin/env python3
"""Audit pruning of the rooted conditional sharp-Lambda surplus.

For a rooted forest (H,v), attach a hypothetical new leaf at v but
restrict attention to the independent q-sets that do not select that
new leaf.  Measure their residual statistics in the extended forest.
In factorial coordinates their sharp-Lambda surplus is

    ThetaA_q(H,v) =
      (q-3)A^2 - AC - 3AX + B^2
      + 2Bb + b^2 - 2Ac - 3Ar,

where

    A=f_q(H), B=f_(q+1)(H), C=f_(q+2)(H), X=g_(q+2)(H),
    b=f_q(H-v), c=f_(q+1)(H-v), r=f_q(H-N_H[v]).

For a degree-at-most-one vertex w != v, let Q=H-w if w is
isolated, and let Q=H-{w,u} if w is a leaf with support u != v.
When u=v, omit the lower term.  The candidate audited here is

    ThetaA_q(H,v)-ThetaA_q(H-w,v)
      >= q^2 ThetaA_(q-1)(Q,v).

The same adaptive pruning rule as the Gamma/W6 audit is used for
disconnected forests.  This is exact finite evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from scan_rooted_cross_W6_lambda_pruning import (
    adaptive_vertices,
    pruning_lower,
)
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


def conditional_theta(forest: nx.Graph, root: int) -> dict[int, int]:
    if root not in forest or not nx.is_forest(forest):
        raise ValueError("conditional_theta requires a rooted forest")
    deleted = forest.subgraph(set(forest) - {root}).copy()
    residual = forest.subgraph(
        set(forest) - {root} - set(forest[root])
    ).copy()
    f_h, g_h = factorial_sequences(forest)
    f_g, _ = factorial_sequences(deleted)
    f_r, _ = factorial_sequences(residual)
    result: dict[int, int] = {}
    for q in range(3, len(f_h) - 1):
        A = at(f_h, q)
        B = at(f_h, q + 1)
        C = at(f_h, q + 2)
        X = at(g_h, q + 2)
        b = at(f_g, q)
        c = at(f_g, q + 1)
        r = at(f_r, q)
        result[q] = (
            (q - 3) * A * A
            - A * C
            - 3 * A * X
            + B * B
            + 2 * B * b
            + b * b
            - 2 * A * c
            - 3 * A * r
        )
    return result


def audit_pair(
    forest: nx.Graph,
    root: int,
    removed: int,
    family: str,
    parameters: dict,
) -> dict:
    large = conditional_theta(forest, root)
    smaller_graph = forest.subgraph(
        set(forest) - {removed}
    ).copy()
    smaller = conditional_theta(smaller_graph, root)
    lower_graph = pruning_lower(forest, root, removed)
    lower = (
        conditional_theta(lower_graph, root)
        if lower_graph is not None
        else {}
    )
    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    ranks = set(large) | set(smaller) | {
        rank + 1 for rank in lower
    }
    for q in ranks:
        lower_value = q * q * lower.get(q - 1, 0) if q >= 4 else 0
        value = (
            large.get(q, 0) - smaller.get(q, 0) - lower_value
        )
        record = {
            "family": family,
            "parameters": parameters,
            "root": root,
            "removed": removed,
            "removed_degree": forest.degree(removed),
            "rank_q": q,
            "strong_pruning_remainder": value,
            "scaled_lower_term": lower_value,
        }
        if value < 0:
            failures.append(record)
        if minimum is None or value < minimum[0]:
            minimum = (value, record)
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
    parser.add_argument("--random-forests", type=int, default=200)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993415)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rooted_conditional_theta_pruning_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    rooted_instances = pruning_pairs = checks = 0
    global_failures: list[dict] = []
    pruning_failures: list[dict] = []
    global_minimum: tuple[int, dict] | None = None
    pruning_minimum: tuple[int, dict] | None = None
    case_counts: dict[str, int] = {}

    def audit_global(
        forest: nx.Graph, root: int, family: str, parameters: dict
    ) -> None:
        nonlocal rooted_instances, global_minimum
        code = nx.to_graph6_bytes(
            nx.convert_node_labels_to_integers(forest),
            header=False,
        ).decode("ascii").strip()
        for q, value in conditional_theta(forest, root).items():
            record = {
                "family": family,
                "parameters": parameters,
                "graph6": code,
                "root": root,
                "rank_q": q,
                "Theta_A": value,
            }
            if value < 0:
                global_failures.append(record)
            if global_minimum is None or value < global_minimum[0]:
                global_minimum = (value, record)
        rooted_instances += 1

    def audit_deletion(
        forest: nx.Graph,
        root: int,
        removed: int,
        family: str,
        parameters: dict,
        case: str,
    ) -> None:
        nonlocal pruning_pairs, checks, pruning_minimum
        result = audit_pair(
            forest, root, removed, family, parameters
        )
        pruning_pairs += 1
        checks += result["checks"]
        pruning_failures.extend(result["failures"])
        candidate = result["minimum"]
        if candidate is not None and (
            pruning_minimum is None
            or candidate["strong_pruning_remainder"]
            < pruning_minimum[0]
        ):
            pruning_minimum = (
                candidate["strong_pruning_remainder"],
                candidate,
            )
        case_counts[case] = case_counts.get(case, 0) + 1

    for order in range(2, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                parameters = {"order": order, "graph6": code}
                audit_global(
                    tree, root, "unlabeled_tree", parameters
                )
                for leaf in [
                    vertex
                    for vertex in tree
                    if vertex != root and tree.degree(vertex) == 1
                ]:
                    audit_deletion(
                        tree,
                        root,
                        leaf,
                        "unlabeled_tree",
                        parameters,
                        "connected_any_nonroot_leaf",
                    )

    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 2
            or order > args.atlas_forest_order
            or not nx.is_forest(forest0)
            or nx.is_tree(forest0)
        ):
            continue
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for root in forest:
            parameters = {"order": order, "graph6": code}
            audit_global(
                forest,
                root,
                "atlas_disconnected_forest",
                parameters,
            )
            eligible, case = adaptive_vertices(forest, root)
            for removed in eligible:
                audit_deletion(
                    forest,
                    root,
                    removed,
                    "atlas_disconnected_forest",
                    parameters,
                    case,
                )

    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 2, args.random_maximum_order)
        root = rng.choice(list(forest))
        eligible, case = adaptive_vertices(forest, root)
        if not eligible:
            continue
        removed = rng.choice(eligible)
        parameters = {
            "sample": sample,
            "order": len(forest),
            "components": nx.number_connected_components(forest),
        }
        audit_global(forest, root, "random_forest", parameters)
        audit_deletion(
            forest,
            root,
            removed,
            "random_forest",
            parameters,
            case,
        )

    report = {
        "status": (
            "PASS_ROOTED_CONDITIONAL_THETA_PRUNING_CANDIDATE"
            if not global_failures and not pruning_failures
            else "FAIL_ROOTED_CONDITIONAL_THETA_PRUNING_CANDIDATE"
        ),
        "maximum_unlabeled_tree_order": args.maximum_tree_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_rooted_instances": rooted_instances,
        "checked_pruning_pairs": pruning_pairs,
        "checked_pruning_ranks": checks,
        "adaptive_case_counts": case_counts,
        "global_failure_count": len(global_failures),
        "global_failures": global_failures[:20],
        "pruning_failure_count": len(pruning_failures),
        "pruning_failures": pruning_failures[:20],
        "global_minimum": (
            global_minimum[1] if global_minimum is not None else None
        ),
        "pruning_minimum": (
            pruning_minimum[1]
            if pruning_minimum is not None
            else None
        ),
        "logical_consequence_if_proved": (
            "The adaptive pruning inequality proves Theta_A>=0 "
            "for every rooted forest."
        ),
        "warning": (
            "All computations are exact finite evidence. The pruning "
            "inequality remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
