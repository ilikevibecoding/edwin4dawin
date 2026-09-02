#!/usr/bin/env python3
"""Certify the order-23 strong rank-6 inequality at root degrees 2--4.

Degree two uses a sharp coefficient lemma for two-component forests of
order 22.  Degrees three and four use the universal order-22 forest
ratio.  Exact rooted-component enumeration handles the sparse degree-
two and degree-three layers; one-variable motif cones handle the rest.
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
    2: {
        0: 240,
        1: 276,
        2: 304,
        3: 341,
        4: 378,
        5: 424,
        6: 470,
        7: 526,
        8: 582,
        9: 649,
        10: 716,
        11: 795,
        12: 874,
        13: 966,
        14: 1058,
        15: 1164,
        16: 1270,
        17: 1391,
        18: 1512,
        19: 1649,
    },
    3: {
        0: 843,
        1: 899,
        2: 956,
        3: 1013,
        4: 1070,
        5: 1139,
        6: 1207,
        7: 1275,
        8: 1356,
        9: 1436,
        10: 1516,
        11: 1610,
        12: 1703,
        13: 1796,
        14: 1904,
        15: 2011,
        16: 2118,
        17: 2241,
        18: 2363,
    },
    4: {
        0: 1536,
        1: 1604,
        2: 1661,
        3: 1732,
        4: 1802,
        5: 1871,
        6: 1940,
        7: 2023,
        8: 2105,
        9: 2186,
        10: 2267,
        11: 2363,
        12: 2458,
        13: 2552,
        14: 2646,
        15: 2756,
        16: 2865,
        17: 2973,
    },
}


def order_22_forest_ratios():
    ratio_32 = sp.Rational(19 * 18, 3 * 21)
    ratio_43 = sp.factor(
        sp.Rational(3, 4) * (ratio_32 - 1)
    )
    ratio_54 = sp.factor(
        sp.Rational(4, 5) * ratio_43
        - sp.Rational(3, 5)
    )
    assert (
        ratio_32,
        ratio_43,
        ratio_54,
    ) == (
        sp.Rational(38, 7),
        sp.Rational(93, 28),
        sp.Rational(72, 35),
    )
    return ratio_32, ratio_43, ratio_54


def two_component_order_22_bounds():
    """Verify the sharp two-component inputs for degree-two roots."""

    residual_minima = {}
    for order in (18, 19):
        values = []
        for edges in range(order):
            wedges = max(0, 2 * edges - order)
            i2 = comb(order, 2) - edges
            i3 = (
                comb(order, 3)
                - edges * (order - 2)
                + wedges
            )
            values.append(1003 * i3 - 2282 * i2)
        residual_minima[order] = min(values)
    assert residual_minima == {
        18: 251328,
        19: 332894,
    }
    assert sp.Rational(1232, 19) * 3876 == 251328

    # The strengthened tree path-ratio theorem at order 22 gives
    # 19 i5(G)-42 i4(G) >= 222 B2.
    n = sp.Integer(22)
    large_coefficient = sp.factor(
        (n**3 - 8 * n**2 - 19 * n + 302) / 6
    )
    assert large_coefficient == 1110
    tree_gap_coefficient = large_coefficient / 5
    assert tree_gap_coefficient == 222

    # i4(G)-i4(P22)=17B2-B3-(E-19).  For a nonpath this is at most
    # 36B2 because B2 is a positive integer.
    B2, B3, edge = sp.symbols(
        "B2 B3 edge", nonnegative=True
    )
    i4_gap = 17 * B2 - B3 - (edge - 19)
    assert sp.expand(i4_gap - (17 * B2 - B3 - edge + 19)) == 0
    nonpath_margin = 1003 * tree_gap_coefficient - 1232 * 36
    assert nonpath_margin == 178314

    g4, g5, q2, q3 = sp.symbols("g4 g5 q2 q3")
    target = 1003 * (g5 + q3) - 2282 * (g4 + q2)
    tree_gap = 19 * g5 - 42 * g4
    residual_gap = 1003 * q3 - 2282 * q2
    decomposition = (
        sp.Rational(1, 19)
        * (1003 * tree_gap - 1232 * g4)
        + residual_gap
    )
    assert sp.expand(target - decomposition) == 0

    # i4(G)>=i4(P22)=3876 and the smaller residual has q2>=136.
    h_minimum = 3876 + 136
    assert h_minimum == 4012
    return residual_minima, h_minimum, sp.Rational(2282, 1003)


def sparse_enumeration(
    forest_order,
    sides,
    maximum_edges,
    expected_multisets,
    expected_counts,
    expected_minima,
    expected_types=None,
):
    types, per_edge = rooted_branch_types(maximum_edges)
    if expected_types is None:
        expected_types = {
            edge_count: count
            for edge_count, count in {
                1: 1,
                2: 2,
                3: 4,
                4: 9,
                5: 20,
            }.items()
            if edge_count <= maximum_edges
        }
    assert per_edge == expected_types

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
    assert len(multisets) == expected_multisets

    counts = {
        edge_count: 0
        for edge_count in range(maximum_edges + 1)
    }
    minima = {
        edge_count: None
        for edge_count in range(maximum_edges + 1)
    }

    for indices in multisets:
        edge_count = sum(types[index][2] for index in indices)
        used_vertices = sum(
            types[index][3] for index in indices
        )
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

        for side_choices in itertools.product(
            range(sides), repeat=len(indices)
        ):
            side_full = [(1,) for _ in range(sides)]
            side_deleted = [(1,) for _ in range(sides)]
            for index, side in zip(indices, side_choices):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolate_counts in compositions(isolates, sides):
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

    assert counts == expected_counts
    assert minima == expected_minima
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


def branch_extra(forest_order, sides, edge_count):
    """Minimize every nonzero center-inclusion term of i4(T-p)."""

    components = forest_order - edge_count
    minimum = None

    for component_counts in compositions(components, sides):
        if edge_count == 0:
            nontrivial_allocations = ((0,) * sides,)
        else:
            nontrivial_allocations = (
                allocation
                for total in range(
                    1, min(edge_count, components) + 1
                )
                for allocation in compositions(total, sides)
            )

        for nontrivial_counts in nontrivial_allocations:
            if any(
                nontrivial_counts[index]
                > component_counts[index]
                for index in range(sides)
            ):
                continue

            nontrivial_total = sum(nontrivial_counts)
            value = 0
            for size in range(1, sides + 1):
                for selected in itertools.combinations(
                    range(sides), size
                ):
                    order = forest_order - sum(
                        component_counts[index]
                        for index in selected
                    )
                    edges = edge_count - sum(
                        nontrivial_counts[index]
                        for index in selected
                    )
                    remaining_rank = 4 - size
                    if remaining_rank == 3:
                        value += independent_three_minimum(
                            order,
                            edges,
                            nontrivial_total,
                        )
                    elif remaining_rank == 2:
                        value += choose(order, 2) - edges
                    elif remaining_rank == 1:
                        value += order
                    elif remaining_rank == 0:
                        value += 1

            if minimum is None or value < minimum:
                minimum = value

    return minimum


def dense_certificate(
    *,
    forest_order,
    sides,
    alpha,
    path_h,
    first_edge,
    expected_cells,
    expected_margin,
    expected_derivative,
    expected_extras=None,
):
    W = sp.symbols("W", nonnegative=True)
    parameter = sp.symbols("parameter", nonnegative=True)
    rows = []

    if expected_extras is None:
        expected_extras = EXPECTED_EXTRAS[sides]
    assert {
        edge_count: branch_extra(
            forest_order, sides, edge_count
        )
        for edge_count in range(forest_order)
    } == expected_extras

    for edge_count in range(first_edge, forest_order):
        extra = expected_extras[edge_count]
        a = (
            comb(forest_order, 3)
            - edge_count * (forest_order - 2)
            + W
        )
        base_b = (
            comb(forest_order, 4)
            - edge_count * comb(forest_order - 2, 2)
            + W * (forest_order - 4)
            + comb(edge_count, 2)
        )
        b_lower = base_b - comb(edge_count, 3)
        h_switch = sp.factor(
            (
                path_h
                - extra
                - b_lower.subs(W, 0)
            )
            / (forest_order - 4)
        )

        w_low = sp.Rational(
            max(0, 2 * edge_count - forest_order)
        )
        w_high = sp.Rational(comb(edge_count, 2))
        line_switch = sp.Rational(edge_count, 2)
        points = {w_low, w_high}
        if w_low < line_switch < w_high:
            points.add(line_switch)
        if w_low < h_switch < w_high:
            points.add(h_switch)
        points = sorted(points)
        intervals = (
            [(points[0], points[0])]
            if len(points) == 1
            else list(zip(points, points[1:]))
        )

        for low, high in intervals:
            midpoint = (low + high) / 2
            connected_lower = (
                sp.S.Zero
                if edge_count == 0 or midpoint <= line_switch
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

            assert (
                2 * comb(forest_order, 3)
                - 22 * path_h
                < 0
            )

            for name, expression in (
                ("margin", lower),
                ("h-derivative", h_derivative),
            ):
                if low == high:
                    coefficients = [
                        sp.factor(expression.subs(W, low))
                    ]
                else:
                    mapped = sp.expand(
                        expression.subs(
                            W,
                            low + (high - low) * parameter,
                        )
                    )
                    coefficients = (
                        univariate_bernstein_coefficients(
                            mapped, parameter
                        )
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
    assert len(margin_rows) == expected_cells
    assert len(derivative_rows) == expected_cells
    assert margin_minimum == expected_margin
    assert derivative_minimum == expected_derivative
    return expected_cells, margin_minimum, derivative_minimum


def degree_two_certificate():
    sharp_inputs = two_component_order_22_bounds()
    sparse = sparse_enumeration(
        20,
        2,
        5,
        78,
        {
            0: 21,
            1: 38,
            2: 140,
            3: 384,
            4: 1140,
            5: 3016,
        },
        {
            0: 141721515,
            1: 128928852,
            2: 116815689,
            3: 105794511,
            4: 95896279,
            5: 86905899,
        },
    )
    dense = dense_certificate(
        forest_order=20,
        sides=2,
        alpha=sp.Rational(2282, 1003),
        path_h=sp.Integer(4012),
        first_edge=6,
        expected_cells=32,
        expected_margin=sp.Rational(1357539327, 1003),
        expected_derivative=sp.Rational(23954882, 1003),
    )
    return sharp_inputs, sparse, dense


def degree_three_certificate():
    sparse = sparse_enumeration(
        19,
        3,
        4,
        31,
        {
            0: 210,
            1: 513,
            2: 2142,
            3: 6627,
            4: 21087,
        },
        {
            0: 109431360,
            1: 101897811,
            2: 96284565,
            3: 90844039,
            4: 86710113,
        },
    )
    dense = dense_certificate(
        forest_order=19,
        sides=3,
        alpha=sp.Rational(72, 35),
        path_h=sp.Integer(3876),
        first_edge=5,
        expected_cells=29,
        expected_margin=sp.Integer(1982037),
        expected_derivative=sp.Rational(765358, 35),
    )
    return sparse, dense


def degree_four_certificate():
    return dense_certificate(
        forest_order=18,
        sides=4,
        alpha=sp.Rational(72, 35),
        path_h=sp.Integer(3876),
        first_edge=0,
        expected_cells=30,
        expected_margin=sp.Rational(61886448, 5),
        expected_derivative=sp.Rational(174768, 7),
    )


def main():
    ratios = order_22_forest_ratios()
    degree_two = degree_two_certificate()
    degree_three = degree_three_certificate()
    degree_four = degree_four_certificate()
    print(
        "rank-6 strong inequality at every order-23 root "
        "of degree two, three, or four: CERTIFIED"
    )
    print("order-22 forest coefficient ratios:", ratios)
    print("degree-two:", degree_two)
    print("degree-three:", degree_three)
    print("degree-four dense cells:", degree_four)


if __name__ == "__main__":
    main()
