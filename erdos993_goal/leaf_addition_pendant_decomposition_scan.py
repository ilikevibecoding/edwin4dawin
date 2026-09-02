#!/usr/bin/env python3
"""Test the exact two-state decomposition of pendant-reserve leaf gain.

The notation and state construction are those of
``leaf_addition_pendant_monotonicity_scan.py``.  If a new leaf is attached
to a non-root vertex, write the old and new pendant pairs as

    (P_new,S_new) = (P_old,S_old) + x(A,B),
    (P_old,S_old) = (A,B) + x(Z,W).

Set

    C = (R-1)A + 2(R+1)B,
    D = (R-1)Z + 2(R+1)W.

For factorial-transformed sequences, let X(F,G;m,n) denote the symmetric
mixed Toeplitz minor.  Direct algebra gives

  2 (Q_new(k)-Q_old(k))
    = k^2 T(k-1,k-1) + (k-1) X(A,C;k,k-1) + E(k),

where

    T = X(A,C) + X(Z,C) + X(A,D)
      = 2 (Q_R(A+Z,B+W) - Q_R(Z,W))

and E(k) is an explicit sum of nonnegative coefficient products.

The two terms need not be nonnegative separately.  A still-sufficient,
strictly sharper proof obligation is

    k^2 T(k-1,k-1) + (k-1) X(A,C;k,k-1) >= 0,

because E(k) is visibly nonnegative.  This script verifies the identity
and scans this combined core exactly; it also records failures of the
separate stronger conditions as diagnostic information.
"""

from __future__ import annotations

import argparse
import json
import time
from math import comb
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    add,
    coeff,
    factorial_transform,
    graph6,
    mul,
    state_pair,
    sub,
    trim,
)


def down_x(poly: list[int]) -> list[int]:
    if coeff(poly, 0) != 0:
        raise ValueError("polynomial is not divisible by x")
    return trim(poly[1:] or [0])


def linear_combination(
    left: list[int], left_weight: int, right: list[int], right_weight: int
) -> list[int]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += left_weight * value
    for i, value in enumerate(right):
        out[i] += right_weight * value
    return trim(out)


def mixed(
    left: list[int], right: list[int], m: int, n: int
) -> int:
    return (
        coeff(left, m) * coeff(right, n)
        + coeff(right, m) * coeff(left, n)
        - coeff(left, m + 1) * coeff(right, n - 1)
        - coeff(right, m + 1) * coeff(left, n - 1)
    )


