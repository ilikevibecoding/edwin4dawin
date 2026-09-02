#!/usr/bin/env python3
"""Find the best longest-path terminal leaf for the Q-cascade payment.

For each unlabeled tree, terminal leaves are those whose support has at
most one nonleaf neighbor.  Such leaves include every endpoint of a
diameter.  The scan asks whether one terminal leaf simultaneously has a
nonnegative local Q-payment at every required prefix rank, and records
the best minimax compensation ratio when no such leaf exists.
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_q_cascade_all_forest_polynomials import coeff, q_reserve


def payment_profile(full, deletion, cutoff):
    ranks = []
    maximum_ratio = Fraction(0)
    all_local_nonnegative = True
    all_one_third = True
    all_four_fifths = True
    all_cascade = True
    for rank in range(4, cutoff):
        left = rank * coeff(deletion, rank - 2) * q_reserve(full, rank)
        right = (
            (rank - 1)
            * coeff(full, rank - 1)
            * q_reserve(deletion, rank - 1)
        )
        difference = left - right
        r = rank - 1
        a = coeff(full, r) - coeff(deletion, r - 1)
        a_plus = coeff(full, r + 1) - coeff(deletion, r)
        b_minus = coeff(deletion, r - 1)
        b_here = coeff(deletion, r)
        b_plus = coeff(deletion, r + 1)
        lam = (
            a * b_here
            + b_here**2
            + 2 * rank * (a_plus * b_here - a * b_plus)
        )
        mean_gap = (
            b_minus * (rank * a_plus + b_here)
            - (rank - 1) * b_here * a
        )
        local = (
            2
            * (
                b_minus * (a + b_minus) * lam
                - mean_gap**2
            )
            - 3 * a * b_minus * (a + b_minus) * b_here
        )
        t_poly = tuple(
            coeff(full, index) - coeff(deletion, index - 1)
            for index in range(len(full))
        )
        same = (
            rank
            * b_minus
            * (a + b_minus)
            * q_reserve(t_poly, rank)
        )
        assert a * difference == local + same
        all_local_nonnegative &= local >= 0
        all_one_third &= rank < 5 or 3 * local + same >= 0
        all_four_fifths &= 5 * local + 4 * same >= 0
        all_cascade &= difference >= 0
        ratio = Fraction(0)
        if local < 0 and same > 0:
            ratio = Fraction(-local, same)
            maximum_ratio = max(maximum_ratio, ratio)
        ranks.append(
            {
                "rank": rank,
                "local_q_payment": local,
                "same_rank_q_payment": same,
                "compensation_ratio_numerator": ratio.numerator,
                "compensation_ratio_denominator": ratio.denominator,
                "cascade_difference": difference,
            }
        )
    return {
        "all_local_nonnegative": all_local_nonnegative,
        "all_one_third": all_one_third,
        "all_four_fifths": all_four_fifths,
        "all_cascade": all_cascade,
        "_maximum_ratio": maximum_ratio,
        "maximum_ratio_numerator": maximum_ratio.numerator,
        "maximum_ratio_denominator": maximum_ratio.denominator,
        "maximum_ratio": float(maximum_ratio),
        "ranks": ranks,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=17)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()

    trees_checked = 0
    applicable_trees = 0
    trees_with_local_leaf = 0
    first_without_local_leaf = None
    first_without_mixed_leaf = None
    first_without_cascade_leaf = None
    worst_best_ratio = Fraction(0)
    worst_best_item = None

    for order in range(2, args.max_order + 1):
        order_trees = 0
        for tree in nx.nonisomorphic_trees(order):
            order_trees += 1
            trees_checked += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = (2 * alpha + 1) // 3
            if cutoff <= 4:
                continue
            applicable_trees += 1
            candidates = []
            seen_deletions = set()
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                nonleaf_neighbors = sum(
                    tree.degree(neighbor) > 1
                    for neighbor in tree[support]
                )
                if nonleaf_neighbors > 1:
                    continue
                deletion_mask = (
                    full_mask
                    ^ (1 << engine.position[leaf])
                    ^ (1 << engine.position[support])
                )
                deletion = engine.polynomial(deletion_mask)
                if deletion in seen_deletions:
                    continue
                seen_deletions.add(deletion)
                profile = payment_profile(full, deletion, cutoff)
                candidates.append(
                    {
                        "leaf": leaf,
                        "support": support,
                        "support_degree": tree.degree(support),
                        "deletion": deletion,
                        **profile,
                    }
                )
            assert candidates
            local_candidates = [
                candidate
                for candidate in candidates
                if candidate["all_local_nonnegative"]
            ]
            mixed_candidates = [
                candidate
                for candidate in candidates
                if candidate["all_four_fifths"]
                and candidate["all_one_third"]
            ]
            cascade_candidates = [
                candidate
                for candidate in candidates
                if candidate["all_cascade"]
            ]
            tree_item = {
                "order": order,
                "alpha": alpha,
                "cutoff": cutoff,
                "graph6": nx.to_graph6_bytes(
                    tree, header=False
                ).decode().strip(),
                "full": full,
                "degrees": sorted(
                    dict(tree.degree()).values(), reverse=True
                ),
                "candidates": [
                    {
                        key: value
                        for key, value in candidate.items()
                        if key != "_maximum_ratio"
                    }
                    for candidate in candidates
                ],
            }
            if local_candidates:
                trees_with_local_leaf += 1
            elif first_without_local_leaf is None:
                first_without_local_leaf = tree_item
            if not mixed_candidates and first_without_mixed_leaf is None:
                first_without_mixed_leaf = tree_item
            if (
                not cascade_candidates
                and first_without_cascade_leaf is None
            ):
                first_without_cascade_leaf = tree_item
            best = min(
                candidates,
                key=lambda candidate: candidate["_maximum_ratio"],
            )
            if best["_maximum_ratio"] > worst_best_ratio:
                worst_best_ratio = best["_maximum_ratio"]
                public_best = {
                    key: value
                    for key, value in best.items()
                    if key != "_maximum_ratio"
                }
                worst_best_item = tree_item | {
                    "best_candidate": public_best,
                    "best_ratio_numerator": (
                        best["_maximum_ratio"].numerator
                    ),
                    "best_ratio_denominator": (
                        best["_maximum_ratio"].denominator
                    ),
                    "best_ratio": float(best["_maximum_ratio"]),
                }
        print(
            f"n={order}: trees={order_trees:,}, "
            f"applicable_total={applicable_trees:,}, "
            f"local_leaf_total={trees_with_local_leaf:,}",
            flush=True,
        )

    report = {
        "max_order": args.max_order,
        "trees_checked": trees_checked,
        "applicable_trees": applicable_trees,
        "trees_with_all_rank_local_nonnegative_terminal_leaf": (
            trees_with_local_leaf
        ),
        "first_without_local_nonnegative_terminal_leaf": (
            first_without_local_leaf
        ),
        "first_without_mixed_payment_terminal_leaf": (
            first_without_mixed_leaf
        ),
        "first_without_q_cascade_terminal_leaf": (
            first_without_cascade_leaf
        ),
        "worst_best_compensation_ratio": worst_best_item,
        "status": (
            "FAIL"
            if first_without_mixed_leaf or first_without_cascade_leaf
            else "PASS_NOT_PROOF"
        ),
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
