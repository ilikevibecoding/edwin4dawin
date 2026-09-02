#!/usr/bin/env python3
"""Test whether deleting a bridge can only increase the quarter reserve."""

import argparse
from functools import lru_cache

import networkx as nx

from scan_rank4_leaf_curvature_fast import add, mul, shift


LIMIT = 5


def sub(a, b):
    return tuple(
        (a[k] if k < len(a) else 0) - (b[k] if k < len(b) else 0)
        for k in range(LIMIT + 1)
    )


def padded(a):
    return tuple(a[k] if k < len(a) else 0 for k in range(LIMIT + 1))


def shift2(a):
    return (0, 0) + a[: LIMIT - 1]


def selected_base(excluded, total):
    """Return the polynomial left after removing the selected root x."""
    difference = sub(total, excluded)
    assert difference[0] == 0
    return tuple(difference[k + 1] for k in range(LIMIT))


def margin4(poly):
    p = list(poly) + [0] * (6 - len(poly))
    return 32 * p[4] * p[4] - 5 * p[3] * p[4] - 40 * p[3] * p[5]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    args = parser.parse_args()
    global_minimum = None
    witness = None
    checked = 0
    negative = 0
    for order in range(2, args.max_order + 1):
        order_minimum = None
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            @lru_cache(maxsize=None)
            def message(u, parent):
                excluded = (1,)
                included_base = (1,)
                for v in tree[u]:
                    if v == parent:
                        continue
                    child_excluded, child_total = message(v, u)
                    excluded = mul(excluded, child_total)
                    included_base = mul(included_base, child_excluded)
                return excluded, add(excluded, shift(included_base))

            whole = message(0, -1)[1]
            whole_margin = margin4(whole)
            for u, v in tree.edges():
                au, at = message(u, v)
                bv, bt = message(v, u)
                ai = selected_base(au, at)
                bi = selected_base(bv, bt)
                forest = mul(at, bt)
                assert sub(forest, shift2(mul(ai, bi))) == padded(whole)
                difference = margin4(forest) - whole_margin
                checked += 1
                if order_minimum is None or difference < order_minimum:
                    order_minimum = difference
                if global_minimum is None or difference < global_minimum:
                    global_minimum = difference
                    witness = (order, tree_index, u, v, whole, forest)
                if difference < 0:
                    negative += 1
        print(order, order_minimum, flush=True)
    print("CHECKED", checked, "NEGATIVE", negative, flush=True)
    print("GLOBAL", global_minimum, witness, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
