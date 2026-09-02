#!/usr/bin/env python3
"""Exact large-forest audit of the retained-half state partition.

After completing the between-fiber variance/covariance square, the
retained-half PISO margin is the down-link expectation of

    Phi_K = M2_raw(K) - J_K + 2(r-2)D_K
            + 2r^2(p_K-p)^2
            - 2(A_K-u-r(p_K-p))^2.

Here J_K is the applicable-fiber adjustment.  This script tracks the
residual degree-square sum as well as vertex and edge counts, allowing
Phi_K to be evaluated exactly without enumerating independent sets.
It tests the empirically suggested partition

    E[Phi_K ; q open] >= 0,
    E[Phi_K ; q selected or blocked] >= 0.
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


def subtree_distribution(
    adjacency,
    vertex,
    parent,
    parent_selected,
    max_k,
    cache,
):
    key = (vertex, parent, parent_selected, max_k)
    if key in cache:
        return cache[key]
    children = [
        child for child in adjacency[vertex] if child != parent
    ]
    output = defaultdict(int)
    for selected in (0, 1):
        if selected and parent_selected:
            continue
        # k,n,m,s2,any selected child,residual children,sum child degree
        partial = {(selected, 0, 0, 0, 0, 0, 0): 1}
        for child in children:
            child_distribution = subtree_distribution(
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
                s20,
                any_selected,
                residual_children,
                residual_child_degree_sum,
            ), count0 in partial.items():
                for (
                    kc,
                    nc,
                    mc,
                    s2c,
                    child_selected,
                    child_residual,
                    child_degree,
                ), countc in child_distribution.items():
                    k = k0 + kc
                    if k > max_k:
                        continue
                    following[
                        (
                            k,
                            n0 + nc,
                            m0 + mc,
                            s20 + s2c,
                            int(any_selected or child_selected),
                            residual_children + child_residual,
                            (
                                residual_child_degree_sum
                                + (
                                    child_degree
                                    if child_residual
                                    else 0
                                )
                            ),
                        )
                    ] += count0 * countc
            partial = following
        for (
            k,
            residual_n,
            residual_m,
            degree_square_sum,
            any_selected,
            residual_children,
            residual_child_degree_sum,
        ), count in partial.items():
            residual = int(
                not selected
                and not parent_selected
                and not any_selected
            )
            root_degree = 0
            if residual:
                root_degree = residual_children
                residual_n += 1
                residual_m += residual_children
                degree_square_sum += (
                    2 * residual_child_degree_sum
                    + residual_children
                    + residual_children * residual_children
                )
            output[
                (
                    k,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    selected,
                    residual,
                    root_degree,
                )
            ] += count
    cache[key] = output
    return output


def root_component_distribution(
    adjacency,
    root,
    max_k,
):
    children = list(adjacency[root])
    output = defaultdict(int)
    cache = {}
    for selected in (0, 1):
        partial = {(selected, 0, 0, 0, 0, 0, 0): 1}
        for child in children:
            child_distribution = subtree_distribution(
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
                s20,
                any_selected,
                residual_children,
                residual_child_degree_sum,
            ), count0 in partial.items():
                for (
                    kc,
                    nc,
                    mc,
                    s2c,
                    child_selected,
                    child_residual,
                    child_degree,
                ), countc in child_distribution.items():
                    k = k0 + kc
                    if k > max_k:
                        continue
                    following[
                        (
                            k,
                            n0 + nc,
                            m0 + mc,
                            s20 + s2c,
                            int(any_selected or child_selected),
                            residual_children + child_residual,
                            (
                                residual_child_degree_sum
                                + (
                                    child_degree
                                    if child_residual
                                    else 0
                                )
                            ),
                        )
                    ] += count0 * countc
            partial = following
        for (
            k,
            residual_n,
            residual_m,
            degree_square_sum,
            any_selected,
            residual_children,
            residual_child_degree_sum,
        ), count in partial.items():
            open_root = int(not selected and not any_selected)
            if open_root:
                residual_n += 1
                residual_m += residual_children
                degree_square_sum += (
                    2 * residual_child_degree_sum
                    + residual_children
                    + residual_children * residual_children
                )
                state = "open"
                root_degree = residual_children
            elif selected:
                state = "selected"
                root_degree = 0
            else:
                state = "blocked"
                root_degree = 0
            output[
                (
                    k,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                    state,
                    root_degree,
                )
            ] += count
    return output


def connected_components(adjacency):
    seen = [False] * len(adjacency)
    output = []
    for start in range(len(adjacency)):
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
        output.append(component)
    return output


def induced(adjacency, component):
    index = {
        vertex: local for local, vertex in enumerate(component)
    }
    local = [
        [
            index[neighbor]
            for neighbor in adjacency[vertex]
            if neighbor in index
        ]
        for vertex in component
    ]
    return local, index


def forest_distribution(adjacency, root, max_k):
    components = connected_components(adjacency)
    root_component = next(
        component for component in components if root in component
    )
    root_adjacency, root_index = induced(
        adjacency, root_component
    )
    combined = root_component_distribution(
        root_adjacency, root_index[root], max_k
    )
    for component in components:
        if component is root_component:
            continue
        local_adjacency, _ = induced(adjacency, component)
        pointed = root_component_distribution(
            local_adjacency, 0, max_k
        )
        unpointed = defaultdict(int)
        for (
            k,
            residual_n,
            residual_m,
            degree_square_sum,
            _state,
            _degree,
        ), count in pointed.items():
            unpointed[
                (
                    k,
                    residual_n,
                    residual_m,
                    degree_square_sum,
                )
            ] += count
        following = defaultdict(int)
        for (
            k0,
            n0,
            m0,
            s20,
            state,
            degree,
        ), count0 in combined.items():
            for (
                kc,
                nc,
                mc,
                s2c,
            ), countc in unpointed.items():
                k = k0 + kc
                if k > max_k:
                    continue
                following[
                    (
                        k,
                        n0 + nc,
                        m0 + mc,
                        s20 + s2c,
                        state,
                        degree,
                    )
                ] += count0 * countc
        combined = following
    return combined


def brute_distribution(adjacency, root, max_k):
    order = len(adjacency)
    adjacency_masks = []
    for neighbors in adjacency:
        mask = 0
        for neighbor in neighbors:
            mask |= 1 << neighbor
        adjacency_masks.append(mask)
    output = defaultdict(int)
    for mask in range(1 << order):
        k = mask.bit_count()
        if k > max_k:
            continue
        independent = True
        for vertex in range(order):
            if mask & (1 << vertex):
                if adjacency_masks[vertex] & mask:
                    independent = False
                    break
        if not independent:
            continue
        forbidden = mask
        for vertex in range(order):
            if mask & (1 << vertex):
                forbidden |= adjacency_masks[vertex]
        residual = [
            vertex
            for vertex in range(order)
            if not forbidden & (1 << vertex)
        ]
        residual_set = set(residual)
        degrees = {
            vertex: sum(
                neighbor in residual_set
                for neighbor in adjacency[vertex]
            )
            for vertex in residual
        }
        residual_m = sum(degrees.values()) // 2
        if mask & (1 << root):
            state = "selected"
            root_degree = 0
        elif root not in residual_set:
            state = "blocked"
            root_degree = 0
        else:
            state = "open"
            root_degree = degrees[root]
        output[
            (
                k,
                len(residual),
                residual_m,
                sum(degree * degree for degree in degrees.values()),
                state,
                root_degree,
            )
        ] += 1
    return output


def self_test():
    forests = [
        [[1], [0, 2], [1]],
        [[1, 2, 3], [0], [0], [0], []],
        [[1], [0], [3], [2], []],
    ]
    for adjacency in forests:
        for root in range(len(adjacency)):
            exact = forest_distribution(
                adjacency, root, len(adjacency)
            )
            brute = brute_distribution(
                adjacency, root, len(adjacency)
            )
            assert exact == brute


def local_quantities(
    residual_n,
    residual_m,
    degree_square_sum,
    state,
    root_degree,
):
    n = residual_n
    a_value = Fraction(
        n * (n - 1) - 2 * residual_m, n
    )
    mean_q = Fraction(
        n * residual_m - degree_square_sum, n
    )
    variance = (
        Fraction(degree_square_sum, n)
        - Fraction(4 * residual_m * residual_m, n * n)
    )
    if state == "selected":
        p_value = Fraction(1)
        covariance = z_value = Fraction(0)
    elif state == "blocked":
        p_value = covariance = z_value = Fraction(0)
    else:
        p_value = Fraction(1, n)
        e_root = n - 1 - root_degree
        covariance = (
            Fraction(e_root, n) - p_value * a_value
        )
        z_value = Fraction(e_root, n)
    burden = (
        (2 - a_value) * p_value
        - 3 * covariance
        - 3 * z_value
    )
    raw_margin = (
        2
        + a_value
        + 2 * mean_q
        - variance
        - 2 * burden
    )
    adjustment = (
        2 * burden
        if state == "selected" or n < 2
        else Fraction(0)
    )
    drift_factor = (
        1 - 2 * p_value + 2 * (covariance + z_value)
    )
    return (
        a_value,
        p_value,
        raw_margin,
        adjustment,
        drift_factor,
    )


def evaluate(adjacency, root, label):
    order = len(adjacency)
    poly = tree_polynomial(adjacency)
    root_deleted = tree_polynomial(adjacency, deleted=root)
    alpha = poly.degree()
    distribution = forest_distribution(
        adjacency, root, max(0, alpha - 2)
    )
    by_rank = defaultdict(list)
    for key, count in distribution.items():
        by_rank[key[0]].append((key, count))

    checks = required_checks = identity_failures = 0
    failures = {
        "open": 0,
        "selected_plus_blocked": 0,
        "selected_plus_half_blocked": 0,
        "open_plus_half_blocked": 0,
        "within_selected": 0,
        "within_blocked": 0,
        "within_open": 0,
        "between_states": 0,
        "total": 0,
    }
    minima = {name: None for name in failures}
    minimum_items = {name: None for name in failures}
    pointwise_failures = {
        "selected": 0,
        "blocked": 0,
        "open": 0,
    }
    maximum_required_blocked_share = None
    maximum_required_blocked_share_item = None
    minimum_allowed_blocked_share = None
    minimum_allowed_blocked_share_item = None

    for r in range(6, alpha + 1):
        bm = int(coeff(poly, r - 1))
        br = int(coeff(poly, r))
        bp = int(coeff(poly, r + 1))
        if min(bm, br) <= 0:
            continue
        u = Fraction(r * br, bm)
        if u < r:
            continue
        hm = bm - int(coeff(root_deleted, r - 1))
        hr = br - int(coeff(root_deleted, r))
        p_bar = Fraction(hm, bm)
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
            r * (u + 1) * p_bar
            - (r + 1) * u * rho
        )
        global_margin = reserve - 2 * burden
        mass = (r - 1) * bm
        observed_mass = 0
        applicable_local_average = Fraction(0)
        state_sums = {
            "selected": Fraction(0),
            "blocked": Fraction(0),
            "open": Fraction(0),
        }
        state_moments = {
            state: {
                "mass": Fraction(0),
                "a": Fraction(0),
                "a2": Fraction(0),
                "p": Fraction(0),
                "ap": Fraction(0),
                "local": Fraction(0),
            }
            for state in ("selected", "blocked", "open")
        }
        for (
            _k,
            residual_n,
            residual_m,
            degree_square_sum,
            state,
            root_degree,
        ), count in by_rank[r - 2]:
            if residual_n <= 0:
                continue
            weight_mass = count * residual_n
            observed_mass += weight_mass
            weight = Fraction(weight_mass, mass)
            (
                a_value,
                p_value,
                raw_margin,
                adjustment,
                drift_factor,
            ) = local_quantities(
                residual_n,
                residual_m,
                degree_square_sum,
                state,
                root_degree,
            )
            applicable_local_average += weight * (
                raw_margin + adjustment
            )
            centered_p = p_value - p_bar
            centered = a_value - u - r * centered_p
            phi = (
                raw_margin
                - adjustment
                + 2 * (r - 2) * drift_factor
                + 2 * r * r * centered_p * centered_p
                - 2 * centered * centered
            )
            state_sums[state] += weight * phi
            if phi < 0:
                pointwise_failures[state] += 1
            local_base = (
                raw_margin
                - adjustment
                + 2 * (r - 2) * drift_factor
            )
            moments = state_moments[state]
            moments["mass"] += weight
            moments["a"] += weight * a_value
            moments["a2"] += weight * a_value * a_value
            moments["p"] += weight * p_value
            moments["ap"] += weight * a_value * p_value
            moments["local"] += weight * local_base

        total = sum(state_sums.values())
        retained_half = (
            2 * global_margin - applicable_local_average
        )
        within = {}
        for state, moments in state_moments.items():
            state_mass = moments["mass"]
            if not state_mass:
                within[state] = Fraction(0)
                continue
            mean_a = moments["a"] / state_mass
            mean_p = moments["p"] / state_mass
            variance_a = (
                moments["a2"] / state_mass
                - mean_a * mean_a
            )
            covariance_ap = (
                moments["ap"] / state_mass
                - mean_a * mean_p
            )
            within[state] = (
                moments["local"]
                + state_mass
                * (
                    -2 * variance_a
                    + 4 * r * covariance_ap
                )
            )
        between_states = total - sum(within.values())
        checks += 1
        required = (
            (alpha - r) * (order - r)
            > (r + 1) * (r + 2)
        )
        required_checks += int(required)
        if (
            observed_mass != mass
            or total != retained_half
        ):
            identity_failures += 1
        values = {
            "open": state_sums["open"],
            "selected_plus_blocked": (
                state_sums["selected"]
                + state_sums["blocked"]
            ),
            "selected_plus_half_blocked": (
                state_sums["selected"]
                + state_sums["blocked"] / 2
            ),
            "open_plus_half_blocked": (
                state_sums["open"]
                + state_sums["blocked"] / 2
            ),
            "within_selected": within["selected"],
            "within_blocked": within["blocked"],
            "within_open": within["open"],
            "between_states": between_states,
            "total": total,
        }
        item = {
            "label": label,
            "order": order,
            "alpha": alpha,
            "root": root,
            "root_degree": len(adjacency[root]),
            "rank_r": r,
            "required": required,
            "u": str(u),
            "p": str(p_bar),
            "selected_sum": str(state_sums["selected"]),
            "blocked_sum": str(state_sums["blocked"]),
            "open_sum": str(state_sums["open"]),
            "retained_half_margin": str(total),
            "within_selected": str(within["selected"]),
            "within_blocked": str(within["blocked"]),
            "within_open": str(within["open"]),
            "between_states": str(between_states),
        }
        blocked_sum = state_sums["blocked"]
        if blocked_sum > 0:
            required_share = max(
                Fraction(0),
                -state_sums["selected"] / blocked_sum,
            )
            allowed_share = min(
                Fraction(1),
                1 + state_sums["open"] / blocked_sum,
            )
            if (
                maximum_required_blocked_share is None
                or required_share
                > maximum_required_blocked_share
            ):
                maximum_required_blocked_share = required_share
                maximum_required_blocked_share_item = dict(item)
            if (
                minimum_allowed_blocked_share is None
                or allowed_share
                < minimum_allowed_blocked_share
            ):
                minimum_allowed_blocked_share = allowed_share
                minimum_allowed_blocked_share_item = dict(item)
        for name, value in values.items():
            if value < 0:
                failures[name] += 1
            if minima[name] is None or value < minima[name]:
                minima[name] = value
                minimum_items[name] = dict(item)

    def encode(name):
        return (
            None
            if minima[name] is None
            else {
                "exact": str(minima[name]),
                "float": float(minima[name]),
                **minimum_items[name],
            }
        )

    return {
        "label": label,
        "order": order,
        "alpha": alpha,
        "root": root,
        "root_degree": len(adjacency[root]),
        "checks": checks,
        "required_checks": required_checks,
        "identity_failures": identity_failures,
        "failures": failures,
        "pointwise_failures": pointwise_failures,
        "minima": {
            name: encode(name) for name in minima
        },
        "maximum_required_blocked_share": (
            None
            if maximum_required_blocked_share is None
            else {
                "exact": str(maximum_required_blocked_share),
                "float": float(maximum_required_blocked_share),
                **maximum_required_blocked_share_item,
            }
        ),
        "minimum_allowed_blocked_share": (
            None
            if minimum_allowed_blocked_share is None
            else {
                "exact": str(minimum_allowed_blocked_share),
                "float": float(minimum_allowed_blocked_share),
                **minimum_allowed_blocked_share_item,
            }
        ),
    }


def broom(leaves, path_order):
    order = 1 + leaves + path_order
    adjacency = [[] for _ in range(order)]
    for leaf in range(1, leaves + 1):
        adjacency[0].append(leaf)
        adjacency[leaf].append(0)
    previous = 0
    for vertex in range(
        leaves + 1, leaves + path_order + 1
    ):
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return adjacency


def two_stars(first, second, isolates):
    order = 2 + first + second + isolates
    adjacency = [[] for _ in range(order)]
    for leaf in range(1, first + 1):
        adjacency[0].append(leaf)
        adjacency[leaf].append(0)
    second_center = first + 1
    for leaf in range(
        second_center + 1,
        second_center + second + 1,
    ):
        adjacency[second_center].append(leaf)
        adjacency[leaf].append(second_center)
    return adjacency


def star_isolates(leaves, isolates):
    order = 1 + leaves + isolates
    adjacency = [[] for _ in range(order)]
    for leaf in range(1, leaves + 1):
        adjacency[0].append(leaf)
        adjacency[leaf].append(0)
    return adjacency


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--broom", action="append", default=[]
    )
    parser.add_argument(
        "--two-stars", action="append", default=[]
    )
    parser.add_argument(
        "--star-isolates", action="append", default=[]
    )
    parser.add_argument("--random-samples", type=int, default=0)
    parser.add_argument(
        "--random-forest-samples", type=int, default=0
    )
    parser.add_argument("--order", type=int, default=60)
    parser.add_argument("--roots", type=int, default=3)
    parser.add_argument("--components", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    self_test()
    sys.setrecursionlimit(max(5000, 4 * args.order))
    rng = random.Random(args.seed)
    tasks = []
    for specification in args.broom:
        leaves, path_order = map(
            int, specification.split(",", 1)
        )
        tasks.append(
            (
                broom(leaves, path_order),
                0,
                f"broom_{leaves}_{path_order}",
            )
        )
    for specification in args.two_stars:
        first, second, isolates = map(
            int, specification.split(",", 2)
        )
        adjacency = two_stars(first, second, isolates)
        second_center = first + 1
        roots = [0, 1, second_center, second_center + 1]
        if isolates:
            roots.append(2 + first + second)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    (
                        f"two_stars_{first}_{second}_"
                        f"{isolates}_root{root}"
                    ),
                )
            )
    for specification in args.star_isolates:
        leaves, isolates = map(
            int, specification.split(",", 1)
        )
        adjacency = star_isolates(leaves, isolates)
        roots = [0, 1]
        if isolates:
            roots.append(1 + leaves)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    (
                        f"star_isolates_{leaves}_{isolates}_"
                        f"root{root}"
                    ),
                )
            )
    for sample in range(args.random_samples):
        graph = nx.from_prufer_sequence(
            [
                rng.randrange(args.order)
                for _ in range(args.order - 2)
            ]
        )
        adjacency = [
            list(graph.neighbors(vertex))
            for vertex in range(args.order)
        ]
        roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )[:1]
        while len(roots) < args.roots:
            root = rng.randrange(args.order)
            if root not in roots:
                roots.append(root)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    f"random_{sample}_root{root}",
                )
            )
    for sample in range(args.random_forest_samples):
        component_count = min(args.components, args.order)
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
        roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )[:1]
        while len(roots) < args.roots:
            root = rng.randrange(args.order)
            if root not in roots:
                roots.append(root)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    f"random_forest_{sample}_root{root}",
                )
            )

    started = time.time()
    reports = []
    for index, task in enumerate(tasks):
        report = evaluate(*task)
        reports.append(report)
        if not args.quiet:
            print(
                f"{index + 1}/{len(tasks)} {report['label']}: "
                f"checks={report['checks']}, "
                f"failures={report['failures']}",
                flush=True,
            )
    failure_totals = {
        name: sum(
            report["failures"][name] for report in reports
        )
        for name in (
            "open",
            "selected_plus_blocked",
            "selected_plus_half_blocked",
            "open_plus_half_blocked",
            "within_selected",
            "within_blocked",
            "within_open",
            "between_states",
            "total",
        )
    }
    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "trees_and_roots": len(tasks),
        "checks": sum(report["checks"] for report in reports),
        "required_checks": sum(
            report["required_checks"] for report in reports
        ),
        "identity_failures": sum(
            report["identity_failures"] for report in reports
        ),
        "failures": failure_totals,
        "elapsed_seconds": time.time() - started,
        "reports": reports,
    }
    args.out.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
