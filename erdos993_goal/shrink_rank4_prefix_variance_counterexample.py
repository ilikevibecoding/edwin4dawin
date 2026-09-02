#!/usr/bin/env python3
"""Shrink and certify a counterexample to the unit prefix-variance bound.

For a tree F, let a uniform independent 4-set be randomly ordered and
reveal its first vertex v.  Conditional on v, the mean final residual
order is

    a_v = 4 i_4(F-N[v]) / i_3(F-N[v]),

with v distributed proportionally to i_3(F-N[v]).  The tempting
martingale shortcut would assert Var(a_v)<=1.  This executable starts
from a deterministic random witness, greedily deletes leaves while
preserving Var(a_v)>1, and writes an exact negative-control record.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import jet


def minor(tree: nx.Graph, vertex: int) -> nx.Graph:
    return tree.subgraph(
        set(tree) - {vertex} - set(tree[vertex])
    ).copy()


def rank4_prefix_variance(tree: nx.Graph) -> tuple[Fraction, list[dict]]:
    global_row = jet(tree).get(4, (0, 0, 0, 0, 0, 0))
    independent_fours = global_row[0]
    if not independent_fours:
        return Fraction(0), []
    denominator = 4 * independent_fours
    local_rows = []
    mass_sum = 0
    weighted_square_sum = Fraction(0)
    for vertex in tree:
        graph = minor(tree, vertex)
        row = (
            jet(graph).get(3, (0, 0, 0, 0, 0, 0))
            if graph
            else (0, 0, 0, 0, 0, 0)
        )
        count, mass = row[0], row[1]
        if not count:
            continue
        conditional_mean = Fraction(mass, count)
        mass_sum += mass
        weighted_square_sum += Fraction(mass * mass, count)
        local_rows.append(
            {
                "vertex": vertex,
                "weight_i3_link": count,
                "conditional_mean": str(conditional_mean),
            }
        )
    if mass_sum != global_row[1] * 4:
        raise AssertionError(
            ("rank-four deletion mass identity", mass_sum, global_row[1])
        )
    mean = Fraction(mass_sum, denominator)
    variance = weighted_square_sum / denominator - mean * mean
    return variance, local_rows


def deterministic_start() -> nx.Graph:
    rng = random.Random(994002)
    witness = None
    for sample in range(156):
        order = rng.randint(14, 70)
        tree = nx.from_prufer_sequence(
            [rng.randrange(order) for _ in range(order - 2)]
        )
        if sample == 155:
            witness = tree
    if witness is None:
        raise AssertionError("failed to reconstruct deterministic witness")
    variance, _ = rank4_prefix_variance(witness)
    if variance <= 1:
        raise AssertionError(
            ("reconstructed witness is not negative", variance)
        )
    return witness


def greedy_shrink(tree: nx.Graph) -> tuple[nx.Graph, list[dict]]:
    history = []
    while True:
        candidates = []
        for leaf in [v for v in tree if tree.degree(v) == 1]:
            smaller = tree.subgraph(set(tree) - {leaf}).copy()
            smaller = nx.convert_node_labels_to_integers(smaller)
            variance, _ = rank4_prefix_variance(smaller)
            if variance > 1:
                candidates.append((variance, leaf, smaller))
        if not candidates:
            return tree, history
        # Retain the deletion with the largest exact violation.
        variance, leaf, tree = max(candidates, key=lambda row: row[0])
        history.append(
            {
                "deleted_leaf": leaf,
                "new_order": len(tree),
                "between_prefix_variance": str(variance),
                "exceeds_one_by": str(variance - 1),
            }
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rank4_prefix_variance_counterexample_20260729.json"
        ),
    )
    args = parser.parse_args()

    start = deterministic_start()
    start_variance, _ = rank4_prefix_variance(start)
    witness, history = greedy_shrink(start)
    variance, local_rows = rank4_prefix_variance(witness)
    code = nx.to_graph6_bytes(
        witness, header=False
    ).decode("ascii").strip()
    report = {
        "status": "PASS_EXACT_NEGATIVE_CONTROL",
        "false_candidate": (
            "For rank q=4, the variance of the conditional mean "
            "final residual order after revealing one selected "
            "vertex is at most one."
        ),
        "deterministic_start_order": len(start),
        "deterministic_start_variance": str(start_variance),
        "greedy_deletions": history,
        "witness_order": len(witness),
        "witness_graph6": code,
        "is_tree": nx.is_tree(witness),
        "rank_q": 4,
        "between_prefix_variance": str(variance),
        "exceeds_one_by": str(variance - 1),
        "local_fibers": local_rows,
        "scope": (
            "The negative control refutes only the separated unit "
            "martingale step. It does not refute the coupled Lambda "
            "floor, whose conditional rank-three component surplus "
            "can still pay this excess."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
