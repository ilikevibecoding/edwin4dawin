#!/usr/bin/env python3
"""Exact falsification suite for the two-step extension bound.

For a graph G, let a_k be its independent-set counts and

    mu_k = (k+1) a_{k+1} / a_k.

The candidate inequality

    mu_{k+2} <= mu_k + 2                                      (2SB)

implies the sign-propagation law

    a_k >= a_{k+1}  ==>  a_{k+2} >= a_{k+3}.

This script exhausts small unlabeled trees, samples large random trees, and
uses arbitrary-graph corpora as negative controls.  It is evidence only.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import networkx as nx

HERE = Path(__file__).resolve().parent
PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(PUBLIC_REPO))

from stp2_random_stress import rooted_pair  # noqa: E402
from scripts.valley_scaling_probe import kadd, shift  # noqa: E402


def coefficient(poly: list[int], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def two_step_failure(poly: list[int]) -> dict | None:
    for r in range(0, len(poly) - 3):
        left = (r + 3) * poly[r + 3] * poly[r]
        right = ((r + 1) * poly[r + 1] + 2 * poly[r]) * poly[r + 2]
        if left > right:
            return {
                "r": r,
                "left": left,
                "right": right,
                "difference": left - right,
                "ratio": left / right,
                "window": poly[max(0, r - 1) : r + 5],
            }
    return None


def sign_propagation_failure(poly: list[int]) -> dict | None:
    for k in range(0, len(poly) - 3):
        if poly[k] >= poly[k + 1] and poly[k + 2] < poly[k + 3]:
            return {
                "k": k,
                "coefficients": poly[k : k + 4],
            }
    return None


def tree_poly(adjacency: list[list[int]]) -> list[int]:
    e, j = rooted_pair(adjacency, 0)
    return kadd(e, shift(j))


def graph_poly_bruteforce(graph: nx.Graph) -> list[int]:
    n = graph.number_of_nodes()
    nodes = list(graph.nodes())
    index = {node: i for i, node in enumerate(nodes)}
    edge_masks = []
    for u, v in graph.edges():
        edge_masks.append((1 << index[u]) | (1 << index[v]))
    counts = [0] * (n + 1)
    for mask in range(1 << n):
        if any(mask & edge_mask == edge_mask for edge_mask in edge_masks):
            continue
        counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def exhaustive_trees(max_order: int) -> dict:
    trees = 0
    by_order = {}
    closest = None
    for n in range(1, max_order + 1):
        generator = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        order_count = 0
        for graph in generator:
            order_count += 1
            trees += 1
            adjacency = [sorted(graph.neighbors(v)) for v in range(n)]
            poly = tree_poly(adjacency)
            failure = two_step_failure(poly)
            if failure is not None:
                return {
                    "status": "counterexample",
                    "trees_checked": trees,
                    "order": n,
                    "edges": sorted([sorted(edge) for edge in graph.edges()]),
                    "polynomial": poly,
                    "failure": failure,
                }
            assert sign_propagation_failure(poly) is None
            for r in range(0, len(poly) - 3):
                left = (r + 3) * poly[r + 3] * poly[r]
                right = ((r + 1) * poly[r + 1] + 2 * poly[r]) * poly[r + 2]
                if right == 0:
                    continue
                if (
                    closest is None
                    or left * closest["right"] > closest["left"] * right
                ):
                    closest = {
                        "order": n,
                        "r": r,
                        "left": left,
                        "right": right,
                        "ratio": left / right,
                    }
        by_order[n] = order_count
    return {
        "status": "no_failure",
        "max_order": max_order,
        "trees_checked": trees,
        "by_order": by_order,
        "closest": closest,
    }


def random_trees(trials: int, max_order: int, seed: int) -> dict:
    rng = random.Random(seed)
    closest = None
    for trial in range(1, trials + 1):
        n = rng.randint(2, max_order)
        graph = nx.from_prufer_sequence([rng.randrange(n) for _ in range(n - 2)])
        adjacency = [sorted(graph.neighbors(v)) for v in range(n)]
        poly = tree_poly(adjacency)
        failure = two_step_failure(poly)
        if failure is not None:
            return {
                "status": "counterexample",
                "trial": trial,
                "seed": seed,
                "order": n,
                "edges": sorted([sorted(edge) for edge in graph.edges()]),
                "polynomial": poly,
                "failure": failure,
            }
        assert sign_propagation_failure(poly) is None
        for r in range(0, len(poly) - 3):
            left = (r + 3) * poly[r + 3] * poly[r]
            right = ((r + 1) * poly[r + 1] + 2 * poly[r]) * poly[r + 2]
            if right and (
                closest is None
                or left * closest["right"] > closest["left"] * right
            ):
                closest = {
                    "trial": trial,
                    "order": n,
                    "r": r,
                    "left": left,
                    "right": right,
                    "ratio": left / right,
                }
    return {
        "status": "no_failure",
        "trials": trials,
        "max_order": max_order,
        "seed": seed,
        "closest": closest,
    }


def graph_atlas_control() -> dict:
    checked = 0
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() == 0:
            continue
        checked += 1
        poly = graph_poly_bruteforce(graph)
        failure = two_step_failure(poly)
        if failure is not None:
            return {
                "status": "counterexample",
                "graphs_checked": checked,
                "order": graph.number_of_nodes(),
                "edges": sorted([sorted(edge) for edge in graph.edges()]),
                "polynomial": poly,
                "failure": failure,
                "sign_propagation_failure": sign_propagation_failure(poly),
            }
    return {"status": "no_failure", "graphs_checked": checked, "max_order": 7}


def split_graph_negative_control() -> dict:
    # The join of an independent 10-set and a 100-clique has independence
    # polynomial (1+x)^10 + 100x.
    from math import comb

    poly = [comb(10, k) for k in range(11)]
    poly[1] += 100
    failure = two_step_failure(poly)
    sign_failure = sign_propagation_failure(poly)
    assert failure is not None and failure["r"] == 1
    assert sign_failure is not None
    return {
        "graph": "join of an independent 10-set and a 100-clique",
        "polynomial": poly,
        "two_step_failure": failure,
        "sign_propagation_failure": sign_failure,
    }


def bhattacharyya_kahn_bipartite_negative_control() -> dict:
    """A bipartite non-tree control from Bhattacharyya--Kahn.

    For their graph with parameters a=95 and b=151, the independent-set
    counts are

        p_t = (2^t - 1) C(a,t) + C(b,t).

    This example is known to have a nonunimodal independence sequence.  It
    also falsifies 2SB, showing that any proof must use more than
    bipartiteness.
    """
    from math import comb

    a = 95
    b = 151
    poly = [
        ((1 << t) - 1) * comb(a, t) + comb(b, t)
        for t in range(b + 1)
    ]
    failure = two_step_failure(poly)
    sign_failure = sign_propagation_failure(poly)
    assert failure is not None and failure["r"] == 67
    assert sign_failure is not None and sign_failure["k"] == 69
    return {
        "graph": "Bhattacharyya--Kahn bipartite graph",
        "parameters": {"a": a, "b": b},
        "coefficient_formula": "(2^t - 1) C(a,t) + C(b,t)",
        "two_step_failure": failure,
        "sign_propagation_failure": sign_failure,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=18)
    parser.add_argument("--random-trials", type=int, default=5000)
    parser.add_argument("--random-max-order", type=int, default=800)
    parser.add_argument("--seed", type=int, default=2407993)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    result = {
        "definition": "mu[r+2] <= mu[r] + 2",
        "exhaustive_trees": exhaustive_trees(args.max_order),
        "random_trees": random_trees(
            args.random_trials, args.random_max_order, args.seed
        ),
        "arbitrary_graph_atlas_control": graph_atlas_control(),
        "split_graph_negative_control": split_graph_negative_control(),
        "bipartite_negative_control": (
            bhattacharyya_kahn_bipartite_negative_control()
        ),
        "scope_note": "Finite falsification evidence, not a universal proof.",
    }
    rendered = json.dumps(result, indent=2)
    if args.output is not None:
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
