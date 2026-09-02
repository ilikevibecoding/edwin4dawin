#!/usr/bin/env python3
"""Enumerate distinct truncated rooted-tree polynomial states exactly.

For a rooted tree H, store

    A = I(H),  E = I(H-root)

through rank five.  If the root has a multiset of rooted child states,

    E = product(A_child),
    A = E + x product(E_child).

The dynamic program enumerates distinct numerical (A,E) pairs rather
than rooted isomorphism types.  It therefore can collapse many trees
while remaining an exact finite certificate.
"""

from __future__ import annotations

import argparse
from collections import defaultdict


CUTOFF = 5
ONE = (1,) + (0,) * CUTOFF


def multiply(left, right):
    out = [0] * (CUTOFF + 1)
    for i, a in enumerate(left):
        if not a:
            continue
        for j, b in enumerate(right):
            if i + j > CUTOFF:
                break
            if b:
                out[i + j] += a * b
    return tuple(out)


def root_from_forest(product_total, product_excluded):
    total = list(product_total)
    for rank in range(1, CUTOFF + 1):
        total[rank] += product_excluded[rank - 1]
    return tuple(total), product_total


def coefficient(poly, rank):
    return poly[rank]


def leaf_strong_margin(rooted_state):
    total, excluded = rooted_state
    h, k = coefficient(total, 4), coefficient(total, 5)
    x, y = coefficient(excluded, 3), coefficient(excluded, 4)
    d, e = h + x, k + y
    return d * (2 * e + d) - 24 * (e * h - d * k)


def enumerate_states(maximum_root_order):
    # A forest product state is (product child totals,
    # product child exclusions).
    forest_products = [set() for _ in range(maximum_root_order)]
    forest_products[0].add((ONE, ONE))
    rooted_by_order = [set() for _ in range(maximum_root_order + 1)]
    all_rooted = set()

    for order in range(1, maximum_root_order + 1):
        new_states = {
            root_from_forest(product_total, product_excluded)
            for product_total, product_excluded
            in forest_products[order - 1]
        }
        new_states.difference_update(all_rooted)
        rooted_by_order[order].update(new_states)
        all_rooted.update(new_states)

        # Add each new numerical child type to the unbounded multiset
        # product DP.  Ascending weights permits repeated copies.
        for state in sorted(new_states):
            total, excluded = state
            for weight in range(
                order,
                maximum_root_order,
            ):
                additions = {
                    (
                        multiply(product_total, total),
                        multiply(product_excluded, excluded),
                    )
                    for product_total, product_excluded
                    in forest_products[weight - order]
                }
                forest_products[weight].update(additions)

        minimum = min(
            (leaf_strong_margin(state), state)
            for state in rooted_by_order[order]
        )
        next_count = (
            f"{len(forest_products[order]):,}"
            if order < maximum_root_order
            else "not-built"
        )
        print(
            f"root_order={order} rooted_states="
            f"{len(rooted_by_order[order]):,} "
            f"forest_products_next={next_count} "
            f"leaf_order={order + 1} min_strong={minimum[0]}",
            flush=True,
        )
    return rooted_by_order, forest_products


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-root-order", type=int, default=25)
    args = parser.parse_args()
    enumerate_states(args.maximum_root_order)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
