#!/usr/bin/env python3
"""Exact finite scan for rank-4 three-halves reserve leaf growth.

For Q4(P)=8 p4^2-p3 p4-10 p3 p5, enumerate every unlabeled old tree
in the requested order range and every attachment vertex.  Directed
edge messages compute I(T-p) through degree five, so adding a leaf uses
I(T+leaf)=I(T)+x I(T-p).
"""

from __future__ import annotations

import argparse
import json
import time
from functools import lru_cache
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6
from scan_rank4_leaf_curvature_fast import all_root_states, coefficient


LIMIT = 5


def reserve(coefficients) -> int:
    p3 = coefficient(coefficients, 3)
    p4 = coefficient(coefficients, 4)
    p5 = coefficient(coefficients, 5)
    return 8 * p4 * p4 - p3 * p4 - 10 * p3 * p5


def trees_of_order(order: int):
    if order == 1:
        return [nx.empty_graph(1)]
    if order == 2:
        return [nx.path_graph(2)]
    return nx.nonisomorphic_trees(order)


def all_root_alpha_states(
    tree: nx.Graph,
) -> tuple[dict[int, int], int]:
    """Return alpha(T-p) for every p and alpha(T), by edge messages."""

    @lru_cache(maxsize=None)
    def message(vertex: int, parent: int) -> tuple[int, int]:
        excluded = 0
        included = 1
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = message(child, vertex)
            excluded += max(child_excluded, child_included)
            included += child_excluded
        return excluded, included

    deleted = {}
    alpha = None
    for p in tree:
        excluded, included = message(p, -1)
        deleted[p] = excluded
        root_alpha = max(excluded, included)
        if alpha is None:
            alpha = root_alpha
        else:
            assert root_alpha == alpha
    assert alpha is not None
    return deleted, alpha


def cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-order", type=int, default=1)
    parser.add_argument("--max-order", type=int, default=11)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "negative_reserves": 0,
        "negative_leaf_increments": 0,
        "prefix_reserve_failures": 0,
        "q_lm_failures": 0,
        "q_br_failures": 0,
    }
    first_negative_reserve = None
    first_negative_increment = None
    first_prefix_failure = None
    first_q_lm_failure = None
    first_q_br_failure = None
    per_order = []

    for order in range(args.min_order, args.max_order + 1):
        order_trees = 0
        minimum_reserve = None
        minimum_reserve_witness = None
        minimum_increment = None
        minimum_increment_witness = None
        for tree_index, tree in enumerate(trees_of_order(order)):
            order_trees += 1
            totals["trees"] += 1
            root_deleted, whole = all_root_states(tree)
            root_deleted_alpha, alpha = all_root_alpha_states(tree)
            old_cutoff = cutoff(alpha)
            old_reserve = reserve(whole)
            is_minimum_reserve = (
                minimum_reserve is None or old_reserve < minimum_reserve
            )
            needs_reserve_witness = (
                is_minimum_reserve
                or (old_reserve < 0 and first_negative_reserve is None)
                or (
                    4 < old_cutoff
                    and old_reserve < 0
                    and first_prefix_failure is None
                )
            )
            code = None
            reserve_witness = None
            if needs_reserve_witness:
                code = graph6(tree)
                reserve_witness = {
                    "tree_index": tree_index,
                    "graph6": code,
                    "reserve": old_reserve,
                    "independence_number": alpha,
                    "cutoff": old_cutoff,
                    "coefficients_0_to_5": list(whole),
                }
            if is_minimum_reserve:
                assert reserve_witness is not None
                minimum_reserve = old_reserve
                minimum_reserve_witness = reserve_witness
            if old_reserve < 0:
                totals["negative_reserves"] += 1
                if first_negative_reserve is None:
                    assert reserve_witness is not None
                    first_negative_reserve = reserve_witness | {
                        "order": order
                    }
            if 4 < old_cutoff and old_reserve < 0:
                totals["prefix_reserve_failures"] += 1
                if first_prefix_failure is None:
                    assert reserve_witness is not None
                    first_prefix_failure = reserve_witness | {
                        "order": order
                    }

            for p in tree:
                extended = list(whole)
                if len(extended) < LIMIT + 1:
                    extended.extend([0] * (LIMIT + 1 - len(extended)))
                deleted = root_deleted[p]
                for k in range(1, LIMIT + 1):
                    extended[k] += coefficient(deleted, k - 1)
                new_reserve = reserve(extended)
                increment = new_reserve - old_reserve
                new_alpha = max(alpha, 1 + root_deleted_alpha[p])
                new_cutoff = cutoff(new_alpha)
                totals["attachments"] += 1
                is_minimum = (
                    minimum_increment is None
                    or increment < minimum_increment
                )
                needs_witness = (
                    is_minimum
                    or (increment < 0 and first_negative_increment is None)
                    or (
                        4 < old_cutoff
                        and increment < 0
                        and first_q_lm_failure is None
                    )
                    or (
                        old_cutoff == 4
                        and new_cutoff == 5
                        and new_reserve < 0
                        and first_q_br_failure is None
                    )
                )
                increment_witness = None
                if needs_witness:
                    if code is None:
                        code = graph6(tree)
                    increment_witness = {
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment_vertex": p,
                        "attachment_degree": tree.degree(p),
                        "old_reserve": old_reserve,
                        "new_reserve": new_reserve,
                        "increment": increment,
                        "old_independence_number": alpha,
                        "new_independence_number": new_alpha,
                        "old_cutoff": old_cutoff,
                        "new_cutoff": new_cutoff,
                        "old_coefficients_0_to_5": list(whole),
                        "new_coefficients_0_to_5": extended,
                        "root_deleted_coefficients_0_to_4": list(
                            deleted[:5]
                        ),
                    }
                if is_minimum:
                    assert increment_witness is not None
                    minimum_increment = increment
                    minimum_increment_witness = increment_witness
                if increment < 0:
                    totals["negative_leaf_increments"] += 1
                    if first_negative_increment is None:
                        assert increment_witness is not None
                        first_negative_increment = increment_witness | {
                            "old_order": order
                        }
                if 4 < old_cutoff and increment < 0:
                    totals["q_lm_failures"] += 1
                    if first_q_lm_failure is None:
                        assert increment_witness is not None
                        first_q_lm_failure = increment_witness | {
                            "old_order": order
                        }
                if (
                    old_cutoff == 4
                    and new_cutoff == 5
                    and new_reserve < 0
                ):
                    totals["q_br_failures"] += 1
                    if first_q_br_failure is None:
                        assert increment_witness is not None
                        first_q_br_failure = increment_witness | {
                            "old_order": order
                        }

        per_order.append(
            {
                "old_order": order,
                "trees": order_trees,
                "attachments": order_trees * order,
                "minimum_reserve": minimum_reserve,
                "minimum_reserve_witness": minimum_reserve_witness,
                "minimum_leaf_increment": minimum_increment,
                "minimum_leaf_increment_witness": (
                    minimum_increment_witness
                ),
            }
        )
        print(
            f"n={order} trees={order_trees:,} "
            f"min_Q4={minimum_reserve} min_delta={minimum_increment}",
            flush=True,
        )

    payload = {
        "claim_scope": (
            "Exact exhaustive rank-4 Q reserve and leaf-increment scan "
            "on every unlabeled tree and attachment vertex in range."
        ),
        "parameters": {
            "min_order": args.min_order,
            "max_order": args.max_order,
            "out": str(args.out),
        },
        "totals": totals,
        "first_negative_reserve": first_negative_reserve,
        "first_negative_leaf_increment": first_negative_increment,
        "first_prefix_reserve_failure": first_prefix_failure,
        "first_q_lm_failure": first_q_lm_failure,
        "first_q_br_failure": first_q_br_failure,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    assert first_prefix_failure is None
    assert first_q_lm_failure is None
    assert first_q_br_failure is None
    print("finite rank-4 three-halves leaf scan: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
