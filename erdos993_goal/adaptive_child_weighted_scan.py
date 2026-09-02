#!/usr/bin/env python3
"""Exact scan of a cutoff-aware invariant for every planted tree state.

For a planted rooted tree with q children, write

    U = product A_i,       D = x product U_i,       A = U+D,

and factorial-transform coefficients by F(P)_k=k![x^k]P.  For m>=n let
M and X be the ordinary and symmetric mixed Toeplitz minors of F(U),F(D).
This script tests

    |q-2| M_U(m,n) + q X_{U,D}(m,n) >= 0.          (ACWF)

The coefficient |q-2| is forced by the two exceptional child counts:

* q=1: ACWF is exactly wide-minor dominance M_A>=M_D;
* q=2: ACWF is partial synchronization of U and D;
* q>=3: ACWF is the previously observed child-weighted invariant.

On the diagonal, ACWF plus factorial log-concavity of U and D implies
factorial log-concavity of A because |q-2|<=q for q>=1.  Therefore prefix
closure of ACWF would prove the prefix ordered-log-concavity reduction.
This executable supplies exact finite evidence; it is not a proof.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_decomposition_scan import mixed
from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    add,
    coeff,
    factorial_transform,
    graph6,
)


def planted_mask(
    tree: nx.Graph,
    positions: dict[int, int],
    root: int,
    parent: int | None,
) -> int:
    seen = {parent} if parent is not None else set()
    stack = [root]
    mask = 0
    while stack:
        vertex = stack.pop()
        if vertex in seen:
            continue
        seen.add(vertex)
        mask |= 1 << positions[vertex]
        stack.extend(tree[vertex])
    return mask


def witness(
    *,
    order: int,
    tree_index: int,
    tree_code: str,
    root: int,
    parent: int | None,
    children: int,
    alpha: int,
    cutoff: int,
    m: int,
    n: int,
    minor_u: int,
    interaction: int,
    gap: int,
    U: list[int],
    D: list[int],
) -> dict:
    return {
        "order": order,
        "tree_index": tree_index,
        "graph6": tree_code,
        "root": root,
        "parent": parent,
        "children": children,
        "weight": abs(children - 2),
        "alpha": alpha,
        "cutoff": cutoff,
        "m": m,
        "n": n,
        "minor_U": minor_u,
        "interaction": interaction,
        "gap": gap,
        "U": U,
        "D": D,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--diagonal-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "planted_states": 0,
        "minor_checks": 0,
        "prefix_minor_checks": 0,
    }
    first_full_failure = None
    first_prefix_failure = None
    per_order = []

    for order in range(2, args.max_order + 1):
        order_totals = {
            "order": order,
            "trees": 0,
            "planted_states": 0,
            "minor_checks": 0,
            "prefix_minor_checks": 0,
        }
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree_code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            positions = ip.position
            totals["trees"] += 1
            order_totals["trees"] += 1

            for root in tree:
                for parent in [None, *tree[root]]:
                    mask = planted_mask(tree, positions, root, parent)
                    root_bit = 1 << positions[root]
                    U = list(ip.polynomial(mask ^ root_bit))
                    closed_root = root_bit
                    children = 0
                    for neighbor in tree[root]:
                        bit = 1 << positions[neighbor]
                        if mask & bit:
                            children += 1
                            closed_root |= bit
                    J = list(ip.polynomial(mask & ~closed_root))
                    D = [0] + J
                    A = add(U, D)
                    alpha = len(A) - 1
                    cutoff = (2 * alpha + 1) // 3
                    uf = factorial_transform(U)
                    df = factorial_transform(D)
                    upper = max(len(uf), len(df))
                    weight = abs(children - 2)

                    totals["planted_states"] += 1
                    order_totals["planted_states"] += 1
                    for m in range(upper + 1):
                        ns = (m,) if args.diagonal_only else range(m + 1)
                        for n in ns:
                            minor_u = (
                                coeff(uf, m) * coeff(uf, n)
                                - coeff(uf, m + 1) * coeff(uf, n - 1)
                            )
                            interaction = mixed(uf, df, m, n)
                            gap = (
                                weight * minor_u
                                + children * interaction
                            )
                            totals["minor_checks"] += 1
                            order_totals["minor_checks"] += 1
                            if m < cutoff:
                                totals["prefix_minor_checks"] += 1
                                order_totals["prefix_minor_checks"] += 1
                            if gap < 0:
                                item = witness(
                                    order=order,
                                    tree_index=tree_index,
                                    tree_code=tree_code,
                                    root=root,
                                    parent=parent,
                                    children=children,
                                    alpha=alpha,
                                    cutoff=cutoff,
                                    m=m,
                                    n=n,
                                    minor_u=minor_u,
                                    interaction=interaction,
                                    gap=gap,
                                    U=U,
                                    D=D,
                                )
                                if first_full_failure is None:
                                    first_full_failure = item
                                if (
                                    m < cutoff
                                    and first_prefix_failure is None
                                ):
                                    first_prefix_failure = item

        per_order.append(order_totals)
        print(
            f"n={order}: trees={order_totals['trees']:,} "
            f"states={order_totals['planted_states']:,} "
            f"minors={order_totals['minor_checks']:,}",
            flush=True,
        )
        if first_prefix_failure is not None:
            break

    payload = {
        "status": (
            "prefix_failure"
            if first_prefix_failure is not None
            else "no_prefix_failure"
        ),
        "claim": (
            "|q-2| M_U(m,n)+q X_UD(m,n)>=0 whenever m is below "
            "the decreasing-tail cutoff of the planted total A=U+D"
        ),
        "parameters": {
            "max_order": args.max_order,
            "diagonal_only": args.diagonal_only,
        },
        "totals": totals,
        "first_full_failure": first_full_failure,
        "first_prefix_failure": first_prefix_failure,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
