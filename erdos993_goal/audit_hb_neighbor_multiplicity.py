#!/usr/bin/env python3
"""Audit a neighbor-multiplicity refinement of the HB split.

Blocked down-link fibers are divided according to whether their
independent set contains exactly one neighbor of the distinguished
root or at least two.  The refined candidate is

    Phi_sel + Phi_blocked,1 + 1/2 Phi_blocked,>=2 >= 0,
    Phi_open                 + 1/2 Phi_blocked,>=2 >= 0.

The two inequalities add to the retained-half PISO margin.  Unlike a
blind half split, the first term has a direct map: removing the unique
root-neighbor from a one-hit blocked set leaves a selected-side set in
the root link.
"""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import networkx as nx

from audit_retained_half_state_partition import (
    broom,
    connected_components,
    induced,
    local_quantities,
    root_component_distribution,
    star_isolates,
    subtree_distribution,
    two_stars,
)
from random_leaf_gsb_local_payment import coeff, tree_polynomial
from patternboost_corpus_audit import adjacency_from_prufer


def rooted_distribution(adjacency, root, max_k):
    """Residual distribution with root-neighbor hit multiplicity."""
    children = list(adjacency[root])
    output = defaultdict(int)
    cache = {}
    for selected in (0, 1):
        # k,n,m,s2,hit count,residual children,sum child degrees
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
                hits0,
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
                            hits0 + child_selected,
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
            hit_count,
            residual_children,
            residual_child_degree_sum,
        ), count in partial.items():
            open_root = int(not selected and hit_count == 0)
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
                    min(2, hit_count),
                )
            ] += count
    return output


def forest_distribution_hits(adjacency, root, max_k):
    components = connected_components(adjacency)
    root_component = next(
        component for component in components if root in component
    )
    local, indices = induced(adjacency, root_component)
    combined = rooted_distribution(
        local, indices[root], max_k
    )
    for component in components:
        if component is root_component:
            continue
        local, _ = induced(adjacency, component)
        pointed = root_component_distribution(
            local, 0, max_k
        )
        unpointed = defaultdict(int)
        for (
            k,
            residual_n,
            residual_m,
            square_sum,
            _state,
            _degree,
        ), count in pointed.items():
            unpointed[
                (k, residual_n, residual_m, square_sum)
            ] += count
        following = defaultdict(int)
        for (
            k0,
            n0,
            m0,
            s20,
            state,
            root_degree,
            hit_count,
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
                        root_degree,
                        hit_count,
                    )
                ] += count0 * countc
        combined = following
    return combined


