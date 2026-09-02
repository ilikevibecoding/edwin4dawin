#!/usr/bin/env python3
"""Discovery-only random search for negative mixed singleton increments."""

import argparse
import random

import networkx as nx

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import numeric_g1_g2
from probe_iso_leaf_cross_remainder_root import poly_forest


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def shifted(rows):
    return tuple(tuple(at(row, rank - 1) for rank in range(7)) for row in rows)


def shifted_by(rows, amount):
    return tuple(tuple(at(row, rank - amount) for rank in range(7)) for row in rows)


def add(left, right):
    return tuple(tuple(x + y for x, y in zip(a, b)) for a, b in zip(left, right))


ZERO = tuple((0,) * 7 for _ in range(4))


def four_rows_fast(graph, u, v):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(x for x in removed if x in reduced)
        row = tuple(poly_forest(reduced))
        rows.append(tuple(at(row, rank) for rank in range(7)))
    return tuple(rows)


def l_value(drows, erows):
    se = shifted(erows)
    return int(numeric_g1_g2(add(drows, se), drows)[1]
               - numeric_g1_g2(drows, drows)[1]
               - numeric_g1_g2(se, ZERO)[1])


def random_forest(order, rng):
    graph = nx.random_labeled_tree(order, seed=rng.randrange(1 << 30)) if order > 1 else nx.empty_graph(order)
    for edge in list(graph.edges):
        if rng.random() < 0.35:
            graph.remove_edge(*edge)
    return graph


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100000)
    parser.add_argument("--maximum-order", type=int, default=40)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--d-shift", type=int, default=0)
    parser.add_argument("--diagonal", action="store_true")
    args = parser.parse_args()
    rng = random.Random(args.seed)
    minimum = None
    witness = None
    for trial in range(args.trials):
        nd = rng.randint(2, args.maximum_order)
        ne = nd if args.diagonal else rng.randint(2, nd)
        dg = random_forest(nd, rng); eg = dg if args.diagonal else random_forest(ne, rng)
        du, dv = rng.sample(list(dg), 2)
        eu, ev = (du, dv) if args.diagonal else rng.sample(list(eg), 2)
        drows = shifted_by(four_rows_fast(dg, du, dv), args.d_shift)
        value = l_value(drows, four_rows_fast(eg, eu, ev))
        if minimum is None or value < minimum:
            minimum = value
            witness = (trial, nd, ne, value, nx.to_graph6_bytes(dg, header=False).decode().strip(),
                       (du, dv), nx.to_graph6_bytes(eg, header=False).decode().strip(), (eu, ev))
        if value < 0:
            print("NEGATIVE", witness)
            return
    print("NO_NEGATIVE", args.trials, "minimum", minimum, "witness", witness)


if __name__ == "__main__":
    main()
