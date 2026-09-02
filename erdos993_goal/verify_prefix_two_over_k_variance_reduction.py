#!/usr/bin/env python3
"""Exact verification and counterexample for the prefix 2/k target.

This verifies algebra, indexing, the size-biased extension-edge identity,
and small exact graph examples.  It then reconstructs the 25-vertex
T(6,3) tree that disproves the proposed universal inequality.
"""

from __future__ import annotations

from fractions import Fraction
from itertools import combinations

import networkx as nx
import sympy as sp


Polynomial = tuple[int, ...]


def polynomial_add(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * max(len(a), len(b))
    for index, value in enumerate(a):
        out[index] += value
    for index, value in enumerate(b):
        out[index] += value
    return tuple(out)


def polynomial_multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for left_rank, left_value in enumerate(a):
        for right_rank, right_value in enumerate(b):
            out[left_rank + right_rank] += left_value * right_value
    return tuple(out)


def forest_independence_polynomial(graph: nx.Graph) -> Polynomial:
    """Compute a forest polynomial by rooted include/exclude DP."""
    assert nx.is_forest(graph)
    visited: set[int] = set()

    def rooted(vertex: int, parent: int | None) -> tuple[Polynomial, Polynomial]:
        visited.add(vertex)
        excluded: Polynomial = (1,)
        included: Polynomial = (0, 1)
        for child in graph.neighbors(vertex):
            if child == parent:
                continue
            child_excluded, child_included = rooted(child, vertex)
            excluded = polynomial_multiply(
                excluded,
                polynomial_add(child_excluded, child_included),
            )
            included = polynomial_multiply(included, child_excluded)
        return excluded, included

    total: Polynomial = (1,)
    for root in graph.nodes:
        if root in visited:
            continue
        excluded, included = rooted(root, None)
        total = polynomial_multiply(
            total, polynomial_add(excluded, included)
        )
    return total


def independence_polynomial(graph: nx.Graph) -> Polynomial:
    vertices = list(graph.nodes)
    counts = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        chosen = [
            vertices[index]
            for index in range(len(vertices))
            if mask & (1 << index)
        ]
        if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2)):
            counts[len(chosen)] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return tuple(counts)


def independent_sets(graph: nx.Graph, rank: int) -> list[frozenset[int]]:
    vertices = list(graph.nodes)
    return [
        frozenset(chosen)
        for chosen in combinations(vertices, rank)
        if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2))
    ]


def residual_statistics(
    graph: nx.Graph, rank: int
) -> list[tuple[frozenset[int], int, int, frozenset[int]]]:
    out = []
    for chosen in independent_sets(graph, rank):
        closed = set(chosen)
        for vertex in chosen:
            closed.update(graph.neighbors(vertex))
        residual = frozenset(set(graph.nodes) - closed)
        residual_graph = graph.subgraph(residual)
        out.append(
            (
                chosen,
                len(residual),
                residual_graph.number_of_edges(),
                residual,
            )
        )
    return out


