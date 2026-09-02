#!/usr/bin/env python3
"""Exact large-tree audit of the component-(B) Cauchy certificate.

For every independent K, the residual forest R=F-N[K] is summarized
by

    |K|, N=|R|, M=|E(R)|,

the state of the distinguished root (selected/open/blocked), and its
residual degree D when open.  A three-state rooted-tree DP counts all
such summaries without enumerating independent sets.

Those counts evaluate exactly the down-link quantities

    E L_2(K), Var(A_K), Var(p_K),

and test

    (E L_2(K))^2 >= Var(A_K) Var(p_K).

Together with Cauchy--Schwarz and the proved decomposition in
verify_downlink_component_b_decomposition.py, this inequality implies
terminal drift component (B).
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import networkx as nx

from random_leaf_gsb_local_payment import coeff, tree_polynomial


Record = tuple[int, int, int, int, int]
# (rank |K|, residual vertices N, residual edges M,
#  selected flag, residual/open flag)


def convolve_children(
    adjacency: list[list[int]],
    vertex: int,
    parent: int,
    parent_selected: int,
    max_k: int,
    cache: dict | None = None,
):
    """Return subtree summaries conditional on the parent's selection."""

    if cache is None:
        cache = {}
    cache_key = (vertex, parent, parent_selected, max_k)
    if cache_key in cache:
        return cache[cache_key]
    children = [
        child for child in adjacency[vertex] if child != parent
    ]
    output = defaultdict(int)
    for selected in (0, 1):
        if selected and parent_selected:
            continue
        # k,N,M, any selected child, residual-child count -> count
        partial = {(selected, 0, 0, 0, 0): 1}
        for child in children:
            child_records = convolve_children(
                adjacency,
                child,
                vertex,
                selected,
                max_k,
                cache,
            )
            following = defaultdict(int)
            for (
                k0,
                n0,
                m0,
                any_selected,
                residual_children,
            ), count0 in partial.items():
                for (
                    kc,
                    nc,
                    mc,
                    child_selected,
                    child_residual,
                ), countc in child_records.items():
                    k = k0 + kc
                    if k > max_k:
                        continue
                    following[
                        (
                            k,
                            n0 + nc,
                            m0 + mc,
                            int(any_selected or child_selected),
                            residual_children + child_residual,
                        )
                    ] += count0 * countc
            partial = following
        for (
            k,
            n,
            m,
            any_selected,
            residual_children,
        ), count in partial.items():
            residual = int(
                not selected
                and not parent_selected
                and not any_selected
            )
            if residual:
                n += 1
                m += residual_children
            output[(k, n, m, selected, residual)] += count
    cache[cache_key] = output
    return output


def root_distribution(
    adjacency: list[list[int]],
    root: int,
    max_k: int,
):
    """Count (k,N,M,root_state,D) summaries at the root."""

    children = list(adjacency[root])
    output = defaultdict(int)
    cache = {}
    for selected in (0, 1):
        partial = {(selected, 0, 0, 0, 0): 1}
        for child in children:
            child_records = convolve_children(
                adjacency,
                child,
                root,
                selected,
                max_k,
                cache,
            )
            following = defaultdict(int)
            for (
                k0,
                n0,
                m0,
                any_selected,
                residual_children,
            ), count0 in partial.items():
                for (
                    kc,
                    nc,
                    mc,
                    child_selected,
                    child_residual,
                ), countc in child_records.items():
                    k = k0 + kc
                    if k > max_k:
                        continue
                    following[
                        (
                            k,
                            n0 + nc,
                            m0 + mc,
                            int(any_selected or child_selected),
                            residual_children + child_residual,
                        )
                    ] += count0 * countc
            partial = following
        for (
            k,
            n,
            m,
            any_selected,
            residual_children,
        ), count in partial.items():
            open_root = int(not selected and not any_selected)
            if open_root:
                n += 1
                m += residual_children
                state = "open"
                degree = residual_children
            elif selected:
                state = "selected"
                degree = 0
            else:
                state = "blocked"
                degree = 0
            output[(k, n, m, state, degree)] += count
    return output


