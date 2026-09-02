#!/usr/bin/env python3
"""Decompose the exact ACWF change caused by adding a nonmarked leaf."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from adaptive_child_weighted_scan import planted_mask
from leaf_addition_pendant_decomposition_scan import mixed
from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    coeff,
    factorial_transform,
    graph6,
)
from scan_acwf_leaf_monotonicity import reserve, state


def minor(p: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(p, n - 1)
    )


def sub(a: list[int], b: list[int]) -> list[int]:
    return [
        coeff(a, k) - coeff(b, k)
        for k in range(max(len(a), len(b)))
    ]


def first_negative(
    records: dict,
    name: str,
    value: int,
    metadata: dict,
) -> None:
    if value < 0:
        records["negative_counts"][name] += 1
        if records["first_negative"][name] is None:
            records["first_negative"][name] = metadata | {
                "term": name,
                "value": value,
            }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=12)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    names = [
        "U_linear",
        "U_increment_curvature",
        "X_increment_old_D",
        "X_old_U_D_increment",
        "X_increment_increment",
        "linear_core",
        "increment_reserve",
        "total_delta",
    ]
    records = {
        "checks": 0,
        "negative_counts": {name: 0 for name in names},
        "first_negative": {name: None for name in names},
        "identity_failure": None,
        "maximum_linear_compensation_ratio": None,
        "maximum_linear_compensation_witness": None,
    }
    maximum_ratio = Fraction(-1, 1)

    for order in range(3, args.max_order + 1):
        order_checks = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            ip = MaskIndependencePolynomial(tree)
            pos = ip.position
            code = graph6(tree)
            for root in tree:
                for parent in [None, *tree[root]]:
                    mask = planted_mask(tree, pos, root, parent)
                    U1, D1, A1, q = state(ip, tree, mask, root)
                    if q == 0:
                        continue
                    marked = {
                        v for v in tree[root]
                        if mask & (1 << pos[v])
                    }
                    leaves = [
                        v
                        for v in tree
                        if (
                            v != root
                            and v not in marked
                            and mask & (1 << pos[v])
                            and sum(
                                bool(mask & (1 << pos[w]))
                                for w in tree[v]
                            )
                            == 1
                        )
                    ]
                    cutoff = (2 * (len(A1) - 1) + 1) // 3
                    u1 = factorial_transform(U1)
                    d1 = factorial_transform(D1)
                    weight = abs(q - 2)
                    for leaf in leaves:
                        mask0 = mask ^ (1 << pos[leaf])
                        U0, D0, _A0, q0 = state(
                            ip, tree, mask0, root
                        )
                        assert q0 == q
                        u0 = factorial_transform(U0)
                        d0 = factorial_transform(D0)
                        x = sub(u1, u0)
                        y = sub(d1, d0)
                        upper = max(len(u1), len(d1))
                        for k in range(min(cutoff, upper + 1)):
                            u_linear = weight * mixed(u0, x, k, k)
                            u_increment = weight * minor(x, k, k)
                            xid = q * mixed(x, d0, k, k)
                            udy = q * mixed(u0, y, k, k)
                            xiy = q * mixed(x, y, k, k)
                            linear = u_linear + xid + udy
                            increment = u_increment + xiy
                            total = linear + increment
                            direct = (
                                reserve(u1, d1, q, k, k)
                                - reserve(u0, d0, q, k, k)
                            )
                            meta = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                "parent": parent,
                                "leaf": leaf,
                                "children": q,
                                "cutoff": cutoff,
                                "rank": k,
                                "U_old": U0,
                                "D_old": D0,
                                "U_new": U1,
                                "D_new": D1,
                            }
                            values = {
                                "U_linear": u_linear,
                                "U_increment_curvature": u_increment,
                                "X_increment_old_D": xid,
                                "X_old_U_D_increment": udy,
                                "X_increment_increment": xiy,
                                "linear_core": linear,
                                "increment_reserve": increment,
                                "total_delta": total,
                            }
                            for name, value in values.items():
                                first_negative(records, name, value, meta)
                            if linear < 0 and increment > 0:
                                ratio = Fraction(-linear, increment)
                                if ratio > maximum_ratio:
                                    maximum_ratio = ratio
                                    records[
                                        "maximum_linear_compensation_ratio"
                                    ] = str(ratio)
                                    records[
                                        "maximum_linear_compensation_witness"
                                    ] = meta | {
                                        "linear_core": linear,
                                        "increment_reserve": increment,
                                        "total_delta": total,
                                    }
                            if direct != total and records[
                                "identity_failure"
                            ] is None:
                                records["identity_failure"] = meta | {
                                    "direct": direct,
                                    "decomposed": total,
                                    "values": values,
                                }
                            records["checks"] += 1
                            order_checks += 1
        print(f"n={order}: checks={order_checks:,}", flush=True)

    payload = {
        "status": (
            "identity_failure"
            if records["identity_failure"] is not None
            else (
                "prefix_delta_failure"
                if records["first_negative"]["total_delta"] is not None
                else "no_prefix_delta_failure"
            )
        ),
        "parameters": {"max_order": args.max_order},
        **records,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
