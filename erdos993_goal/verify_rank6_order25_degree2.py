#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at degree-two roots of order 25.

For F=T-N[p], |F|=22.  Forests with at most nine edges are enumerated
through distinct rooted-component polynomial states.  Forests with at
least ten edges are handled by an exact edge/wedge/connected-triple
cone and a sharpened two-branch contribution to i4(T-p).
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


EXPECTED_TYPE_COUNTS = {
    1: 1,
    2: 2,
    3: 4,
    4: 9,
    5: 20,
    6: 48,
    7: 114,
    8: 283,
    9: 699,
}

EXPECTED_SPARSE_COUNTS = {
    0: 23,
    1: 42,
    2: 156,
    3: 432,
    4: 1296,
    5: 3472,
    6: 9696,
    7: 25532,
    8: 67792,
    9: 174710,
}

EXPECTED_SPARSE_MINIMA = {
    0: 370162595,
    1: 343497880,
    2: 317981113,
    3: 294459328,
    4: 272800355,
    5: 252814275,
    6: 235359813,
    7: 219314445,
    8: 206144421,
    9: 195187888,
}


def coefficient_ratios():
    ratio_32 = sp.Rational(21 * 20, 3 * 23)
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
        sp.Rational(140, 23),
        sp.Rational(351, 92),
        sp.Rational(282, 115),
    )
    return ratio_32, ratio_43, ratio_54


def sparse_enumeration(maximum_edges=9):
    """Enumerate every rooted-component state with e(F)<=9."""

    types, per_edge = rooted_branch_types(maximum_edges)
    assert per_edge == EXPECTED_TYPE_COUNTS

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
    assert len(multisets) == 3771

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
        isolates = 22 - used_vertices
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
            (0, 1), repeat=len(indices)
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

    assert counts == EXPECTED_SPARSE_COUNTS
    assert minima == EXPECTED_SPARSE_MINIMA
    assert all(value > 0 for value in minima.values())
    return len(multisets), counts, minima


def choose(value, rank):
    return comb(value, rank) if value >= rank >= 0 else 0


def independent_three_minimum(order, edges, component_cap):
    """A forest i3 lower bound with an edge-bearing component cap."""

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
    """Lower bound on all nonzero center-inclusion terms of i4(T-p)."""

    m = 22
    components = m - edge_count
    if edge_count == 0:
        return min(
            choose(m - first - 2, 3)
            + choose(m - (components - first) - 2, 3)
            for first in range(components + 1)
        )

    values = []
    for first_components in range(components + 1):
        second_components = components - first_components
        for first_nontrivial in range(
            min(first_components, edge_count) + 1
        ):
            for second_nontrivial in range(
                min(
                    second_components,
                    edge_count - first_nontrivial,
                )
                + 1
            ):
                nontrivial = (
                    first_nontrivial + second_nontrivial
                )
                if not 1 <= nontrivial <= edge_count:
                    continue

                first_term = independent_three_minimum(
                    m - first_components,
                    edge_count - first_nontrivial,
                    nontrivial,
                )
                second_term = independent_three_minimum(
                    m - second_components,
                    edge_count - second_nontrivial,
                    nontrivial,
                )
                both_centers = (
                    choose(edge_count, 2)
                    - (edge_count - nontrivial)
                )
                values.append(
                    first_term + second_term + both_centers
                )
    return min(values)


EXPECTED_EXTRAS = {
    10: 907,
    11: 999,
    12: 1091,
    13: 1197,
    14: 1303,
    15: 1424,
    16: 1545,
    17: 1682,
    18: 1819,
    19: 1973,
    20: 2127,
    21: 2299,
}


def dense_certificate():
    """Certify every 10<=e(F)<=21 in 26 exact W-cells."""

    m = 22
    W = sp.symbols("W", nonnegative=True)
    parameter = sp.symbols("parameter", nonnegative=True)
    alpha = sp.Rational(282, 115)
    path_h = sp.Integer(comb(21, 4))
    rows = []

    assert {
        edge_count: branch_extra(edge_count)
        for edge_count in EXPECTED_EXTRAS
    } == EXPECTED_EXTRAS

    for edge_count, extra in EXPECTED_EXTRAS.items():
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
    assert len(margin_rows) == 26
    assert len(derivative_rows) == 26
    assert margin_minimum == sp.Rational(
        101907036, 115
    ), margin_minimum
    assert derivative_minimum == sp.Rational(
        13443668, 345
    ), derivative_minimum
    return (
        len(margin_rows),
        margin_minimum,
        derivative_minimum,
    )


def main():
    ratios = coefficient_ratios()
    sparse = sparse_enumeration()
    dense = dense_certificate()
    print(
        "rank-6 strong inequality at every order-25 "
        "degree-two root: CERTIFIED"
    )
    print("forest coefficient ratios:", ratios)
    print("sparse multisets:", sparse[0])
    print("sparse counts:", sparse[1])
    print("sparse minima:", sparse[2])
    print("dense cells:", dense)


if __name__ == "__main__":
    main()
