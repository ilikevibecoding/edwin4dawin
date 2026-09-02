#!/usr/bin/env python3
"""Independent symbolic and finite checks of the leaf-compensation note."""

from __future__ import annotations

import math
from fractions import Fraction

import networkx as nx
import sympy as sp

from verify_rank3_leaf_curvature_certificate import independence_polynomial


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return out


def forest_polynomial(graph: nx.Graph) -> list[int]:
    out = [1]
    for vertices in nx.connected_components(graph):
        component = nx.convert_node_labels_to_integers(graph.subgraph(vertices))
        out = multiply(out, independence_polynomial(component))
    return out


def curvature(poly: list[int], k: int) -> int:
    def h(j: int) -> int:
        if not 0 <= j < len(poly):
            return 0
        return math.factorial(j) * poly[j]

    return h(k) * h(k) - h(k - 1) * h(k + 1)


def check_symbolic_identity() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    am, a, ap, bmm, bm, b = sp.symbols(
        "a_minus a a_plus b_minusminus b_minus b",
        positive=True,
    )
    raw_delta = (
        2 * a * bm
        + bm**2
        - (k + 1) / k * (am * b + ap * bmm + bmm * b)
    )
    m_minus = 1 + bmm / am
    m_here = 1 + bm / a
    m_plus = 1 + b / ap
    rho = (k + 1) * am * ap / (k * a**2)
    normalized = (
        m_here**2
        - 1
        - rho * (m_minus * m_plus - 1)
    )
    assert sp.simplify(normalized - raw_delta / a**2) == 0
    split = (
        m_here**2
        - m_minus * m_plus
        + (1 - rho) * (m_minus * m_plus - 1)
    )
    assert sp.simplify(normalized - split) == 0


def residual_stats(
    graph: nx.Graph, chosen: frozenset[int]
) -> tuple[int, int]:
    closed = set(chosen)
    for vertex in chosen:
        closed.update(graph[vertex])
    residual = set(graph) - closed
    return len(residual), graph.subgraph(residual).number_of_edges()


def independent_sets(graph: nx.Graph, size: int) -> list[frozenset[int]]:
    from itertools import combinations

    return [
        frozenset(chosen)
        for chosen in combinations(graph, size)
        if all(not graph.has_edge(u, v) for u, v in combinations(chosen, 2))
    ]


def check_finite_leaf_and_mixture() -> None:
    old_tree = nx.path_graph(5)
    attachment = 1
    deletion_graph = old_tree.copy()
    deletion_graph.remove_node(attachment)
    old = independence_polynomial(old_tree)
    deletion = forest_polynomial(deletion_graph)
    new = old[:] + [0]
    for j, value in enumerate(deletion, start=1):
        new[j] += value
    assert old == [1, 5, 6, 1]
    assert deletion == [1, 4, 4, 1]
    assert new == [1, 6, 10, 5, 1]

    k = 2
    m_minus = Fraction(new[k - 1], old[k - 1])
    m_here = Fraction(new[k], old[k])
    m_plus = Fraction(new[k + 1], old[k + 1])
    h_minus = math.factorial(k - 1) * old[k - 1]
    h_here = math.factorial(k) * old[k]
    h_plus = math.factorial(k + 1) * old[k + 1]
    rho = Fraction(h_minus * h_plus, h_here * h_here)
    normalized_delta = (
        m_here * m_here
        - 1
        - rho * (m_minus * m_plus - 1)
    )
    direct_delta = Fraction(
        curvature(new, k) - curvature(old, k),
        h_here * h_here,
    )
    assert normalized_delta == direct_delta
    theta = (
        m_minus * m_plus - m_here * m_here
    ) / (m_minus * m_plus - 1)
    reserve = 1 - rho
    assert theta == Fraction(29, 45)
    assert reserve == Fraction(19, 24)
    assert theta / reserve == Fraction(232, 285)
    assert curvature(new, k) - curvature(old, k) == 106

    leaf = max(old_tree) + 1
    extended = old_tree.copy()
    extended.add_edge(attachment, leaf)
    rank = 2
    all_sets = independent_sets(extended, rank)
    absent = [chosen for chosen in all_sets if leaf not in chosen]
    present = [chosen for chosen in all_sets if leaf in chosen]
    assert len(absent) == old[rank]
    assert len(present) == deletion[rank - 1]

    for chosen in absent:
        old_chosen = frozenset(chosen)
        e_t, q_t = residual_stats(old_tree, old_chosen)
        e_g, q_g = residual_stats(extended, chosen)
        assert e_g == e_t + int(attachment not in chosen)
        old_residual = set(old_tree) - set(chosen)
        for vertex in chosen:
            old_residual.discard(vertex)
            old_residual.difference_update(old_tree[vertex])
        assert q_g == q_t + int(attachment in old_residual)

    for chosen in present:
        remainder = frozenset(set(chosen) - {leaf})
        e_del, q_del = residual_stats(deletion_graph, remainder)
        e_g, q_g = residual_stats(extended, chosen)
        assert (e_g, q_g) == (e_del, q_del)


def main() -> int:
    check_symbolic_identity()
    check_finite_leaf_and_mixture()
    print("symbolic multiplier identity: PASS")
    print("ordinary-coefficient identity: PASS")
    print("P5 compensation witness: PASS")
    print("leaf-mixture residual formulas: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