def forest_root_distribution(
    adjacency: list[list[int]],
    root: int,
    max_k: int,
):
    """Count residual summaries for a possibly disconnected forest."""

    order = len(adjacency)
    seen = [False] * order
    components = []
    for start in range(order):
        if seen[start]:
            continue
        stack = [start]
        seen[start] = True
        component = []
        while stack:
            vertex = stack.pop()
            component.append(vertex)
            for neighbor in adjacency[vertex]:
                if not seen[neighbor]:
                    seen[neighbor] = True
                    stack.append(neighbor)
        components.append(component)

    root_component = next(
        component for component in components if root in component
    )

    def induced(component):
        index = {
            vertex: local
            for local, vertex in enumerate(component)
        }
        local_adjacency = [
            [
                index[neighbor]
                for neighbor in adjacency[vertex]
                if neighbor in index
            ]
            for vertex in component
        ]
        return local_adjacency, index

    root_adjacency, root_index = induced(root_component)
    combined = root_distribution(
        root_adjacency, root_index[root], max_k
    )

    for component in components:
        if component is root_component:
            continue
        local_adjacency, _ = induced(component)
        pointed = root_distribution(
            local_adjacency, 0, max_k
        )
        unpointed = defaultdict(int)
        for (
            k,
            residual_n,
            residual_m,
            _state,
            _degree,
        ), count in pointed.items():
            unpointed[(k, residual_n, residual_m)] += count
        following = defaultdict(int)
        for (
            k0,
            n0,
            m0,
            state,
            degree,
        ), count0 in combined.items():
            for (
                kc,
                nc,
                mc,
            ), countc in unpointed.items():
                k = k0 + kc
                if k > max_k:
                    continue
                following[
                    (
                        k,
                        n0 + nc,
                        m0 + mc,
                        state,
                        degree,
                    )
                ] += count0 * countc
        combined = following
    return combined


