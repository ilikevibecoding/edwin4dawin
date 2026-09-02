#!/usr/bin/env python3
"""Audit a rank-three-prefix martingale route to the Lambda floor.

Choose a uniform ordered independent q-tuple in a forest F and reveal
its first q-3 vertices P.  Conditional on P, the last three selected
vertices form a uniform independent triple in

    F_P = F-N[P].

Let

    m(P) = 4 i_4(F_P) / i_3(F_P),

the conditional mean of the final residual order.  The candidate is

    Var(m(P)) <= q-3.

Together with the rank-three inequality

    Var(h | P) <= E(c | P),

the law of total variance would prove

    Var(h) <= q-3+E c,

equivalently Lambda_q(F)>=i_q(F)^2.

The script performs an exact small-order audit.  The candidate is
false in general; an exact larger negative control is produced by
``shrink_rank4_prefix_variance_counterexample.py``.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import networkx as nx


def polynomial_counter(
    adjacency: list[int],
    maximum_rank: int = 4,
):
    """Return a memoized independent-set counter on induced masks."""

    @lru_cache(maxsize=None)
    def counts(mask: int) -> tuple[int, ...]:
        if not mask:
            return (1,) + (0,) * maximum_rank
        low_bit = mask & -mask
        vertex = low_bit.bit_length() - 1
        without = mask ^ low_bit
        absent = counts(without)
        present = counts(without & ~adjacency[vertex])
        result = list(absent)
        for rank in range(1, maximum_rank + 1):
            result[rank] += present[rank - 1]
        return tuple(result)

    return counts


def independent_prefixes(
    adjacency: list[int],
    closed: list[int],
) -> dict[int, list[int]]:
    """Map prefix rank to the residual mask after deleting its closure."""
    order = len(adjacency)
    all_mask = (1 << order) - 1
    result: dict[int, list[int]] = {0: [all_mask]}
    independent = [True] * (1 << order)
    closure = [0] * (1 << order)
    for mask in range(1, 1 << order):
        low_bit = mask & -mask
        vertex = low_bit.bit_length() - 1
        rest = mask ^ low_bit
        independent[mask] = independent[rest] and not (
            adjacency[vertex] & rest
        )
        closure[mask] = closure[rest] | closed[vertex]
        if independent[mask]:
            result.setdefault(mask.bit_count(), []).append(
                all_mask & ~closure[mask]
            )
    return result


def audit_tree(tree: nx.Graph) -> list[dict]:
    order = len(tree)
    adjacency = [0] * order
    for left, right in tree.edges():
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
    closed = [
        adjacency[vertex] | (1 << vertex)
        for vertex in range(order)
    ]
    counts = polynomial_counter(adjacency)
    prefixes = independent_prefixes(adjacency, closed)

    records = []
    for prefix_rank, residual_masks in prefixes.items():
        q = prefix_rank + 3
        weighted_sum = Fraction(0)
        weighted_square_sum = Fraction(0)
        total_weight = 0
        supported_prefixes = 0
        for residual in residual_masks:
            row = counts(residual)
            triples = row[3]
            if not triples:
                continue
            conditional_mean = Fraction(4 * row[4], triples)
            total_weight += triples
            weighted_sum += triples * conditional_mean
            weighted_square_sum += (
                triples * conditional_mean * conditional_mean
            )
            supported_prefixes += 1
        if not total_weight:
            continue
        mean = weighted_sum / total_weight
        variance = weighted_square_sum / total_weight - mean * mean
        records.append(
            {
                "rank_q": q,
                "prefix_rank": prefix_rank,
                "supported_prefixes": supported_prefixes,
                "conditional_mean": str(mean),
                "between_prefix_variance": str(variance),
                "budget": prefix_rank,
                "gap": str(Fraction(prefix_rank) - variance),
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=13)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rank3_prefix_variance_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    checked_trees = checked_ranks = 0
    failures: list[dict] = []
    minimum: tuple[Fraction, dict] | None = None

    for order in range(1, args.maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        order_trees = order_ranks = 0
        for tree0 in trees:
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for row in audit_tree(tree):
                gap = Fraction(row["gap"])
                record = {
                    "order": order,
                    "graph6": code,
                    **row,
                }
                if gap < 0:
                    failures.append(record)
                if minimum is None or gap < minimum[0]:
                    minimum = (gap, record)
                checked_ranks += 1
                order_ranks += 1
            checked_trees += 1
            order_trees += 1
        print(
            f"order={order} trees={order_trees} "
            f"rank_checks={order_ranks} failures={len(failures)}",
            flush=True,
        )

    report = {
        "status": (
            "PASS_RANK3_PREFIX_VARIANCE_CANDIDATE"
            if not failures
            else "FAIL_RANK3_PREFIX_VARIANCE_CANDIDATE"
        ),
        "candidate": (
            "For a uniform ordered independent q-tuple, the "
            "conditional mean final residual order after revealing "
            "the first q-3 vertices has variance at most q-3."
        ),
        "logical_consequence_if_proved": (
            "Together with the rank-three Lambda floor and the law "
            "of total variance, this proves "
            "Lambda_q(F)>=i_q(F)^2 for every forest and q>=3."
        ),
        "maximum_unlabeled_tree_order": args.maximum_order,
        "checked_trees": checked_trees,
        "checked_ranks": checked_ranks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_gap": minimum[1] if minimum is not None else None,
        "warning": (
            "This is an exact small-order audit. The candidate is "
            "false on a larger tree; see the separately certified "
            "rank-four prefix-variance negative control."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
