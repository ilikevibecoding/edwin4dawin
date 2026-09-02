#!/usr/bin/env python3
"""Probe ordinary s-coefficient positivity after adjoining 1+s isolates."""

from __future__ import annotations

from fractions import Fraction
from itertools import combinations
from math import comb
import random

import networkx as nx


Poly = list[Fraction]


def add(a: Poly, b: Poly) -> Poly:
    out = [Fraction(0)] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return out


def scale(a: Poly, multiplier: int | Fraction) -> Poly:
    return [multiplier * value for value in a]


def multiply(a: Poly, b: Poly) -> Poly:
    out = [Fraction(0)] * (len(a) + len(b) - 1)
    for i, left in enumerate(a):
        for j, right in enumerate(b):
            out[i + j] += left * right
    return out


def shifted_binomials(maximum: int) -> list[Poly]:
    # C(1+s,q)=C(1+s,q-1)*(s+2-q)/q.
    out: list[Poly] = [[Fraction(1)]]
    for q in range(1, maximum + 1):
        out.append(scale(multiply(out[-1], [Fraction(2 - q), Fraction(1)]), Fraction(1, q)))
    return out


def independence_row(graph: nx.Graph) -> list[int]:
    vertices = list(graph)
    row = [0] * (len(vertices) + 1)
    for rank in range(len(vertices) + 1):
        for chosen in combinations(vertices, rank):
            if graph.subgraph(chosen).number_of_edges() == 0:
                row[rank] += 1
    return row


def check(graph: nx.Graph) -> tuple[int, int, Fraction] | None:
    row = independence_row(graph)
    alpha = max(index for index, value in enumerate(row) if value)
    binomials = shifted_binomials(alpha + 1)
    for rank in range(alpha + 2):
        polynomial: Poly = [Fraction(0)]
        for isolates in range(rank + 1):
            source = rank - isolates
            if source < len(row):
                polynomial = add(polynomial, scale(binomials[isolates], row[source]))
        for power, value in enumerate(polynomial):
            if value < 0:
                return rank, power, value
    return None


def main() -> None:
    checks = 0
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() > 7 or not nx.is_bipartite(graph):
            continue
        failure = check(graph)
        checks += 1
        if failure:
            print("ATLAS_FAILURE", nx.to_graph6_bytes(graph, header=False).decode().strip(), failure)
            return
    print(f"atlas_bipartite_graphs={checks:,}: no failure", flush=True)

    half_independence_checks = 0
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() > 7:
            continue
        row = independence_row(graph)
        alpha = max(index for index, value in enumerate(row) if value)
        if 2 * alpha < graph.number_of_nodes():
            continue
        failure = check(graph)
        half_independence_checks += 1
        if failure:
            print(
                "HALF_INDEPENDENCE_ATLAS_FAILURE",
                nx.to_graph6_bytes(graph, header=False).decode().strip(),
                graph.number_of_nodes(),
                alpha,
                row,
                failure,
                flush=True,
            )
            return
    print(
        f"atlas_graphs_with_2alpha>=n={half_independence_checks:,}: no failure",
        flush=True,
    )

    for left in range(1, 21):
        for right in range(1, 21):
            graph = nx.complete_bipartite_graph(left, right)
            failure = None
            row = [1] + [comb(left, k) + comb(right, k) for k in range(1, max(left, right) + 1)]
            alpha = max(left, right)
            bins = shifted_binomials(alpha + 1)
            for rank in range(alpha + 2):
                polynomial: Poly = [Fraction(0)]
                for isolates in range(rank + 1):
                    source = rank - isolates
                    if source < len(row):
                        polynomial = add(polynomial, scale(bins[isolates], row[source]))
                if any(value < 0 for value in polynomial):
                    failure = (rank, next(i for i, value in enumerate(polynomial) if value < 0), min(polynomial))
                    break
            if failure:
                print("COMPLETE_BIPARTITE_FAILURE", left, right, failure)
                return
    print("complete_bipartite_a_b<=20: no failure", flush=True)

    generator = random.Random(993)
    for order in range(8, 15):
        left = order // 2
        right = order - left
        for sample in range(100):
            graph = nx.Graph()
            graph.add_nodes_from(range(order))
            for u in range(left):
                for v in range(left, order):
                    if generator.random() < 0.45:
                        graph.add_edge(u, v)
            failure = check(graph)
            if failure:
                print(
                    "RANDOM_BIPARTITE_FAILURE",
                    order,
                    sample,
                    nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    failure,
                )
                return
    print("random_bipartite_samples=700: no failure", flush=True)


if __name__ == "__main__":
    main()
