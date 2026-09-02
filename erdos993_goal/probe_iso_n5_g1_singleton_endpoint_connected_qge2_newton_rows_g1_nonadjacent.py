#!/usr/bin/env python3
"""Exact Newton-row front end for extra rooted stars in the connected face."""
from __future__ import annotations

import sympy as sp
import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs

from prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent import (
    at,
    residual,
)


ONE = (1, 0, 0, 0, 0, 0)
XX = (0, 1, 0, 0, 0, 0)


def add(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def conv(left, right):
    return tuple(sp.expand(sum(at(left, j) * at(right, k - j) for j in range(k + 1))) for k in range(6))


def isolate(count):
    return tuple(sp.expand_func(sp.binomial(count, k)) for k in range(6))


def newton(expression, variable):
    degree = sp.degree(expression, variable)
    rows = [sp.expand(sum(
        (-1) ** (rank - j) * sp.binomial(rank, j) * expression.subs(variable, j)
        for j in range(rank + 1)
    )) for rank in range(degree + 1)]
    assert sp.expand(expression - sp.expand_func(sum(
        sp.binomial(variable, rank) * row for rank, row in enumerate(rows)
    ))) == 0
    return rows


def active_rows(active_count):
    K = sp.symbols("inactive_zero_degree_stars_K", nonnegative=True, integer=True)
    degrees = sp.symbols(f"active_star_degree_0:{active_count}", nonnegative=True, integer=True)
    A = (1, *sp.symbols("a1:6"))
    B = (1, *sp.symbols("b1:6"))
    C = (1, *sp.symbols("c1:6"))
    D = (1, *sp.symbols("d1:6"))
    P, H = isolate(K), ONE
    for degree in degrees:
        lower = isolate(degree)
        P, H = conv(P, add(lower, XX)), conv(H, lower)
    expression = residual(conv(A, P), conv(B, P), conv(C, H), conv(D, H))
    assert sp.Poly(expression, K, *degrees).total_degree() <= 5

    records = [((), expression)]
    for degree in degrees:
        records = [
            (index + (rank,), row)
            for index, value in records
            for rank, row in enumerate(newton(value, degree))
            if rank >= 1 and row != 0
        ]
    records = [
        (index + (rank,), row)
        for index, value in records
        for rank, row in enumerate(newton(value, K))
        if row != 0
    ]
    return (A, B, C, D), [(index, sp.expand(row)) for index, row in records]


def collect_rows():
    unique = {}
    total = 0
    for active_count in range(6):
        base, records = active_rows(active_count)
        before = len(unique)
        for index, row in records:
            unique.setdefault(row, (active_count, index))
        total += len(records)
        print("ACTIVE", active_count, "rows", len(records), "new", len(unique) - before, "unique", len(unique), flush=True)
    return base, unique, total


def delete_row(graph, vertices):
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    row = poly_forest(reduced)
    return tuple(at(row, rank) for rank in range(6))


def finite_certificate(base, unique):
    variables = tuple(symbol for row in base for symbol in row[1:])
    rows = list(unique)
    evaluator = sp.lambdify(variables, rows, modules="math", cse=True)
    minima = [None] * len(rows)
    witnesses = [None] * len(rows)
    negatives = [0] * len(rows)
    cells = 0
    for n in range(2, 13):
        order_cells = 0
        for forest_index, graph in enumerate(forest_graphs(n)):
            graph = nx.convert_node_labels_to_integers(graph)
            A = delete_row(graph, ())
            one = {vertex: delete_row(graph, (vertex,)) for vertex in graph}
            pair = {
                (left, right): delete_row(graph, (left, right))
                for left in graph for right in graph if left < right
            }
            component = {
                vertex: index
                for index, members in enumerate(nx.connected_components(graph))
                for vertex in members
            }
            for r in graph:
                for v in graph:
                    if r == v or component[r] != component[v]:
                        continue
                    square = (A, one[v], one[r], pair[tuple(sorted((r, v)))])
                    args = tuple(value for row in square for value in row[1:])
                    values = tuple(int(value) for value in evaluator(*args))
                    for index, value in enumerate(values):
                        if minima[index] is None or value < minima[index]:
                            minima[index] = value
                            witnesses[index] = (n, forest_index, r, v, value)
                        negatives[index] += int(value < 0)
                    cells += 1
                    order_cells += 1
        print("FINITE", n, order_cells, min(minima), sum(negatives), flush=True)
    bad = [
        {"row": index, "origin": unique[row], "minimum": minima[index],
         "negative_cells": negatives[index], "witness": witnesses[index]}
        for index, row in enumerate(rows) if negatives[index]
    ]
    return {"cells": cells, "row_checks": cells * len(rows), "bad_rows": bad,
            "global_minimum": min(minima), "row_minima": minima}


def main():
    base, unique, total = collect_rows()
    variables = tuple(symbol for row in base for symbol in row[1:])
    term_counts = [len(sp.Poly(row, *variables).terms()) for row in unique]
    print("TOTAL", total, "UNIQUE", len(unique), "TERMS", min(term_counts), max(term_counts), sum(term_counts))
    for index, (row, origin) in enumerate(unique.items()):
        coefficients = sp.Poly(row, *variables).coeffs()
        if all(value >= 0 for value in coefficients):
            kind = "coefficientwise_positive"
        else:
            kind = "rooted_geometry_needed"
        print("ROW", index, origin, len(coefficients), kind)
    print("FINITE_RESULT", finite_certificate(base, unique))


if __name__ == "__main__":
    main()
