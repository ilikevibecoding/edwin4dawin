#!/usr/bin/env python3
"""Random large-tree stress test for compensated leaf multipliers.

The scan is exact.  Tree DP computes the independence polynomial of the
tree and of every vertex deletion using directed-edge messages.  The
reported payment ratio uses an integer cross-product formula, so no
floating-point decision is made.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from functools import lru_cache
from pathlib import Path

import networkx as nx

from patternboost_corpus_audit import add, mul


def directed_messages(
    tree: nx.Graph,
    deletion_vertices: list[int] | None = None,
) -> tuple[list[int], dict[int, list[int]]]:
    @lru_cache(maxsize=None)
    def state(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        excluded = [1]
        included_companions = [1]
        for neighbor in tree[vertex]:
            if neighbor == parent:
                continue
            child_excluded, child_total = state(neighbor, vertex)
            excluded = mul(excluded, list(child_total))
            included_companions = mul(
                included_companions, list(child_excluded)
            )
        total = add(excluded, [0, *included_companions])
        return tuple(excluded), tuple(total)

    root = next(iter(tree))
    old = list(state(root, -1)[1])
    deletions = {}
    for vertex in tree if deletion_vertices is None else deletion_vertices:
        value = [1]
        for neighbor in tree[vertex]:
            value = mul(value, list(state(neighbor, vertex)[1]))
        deletions[vertex] = value
    return old, deletions


def shifted_add(old: list[int], deletion: list[int]) -> list[int]:
    new = old[:] + [0]
    for k, value in enumerate(deletion, start=1):
        new[k] += value
    while len(new) > 1 and new[-1] == 0:
        new.pop()
    return new


def ratio_better(
    numerator: int,
    denominator: int,
    champion: dict | None,
) -> bool:
    return (
        champion is None
        or numerator * champion["denominator"]
        > champion["numerator"] * denominator
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=2_000)
    parser.add_argument("--order-min", type=int, default=17)
    parser.add_argument("--order-max", type=int, default=200)
    parser.add_argument(
        "--attachments-per-tree",
        type=int,
        default=0,
        help="Zero checks every vertex; a positive value samples that many.",
    )
    parser.add_argument("--seed", type=int, default=993260726)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "prefix_ranks": 0,
        "negative_multiplier_curvatures": 0,
        "compensation_failures": 0,
        "five_sixths_failures": 0,
    }
    champion = None
    first_compensation_failure = None
    first_five_sixths_failure = None

    for sample in range(args.samples):
        order = rng.randint(args.order_min, args.order_max)
        tree = nx.random_labeled_tree(order, seed=rng.randrange(1 << 63))
        attachment_vertices = list(tree)
        if (
            args.attachments_per_tree > 0
            and args.attachments_per_tree < len(attachment_vertices)
        ):
            attachment_vertices = rng.sample(
                attachment_vertices, args.attachments_per_tree
            )
        old, deletions = directed_messages(tree, attachment_vertices)
        for attachment in attachment_vertices:
            deletion = deletions[attachment]
            new = shifted_add(old, deletion)
            alpha = len(new) - 1
            cutoff = (2 * alpha + 1) // 3
            totals["attachments"] += 1
            for k in range(1, min(cutoff, len(old) - 1)):
                totals["prefix_ranks"] += 1
                old_product = old[k - 1] * old[k + 1]
                new_product = new[k - 1] * new[k + 1]
                defect_numerator = (
                    new_product * old[k] * old[k]
                    - new[k] * new[k] * old_product
                )
                if defect_numerator <= 0:
                    continue
                totals["negative_multiplier_curvatures"] += 1
                reserve_numerator = (
                    k * old[k] * old[k] - (k + 1) * old_product
                )
                product_increment = new_product - old_product
                numerator = k * defect_numerator
                denominator = product_increment * reserve_numerator
                item = {
                    "sample": sample,
                    "order": order,
                    "attachment": attachment,
                    "alpha_after_attachment": alpha,
                    "cutoff": cutoff,
                    "rank": k,
                    "numerator": numerator,
                    "denominator": denominator,
                    "payment_ratio": numerator / denominator,
                    "prufer_code": nx.to_prufer_sequence(tree),
                    "old": old,
                    "deletion": deletion,
                    "new": new,
                }
                if denominator <= 0 or numerator > denominator:
                    totals["compensation_failures"] += 1
                    if first_compensation_failure is None:
                        first_compensation_failure = item
                if 6 * numerator > 5 * denominator:
                    totals["five_sixths_failures"] += 1
                    if first_five_sixths_failure is None:
                        first_five_sixths_failure = item
                if denominator > 0 and ratio_better(
                    numerator, denominator, champion
                ):
                    champion = item

        totals["trees"] += 1
        if (sample + 1) % 100 == 0:
            print(
                f"trees={sample + 1:,} attachments={totals['attachments']:,} "
                f"prefix ranks={totals['prefix_ranks']:,} "
                f"max={None if champion is None else champion['payment_ratio']:.12f}",
                flush=True,
            )
        if first_compensation_failure is not None:
            break

    payload = {
        "status": (
            "prefix_compensation_failure"
            if first_compensation_failure is not None
            else "no_prefix_compensation_failure"
        ),
        "parameters": {
            "samples": args.samples,
            "order_min": args.order_min,
            "order_max": args.order_max,
            "attachments_per_tree": args.attachments_per_tree,
            "seed": args.seed,
        },
        "exact_integer_decisions": True,
        "totals": totals,
        "champion": champion,
        "first_five_sixths_failure": first_five_sixths_failure,
        "first_compensation_failure": first_compensation_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": payload["status"],
                "totals": totals,
                "champion": (
                    None
                    if champion is None
                    else {
                        key: champion[key]
                        for key in (
                            "order",
                            "attachment",
                            "alpha_after_attachment",
                            "cutoff",
                            "rank",
                            "payment_ratio",
                        )
                    }
                ),
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if first_compensation_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
