#!/usr/bin/env python3
"""Audit the bridge from recursive tree payment to the Lambda moment.

For a tree H with distinguished vertex v, attach a new leaf at v and
write F for the resulting tree and G=H-v.  Define

    M_q(H,v) =
      U_q(F)-U_q(H)-R_(q-1)(G),

where U=P-2S^2 and R=P-S^2.  The candidate audited here is

    M_q(H,v) >= (2q+1) Lambda_q(G)

for every q>=2, where

    Lambda_q(G) =
      (q-2)N^2 + C0*N - H2*N + S^2.

Here N,S,H2,C0 are the uniform rank-q moments used in the component
shift calculation.  If this bridge and Lambda>=0 are proved, the
    recursive tree leaf inequality follows immediately.  The factor
    2q+1 is the strongest uniform factor seen in the exact census and
    is attained by paths at their terminal ranks.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import (
    jet,
    payment_residuals,
)
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


def lambda_values(graph: nx.Graph) -> dict[int, int]:
    if not graph:
        return {}
    result: dict[int, int] = {}
    for q, row in jet(graph).items():
        if q < 2:
            continue
        count, mass, h2, _, edge0, _ = row
        component0 = mass - edge0
        result[q] = (
            (q - 2) * count * count
            + component0 * count
            - h2 * count
            + mass * mass
        )
    return result


def random_tree(rng: random.Random, order: int) -> nx.Graph:
    if order <= 1:
        return nx.empty_graph(order)
    sequence = [rng.randrange(order) for _ in range(order - 2)]
    return nx.from_prufer_sequence(sequence)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-exhaustive-order", type=int, default=1)
    parser.add_argument("--exhaustive-order", type=int, default=13)
    parser.add_argument("--random-trees", type=int, default=300)
    parser.add_argument("--random-maximum-order", type=int, default=160)
    parser.add_argument(
        "--skip-hard-families",
        action="store_true",
        help="Skip the three large Galvin-family checks.",
    )
    parser.add_argument("--seed", type=int, default=993899)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "mixed_payment_lambda_bridge_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_roots = checked_ranks = 0
    failures: list[dict] = []
    lambda_failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None
    minimum_raw: tuple[int, dict] | None = None

    def audit(
        graph: nx.Graph,
        root: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checked_roots, checked_ranks, minimum, minimum_raw
        if not nx.is_tree(graph):
            raise ValueError("bridge audit requires a connected tree")

        mixed = mixed_payment(graph, root)
        deleted = graph.subgraph(set(graph) - {root}).copy()
        lam = lambda_values(deleted)
        ranks = sorted(set(mixed) | set(lam))
        for q in ranks:
            mixed_value = mixed.get(q, 0)
            lambda_value = lam.get(q, 0)
            bridge_factor = 2 * q + 1
            gap = mixed_value - bridge_factor * lambda_value
            denominator = max(1, abs(mixed_value), abs(lambda_value))
            normalized = Fraction(gap, denominator)
            record = {
                "family": family,
                "parameters": parameters,
                "root": root,
                "root_degree": graph.degree(root),
                "rank_q": q,
                "mixed_payment": mixed_value,
                "lambda_deleted": lambda_value,
                "bridge_factor": bridge_factor,
                "gap": gap,
                "normalized_gap": str(normalized),
            }
            if gap < 0:
                failures.append(record)
            if lambda_value < 0:
                lambda_failures.append(record)
            if minimum is None or normalized < minimum[0]:
                minimum = (normalized, record)
            if minimum_raw is None or gap < minimum_raw[0]:
                minimum_raw = (gap, record)
            checked_ranks += 1
        checked_roots += 1

    for order in range(
        args.minimum_exhaustive_order, args.exhaustive_order + 1
    ):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = order_roots = 0
        for tree0 in trees:
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            order_trees += 1
            checked_trees += 1
            for root in tree:
                audit(
                    tree,
                    root,
                    "unlabeled_tree",
                    {"order": order, "graph6": code},
                )
                order_roots += 1
        print(
            f"order={order} trees={order_trees} roots={order_roots} "
            f"rank_checks={checked_ranks} failures={len(failures)}",
            flush=True,
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_trees):
        order = rng.randint(2, args.random_maximum_order)
        tree = random_tree(rng, order)
        roots = {
            rng.randrange(order),
            max(tree, key=tree.degree),
            min(tree, key=tree.degree),
        }
        checked_trees += 1
        for root in sorted(roots):
            audit(
                tree,
                root,
                "random_tree",
                {"sample": sample, "order": order},
            )

    hard_records = []
    hard_parameters = (
        [] if args.skip_hard_families else [(14, 8), (21, 11), (40, 20)]
    )
    for branches, arms in hard_parameters:
        tree = galvin_tree(branches, arms)
        structural = {
            0,
            1,
            1 + branches,
            max(tree, key=tree.degree),
            min(tree, key=tree.degree),
        }
        vertices = list(tree)
        while len(structural) < 12:
            structural.add(rng.choice(vertices))
        before_checks = checked_ranks
        before_failures = len(failures)
        checked_trees += 1
        for root in sorted(structural):
            audit(
                tree,
                root,
                "galvin_tree",
                {
                    "branches": branches,
                    "arms": arms,
                    "order": len(tree),
                },
            )
        hard_records.append(
            {
                "branches": branches,
                "arms": arms,
                "order": len(tree),
                "roots": len(structural),
                "rank_checks": checked_ranks - before_checks,
                "failures": len(failures) - before_failures,
            }
        )

    report = {
        "status": (
            "PASS_MIXED_PAYMENT_LAMBDA_BRIDGE_CANDIDATE"
            if not failures
            else "FAIL_MIXED_PAYMENT_LAMBDA_BRIDGE_CANDIDATE"
        ),
        "candidate": (
            "For every rooted tree (H,v) and q>=2, "
            "M_q(H,v)>=(2q+1)Lambda_q(H-v)."
        ),
        "logical_consequence_if_proved": (
            "Together with Lambda_q>=0, this proves the recursive "
            "tree-leaf payment inequality and hence U_q(T)>=0; the "
            "factor 2q+1 also cancels the quadratic a^2 block in the "
            "factorial bridge remainder."
        ),
        "maximum_unlabeled_tree_order": args.exhaustive_order,
        "checked_trees": checked_trees,
        "checked_roots": checked_roots,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "lambda_negative_count": len(lambda_failures),
        "lambda_failures": lambda_failures[:20],
        "minimum_normalized_gap": (
            minimum[1] if minimum is not None else None
        ),
        "minimum_raw_gap": (
            minimum_raw[1] if minimum_raw is not None else None
        ),
        "hard_family_records": hard_records,
        "warning": (
            "This is an exact finite audit, not a proof of the bridge."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