def evaluate_tree(
    adjacency: list[list[int]],
    root: int,
    label: str,
):
    n = len(adjacency)
    poly = tree_polynomial(adjacency)
    root_deleted = tree_polynomial(adjacency, deleted=root)
    alpha = poly.degree()
    distribution = forest_root_distribution(
        adjacency, root, max(0, alpha - 2)
    )
    minima = None
    maximum_ratio = None
    failures = identity_failures = 0
    sign_aware_failures = 0
    u_ge_r_sign_aware_failures = 0
    required_sign_aware_failures = 0
    first_sign_aware_failure = None
    drift_budget_a_failures = 0
    drift_budget_p_failures = 0
    half_covariance_failures = 0
    combined_correction_failures = 0
    required_combined_correction_failures = 0
    local_pointed_reserve_failures = 0
    required_local_pointed_reserve_failures = 0
    half_lift_failures = 0
    required_half_lift_failures = 0
    minimum_combined_correction = None
    minimum_required_combined_correction = None
    minimum_local_pointed_reserve = None
    minimum_required_local_pointed_reserve = None
    minimum_half_lift = None
    minimum_required_half_lift = None
    piso_half_lift_failures = 0
    required_piso_half_lift_failures = 0
    minimum_piso_half_lift = None
    minimum_required_piso_half_lift = None
    checks = 0

    by_rank = defaultdict(list)
    for key, count in distribution.items():
        by_rank[key[0]].append((key, count))

    for r in range(2, alpha + 1):
        entries = by_rank[r - 2]
        if not entries:
            continue
        mass = 0
        sum_a = sum_a2 = Fraction(0)
        sum_p = sum_p2 = sum_ap = Fraction(0)
        sum_local = Fraction(0)
        sum_applicable_piso_adjustment = Fraction(0)
        for (_, residual_n, residual_m, state, degree), count in entries:
            if residual_n <= 0:
                continue
            weight_mass = count * residual_n
            mass += weight_mass
            a_value = Fraction(
                residual_n * (residual_n - 1)
                - 2 * residual_m,
                residual_n,
            )
            if state == "selected":
                p_value = Fraction(1)
                local = Fraction(0)
                local_burden = 2 - a_value
            elif state == "blocked":
                p_value = Fraction(0)
                local = Fraction(1)
                local_burden = Fraction(0)
            else:
                p_value = Fraction(1, residual_n)
                e_root = residual_n - 1 - degree
                cov_value = (
                    Fraction(e_root, residual_n)
                    - p_value * a_value
                )
                z_value = Fraction(e_root, residual_n)
                local = Fraction(
                    2
                    * (
                        residual_n * (residual_n - 1)
                        + residual_m
                        - residual_n * degree
                    ),
                    residual_n * residual_n,
                )
                local_burden = (
                    (2 - a_value) * p_value
                    - 3 * cov_value
                    - 3 * z_value
                )
            weight = Fraction(weight_mass, 1)
            sum_a += weight * a_value
            sum_a2 += weight * a_value * a_value
            sum_p += weight * p_value
            sum_p2 += weight * p_value * p_value
            sum_ap += weight * a_value * p_value
            sum_local += weight * local
            if state == "selected" or residual_n < 2:
                sum_applicable_piso_adjustment += (
                    weight * 2 * local_burden
                )
        if mass <= 0:
            continue
        mean_a = sum_a / mass
        mean_a2 = sum_a2 / mass
        mean_p = sum_p / mass
        mean_p2 = sum_p2 / mass
        mean_ap = sum_ap / mass
        mean_local = sum_local / mass
        mean_applicable_piso_adjustment = (
            sum_applicable_piso_adjustment / mass
        )
        variance_a = mean_a2 - mean_a * mean_a
        variance_p = mean_p2 - mean_p * mean_p
        covariance = mean_ap - mean_a * mean_p
        surplus = (
            mean_local * mean_local
            - variance_a * variance_p
        )
        root_variance_factor_margin = (
            mean_local / 4 - variance_p
        )
        extension_variance_factor_margin = (
            4 * mean_local - variance_a
        )
        ratio = (
            variance_a * variance_p
            / (mean_local * mean_local)
            if mean_local
            else Fraction(0)
        )

        bm = int(coeff(poly, r - 1))
        br = int(coeff(poly, r))
        if min(bm, br) <= 0:
            continue
        u = Fraction(r * br, bm)
        drift_budget = u - r + 2 * mean_local
        drift_budget_minus_var_a = (
            drift_budget - variance_a
        )
        local_square_minus_budget_var_p = (
            mean_local * mean_local
            - drift_budget * variance_p
        )
        hm = bm - int(coeff(root_deleted, r - 1))
        hr = br - int(coeff(root_deleted, r))
        cm = int(coeff(root_deleted, r - 1))
        cr = int(coeff(root_deleted, r))
        expected_mass = (r - 1) * bm
        if (
            mass != expected_mass
            or mean_a != u
            or mean_p != Fraction(hm, bm)
        ):
            identity_failures += 1

        required = (
            r >= 6
            and u >= r
            and (alpha - r) * (n - r)
            > (r + 1) * (r + 2)
        )
        global_normalized_margin = mean_local + covariance
        half_covariance_reserve = mean_local + 2 * covariance
        combined_correction = (
            (r - 2) * mean_local
            - variance_a
            + r * covariance
        )
        rho_m = Fraction(hm, bm)
        rho = Fraction(hr, br)
        iso_reserve = Fraction(
            r
            * (
                r * br * br
                + bm * bm
                - (r + 1) * bm * int(coeff(poly, r + 1))
            ),
            bm * bm,
        )
        pointed_burden = (
            r * (u + 1) * rho_m
            - (r + 1) * u * rho
        )
        global_pointed_reserve = iso_reserve - pointed_burden
        global_piso_margin = (
            iso_reserve - 2 * pointed_burden
        )
        piso_downlink_correction = (
            (r - 2) * (2 * mean_local - 1)
            - variance_a
            + 2 * r * covariance
        )
        average_raw_rank_two_piso_margin = (
            global_piso_margin - piso_downlink_correction
        )
        average_applicable_rank_two_piso_margin = (
            average_raw_rank_two_piso_margin
            + mean_applicable_piso_adjustment
        )
        applicable_piso_half_lift_margin = (
            2 * global_piso_margin
            - average_applicable_rank_two_piso_margin
        )
        average_rank_two_pointed_reserve = (
            global_pointed_reserve - combined_correction
        )
        half_lift_margin = (
            average_rank_two_pointed_reserve
            + 2 * combined_correction
        )
        component_b_margin = (
            1 + u - Fraction(r * cr, cm)
            if cm
            else None
        )
        if (
            component_b_margin is not None
            and global_normalized_margin
            != (1 - Fraction(hm, bm)) * component_b_margin
        ):
            identity_failures += 1
        item = {
            "label": label,
            "order": n,
            "alpha": alpha,
            "root": root,
            "root_degree": len(adjacency[root]),
            "rank_r": r,
            "required": required,
            "u": str(u),
            "average_local_margin": str(mean_local),
            "variance_A": str(variance_a),
            "variance_p": str(variance_p),
            "between_covariance": str(covariance),
            "global_normalized_margin": str(
                global_normalized_margin
            ),
            "component_B_margin": (
                None
                if component_b_margin is None
                else str(component_b_margin)
            ),
            "half_covariance_reserve": str(
                half_covariance_reserve
            ),
            "combined_terminal_drift_correction": str(
                combined_correction
            ),
            "global_pointed_reserve": str(
                global_pointed_reserve
            ),
            "average_rank_two_pointed_reserve": str(
                average_rank_two_pointed_reserve
            ),
            "half_lift_margin": str(half_lift_margin),
            "global_piso_margin": str(global_piso_margin),
            "piso_downlink_correction": str(
                piso_downlink_correction
            ),
            "average_applicable_rank_two_piso_margin": str(
                average_applicable_rank_two_piso_margin
            ),
            "applicable_piso_half_lift_margin": str(
                applicable_piso_half_lift_margin
            ),
            "cauchy_square_surplus": str(surplus),
            "cauchy_variance_ratio": str(ratio),
            "quarter_local_minus_var_p": str(
                root_variance_factor_margin
            ),
            "four_local_minus_var_A": str(
                extension_variance_factor_margin
            ),
            "drift_budget": str(drift_budget),
            "drift_budget_minus_var_A": str(
                drift_budget_minus_var_a
            ),
            "local_square_minus_drift_budget_var_p":
                str(local_square_minus_budget_var_p),
        }
        checks += 1
        if u >= r and drift_budget_minus_var_a < 0:
            drift_budget_a_failures += 1
        if u >= r and local_square_minus_budget_var_p < 0:
            drift_budget_p_failures += 1
        if u >= r and half_covariance_reserve < 0:
            half_covariance_failures += 1
        if u >= r and r >= 6:
            if combined_correction < 0:
                combined_correction_failures += 1
            if average_rank_two_pointed_reserve < 0:
                local_pointed_reserve_failures += 1
            if half_lift_margin < 0:
                half_lift_failures += 1
            if applicable_piso_half_lift_margin < 0:
                piso_half_lift_failures += 1
            if (
                minimum_combined_correction is None
                or combined_correction
                < minimum_combined_correction[0]
            ):
                minimum_combined_correction = (
                    combined_correction,
                    dict(item),
                )
            if (
                minimum_local_pointed_reserve is None
                or average_rank_two_pointed_reserve
                < minimum_local_pointed_reserve[0]
            ):
                minimum_local_pointed_reserve = (
                    average_rank_two_pointed_reserve,
                    dict(item),
                )
            if (
                minimum_half_lift is None
                or half_lift_margin < minimum_half_lift[0]
            ):
                minimum_half_lift = (
                    half_lift_margin,
                    dict(item),
                )
            if (
                minimum_piso_half_lift is None
                or applicable_piso_half_lift_margin
                < minimum_piso_half_lift[0]
            ):
                minimum_piso_half_lift = (
                    applicable_piso_half_lift_margin,
                    dict(item),
                )
            if required:
                if combined_correction < 0:
                    required_combined_correction_failures += 1
                if average_rank_two_pointed_reserve < 0:
                    required_local_pointed_reserve_failures += 1
                if half_lift_margin < 0:
                    required_half_lift_failures += 1
                if applicable_piso_half_lift_margin < 0:
                    required_piso_half_lift_failures += 1
                if (
                    minimum_required_combined_correction is None
                    or combined_correction
                    < minimum_required_combined_correction[0]
                ):
                    minimum_required_combined_correction = (
                        combined_correction,
                        dict(item),
                    )
                if (
                    minimum_required_local_pointed_reserve is None
                    or average_rank_two_pointed_reserve
                    < minimum_required_local_pointed_reserve[0]
                ):
                    minimum_required_local_pointed_reserve = (
                        average_rank_two_pointed_reserve,
                        dict(item),
                    )
                if (
                    minimum_required_half_lift is None
                    or half_lift_margin
                    < minimum_required_half_lift[0]
                ):
                    minimum_required_half_lift = (
                        half_lift_margin,
                        dict(item),
                    )
                if (
                    minimum_required_piso_half_lift is None
                    or applicable_piso_half_lift_margin
                    < minimum_required_piso_half_lift[0]
                ):
                    minimum_required_piso_half_lift = (
                        applicable_piso_half_lift_margin,
                        dict(item),
                    )
        if surplus < 0:
            failures += 1
            if covariance < 0:
                sign_aware_failures += 1
                if u >= r:
                    u_ge_r_sign_aware_failures += 1
                if required:
                    required_sign_aware_failures += 1
                if first_sign_aware_failure is None:
                    first_sign_aware_failure = dict(item)
        if minima is None or surplus < minima[0]:
            minima = (surplus, item)
        if maximum_ratio is None or ratio > maximum_ratio[0]:
            maximum_ratio = (ratio, item)

    return {
        "label": label,
        "order": n,
        "alpha": alpha,
        "root": root,
        "root_degree": len(adjacency[root]),
        "checks": checks,
        "failures": failures,
        "sign_aware_failures": sign_aware_failures,
        "u_ge_r_sign_aware_failures":
            u_ge_r_sign_aware_failures,
        "required_sign_aware_failures":
            required_sign_aware_failures,
        "u_ge_r_drift_budget_A_failures":
            drift_budget_a_failures,
        "u_ge_r_drift_budget_p_failures":
            drift_budget_p_failures,
        "u_ge_r_half_covariance_failures":
            half_covariance_failures,
        "u_ge_r_r6_combined_correction_failures":
            combined_correction_failures,
        "required_combined_correction_failures":
            required_combined_correction_failures,
        "u_ge_r_r6_local_pointed_reserve_failures":
            local_pointed_reserve_failures,
        "required_local_pointed_reserve_failures":
            required_local_pointed_reserve_failures,
        "u_ge_r_r6_half_lift_failures":
            half_lift_failures,
        "required_half_lift_failures":
            required_half_lift_failures,
        "u_ge_r_r6_applicable_piso_half_lift_failures":
            piso_half_lift_failures,
        "required_applicable_piso_half_lift_failures":
            required_piso_half_lift_failures,
        "identity_failures": identity_failures,
        "minimum_combined_correction": (
            None
            if minimum_combined_correction is None
            else {
                "exact": str(minimum_combined_correction[0]),
                "float": float(minimum_combined_correction[0]),
                **minimum_combined_correction[1],
            }
        ),
        "minimum_required_combined_correction": (
            None
            if minimum_required_combined_correction is None
            else {
                "exact": str(
                    minimum_required_combined_correction[0]
                ),
                "float": float(
                    minimum_required_combined_correction[0]
                ),
                **minimum_required_combined_correction[1],
            }
        ),
        "minimum_local_pointed_reserve": (
            None
            if minimum_local_pointed_reserve is None
            else {
                "exact": str(minimum_local_pointed_reserve[0]),
                "float": float(minimum_local_pointed_reserve[0]),
                **minimum_local_pointed_reserve[1],
            }
        ),
        "minimum_required_local_pointed_reserve": (
            None
            if minimum_required_local_pointed_reserve is None
            else {
                "exact": str(
                    minimum_required_local_pointed_reserve[0]
                ),
                "float": float(
                    minimum_required_local_pointed_reserve[0]
                ),
                **minimum_required_local_pointed_reserve[1],
            }
        ),
        "minimum_half_lift": (
            None
            if minimum_half_lift is None
            else {
                "exact": str(minimum_half_lift[0]),
                "float": float(minimum_half_lift[0]),
                **minimum_half_lift[1],
            }
        ),
        "minimum_required_half_lift": (
            None
            if minimum_required_half_lift is None
            else {
                "exact": str(minimum_required_half_lift[0]),
                "float": float(
                    minimum_required_half_lift[0]
                ),
                **minimum_required_half_lift[1],
            }
        ),
        "minimum_applicable_piso_half_lift": (
            None
            if minimum_piso_half_lift is None
            else {
                "exact": str(minimum_piso_half_lift[0]),
                "float": float(minimum_piso_half_lift[0]),
                **minimum_piso_half_lift[1],
            }
        ),
        "minimum_required_applicable_piso_half_lift": (
            None
            if minimum_required_piso_half_lift is None
            else {
                "exact": str(
                    minimum_required_piso_half_lift[0]
                ),
                "float": float(
                    minimum_required_piso_half_lift[0]
                ),
                **minimum_required_piso_half_lift[1],
            }
        ),
        "minimum_surplus": (
            None
            if minima is None
            else {
                "exact": str(minima[0]),
                "float": float(minima[0]),
                **minima[1],
            }
        ),
        "maximum_variance_ratio": (
            None
            if maximum_ratio is None
            else {
                "exact": str(maximum_ratio[0]),
                "float": float(maximum_ratio[0]),
                **maximum_ratio[1],
            }
        ),
        "first_sign_aware_failure": first_sign_aware_failure,
        "edges_if_failure": (
            [
                [left, right]
                for left, neighbors in enumerate(adjacency)
                for right in neighbors
                if left < right
            ]
            if first_sign_aware_failure is not None
            else None
        ),
    }


