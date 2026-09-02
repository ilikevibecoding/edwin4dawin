#!/usr/bin/env python3
"""Stress TI for a root with two independent graph layers.

The neighbours of the distinguished root form an independent set.
Their blocker vertices are partitioned into disjoint classes and
their union is independent.  Everything below the blocker layer is
an arbitrary graph.  This strictly contains the corresponding local
structure in a tree.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def add_shifted(target: list[int], source: list[int], shift: int) -> None:
    for rank, value in enumerate(source):
        target[rank + shift] += value


def multiply(left: list[int], right: list[int]) -> list[int]:
    product = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            product[i + j] += a * b
    return product


def star_factor(leaves: int) -> list[int]:
    result = [comb(leaves, rank) for rank in range(leaves + 1)]
    if len(result) < 2:
        result.append(0)
    result[1] += 1
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--outside-vertices", type=int, default=13)
    parser.add_argument(
        "--outside-forest",
        action="store_true",
        help="Generate the lower graph as a random forest.",
    )
    parser.add_argument("--max-degree", type=int, default=6)
    parser.add_argument("--max-class-size", type=int, default=5)
    parser.add_argument(
        "--max-blockers-per-outside",
        type=int,
        default=-1,
        help=(
            "If nonnegative, cap the number of blocker vertices "
            "adjacent to each outside vertex.  Trees have cap one."
        ),
    )
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = 0
    maximum: Fraction | None = None
    maximum_item = None
    first = None

    for sample in range(args.samples):
        degree = rng.randint(1, args.max_degree)
        class_sizes = [
            rng.randint(1, args.max_class_size)
            for _ in range(degree)
        ]
        blocker_count = sum(class_sizes)
        blocker_colors = [
            color
            for color, size in enumerate(class_sizes)
            for _ in range(size)
        ]

        outside_adjacency = [0] * args.outside_vertices
        outside_density = rng.random() * 0.8
        if args.outside_forest:
            for right in range(1, args.outside_vertices):
                if rng.random() < outside_density:
                    left = rng.randrange(right)
                    outside_adjacency[left] |= 1 << right
                    outside_adjacency[right] |= 1 << left
        else:
            for left in range(args.outside_vertices):
                for right in range(left + 1, args.outside_vertices):
                    if rng.random() < outside_density:
                        outside_adjacency[left] |= 1 << right
                        outside_adjacency[right] |= 1 << left

        blocker_neighborhoods = [0] * blocker_count
        cross_density = rng.random()
        if args.max_blockers_per_outside >= 0:
            for vertex in range(args.outside_vertices):
                count = rng.randint(
                    0,
                    min(args.max_blockers_per_outside, blocker_count),
                )
                for blocker in rng.sample(range(blocker_count), count):
                    blocker_neighborhoods[blocker] |= 1 << vertex
        else:
            for blocker in range(blocker_count):
                for vertex in range(args.outside_vertices):
                    if rng.random() < cross_density:
                        blocker_neighborhoods[blocker] |= 1 << vertex

        max_rank = (
            args.outside_vertices + blocker_count + degree + 4
        )
        root_deleted = [0] * max_rank
        deletion_link = [0] * max_rank

        for outside in range(1 << args.outside_vertices):
            independent = True
            remaining = outside
            while remaining:
                bit = remaining & -remaining
                vertex = bit.bit_length() - 1
                remaining ^= bit
                if outside_adjacency[vertex] & remaining:
                    independent = False
                    break
            if not independent:
                continue

            outside_size = outside.bit_count()
            available_by_color = [0] * degree
            for blocker, neighborhood in enumerate(
                blocker_neighborhoods
            ):
                if not (outside & neighborhood):
                    available_by_color[blocker_colors[blocker]] += 1

            root_piece = [1]
            for leaves in available_by_color:
                root_piece = multiply(root_piece, star_factor(leaves))
            add_shifted(root_deleted, root_piece, outside_size)

            available_total = sum(available_by_color)
            link_piece = [
                comb(available_total, rank)
                for rank in range(available_total + 1)
            ]
            add_shifted(deletion_link, link_piece, outside_size)

        rooted_base = [
            root_deleted[rank]
            + (deletion_link[rank - 1] if rank else 0)
            for rank in range(max_rank)
        ]
        total = [
            rooted_base[rank]
            + (rooted_base[rank - 1] if rank else 0)
            for rank in range(max_rank)
        ]

        for rank in range(1, max_rank):
            previous, current = total[rank - 1], total[rank]
            if not previous or not current or current < previous:
                continue
            avoid_previous = root_deleted[rank - 1]
            avoid_current = root_deleted[rank]
            u = Fraction(rank * current, previous)
            burden = (
                rank
                * (u + 1)
                * Fraction(previous - avoid_previous, previous)
                - (rank + 1)
                * u
                * Fraction(current - avoid_current, current)
            )
            checks += 1
            item = {
                "sample": sample,
                "rank": rank,
                "degree": degree,
                "class_sizes": class_sizes,
                "outside_density": outside_density,
                "cross_density": cross_density,
                "burden": str(burden),
                "root_deleted": root_deleted,
                "deletion_link": deletion_link,
            }
            if maximum is None or burden > maximum:
                maximum = burden
                maximum_item = item
            if burden > 0:
                first = item
                break
        if first is not None:
            break
        if (sample + 1) % 1000 == 0:
            print(
                f"samples={sample + 1:,} checks={checks:,} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "maximum_burden": (
            None if maximum is None else {"exact": str(maximum), **maximum_item}
        ),
        "first_failure": first,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "maximum_burden": (
                    None if maximum is None else str(maximum)
                ),
                "first_failure": first,
            },
            indent=2,
        )
    )
    return 1 if first else 0


if __name__ == "__main__":
    raise SystemExit(main())
