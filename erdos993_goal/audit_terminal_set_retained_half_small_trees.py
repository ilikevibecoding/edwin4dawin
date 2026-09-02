#!/usr/bin/env python3
"""Exact retained-half audit for genuine terminal sets in small trees.

For every terminal support p, choose one adjacent leaf l and form
F=G-{l,p}.  The hit set W consists of the remaining neighbors of p:
all but at most one are isolated in F.  The script evaluates the
retained-half square-completion exactly on every down-link fiber.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import networkx as nx

from audit_terminal_set_retained_half_two_level import (
    terminal_local_quantities,
)
from leaf_addition_pendant_monotonicity_scan import graph6


def forest_data(
    tree: nx.Graph, deleted: set[int]
) -> tuple[list[list[int]], dict[int, int]]:
    vertices = [
        vertex for vertex in tree if vertex not in deleted
    ]
    positions = {
        vertex: index for index, vertex in enumerate(vertices)
    }
    adjacency = [[] for _ in vertices]
    for vertex in vertices:
        adjacency[positions[vertex]] = [
            positions[neighbor]
            for neighbor in tree[vertex]
            if neighbor in positions
        ]
    return adjacency, positions


def independent_masks(
    adjacency: list[list[int]],
) -> tuple[list[int], list[int]]:
    order = len(adjacency)
    neighbor_masks = []
    for neighbors in adjacency:
        mask = 0
        for neighbor in neighbors:
            mask |= 1 << neighbor
        neighbor_masks.append(mask)
    masks = []
    counts = [0] * (order + 1)
    for mask in range(1 << order):
        if any(
            mask & (1 << vertex)
            and mask & neighbor_masks[vertex]
            for vertex in range(order)
        ):
            continue
        masks.append(mask)
        counts[mask.bit_count()] += 1
    while counts and counts[-1] == 0:
        counts.pop()
    return masks, counts


def evaluate_terminal(
    tree: nx.Graph,
    tree_index: int,
    support: int,
    leaf: int,
    min_rank: int,
) -> list[dict]:
    adjacency, positions = forest_data(tree, {support, leaf})
    terminal_original = [
        neighbor
        for neighbor in tree[support]
        if neighbor != leaf
    ]
    terminal = {
        positions[vertex] for vertex in terminal_original
    }
    order = len(adjacency)
    masks, counts = independent_masks(adjacency)
    full_mask = (1 << order) - 1
    neighbor_masks = []
    for neighbors in adjacency:
        mask = 0
        for neighbor in neighbors:
            mask |= 1 << neighbor
        neighbor_masks.append(mask)
    terminal_mask = sum(1 << vertex for vertex in terminal)
    output = []

    for r in range(min_rank, len(counts)):
        bm = counts[r - 1]
        br = counts[r]
        if not bm or not br:
            continue
        u = Fraction(r * br, bm)
        if u < r:
            continue
        hit_sets = sum(
            1
            for mask in masks
            if mask.bit_count() == r - 1
            and mask & terminal_mask
        )
        p = Fraction(hit_sets, bm)
        hit_sets_r = sum(
            1
            for mask in masks
            if mask.bit_count() == r
            and mask & terminal_mask
        )
        hit_probability_r = Fraction(hit_sets_r, br)
        burden = (
            r * (u + 1) * p
            - (r + 1) * u * hit_probability_r
        )
        mass = (r - 1) * bm
        observed = 0
        sums = {
            "inherited": Fraction(0),
            "blocked": Fraction(0),
            "genuine": Fraction(0),
        }

        for mask in masks:
            if mask.bit_count() != r - 2:
                continue
            forbidden = mask
            for vertex in range(order):
                if mask & (1 << vertex):
                    forbidden |= neighbor_masks[vertex]
            residual_mask = full_mask & ~forbidden
            residual_vertices = [
                vertex
                for vertex in range(order)
                if residual_mask & (1 << vertex)
            ]
            residual_n = len(residual_vertices)
            if residual_n <= 0:
                continue
            residual_set = set(residual_vertices)
            degrees = {
                vertex: sum(
                    neighbor in residual_set
                    for neighbor in adjacency[vertex]
                )
                for vertex in residual_vertices
            }
            residual_m = sum(degrees.values()) // 2
            square_sum = sum(
                degree * degree for degree in degrees.values()
            )
            inherited = bool(mask & terminal_mask)
            residual_terminal = (
                terminal & residual_set if not inherited else set()
            )
            terminal_count = len(residual_terminal)
            terminal_degree_sum = sum(
                degrees[vertex] for vertex in residual_terminal
            )
            (
                a_value,
                p_value,
                raw_margin,
                adjustment,
                drift_factor,
            ) = terminal_local_quantities(
                residual_n,
                residual_m,
                square_sum,
                inherited,
                terminal_count,
                terminal_degree_sum,
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
            if inherited:
                key = "inherited"
            elif not residual_terminal:
                key = "blocked"
            else:
                key = "genuine"
            weight_mass = residual_n
            observed += weight_mass
            sums[key] += Fraction(weight_mass, mass) * phi
        assert observed == mass
        values = {
            "retained_half_total": sum(sums.values()),
            "inherited_half_blocked":
                sums["inherited"] + sums["blocked"] / 2,
            "genuine_half_blocked":
                sums["genuine"] + sums["blocked"] / 2,
        }
        if len(terminal) >= 2:
            values["nonpositive_occupancy_burden"] = -burden
        output.append(
            {
                "tree_order": tree.number_of_nodes(),
                "tree_index": tree_index,
                "graph6": graph6(tree),
                "support": support,
                "support_degree": tree.degree[support],
                "leaf": leaf,
                "terminal_set_size": len(terminal),
                "forest_order": order,
                "r": r,
                "u": str(u),
                "global_hit_probability": str(p),
                "next_hit_probability": str(hit_probability_r),
                "occupancy_burden": str(burden),
                "subtotals": {
                    name: str(value)
                    for name, value in sums.items()
                },
                "values": {
                    name: str(value)
                    for name, value in values.items()
                },
            }
        )
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    failures = defaultdict(int)
    minima = {}
    first_failures = {}
    for order in range(3, args.max_order + 1):
        tree_count = terminal_count = 0
        for tree_index, tree in enumerate(
            nx.nonisomorphic_trees(order)
        ):
            tree_count += 1
            for support in tree:
                leaves = [
                    neighbor
                    for neighbor in tree[support]
                    if tree.degree[neighbor] == 1
                ]
                nonleaf_count = sum(
                    tree.degree[neighbor] > 1
                    for neighbor in tree[support]
                )
                if not leaves or nonleaf_count > 1:
                    continue
                terminal_count += 1
                for item in evaluate_terminal(
                    tree,
                    tree_index,
                    support,
                    leaves[0],
                    args.min_rank,
                ):
                    checks += 1
                    for name, text in item["values"].items():
                        value = Fraction(text)
                        if value < 0:
                            failures[name] += 1
                            first_failures.setdefault(name, item)
                        if (
                            name not in minima
                            or value < Fraction(minima[name]["exact"])
                        ):
                            minima[name] = {
                                "exact": str(value),
                                "float": float(value),
                                "witness": item,
                            }
        print(
            f"n={order}: trees={tree_count:,} "
            f"terminal_supports={terminal_count:,} "
            f"checks={checks:,} failures={dict(failures)}",
            flush=True,
        )

    report = {
        "status": (
            "FAIL_RETAINED_HALF"
            if failures.get("retained_half_total", 0)
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": dict(failures),
        "minima": minima,
        "first_failures": first_failures,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "failures": dict(failures),
                "minimum_floats": {
                    name: item["float"]
                    for name, item in minima.items()
                },
                "report": str(args.out),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if report["status"] == "FAIL_RETAINED_HALF" else 0


if __name__ == "__main__":
    raise SystemExit(main())
