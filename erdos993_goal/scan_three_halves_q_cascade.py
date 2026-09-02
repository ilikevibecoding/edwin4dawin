#!/usr/bin/env python3
"""Falsify a pendant cascade for the three-halves Q reserve.

The candidate is

    k Q_k(G) / g_{k-1} >= (k-1) Q_{k-1}(F) / f_{k-2},

where l-p is a pendant edge and F=G-{l,p}.  This is only exploratory;
if true it would propagate the now-proved low-rank Q reserve directly
through pendant deletion.
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


def coeff(poly, rank):
    return poly[rank] if 0 <= rank < len(poly) else 0


def q_reserve(poly, rank):
    return (
        2 * rank * coeff(poly, rank) ** 2
        - coeff(poly, rank - 1) * coeff(poly, rank)
        - 2
        * (rank + 1)
        * coeff(poly, rank - 1)
        * coeff(poly, rank + 1)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--include-cutoff", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    terminal_checks = 0
    first_failure = None
    first_terminal_failure = None
    first_local_payment_failure = None
    largest_compensation_pair = None
    largest_compensation_item = None
    first_four_fifths_failure = None
    first_negative_same_rank_payment = None
    compensation_by_rank = {}
    largest_ratio = None
    largest_item = None
    for order in range(2, args.max_order + 1):
        trees = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = (2 * alpha + 1) // 3
            code = None
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                deletion_mask = (
                    full_mask
                    ^ (1 << engine.position[leaf])
                    ^ (1 << engine.position[support])
                )
                deletion = engine.polynomial(deletion_mask)
                terminal = (
                    sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree[support]
                    )
                    <= 1
                )
                for rank in range(
                    4, cutoff + int(args.include_cutoff)
                ):
                    qg = q_reserve(full, rank)
                    qf = q_reserve(deletion, rank - 1)
                    left = (
                        rank
                        * coeff(deletion, rank - 2)
                        * qg
                    )
                    right = (
                        (rank - 1)
                        * coeff(full, rank - 1)
                        * qf
                    )
                    checks += 1
                    terminal_checks += int(terminal)
                    if code is None and (
                        left < right
                        or (left > 0 and right > 0)
                    ):
                        code = graph6(tree)
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "leaf": leaf,
                        "support": support,
                        "terminal": terminal,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank": rank,
                        "full": full,
                        "deletion": deletion,
                        "left": left,
                        "right": right,
                        "difference": left - right,
                    }
                    if left < right:
                        if first_failure is None:
                            first_failure = item
                        if terminal and first_terminal_failure is None:
                            first_terminal_failure = item
                    r = rank - 1
                    a = coeff(full, r) - coeff(deletion, r - 1)
                    a_plus = (
                        coeff(full, r + 1) - coeff(deletion, r)
                    )
                    b_minus = coeff(deletion, r - 1)
                    b_here = coeff(deletion, r)
                    b_plus = coeff(deletion, r + 1)
                    lam = (
                        a * b_here
                        + b_here**2
                        + 2
                        * rank
                        * (a_plus * b_here - a * b_plus)
                    )
                    mean_gap = (
                        b_minus * (rank * a_plus + b_here)
                        - (rank - 1) * b_here * a
                    )
                    local_payment = (
                        2
                        * (
                            b_minus
                            * (a + b_minus)
                            * lam
                            - mean_gap**2
                        )
                        - 3
                        * a
                        * b_minus
                        * (a + b_minus)
                        * b_here
                    )
                    if (
                        local_payment < 0
                        and first_local_payment_failure is None
                    ):
                        first_local_payment_failure = item | {
                            "local_q_payment": local_payment,
                        }
                    t_poly = [
                        coeff(full, index)
                        - coeff(deletion, index - 1)
                        for index in range(len(full))
                    ]
                    same_rank_payment = (
                        rank
                        * b_minus
                        * (a + b_minus)
                        * q_reserve(t_poly, rank)
                    )
                    assert (
                        a * (left - right)
                        == local_payment + same_rank_payment
                    )
                    if (
                        same_rank_payment < 0
                        and first_negative_same_rank_payment is None
                    ):
                        first_negative_same_rank_payment = item | {
                            "local_q_payment": local_payment,
                            "same_rank_q_payment": same_rank_payment,
                        }
                    four_fifths_gap = (
                        5 * local_payment + 4 * same_rank_payment
                    )
                    if (
                        four_fifths_gap < 0
                        and first_four_fifths_failure is None
                    ):
                        first_four_fifths_failure = item | {
                            "local_q_payment": local_payment,
                            "same_rank_q_payment": same_rank_payment,
                            "five_local_plus_four_same": four_fifths_gap,
                        }
                    if local_payment < 0 and same_rank_payment > 0:
                        pair = (-local_payment, same_rank_payment)
                        previous_rank_pair = compensation_by_rank.get(rank)
                        if (
                            previous_rank_pair is None
                            or pair[0] * previous_rank_pair[1]
                            > previous_rank_pair[0] * pair[1]
                        ):
                            compensation_by_rank[rank] = pair
                        if (
                            largest_compensation_pair is None
                            or pair[0] * largest_compensation_pair[1]
                            > largest_compensation_pair[0] * pair[1]
                        ):
                            largest_compensation_pair = pair
                            largest_compensation_item = item | {
                                "local_q_payment": local_payment,
                                "same_rank_q_payment": same_rank_payment,
                                "negative_local_over_same_rank": float(
                                    Fraction(*pair)
                                ),
                            }
                    if left > 0 and right > 0:
                        ratio = Fraction(right, left)
                        if largest_ratio is None or ratio > largest_ratio:
                            largest_ratio = ratio
                            largest_item = item | {
                                "right_over_left": float(ratio)
                            }
        print(f"n={order} trees={trees:,}", flush=True)

    payload = {
        "candidate": (
            "k f_{k-2} Q_k(G) >= "
            "(k-1) g_{k-1} Q_{k-1}(F)"
        ),
        "max_order": args.max_order,
        "checks": checks,
        "terminal_checks": terminal_checks,
        "first_failure": first_failure,
        "first_terminal_failure": first_terminal_failure,
        "first_local_q_payment_failure": first_local_payment_failure,
        "largest_compensation_ratio": largest_compensation_item,
        "first_four_fifths_failure": first_four_fifths_failure,
        "first_negative_same_rank_payment":
            first_negative_same_rank_payment,
        "compensation_maximum_by_rank": {
            str(rank): float(Fraction(*pair))
            for rank, pair in sorted(compensation_by_rank.items())
        },
        "largest_positive_right_over_left": largest_item,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("checks:", checks)
    print("terminal checks:", terminal_checks)
    print("failure:", first_failure is not None)
    print("terminal failure:", first_terminal_failure is not None)
    if largest_item:
        print("largest positive ratio:", largest_item["right_over_left"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