def coefficient(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def reserve(poly: Polynomial, rank: int) -> int:
    return (
        rank * coefficient(poly, rank) ** 2
        + coefficient(poly, rank - 1) * coefficient(poly, rank)
        - (rank + 1)
        * coefficient(poly, rank - 1)
        * coefficient(poly, rank + 1)
    )


def verify_graph_rank(graph: nx.Graph, rank: int) -> None:
    """Verify every exact identity at coefficient rank ``rank``."""
    poly = independence_polynomial(graph)
    pm = coefficient(poly, rank - 1)
    p0 = coefficient(poly, rank)
    pp = coefficient(poly, rank + 1)
    assert pm > 0 and p0 > 0

    stats = residual_statistics(graph, rank - 1)
    assert len(stats) == pm
    e_values = [item[1] for item in stats]
    q_values = [item[2] for item in stats]

    mean_e = Fraction(sum(e_values), pm)
    mean_q = Fraction(sum(q_values), pm)
    mean_e2 = Fraction(sum(value * value for value in e_values), pm)
    variance_e = mean_e2 - mean_e * mean_e

    mu_previous = Fraction(rank * p0, pm)
    mu_next = Fraction((rank + 1) * pp, p0)
    sigma = Fraction(reserve(poly, rank), pm * p0)

    assert mean_e == mu_previous
    assert (
        Fraction(
            sum(e * (e - 1) - 2 * q for e, q in zip(e_values, q_values)),
            pm,
        )
        == Fraction(rank * (rank + 1) * pp, pm)
    )
    assert sigma == 1 + mu_previous - mu_next
    assert sigma == 2 + (2 * mean_q - variance_e) / mean_e
    assert (
        Fraction(rank * reserve(poly, rank), pm * pm)
        == 2 * mean_e + 2 * mean_q - variance_e
    )

    # Enumerate the extension-edge experiment literally.
    extension_edges: list[tuple[frozenset[int], int, int, int]] = []
    for chosen, e, _q, residual in stats:
        residual_graph = graph.subgraph(residual)
        for vertex in residual:
            extension_edges.append(
                (chosen, vertex, e, residual_graph.degree(vertex))
            )

    assert len(extension_edges) == rank * p0
    size_biased_e = Fraction(
        sum(item[2] for item in extension_edges), len(extension_edges)
    )
    edge_biased_degree = Fraction(
        sum(item[3] for item in extension_edges), len(extension_edges)
    )
    assert size_biased_e == mean_e2 / mean_e
    assert edge_biased_degree == 2 * mean_q / mean_e

    child_counts: dict[frozenset[int], int] = {}
    child_extension_sum = 0
    for chosen, vertex, e, degree in extension_edges:
        child = chosen | {vertex}
        child_counts[child] = child_counts.get(child, 0) + 1
        child_extension_sum += e - 1 - degree
    assert set(child_counts.values()) == {rank}
    assert set(child_counts) == set(independent_sets(graph, rank))
    assert Fraction(child_extension_sum, len(extension_edges)) == mu_next
    assert (
        mu_next
        == mu_previous
        - 1
        + (variance_e - 2 * mean_q) / mu_previous
    )

    # The four formulations of V2/k have identical truth values.
    coefficient_gap = (
        rank * rank * p0 * p0
        - (rank - 2) * pm * p0
        - rank * (rank + 1) * pm * pp
    )
    statements = [
        rank * sigma >= 2 * (rank - 1),
        sigma >= 2 - Fraction(2, rank),
        mu_next <= mu_previous - 1 + Fraction(2, rank),
        variance_e <= 2 * mean_q + Fraction(2, rank) * mean_e,
        coefficient_gap >= 0,
    ]
    assert len(set(statements)) == 1

    if nx.is_forest(graph):
        assert mean_q <= mean_e
        assert sigma <= 4


def symbolic_checks() -> None:
    k = sp.symbols("k", positive=True, integer=True)
    pm, p0, pp = sp.symbols("p_m p_0 p_p", positive=True)
    mean_q, variance = sp.symbols("qbar variance")

    g = k * p0**2 + pm * p0 - (k + 1) * pm * pp
    sigma = g / (pm * p0)
    mu_previous = k * p0 / pm
    mu_next = (k + 1) * pp / p0
    assert sp.simplify(sigma - (1 + mu_previous - mu_next)) == 0

    coefficient_gap = (
        k**2 * p0**2
        - (k - 2) * pm * p0
        - k * (k + 1) * pm * pp
    )
    assert sp.expand(
        k * g - 2 * (k - 1) * pm * p0 - coefficient_gap
    ) == 0

    second_factorial_moment = k * (k + 1) * pp / pm
    mean_e = mu_previous
    mean_e2 = second_factorial_moment + mean_e + 2 * mean_q
    residual_expression = (
        2 * mean_e
        + 2 * mean_q
        - (mean_e2 - mean_e**2)
    )
    assert sp.simplify(k * g / pm**2 - residual_expression) == 0
    assert sp.simplify(
        sigma
        - (
            2
            + (
                2 * mean_q
                - (mean_e2 - mean_e**2)
            )
            / mean_e
        )
    ) == 0

    # Substitute Var(e) into the size-biased drift identity.
    drift_right = (
        mu_previous - 1 + (variance - 2 * mean_q) / mu_previous
    )
    variance_from_coefficients = mean_e2 - mean_e**2
    assert sp.simplify(
        drift_right.subs(variance, variance_from_coefficients) - mu_next
    ) == 0

    # Rank-one ordered log-concavity is automatic.
    n, m = sp.symbols("n m", nonnegative=True, integer=True)
    p2 = n * (n - 1) / 2 - m
    assert sp.simplify(n**2 - 2 * p2 - (n + 2 * m)) == 0


def main() -> None:
    symbolic_checks()

    checks = 0
    examples = []
    for size in range(2, 13):
        examples.extend(
            [
                nx.path_graph(size),
                nx.star_graph(size - 1),
            ]
        )

    # Add every forest in the NetworkX graph atlas (all have at most
    # seven vertices), including disconnected examples.
    examples.extend(
        graph
        for graph in nx.graph_atlas_g()
        if graph.number_of_nodes() >= 2 and nx.is_forest(graph)
    )

    for graph in examples:
        poly = independence_polynomial(graph)
        alpha = len(poly) - 1
        cutoff = (2 * alpha + 1) // 3
        for rank in range(1, alpha + 1):
            verify_graph_rank(graph, rank)
            checks += 1
            if 2 <= rank < cutoff:
                sigma = Fraction(
                    reserve(poly, rank),
                    coefficient(poly, rank - 1) * coefficient(poly, rank),
                )
                assert rank * sigma >= 2 * (rank - 1)

    # Independently reconstruct the exact counterexample T(6,3).
    counterexample = nx.Graph()
    counterexample.add_node(0)
    next_vertex = 1
    for _ in range(6):
        support = next_vertex
        next_vertex += 1
        counterexample.add_edge(0, support)
        for _ in range(3):
            counterexample.add_edge(support, next_vertex)
            next_vertex += 1

    assert counterexample.number_of_nodes() == 25
    assert counterexample.number_of_edges() == 24
    assert nx.is_tree(counterexample)
    counterexample_poly = forest_independence_polynomial(counterexample)
    assert counterexample_poly == (
        1,
        25,
        276,
        1799,
        7791,
        23934,
        54499,
        95136,
        130803,
        144638,
        130568,
        97080,
        59588,
        30042,
        12273,
        3966,
        975,
        171,
        19,
        1,
    )
    alpha = len(counterexample_poly) - 1
    cutoff = (2 * alpha + 1) // 3
    rank = 11
    assert alpha == 19 and cutoff == 13 and rank < cutoff
    pm = counterexample_poly[rank - 1]
    p0 = counterexample_poly[rank]
    pp = counterexample_poly[rank + 1]
    g = reserve(counterexample_poly, rank)
    v2_left = rank * g
    v2_right = 2 * (rank - 1) * pm * p0
    assert g == 22981900032
    assert v2_left == 252800900352
    assert v2_right == 253510828800
    assert v2_left - v2_right == -709928448
    assert v2_left < v2_right

    ordered_lc_reserve = rank * p0 * p0 - (rank + 1) * pm * pp
    assert ordered_lc_reserve == 10306358592
    assert ordered_lc_reserve > 0
    mode = max(range(len(counterexample_poly)), key=counterexample_poly.__getitem__)
    assert mode == 9
    assert all(
        counterexample_poly[index] <= counterexample_poly[index + 1]
        for index in range(mode)
    )
    assert all(
        counterexample_poly[index] >= counterexample_poly[index + 1]
        for index in range(mode, len(counterexample_poly) - 1)
    )

    print("PASS")
    print("exact graph-rank identity checks:", checks)
    print("all atlas/path/star prefix V2/k checks passed")
    print("T(6,3) prefix V2/k gap:", v2_left - v2_right)
    print("T(6,3) ordered-LC reserve:", ordered_lc_reserve)
    print("status: identities verified; proposed universal inequality is false")


if __name__ == "__main__":
    main()
