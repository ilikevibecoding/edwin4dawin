#!/usr/bin/env python3
"""Exhaustively test two-ratio dominance on all small rooted trees."""

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
            "rooted_forest_two_ratio_exhaustive_n15_20260729.json"
        ),
    )
    args = parser.parse_args()

    roots = 0
    checks = 0
    first_v_u_failure = None
    first_v_w_failure = None
    minimum_v_u = None
    minimum_v_u_item = None
    minimum_v_w = None
    minimum_v_w_item = None
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
            code = graph6(tree)

            for root in tree:
                roots += 1
                root_bit = 1 << engine.position[root]
                c_mask = full_mask ^ root_bit
                d_mask = c_mask
                for neighbor in tree[root]:
                    d_mask ^= 1 << engine.position[neighbor]
                c_values = engine.polynomial(c_mask)
                d_values = engine.polynomial(d_mask)

                for k in range(
                    args.minimum_rank, len(c_values)
                ):
                    cm = coefficient(c_values, k - 1)
                    c = coefficient(c_values, k)
                    cp = coefficient(c_values, k + 1)
                    dm2 = coefficient(d_values, k - 2)
                    dm1 = coefficient(d_values, k - 1)
                    d = coefficient(d_values, k)
                    if cm <= 0 or c <= 0:
                        continue

                    h_previous = cm + dm1 + dm2
                    h_current = c + d + dm1
                    b_k = c + h_previous
                    b_kp1 = cp + h_current
                    if b_kp1 < b_k:
                        continue

                    u = Fraction(k * c, cm)
                    w = Fraction((k + 1) * cp, c)
                    v = Fraction(
                        (k + 1) * h_current, h_previous
                    )
                    margin_v_u = v - u
                    margin_v_w = v - w - 1
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
                    }
                    checks += 1
                    order_checks += 1

                    if (
                        minimum_v_u is None
                        or margin_v_u < minimum_v_u
                    ):
                        minimum_v_u = margin_v_u
                        minimum_v_u_item = {
                            **item,
                            "margin": str(margin_v_u),
                            "decimal": float(margin_v_u),
                        }
                    if (
                        minimum_v_w is None
                        or margin_v_w < minimum_v_w
                    ):
                        minimum_v_w = margin_v_w
                        minimum_v_w_item = {
                            **item,
                            "margin": str(margin_v_w),
                            "decimal": float(margin_v_w),
                        }
                    if (
                        margin_v_u < 0
                        and first_v_u_failure is None
                    ):
                        first_v_u_failure = {
                            **item,
                            "margin": str(margin_v_u),
                        }
                    if (
                        margin_v_w < 0
                        and first_v_w_failure is None
                    ):
                        first_v_w_failure = {
                            **item,
                            "margin": str(margin_v_w),
                        }

        orders.append(
            {
                "order": order,
                "trees": tree_count,
                "operative_checks": order_checks,
            }
        )
        print(
            f"n={order}: trees={tree_count:,}, "
            f"checks={checks:,}, "
            f"v<u={first_v_u_failure is not None}, "
            f"v<w+1={first_v_w_failure is not None}",
            flush=True,
        )

    passed = first_v_u_failure is None and first_v_w_failure is None
    report = {
        "status": "PASS_NOT_PROOF" if passed else "COUNTEREXAMPLE",
        "max_order": args.max_order,
        "minimum_rank": args.minimum_rank,
        "rooted_instances": roots,
        "operative_checks": checks,
        "minimum_v_minus_u": minimum_v_u_item,
        "minimum_v_minus_w_minus_one": minimum_v_w_item,
        "first_v_below_u": first_v_u_failure,
        "first_v_below_w_plus_one": first_v_w_failure,
        "orders": orders,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
