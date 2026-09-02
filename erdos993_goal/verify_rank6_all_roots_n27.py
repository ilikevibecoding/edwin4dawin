#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every root from order 27.

This combines:

* the sharp rank-(4,5) path ratio;
* the all-leaf theorem from order 26;
* a degree-sensitive deletion bound;
* an exact forest ratio lemma for the only remaining degree-two
  cases at orders 27 and 28;
* a finite structural enumeration when the closed-neighborhood
  deletion has very few edges.
"""

from __future__ import annotations

import itertools
from math import comb

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from verify_rank6_all_leaf_roots_n26 import (
    support_branch_certificate,
    support_degree_two_certificate,
)


def coefficient(poly, rank):
    return poly[rank] if 0 <= rank < len(poly) else 0


def multiply(left, right, limit=5):
    out = [0] * (limit + 1)
    for i, a in enumerate(left[: limit + 1]):
        for j, b in enumerate(right[: limit + 1 - i]):
            out[i + j] += a * b
    return tuple(out)


def add(left, right, limit=5):
    return tuple(
        coefficient(left, rank) + coefficient(right, rank)
        for rank in range(limit + 1)
    )


def strong(whole, deleted):
    d, e = coefficient(whole, 4), coefficient(whole, 5)
    h, k = coefficient(deleted, 4), coefficient(deleted, 5)
    return d * (2 * e + d) - 24 * (e * h - d * k)


def degree_sensitive_bounds():
    n, degree = sp.symbols(
        "n degree", integer=True, positive=True
    )
    x = (n - 7) * (n - 8) / (5 * (n - 3))
    L = (n - degree - 4) / 4
    lower = sp.factor(
        2 * x + 1 - 24 * (L - x) / (1 + L)
    )

    # These are exactly the non-leaf degree cutoffs needed below.
    endpoints = {
        (27, 3): sp.S.Zero,
        (28, 3): sp.Rational(289, 625),
        (29, 2): sp.Rational(35, 117),
        (30, 1): sp.Rational(839, 3915),
    }
    for (order, root_degree), expected in endpoints.items():
        assert sp.factor(
            lower.subs({n: order, degree: root_degree})
        ) == expected

    # The lower bound increases when the root degree increases.
    degree_derivative = sp.factor(sp.diff(lower, degree))
    assert sp.simplify(
        degree_derivative
        - 96
        * (n**2 - 10 * n + 41)
        / (5 * (n - degree) ** 2 * (n - 3))
    ) == 0
    assert sp.discriminant(n**2 - 10 * n + 41, n) < 0
    return lower, endpoints


def forest_ratio_lemmas():
    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )

    def independent(m):
        a = sp.binomial(m, 3) - e * (m - 2) + W
        b = (
            sp.binomial(m, 4)
            - e * sp.binomial(m - 2, 2)
            + W * (m - 4)
            + sp.binomial(e, 2)
            - R
        )
        return a, b

    rows = []
    for m, numerator, denominator, first_edge in (
        (24, 5, 1, 6),
        (25, 2209, 407, 2),
    ):
        a, b = independent(m)
        margin = sp.expand(numerator * a - denominator * b)

        # For the line graph of a forest,
        #
        #   R >= (2W^2/e-W)/3.
        #
        # The resulting quadratic decreases throughout
        # 0<=W<=C(e,2) in the relevant edge range, so its minimum is
        # at W=C(e,2).
        line_lower = (2 * W**2 / e - W) / 3
        relaxed = sp.factor(margin.subs(R, line_lower))
        derivative = sp.factor(sp.diff(relaxed, W))
        endpoint = sp.factor(
            relaxed.subs(W, e * (e - 1) / 2)
        )

        if m == 24:
            assert sp.simplify(
                derivative - 2 * (2 * W - 23 * e) / (3 * e)
            ) == 0
            assert sp.simplify(
                endpoint - (e - 23) * (e - 22) * (e - 6) / 6
            ) == 0
            values = [
                endpoint.subs(e, value)
                for value in range(first_edge, m)
            ]
            assert min(values) == 0
        else:
            assert sp.simplify(
                derivative
                - (1628 * W - 19421 * e) / (3 * e)
            ) == 0
            expected_endpoint = (
                407 * e**3
                - 21456 * e**2
                + 334033 * e
                - 407100
            ) / 6
            assert sp.simplify(endpoint - expected_endpoint) == 0
            values = [
                endpoint.subs(e, value)
                for value in range(first_edge, m)
            ]
            assert min(values) == 29733
        assert all(value >= 0 for value in values)
        rows.append(
            (
                m,
                sp.Rational(numerator, denominator),
                first_edge,
                min(values),
            )
        )
    return rows


def rooted_branch_types(maximum_edges):
    types = []
    per_edge = {}
    for order in range(2, maximum_edges + 2):
        for tree in nx.nonisomorphic_trees(order):
            engine = MaskIndependencePolynomial(tree)
            mask = (1 << order) - 1
            full = tuple(engine.polynomial(mask)[:6])
            for root in range(order):
                deleted = tuple(
                    engine.polynomial(
                        mask & ~(1 << engine.position[root])
                    )[:6]
                )
                item = (full, deleted, order - 1, order)
                if item not in types:
                    types.append(item)
    for edge_count in range(1, maximum_edges + 1):
        per_edge[edge_count] = sum(
            item[2] == edge_count for item in types
        )
    return types, per_edge


def sparse_degree_two_enumeration(
    forest_order, maximum_edges, expected_counts, expected_minima
):
    types, per_edge = rooted_branch_types(maximum_edges)

    multisets = set()

    def generate(start, remaining, chosen):
        multisets.add(tuple(chosen))
        for index in range(start, len(types)):
            if types[index][2] <= remaining:
                generate(
                    index,
                    remaining - types[index][2],
                    chosen + [index],
                )

    generate(0, maximum_edges, [])

    minima = {
        edge_count: None
        for edge_count in range(maximum_edges + 1)
    }
    cases = {
        edge_count: 0
        for edge_count in range(maximum_edges + 1)
    }

    for indices in multisets:
        edge_count = sum(types[index][2] for index in indices)
        used_vertices = sum(types[index][3] for index in indices)
        isolates = forest_order - used_vertices
        if isolates < 0:
            continue

        forest = (1,)
        for index in indices:
            forest = multiply(forest, types[index][0])
        forest = multiply(
            forest,
            tuple(
                comb(isolates, rank)
                for rank in range(min(5, isolates) + 1)
            ),
        )

        # Every component of F=T-N[p] attaches to exactly one of the
        # two neighbors of the degree-two root p.  Enumerate that
        # side choice, the attachment root in every nontrivial
        # component (already encoded by `types`), and the split of
        # isolated components.
        for side_bits in itertools.product(
            (0, 1), repeat=len(indices)
        ):
            side_full = [(1,), (1,)]
            side_deleted = [(1,), (1,)]
            for index, side in zip(indices, side_bits):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolates_left in range(isolates + 1):
                side_trees = []
                for side, isolate_count in (
                    (0, isolates_left),
                    (1, isolates - isolates_left),
                ):
                    excluded_center = multiply(
                        side_full[side],
                        tuple(
                            comb(isolate_count, rank)
                            for rank in range(
                                min(5, isolate_count) + 1
                            )
                        ),
                    )
                    included_center = (0,) + side_deleted[side]
                    side_trees.append(
                        add(excluded_center, included_center)
                    )

                root_deleted = multiply(
                    side_trees[0], side_trees[1]
                )
                whole = add(root_deleted, (0,) + forest)
                value = strong(whole, root_deleted)
                cases[edge_count] += 1
                previous = minima[edge_count]
                if previous is None or value < previous:
                    minima[edge_count] = value

    assert per_edge == {
        edge_count: expected
        for edge_count, expected in enumerate(
            (0, 1, 2, 4, 9, 20)[
                : maximum_edges + 1
            ]
        )
        if edge_count
    }
    assert cases == expected_counts
    assert minima == expected_minima
    assert all(value > 0 for value in minima.values())
    return per_edge, cases, minima


def main():
    # Replay the two new leaf-root Bernstein cells used in the case
    # split.  The path and spider prerequisites have their own exact
    # verifiers.
    support_degree_two_certificate()
    support_branch_certificate()

    lower, endpoints = degree_sensitive_bounds()
    forest_rows = forest_ratio_lemmas()
    order_28 = sparse_degree_two_enumeration(
        forest_order=25,
        maximum_edges=1,
        expected_counts={0: 26, 1: 48},
        expected_minima={0: 1315089216, 1: 1243086603},
    )
    order_27 = sparse_degree_two_enumeration(
        forest_order=24,
        maximum_edges=5,
        expected_counts={
            0: 25,
            1: 46,
            2: 172,
            3: 480,
            4: 1452,
            5: 3928,
        },
        expected_minima={
            0: 878878660,
            1: 827121152,
            2: 777207504,
            3: 730737645,
            4: 687215124,
            5: 646609959,
        },
    )

    print("rank-6 strong inequality at every root, n>=27: CERTIFIED")
    print("degree-sensitive lower bound:", lower)
    print("degree endpoints:", endpoints)
    print("forest ratio rows:", forest_rows)
    print("order 28 sparse degree-two:", order_28[1:])
    print("order 27 sparse degree-two:", order_27[1:])


if __name__ == "__main__":
    main()