def event(
    *,
    n: int,
    tree_index: int,
    tree_code: str,
    root: int,
    leaf: int,
    parent: int,
    q: int,
    R: int,
    rank: int,
    value: int,
) -> dict:
    return {
        "order": n,
        "tree_index": tree_index,
        "graph6": tree_code,
        "root": root,
        "leaf": leaf,
        "parent": parent,
        "q": q,
        "R": R,
        "rank": rank,
        "value": value,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=12)
    parser.add_argument("--q-values", default="2,3,5,8")
    parser.add_argument("--R-values", default="2,3,5,8")
    parser.add_argument("--scan-ordered-triples", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    q_values = [int(item) for item in args.q_values.split(",")]
    R_values = [int(item) for item in args.R_values.split(",")]

    started = time.time()
    totals = {
        "root_leaf_states": 0,
        "rank_checks": 0,
        "ordered_triple_checks": 0,
        "identity_checks": 0,
    }
    first_adjacent_failure = None
    first_diagonal_triple_failure = None
    first_ordered_triple_failure = None
    first_combined_core_failure = None
    first_identity_failure = None
    per_order = []

    for n in range(2, args.max_order + 1):
        order = {
            "order": n,
            "trees": 0,
            "root_leaf_states": 0,
            "rank_checks": 0,
        }
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(n)):
            order["trees"] += 1
            tree_code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << n) - 1
            full_poly = list(ip.polynomial(full_mask))
            leaves = [v for v, degree in tree.degree if degree == 1]

            for root in tree:
                root_bit = 1 << ip.position[root]
                root_deleted = list(ip.polynomial(full_mask ^ root_bit))
                for leaf in leaves:
                    if leaf == root:
                        continue
                    parent = next(tree.neighbors(leaf))
                    if parent == root:
                        continue
                    leaf_bit = 1 << ip.position[leaf]
                    old_mask = full_mask ^ leaf_bit
                    old_poly = list(ip.polynomial(old_mask))
                    old_root_deleted = list(
                        ip.polynomial(old_mask ^ root_bit)
                    )
                    totals["root_leaf_states"] += 1
                    order["root_leaf_states"] += 1

                    for q in q_values:
                        for R in R_values:
                            old_p, old_s = state_pair(
                                old_poly, old_root_deleted, q, R
                            )
                            new_p, new_s = state_pair(
                                full_poly, root_deleted, q, R
                            )
                            a = down_x(sub(new_p, old_p))
                            b = down_x(sub(new_s, old_s))
                            z = down_x(sub(old_p, a))
                            w = down_x(sub(old_s, b))
                            c = linear_combination(
                                a, R - 1, b, 2 * (R + 1)
                            )
                            d = linear_combination(
                                z, R - 1, w, 2 * (R + 1)
                            )
                            old_weighted = linear_combination(
                                old_p, R - 1, old_s, 2 * (R + 1)
                            )
                            new_weighted = linear_combination(
                                new_p, R - 1, new_s, 2 * (R + 1)
                            )
                            af, bf, zf, wf, cf, df = map(
                                factorial_transform, (a, b, z, w, c, d)
                            )
                            old_pf = factorial_transform(old_p)
                            new_pf = factorial_transform(new_p)
                            old_weighted_f = factorial_transform(
                                old_weighted
                            )
                            new_weighted_f = factorial_transform(
                                new_weighted
                            )
                            upper = max(
                                len(new_pf), len(new_weighted_f)
                            )

                            if args.scan_ordered_triples:
                                for m in range(upper + 1):
                                    for nn in range(m + 1):
                                        triple = (
                                            mixed(af, cf, m, nn)
                                            + mixed(zf, cf, m, nn)
                                            + mixed(af, df, m, nn)
                                        )
                                        totals[
                                            "ordered_triple_checks"
                                        ] += 1
                                        if (
                                            triple < 0
                                            and first_ordered_triple_failure
                                            is None
                                        ):
                                            first_ordered_triple_failure = (
                                                event(
                                                    n=n,
                                                    tree_index=tree_index,
                                                    tree_code=tree_code,
                                                    root=root,
                                                    leaf=leaf,
                                                    parent=parent,
                                                    q=q,
                                                    R=R,
                                                    rank=m,
                                                    value=triple,
                                                )
                                                | {"second_rank": nn}
                                            )

                            for k in range(upper + 1):
                                adjacent = mixed(af, cf, k, k - 1)
                                triple = (
                                    mixed(af, cf, k - 1, k - 1)
                                    + mixed(zf, cf, k - 1, k - 1)
                                    + mixed(af, df, k - 1, k - 1)
                                )
                                error_products = (
                                    (coeff(af, k) + coeff(zf, k))
                                    * coeff(cf, k - 2)
                                    + coeff(cf, k)
                                    * (
                                        coeff(af, k - 2)
                                        + coeff(zf, k - 2)
                                    )
                                    + coeff(af, k) * coeff(df, k - 2)
                                    + coeff(df, k) * coeff(af, k - 2)
                                )
                                rhs = (
                                    k * k * triple
                                    + (k - 1) * adjacent
                                    + error_products
                                )
                                combined_core = (
                                    k * k * triple + (k - 1) * adjacent
                                )
                                lhs = mixed(
                                    new_pf, new_weighted_f, k, k
                                ) - mixed(
                                    old_pf, old_weighted_f, k, k
                                )
                                totals["rank_checks"] += 1
                                totals["identity_checks"] += 1
                                order["rank_checks"] += 1
                                if (
                                    adjacent < 0
                                    and first_adjacent_failure is None
                                ):
                                    first_adjacent_failure = event(
                                        n=n,
                                        tree_index=tree_index,
                                        tree_code=tree_code,
                                        root=root,
                                        leaf=leaf,
                                        parent=parent,
                                        q=q,
                                        R=R,
                                        rank=k,
                                        value=adjacent,
                                    )
                                if (
                                    triple < 0
                                    and first_diagonal_triple_failure is None
                                ):
                                    first_diagonal_triple_failure = event(
                                        n=n,
                                        tree_index=tree_index,
                                        tree_code=tree_code,
                                        root=root,
                                        leaf=leaf,
                                        parent=parent,
                                        q=q,
                                        R=R,
                                        rank=k - 1,
                                        value=triple,
                                    )
                                if (
                                    combined_core < 0
                                    and first_combined_core_failure is None
                                ):
                                    first_combined_core_failure = event(
                                        n=n,
                                        tree_index=tree_index,
                                        tree_code=tree_code,
                                        root=root,
                                        leaf=leaf,
                                        parent=parent,
                                        q=q,
                                        R=R,
                                        rank=k,
                                        value=combined_core,
                                    ) | {
                                        "triple": triple,
                                        "adjacent": adjacent,
                                        "error_products": error_products,
                                    }
                                if (
                                    lhs != rhs
                                    and first_identity_failure is None
                                ):
                                    first_identity_failure = event(
                                        n=n,
                                        tree_index=tree_index,
                                        tree_code=tree_code,
                                        root=root,
                                        leaf=leaf,
                                        parent=parent,
                                        q=q,
                                        R=R,
                                        rank=k,
                                        value=lhs - rhs,
                                    ) | {"lhs": lhs, "rhs": rhs}

        per_order.append(order)
        print(
            f"n={n}: trees={order['trees']:,} "
            f"states={order['root_leaf_states']:,} "
            f"ranks={order['rank_checks']:,}",
            flush=True,
        )
        if (
            first_combined_core_failure is not None
            or first_identity_failure is not None
        ):
            break

    status = (
        "required_condition_failure"
        if (
            first_combined_core_failure is not None
            or first_identity_failure is not None
        )
        else "required_conditions_hold"
    )
    payload = {
        "status": status,
        "parameters": {
            "max_order": args.max_order,
            "q_values": q_values,
            "R_values": R_values,
        },
        "totals": totals,
        "first_adjacent_failure": first_adjacent_failure,
        "first_diagonal_triple_failure": first_diagonal_triple_failure,
        "first_ordered_triple_failure": first_ordered_triple_failure,
        "first_combined_core_failure": first_combined_core_failure,
        "first_identity_failure": first_identity_failure,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if status != "required_conditions_hold" else 0


if __name__ == "__main__":
    raise SystemExit(main())
