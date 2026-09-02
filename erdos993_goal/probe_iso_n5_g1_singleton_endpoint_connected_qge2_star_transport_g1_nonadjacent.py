#!/usr/bin/env python3
"""Finite reconnaissance for extra rooted-star transport beyond q=1."""
from __future__ import annotations

import networkx as nx
from functools import cache

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent import at


def conv(left, right, maximum=5):
    return tuple(sum(at(left, j) * at(right, k - j) for j in range(k + 1)) for k in range(maximum + 1))


def binomial_row(d, maximum=5):
    from math import comb
    return tuple(comb(d, k) if k <= d else 0 for k in range(maximum + 1))


def star_row(d):
    row = list(binomial_row(d))
    row[1] += 1
    return tuple(row)


@cache
def star_system(degrees):
    P = H = (1, 0, 0, 0, 0, 0)
    for degree in degrees:
        P = conv(P, star_row(degree))
        H = conv(H, binomial_row(degree))
    return P, H


def delete_row(graph, vertices):
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    row = poly_forest(reduced)
    return tuple(at(row, k) for k in range(6))


def value(base, degrees):
    A, B, C, D = base
    P, H = star_system(degrees)
    U, W, QE, QV = conv(A, P), conv(B, P), conv(C, H), conv(D, H)
    n4 = (
        2 * U[2] * W[2] - U[2] * W[3] - 5 * U[2] * W[4]
        + 2 * U[3] * W[1] + 2 * U[3] * W[2] + 3 * U[3] * W[3]
        - U[4] * W[1] + 3 * U[4] * W[2] - 5 * U[5] * W[1]
        - W[1] * W[4] + W[2] * W[3]
    )
    block1 = QE[2] * W[3] - 2 * QE[3] * W[2] + QE[4] * W[1]
    block2 = U[2] * QV[3] - 2 * U[3] * QV[2] + U[4] * QV[1]
    return n4 + block1 + block2


def main():
    cells = single_checks = merge_checks = terminal_checks = 0
    minima = {"single": None, "merge_gap": None, "terminal": None, "split": None}
    maxima = {"merge_gap": None}
    witnesses = {}
    for n in range(2, 11):
        order_cells = 0
        for forest_index, graph in enumerate(forest_graphs(n)):
            graph = nx.convert_node_labels_to_integers(graph)
            A = delete_row(graph, ())
            one = {u: delete_row(graph, (u,)) for u in graph}
            components = {
                u: index for index, comp in enumerate(nx.connected_components(graph)) for u in comp
            }
            for r in graph:
                for v in graph:
                    if r == v or components[r] != components[v]:
                        continue
                    base = (A, one[v], one[r], delete_row(graph, (r, v)))
                    cells += 1
                    order_cells += 1
                    for d in range(0, 11):
                        got = value(base, (d,))
                        single_checks += 1
                        if minima["single"] is None or got < minima["single"]:
                            minima["single"] = got
                            witnesses["single"] = (n, forest_index, r, v, d, got)
                        if got < 0:
                            raise AssertionError(("single", n, forest_index, r, v, d, got))
                    for a in range(1, 7):
                        for b in range(1, 7):
                            gap = value(base, (a, b)) - value(base, (a + b, 0))
                            merge_checks += 1
                            if minima["merge_gap"] is None or gap < minima["merge_gap"]:
                                minima["merge_gap"] = gap
                                witnesses["merge_gap"] = (n, forest_index, r, v, a, b, gap)
                            if maxima["merge_gap"] is None or gap > maxima["merge_gap"]:
                                maxima["merge_gap"] = gap
                                witnesses["merge_gap_max"] = (n, forest_index, r, v, a, b, gap)
                    for k in range(0, 11):
                        for d in range(0, 11):
                            got = value(base, (d, *([0] * k)))
                            terminal_checks += 1
                            if minima["terminal"] is None or got < minima["terminal"]:
                                minima["terminal"] = got
                                witnesses["terminal"] = (n, forest_index, r, v, k, d, got)
                            if got < 0:
                                raise AssertionError(("terminal", n, forest_index, r, v, k, d, got))
                            split = value(base, (*([1] * d), *([0] * k)))
                            if minima["split"] is None or split < minima["split"]:
                                minima["split"] = split
                                witnesses["split"] = (n, forest_index, r, v, k, d, split)
                            if split < 0:
                                raise AssertionError(("split", n, forest_index, r, v, k, d, split))
        print("ORDER", n, order_cells, minima, flush=True)
    print({
        "cells": cells,
        "single_checks": single_checks,
        "merge_checks": merge_checks,
        "terminal_checks": terminal_checks,
        "minima": minima,
        "maxima": maxima,
        "witnesses": witnesses,
    })


if __name__ == "__main__":
    main()
