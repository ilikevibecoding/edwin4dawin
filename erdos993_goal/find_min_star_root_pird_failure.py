#!/usr/bin/env python3
"""Exhaust the depth-two star-root family for PIRD failures.

Let q be adjacent to star centres v_i, where v_i has a_i >= 1
pendant leaves.  With

    K = product_i ((1+x)^a_i + x),
    L = (1+x)^sum_i a_i,
    B = (1+x)(K + xL),

the prefix isolated-root ratio-dominance (PIRD) minor at rank r is

    B_r K_{r-1} - B_{r-1} K_r.

Instances are enumerated in increasing order of the rooted tree
1 + sum_i(a_i+1), using integer partitions of the branch costs.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path


def conv(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if not ai:
            continue
        for j, bj in enumerate(b):
            if bj:
                out[i + j] += ai * bj
    return out


def binomial(n: int) -> list[int]:
    return [comb(n, j) for j in range(n + 1)]


def star(leaves: int) -> list[int]:
    out = binomial(leaves)
    out[1] += 1
    return out


def partitions_with_cost(cost: int, minimum_leaves: int = 1):
    """Yield nondecreasing a_i with sum_i(a_i+1) == cost."""
    if cost == 0:
        yield ()
        return
    for leaves in range(minimum_leaves, cost):
        branch_cost = leaves + 1
        if branch_cost > cost:
            break
        remainder = cost - branch_cost
        if remainder == 0:
            yield (leaves,)
            continue
        for rest in partitions_with_cost(remainder, leaves):
            yield (leaves,) + rest


def build(branches: tuple[int, ...]) -> tuple[list[int], list[int], list[int]]:
    k_poly = [1]
    total_leaves = 0
    for leaves in branches:
        k_poly = conv(k_poly, star(leaves))
        total_leaves += leaves
    l_poly = binomial(total_leaves)
    inside = k_poly + [0] * max(0, len(l_poly) + 1 - len(k_poly))
    for j, value in enumerate(l_poly):
        inside[j + 1] += value
    b_poly = conv(inside, [1, 1])
    return k_poly, l_poly, b_poly


def first_negative_minor(
    k_poly: list[int],
    b_poly: list[int],
    min_rank: int,
    prefix_only: bool,
):
    for rank in range(max(1, min_rank), len(b_poly)):
        bm = b_poly[rank - 1]
        br = b_poly[rank]
        km = k_poly[rank - 1] if rank - 1 < len(k_poly) else 0
        kr = k_poly[rank] if rank < len(k_poly) else 0
        if not bm or not br:
            continue
        if prefix_only and br < bm:
            continue
        minor = br * km - bm * kr
        if minor < 0:
            return {
                "rank_r": rank,
                "B_previous": bm,
                "B_current": br,
                "K_previous": km,
                "K_current": kr,
                "minor": minor,
                "on_prefix": br >= bm,
            }
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checked = 0
    coefficient_checks = 0
    witness = None
    first_negative_lr_correction = None
    first_negative_lr_first = None
    first_negative_lr_second = None
    first_factor_two_ratio_failure = None
    first_above_one_ratio_rebound = None
    first_prefix_above_one_ratio_rebound = None
    first_root_ratio_failure = None
    first_negative_correction_after_q_descent = None
    first_half_rebound_bound_failure = None
    counts_by_order: dict[str, int] = {}

    # The rooted tree order is 1 + branch_cost.
    for order in range(1, args.n_max + 1):
        order_count = 0
        for branches in partitions_with_cost(order - 1):
            # The empty list is the one-vertex rooted tree.
            checked += 1
            order_count += 1
            k_poly, l_poly, b_poly = build(branches)
            for j in range(1, min(len(k_poly), len(l_poly))):
                if (
                    k_poly[j] * l_poly[j - 1]
                    > 2 * k_poly[j - 1] * l_poly[j]
                    and first_factor_two_ratio_failure is None
                ):
                    first_factor_two_ratio_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "rank_j": j,
                        "K_previous": k_poly[j - 1],
                        "K_current": k_poly[j],
                        "L_previous": l_poly[j - 1],
                        "L_current": l_poly[j],
                        "cleared_excess":
                            k_poly[j] * l_poly[j - 1]
                            - 2 * k_poly[j - 1] * l_poly[j],
                    }
                if j + 1 < min(len(k_poly), len(l_poly)):
                    # q_{j+1}^j <= q_j^(j+1), where q_t=K_t/L_t.
                    left = (
                        k_poly[j + 1] ** j
                        * l_poly[j] ** (j + 1)
                    )
                    right = (
                        k_poly[j] ** (j + 1)
                        * l_poly[j + 1] ** j
                    )
                    if left > right and first_root_ratio_failure is None:
                        first_root_ratio_failure = {
                            "rooted_tree_order": order,
                            "star_leaf_counts": list(branches),
                            "j": j,
                            "K_j": k_poly[j],
                            "K_jp1": k_poly[j + 1],
                            "L_j": l_poly[j],
                            "L_jp1": l_poly[j + 1],
                            "cleared_excess": left - right,
                        }
            q_num = k_poly
            q_den = l_poly
            for j in range(1, min(len(k_poly), len(l_poly)) - 1):
                # R_{j-1}=q_j/q_{j-1}, R_j=q_{j+1}/q_j.
                # Detect R_j>1 and R_j>R_{j-1}.
                rj_above_one = (
                    q_num[j + 1] * q_den[j]
                    > q_num[j] * q_den[j + 1]
                )
                rebound = (
                    q_num[j + 1]
                    * q_den[j]
                    * q_num[j - 1]
                    * q_den[j]
                    >
                    q_num[j]
                    * q_den[j + 1]
                    * q_num[j]
                    * q_den[j - 1]
                )
                # Test R_j <= 1 + R_{j-1}/2.
                rj_num = q_num[j + 1] * q_den[j]
                rj_den = q_num[j] * q_den[j + 1]
                rp_num = q_num[j] * q_den[j - 1]
                rp_den = q_num[j - 1] * q_den[j]
                half_rebound_failure = (
                    2 * rj_num * rp_den
                    >
                    2 * rj_den * rp_den
                    + rj_den * rp_num
                )
                if (
                    half_rebound_failure
                    and first_half_rebound_bound_failure is None
                ):
                    first_half_rebound_bound_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "j": j,
                        "K_jm1": q_num[j - 1],
                        "K_j": q_num[j],
                        "K_jp1": q_num[j + 1],
                        "L_jm1": q_den[j - 1],
                        "L_j": q_den[j],
                        "L_jp1": q_den[j + 1],
                    }
                if (
                    rj_above_one
                    and rebound
                    and first_above_one_ratio_rebound is None
                ):
                    first_above_one_ratio_rebound = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "j": j,
                        "K_jm1": q_num[j - 1],
                        "K_j": q_num[j],
                        "K_jp1": q_num[j + 1],
                        "L_jm1": q_den[j - 1],
                        "L_j": q_den[j],
                        "L_jp1": q_den[j + 1],
                    }
                if (
                    rj_above_one
                    and rebound
                    and j + 1 < len(b_poly)
                    and b_poly[j + 1] >= b_poly[j]
                    and first_prefix_above_one_ratio_rebound is None
                ):
                    first_prefix_above_one_ratio_rebound = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "j": j,
                        "B_j": b_poly[j],
                        "B_jp1": b_poly[j + 1],
                        "K_jm1": q_num[j - 1],
                        "K_j": q_num[j],
                        "K_jp1": q_num[j + 1],
                        "L_jm1": q_den[j - 1],
                        "L_j": q_den[j],
                        "L_jp1": q_den[j + 1],
                    }
                total_leaves = sum(branches)
                if 0 < j < total_leaves:
                    negative_correction_ratio = (
                        q_num[j + 1]
                        * q_den[j]
                        * j
                        * (total_leaves - j)
                        >
                        q_num[j]
                        * q_den[j + 1]
                        * (j + 1)
                        * (total_leaves - j + 2)
                    )
                    previous_q_descent = (
                        q_num[j] * q_den[j - 1]
                        < q_num[j - 1] * q_den[j]
                    )
                    if (
                        negative_correction_ratio
                        and previous_q_descent
                        and first_negative_correction_after_q_descent is None
                    ):
                        first_negative_correction_after_q_descent = {
                            "rooted_tree_order": order,
                            "star_leaf_counts": list(branches),
                            "j": j,
                            "total_leaves": total_leaves,
                            "K_jm1": q_num[j - 1],
                            "K_j": q_num[j],
                            "K_jp1": q_num[j + 1],
                            "L_jm1": q_den[j - 1],
                            "L_j": q_den[j],
                            "L_jp1": q_den[j + 1],
                        }
            for rank in range(max(1, args.min_rank), len(b_poly)):
                if not b_poly[rank - 1] or not b_poly[rank]:
                    continue
                if args.prefix_only and b_poly[rank] < b_poly[rank - 1]:
                    continue
                coefficient_checks += 1
                k = rank - 1
                kk = k_poly[k] if k < len(k_poly) else 0
                kk1 = (
                    k_poly[k + 1]
                    if k + 1 < len(k_poly)
                    else 0
                )
                lk = l_poly[k] if k < len(l_poly) else 0
                lkm = l_poly[k - 1] if 0 <= k - 1 < len(l_poly) else 0
                lkmm = (
                    l_poly[k - 2]
                    if 0 <= k - 2 < len(l_poly)
                    else 0
                )
                lr_correction = (
                    kk * (lk + lkm)
                    - kk1 * (lkm + lkmm)
                )
                lr_first = kk * lk - kk1 * lkm
                lr_second = kk * lkm - kk1 * lkmm
                if lr_first < 0 and first_negative_lr_first is None:
                    first_negative_lr_first = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "rank_r": rank,
                        "k": k,
                        "value": lr_first,
                        "on_prefix":
                            b_poly[rank] >= b_poly[rank - 1],
                    }
                if lr_second < 0 and first_negative_lr_second is None:
                    first_negative_lr_second = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "rank_r": rank,
                        "k": k,
                        "value": lr_second,
                        "on_prefix":
                            b_poly[rank] >= b_poly[rank - 1],
                    }
                if (
                    lr_correction < 0
                    and first_negative_lr_correction is None
                ):
                    first_negative_lr_correction = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "rank_r": rank,
                        "k": k,
                        "lr_correction": lr_correction,
                        "K_k": kk,
                        "K_k1": kk1,
                        "L_k": lk,
                        "L_km1": lkm,
                        "L_km2": lkmm,
                        "on_prefix":
                            b_poly[rank] >= b_poly[rank - 1],
                    }
            failure = first_negative_minor(
                k_poly,
                b_poly,
                args.min_rank,
                args.prefix_only,
            )
            if failure is not None:
                witness = {
                    "rooted_tree_order": order,
                    "star_leaf_counts": list(branches),
                    "total_leaves": sum(branches),
                    **failure,
                    "K": k_poly,
                    "L": l_poly,
                    "B": b_poly,
                }
                break
        counts_by_order[str(order)] = order_count
        print(
            f"n={order}: instances={order_count:,} "
            f"total={checked:,} checks={coefficient_checks:,}",
            flush=True,
        )
        if witness is not None:
            break

    report = {
        "status": "FAILURE_FOUND" if witness else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "instances": checked,
        "coefficient_checks": coefficient_checks,
        "counts_by_order": counts_by_order,
        "witness": witness,
        "first_negative_lr_correction":
            first_negative_lr_correction,
        "first_negative_lr_first": first_negative_lr_first,
        "first_negative_lr_second": first_negative_lr_second,
        "first_factor_two_ratio_failure":
            first_factor_two_ratio_failure,
        "first_above_one_ratio_rebound":
            first_above_one_ratio_rebound,
        "first_prefix_above_one_ratio_rebound":
            first_prefix_above_one_ratio_rebound,
        "first_root_ratio_failure": first_root_ratio_failure,
        "first_negative_correction_after_q_descent":
            first_negative_correction_after_q_descent,
        "first_half_rebound_bound_failure":
            first_half_rebound_bound_failure,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
