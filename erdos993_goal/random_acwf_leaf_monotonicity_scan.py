#!/usr/bin/env python3
"""Random exact stress test of prefix ACWF leaf-addition monotonicity."""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_decomposition_scan import mixed
from leaf_addition_pendant_monotonicity_scan import (
    add,
    coeff,
    factorial_transform,
)
from scan_acwf_leaf_monotonicity import reserve
from toeplitz_pair_closure_search import mul


def rooted_state(
    tree: nx.Graph,
    root: int,
) -> tuple[list[int], list[int], list[int], int]:
    parent = {root: None}
    order = [root]
    for vertex in order:
        for neighbor in tree[vertex]:
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            order.append(neighbor)

    excluded: dict[int, list[int]] = {}
    total: dict[int, list[int]] = {}
    for vertex in reversed(order):
        e = [1]
        j = [1]
        for neighbor in tree[vertex]:
            if parent.get(neighbor) == vertex:
                e = mul(e, total[neighbor])
                j = mul(j, excluded[neighbor])
        d = [0] + j
        excluded[vertex] = e
        total[vertex] = add(e, d)
    U = excluded[root]
    A = total[root]
    D = [coeff(A, k) - coeff(U, k) for k in range(len(A))]
    return U, D, A, tree.degree(root)


def random_tree(rng: random.Random, order: int) -> nx.Graph:
    code = [rng.randrange(order) for _ in range(order - 2)]
    return nx.from_prufer_sequence(code)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=20_000)
    parser.add_argument("--min-order", type=int, default=15)
    parser.add_argument("--max-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--off-diagonal", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    totals = {
        "trees_generated": 0,
        "eligible_trials": 0,
        "prefix_comparisons": 0,
    }
    first_failure = None
    first_total_curvature_failure = None
    smallest_positive = None

    for trial in range(args.trials):
        order = rng.randint(args.min_order, args.max_order)
        tree = random_tree(rng, order)
        totals["trees_generated"] += 1
        root = rng.randrange(order)
        candidates = [
            v
            for v in tree
            if tree.degree(v) == 1
            and v != root
            and not tree.has_edge(root, v)
        ]
        if not candidates:
            continue
        leaf = rng.choice(candidates)
        U1, D1, A1, q = rooted_state(tree, root)
        tree0 = tree.copy()
        tree0.remove_node(leaf)
        U0, D0, _A0, q0 = rooted_state(tree0, root)
        assert q0 == q
        u1 = factorial_transform(U1)
        d1 = factorial_transform(D1)
        u0 = factorial_transform(U0)
        d0 = factorial_transform(D0)
        a1f = factorial_transform(A1)
        a0f = factorial_transform(_A0)
        cutoff = (2 * (len(A1) - 1) + 1) // 3
        totals["eligible_trials"] += 1

        for m in range(cutoff):
            ns = range(m + 1) if args.off_diagonal else (m,)
            for n in ns:
                old = reserve(u0, d0, q, m, n)
                new = reserve(u1, d1, q, m, n)
                delta = new - old
                totals["prefix_comparisons"] += 1
                item = {
                    "trial": trial,
                    "order": order,
                    "root": root,
                    "leaf": leaf,
                    "children": q,
                    "alpha": len(A1) - 1,
                    "cutoff": cutoff,
                    "m": m,
                    "n": n,
                    "old_reserve": old,
                    "new_reserve": new,
                    "delta": delta,
                    "prufer": nx.to_prufer_sequence(tree),
                    "U_old": U0,
                    "D_old": D0,
                    "U_new": U1,
                    "D_new": D1,
                }
                if delta < 0 and first_failure is None:
                    first_failure = item
                    break
                if m == n:
                    total_old = (
                        coeff(a0f, m) ** 2
                        - coeff(a0f, m + 1) * coeff(a0f, m - 1)
                    )
                    total_new = (
                        coeff(a1f, m) ** 2
                        - coeff(a1f, m + 1) * coeff(a1f, m - 1)
                    )
                    if (
                        total_new - total_old < 0
                        and first_total_curvature_failure is None
                    ):
                        first_total_curvature_failure = item | {
                            "old_total_curvature": total_old,
                            "new_total_curvature": total_new,
                            "total_curvature_delta": total_new - total_old,
                        }
                if delta > 0 and (
                    smallest_positive is None
                    or delta < smallest_positive["delta"]
                ):
                    smallest_positive = item
            if first_failure is not None:
                break
        if first_failure is not None:
            break
        if (trial + 1) % 2_000 == 0:
            print(
                f"trials={trial + 1:,} "
                f"comparisons={totals['prefix_comparisons']:,}",
                flush=True,
            )

    payload = {
        "status": (
            "prefix_monotonicity_failure"
            if first_failure is not None
            else "no_prefix_monotonicity_failure"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        "totals": totals,
        "first_failure": first_failure,
        "first_total_curvature_failure": first_total_curvature_failure,
        "smallest_positive_delta": smallest_positive,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
