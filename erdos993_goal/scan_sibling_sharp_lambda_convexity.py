#!/usr/bin/env python3
"""Audit sharp-Lambda convexity under adding sibling leaves.

Let S be a rooted forest with root v, and let F_t be obtained by
attaching t new leaves at v.  Designate one of the new leaves in F_1
and F_2.  The sharp-Lambda leaf remainder E from
``scan_nested_sharp_lambda_forest_pruning`` satisfies the candidate

    E_q(F_2, leaf) - E_q(F_1, leaf)
      >= Lambda_(q-1)(S-v).

In factorial coordinates, ``rooted_quantities`` stores q!^2 E_q and
``lower_lambda`` below stores (q-1)!^2 Lambda_(q-1), so the checked
integer inequality is

    Delta Ehat_q >= q^2 Lambdahat_(q-1).

Coefficient two is false already on P_13 at q=3 and is recorded as a
negative control.  This script supplies finite evidence, not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from scan_edge_survival_ratio_dominance import random_forest
from scan_rooted_cross_W6_lambda_pruning import rooted_quantities
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


def lower_lambda(forest: nx.Graph, rank_q: int) -> int:
    """Return (q-1)!^2 Lambda_(q-1)(forest)."""
    f, g = factorial_sequences(forest)
    a = at(f, rank_q - 1)
    b = at(f, rank_q)
    c = at(f, rank_q + 1)
    e = at(g, rank_q + 1)
    return (
        (rank_q - 3) * a * a - a * c - 3 * a * e + b * b
    )


def audit_sibling(
    full: nx.Graph,
    root: int,
    removed_leaf: int,
    family: str,
    parameters: dict,
) -> dict:
    if (
        full.degree(removed_leaf) != 1
        or next(iter(full[removed_leaf])) != root
    ):
        raise ValueError("removed leaf must be supported by root")
    smaller = full.subgraph(
        set(full) - {removed_leaf}
    ).copy()
    lower = smaller.subgraph(set(smaller) - {root}).copy()
    _, _, sharp_full = rooted_quantities(full, root)
    _, _, sharp_smaller = rooted_quantities(smaller, root)
    lower_f, _ = factorial_sequences(lower)

    checks = 0
    failures: list[dict] = []
    coefficient_two_failures: list[dict] = []
    theta_core_failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    minimum_positive: tuple[int, dict] | None = None
    for q in sorted(set(sharp_full) | set(sharp_smaller)):
        lam = lower_lambda(lower, q)
        delta = sharp_full.get(q, 0) - sharp_smaller.get(q, 0)
        margin = delta - q * q * lam
        margin_two = delta - 2 * q * q * lam
        lower_mass = at(lower_f, q - 1)
        theta_core_margin = (
            delta
            - 2 * q * q * lam
            + q * q * lower_mass * lower_mass
        )
        record = {
            "family": family,
            "parameters": parameters,
            "root": root,
            "removed_leaf": removed_leaf,
            "rank_q": q,
            "Delta_sharp_remainder": delta,
            "scaled_lower_Lambda": lam,
            "coefficient_one_margin": margin,
            "coefficient_two_margin": margin_two,
            "lower_factorial_mass": lower_mass,
            "theta_core_margin": theta_core_margin,
        }
        if margin < 0:
            failures.append(record)
        if margin_two < 0 and len(coefficient_two_failures) < 20:
            coefficient_two_failures.append(record)
        if theta_core_margin < 0:
            theta_core_failures.append(record)
        if minimum is None or margin < minimum[0]:
            minimum = (margin, record)
        if margin > 0 and (
            minimum_positive is None or margin < minimum_positive[0]
        ):
            minimum_positive = (margin, record)
        checks += 1
    return {
        "checks": checks,
        "failures": failures,
        "coefficient_two_failures": coefficient_two_failures,
        "theta_core_failures": theta_core_failures,
        "minimum": minimum[1] if minimum is not None else None,
        "minimum_positive": (
            minimum_positive[1]
            if minimum_positive is not None
            else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-tree-order", type=int, default=10)
    parser.add_argument("--atlas-forest-order", type=int, default=7)
    parser.add_argument("--random-forests", type=int, default=250)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--seed", type=int, default=993781)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_sharp_lambda_convexity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    instances = checks = 0
    failures: list[dict] = []
    coefficient_two_failures: list[dict] = []
    theta_core_failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    minimum_positive: tuple[int, dict] | None = None

    def consume(result: dict) -> None:
        nonlocal instances, checks, minimum, minimum_positive
        instances += 1
        checks += result["checks"]
        failures.extend(result["failures"])
        theta_core_failures.extend(result["theta_core_failures"])
        if len(coefficient_two_failures) < 20:
            coefficient_two_failures.extend(
                result["coefficient_two_failures"][
                    : 20 - len(coefficient_two_failures)
                ]
            )
        candidate = result["minimum"]
        if candidate is not None and (
            minimum is None
            or candidate["coefficient_one_margin"] < minimum[0]
        ):
            minimum = (candidate["coefficient_one_margin"], candidate)
        candidate = result["minimum_positive"]
        if candidate is not None and (
            minimum_positive is None
            or candidate["coefficient_one_margin"]
            < minimum_positive[0]
        ):
            minimum_positive = (
                candidate["coefficient_one_margin"],
                candidate,
            )

    for order in range(2, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for removed_leaf in [
                vertex
                for vertex in tree
                if tree.degree(vertex) == 1
            ]:
                root = next(iter(tree[removed_leaf]))
                consume(
                    audit_sibling(
                        tree,
                        root,
                        removed_leaf,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                    )
                )

    # Disconnected forests are relevant because S-v can have many
    # components and because the global forest induction retains them.
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
        for removed_leaf in [
            vertex
            for vertex in forest
            if forest.degree(vertex) == 1
        ]:
            root = next(iter(forest[removed_leaf]))
            consume(
                audit_sibling(
                    forest,
                    root,
                    removed_leaf,
                    "atlas_disconnected_forest",
                    {"order": order, "graph6": code},
                )
            )

    # Deterministic negative control for coefficient two.  The
    # coefficient-one candidate has a positive margin here.
    path_thirteen = nx.path_graph(13)
    consume(
        audit_sibling(
            path_thirteen,
            1,
            0,
            "coefficient_two_path_counterexample",
            {
                "order": 13,
                "graph6": nx.to_graph6_bytes(
                    path_thirteen, header=False
                )
                .decode("ascii")
                .strip(),
            },
        )
    )

    # Target the sibling geometry in every random sample by first
    # choosing a leaf and then using its support as the root.
    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(rng, 2, args.random_maximum_order)
        leaves = [
            vertex
            for vertex in forest
            if forest.degree(vertex) == 1
        ]
        if not leaves:
            continue
        removed_leaf = rng.choice(leaves)
        root = next(iter(forest[removed_leaf]))
        consume(
            audit_sibling(
                forest,
                root,
                removed_leaf,
                "random_forest",
                {
                    "sample": sample,
                    "order": len(forest),
                    "components": nx.number_connected_components(forest),
                },
            )
        )

    report = {
        "status": (
            "PASS_SIBLING_SHARP_LAMBDA_CONVEXITY_CANDIDATE"
            if not failures
            else "FAIL_SIBLING_SHARP_LAMBDA_CONVEXITY_CANDIDATE"
        ),
        "claim": (
            "E_q(F_2,leaf)-E_q(F_1,leaf) "
            ">= Lambda_(q-1)(S-v)"
        ),
        "factorial_form": (
            "Delta Ehat_q >= q^2 Lambdahat_(q-1)"
        ),
        "maximum_unlabeled_tree_order": args.maximum_tree_order,
        "atlas_disconnected_forest_order": args.atlas_forest_order,
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_sibling_instances": instances,
        "checked_ranks": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_margin": minimum[1] if minimum is not None else None,
        "minimum_strictly_positive_margin": (
            minimum_positive[1]
            if minimum_positive is not None
            else None
        ),
        "coefficient_two_failure_count_stored": len(
            coefficient_two_failures
        ),
        "coefficient_two_failure_examples": (
            coefficient_two_failures
        ),
        "theta_core_claim": (
            "Delta Ehat_q >= q^2(2 Lambdahat_(q-1) "
            "- f_(q-1)^2)"
        ),
        "theta_core_status": (
            "PASS_SIBLING_THETA_CORE_CANDIDATE"
            if not theta_core_failures
            else "FAIL_SIBLING_THETA_CORE_CANDIDATE"
        ),
        "theta_core_failure_count": len(theta_core_failures),
        "theta_core_failures": theta_core_failures[:20],
        "logical_consequence_if_proved": (
            "The sibling-leaf case of nested sharp-Lambda pruning "
            "follows from the lower-rank Lambda floor."
        ),
        "warning": (
            "This is exact finite evidence. The coefficient-one "
            "convexity inequality remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
