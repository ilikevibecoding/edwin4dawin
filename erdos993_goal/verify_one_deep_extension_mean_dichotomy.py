#!/usr/bin/env python3
"""Exhaustively test the two extension-mean lemmas on rooted trees.

For C=I(T), D=I(T-root), H=C+(1+x)D, define

    u = k C_k/C_{k-1},
    w = (k+1) C_{k+1}/C_k,
    v = (k+1) H_k/H_{k-1}.

The proposed replacement for half-payment is

    v >= u,
    v < u+1  ==>  w <= u-1.

Only operative ranks of B=(1+x)(C+xD) are tested.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def coefficient(values: tuple[int, ...], rank: int) -> int:
    return values[rank] if 0 <= rank < len(values) else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--minimum-rank", type=int, default=1)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "one_deep_extension_mean_dichotomy_n15_20260729.json"
        ),
    )
    args = parser.parse_args()

    checks = 0
    roots = 0
    v_below_u = 0
    dichotomy_failures = 0
    first_v_failure = None
    first_dichotomy_failure = None
    minimum_v_minus_u = None
    minimum_v_item = None
    maximum_hard_w_minus_u = None
    maximum_hard_item = None
    orders = []

    for order in range(1, args.max_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        tree_count = 0
        order_checks = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            c_values = engine.polynomial(full_mask)
            code = graph6(tree)

            for root in tree:
                roots += 1
                d_values = engine.polynomial(
                    full_mask ^ (1 << engine.position[root])
                )
                maximum_rank = len(c_values) - 1
                for k in range(args.minimum_rank, maximum_rank + 1):
                    cm = coefficient(c_values, k - 1)
                    c = coefficient(c_values, k)
                    cp = coefficient(c_values, k + 1)
                    dm2 = coefficient(d_values, k - 2)
                    dm1 = coefficient(d_values, k - 1)
                    d = coefficient(d_values, k)
                    if cm <= 0 or c <= 0:
                        continue

                    b_k = c + cm + dm1 + dm2
                    b_kp1 = cp + c + d + dm1
                    if b_kp1 < b_k:
                        continue

                    h_previous = cm + dm1 + dm2
                    h_current = c + d + dm1
                    u = Fraction(k * c, cm)
                    w = Fraction((k + 1) * cp, c)
                    v = Fraction((k + 1) * h_current, h_previous)
                    v_minus_u = v - u
                    w_minus_u = w - u
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "k": k,
                        "u": str(u),
                        "w": str(w),
                        "v": str(v),
                        "v_minus_u": str(v_minus_u),
                        "w_minus_u": str(w_minus_u),
                    }
                    checks += 1
                    order_checks += 1

                    if (
                        minimum_v_minus_u is None
                        or v_minus_u < minimum_v_minus_u
                    ):
                        minimum_v_minus_u = v_minus_u
                        minimum_v_item = item
                    if v < u:
                        v_below_u += 1
                        if first_v_failure is None:
                            first_v_failure = item

                    if v < u + 1:
                        if (
                            maximum_hard_w_minus_u is None
                            or w_minus_u > maximum_hard_w_minus_u
                        ):
                            maximum_hard_w_minus_u = w_minus_u
                            maximum_hard_item = item
                        if w > u - 1:
                            dichotomy_failures += 1
                            if first_dichotomy_failure is None:
                                first_dichotomy_failure = item

        orders.append(
            {
                "order": order,
                "trees": tree_count,
                "operative_checks": order_checks,
            }
        )
        print(
            f"n={order}: trees={tree_count:,}, "
            f"checks={checks:,}, v_fail={v_below_u:,}, "
            f"dichotomy_fail={dichotomy_failures:,}",
            flush=True,
        )

    passed = v_below_u == 0 and dichotomy_failures == 0
    report = {
        "status": "PASS_NOT_PROOF" if passed else "COUNTEREXAMPLE",
        "max_order": args.max_order,
        "minimum_rank": args.minimum_rank,
        "rooted_instances": roots,
        "operative_checks": checks,
        "v_below_u": v_below_u,
        "dichotomy_failures": dichotomy_failures,
        "minimum_v_minus_u": minimum_v_item,
        "maximum_hard_w_minus_u": maximum_hard_item,
        "first_v_failure": first_v_failure,
        "first_dichotomy_failure": first_dichotomy_failure,
        "orders": orders,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
