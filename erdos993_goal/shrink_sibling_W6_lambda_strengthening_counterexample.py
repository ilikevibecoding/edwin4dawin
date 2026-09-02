#!/usr/bin/env python3
"""Shrink an exact counterexample to an overstrong sibling-leaf W6 bound.

The required rooted pruning statement only asks

    W6_q(H,v) - W6_q(H-w,v) >= 0

when w is a leaf supported by the root v.  A tempting strengthening was

    W6_q(H,v) - W6_q(H-w,v)
      >= 4 q^2 Lambda_(q-1)(H-{v,w}).

This script deterministically reconstructs a seeded 123-vertex witness,
greedily deletes nondesignated leaves while preserving the strict failure,
and writes a self-contained exact certificate.  It is a negative control
for the strengthening, not for W6 pruning or Erdos Problem 993.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import networkx as nx

from scan_rooted_cross_W6_lambda_pruning import rooted_quantities
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


SEED = 993777
RANK = 4
OUTPUT = Path(
    "sibling_W6_lambda_strengthening_counterexample_20260729.json"
)


def lower_lambda(
    tree: nx.Graph, root: int, leaf: int, q: int
) -> int:
    lower = tree.subgraph(set(tree) - {root, leaf}).copy()
    f, g = factorial_sequences(lower)
    a = at(f, q - 1)
    b = at(f, q)
    c = at(f, q + 1)
    e = at(g, q + 1)
    return (q - 3) * a * a - a * c - 3 * a * e + b * b


def values(
    tree: nx.Graph, root: int, leaf: int, q: int
) -> dict[str, int]:
    if tree.degree(leaf) != 1 or next(iter(tree[leaf])) != root:
        raise ValueError("the designated leaf is not supported by root")
    smaller = tree.subgraph(set(tree) - {leaf}).copy()
    gamma_large, w6_large, _ = rooted_quantities(tree, root)
    gamma_small, w6_small, _ = rooted_quantities(smaller, root)
    lam = lower_lambda(tree, root, leaf, q)
    delta_gamma = gamma_large.get(q, 0) - gamma_small.get(q, 0)
    delta_w6 = w6_large.get(q, 0) - w6_small.get(q, 0)
    return {
        "rank_q": q,
        "Delta_Gamma": delta_gamma,
        "Delta_W6": delta_w6,
        "scaled_lower_Lambda": lam,
        "Gamma_minus_2qLambda": delta_gamma - 2 * q * lam,
        "W6_minus_4q2Lambda": delta_w6 - 4 * q * q * lam,
    }


def initial_witness() -> tuple[nx.Graph, int, int]:
    rng = random.Random(SEED)
    order = rng.randint(4, 150)
    assert order == 123
    tree = nx.from_prufer_sequence(
        [rng.randrange(order) for _ in range(order - 2)]
    )
    leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
    leaf = rng.choice(leaves)
    root = next(iter(tree[leaf]))
    assert (root, leaf) == (15, 6)
    assert values(tree, root, leaf, RANK)[
        "W6_minus_4q2Lambda"
    ] < 0
    return tree, root, leaf


def shrink(
    tree: nx.Graph, root: int, leaf: int
) -> nx.Graph:
    current = tree.copy()
    changed = True
    while changed:
        changed = False
        candidates = sorted(
            vertex
            for vertex in current
            if vertex not in {root, leaf}
            and current.degree(vertex) == 1
        )
        for removed in candidates:
            candidate = current.subgraph(
                set(current) - {removed}
            ).copy()
            if not nx.is_tree(candidate):
                continue
            if values(candidate, root, leaf, RANK)[
                "W6_minus_4q2Lambda"
            ] < 0:
                current = candidate
                changed = True
                break
    return current


def main() -> None:
    initial, root, leaf = initial_witness()
    initial_values = values(initial, root, leaf, RANK)
    reduced = shrink(initial, root, leaf)

    order = sorted(reduced)
    mapping = {old: new for new, old in enumerate(order)}
    reduced = nx.relabel_nodes(reduced, mapping, copy=True)
    reduced_root = mapping[root]
    reduced_leaf = mapping[leaf]
    reduced_values = values(
        reduced, reduced_root, reduced_leaf, RANK
    )
    assert reduced_values["W6_minus_4q2Lambda"] < 0
    assert reduced_values["Delta_W6"] >= 0
    assert reduced_values["Gamma_minus_2qLambda"] >= 0

    removable_preserving_failure = []
    for vertex in reduced:
        if (
            vertex in {reduced_root, reduced_leaf}
            or reduced.degree(vertex) != 1
        ):
            continue
        candidate = reduced.subgraph(
            set(reduced) - {vertex}
        ).copy()
        if values(
            candidate, reduced_root, reduced_leaf, RANK
        )["W6_minus_4q2Lambda"] < 0:
            removable_preserving_failure.append(vertex)
    assert not removable_preserving_failure

    report = {
        "status": "COUNTEREXAMPLE_TO_OVERSTRONG_SIBLING_W6_LAMBDA_BOUND",
        "claim_refuted": (
            "Delta W6_q >= 4 q^2 Lambda_(q-1)(H-{v,w}) "
            "for a leaf w supported by root v"
        ),
        "scope_warning": (
            "The required Delta W6_q>=0 remains true on this tree. "
            "This is not a counterexample to the rooted W6 pruning "
            "candidate or to Erdos Problem 993."
        ),
        "seed": SEED,
        "initial": {
            "order": len(initial),
            "root": root,
            "leaf": leaf,
            **initial_values,
        },
        "reduced": {
            "order": len(reduced),
            "graph6": nx.to_graph6_bytes(
                reduced, header=False
            ).decode("ascii").strip(),
            "edges": [list(edge) for edge in sorted(reduced.edges())],
            "root": reduced_root,
            "leaf": reduced_leaf,
            **reduced_values,
        },
        "leaf_minimal_under_greedy_deletion": True,
        "remaining_nondesignated_leaf_deletions_preserving_failure": (
            removable_preserving_failure
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
