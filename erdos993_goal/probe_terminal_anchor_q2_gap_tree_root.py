#!/usr/bin/env python3
"""Exact diagnostic for the q2-mediated terminal-anchor gap on trees."""

from math import comb
import networkx as nx


def coordinates(tree, w, t):
    n = len(tree)
    m = tree.number_of_edges()
    A = sum(comb(tree.degree(v), 2) for v in tree)
    d = tree.degree(w)
    R = sum(tree.degree(u) - 1 for u in tree.neighbors(w))
    i2q = comb(n + t, 2) - m
    s2q = m * (n + t - 2) - 2 * A
    f2 = comb(n - 1, 2) - (m - d)
    AF = A - comb(d, 2) - R
    z2 = (m - d) * (n - 3) - 2 * AF
    h2 = comb(n - d - 1, 2) - (m - d - R)
    c1 = z2 + h2 + t * f2
    return 2 * i2q * c1 - 3 * f2 * s2q, f2, z2, h2, i2q, s2q


def gap(tree, w, t):
    return coordinates(tree, w, t)[0]


def main():
    total = 0
    negatives = []
    coefficient_negatives = [0, 0, 0, 0]
    minima = [None] * 4
    half_reserve_failures = []
    for n in range(2, 16):
        for idx, tree in enumerate(nx.nonisomorphic_trees(n)):
            for w in tree:
                vals = [gap(tree, w, t) for t in range(1, 5)]
                _, f2, z2, h2, _, _ = coordinates(tree, w, 1)
                if 2 * (z2 + h2) < f2:
                    half_reserve_failures.append((n, idx, w, f2, z2, h2,
                                                  nx.to_graph6_bytes(tree, header=False).decode().strip()))
                # forward-difference Newton coefficients at t=1
                coeff = [vals[0]]
                row = vals
                for _ in range(3):
                    row = [row[k + 1] - row[k] for k in range(len(row) - 1)]
                    coeff.append(row[0])
                total += 1
                for k, value in enumerate(coeff):
                    if minima[k] is None or value < minima[k][0]:
                        minima[k] = (value, n, idx, w, vals, coeff,
                                     nx.to_graph6_bytes(tree, header=False).decode().strip())
                    if value < 0:
                        coefficient_negatives[k] += 1
                if vals[0] < 0:
                    negatives.append(minima[0] if minima[0][0] == vals[0] else
                                     (vals[0], n, idx, w, vals, coeff,
                                      nx.to_graph6_bytes(tree, header=False).decode().strip()))
    print("cells", total)
    print("coefficient_negatives", coefficient_negatives)
    print("minima", minima)
    print("negative_t1_count", len(negatives))
    print("negative_t1_first", negatives[:20])
    print("half_reserve_failure_count", len(half_reserve_failures))
    print("half_reserve_failure_first", half_reserve_failures[:50])


if __name__ == "__main__":
    main()
