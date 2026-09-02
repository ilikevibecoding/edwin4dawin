#!/usr/bin/env python3
"""Test the one-vertex scaled-curvature comparison on terminal pairs.

For a terminal leaf l with support p, put T=G-l and F=G-{l,p}.
The candidate comparison is

    tau_k(T) >= tau_(k-1)(F),

where tau_j(P)=j(1+j p_j/p_(j-1)-(j+1)p_(j+1)/p_j).

This is a falsifier and rank classifier, not a proof.
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


def tau(poly, rank: int) -> Fraction | None:
    previous = coeff(poly, rank - 1)
    current = coeff(poly, rank)
    following = coeff(poly, rank + 1)
    if previous <= 0 or current <= 0:
        return None
    return rank * (
        1
        + Fraction(rank * current, previous)
        - Fraction((rank + 1) * following, current)
    )


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--min-rank", type=int, default=3)
    parser.add_argument(
        "--all-ranks",
        action="store_true",
        help="scan every internal rank instead of the required prefix",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    failures = 0
    failures_by_rank: dict[int, int] = {}
    minimum_ratio = None
    minimum_item = None
    minimum_margin = None
    minimum_margin_item = None
    lower_sandwich_failures = 0
    upper_sandwich_failures = 0
    one_step_upper_failures = 0
    sandwich_failures_by_rank: dict[int, dict[str, int]] = {}
    sandwich_failures_by_alpha_gap: dict[
        str, dict[int, int]
    ] = {
        "w_le_v": {},
        "v_le_ku_over_r": {},
    }
    minimum_lower_sandwich_margin = None
    minimum_lower_sandwich_item = None
    minimum_upper_sandwich_margin = None
    minimum_upper_sandwich_item = None
    minimum_one_step_upper_margin = None
    minimum_one_step_upper_item = None
    clc_eligible_checks = 0
    clc_failures = 0
    maximum_clc_ratio = None
    maximum_clc_item = None
    maximum_likelihood_deficit_over_q = None
    maximum_likelihood_deficit_item = None
    two_to_one_failures = 0
    weighted_deficit_failures = 0
    linear_compensation_failures = 0
    simple_weighted_deficit_failures = 0
    linear_failures_by_alpha_gap: dict[str, dict[int, int]] = {
        "two_to_one": {},
        "weighted_deficit": {},
        "linear_compensation": {},
    }
    minimum_two_to_one = None
    minimum_two_to_one_item = None
    minimum_weighted_deficit = None
    minimum_weighted_deficit_item = None
    minimum_linear_compensation = None
    minimum_linear_compensation_item = None
    minimum_simple_weighted_deficit = None
    minimum_simple_weighted_deficit_item = None

    for order in range(2, args.max_order + 1):
        tree_count = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree_count += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            alpha = len(full) - 1
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            rank_stop = alpha if args.all_ranks else cutoff
            code = None
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                terminal = (
                    sum(
                        tree.degree(neighbor) > 1
                        for neighbor in tree[support]
                    )
                    <= 1
                )
                if not terminal:
                    continue
                t_mask = full_mask ^ (1 << engine.position[leaf])
                f_mask = t_mask ^ (1 << engine.position[support])
                t_poly = engine.polynomial(t_mask)
                f_poly = engine.polynomial(f_mask)
                for rank in range(args.min_rank, rank_stop):
                    tau_t = tau(t_poly, rank)
                    tau_f = tau(f_poly, rank - 1)
                    if tau_t is None or tau_f is None:
                        continue
                    r = rank - 1
                    a = coeff(t_poly, r)
                    ap = coeff(t_poly, rank)
                    bm = coeff(f_poly, r - 1)
                    b = coeff(f_poly, r)
                    bp = coeff(f_poly, rank)
                    if min(a, ap, bm, b) <= 0:
                        continue
                    u = Fraction(r * b, bm)
                    w = Fraction(rank * bp, b)
                    v = Fraction(rank * ap, a)
                    lower_sandwich_margin = v - w
                    upper_sandwich_margin = (
                        Fraction(rank, r) * u - v
                    )
                    one_step_upper_margin = u + 1 - v
                    margin = tau_t - tau_f
                    q_f = tau_f / r
                    x_ratio = u / r
                    likelihood_deficit = max(
                        Fraction(0), w - v
                    )
                    ordinary_ratio_drop = x_ratio + q_f - 1
                    theta = Fraction(bm, a + bm)
                    clc_left = (
                        Fraction(r, rank) * v * q_f
                        + Fraction(2, rank) * v * margin
                    )
                    clc_right = (
                        2
                        * theta
                        * likelihood_deficit
                        * (
                            2 * ordinary_ratio_drop
                            + likelihood_deficit
                        )
                    )
                    two_to_one = tau_f + 2 * margin
                    weighted_deficit = (
                        v - r * likelihood_deficit
                    )
                    simple_weighted_deficit = (
                        Fraction(b - r * (a - b), b)
                    )
                    linear_compensation = (
                        v * two_to_one
                        - 2 * rank * r * likelihood_deficit
                    )
                    checks += 1
                    if code is None:
                        code = graph6(tree)
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "leaf": leaf,
                        "support": support,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "rank": rank,
                        "tau_T": str(tau_t),
                        "tau_F": str(tau_f),
                        "margin": str(margin),
                        "u": str(u),
                        "w": str(w),
                        "v": str(v),
                        "v_minus_w": str(lower_sandwich_margin),
                        "ku_over_r_minus_v": str(
                            upper_sandwich_margin
                        ),
                        "u_plus_one_minus_v":
                            str(one_step_upper_margin),
                        "q_F": str(q_f),
                        "likelihood_deficit": str(
                            likelihood_deficit
                        ),
                        "ordinary_ratio_drop_M": str(
                            ordinary_ratio_drop
                        ),
                        "CLC_left": str(clc_left),
                        "CLC_right": str(clc_right),
                        "two_to_one_curvature": str(two_to_one),
                        "weighted_likelihood_deficit":
                            str(weighted_deficit),
                        "simple_weighted_deficit":
                            str(simple_weighted_deficit),
                        "linear_compensation":
                            str(linear_compensation),
                    }
                    if (
                        minimum_two_to_one is None
                        or two_to_one < minimum_two_to_one
                    ):
                        minimum_two_to_one = two_to_one
                        minimum_two_to_one_item = item
                    if two_to_one < 0:
                        two_to_one_failures += 1
                        gap_counts = linear_failures_by_alpha_gap[
                            "two_to_one"
                        ]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                    if (
                        minimum_weighted_deficit is None
                        or weighted_deficit
                        < minimum_weighted_deficit
                    ):
                        minimum_weighted_deficit = weighted_deficit
                        minimum_weighted_deficit_item = item
                    if weighted_deficit < 0:
                        weighted_deficit_failures += 1
                        gap_counts = linear_failures_by_alpha_gap[
                            "weighted_deficit"
                        ]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                    if (
                        minimum_simple_weighted_deficit is None
                        or simple_weighted_deficit
                        < minimum_simple_weighted_deficit
                    ):
                        minimum_simple_weighted_deficit = (
                            simple_weighted_deficit
                        )
                        minimum_simple_weighted_deficit_item = item
                    if simple_weighted_deficit < 0:
                        simple_weighted_deficit_failures += 1
                    if (
                        minimum_linear_compensation is None
                        or linear_compensation
                        < minimum_linear_compensation
                    ):
                        minimum_linear_compensation = (
                            linear_compensation
                        )
                        minimum_linear_compensation_item = item
                    if linear_compensation < 0:
                        linear_compensation_failures += 1
                        gap_counts = linear_failures_by_alpha_gap[
                            "linear_compensation"
                        ]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                    if minimum_margin is None or margin < minimum_margin:
                        minimum_margin = margin
                        minimum_margin_item = item
                    if tau_t > 0 and tau_f > 0:
                        ratio = tau_t / tau_f
                        if minimum_ratio is None or ratio < minimum_ratio:
                            minimum_ratio = ratio
                            minimum_item = item | {"ratio": str(ratio)}
                    if margin < 0:
                        failures += 1
                        failures_by_rank[rank] = (
                            failures_by_rank.get(rank, 0) + 1
                        )
                    if (
                        minimum_lower_sandwich_margin is None
                        or lower_sandwich_margin
                        < minimum_lower_sandwich_margin
                    ):
                        minimum_lower_sandwich_margin = (
                            lower_sandwich_margin
                        )
                        minimum_lower_sandwich_item = item
                    if (
                        minimum_upper_sandwich_margin is None
                        or upper_sandwich_margin
                        < minimum_upper_sandwich_margin
                    ):
                        minimum_upper_sandwich_margin = (
                            upper_sandwich_margin
                        )
                        minimum_upper_sandwich_item = item
                    if (
                        minimum_one_step_upper_margin is None
                        or one_step_upper_margin
                        < minimum_one_step_upper_margin
                    ):
                        minimum_one_step_upper_margin = (
                            one_step_upper_margin
                        )
                        minimum_one_step_upper_item = item
                    rank_failures = sandwich_failures_by_rank.setdefault(
                        rank, {"w_le_v": 0, "v_le_ku_over_r": 0}
                    )
                    if lower_sandwich_margin < 0:
                        lower_sandwich_failures += 1
                        rank_failures["w_le_v"] += 1
                        gap_counts = sandwich_failures_by_alpha_gap[
                            "w_le_v"
                        ]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                    if upper_sandwich_margin < 0:
                        upper_sandwich_failures += 1
                        rank_failures["v_le_ku_over_r"] += 1
                        gap_counts = sandwich_failures_by_alpha_gap[
                            "v_le_ku_over_r"
                        ]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                    if one_step_upper_margin < 0:
                        one_step_upper_failures += 1
                    if likelihood_deficit > 0 and q_f > 0:
                        deficit_ratio = likelihood_deficit / q_f
                        if (
                            maximum_likelihood_deficit_over_q is None
                            or deficit_ratio
                            > maximum_likelihood_deficit_over_q
                        ):
                            maximum_likelihood_deficit_over_q = (
                                deficit_ratio
                            )
                            maximum_likelihood_deficit_item = item
                    if (
                        margin >= 0
                        and upper_sandwich_margin >= 0
                        and ordinary_ratio_drop >= 0
                        and q_f >= 0
                    ):
                        clc_eligible_checks += 1
                        if clc_left < clc_right:
                            clc_failures += 1
                        if clc_left > 0:
                            clc_ratio = clc_right / clc_left
                            if (
                                maximum_clc_ratio is None
                                or clc_ratio > maximum_clc_ratio
                            ):
                                maximum_clc_ratio = clc_ratio
                                maximum_clc_item = item
        print(f"n={order} trees={tree_count:,}", flush=True)

    report = {
        "status": "FAIL" if failures else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
        "failures_by_rank": {
            str(rank): count
            for rank, count in sorted(failures_by_rank.items())
        },
        "minimum_ratio": (
            None
            if minimum_ratio is None
            else {
                "exact": str(minimum_ratio),
                "decimal": float(minimum_ratio),
                "witness": minimum_item,
            }
        ),
        "minimum_margin_witness": minimum_margin_item,
        "lower_sandwich_failures": lower_sandwich_failures,
        "upper_sandwich_failures": upper_sandwich_failures,
        "one_step_upper_failures": one_step_upper_failures,
        "sandwich_failures_by_rank": {
            str(rank): counts
            for rank, counts in sorted(
                sandwich_failures_by_rank.items()
            )
            if any(counts.values())
        },
        "sandwich_failures_by_alpha_gap": {
            name: {
                str(gap): count
                for gap, count in sorted(counts.items())
            }
            for name, counts
            in sandwich_failures_by_alpha_gap.items()
        },
        "minimum_lower_sandwich_margin_witness":
            minimum_lower_sandwich_item,
        "minimum_upper_sandwich_margin_witness":
            minimum_upper_sandwich_item,
        "minimum_one_step_upper_margin": {
            "exact": str(minimum_one_step_upper_margin),
            "decimal": float(minimum_one_step_upper_margin),
            "witness": minimum_one_step_upper_item,
        },
        "curvature_likelihood_compensation": {
            "eligible_checks": clc_eligible_checks,
            "failures": clc_failures,
            "maximum_right_over_left": (
                None
                if maximum_clc_ratio is None
                else {
                    "exact": str(maximum_clc_ratio),
                    "decimal": float(maximum_clc_ratio),
                    "witness": maximum_clc_item,
                }
            ),
            "maximum_likelihood_deficit_over_q_F": (
                None
                if maximum_likelihood_deficit_over_q is None
                else {
                    "exact": str(
                        maximum_likelihood_deficit_over_q
                    ),
                    "decimal": float(
                        maximum_likelihood_deficit_over_q
                    ),
                    "witness": maximum_likelihood_deficit_item,
                }
            ),
        },
        "linear_compensation_package": {
            "two_to_one_failures": two_to_one_failures,
            "weighted_deficit_failures":
                weighted_deficit_failures,
            "simple_weighted_deficit_failures":
                simple_weighted_deficit_failures,
            "linear_compensation_failures":
                linear_compensation_failures,
            "failures_by_alpha_gap": {
                name: {
                    str(gap): count
                    for gap, count in sorted(counts.items())
                }
                for name, counts
                in linear_failures_by_alpha_gap.items()
            },
            "minimum_two_to_one": {
                "exact": str(minimum_two_to_one),
                "decimal": float(minimum_two_to_one),
                "witness": minimum_two_to_one_item,
            },
            "minimum_weighted_deficit": {
                "exact": str(minimum_weighted_deficit),
                "decimal": float(minimum_weighted_deficit),
                "witness": minimum_weighted_deficit_item,
            },
            "minimum_simple_weighted_deficit": {
                "exact": str(minimum_simple_weighted_deficit),
                "decimal": float(
                    minimum_simple_weighted_deficit
                ),
                "witness": minimum_simple_weighted_deficit_item,
            },
            "minimum_linear_compensation": {
                "exact": str(minimum_linear_compensation),
                "decimal": float(minimum_linear_compensation),
                "witness": minimum_linear_compensation_item,
            },
        },
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "failures": failures,
                "failures_by_rank": report["failures_by_rank"],
                "lower_sandwich_failures":
                    lower_sandwich_failures,
                "upper_sandwich_failures":
                    upper_sandwich_failures,
                "sandwich_failures_by_rank":
                    report["sandwich_failures_by_rank"],
                "curvature_likelihood_compensation":
                    report[
                        "curvature_likelihood_compensation"
                    ],
                "linear_compensation_package":
                    report["linear_compensation_package"],
                "minimum_ratio": report["minimum_ratio"],
                "report": str(args.out),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
