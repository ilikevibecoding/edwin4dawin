#!/usr/bin/env python3
"""Discovery-only random search on actual singleton root-deletion pairs."""

import argparse
import random

import networkx as nx

from probe_iso_n5_g2_singleton_l_random_pairs_rank5_g2_alt import (
    four_rows_fast, l_value, random_forest,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100000)
    parser.add_argument("--maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    minima = {}; witnesses = {}
    for trial in range(args.trials):
        n = rng.randint(3, args.maximum_order)
        graph = random_forest(n, rng)
        u, v, parent = rng.sample(list(graph), 3)
        f = graph.copy(); f.remove_node(parent)
        h = graph.copy(); h.remove_nodes_from([parent, *list(graph.neighbors(parent))])
        drows = four_rows_fast(f, u, v); erows = four_rows_fast(h, u, v)
        survive = int(u in h) + int(v in h)
        adjacent = int(u in f and v in f and f.has_edge(u, v))
        key = (survive, adjacent)
        value = l_value(drows, erows)
        if key not in minima or value < minima[key]:
            minima[key] = value
            witnesses[key] = (trial, n, value, len(f) - len(h),
                              nx.to_graph6_bytes(graph, header=False).decode().strip(),
                              (u, v, parent))
        if value < 0:
            print("NEGATIVE", key, witnesses[key])
            return
    print("NO_NEGATIVE", args.trials, "minima", minima, "witnesses", witnesses)


if __name__ == "__main__":
    main()
