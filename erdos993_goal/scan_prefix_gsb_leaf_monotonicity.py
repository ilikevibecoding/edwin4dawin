#!/usr/bin/env python3
"""Exact leaf-monotonicity scan for the prefix one-unit drift reserve.

For ``P=sum a_k x^k`` define

    G_k(P) = k a_k^2 + a_{k-1}a_k
             -(k+1)a_{k-1}a_{k+1}.

Nonnegativity is equivalent to

    mu_k <= mu_{k-1}+1,
    mu_j=(j+1)a_{j+1}/a_j.

Prefix GSB plus the known decreasing tail proves unimodality.  This scan
tests whether G_k is nondecreasing when one leaf is attached and whether a
newly exposed cutoff rank starts nonnegative.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def shifted_add(old: list[int], deletion: list[int]) -> list[int]:
    new = old[:] + [0]
    for k, value in enumerate(deletion, start=1):
        new[k] += value
    while len(new) > 1 and new[-1] == 0:
        new.pop()
    return new


def coeff(poly: list[int], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def reserve(poly: list[int], k: int) -> int:
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "all_rank_checks": 0,
        "prefix_checks": 0,
        "negative_all_rank_deltas": 0,
        "negative_prefix_deltas": 0,
        "cutoff_increases": 0,
        "negative_new_boundary_reserves": 0,
    }
    first_negative_all_rank_delta = None
    first_negative_prefix_delta = None
    first_negative_boundary = None
    minimum_prefix_delta = None
    minimum_boundary = None
    per_order = []

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        row = {
            "order": order,
            "trees": 0,
            "attachments": 0,
            "all_rank_checks": 0,
            "prefix_checks": 0,
            "negative_all_rank_deltas": 0,
            "negative_prefix_deltas": 0,
        }
        for tree_index, tree in enumerate(trees):
            row["trees"] += 1
            totals["trees"] += 1
            ip = MaskIndependencePolynomial(tree)
            full = (1 << order) - 1
            old = list(ip.polynomial(full))
            old_cutoff = (2 * (len(old) - 1) + 1) // 3
            code = graph6(tree)
            for attachment in tree:
                deletion = list(
                    ip.polynomial(full ^ (1 << ip.position[attachment]))
                )
                new = shifted_add(old, deletion)
                new_cutoff = (2 * (len(new) - 1) + 1) // 3
                totals["attachments"] += 1
                row["attachments"] += 1

                if new_cutoff == old_cutoff + 1:
                    totals["cutoff_increases"] += 1
                    boundary_value = reserve(new, old_cutoff)
                    boundary_item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment": attachment,
                        "old_alpha": len(old) - 1,
                        "new_alpha": len(new) - 1,
                        "old_cutoff": old_cutoff,
                        "new_cutoff": new_cutoff,
                        "rank": old_cutoff,
                        "new_boundary_reserve": boundary_value,
                        "old": old,
                        "deletion": deletion,
                        "new": new,
                    }
                    if (
                        minimum_boundary is None
                        or boundary_value
                        < minimum_boundary["new_boundary_reserve"]
                    ):
                        minimum_boundary = boundary_item
                    if boundary_value < 0:
                        totals["negative_new_boundary_reserves"] += 1
                        if first_negative_boundary is None:
                            first_negative_boundary = boundary_item

                upper = max(len(old), len(new))
                for k in range(1, upper):
                    old_value = reserve(old, k)
                    new_value = reserve(new, k)
                    delta = new_value - old_value
                    prefix = k < new_cutoff
                    totals["all_rank_checks"] += 1
                    row["all_rank_checks"] += 1
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment": attachment,
                        "old_alpha": len(old) - 1,
                        "new_alpha": len(new) - 1,
                        "old_cutoff": old_cutoff,
                        "new_cutoff": new_cutoff,
                        "rank": k,
                        "old_reserve": old_value,
                        "new_reserve": new_value,
                        "delta": delta,
                        "prefix": prefix,
                        "old": old,
                        "deletion": deletion,
                        "new": new,
                    }
                    if delta < 0:
                        totals["negative_all_rank_deltas"] += 1
                        row["negative_all_rank_deltas"] += 1
                        if first_negative_all_rank_delta is None:
                            first_negative_all_rank_delta = item
                    if prefix:
                        totals["prefix_checks"] += 1
                        row["prefix_checks"] += 1
                        if (
                            minimum_prefix_delta is None
                            or delta < minimum_prefix_delta["delta"]
                        ):
                            minimum_prefix_delta = item
                        if delta < 0:
                            totals["negative_prefix_deltas"] += 1
                            row["negative_prefix_deltas"] += 1
                            if first_negative_prefix_delta is None:
                                first_negative_prefix_delta = item

        per_order.append(row)
        print(
            f"n={order}: trees={row['trees']:,} "
            f"attachments={row['attachments']:,} "
            f"prefix={row['prefix_checks']:,} "
            f"negative prefix delta={row['negative_prefix_deltas']:,}",
            flush=True,
        )
        if first_negative_prefix_delta is not None:
            break

    payload = {
        "status": (
            "prefix_gsb_leaf_monotonicity_failure"
            if first_negative_prefix_delta is not None
            else "no_prefix_gsb_leaf_monotonicity_failure"
        ),
        "claim_tested": (
            "G_k(I(T+leaf))>=G_k(I(T)) for k below the new "
            "decreasing-tail cutoff, plus nonnegative newly exposed rank"
        ),
        "parameters": {"max_order": args.max_order},
        "totals": totals,
        "first_negative_all_rank_delta": first_negative_all_rank_delta,
        "first_negative_prefix_delta": first_negative_prefix_delta,
        "minimum_prefix_delta": minimum_prefix_delta,
        "minimum_new_boundary_reserve": minimum_boundary,
        "first_negative_new_boundary_reserve": first_negative_boundary,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": payload["status"],
                "totals": totals,
                "minimum_prefix_delta": (
                    None
                    if minimum_prefix_delta is None
                    else {
                        key: minimum_prefix_delta[key]
                        for key in (
                            "order",
                            "graph6",
                            "attachment",
                            "rank",
                            "delta",
                        )
                    }
                ),
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if first_negative_prefix_delta is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
