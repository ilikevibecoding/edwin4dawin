#!/usr/bin/env python3
"""Fast exact scan of a chosen factorial-curvature rank under leaf addition."""

from __future__ import annotations

import argparse
import json
import time
from functools import lru_cache
from math import factorial
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6


def add(a, b, limit):
    return tuple(
        (a[k] if k < len(a) else 0) + (b[k] if k < len(b) else 0)
        for k in range(min(limit + 1, max(len(a), len(b))))
    )


def mul(a, b, limit):
    out = [0] * min(limit + 1, len(a) + len(b) - 1)
    for i, avalue in enumerate(a):
        for j, bvalue in enumerate(b):
            if i + j > limit:
                break
            out[i + j] += avalue * bvalue
    return tuple(out)


def shift(a, limit):
    return (0,) + a[:limit]


def coefficient(a, k):
    return a[k] if k < len(a) else 0


def curvature(coefficients, rank):
    h = factorial(rank) * coefficient(coefficients, rank)
    hm = factorial(rank - 1) * coefficient(coefficients, rank - 1)
    hp = factorial(rank + 1) * coefficient(coefficients, rank + 1)
    return h * h - hm * hp


def all_root_states(tree, limit):
    @lru_cache(maxsize=None)
    def message(u, parent):
        excluded = (1,)
        included_base = (1,)
        for w in tree[u]:
            if w == parent:
                continue
            child_excluded, child_total = message(w, u)
            excluded = mul(excluded, child_total, limit)
            included_base = mul(
                included_base, child_excluded, limit
            )
        total = add(excluded, shift(included_base, limit), limit)
        return excluded, total

    root_deleted = {}
    whole = None
    for p in tree:
        excluded, total = message(p, -1)
        root_deleted[p] = excluded
        if whole is None:
            whole = total
        else:
            assert whole == total
    return root_deleted, whole


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rank", type=int, required=True)
    parser.add_argument("--min-order", type=int, required=True)
    parser.add_argument("--max-order", type=int, required=True)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--stop-index", type=int)
    parser.add_argument("--progress-every", type=int, default=25_000)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    assert args.rank >= 1
    limit = args.rank + 1

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "negative_curvatures": 0,
        "negative_leaf_increments": 0,
    }
    first_negative_curvature = None
    first_negative_increment = None
    per_order = []

    for order in range(args.min_order, args.max_order + 1):
        order_started = time.time()
        order_trees = 0
        minimum_curvature = None
        minimum_curvature_witness = None
        minimum_increment = None
        minimum_increment_witness = None
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            if tree_index < args.start_index:
                continue
            if (
                args.stop_index is not None
                and tree_index >= args.stop_index
            ):
                break
            order_trees += 1
            totals["trees"] += 1
            root_deleted, whole = all_root_states(tree, limit)
            old_curvature = curvature(whole, args.rank)
            if (
                minimum_curvature is None
                or old_curvature < minimum_curvature
            ):
                minimum_curvature = old_curvature
                minimum_curvature_witness = {
                    "tree_index": tree_index,
                    "graph6": graph6(tree),
                    "coefficients": whole,
                    "curvature": old_curvature,
                }
            if old_curvature < 0:
                totals["negative_curvatures"] += 1
                if first_negative_curvature is None:
                    first_negative_curvature = (
                        minimum_curvature_witness | {"order": order}
                    )
            for p in tree:
                extended = list(whole)
                if len(extended) < limit + 1:
                    extended.extend(
                        [0] * (limit + 1 - len(extended))
                    )
                b = root_deleted[p]
                for k in range(1, limit + 1):
                    extended[k] += coefficient(b, k - 1)
                new_curvature = curvature(extended, args.rank)
                increment = new_curvature - old_curvature
                totals["attachments"] += 1
                if (
                    minimum_increment is None
                    or increment < minimum_increment
                ):
                    minimum_increment = increment
                    minimum_increment_witness = {
                        "tree_index": tree_index,
                        "graph6": graph6(tree),
                        "attachment_vertex": p,
                        "attachment_degree": tree.degree(p),
                        "old_curvature": old_curvature,
                        "new_curvature": new_curvature,
                        "increment": increment,
                        "old_coefficients": whole,
                        "new_coefficients": extended,
                        "root_deleted_coefficients": b,
                    }
                if increment < 0:
                    totals["negative_leaf_increments"] += 1
                    if first_negative_increment is None:
                        first_negative_increment = (
                            minimum_increment_witness | {"order": order}
                        )
            if (
                args.progress_every
                and order_trees % args.progress_every == 0
            ):
                print(
                    f"n={order} trees={order_trees:,} "
                    f"min_C={minimum_curvature} "
                    f"min_delta={minimum_increment}",
                    flush=True,
                )
        per_order.append(
            {
                "order": order,
                "start_index": args.start_index,
                "stop_index": args.stop_index,
                "trees": order_trees,
                "attachments": order_trees * order,
                "minimum_curvature": minimum_curvature,
                "minimum_curvature_witness": minimum_curvature_witness,
                "minimum_leaf_increment": minimum_increment,
                "minimum_leaf_increment_witness": (
                    minimum_increment_witness
                ),
                "elapsed_seconds": time.time() - order_started,
            }
        )
        print(
            f"n={order} complete trees={order_trees:,} "
            f"min_C={minimum_curvature} min_delta={minimum_increment}",
            flush=True,
        )

    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "totals": totals,
        "first_negative_curvature": first_negative_curvature,
        "first_negative_leaf_increment": first_negative_increment,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        "fixed-rank leaf-curvature scan:",
        (
            "FAILURE FOUND"
            if first_negative_increment is not None
            else "NO FAILURE"
        ),
    )
    return 1 if first_negative_increment is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