def adjacency_from_edges(order: int, edge_list):
    adjacency = [[] for _ in range(order)]
    for left, right in edge_list:
        adjacency[left].append(right)
        adjacency[right].append(left)
    return adjacency


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--champion-json",
        type=Path,
        action="append",
        default=[],
    )
    parser.add_argument(
        "--broom",
        action="append",
        default=[],
        metavar="LEAVES,PATH_ORDER",
        help=(
            "add a rooted broom whose root has LEAVES pendant "
            "neighbors and one path branch"
        ),
    )
    parser.add_argument(
        "--two-stars",
        action="append",
        default=[],
        metavar="LEAVES1,LEAVES2,ISOLATES",
        help="add a disjoint union of two stars and isolates",
    )
    parser.add_argument(
        "--random-forest-samples",
        type=int,
        default=0,
    )
    parser.add_argument(
        "--forest-components",
        type=int,
        default=4,
    )
    parser.add_argument("--random-samples", type=int, default=0)
    parser.add_argument("--order", type=int, default=60)
    parser.add_argument("--roots", type=int, default=2)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.order))
    rng = random.Random(args.seed)
    tasks = []
    for path in args.champion_json:
        source = json.loads(path.read_text(encoding="utf-8"))
        champion = source["champion"]
        adjacency = adjacency_from_edges(
            champion["order"], champion["edges"]
        )
        tasks.append(
            (
                adjacency,
                champion["root"],
                f"{path.name}:champion",
            )
        )
    for specification in args.broom:
        leaves_text, path_text = specification.split(",", 1)
        leaves = int(leaves_text)
        path_order = int(path_text)
        if leaves < 0 or path_order < 1:
            raise ValueError(
                "broom parameters require leaves >= 0 and "
                "path_order >= 1"
            )
        order = 1 + leaves + path_order
        adjacency = [[] for _ in range(order)]
        for leaf in range(1, leaves + 1):
            adjacency[0].append(leaf)
            adjacency[leaf].append(0)
        previous = 0
        for vertex in range(
            leaves + 1,
            leaves + path_order + 1,
        ):
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
        tasks.append(
            (
                adjacency,
                0,
                f"broom_s{leaves}_L{path_order}",
            )
        )
    for specification in args.two_stars:
        first_text, second_text, isolates_text = (
            specification.split(",", 2)
        )
        first = int(first_text)
        second = int(second_text)
        isolates = int(isolates_text)
        if min(first, second) < 1 or isolates < 0:
            raise ValueError(
                "two-stars requires positive leaf counts and "
                "nonnegative isolates"
            )
        order = 2 + first + second + isolates
        adjacency = [[] for _ in range(order)]
        first_center = 0
        for leaf in range(1, first + 1):
            adjacency[first_center].append(leaf)
            adjacency[leaf].append(first_center)
        second_center = first + 1
        for leaf in range(
            second_center + 1,
            second_center + second + 1,
        ):
            adjacency[second_center].append(leaf)
            adjacency[leaf].append(second_center)
        roots = [
            first_center,
            1,
            second_center,
            second_center + 1,
        ]
        if isolates:
            roots.append(2 + first + second)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    (
                        f"two_stars_{first}_{second}_"
                        f"iso{isolates}_root{root}"
                    ),
                )
            )
    for sample in range(args.random_samples):
        graph = nx.from_prufer_sequence(
            [rng.randrange(args.order)
             for _ in range(args.order - 2)]
        )
        adjacency = [
            list(graph.neighbors(vertex))
            for vertex in range(args.order)
        ]
        candidate_roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )
        roots = candidate_roots[:1]
        while len(roots) < min(args.roots, args.order):
            root = rng.randrange(args.order)
            if root not in roots:
                roots.append(root)
        for root in roots:
            tasks.append(
                (adjacency, root, f"random_{sample}_root_{root}")
            )
    for sample in range(args.random_forest_samples):
        component_count = min(
            max(1, args.forest_components), args.order
        )
        cuts = sorted(
            rng.sample(
                range(1, args.order),
                component_count - 1,
            )
        )
        sizes = [
            right - left
            for left, right in zip(
                [0, *cuts], [*cuts, args.order]
            )
        ]
        adjacency = [[] for _ in range(args.order)]
        offset = 0
        for size in sizes:
            if size >= 2:
                graph = nx.from_prufer_sequence(
                    [
                        rng.randrange(size)
                        for _ in range(size - 2)
                    ]
                )
                for left, right in graph.edges():
                    left += offset
                    right += offset
                    adjacency[left].append(right)
                    adjacency[right].append(left)
            offset += size
        candidate_roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )
        roots = candidate_roots[:1]
        while len(roots) < min(args.roots, args.order):
            root = rng.randrange(args.order)
            if root not in roots:
                roots.append(root)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    f"random_forest_{sample}_root_{root}",
                )
            )

    started = time.time()
    reports = []
    for index, (adjacency, root, label) in enumerate(tasks):
        report = evaluate_tree(adjacency, root, label)
        reports.append(report)
        if not args.quiet:
            print(
                f"{index + 1}/{len(tasks)} {label}: "
                f"checks={report['checks']}, "
                f"failures={report['failures']}, "
                f"sign_aware_failures="
                f"{report['sign_aware_failures']}, "
                f"u_ge_r_sign_aware="
                f"{report['u_ge_r_sign_aware_failures']}, "
                f"required_sign_aware="
                f"{report['required_sign_aware_failures']}, "
                f"budget_A_failures="
                f"{report['u_ge_r_drift_budget_A_failures']}, "
                f"budget_p_failures="
                f"{report['u_ge_r_drift_budget_p_failures']}, "
                f"half_cov_failures="
                f"{report['u_ge_r_half_covariance_failures']}, "
                f"combined_failures="
                f"{report['u_ge_r_r6_combined_correction_failures']}, "
            f"required_combined="
            f"{report['required_combined_correction_failures']}, "
            f"half_lift="
            f"{report['u_ge_r_r6_half_lift_failures']}, "
            f"piso_half_lift="
            f"{report['u_ge_r_r6_applicable_piso_half_lift_failures']}, "
                f"max_ratio="
                f"{report['maximum_variance_ratio']['float']:.9g}",
                flush=True,
            )

    payload = {
        "parameters": vars(args)
        | {
            "out": str(args.out),
            "champion_json": [
                str(path) for path in args.champion_json
            ],
        },
        "trees_and_roots": len(tasks),
        "checks": sum(report["checks"] for report in reports),
        "failures": sum(report["failures"] for report in reports),
        "sign_aware_failures": sum(
            report["sign_aware_failures"] for report in reports
        ),
        "u_ge_r_sign_aware_failures": sum(
            report["u_ge_r_sign_aware_failures"]
            for report in reports
        ),
        "required_sign_aware_failures": sum(
            report["required_sign_aware_failures"]
            for report in reports
        ),
        "u_ge_r_drift_budget_A_failures": sum(
            report["u_ge_r_drift_budget_A_failures"]
            for report in reports
        ),
        "u_ge_r_drift_budget_p_failures": sum(
            report["u_ge_r_drift_budget_p_failures"]
            for report in reports
        ),
        "u_ge_r_half_covariance_failures": sum(
            report["u_ge_r_half_covariance_failures"]
            for report in reports
        ),
        "u_ge_r_r6_combined_correction_failures": sum(
            report[
                "u_ge_r_r6_combined_correction_failures"
            ]
            for report in reports
        ),
        "required_combined_correction_failures": sum(
            report["required_combined_correction_failures"]
            for report in reports
        ),
        "u_ge_r_r6_local_pointed_reserve_failures": sum(
            report[
                "u_ge_r_r6_local_pointed_reserve_failures"
            ]
            for report in reports
        ),
        "required_local_pointed_reserve_failures": sum(
            report["required_local_pointed_reserve_failures"]
            for report in reports
        ),
        "u_ge_r_r6_half_lift_failures": sum(
            report["u_ge_r_r6_half_lift_failures"]
            for report in reports
        ),
        "required_half_lift_failures": sum(
            report["required_half_lift_failures"]
            for report in reports
        ),
        "u_ge_r_r6_applicable_piso_half_lift_failures": sum(
            report[
                "u_ge_r_r6_applicable_piso_half_lift_failures"
            ]
            for report in reports
        ),
        "required_applicable_piso_half_lift_failures": sum(
            report[
                "required_applicable_piso_half_lift_failures"
            ]
            for report in reports
        ),
        "identity_failures": sum(
            report["identity_failures"] for report in reports
        ),
        "elapsed_seconds": time.time() - started,
        "reports": reports,
    }
    args.out.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    if args.quiet:
        print(
            json.dumps(
                {
                    key: value
                    for key, value in payload.items()
                    if key != "reports"
                },
                indent=2,
            )
        )
    else:
        print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
