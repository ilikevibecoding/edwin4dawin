#!/usr/bin/env python3
"""Exact invariant-state probe for q3(F) <= q2(F) over forests.

For ranks two and three the relevant counts of a forest depend only on
(n,m,A,T4), where A=sum_v C(d(v),2) and T4 is the number of connected
three-edge subtrees.  This script generates every attainable aggregate state
from unlabeled tree components through the requested order and checks

    3 i3 s2 - 2 i2 s3 >= 0.

The computation is exhaustive for the stated order but is not an all-order
proof.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx


def choose(n: int, k: int) -> int:
    if k < 0 or n < k:
        return 0
    out = 1
    for j in range(1, k + 1):
        out = out * (n - j + 1) // j
    return out


def tree_state(tree: nx.Graph) -> tuple[int, int, int, int]:
    n = tree.number_of_nodes()
    m = tree.number_of_edges()
    A = sum(choose(tree.degree(v), 2) for v in tree)
    T4 = 0
    edges = list(tree.edges())
    for a in range(len(edges)):
        for b in range(a + 1, len(edges)):
            for c in range(b + 1, len(edges)):
                if len(set(edges[a]) | set(edges[b]) | set(edges[c])) == 4:
                    T4 += 1
    return n, m, A, T4


def counts(state: tuple[int, int, int, int]) -> dict[str, int]:
    n, m, A, T4 = state
    edge_matchings = choose(m, 2) - A
    i2 = choose(n, 2) - m
    i3 = choose(n, 3) - m * (n - 2) + A
    s2 = m * (n - 2) - 2 * A
    s3 = (
        m * choose(n - 2, 2)
        - 2 * (A * (n - 3) + edge_matchings)
        + 3 * T4
    )
    margin = 3 * i3 * s2 - 2 * i2 * s3
    return {"i2": i2, "i3": i3, "s2": s2, "s3": s3, "margin": margin}


def component_states(max_order: int):
    states: list[dict[tuple[int, int, int], str]] = [dict() for _ in range(max_order + 1)]
    states[1][(0, 0, 0)] = "@"
    for n in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(n):
            _, m, A, T4 = tree_state(tree)
            key = (m, A, T4)
            states[n].setdefault(
                key, nx.to_graph6_bytes(tree, header=False).decode().strip()
            )
    return states


def all_forest_states(max_order: int, components):
    # Keep the last component order in the state so each multiset of component
    # orders has a canonical nondecreasing construction.
    layers: list[dict[tuple[int, int, int, int, int], tuple[str, ...]]] = [
        dict() for _ in range(max_order + 1)
    ]
    layers[0][(0, 0, 0, 0, 1)] = ()
    for total in range(max_order + 1):
        for (n, m, A, T4, minimum_order), witness in list(layers[total].items()):
            for order in range(minimum_order, max_order - total + 1):
                for (cm, cA, cT4), graph6 in components[order].items():
                    key = (n + order, m + cm, A + cA, T4 + cT4, order)
                    layers[total + order].setdefault(key, witness + (graph6,))
    return layers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=15)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    components = component_states(args.max_order)
    layers = all_forest_states(args.max_order, components)
    rows = []
    first_negative = None
    for order in range(1, args.max_order + 1):
        collapsed: dict[tuple[int, int, int, int], tuple[str, ...]] = {}
        for (n, m, A, T4, _), witness in layers[order].items():
            collapsed.setdefault((n, m, A, T4), witness)
        minimum = None
        minimum_positive = None
        for state, witness in collapsed.items():
            data = counts(state)
            item = {"state": state, "witness_components_graph6": witness, **data}
            if minimum is None or data["margin"] < minimum[0]:
                minimum = (data["margin"], item)
            if data["margin"] > 0 and (
                minimum_positive is None or data["margin"] < minimum_positive[0]
            ):
                minimum_positive = (data["margin"], item)
            if data["margin"] < 0 and first_negative is None:
                first_negative = item
        rows.append(
            {
                "order": order,
                "component_invariant_states": sum(len(x) for x in components[: order + 1]),
                "construction_states": len(layers[order]),
                "aggregate_states": len(collapsed),
                "minimum": minimum[1],
                "minimum_positive": None if minimum_positive is None else minimum_positive[1],
            }
        )
        print(
            f"n={order} aggregate_states={len(collapsed):,} "
            f"min_margin={minimum[0]} "
            f"min_positive={None if minimum_positive is None else minimum_positive[0]}",
            flush=True,
        )
    report = {
        "schema": "all-forest-q3-q2-invariant-state-probe-v1",
        "max_order": args.max_order,
        "rows": rows,
        "first_negative": first_negative,
        "status": "PASS_EXACT_FINITE_NOT_PROOF" if first_negative is None else "FAIL_COUNTEREXAMPLE",
    }
    if args.out:
        args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
