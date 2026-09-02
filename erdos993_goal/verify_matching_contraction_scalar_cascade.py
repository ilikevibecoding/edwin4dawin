#!/usr/bin/env python3
"""Verify the matching contraction and scalar Q-Cascade identities."""

from __future__ import annotations

import networkx as nx
import sympy as sp


def q(pm, p0, pp, rank):
    return (
        2 * rank * p0**2
        - pm * p0
        - 2 * (rank + 1) * pm * pp
    )


def symbolic_cascade() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    a, ap, app, bm, b, bp = sp.symbols(
        "a ap app bm b bp", positive=True
    )

    gm = a + bm
    g0 = ap + b
    gp = app + bp
    cleared = sp.expand(
        k * bm * q(gm, g0, gp, k)
        - (k - 1) * gm * q(bm, b, bp, k - 1)
    )

    s = b / a
    u = (k - 1) * b / bm
    w = k * bp / b
    v = k * ap / a
    y = (k + 1) * app / ap
    d = v + s - u
    theta = bm / (a + bm)
    delta_t = v - y - sp.Rational(1, 2)
    delta_f = u - w - sp.Rational(1, 2)
    scalar = (
        v * delta_t
        + s
        * (
            2 * d
            - s
            + sp.Rational(1, 2)
            + 2 * delta_f
        )
        - theta * d**2
    )
    aligned = (
        v * delta_t
        + 2 * s * delta_f
        + s * u / (k - 1)
        + s / 2
        - theta * (v - k * u / (k - 1)) ** 2
    )

    assert sp.factor(
        cleared - 2 * a * bm * (a + bm) * scalar
    ) == 0
    assert sp.factor(scalar - aligned) == 0
    assert sp.factor(
        theta - (k - 1) * s / (u + (k - 1) * s)
    ) == 0

    # The marked-root term in the older variance form simplifies to
    # s(2(v-w)+s-1/2).
    marked = s * (
        2 * (v - w) + s - sp.Rational(1, 2)
    )
    rewritten = s * (
        2 * d
        - s
        + sp.Rational(1, 2)
        + 2 * delta_f
    )
    assert sp.factor(marked - rewritten) == 0

    # Rank-uniform interpolation.  The reserve
    #
    #   P_c(k)=k p_k^2-(k+1)p_{k-1}p_{k+1}-c p_{k-1}p_k
    #
    # is the factorial-ratio assertion r_k-r_{k+1} >= c.
    # c=1/2 gives Q/2, while c=-1 gives the GSB reserve.
    c = sp.symbols("c", real=True)

    def reserve_c(pm, p0, pp, rank):
        return (
            rank * p0**2
            - (rank + 1) * pm * pp
            - c * pm * p0
        )

    cleared_c = sp.expand(
        k
        * bm
        * reserve_c(gm, g0, gp, k)
        - (k - 1)
        * gm
        * reserve_c(bm, b, bp, k - 1)
    )
    delta_t_c = v - y - c
    delta_f_c = u - w - c
    cross_ratio_c = (
        v * delta_t_c
        + 2 * s * delta_f_c
        + s * u / (k - 1)
        + c * s
        - theta * (v - k * u / (k - 1)) ** 2
    )
    assert sp.factor(
        cleared_c - a * bm * (a + bm) * cross_ratio_c
    ) == 0


def bridge_identity() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    pm, p0, pp = sp.symbols("pm p0 pp")
    hm3, hm2, hm1 = sp.symbols("hm3 hm2 hm1")
    new_q = q(
        pm - hm3,
        p0 - hm2,
        pp - hm1,
        k,
    )
    old_q = q(pm, p0, pp, k)
    expected = (
        2 * k * hm2**2
        + hm3
        * (
            -2 * k * hm1
            + 2 * k * pp
            - hm2
            - 2 * hm1
            + p0
            + 2 * pp
        )
        + hm2 * (-4 * k * p0 + pm)
        + hm1 * (2 * k * pm + 2 * pm)
    )
    assert sp.expand(new_q - old_q - expected) == 0


def matching_contraction_finite_check() -> None:
    expected = {
        2: 1,
        3: 1,
        4: 2,
        5: 3,
        6: 6,
        7: 11,
        8: 23,
        9: 47,
        10: 106,
        11: 235,
        12: 551,
    }
    checked = 0
    for order in range(2, 13):
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            top_nodes, _ = nx.bipartite.sets(tree)
            matching_map = nx.algorithms.bipartite.maximum_matching(
                tree, top_nodes=top_nodes
            )
            matching = {
                (vertex, matching_map[vertex])
                for vertex in top_nodes
                if vertex in matching_map
            }
            matching_edges = {
                frozenset(edge) for edge in matching
            }
            alpha = order - len(matching)
            unit_of = {}
            units = []
            for edge in matching:
                unit = len(units)
                vertices = tuple(edge)
                units.append(vertices)
                for vertex in vertices:
                    unit_of[vertex] = unit
            for vertex in tree:
                if vertex not in unit_of:
                    unit = len(units)
                    units.append((vertex,))
                    unit_of[vertex] = unit
            assert len(units) == alpha

            contracted = nx.Graph()
            contracted.add_nodes_from(range(alpha))
            for left, right in tree.edges:
                if frozenset((left, right)) in matching_edges:
                    continue
                first = unit_of[left]
                second = unit_of[right]
                assert first != second
                contracted.add_edge(first, second)
            assert nx.is_tree(contracted)
            assert contracted.number_of_edges() == alpha - 1

            # A maximum independent set occupies every unit.
            # Bipartite maximum independent set = complement of a
            # minimum vertex cover recovered from the matching.
            cover = nx.algorithms.bipartite.to_vertex_cover(
                tree,
                matching_map,
                top_nodes=top_nodes,
            )
            independent = set(tree) - set(cover)
            assert len(independent) == alpha
            for unit in units:
                assert len(set(unit) & independent) == 1
            checked += 1
        assert count == expected[order]
    print(
        "matching contraction: CERTIFIED "
        f"trees={checked:,} orders=2..12"
    )


def main() -> None:
    symbolic_cascade()
    bridge_identity()
    matching_contraction_finite_check()
    print("scalar Q-Cascade identity: PASS")
    print("bridge polynomial identity: PASS")


if __name__ == "__main__":
    main()
