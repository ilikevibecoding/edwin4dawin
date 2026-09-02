#!/usr/bin/env python3
"""Falsify candidate parity cross-relations for rooted tree updates.

For a rooted tree, write

    E = P(x^2) + x Q(x^2),   J = R(x^2) + x S(x^2),
    I = E + x J = (P + x^2 S) + x(Q + R).

The proved TS condition is Q <=_r P and S <=_r R in the ratio-dominance
order.  If the two cross-relations R <=_r P and S <=_r Q also held, the
ratio-dominance sum theorem would give Q+R <=_r P+x^2S, hence TS for I.

This script searches exact rooted trees for failures of those cross-relations.
It is a falsification tool, not a proof.
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


def parity(poly: list[int]) -> tuple[list[int], list[int]]:
    return poly[0::2], poly[1::2]


def ratio_dominance_failure(
    lower: list[int], upper: list[int]
) -> dict[str, int | str] | None:
    """Return a positive-support failure of lower <=_r upper.

    The two required inequalities at index k are

        upper[k+1]/upper[k] <= lower[k]/lower[k-1]
        lower[k]/lower[k-1] <= upper[k]/upper[k-1].

    Independence-polynomial parity parts are positive on their support.
    Boundary support compatibility is recorded separately.
    """

    if not lower or not upper:
        return None
    if len(lower) > len(upper) + 1 or len(upper) > len(lower) + 1:
        return {
            "kind": "support",
            "lower_length": len(lower),
            "upper_length": len(upper),
        }
    for k in range(1, len(lower)):
        if k < len(upper) and lower[k] * upper[k - 1] > upper[k] * lower[k - 1]:
            return {
                "kind": "upper",
                "k": k,
                "left": lower[k] * upper[k - 1],
                "right": upper[k] * lower[k - 1],
            }
        if k + 1 < len(upper) and upper[k + 1] * lower[k - 1] > lower[k] * upper[k]:
            return {
                "kind": "lower",
                "k": k,
                "left": upper[k + 1] * lower[k - 1],
                "right": lower[k] * upper[k],
            }
    return None


def check_root(adjacency: list[list[int]], root: int) -> dict | None:
    e, j = rooted_pair(adjacency, root)
    p, q = parity(e)
    r, s = parity(j)
    relations = {
        "Q<=P (E has TS)": (q, p),
        "S<=R (J has TS)": (s, r),
        "R<=P (even cross)": (r, p),
        "S<=Q (odd cross)": (s, q),
    }
    for name, (lower, upper) in relations.items():
        failure = ratio_dominance_failure(lower, upper)
        if failure is not None:
            return {
                "relation": name,
                "failure": failure,
                "root": root,
                "order": len(adjacency),
                "E": e,
                "J": j,
                "parts": {"P": p, "Q": q, "R": r, "S": s},
            }
    return None


def exhaustive(max_order: int) -> dict:
    trees = 0
    rootings = 0
    for n in range(1, max_order + 1):
        generator = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for graph in generator:
            trees += 1
            adjacency = [sorted(graph.neighbors(v)) for v in range(n)]
            for root in range(n):
                rootings += 1
                failure = check_root(adjacency, root)
                if failure is not None:
                    failure["edges"] = sorted(
                        [u, v]
                        for u in range(n)
                        for v in adjacency[u]
                        if u < v
                    )
                    return {
                        "status": "counterexample",
                        "trees_checked": trees,
                        "rootings_checked": rootings,
                        "witness": failure,
                    }
    return {
        "status": "no_failure",
        "max_order": max_order,
        "trees_checked": trees,
        "rootings_checked": rootings,
    }


def random_search(trials: int, max_order: int, seed: int) -> dict:
    rng = random.Random(seed)
    for trial in range(1, trials + 1):
        n = rng.randint(2, max_order)
        graph = nx.from_prufer_sequence([rng.randrange(n) for _ in range(n - 2)])
        adjacency = [sorted(graph.neighbors(v)) for v in range(n)]
        root = rng.randrange(n)
        failure = check_root(adjacency, root)
        if failure is not None:
            failure["edges"] = sorted(
                [u, v]
                for u in range(n)
                for v in adjacency[u]
                if u < v
            )
            return {
                "status": "counterexample",
                "trial": trial,
                "seed": seed,
                "witness": failure,
            }
    return {
        "status": "no_failure",
        "trials": trials,
        "max_order": max_order,
        "seed": seed,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--random-trials", type=int, default=0)
    parser.add_argument("--random-max-order", type=int, default=300)
    parser.add_argument("--seed", type=int, default=2407993)
    args = parser.parse_args()

    result = {"exhaustive": exhaustive(args.max_order)}
    if args.random_trials:
        result["random"] = random_search(
            args.random_trials, args.random_max_order, args.seed
        )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
