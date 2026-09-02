#!/usr/bin/env python3
"""Exact scan of the one-child (unary) ACWF closure terms.

For a planted child state

    U = I(T-r),  D = x I(T-N[r]),  A = U+D,

adding a new parent with this state as its only child gives

    U' = A,  D' = xU.

After factorial transformation, write sigma(u)_k = k u_{k-1}.  The
parent's q=1 adaptive child-weighted inequality is

    Q = M_a + X(a,sigma(u)) >= 0.

This script checks the prefix range belonging to the *new parent* and
records whether the mixed term X is already nonnegative.  When X<0, it
also records the exact compensation ratio -X/M_a and decomposes the
child's available ACWF reserve.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
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


def minor(p: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(p, n - 1)
    )


def sigma(p: list[int]) -> list[int]:
    return [0] + [(k + 1) * value for k, value in enumerate(p)]


def item(
    *,
    order: int,
    tree_index: int,
    tree_code: str,
    root: int,
    parent: int | None,
    children: int,
    alpha_parent: int,
    cutoff_parent: int,
    m: int,
    n: int,
    ma: int,
    xas: int,
    target: int,
    child_acwf: int,
    U: list[int],
    D: list[int],
) -> dict:
    ratio = None
    if xas < 0 and ma > 0:
        ratio = str(Fraction(-xas, ma))
    return {
        "order": order,
        "tree_index": tree_index,
        "graph6": tree_code,
        "root": root,
        "parent": parent,
        "child_children": children,
        "alpha_new_parent": alpha_parent,
        "cutoff_new_parent": cutoff_parent,
        "m": m,
        "n": n,
        "M_A": ma,
        "X_A_sigmaU": xas,
        "target": target,
        "negative_mixed_compensation_ratio": ratio,
        "child_ACWF_same_minor": child_acwf,
        "U": U,
        "D": D,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--diagonal-only", action="store_true")
    parser.add_argument("--full-range", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "planted_child_states": 0,
        "prefix_checks": 0,
        "negative_mixed_terms": 0,
    }
    first_mixed_failure = None
    first_half_reserve_failure = None
    first_half_minus_child_acwf_failure = None
    first_target_failure = None
    worst_ratio_item = None
    worst_ratio = Fraction(-1, 1)
    per_child_count: dict[str, dict] = {}

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        order_trees = 0
        order_states = 0
        order_checks = 0
        for tree_index, tree in enumerate(trees):
            order_trees += 1
            totals["trees"] += 1
            tree_code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            positions = ip.position
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
                    parent_total = add(A, [0] + U)
                    alpha_parent = len(parent_total) - 1
                    cutoff_parent = (2 * alpha_parent + 1) // 3

                    uf = factorial_transform(U)
                    df = factorial_transform(D)
                    af = factorial_transform(A)
                    su = sigma(uf)
                    upper = max(len(af), len(su))

                    totals["planted_child_states"] += 1
                    order_states += 1
                    bucket = per_child_count.setdefault(
                        str(children),
                        {
                            "states": 0,
                            "prefix_checks": 0,
                            "negative_mixed_terms": 0,
                            "minimum_target": None,
                            "maximum_negative_mixed_ratio": None,
                        },
                    )
                    bucket["states"] += 1

                    m_stop = upper + 1 if args.full_range else min(
                        cutoff_parent, upper + 1
                    )
                    for m in range(m_stop):
                        ns = (m,) if args.diagonal_only else range(m + 1)
                        for n in ns:
                            ma = minor(af, m, n)
                            xas = mixed(af, su, m, n)
                            target = ma + xas
                            half_reserve = ma + 2 * xas
                            mu = minor(uf, m, n)
                            xud = mixed(uf, df, m, n)
                            child_acwf = (
                                abs(children - 2) * mu + children * xud
                            )
                            witness = item(
                                order=order,
                                tree_index=tree_index,
                                tree_code=tree_code,
                                root=root,
                                parent=parent,
                                children=children,
                                alpha_parent=alpha_parent,
                                cutoff_parent=cutoff_parent,
                                m=m,
                                n=n,
                                ma=ma,
                                xas=xas,
                                target=target,
                                child_acwf=child_acwf,
                                U=U,
                                D=D,
                            )
                            totals["prefix_checks"] += 1
                            order_checks += 1
                            bucket["prefix_checks"] += 1
                            old_min = bucket["minimum_target"]
                            if old_min is None or target < old_min:
                                bucket["minimum_target"] = target
                            if xas < 0:
                                totals["negative_mixed_terms"] += 1
                                bucket["negative_mixed_terms"] += 1
                                if first_mixed_failure is None:
                                    first_mixed_failure = witness
                                if ma > 0:
                                    ratio = Fraction(-xas, ma)
                                    if ratio > worst_ratio:
                                        worst_ratio = ratio
                                        worst_ratio_item = witness
                                    old_ratio = bucket[
                                        "maximum_negative_mixed_ratio"
                                    ]
                                    if (
                                        old_ratio is None
                                        or ratio > Fraction(old_ratio)
                                    ):
                                        bucket[
                                            "maximum_negative_mixed_ratio"
                                        ] = str(ratio)
                            if target < 0 and first_target_failure is None:
                                first_target_failure = witness
                            if (
                                half_reserve < 0
                                and first_half_reserve_failure is None
                            ):
                                first_half_reserve_failure = witness | {
                                    "M_A_plus_2X": half_reserve
                                }
                            if (
                                children >= 1
                                and
                                half_reserve - child_acwf < 0
                                and first_half_minus_child_acwf_failure is None
                            ):
                                first_half_minus_child_acwf_failure = (
                                    witness
                                    | {
                                        "M_A_plus_2X": half_reserve,
                                        "difference_from_child_ACWF": (
                                            half_reserve - child_acwf
                                        ),
                                    }
                                )

        print(
            f"n={order}: trees={order_trees:,} states={order_states:,} "
            f"prefix checks={order_checks:,}",
            flush=True,
        )
        if first_target_failure is not None:
            break

    payload = {
        "status": (
            "unary_prefix_failure"
            if first_target_failure is not None
            else "no_unary_prefix_failure"
        ),
        "parameters": {
            "max_order": args.max_order,
            "diagonal_only": args.diagonal_only,
            "full_range": args.full_range,
        },
        "totals": totals,
        "per_child_count": per_child_count,
        "first_negative_mixed_term": first_mixed_failure,
        "first_M_A_plus_2X_failure": first_half_reserve_failure,
        "first_M_A_plus_2X_minus_child_ACWF_failure": (
            first_half_minus_child_acwf_failure
        ),
        "worst_negative_mixed_ratio": (
            None if worst_ratio_item is None else str(worst_ratio)
        ),
        "worst_negative_mixed_ratio_item": worst_ratio_item,
        "first_target_failure": first_target_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_target_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
