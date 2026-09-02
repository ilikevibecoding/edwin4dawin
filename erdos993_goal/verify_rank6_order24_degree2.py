#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at degree-two roots of order 24.

The key new input is a sharp coefficient ratio for a 23-vertex forest
with exactly two components:

    i4(H) >= 4998,    i5(H)/i4(H) >= 362/147.

It follows by joining a leaf from each component and applying the
proved strengthened tree rank-(4,5) path-ratio theorem.  With this
input, a direct motif cone handles e(T-N[p])>=3; the three smaller
edge counts are enumerated exactly.
"""

from __future__ import annotations

import itertools
from math import comb

import sympy as sp

from verify_rank6_all_roots_n26 import (
    compositions,
    univariate_bernstein_coefficients,
)
from verify_rank6_all_roots_n27 import (
    add,
    multiply,
    rooted_branch_types,
    strong,
)


EXPECTED_EXTRAS = {
    0: 285,
    1: 321,
    2: 357,
    3: 394,
    4: 440,
    5: 486,
    6: 542,
    7: 598,
    8: 665,
    9: 732,
    10: 811,
    11: 890,
    12: 982,
    13: 1074,
    14: 1180,
    15: 1286,
    16: 1407,
    17: 1528,
    18: 1665,
    19: 1802,
    20: 1956,
}


def two_component_forest_bounds():
    """Verify the arithmetic of the sharp order-23 two-component lemma."""

    # If the two selected components both have order at least two,
    # the residual Q has order 19.  If one is a singleton, Q has
    # order 20.  For a q-vertex forest, e<=q-1 and its wedge count is
    # at least max(0,2e-q).
    residual_minima = {}
    for order in (19, 20):
        values = []
        for edges in range(order):
            wedges = max(0, 2 * edges - order)
            i2 = comb(order, 2) - edges
            i3 = (
                comb(order, 3)
                - edges * (order - 2)
                + wedges
            )
            values.append(147 * i3 - 362 * i2)
        residual_minima[order] = min(values)

    assert residual_minima == {
        19: 44574,
        20: 58050,
    }
    assert sp.Rational(46, 5) * 4845 == 44574

    # The strengthened rank-(4,5) tree path theorem at order 23 is
    #   5 i5(G)-12 i4(G) >= 65 B2.
    n = sp.Integer(23)
    large_margin_coefficient = sp.factor(
        (n**3 - 8 * n**2 - 19 * n + 302) / 6
    )
    assert large_margin_coefficient == 1300
    tree_gap_coefficient = large_margin_coefficient / 20
    assert tree_gap_coefficient == 65

    # The exact tree motif identity is
    # i4(G)-i4(P23)=18B2-B3-X, X=E-20.
    # Hence it is at most 18B2+20, and at most 38B2 when G is not a
    # path (so the integral B2 is at least one).
    B2, B3, edge = sp.symbols(
        "B2 B3 edge", nonnegative=True
    )
    i4_gap = 18 * B2 - B3 - (edge - 20)
    assert sp.expand(i4_gap - (18 * B2 - B3 - edge + 20)) == 0
    nonpath_margin = (
        147 * tree_gap_coefficient - 46 * 38
    )
    assert nonpath_margin == 7807

    # Check the exact coefficient decomposition after joining the
    # components.  If G is the joined tree and Q is the residual
    # forest, then h=g4+q2 and k=g5+q3.
    g4, g5, q2, q3 = sp.symbols("g4 g5 q2 q3")
    target = 147 * (g5 + q3) - 362 * (g4 + q2)
    tree_gap = 5 * g5 - 12 * g4
    residual_gap = 147 * q3 - 362 * q2
    decomposition = (
        sp.Rational(1, 5)
        * (147 * tree_gap - 46 * g4)
        + residual_gap
    )
    assert sp.expand(target - decomposition) == 0

    # Coefficientwise path minimality gives g4>=4845.  Also q2>=153,
    # since Q has order 19 or 20 and at most q-1 edges.
    h_minimum = 4845 + 153
    assert h_minimum == 4998
    return residual_minima, h_minimum, sp.Rational(362, 147)


def sparse_cases():
    """Enumerate every degree-two rooted state with e(F)<=2."""

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

    for indices in multisets:
        edge_count = sum(types[index][2] for index in indices)
        used_vertices = sum(
            types[index][3] for index in indices
        )
        isolates = 21 - used_vertices
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
            range(2), repeat=len(indices)
        ):
            side_full = [(1,), (1,)]
            side_deleted = [(1,), (1,)]
            for index, side in zip(indices, side_choices):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolate_counts in compositions(isolates, 2):
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

    assert counts == {
        0: 22,
        1: 40,
        2: 148,
    }
    assert minima == {
        0: 232398880,
        1: 213277068,
        2: 195761988,
    }
    assert all(value > 0 for value in minima.values())
    return len(multisets), counts, minima


def choose(value, rank):
    return comb(value, rank) if value >= rank >= 0 else 0


def independent_three_minimum(order, edges, component_cap):
    wedges = max(
        0,
        2 * edges - order,
        edges - component_cap,
    )
    return (
        choose(order, 3)
        - edges * (order - 2)
        + wedges
    )


def branch_extra(edge_count):
    """Minimize all one- and two-center contributions to i4(H)."""

    m = 21
    components = m - edge_count
    minimum = None

    for component_counts in compositions(components, 2):
        if edge_count == 0:
            nontrivial_allocations = ((0, 0),)
        else:
            nontrivial_allocations = (
                allocation
                for total in range(
                    1, min(edge_count, components) + 1
                )
                for allocation in compositions(total, 2)
            )

        for nontrivial_counts in nontrivial_allocations:
            if any(
                nontrivial_counts[index]
                > component_counts[index]
                for index in range(2)
            ):
                continue

            nontrivial_total = sum(nontrivial_counts)
            value = sum(
                independent_three_minimum(
                    m - component_counts[index],
                    edge_count - nontrivial_counts[index],
                    nontrivial_total,
                )
                for index in range(2)
            )
            value += (
                choose(edge_count, 2)
                - (edge_count - nontrivial_total)
            )

            if minimum is None or value < minimum:
                minimum = value

    return minimum


def dense_certificate():
    """Certify every 3<=e(F)<=20 in exact one-variable cells."""

    m = 21
    W = sp.symbols("W", nonnegative=True)
    parameter = sp.symbols("parameter", nonnegative=True)
    alpha = sp.Rational(362, 147)
    path_h = sp.Integer(4998)
    rows = []

    assert {
        edge_count: branch_extra(edge_count)
        for edge_count in EXPECTED_EXTRAS
    } == EXPECTED_EXTRAS

    for edge_count in range(3, 21):
        extra = EXPECTED_EXTRAS[edge_count]
        a = comb(m, 3) - edge_count * (m - 2) + W
        base_b = (
            comb(m, 4)
            - edge_count * comb(m - 2, 2)
            + W * (m - 4)
            + comb(edge_count, 2)
        )
        b_lower = base_b - comb(edge_count, 3)
        h_switch = sp.factor(
            (
                path_h
                - extra
                - b_lower.subs(W, 0)
            )
            / (m - 4)
        )

        w_low = sp.Rational(max(0, 2 * edge_count - m))
        w_high = sp.Rational(comb(edge_count, 2))
        line_switch = sp.Rational(edge_count, 2)
        points = {w_low, w_high}
        if w_low < line_switch < w_high:
            points.add(line_switch)
        if w_low < h_switch < w_high:
            points.add(h_switch)
        points = sorted(points)

        for low, high in zip(points, points[1:]):
            midpoint = (low + high) / 2
            connected_lower = (
                sp.S.Zero
                if midpoint <= line_switch
                else (
                    2 * W**2 / edge_count - W
                )
                / 3
            )
            b_upper = base_b - connected_lower
            h_lower = (
                path_h
                if (b_lower + extra).subs(W, midpoint)
                <= path_h
                else b_lower + extra
            )

            lower = (
                a**2
                + 26 * alpha * a * h_lower
                + 2 * a * b_upper
                + 2 * a * h_lower
                + 2 * alpha * h_lower**2
                - 22 * b_upper * h_lower
                + h_lower**2
            )
            h_derivative = 2 * (
                13 * alpha * a
                + a
                + 2 * alpha * h_lower
                - 11 * b_upper
                + h_lower
            )

            assert 2 * comb(m, 3) - 22 * path_h < 0

            for name, expression in (
                ("margin", lower),
                ("h-derivative", h_derivative),
            ):
                mapped = sp.expand(
                    expression.subs(
                        W,
                        low + (high - low) * parameter,
                    )
                )
                coefficients = univariate_bernstein_coefficients(
                    mapped, parameter
                )
                minimum = min(coefficients)
                assert minimum > 0
                rows.append(
                    (
                        edge_count,
                        low,
                        high,
                        name,
                        minimum,
                    )
                )

    margin_rows = [row for row in rows if row[3] == "margin"]
    derivative_rows = [
        row for row in rows if row[3] == "h-derivative"
    ]
    margin_minimum = min(row[4] for row in margin_rows)
    derivative_minimum = min(
        row[4] for row in derivative_rows
    )
    assert len(margin_rows) == 39
    assert len(derivative_rows) == 39
    assert margin_minimum == sp.Rational(124424539, 49)
    assert derivative_minimum == sp.Rational(4827904, 147)
    return (
        len(margin_rows),
        margin_minimum,
        derivative_minimum,
    )


def main():
    two_component = two_component_forest_bounds()
    sparse = sparse_cases()
    dense = dense_certificate()
    print(
        "rank-6 strong inequality at every order-24 "
        "degree-two root: CERTIFIED"
    )
    print("two-component forest inputs:", two_component)
    print("sparse multisets:", sparse[0])
    print("sparse counts:", sparse[1])
    print("sparse minima:", sparse[2])
    print("dense cells:", dense)


if __name__ == "__main__":
    main()
