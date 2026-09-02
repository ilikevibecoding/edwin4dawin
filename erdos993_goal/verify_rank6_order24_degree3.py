#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at degree-three roots of order 24.

Put H=T-p and F=T-N[p].  Then |H|=23 and |F|=20.  All cases
e(F)<=2 are enumerated through rooted component types.  For e(F)>=3,
exact edge/wedge/connected-triple bounds are combined with all
one-, two-, and three-center contributions to i4(H).
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
    0: 993,
    1: 1060,
    2: 1116,
    3: 1185,
    4: 1253,
    5: 1321,
    6: 1402,
    7: 1482,
    8: 1562,
    9: 1656,
    10: 1749,
    11: 1842,
    12: 1950,
    13: 2057,
    14: 2164,
    15: 2287,
    16: 2409,
    17: 2531,
    18: 2670,
    19: 2808,
}


def coefficient_ratios():
    # H is a forest of order 23.  Start with the sharp i3/i2 path
    # ratio, then apply two successive two-extension inequalities.
    ratio_32 = sp.Rational(20 * 19, 3 * 22)
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
        sp.Rational(190, 33),
        sp.Rational(157, 44),
        sp.Rational(124, 55),
    )
    return ratio_32, ratio_43, ratio_54


def sparse_cases():
    """Enumerate every degree-three rooted state with e(F)<=2."""

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
        isolates = 20 - used_vertices
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
            range(3), repeat=len(indices)
        ):
            side_full = [(1,) for _ in range(3)]
            side_deleted = [(1,) for _ in range(3)]
            for index, side in zip(indices, side_choices):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolate_counts in compositions(isolates, 3):
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
        0: 231,
        1: 570,
        2: 2403,
    }
    assert minima == {
        0: 182187564,
        1: 171513944,
        2: 161835864,
    }
    assert all(value > 0 for value in minima.values())
    return len(multisets), counts, minima


def choose(value, rank):
    return comb(value, rank) if value >= rank >= 0 else 0


def independent_three_minimum(order, edges, component_cap):
    """Lower-bound i3 in a forest with capped nontrivial components."""

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
    """Minimize every nonzero center-inclusion term in i4(H)."""

    m = 20
    components = m - edge_count
    minimum = None

    for component_counts in compositions(components, 3):
        if edge_count == 0:
            nontrivial_allocations = ((0, 0, 0),)
        else:
            nontrivial_allocations = (
                allocation
                for total in range(
                    1, min(edge_count, components) + 1
                )
                for allocation in compositions(total, 3)
            )

        for nontrivial_counts in nontrivial_allocations:
            if any(
                nontrivial_counts[index]
                > component_counts[index]
                for index in range(3)
            ):
                continue

            nontrivial_total = sum(nontrivial_counts)

            # Select exactly one of the three branch centers.
            value = sum(
                independent_three_minimum(
                    m - component_counts[index],
                    edge_count - nontrivial_counts[index],
                    nontrivial_total,
                )
                for index in range(3)
            )

            # Select exactly two branch centers.
            value += sum(
                choose(
                    m
                    - component_counts[first]
                    - component_counts[second],
                    2,
                )
                - (
                    edge_count
                    - nontrivial_counts[first]
                    - nontrivial_counts[second]
                )
                for first in range(3)
                for second in range(first + 1, 3)
            )

            # Select all three centers.  One attachment vertex is
            # excluded from every component, leaving m-c=e vertices.
            value += edge_count

            if minimum is None or value < minimum:
                minimum = value

    return minimum


def dense_certificate():
    """Certify every 3<=e(F)<=19 in exact one-variable cells."""

    m = 20
    W = sp.symbols("W", nonnegative=True)
    parameter = sp.symbols("parameter", nonnegative=True)
    alpha = sp.Rational(124, 55)
    path_h = sp.Integer(comb(20, 4))
    rows = []

    assert {
        edge_count: branch_extra(edge_count)
        for edge_count in EXPECTED_EXTRAS
    } == EXPECTED_EXTRAS

    for edge_count in range(3, 20):
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

            # The exact expression decreases in b and increases in h
            # on each certified cell.
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
    assert len(margin_rows) == 35
    assert len(derivative_rows) == 35
    assert margin_minimum == sp.Rational(37031764, 5)
    assert derivative_minimum == sp.Rational(151772, 5)
    return (
        len(margin_rows),
        margin_minimum,
        derivative_minimum,
    )


def main():
    ratios = coefficient_ratios()
    sparse = sparse_cases()
    dense = dense_certificate()
    print(
        "rank-6 strong inequality at every order-24 "
        "degree-three root: CERTIFIED"
    )
    print("forest coefficient ratios:", ratios)
    print("sparse multisets:", sparse[0])
    print("sparse counts:", sparse[1])
    print("sparse minima:", sparse[2])
    print("dense cells:", dense)


if __name__ == "__main__":
    main()
