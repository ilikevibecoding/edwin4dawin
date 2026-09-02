#!/usr/bin/env python3
"""Test whether half-pointed reserve alone pays the strong cascade.

For a rooted forest F at q, attach a new leaf p at q:

    B=I(F), C=I(F-q), A=B+xC.

The pointed half-reserve conjecture gives P^+ >= R^+/2 (assuming
ordinary ISO).  This script tests whether replacing the actual next
pointed reserve by that lower bound is already enough for the exact
strong-reserve threshold.
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


def coeff(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank < len(poly) else 0


def encode(value, item):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **item}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = failures = adaptive_failures = 0
    cutoff_checks = cutoff_failures = adaptive_cutoff_failures = 0
    minimum_margin = None
    minimum_item = None
    minimum_cutoff_margin = None
    minimum_cutoff_item = None
    minimum_adaptive_margin = None
    minimum_adaptive_item = None
    minimum_adaptive_cutoff_margin = None
    minimum_adaptive_cutoff_item = None

    for order in range(1, args.max_order + 1):
        tree_iter = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for tree_index, tree in enumerate(tree_iter):
            order_trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            b_poly = engine.polynomial(full_mask)
            alpha = len(b_poly) - 1
            code = graph6(tree)
            for root in tree:
                root_mask = full_mask ^ (
                    1 << engine.position[root]
                )
                c_poly = engine.polynomial(root_mask)
                for r in range(args.min_rank, len(b_poly)):
                    k = r + 1
                    bm = coeff(b_poly, r - 1)
                    b = coeff(b_poly, r)
                    bp = coeff(b_poly, r + 1)
                    bpp = coeff(b_poly, r + 2)
                    if min(bm, b, bp) <= 0:
                        continue
                    a = b + coeff(c_poly, r - 1)
                    ap = bp + coeff(c_poly, r)
                    app = bpp + coeff(c_poly, r + 1)
                    if min(a, ap) <= 0:
                        continue
                    u = Fraction(r * b, bm)
                    if u < r:
                        continue
                    w = Fraction(k * bp, b)
                    z = Fraction((k + 1) * bpp, bp)
                    v = Fraction(k * ap, a)
                    y = Fraction((k + 1) * app, ap)
                    q_f = 1 + u - w
                    q_t = 1 + v - y
                    reserve = r + u * u - u * w
                    reserve_next = k + w * w - w * z
                    h = b - coeff(c_poly, r)
                    hp = bp - coeff(c_poly, r + 1)
                    rho = Fraction(h, b)
                    rho_next = Fraction(hp, bp)
                    denominator_next = w + k * (1 - rho)
                    if min(v, denominator_next) <= 0:
                        continue
                    drift = u + 1 - v
                    epsilon = max(Fraction(0), w - v)
                    bracket = (
                        r * v * reserve / u
                        + (r + 2 + Fraction(r * r, u)) * drift
                        + 2 * k * r * epsilon
                        - 2
                        * k
                        * (k + v * (q_f - 1 - drift))
                    )
                    threshold = (
                        denominator_next
                        * bracket
                        / (2 * k * v)
                    )
                    margin = reserve_next / 2 - threshold
                    burden_next = (
                        k * (w + 1) * rho
                        - (k + 1) * w * rho_next
                    )
                    adaptive_lower_bound = (
                        reserve_next - burden_next
                        if burden_next <= 0
                        else reserve_next / 2
                    )
                    adaptive_margin = (
                        adaptive_lower_bound - threshold
                    )
                    checks += 1
                    room = (alpha - r) * (order - r)
                    required = (
                        r >= 6
                        and room > (r + 1) * (r + 2)
                    )
                    item = {
                        "order_F": order,
                        "alpha_F": alpha,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "root_degree": tree.degree[root],
                        "rank_r": r,
                        "u": str(u),
                        "w": str(w),
                        "v": str(v),
                        "q_F": str(q_f),
                        "q_T": str(q_t),
                        "R": str(reserve),
                        "R_next": str(reserve_next),
                        "threshold": str(threshold),
                        "burden_next": str(burden_next),
                        "adaptive_P_next_lower_bound": str(
                            adaptive_lower_bound
                        ),
                        "room_product": room,
                        "cutoff_rhs": (r + 1) * (r + 2),
                        "required_rank": required,
                    }
                    if margin < 0:
                        failures += 1
                    if adaptive_margin < 0:
                        adaptive_failures += 1
                    if minimum_margin is None or margin < minimum_margin:
                        minimum_margin, minimum_item = margin, item
                    if required:
                        cutoff_checks += 1
                        if margin < 0:
                            cutoff_failures += 1
                        if adaptive_margin < 0:
                            adaptive_cutoff_failures += 1
                        if (
                            minimum_cutoff_margin is None
                            or margin < minimum_cutoff_margin
                        ):
                            minimum_cutoff_margin = margin
                            minimum_cutoff_item = item
                        if (
                            minimum_adaptive_cutoff_margin is None
                            or adaptive_margin
                            < minimum_adaptive_cutoff_margin
                        ):
                            minimum_adaptive_cutoff_margin = (
                                adaptive_margin
                            )
                            minimum_adaptive_cutoff_item = item
                    if (
                        minimum_adaptive_margin is None
                        or adaptive_margin < minimum_adaptive_margin
                    ):
                        minimum_adaptive_margin = adaptive_margin
                        minimum_adaptive_item = item
        print(
            f"n={order}: trees={order_trees:,} checks={checks:,} "
            f"failures={failures:,} cutoff_checks={cutoff_checks:,} "
            f"cutoff_failures={cutoff_failures:,} "
            f"adaptive_cutoff_failures="
            f"{adaptive_cutoff_failures:,}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
        "adaptive_sign_aware_failures": adaptive_failures,
        "required_cutoff_checks_r_ge_6": cutoff_checks,
        "required_cutoff_failures_r_ge_6": cutoff_failures,
        "adaptive_required_cutoff_failures_r_ge_6":
            adaptive_cutoff_failures,
        "minimum_margin": encode(minimum_margin, minimum_item),
        "minimum_required_cutoff_margin": encode(
            minimum_cutoff_margin, minimum_cutoff_item
        ),
        "minimum_adaptive_sign_aware_margin": encode(
            minimum_adaptive_margin, minimum_adaptive_item
        ),
        "minimum_adaptive_required_cutoff_margin": encode(
            minimum_adaptive_cutoff_margin,
            minimum_adaptive_cutoff_item,
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 1 if adaptive_cutoff_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
