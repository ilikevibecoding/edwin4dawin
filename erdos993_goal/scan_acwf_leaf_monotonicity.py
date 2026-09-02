#!/usr/bin/env python3
"""Test leaf-addition monotonicity of the adaptive ACWF reserve.

For a planted state with q children, let

    G(U,D;m,n)=|q-2| M_F(U)(m,n)+q X_F(U,D)(m,n).

Choose a leaf of the root-deleted forest which is not one of the q marked
child roots.  Deleting that leaf preserves q.  This script compares the
exact reserve before and after the deletion.

If G never decreases when such a leaf is added, the invariant reduces to
the q isolated marked-vertex base.  Full-range monotonicity cannot hold
because ACWF has known tail failures, so the important question is whether
any decrease occurs while the larger state is below its decreasing-tail
cutoff.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import networkx as nx

from adaptive_child_weighted_scan import planted_mask
from leaf_addition_pendant_decomposition_scan import mixed
from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    add,
    coeff,
    factorial_transform,
    graph6,
)


def reserve(
    uf: list[int],
    df: list[int],
    q: int,
    m: int,
    n: int,
) -> int:
    mu = (
        coeff(uf, m) * coeff(uf, n)
        - coeff(uf, m + 1) * coeff(uf, n - 1)
    )
    return abs(q - 2) * mu + q * mixed(uf, df, m, n)


def state(
    ip: MaskIndependencePolynomial,
    tree: nx.Graph,
    mask: int,
    root: int,
) -> tuple[list[int], list[int], list[int], int]:
    positions = ip.position
    root_bit = 1 << positions[root]
    U = list(ip.polynomial(mask ^ root_bit))
    closed = root_bit
    q = 0
    for neighbor in tree[root]:
        bit = 1 << positions[neighbor]
        if mask & bit:
            q += 1
            closed |= bit
    D = [0] + list(ip.polynomial(mask & ~closed))
    A = add(U, D)
    return U, D, A, q


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
        "eligible_leaf_deletions": 0,
        "minor_comparisons": 0,
        "prefix_comparisons": 0,
        "negative_deltas": 0,
        "negative_prefix_deltas": 0,
        "cutoff_increase_deletions": 0,
        "new_boundary_checks": 0,
        "negative_new_boundary_reserves": 0,
        "negative_total_curvature_prefix_deltas": 0,
        "negative_total_curvature_deltas": 0,
        "negative_new_boundary_total_curvatures": 0,
        "leaf_multiplier_logconcavity_failures": 0,
    }
    first_negative = None
    first_negative_prefix = None
    first_negative_boundary = None
    minimum_boundary = None
    first_negative_total_curvature_prefix_delta = None
    first_negative_total_curvature_delta = None
    first_negative_boundary_total_curvature = None
    minimum_boundary_total_curvature = None
    first_leaf_multiplier_logconcavity_failure = None

    for order in range(3, args.max_order + 1):
        order_deletions = 0
        order_checks = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            totals["trees"] += 1
            tree_code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            positions = ip.position
            for root in tree:
                for parent in [None, *tree[root]]:
                    mask = planted_mask(tree, positions, root, parent)
                    U, D, A, q = state(ip, tree, mask, root)
                    totals["planted_states"] += 1
                    if q == 0:
                        continue
                    marked = {
                        v
                        for v in tree[root]
                        if mask & (1 << positions[v])
                    }
                    leaves = []
                    for vertex in tree:
                        bit = 1 << positions[vertex]
                        if not (mask & bit) or vertex == root or vertex in marked:
                            continue
                        degree_in_mask = sum(
                            bool(mask & (1 << positions[w]))
                            for w in tree[vertex]
                        )
                        if degree_in_mask == 1:
                            leaves.append(vertex)

                    af = factorial_transform(A)
                    uf = factorial_transform(U)
                    df = factorial_transform(D)
                    cutoff = (2 * (len(A) - 1) + 1) // 3
                    for leaf in leaves:
                        reduced_mask = mask ^ (1 << positions[leaf])
                        U0, D0, A0, q0 = state(
                            ip, tree, reduced_mask, root
                        )
                        assert q0 == q
                        u0f = factorial_transform(U0)
                        d0f = factorial_transform(D0)
                        a0f = factorial_transform(A0)
                        cutoff0 = (2 * (len(A0) - 1) + 1) // 3
                        upper = max(len(uf), len(df), len(u0f), len(d0f))
                        totals["eligible_leaf_deletions"] += 1
                        order_deletions += 1
                        if cutoff == cutoff0 + 1:
                            totals["cutoff_increase_deletions"] += 1
                        for m in range(upper + 1):
                            ns = (m,) if args.diagonal_only else range(m + 1)
                            for n in ns:
                                old = reserve(u0f, d0f, q, m, n)
                                new = reserve(uf, df, q, m, n)
                                delta = new - old
                                prefix = m < cutoff
                                totals["minor_comparisons"] += 1
                                order_checks += 1
                                if args.diagonal_only:
                                    old_total_curvature = (
                                        coeff(a0f, m) ** 2
                                        - coeff(a0f, m + 1)
                                        * coeff(a0f, m - 1)
                                    )
                                    new_total_curvature = (
                                        coeff(af, m) ** 2
                                        - coeff(af, m + 1)
                                        * coeff(af, m - 1)
                                    )
                                    curvature_delta = (
                                        new_total_curvature
                                        - old_total_curvature
                                    )
                                    if curvature_delta < 0:
                                        totals[
                                            "negative_total_curvature_deltas"
                                        ] += 1
                                        curvature_witness = {
                                            "order": order,
                                            "tree_index": tree_index,
                                            "graph6": tree_code,
                                            "root": root,
                                            "parent": parent,
                                            "deleted_leaf": leaf,
                                            "children": q,
                                            "alpha": len(A) - 1,
                                            "cutoff": cutoff,
                                            "rank": m,
                                            "old_curvature": old_total_curvature,
                                            "new_curvature": new_total_curvature,
                                            "delta": curvature_delta,
                                            "prefix": prefix,
                                            "A_old": A0,
                                            "A_new": A,
                                        }
                                        if (
                                            first_negative_total_curvature_delta
                                            is None
                                        ):
                                            first_negative_total_curvature_delta = (
                                                curvature_witness
                                            )
                                if prefix:
                                    totals["prefix_comparisons"] += 1
                                    if args.diagonal_only:
                                        multiplier_gap = (
                                            coeff(A, m) ** 2
                                            * coeff(A0, m - 1)
                                            * coeff(A0, m + 1)
                                            - coeff(A0, m) ** 2
                                            * coeff(A, m - 1)
                                            * coeff(A, m + 1)
                                        )
                                        if multiplier_gap < 0:
                                            totals[
                                                "leaf_multiplier_logconcavity_failures"
                                            ] += 1
                                            if (
                                                first_leaf_multiplier_logconcavity_failure
                                                is None
                                            ):
                                                first_leaf_multiplier_logconcavity_failure = {
                                                    "order": order,
                                                    "tree_index": tree_index,
                                                    "graph6": tree_code,
                                                    "root": root,
                                                    "parent": parent,
                                                    "deleted_leaf": leaf,
                                                    "children": q,
                                                    "alpha": len(A) - 1,
                                                    "cutoff": cutoff,
                                                    "rank": m,
                                                    "multiplier_gap": (
                                                        multiplier_gap
                                                    ),
                                                    "A_old": A0,
                                                    "A_new": A,
                                                }
                                        if curvature_delta < 0:
                                            totals[
                                                "negative_total_curvature_prefix_deltas"
                                            ] += 1
                                            if (
                                                first_negative_total_curvature_prefix_delta
                                                is None
                                            ):
                                                first_negative_total_curvature_prefix_delta = {
                                                    "order": order,
                                                    "tree_index": tree_index,
                                                    "graph6": tree_code,
                                                    "root": root,
                                                    "parent": parent,
                                                    "deleted_leaf": leaf,
                                                    "children": q,
                                                    "alpha": len(A) - 1,
                                                    "cutoff": cutoff,
                                                    "rank": m,
                                                    "old_curvature": old_total_curvature,
                                                    "new_curvature": new_total_curvature,
                                                    "delta": curvature_delta,
                                                    "A_old": A0,
                                                    "A_new": A,
                                                }
                                if delta < 0:
                                    totals["negative_deltas"] += 1
                                    witness = {
                                        "order": order,
                                        "tree_index": tree_index,
                                        "graph6": tree_code,
                                        "root": root,
                                        "parent": parent,
                                        "deleted_leaf": leaf,
                                        "children": q,
                                        "alpha": len(A) - 1,
                                        "cutoff": cutoff,
                                        "m": m,
                                        "n": n,
                                        "old_reserve": old,
                                        "new_reserve": new,
                                        "delta": delta,
                                        "prefix": prefix,
                                        "U_old": U0,
                                        "D_old": D0,
                                        "U_new": U,
                                        "D_new": D,
                                    }
                                    if first_negative is None:
                                        first_negative = witness
                                    if prefix:
                                        totals["negative_prefix_deltas"] += 1
                                        if first_negative_prefix is None:
                                            first_negative_prefix = witness
                                if (
                                    args.diagonal_only
                                    and cutoff == cutoff0 + 1
                                    and m == cutoff0
                                    and n == m
                                ):
                                    totals["new_boundary_checks"] += 1
                                    boundary_item = {
                                        "order": order,
                                        "tree_index": tree_index,
                                        "graph6": tree_code,
                                        "root": root,
                                        "parent": parent,
                                        "deleted_leaf": leaf,
                                        "children": q,
                                        "alpha_old": len(A0) - 1,
                                        "alpha_new": len(A) - 1,
                                        "cutoff_old": cutoff0,
                                        "cutoff_new": cutoff,
                                        "rank": m,
                                        "old_reserve": old,
                                        "new_reserve": new,
                                        "delta": delta,
                                        "U_old": U0,
                                        "D_old": D0,
                                        "U_new": U,
                                        "D_new": D,
                                    }
                                    if (
                                        minimum_boundary is None
                                        or new < minimum_boundary[
                                            "new_reserve"
                                        ]
                                    ):
                                        minimum_boundary = boundary_item
                                    if new < 0:
                                        totals[
                                            "negative_new_boundary_reserves"
                                        ] += 1
                                        if first_negative_boundary is None:
                                            first_negative_boundary = (
                                                boundary_item
                                            )
                                    boundary_old_total = (
                                        coeff(a0f, m) ** 2
                                        - coeff(a0f, m + 1)
                                        * coeff(a0f, m - 1)
                                    )
                                    boundary_new_total = (
                                        coeff(af, m) ** 2
                                        - coeff(af, m + 1)
                                        * coeff(af, m - 1)
                                    )
                                    total_boundary_item = boundary_item | {
                                        "old_total_curvature": (
                                            boundary_old_total
                                        ),
                                        "new_total_curvature": (
                                            boundary_new_total
                                        ),
                                        "total_curvature_delta": (
                                            boundary_new_total
                                            - boundary_old_total
                                        ),
                                    }
                                    if (
                                        minimum_boundary_total_curvature
                                        is None
                                        or boundary_new_total
                                        < minimum_boundary_total_curvature[
                                            "new_total_curvature"
                                        ]
                                    ):
                                        minimum_boundary_total_curvature = (
                                            total_boundary_item
                                        )
                                    if boundary_new_total < 0:
                                        totals[
                                            "negative_new_boundary_total_curvatures"
                                        ] += 1
                                        if (
                                            first_negative_boundary_total_curvature
                                            is None
                                        ):
                                            first_negative_boundary_total_curvature = (
                                                total_boundary_item
                                            )
        print(
            f"n={order}: deletions={order_deletions:,} "
            f"minor comparisons={order_checks:,}",
            flush=True,
        )
        if first_negative_prefix is not None:
            break

    payload = {
        "status": (
            "prefix_monotonicity_failure"
            if first_negative_prefix is not None
            else "no_prefix_monotonicity_failure"
        ),
        "parameters": {
            "max_order": args.max_order,
            "diagonal_only": args.diagonal_only,
        },
        "totals": totals,
        "first_negative_delta": first_negative,
        "first_negative_prefix_delta": first_negative_prefix,
        "minimum_new_boundary_reserve": minimum_boundary,
        "first_negative_new_boundary_reserve": first_negative_boundary,
        "first_negative_total_curvature_prefix_delta": (
            first_negative_total_curvature_prefix_delta
        ),
        "first_negative_total_curvature_delta": (
            first_negative_total_curvature_delta
        ),
        "minimum_new_boundary_total_curvature": (
            minimum_boundary_total_curvature
        ),
        "first_negative_new_boundary_total_curvature": (
            first_negative_boundary_total_curvature
        ),
        "first_leaf_multiplier_logconcavity_failure": (
            first_leaf_multiplier_logconcavity_failure
        ),
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_negative_prefix is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
