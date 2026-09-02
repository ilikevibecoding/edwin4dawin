#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at order-24 roots of degree >=4.

Degree at least five follows from the degree-sensitive path-ratio cone.
For degree four, put F=T-N[p], so |F|=19.  An exact forest motif
calculation handles e(F)>=3, and all rooted-component states with at
most two edges are enumerated exactly.
"""

from __future__ import annotations

import itertools
from math import comb

import sympy as sp

from verify_rank6_all_roots_n26 import compositions
from verify_rank6_all_roots_n27 import (
    add,
    multiply,
    rooted_branch_types,
    strong,
)


def degree_sensitive_endpoint():
    n = sp.Integer(24)
    degree = sp.symbols("degree", integer=True, positive=True)
    x = (n - 7) * (n - 8) / (5 * (n - 3))
    L = (n - degree - 4) / 4
    lower = sp.factor(
        2 * x + 1 - 24 * (L - x) / (1 + L)
    )
    derivative = sp.factor(sp.diff(lower, degree))
    assert x == sp.Rational(272, 105)
    assert derivative == sp.Rational(12064, 35) / (
        degree - 24
    ) ** 2
    endpoint = sp.factor(lower.subs(degree, 5))
    assert endpoint == sp.Rational(643, 1995)
    return lower, endpoint


def degree_four_forest_ratio():
    """Prove i4/i3 <= 7177/1871 for 19-vertex forests with e>=3."""

    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )
    a = sp.binomial(19, 3) - 17 * e + W
    b = (
        sp.binomial(19, 4)
        - e * sp.binomial(17, 2)
        + 15 * W
        + sp.binomial(e, 2)
        - R
    )
    margin = sp.expand(7177 * a - 1871 * b)

    # The line graph of a forest has e vertices, W edges, and R
    # triangles.  Its degree-square identity gives
    # R >= (2W^2/e-W)/3.
    line_lower = (2 * W**2 / e - W) / 3
    relaxed = sp.factor(margin.subs(R, line_lower))
    derivative = sp.factor(sp.diff(relaxed, W))
    assert sp.simplify(
        derivative
        - (7484 * W - 64535 * e) / (3 * e)
    ) == 0

    # The relaxed margin decreases throughout
    # max(0,2e-19)<=W<=C(e,2).
    for edge_count in range(3, 19):
        assert derivative.subs(
            {
                e: edge_count,
                W: comb(edge_count, 2),
            }
        ) < 0

    endpoint = sp.factor(
        relaxed.subs(W, e * (e - 1) / 2)
    )
    expected = (
        1871 * e**3
        - 73890 * e**2
        + 866701 * e
        - 1784898
    ) / 6
    assert sp.simplify(endpoint - expected) == 0
    values = [
        endpoint.subs(e, edge_count)
        for edge_count in range(3, 19)
    ]
    assert min(values) == 33452
    assert all(value > 0 for value in values)

    x = sp.Rational(272, 105)
    y = sp.Rational(7177, 1871)
    normalized = sp.factor(
        2 * x + 1 - 24 * (y - x) / (1 + y)
    )
    assert normalized == 0
    return min(values), normalized


def sparse_cases():
    """Enumerate every degree-four state with e(F)<=2."""

    maximum_edges = 2
    types, per_edge = rooted_branch_types(maximum_edges)
    assert per_edge == {1: 1, 2: 2}

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
    assert len(multisets) == 5

    counts = {edge_count: 0 for edge_count in range(3)}
    minima = {edge_count: None for edge_count in range(3)}
    witnesses = {edge_count: None for edge_count in range(3)}

    for indices in multisets:
        edge_count = sum(types[index][2] for index in indices)
        used_vertices = sum(
            types[index][3] for index in indices
        )
        isolates = 19 - used_vertices
        assert isolates >= 0

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

        for side_choices in itertools.product(
            range(4), repeat=len(indices)
        ):
            side_full = [(1,) for _ in range(4)]
            side_deleted = [(1,) for _ in range(4)]
            for index, side in zip(indices, side_choices):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolate_counts in compositions(isolates, 4):
                root_deleted = (1,)
                for side, isolate_count in enumerate(
                    isolate_counts
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
                    side_tree = add(
                        excluded_center,
                        (0,) + side_deleted[side],
                    )
                    root_deleted = multiply(
                        root_deleted, side_tree
                    )

                whole = add(root_deleted, (0,) + forest)
                value = strong(whole, root_deleted)
                counts[edge_count] += 1
                previous = minima[edge_count]
                if previous is None or value < previous:
                    minima[edge_count] = value
                    witnesses[edge_count] = (
                        indices,
                        side_choices,
                        isolate_counts,
                    )

    assert counts == {
        0: 1540,
        1: 4560,
        2: 20808,
    }
    assert minima == {
        0: 175548625,
        1: 170997137,
        2: 166527733,
    }
    assert all(value > 0 for value in minima.values())
    return len(multisets), counts, minima, witnesses


def main():
    degree_bound = degree_sensitive_endpoint()
    forest_ratio = degree_four_forest_ratio()
    sparse = sparse_cases()
    print(
        "rank-6 strong inequality at every order-24 root "
        "of degree at least four: CERTIFIED"
    )
    print("degree>=5 endpoint:", degree_bound[1])
    print("degree-four forest ratio:", forest_ratio)
    print("sparse multisets:", sparse[0])
    print("sparse counts:", sparse[1])
    print("sparse minima:", sparse[2])


if __name__ == "__main__":
    main()