def brute_distribution_hits(adjacency, root, max_k):
    order = len(adjacency)
    neighbor_masks = []
    for neighbors in adjacency:
        mask = 0
        for neighbor in neighbors:
            mask |= 1 << neighbor
        neighbor_masks.append(mask)
    output = defaultdict(int)
    for mask in range(1 << order):
        k = mask.bit_count()
        if k > max_k:
            continue
        if any(
            mask & (1 << vertex)
            and neighbor_masks[vertex] & mask
            for vertex in range(order)
        ):
            continue
        forbidden = mask
        for vertex in range(order):
            if mask & (1 << vertex):
                forbidden |= neighbor_masks[vertex]
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
        if mask & (1 << root):
            state = "selected"
            root_degree = 0
        elif root in residual_set:
            state = "open"
            root_degree = degrees[root]
        else:
            state = "blocked"
            root_degree = 0
        hits = (
            neighbor_masks[root] & mask
        ).bit_count()
        output[
            (
                k,
                len(residual),
                sum(degrees.values()) // 2,
                sum(value * value for value in degrees.values()),
                state,
                root_degree,
                min(2, hits),
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
            assert forest_distribution_hits(
                adjacency, root, len(adjacency)
            ) == brute_distribution_hits(
                adjacency, root, len(adjacency)
            )


def evaluate(adjacency, root, label):
    polynomial = tree_polynomial(adjacency)
    deleted = tree_polynomial(adjacency, deleted=root)
    alpha = polynomial.degree()
    relevant_ranks = []
    for r in range(6, alpha + 1):
        bm = int(coeff(polynomial, r - 1))
        br = int(coeff(polynomial, r))
        if bm and br and Fraction(r * br, bm) >= r:
            relevant_ranks.append(r)
    if not relevant_ranks:
        return {
            "label": label,
            "checks": 0,
            "failures": {},
            "minima": {},
        }
    distribution = forest_distribution_hits(
        adjacency, root, max(relevant_ranks) - 2
    )
    by_rank = defaultdict(list)
    for key, count in distribution.items():
        by_rank[key[0]].append((key, count))
    failures = defaultdict(int)
    minima = {}
    minimum_items = {}
    checks = 0

    for r in relevant_ranks:
        bm = int(coeff(polynomial, r - 1))
        br = int(coeff(polynomial, r))
        u = Fraction(r * br, bm)
        p = Fraction(
            bm - int(coeff(deleted, r - 1)), bm
        )
        mass = (r - 1) * bm
        observed_mass = 0
        sums = {
            "selected": Fraction(0),
            "blocked_one": Fraction(0),
            "blocked_many": Fraction(0),
            "open": Fraction(0),
        }
        for (
            _k,
            residual_n,
            residual_m,
            square_sum,
            state,
            root_degree,
            hit_count,
        ), count in by_rank[r - 2]:
            if residual_n <= 0:
                continue
            weight_mass = count * residual_n
            observed_mass += weight_mass
            (
                a_value,
                p_value,
                raw_margin,
                adjustment,
                drift_factor,
            ) = local_quantities(
                residual_n,
                residual_m,
                square_sum,
                state,
                root_degree,
            )
            centered_p = p_value - p
            centered = a_value - u - r * centered_p
            phi = (
                raw_margin
                - adjustment
                + 2 * (r - 2) * drift_factor
                + 2 * r * r * centered_p * centered_p
                - 2 * centered * centered
            )
            key = state
            if state == "blocked":
                key = (
                    "blocked_one"
                    if hit_count == 1
                    else "blocked_many"
                )
            sums[key] += Fraction(weight_mass, mass) * phi
        assert observed_mass == mass
        values = {
            "selected_repaired": (
                sums["selected"]
                + sums["blocked_one"]
                + sums["blocked_many"] / 2
            ),
            "open_repaired": (
                sums["open"] + sums["blocked_many"] / 2
            ),
            "selected_rank_share": (
                sums["selected"]
                + sums["blocked_one"]
                + sums["blocked_many"] / (r - 2)
            ),
            "open_rank_share": (
                sums["open"]
                + Fraction(r - 3, r - 2)
                * sums["blocked_many"]
            ),
            "blocked_one": sums["blocked_one"],
            "blocked_many": sums["blocked_many"],
        }
        checks += 1
        item = {
            "label": label,
            "order": len(adjacency),
            "root": root,
            "root_degree": len(adjacency[root]),
            "r": r,
            "u": str(u),
            **{
                name: str(value)
                for name, value in sums.items()
            },
        }
        for name, value in values.items():
            if value < 0:
                failures[name] += 1
            if name not in minima or value < minima[name]:
                minima[name] = value
                minimum_items[name] = item

    return {
        "label": label,
        "checks": checks,
        "failures": dict(failures),
        "minima": {
            name: {
                "exact": str(value),
                "float": float(value),
                **minimum_items[name],
            }
            for name, value in minima.items()
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--broom", action="append", default=[])
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
    parser.add_argument("--order", type=int, default=50)
    parser.add_argument("--roots", type=int, default=3)
    parser.add_argument("--components", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--patternboost-index",
        action="append",
        type=int,
        default=[],
    )
    parser.add_argument(
        "--patternboost-corpus",
        type=Path,
        default=Path(
            "patternboost60_polynomial_corpus_20260726.json"
        ),
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    self_test()
    rng = random.Random(args.seed)
    tasks = []

    for specification in args.broom:
        leaves, path_order = map(
            int, specification.split(",")
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
            int, specification.split(",")
        )
        adjacency = two_stars(first, second, isolates)
        roots = [0, 1, first + 1]
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
            int, specification.split(",")
        )
        adjacency = star_isolates(leaves, isolates)
        roots = [0]
        if leaves:
            roots.append(1)
        if isolates:
            roots.append(leaves + 1)
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

    if args.patternboost_index:
        corpus = json.loads(
            args.patternboost_corpus.read_text(
                encoding="utf-8"
            )
        )
        records = corpus["records"]
        for index in args.patternboost_index:
            adjacency = adjacency_from_prufer(
                records[index]["prufer_code_one_based"]
            )
            root = max(
                range(len(adjacency)),
                key=lambda vertex: len(adjacency[vertex]),
            )
            tasks.append(
                (
                    adjacency,
                    root,
                    f"patternboost_{index}_root{root}",
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
        graph = nx.Graph()
        offset = 0
        for size in sizes:
            if size == 1:
                graph.add_node(offset)
            else:
                component = nx.from_prufer_sequence(
                    [
                        rng.randrange(size)
                        for _ in range(size - 2)
                    ]
                )
                graph = nx.compose(
                    graph,
                    nx.relabel_nodes(
                        component,
                        {
                            vertex: offset + vertex
                            for vertex in range(size)
                        },
                    ),
                )
            offset += size
        adjacency = [
            list(graph.neighbors(vertex))
            for vertex in range(args.order)
        ]
        for root in rng.sample(
            range(args.order),
            min(args.roots, args.order),
        ):
            tasks.append(
                (
                    adjacency,
                    root,
                    f"random_forest_{sample}_root{root}",
                )
            )

    reports = [
        evaluate(adjacency, root, label)
        for adjacency, root, label in tasks
    ]
    aggregate_failures = defaultdict(int)
    checks = 0
    for report in reports:
        checks += report["checks"]
        for name, count in report["failures"].items():
            aggregate_failures[name] += count
    output = {
        "parameters": {
            **{
                key: (
                    str(value)
                    if isinstance(value, Path)
                    else value
                )
                for key, value in vars(args).items()
            },
        },
        "tasks": len(tasks),
        "checks": checks,
        "failures": dict(aggregate_failures),
        "reports": reports,
    }
    args.out.write_text(
        json.dumps(output, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
