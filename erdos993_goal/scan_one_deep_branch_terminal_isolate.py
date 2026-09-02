#!/usr/bin/env python3
"""Stress-test TI on the deepest-support one-deep-branch factorization."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from random_leaf_gsb_local_payment import coeff, tree_polynomial


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])
ONE_PLUS_X = fmpz_poly([1, 1])


def burden_values(
    inward: fmpz_poly,
    inward_deletion: fmpz_poly,
    side_stars: list[int],
    minimum_rank: int,
) -> dict[int, Fraction]:
    star_block = ONE
    total_leaves = 0
    for leaves in side_stars:
        star_block *= ONE_PLUS_X**leaves + X
        total_leaves += leaves
    link_block = ONE_PLUS_X**total_leaves
    avoiding = inward * star_block
    base = avoiding + X * inward_deletion * link_block
    total = ONE_PLUS_X * base
    out = {}
    for rank in range(minimum_rank, total.degree() + 1):
        bm = int(coeff(total, rank - 1))
        br = int(coeff(total, rank))
        if not bm or not br or br < bm:
            continue
        u = Fraction(rank * br, bm)
        rho_previous = Fraction(
            bm - int(coeff(avoiding, rank - 1)), bm
        )
        rho = Fraction(
            br - int(coeff(avoiding, rank)), br
        )
        out[rank] = (
            rank * (u + 1) * rho_previous
            - (rank + 1) * u * rho
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--inward-order", type=int, default=40)
    parser.add_argument("--max-side-stars", type=int, default=6)
    parser.add_argument("--max-star-leaves", type=int, default=30)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = failures = comparable = attachment_worsened = 0
    maximum = None
    maximum_item = None
    minimum_attachment_change = None
    minimum_change_item = None
    maximum_attachment_change = None
    maximum_change_item = None
    maximum_by_category = {}
    comparable_by_category = {}
    worsened_by_category = {}
    first_failure = None

    for sample in range(args.samples):
        graph = nx.from_prufer_sequence(
            [
                rng.randrange(args.inward_order)
                for _ in range(args.inward_order - 2)
            ]
        )
        adjacency = [
            list(graph.neighbors(vertex))
            for vertex in range(args.inward_order)
        ]
        root = rng.randrange(args.inward_order)
        inward = tree_polynomial(adjacency)
        inward_deletion = tree_polynomial(adjacency, deleted=root)
        count = rng.randint(0, args.max_side_stars)
        side_stars = [
            rng.randint(0, args.max_star_leaves)
            for _ in range(count)
        ]
        values = burden_values(
            inward,
            inward_deletion,
            side_stars,
            args.minimum_rank,
        )
        baseline = burden_values(
            inward,
            inward_deletion,
            [],
            args.minimum_rank,
        )
        for rank, burden in values.items():
            checks += 1
            item = {
                "sample": sample,
                "inward_root": root,
                "inward_root_degree": len(adjacency[root]),
                "side_stars": side_stars,
                "rank": rank,
                "burden": str(burden),
                "inward_prufer": nx.to_prufer_sequence(graph),
            }
            if maximum is None or burden > maximum:
                maximum = burden
                maximum_item = item
            category = (
                "no_side"
                if not side_stars
                else (
                    "direct_leaves_only"
                    if all(leaves == 0 for leaves in side_stars)
                    else (
                        "nontrivial_stars_only"
                        if all(leaves > 0 for leaves in side_stars)
                        else "mixed_direct_and_nontrivial"
                    )
                )
            )
            old_category = maximum_by_category.get(category)
            if old_category is None or burden > old_category[0]:
                maximum_by_category[category] = (burden, item)
            if burden > 0:
                failures += 1
                if first_failure is None:
                    first_failure = item
            if rank in baseline:
                comparable += 1
                comparable_by_category[category] = (
                    comparable_by_category.get(category, 0) + 1
                )
                change = burden - baseline[rank]
                if change > 0:
                    attachment_worsened += 1
                    worsened_by_category[category] = (
                        worsened_by_category.get(category, 0) + 1
                    )
                if (
                    maximum_attachment_change is None
                    or change > maximum_attachment_change
                ):
                    maximum_attachment_change = change
                    maximum_change_item = item | {
                        "baseline_burden": str(baseline[rank]),
                        "attachment_change": str(change),
                    }
                if (
                    minimum_attachment_change is None
                    or change < minimum_attachment_change
                ):
                    minimum_attachment_change = change
                    minimum_change_item = item | {
                        "baseline_burden": str(baseline[rank]),
                        "attachment_change": str(change),
                    }
        if (sample + 1) % 2000 == 0:
            print(
                f"samples={sample + 1:,} checks={checks:,} "
                f"failures={failures} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )
        if first_failure is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if failures else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
        "maximum_burden": (
            None
            if maximum is None
            else {"exact": str(maximum), **maximum_item}
        ),
        "comparable_rank_checks": comparable,
        "attachment_worsened_count": attachment_worsened,
        "comparable_by_category": comparable_by_category,
        "worsened_by_category": worsened_by_category,
        "maximum_by_category": {
            category: {"exact": str(value), **item}
            for category, (value, item) in maximum_by_category.items()
        },
        "maximum_attachment_change": (
            None
            if maximum_attachment_change is None
            else {
                "exact": str(maximum_attachment_change),
                **maximum_change_item,
            }
        ),
        "minimum_attachment_change": (
            None
            if minimum_attachment_change is None
            else {
                "exact": str(minimum_attachment_change),
                **minimum_change_item,
            }
        ),
        "first_failure": first_failure,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "failures": failures,
                "maximum_burden": (
                    None if maximum is None else str(maximum)
                ),
                "comparable_rank_checks": comparable,
                "attachment_worsened_count": attachment_worsened,
            },
            indent=2,
        )
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
