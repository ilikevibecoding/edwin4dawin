#!/usr/bin/env python3
"""Audit the exact down-link decomposition of pointed ISO.

For a uniform independent (r-1)-set S, delete a uniformly random
member to obtain K.  Conditional on K, the deleted member is uniform
on the residual forest F-N[K].  The global pointed half-reserve equals
the size-biased average of the rank-two pointed margins plus

    (r-2)(1-2p+2 E(C_K+Z_K))
      - Var(A_K) + 2r Cov(A_K,p_K),

where A_K=E[e(S)|K], p_K=E[Y|K],
C_K=Cov(Y,e|K), and Z_K=E[(1-Y)L|K].
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6


def encode(value: Fraction | None, item: dict | None):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **(item or {})}


def masks_of_size(order: int, size: int):
    for vertices in combinations(range(order), size):
        mask = 0
        for vertex in vertices:
            mask |= 1 << vertex
        yield mask


def independent(mask: int, adjacency: list[int]) -> bool:
    rest = mask
    while rest:
        bit = rest & -rest
        vertex = bit.bit_length() - 1
        rest ^= bit
        if adjacency[vertex] & rest:
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=11)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument(
        "--all-ranks",
        action="store_true",
        help="Do not restrict to the relevant branch u>=r.",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = correction_failures = identity_failures = 0
    local_failures = valid_local_failures = global_failures = 0
    minimum_correction = None
    minimum_correction_item = None
    minimum_local = None
    minimum_local_item = None
    minimum_valid_local = None
    minimum_valid_local_item = None
    minimum_valid_correction = None
    minimum_valid_correction_item = None
    valid_correction_failures = 0
    valid_half_lift_failures = 0
    minimum_valid_half_lift = None
    minimum_valid_half_lift_item = None
    minimum_global = None
    minimum_global_item = None
    pointwise_square_failures = 0
    pointwise_square_failures_by_state = {
        "selected": 0,
        "blocked": 0,
        "open": 0,
    }
    state_group_square_failures = {
        "selected": 0,
        "blocked": 0,
        "open": 0,
    }
    state_partition_square_failures = {
        "selected_plus_blocked": 0,
        "open_remainder": 0,
        "selected_plus_open": 0,
        "blocked_remainder": 0,
        "blocked_plus_open": 0,
        "selected_remainder": 0,
        "selected_plus_half_blocked": 0,
        "open_plus_half_blocked": 0,
    }
    minimum_pointwise_square = None
    minimum_pointwise_square_item = None

    for order in range(1, args.max_order + 1):
        tree_iter = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = 0
        for tree_index, tree in enumerate(tree_iter):
            order_trees += 1
            adjacency = [0] * order
            edge_masks: list[int] = []
            for left, right in tree.edges():
                adjacency[left] |= 1 << right
                adjacency[right] |= 1 << left
                edge_masks.append((1 << left) | (1 << right))
            closed = [
                adjacency[vertex] | (1 << vertex)
                for vertex in range(order)
            ]
            all_mask = (1 << order) - 1

            independent_by_rank: list[list[int]] = [
                [] for _ in range(order + 1)
            ]
            b = [0] * (order + 2)
            for size in range(order + 1):
                for mask in masks_of_size(order, size):
                    if independent(mask, adjacency):
                        independent_by_rank[size].append(mask)
                        b[size] += 1
                if not independent_by_rank[size] and size:
                    break

            code = graph6(tree)
            for r in range(args.min_rank, order + 1):
                if not independent_by_rank[r - 2]:
                    continue
                bm, br, bp = b[r - 1], b[r], b[r + 1]
                if min(bm, br) <= 0:
                    continue
                u = Fraction(r * br, bm)
                if not args.all_ranks and u < r:
                    continue

                # Statistics not involving the distinguished root.
                residual_data = []
                downlink_mass = 0
                for k_mask in independent_by_rank[r - 2]:
                    forbidden = 0
                    rest = k_mask
                    while rest:
                        bit = rest & -rest
                        vertex = bit.bit_length() - 1
                        rest ^= bit
                        forbidden |= closed[vertex]
                    residual = all_mask & ~forbidden
                    n_residual = residual.bit_count()
                    if n_residual == 0:
                        continue
                    downlink_mass += n_residual
                    e_values: dict[int, int] = {}
                    q_values: dict[int, int] = {}
                    sum_e = sum_e2 = sum_q = 0
                    rest = residual
                    while rest:
                        x_bit = rest & -rest
                        x = x_bit.bit_length() - 1
                        rest ^= x_bit
                        after = residual & ~closed[x]
                        e_value = after.bit_count()
                        q_value = sum(
                            1
                            for edge_mask in edge_masks
                            if edge_mask & after == edge_mask
                        )
                        e_values[x] = e_value
                        q_values[x] = q_value
                        sum_e += e_value
                        sum_e2 += e_value * e_value
                        sum_q += q_value
                    residual_data.append(
                        (
                            k_mask,
                            residual,
                            n_residual,
                            e_values,
                            Fraction(sum_e, n_residual),
                            Fraction(sum_e2, n_residual),
                            Fraction(sum_q, n_residual),
                        )
                    )
                assert downlink_mass == (r - 1) * bm

                for root in range(order):
                    root_bit = 1 << root
                    hm = sum(
                        1
                        for mask in independent_by_rank[r - 1]
                        if mask & root_bit
                    )
                    hr = sum(
                        1
                        for mask in independent_by_rank[r]
                        if mask & root_bit
                    )
                    rho_m = Fraction(hm, bm)
                    rho = Fraction(hr, br)
                    reserve = Fraction(
                        r
                        * (
                            r * br * br
                            + bm * bm
                            - (r + 1) * bm * bp
                        ),
                        bm * bm,
                    )
                    burden = (
                        r * (u + 1) * rho_m
                        - (r + 1) * u * rho
                    )
                    global_margin = reserve - 2 * burden

                    weighted_a = weighted_a2 = Fraction(0)
                    weighted_p = weighted_ap = Fraction(0)
                    weighted_cz = weighted_local = Fraction(0)
                    weighted_valid_local = Fraction(0)
                    pointwise_group_sums = {
                        "selected": Fraction(0),
                        "blocked": Fraction(0),
                        "open": Fraction(0),
                    }
                    smallest_local_for_item = None
                    for (
                        k_mask,
                        residual,
                        n_residual,
                        e_values,
                        a_k,
                        mean_e2,
                        mean_q,
                    ) in residual_data:
                        if k_mask & root_bit:
                            p_k = Fraction(1)
                            cov_k = Fraction(0)
                            z_k = Fraction(0)
                        elif not residual & root_bit:
                            p_k = Fraction(0)
                            cov_k = Fraction(0)
                            z_k = Fraction(0)
                        else:
                            e_root = e_values[root]
                            p_k = Fraction(1, n_residual)
                            cov_k = Fraction(e_root, n_residual) - (
                                p_k * a_k
                            )
                            z_k = Fraction(e_root, n_residual)
                        variance_k = mean_e2 - a_k * a_k
                        local_margin = (
                            2
                            + a_k
                            + 2 * mean_q
                            - variance_k
                            - 2 * (2 - a_k) * p_k
                            + 6 * cov_k
                            + 6 * z_k
                        )
                        # If K already contains the root, the global hit
                        # event is certain on this fiber.  The applicable
                        # local theorem is then ordinary rank-two ISO, not
                        # pointed ISO for the certain event.  Removing its
                        # artificial burden adds 2(2-A_K).
                        valid_local_margin = local_margin
                        local_burden = (
                            (2 - a_k) * p_k
                            - 3 * cov_k
                            - 3 * z_k
                        )
                        if (
                            k_mask & root_bit
                            or n_residual < 2
                        ):
                            valid_local_margin += 2 * local_burden
                        applicable_adjustment = (
                            valid_local_margin - local_margin
                        )
                        local_drift_factor = (
                            1
                            - 2 * p_k
                            + 2 * (cov_k + z_k)
                        )
                        centered_p = p_k - rho_m
                        centered_combination = (
                            a_k - u - r * centered_p
                        )
                        pointwise_square_margin = (
                            local_margin
                            - applicable_adjustment
                            + 2 * (r - 2) * local_drift_factor
                            + 2 * r * r * centered_p * centered_p
                            - 2
                            * centered_combination
                            * centered_combination
                        )
                        if k_mask & root_bit:
                            pointwise_state = "selected"
                        elif not residual & root_bit:
                            pointwise_state = "blocked"
                        else:
                            pointwise_state = "open"
                        weight = Fraction(n_residual, downlink_mass)
                        pointwise_group_sums[pointwise_state] += (
                            weight * pointwise_square_margin
                        )
                        weighted_a += weight * a_k
                        weighted_a2 += weight * a_k * a_k
                        weighted_p += weight * p_k
                        weighted_ap += weight * a_k * p_k
                        weighted_cz += weight * (cov_k + z_k)
                        weighted_local += weight * local_margin
                        weighted_valid_local += (
                            weight * valid_local_margin
                        )
                        if (
                            smallest_local_for_item is None
                            or local_margin < smallest_local_for_item
                        ):
                            smallest_local_for_item = local_margin
                        if (
                            minimum_local is None
                            or local_margin < minimum_local
                        ):
                            minimum_local = local_margin
                            minimum_local_item = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                "rank_r": r,
                                "K_mask": k_mask,
                                "K_hits_root": bool(k_mask & root_bit),
                            }
                        if local_margin < 0:
                            local_failures += 1
                        if valid_local_margin < 0:
                            valid_local_failures += 1
                        if pointwise_square_margin < 0:
                            pointwise_square_failures += 1
                            pointwise_square_failures_by_state[
                                pointwise_state
                            ] += 1
                        if (
                            minimum_pointwise_square is None
                            or pointwise_square_margin
                            < minimum_pointwise_square
                        ):
                            minimum_pointwise_square = (
                                pointwise_square_margin
                            )
                            minimum_pointwise_square_item = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                "rank_r": r,
                                "K_mask": k_mask,
                                "A_K": str(a_k),
                                "p_K": str(p_k),
                                "global_u": str(u),
                                "global_p": str(rho_m),
                                "local_margin": str(local_margin),
                                "applicable_adjustment": str(
                                    applicable_adjustment
                                ),
                                "local_drift_factor": str(
                                    local_drift_factor
                                ),
                            }
                        if (
                            minimum_valid_local is None
                            or valid_local_margin < minimum_valid_local
                        ):
                            minimum_valid_local = valid_local_margin
                            minimum_valid_local_item = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": code,
                                "root": root,
                                "rank_r": r,
                                "K_mask": k_mask,
                                "K_hits_root": bool(
                                    k_mask & root_bit
                                ),
                                "residual_mask": residual,
                                "residual_order": n_residual,
                                "A_K": str(a_k),
                                "p_K": str(p_k),
                                "Cov_K": str(cov_k),
                                "Z_K": str(z_k),
                                "Var_e_K": str(variance_k),
                                "E_q_K": str(mean_q),
                                "raw_local_margin": str(
                                    local_margin
                                ),
                            }

                    variance_a = weighted_a2 - weighted_a**2
                    for (
                        pointwise_state,
                        group_sum,
                    ) in pointwise_group_sums.items():
                        if group_sum < 0:
                            state_group_square_failures[
                                pointwise_state
                            ] += 1
                    for pair_name, states in (
                        (
                            "selected_plus_blocked",
                            ("selected", "blocked"),
                        ),
                        ("open_remainder", ("open",)),
                        (
                            "selected_plus_open",
                            ("selected", "open"),
                        ),
                        ("blocked_remainder", ("blocked",)),
                        (
                            "blocked_plus_open",
                            ("blocked", "open"),
                        ),
                        ("selected_remainder", ("selected",)),
                    ):
                        if sum(
                            pointwise_group_sums[state]
                            for state in states
                        ) < 0:
                            state_partition_square_failures[
                                pair_name
                            ] += 1
                    if (
                        pointwise_group_sums["selected"]
                        + pointwise_group_sums["blocked"] / 2
                        < 0
                    ):
                        state_partition_square_failures[
                            "selected_plus_half_blocked"
                        ] += 1
                    if (
                        pointwise_group_sums["open"]
                        + pointwise_group_sums["blocked"] / 2
                        < 0
                    ):
                        state_partition_square_failures[
                            "open_plus_half_blocked"
                        ] += 1
                    covariance_ap = (
                        weighted_ap - weighted_a * weighted_p
                    )
                    correction = (
                        (r - 2)
                        * (1 - 2 * weighted_p + 2 * weighted_cz)
                        - variance_a
                        + 2 * r * covariance_ap
                    )
                    reconstructed = weighted_local + correction
                    valid_correction = (
                        global_margin - weighted_valid_local
                    )
                    valid_half_lift = (
                        2 * global_margin
                        - weighted_valid_local
                    )
                    checks += 1
                    item = {
                        "order": order,
                        "tree_index": tree_index,
                        "graph6": code,
                        "root": root,
                        "rank_r": r,
                        "u": str(u),
                        "p": str(weighted_p),
                        "average_A": str(weighted_a),
                        "average_local_margin": str(weighted_local),
                        "average_valid_local_margin": str(
                            weighted_valid_local
                        ),
                        "between_correction": str(correction),
                        "valid_between_correction": str(
                            valid_correction
                        ),
                        "global_margin": str(global_margin),
                        "applicable_half_lift_margin": str(
                            valid_half_lift
                        ),
                        "minimum_local_margin_for_instance": str(
                            smallest_local_for_item
                        ),
                    }
                    if weighted_a != u or weighted_p != rho_m:
                        identity_failures += 1
                    if reconstructed != global_margin:
                        identity_failures += 1
                    if correction < 0:
                        correction_failures += 1
                    if valid_correction < 0:
                        valid_correction_failures += 1
                    if valid_half_lift < 0:
                        valid_half_lift_failures += 1
                    if global_margin < 0:
                        global_failures += 1
                    if (
                        minimum_correction is None
                        or correction < minimum_correction
                    ):
                        minimum_correction = correction
                        minimum_correction_item = item
                    if (
                        minimum_valid_correction is None
                        or valid_correction
                        < minimum_valid_correction
                    ):
                        minimum_valid_correction = valid_correction
                        minimum_valid_correction_item = item
                    if (
                        minimum_valid_half_lift is None
                        or valid_half_lift
                        < minimum_valid_half_lift
                    ):
                        minimum_valid_half_lift = valid_half_lift
                        minimum_valid_half_lift_item = item
                    if (
                        minimum_global is None
                        or global_margin < minimum_global
                    ):
                        minimum_global = global_margin
                        minimum_global_item = item
        print(
            f"n={order}: trees={order_trees:,} checks={checks:,} "
            f"correction_failures={correction_failures:,} "
            f"valid_half_lift_failures="
            f"{valid_half_lift_failures:,} "
            f"pointwise_square_failures="
            f"{pointwise_square_failures:,} "
            f"identity_failures={identity_failures:,}",
            flush=True,
        )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "identity_failures": identity_failures,
        "negative_local_rank2_margins": local_failures,
        "negative_applicable_local_rank2_margins":
            valid_local_failures,
        "negative_between_corrections": correction_failures,
        "negative_applicable_between_corrections":
            valid_correction_failures,
        "negative_applicable_half_lift_margins":
            valid_half_lift_failures,
        "negative_pointwise_square_margins":
            pointwise_square_failures,
        "negative_pointwise_square_margins_by_state":
            pointwise_square_failures_by_state,
        "negative_state_group_square_sums":
            state_group_square_failures,
        "negative_state_partition_square_sums":
            state_partition_square_failures,
        "negative_global_margins": global_failures,
        "minimum_local_rank2_margin": encode(
            minimum_local, minimum_local_item
        ),
        "minimum_between_correction": encode(
            minimum_correction, minimum_correction_item
        ),
        "minimum_applicable_local_rank2_margin": encode(
            minimum_valid_local, minimum_valid_local_item
        ),
        "minimum_applicable_between_correction": encode(
            minimum_valid_correction,
            minimum_valid_correction_item,
        ),
        "minimum_applicable_half_lift_margin": encode(
            minimum_valid_half_lift,
            minimum_valid_half_lift_item,
        ),
        "minimum_global_margin": encode(
            minimum_global, minimum_global_item
        ),
        "minimum_pointwise_square_margin": encode(
            minimum_pointwise_square,
            minimum_pointwise_square_item,
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 1 if identity_failures or global_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
