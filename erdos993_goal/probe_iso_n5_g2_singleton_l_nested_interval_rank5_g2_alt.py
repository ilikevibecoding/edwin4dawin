#!/usr/bin/env python3
"""Discovery-only coefficient-interval relaxation for the mixed singleton term."""

import argparse
import math
import random

import networkx as nx

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import numeric_g1_g2
from probe_iso_n5_g2_singleton_l_random_pairs_rank5_g2_alt import (
    ZERO, add, four_rows_fast, l_value, random_forest, shifted,
)


def convolve_edgeless(row, count):
    return tuple(sum(math.comb(count, j) * row[k - j]
                     for j in range(min(k, count) + 1)) for k in range(7))


def minimum_box(erows, added):
    # L is exactly linear in every D coordinate.  Fix d0=1 and d1=e1+added;
    # choose every higher coefficient independently in [e_k,((1+x)^added E)_k].
    drows = []
    choices = []
    for row_index, erow in enumerate(erows):
        upper = convolve_edgeless(erow, added)
        drow = [1, erow[1] + added] + list(erow[2:])
        for rank in range(2, 7):
            basis = [[0] * 7 for _ in range(4)]
            basis[row_index][rank] = 1
            coefficient = l_value(tuple(tuple(x) for x in basis), erows)
            if coefficient < 0:
                drow[rank] = upper[rank]
                choices.append((row_index, rank, "upper", coefficient))
            else:
                choices.append((row_index, rank, "lower", coefficient))
        drows.append(tuple(drow))
    return l_value(tuple(drows), erows), tuple(drows), choices


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=10000)
    parser.add_argument("--maximum-order", type=int, default=50)
    parser.add_argument("--maximum-added", type=int, default=30)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    minimum = None; witness = None
    for trial in range(args.trials):
        n = rng.randint(2, args.maximum_order)
        added = rng.randint(1, args.maximum_added)
        graph = random_forest(n, rng)
        u, v = rng.sample(list(graph), 2)
        erows = four_rows_fast(graph, u, v)
        value, drows, choices = minimum_box(erows, added)
        if minimum is None or value < minimum:
            minimum = value
            witness = (trial, n, added, value, nx.to_graph6_bytes(graph, header=False).decode().strip(), (u, v), drows, choices)
        if value < 0:
            print("NEGATIVE", witness)
            return
    print("NO_NEGATIVE", args.trials, "minimum", minimum, "witness", witness)


if __name__ == "__main__":
    main()
