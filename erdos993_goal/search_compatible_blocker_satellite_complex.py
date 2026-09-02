#!/usr/bin/env python3
"""Search compatible-blocker TI on simplex-with-satellites complexes.

The blocker union U is a simplex partitioned into color classes.
Every additional facet is R_j union O_j, where R_j is a union of
chosen blocker vertices and the outside sets O_j are pairwise
disjoint.  This preserves U as a face while permitting large,
irregular coefficient spikes.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def add(left: list[int], right: list[int]) -> list[int]:
    size = max(len(left), len(right))
    return [
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    ]


def multiply(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return result


def binomial_poly(size: int) -> list[int]:
    return [comb(size, rank) for rank in range(size + 1)]


def star_product(class_traces: list[int]) -> list[int]:
    result = [1]
    for trace in class_traces:
        factor = binomial_poly(trace)
        if len(factor) < 2:
            factor.append(0)
        factor[1] += 1
        result = multiply(result, factor)
    return result


def shift(poly: list[int], amount: int = 1) -> list[int]:
    return [0] * amount + poly


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--max-degree", type=int, default=8)
    parser.add_argument("--max-class-size", type=int, default=12)
    parser.add_argument("--max-satellites", type=int, default=30)
    parser.add_argument("--max-outside-size", type=int, default=50)
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
        deletion_link = binomial_poly(sum(class_sizes))
        root_deleted = star_product(class_sizes)
        satellites = []

        for _ in range(rng.randint(1, args.max_satellites)):
            outside_size = (
                1
                if rng.random() < 0.35
                else rng.randint(2, args.max_outside_size)
            )
            trace = [
                (
                    0
                    if rng.random() < 0.35
                    else rng.randint(1, class_size)
                )
                for class_size in class_sizes
            ]
            outside_nonempty = binomial_poly(outside_size)
            outside_nonempty[0] -= 1
            deletion_piece = multiply(
                outside_nonempty,
                binomial_poly(sum(trace)),
            )
            root_piece = multiply(
                outside_nonempty,
                star_product(trace),
            )
            deletion_link = add(deletion_link, deletion_piece)
            root_deleted = add(root_deleted, root_piece)
            satellites.append(
                {
                    "outside_size": outside_size,
                    "trace": trace,
                }
            )

        rooted_base = add(root_deleted, shift(deletion_link))
        total = add(rooted_base, shift(rooted_base))
        for rank in range(1, len(total)):
            previous = total[rank - 1]
            current = total[rank]
            if not previous or not current or current < previous:
                continue
            avoid_previous = (
                root_deleted[rank - 1]
                if rank - 1 < len(root_deleted)
                else 0
            )
            avoid_current = (
                root_deleted[rank]
                if rank < len(root_deleted)
                else 0
            )
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
                "degree": degree,
                "class_sizes": class_sizes,
                "satellites": satellites,
                "rank": rank,
                "burden": str(burden),
                "deletion_link": deletion_link,
                "root_deleted": root_deleted,
                "b_previous": previous,
                "b_current": current,
                "c_previous": avoid_previous,
                "c_current": avoid_current,
            }
            if maximum is None or burden > maximum:
                maximum = burden
                maximum_item = item
            if burden > 0:
                first = item
                break
        if first is not None:
            break
        if (sample + 1) % 10_000 == 0:
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
