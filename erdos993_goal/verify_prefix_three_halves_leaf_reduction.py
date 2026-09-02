#!/usr/bin/env python3
"""Exact algebraic replay of the prefix three-halves leaf reduction.

This verifies identities and the stated small examples.  It does not
prove the conjectural leaf-monotonicity or boundary assertions.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp

from verify_prefix_two_over_k_variance_reduction import (
    forest_independence_polynomial,
)

import networkx as nx


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def g_reserve(poly: tuple[int, ...], rank: int) -> int:
    return (
        rank * coefficient(poly, rank) ** 2
        + coefficient(poly, rank - 1) * coefficient(poly, rank)
        - (rank + 1)
        * coefficient(poly, rank - 1)
        * coefficient(poly, rank + 1)
    )


def q_reserve(poly: tuple[int, ...], rank: int) -> int:
    return (
        2 * rank * coefficient(poly, rank) ** 2
        - coefficient(poly, rank - 1) * coefficient(poly, rank)
        - 2
        * (rank + 1)
        * coefficient(poly, rank - 1)
        * coefficient(poly, rank + 1)
    )


def attach_leaf(tree: nx.Graph, support: int) -> nx.Graph:
    new = tree.copy()
    leaf = max(new.nodes, default=-1) + 1
    new.add_edge(support, leaf)
    return new


def symbolic_checks() -> None:
    k = sp.symbols("k", positive=True, integer=True)
    am, a0, ap = sp.symbols("a_m a_0 a_p", positive=True)
    bm2, bm, b0 = sp.symbols("b_m2 b_m b_0", nonnegative=True)

    g = k * a0**2 + am * a0 - (k + 1) * am * ap
    q = 2 * g - 3 * am * a0
    expected_q = 2 * k * a0**2 - am * a0 - 2 * (k + 1) * am * ap
    assert sp.expand(q - expected_q) == 0

    hm, h0, hp = sp.symbols("h_m h_0 h_p", positive=True)
    curvature = h0**2 - hm * hp
    # a_(k-1)a_k = k h_(k-1)h_k/(k!)^2.
    factorial_q_scaled = k * (2 * curvature - hm * h0)
    coefficient_q_scaled = (
        2 * k * curvature - k * hm * h0
    )
    assert sp.expand(factorial_q_scaled - coefficient_q_scaled) == 0

    # Direct leaf increment: a'_j = a_j + b_(j-1).
    new_am = am + bm2
    new_a0 = a0 + bm
    new_ap = ap + b0
    new_q = (
        2 * k * new_a0**2
        - new_am * new_a0
        - 2 * (k + 1) * new_am * new_ap
    )
    delta = sp.expand(new_q - expected_q)
    expected_delta = (
        4 * k * a0 * bm
        + 2 * k * bm**2
        - am * bm
        - bm2 * a0
        - bm2 * bm
        - 2 * (k + 1) * (am * b0 + bm2 * ap + bm2 * b0)
    )
    assert sp.expand(delta - expected_delta) == 0

    # Multiplier identity for D=2C-h_(k-1)h_k.
    mm, m0, mp = sp.symbols("m_m m_0 m_p", positive=True)
    d_old = 2 * (h0**2 - hm * hp) - hm * h0
    d_new = (
        2 * ((m0 * h0) ** 2 - (mm * hm) * (mp * hp))
        - (mm * hm) * (m0 * h0)
    )
    rho = hm * hp / h0**2
    ratio = h0 / hm
    normalized_delta = (
        2 * (m0**2 - mm * mp)
        + 2 * (1 - rho) * (mm * mp - 1)
        - (mm * m0 - 1) / ratio
    )
    assert sp.simplify((d_new - d_old) / h0**2 - normalized_delta) == 0

    mean_e, mean_q, variance, mean_c = sp.symbols(
        "mean_e mean_q variance mean_c", nonnegative=True
    )
    sigma = 2 + (2 * mean_q - variance) / mean_e
    assert sp.simplify(
        2 * mean_e * (sigma - sp.Rational(3, 2))
        - (mean_e + 4 * mean_q - 2 * variance)
    ) == 0
    assert sp.simplify(
        (2 * mean_q + mean_e / 2)
        .subs(mean_q, mean_e - mean_c)
        - (sp.Rational(5, 2) * mean_e - 2 * mean_c)
    ) == 0


def small_examples() -> None:
    # Stars have sigma_k=2 for k>=3.
    for leaves in range(3, 20):
        poly = forest_independence_polynomial(nx.star_graph(leaves))
        for rank in range(3, len(poly) - 1):
            denominator = poly[rank - 1] * poly[rank]
            assert g_reserve(poly, rank) == 2 * denominator
            assert q_reserve(poly, rank) == denominator

    # The stripped multiplier shortcut fails on K_(1,6), even though
    # the true Q reserve increases after attaching a leaf to a leaf.
    star = nx.star_graph(6)
    old = forest_independence_polynomial(star)
    support = 1
    deleted = forest_independence_polynomial(
        nx.subgraph_view(star, filter_node=lambda vertex: vertex != support)
    )
    new = forest_independence_polynomial(attach_leaf(star, support))
    assert old == (1, 7, 15, 20, 15, 6, 1)
    assert deleted == (1, 6, 10, 10, 5, 1)
    assert new == (1, 8, 21, 30, 25, 11, 2)

    rank = 3
    multipliers = []
    for index in (rank - 1, rank, rank + 1):
        multipliers.append(
            Fraction(
                coefficient(new, index),
                coefficient(old, index),
            )
        )
    mm, m0, mp = multipliers
    ratio = Fraction(rank * old[rank], old[rank - 1])
    stripped = (
        2 * ratio * (m0 * m0 - mm * mp)
        + mm * (mp - m0)
    )
    assert stripped == Fraction(-13, 30)
    assert q_reserve(old, rank) == 300
    assert q_reserve(new, rank) == 570

    # Recheck that the T(6,3) counterexample to V2/k still has a large
    # positive three-halves reserve.
    tree = nx.Graph()
    tree.add_node(0)
    next_vertex = 1
    for _ in range(6):
        branch = next_vertex
        next_vertex += 1
        tree.add_edge(0, branch)
        for _ in range(3):
            tree.add_edge(branch, next_vertex)
            next_vertex += 1
    poly = forest_independence_polynomial(tree)
    rank = 11
    assert q_reserve(poly, rank) == (
        2 * 22981900032 - 3 * poly[10] * poly[11]
    )
    assert q_reserve(poly, rank) > 0

    # The claimed closest small forest is K_(1,5) plus one isolate.
    forest = nx.disjoint_union(nx.star_graph(5), nx.empty_graph(1))
    poly = forest_independence_polynomial(forest)
    assert poly == (1, 7, 16, 20, 15, 6, 1)
    rank = 3
    sigma = Fraction(
        g_reserve(poly, rank), poly[rank - 1] * poly[rank]
    )
    assert sigma == Fraction(7, 4)

    # Cutoffs can rise by at most one when alpha rises by at most one.
    for alpha in range(1, 1001):
        old_cutoff = (2 * alpha + 1) // 3
        for new_alpha in (alpha, alpha + 1):
            new_cutoff = (2 * new_alpha + 1) // 3
            assert new_cutoff in (old_cutoff, old_cutoff + 1)


def main() -> None:
    symbolic_checks()
    small_examples()
    print("PASS")
    print("three-halves reserve identities verified")
    print("stripped K1,6 multiplier value: -13/30")
    print("true K1,6 leaf increment: 270")
    print("status: leaf monotonicity and boundary remain conjectural")


if __name__ == "__main__":
    main()
