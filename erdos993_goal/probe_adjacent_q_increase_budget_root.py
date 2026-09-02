#!/usr/bin/env python3
"""Exact diagnostic for adjacent token-ratio increase budgets.

For a forest F write

    q_r = s_r/(r i_r),

where s_r counts (r+1)-sets inducing exactly one edge.  The proposed
monotonicity q_(r+1)<=q_r is false, but the denominator-free component
payment only loses the scaled increment

    mu_r * (q_(r+1)-q_r),   mu_r=(r+1)i_(r+1)/i_r.

This script measures that exact scaled increment, together with two natural
rank-normalized versions, on every unlabeled tree through a requested order.
It is a diagnostic only: a finite maximum is not an all-order theorem.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import math

import networkx as nx

from prove_terminal_q3_low_newton_m1_j3_general_root import TreeRows, coeff


def update(best, record):
    return record if best is None or record[0] > best[0] else best


def audit(max_order: int):
    checks = 0
    increases = 0
    best_scaled = None
    best_scaled_over_rank = None
    best_scaled_over_extension = None
    best_relative = None
    for order in range(4, max_order + 1):
        for index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            independent, one_edge = TreeRows(tree).whole()
            for rank in range(1, len(independent) - 1):
                ir = coeff(independent, rank)
                ir1 = coeff(independent, rank + 1)
                if not ir or not ir1:
                    continue
                qr = Fraction(coeff(one_edge, rank + 1), rank * ir)
                qr1 = Fraction(
                    coeff(one_edge, rank + 2), (rank + 1) * ir1
                )
                mu = Fraction((rank + 1) * ir1, ir)
                delta = qr1 - qr
                checks += 1
                if delta <= 0:
                    continue
                increases += 1
                scaled = mu * delta
                meta = (order, index, rank, mu, qr, qr1)
                best_scaled = update(best_scaled, (scaled, *meta))
                best_scaled_over_rank = update(
                    best_scaled_over_rank, (scaled / rank, *meta)
                )
                best_scaled_over_extension = update(
                    best_scaled_over_extension, (delta, *meta)
                )
                if qr:
                    best_relative = update(
                        best_relative, (delta / qr, *meta)
                    )
    return {
        "checks": checks,
        "strict_increases": increases,
        "max_mu_times_increase": best_scaled,
        "max_mu_times_increase_over_rank": best_scaled_over_rank,
        "max_increase": best_scaled_over_extension,
        "max_relative_increase": best_relative,
    }


def audit_subdivided_stars(max_arms: int):
    """Use the proved closed q-ratio formula for uniformly subdivided stars."""
    best_scaled = None
    best_scaled_over_rank = None
    best_delta = None
    increases = 0
    for arms in range(2, max_arms + 1):
        # I(S_d)=(1+2x)^d+x(1+x)^d.
        row = [
            (2**rank) * math.comb(arms, rank)
            + (math.comb(arms, rank - 1) if rank else 0)
            for rank in range(arms + 2)
        ]
        for rank in range(1, arms):
            qr = Fraction(
                2 ** (rank - 1) + 1,
                2**rank + Fraction(rank, arms - rank + 1),
            )
            qr1 = Fraction(
                2**rank + 1,
                2 ** (rank + 1) + Fraction(rank + 1, arms - rank),
            )
            delta = qr1 - qr
            if delta <= 0:
                continue
            increases += 1
            mu = Fraction((rank + 1) * row[rank + 1], row[rank])
            scaled = mu * delta
            meta = (2 * arms + 1, arms, rank, mu, qr, qr1)
            best_scaled = update(best_scaled, (scaled, *meta))
            best_scaled_over_rank = update(
                best_scaled_over_rank, (scaled / rank, *meta)
            )
            best_delta = update(best_delta, (delta, *meta))
    return {
        "subdivided_star_strict_increases": increases,
        "subdivided_star_max_mu_times_increase": best_scaled,
        "subdivided_star_max_mu_times_increase_over_rank": best_scaled_over_rank,
        "subdivided_star_max_increase": best_delta,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=14)
    parser.add_argument("--subdivided-arms", type=int, default=200)
    args = parser.parse_args()
    for key, value in audit(args.order).items():
        print(key, value)
    for key, value in audit_subdivided_stars(args.subdivided_arms).items():
        print(key, value)


if __name__ == "__main__":
    main()
