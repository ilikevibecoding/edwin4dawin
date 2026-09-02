#!/usr/bin/env python3
"""Exact scan of the compensated leaf-multiplier identity.

Let ``P=I(T)`` and let ``P'=I(T+leaf)=P+x I(T-p)``.  If

    h_k = k! [x^k]P,       m_k = [x^k]P' / [x^k]P,

then the normalized curvature increment is

    Delta C_k / h_k^2
      = (m_k^2-m_{k-1}m_{k+1})
        +(1-rho_k)(m_{k-1}m_{k+1}-1),

where ``rho_k=h_{k-1}h_{k+1}/h_k^2``.  When the first term is
negative, define

    theta_k = (m_{k-1}m_{k+1}-m_k^2)
              /(m_{k-1}m_{k+1}-1).

Leaf-curvature monotonicity is then exactly ``theta_k <= 1-rho_k``.
This program scans that compensation ratio with exact rational
arithmetic over every attachment vertex of every unlabeled tree in the
selected range.  It is a falsifier and structure finder, not a proof.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx

from adaptive_child_weighted_scan import planted_mask
from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def shifted_add(a: list[int], b: list[int]) -> list[int]:
    out = a[:] + [0]
    for k, value in enumerate(b, start=1):
        out[k] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def better_ratio(left: Fraction, right: Fraction | None) -> bool:
    return right is None or left > right


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "prefix_ranks": 0,
        "negative_multiplier_curvatures": 0,
        "compensation_failures": 0,
    }
    worst_ratio: Fraction | None = None
    worst_item = None
    first_failure = None
    per_order = []
    per_rank: dict[str, dict] = {}

    for order in range(1, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        row = {
            "order": order,
            "trees": 0,
            "attachments": 0,
            "prefix_ranks": 0,
            "negative_multiplier_curvatures": 0,
            "maximum_payment_ratio": None,
        }
        row_ratio: Fraction | None = None

        for tree_index, tree in enumerate(trees):
            row["trees"] += 1
            totals["trees"] += 1
            ip = MaskIndependencePolynomial(tree)
            full = (1 << order) - 1
            old = list(ip.polynomial(full))
            old_factorial = [
                math.factorial(k) * value for k, value in enumerate(old)
            ]
            code = graph6(tree)

            for attachment in tree:
                deletion_mask = full ^ (1 << ip.position[attachment])
                deletion = list(ip.polynomial(deletion_mask))
                new = shifted_add(old, deletion)
                alpha = len(new) - 1
                cutoff = (2 * alpha + 1) // 3
                totals["attachments"] += 1
                row["attachments"] += 1

                for k in range(1, min(cutoff, len(old) - 1)):
                    if old[k - 1] == 0 or old[k] == 0 or old[k + 1] == 0:
                        continue
                    totals["prefix_ranks"] += 1
                    row["prefix_ranks"] += 1
                    m_prev = Fraction(new[k - 1], old[k - 1])
                    m_here = Fraction(new[k], old[k])
                    m_next = Fraction(new[k + 1], old[k + 1])
                    product = m_prev * m_next
                    multiplier_curvature = m_here * m_here - product
                    if multiplier_curvature >= 0:
                        continue

                    totals["negative_multiplier_curvatures"] += 1
                    row["negative_multiplier_curvatures"] += 1
                    denominator = product - 1
                    if denominator <= 0:
                        raise AssertionError("negative multiplier curvature with no reserve demand")
                    theta = -multiplier_curvature / denominator
                    h_prev = old_factorial[k - 1]
                    h_here = old_factorial[k]
                    h_next = old_factorial[k + 1]
                    reserve = Fraction(
                        h_here * h_here - h_prev * h_next,
                        h_here * h_here,
                    )
                    payment_ratio = theta / reserve if reserve > 0 else None
                    delta = (
                        (math.factorial(k) * new[k]) ** 2
                        - math.factorial(k - 1)
                        * new[k - 1]
                        * math.factorial(k + 1)
                        * new[k + 1]
                        - (
                            h_here * h_here - h_prev * h_next
                        )
                    )
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "attachment": attachment,
                        "alpha_after_attachment": alpha,
                        "cutoff": cutoff,
                        "rank": k,
                        "old": old,
                        "deletion": deletion,
                        "new": new,
                        "m_prev": str(m_prev),
                        "m_here": str(m_here),
                        "m_next": str(m_next),
                        "theta": str(theta),
                        "old_normalized_reserve": str(reserve),
                        "payment_ratio": (
                            None if payment_ratio is None else str(payment_ratio)
                        ),
                        "curvature_increment": delta,
                    }
                    if reserve < theta:
                        totals["compensation_failures"] += 1
                        if first_failure is None:
                            first_failure = item
                    if payment_ratio is not None:
                        if better_ratio(payment_ratio, worst_ratio):
                            worst_ratio = payment_ratio
                            worst_item = item
                        if better_ratio(payment_ratio, row_ratio):
                            row_ratio = payment_ratio
                        bucket = per_rank.setdefault(
                            str(k),
                            {
                                "negative_multiplier_curvatures": 0,
                                "maximum_payment_ratio": None,
                                "witness": None,
                            },
                        )
                        bucket["negative_multiplier_curvatures"] += 1
                        old_bucket = (
                            None
                            if bucket["maximum_payment_ratio"] is None
                            else Fraction(bucket["maximum_payment_ratio"])
                        )
                        if better_ratio(payment_ratio, old_bucket):
                            bucket["maximum_payment_ratio"] = str(payment_ratio)
                            bucket["witness"] = item

        row["maximum_payment_ratio"] = (
            None if row_ratio is None else str(row_ratio)
        )
        per_order.append(row)
        print(
            f"n={order}: trees={row['trees']:,} "
            f"attachments={row['attachments']:,} "
            f"negative multiplier={row['negative_multiplier_curvatures']:,} "
            f"max payment={row['maximum_payment_ratio']}",
            flush=True,
        )

    payload = {
        "status": (
            "prefix_compensation_failure"
            if first_failure is not None
            else "no_prefix_compensation_failure"
        ),
        "identity": (
            "Delta C/h_k^2=(m_k^2-m_{k-1}m_{k+1})"
            "+(1-rho_k)(m_{k-1}m_{k+1}-1)"
        ),
        "parameters": {"max_order": args.max_order},
        "totals": totals,
        "maximum_payment_ratio": (
            None if worst_ratio is None else str(worst_ratio)
        ),
        "maximum_payment_ratio_decimal": (
            None if worst_ratio is None else float(worst_ratio)
        ),
        "maximum_payment_ratio_witness": worst_item,
        "first_compensation_failure": first_failure,
        "per_rank": per_rank,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": payload["status"],
                "totals": totals,
                "maximum_payment_ratio": payload["maximum_payment_ratio"],
                "maximum_payment_ratio_decimal": payload[
                    "maximum_payment_ratio_decimal"
                ],
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if first_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
