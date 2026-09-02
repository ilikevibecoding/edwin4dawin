#!/usr/bin/env python3
"""Exact diagnostic for a component-only branching-surplus floor.

For each independent four-set S in a tree T, let F_S=T-N[S], let a_S be
its order, and let C_S be its number of nonempty components.  The candidate

    sum_S C_S / sum_S a_S >= 2 e / ((n-2)(n-3))

would imply the desired normalized rank-five V floor without using variance.
This script is diagnostic only.
"""

from __future__ import annotations

import argparse
import itertools
from fractions import Fraction

import networkx as nx


def statistics(tree: nx.Graph, rank: int = 4) -> tuple[int, int]:
    vertices = tuple(tree)
    neighborhoods = {v: frozenset((v, *tree.neighbors(v))) for v in vertices}
    sum_a = 0
    sum_c = 0
    for selected in itertools.combinations(vertices, rank):
        if any(tree.has_edge(u, v) for u, v in itertools.combinations(selected, 2)):
            continue
        removed = frozenset().union(*(neighborhoods[v] for v in selected))
        residual = set(vertices) - removed
        a = len(residual)
        sum_a += a
        if residual:
            sum_c += nx.number_connected_components(tree.subgraph(residual))
    return sum_a, sum_c


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=14)
    args = parser.parse_args()
    checked = 0
    global_nonstar = None
    for n in range(8, args.max_order + 1):
        local = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            sum_a, sum_c = statistics(tree)
            if not sum_a:
                continue
            surplus = sum(
                (tree.degree(v) - 1) * (tree.degree(v) - 2) // 2 for v in tree
            )
            slack = Fraction(sum_c, sum_a) - Fraction(
                2 * surplus, (n - 2) * (n - 3)
            )
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            row = (slack, Fraction(sum_c, sum_a), surplus, index, code)
            if local is None or row < local:
                local = row
            if surplus < (n - 2) * (n - 3) // 2:
                if global_nonstar is None or row < global_nonstar:
                    global_nonstar = row
            checked += 1
            if slack < 0:
                print(f"FAIL n={n} row={row}")
                raise SystemExit(1)
        print(f"n={n} minimum={local}", flush=True)
    print(
        f"PASS_DIAGNOSTIC_COMPONENT_SURPLUS_FLOOR checked={checked:,} "
        f"global_nonstar={global_nonstar}"
    )


if __name__ == "__main__":
    main()
