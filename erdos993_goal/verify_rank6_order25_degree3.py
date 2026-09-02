#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at degree-three roots of order 25.

Put H=T-p and F=T-N[p].  Then |H|=24 and |F|=21.  The cases
e(F)=0,1 are enumerated structurally.  For e(F)>=2, exact edge,
wedge, and connected-triple bounds for F are combined with a lower
bound on i4(H) coming from the three rooted branches.
"""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank6_all_roots_n26 import (
    compositions,
    univariate_bernstein_coefficients,
)
from verify_rank6_all_roots_n27 import add, multiply, strong


def coefficient_ratios():
    # H is a forest of order 24.  The sharp forest i3/i2 ratio and
    # two successive two-extension inequalities give these bounds.
    ratio_32 = sp.Rational(21 * 20, 3 * 23)
    ratio_43 = sp.factor(
        sp.Rational(3, 4) * (ratio_32 - 1)
    )
    ratio_54 = sp.factor(
        sp.Rational(4, 5) * ratio_43
        - sp.Rational(3, 5)
    )
    assert ratio_32 == sp.Rational(140, 23)
    assert ratio_43 == sp.Rational(351, 92)
    assert ratio_54 == sp.Rational(282, 115)
    return ratio_32, ratio_43, ratio_54


def sparse_cases():
    """Enumerate F=21K1 and F=K2+19K1 exactly."""

    rows = []
    for edge_count in (0, 1):
        isolates = 21 - 2 * edge_count
        nontrivial = (1, 2, 1) if edge_count else (1,)
        forest = multiply(
            nontrivial,
            tuple(
                comb(isolates, rank)
                for rank in range(min(5, isolates) + 1)
            ),
        )
        minimum = None
        witness = None
        count = 0

        edge_sides = range(3) if edge_count else (None,)
        for edge_side in edge_sides:
            for isolate_counts in compositions(isolates, 3):
                root_deleted = (1,)
                for side, side_isolates in enumerate(
                    isolate_counts
                ):
                    side_full = multiply(
                        (
                            (1, 2, 1)
                            if edge_count and side == edge_side
                            else (1,)
                        ),
                        tuple(
                            comb(side_isolates, rank)
                            for rank in range(
                                min(5, side_isolates) + 1
                            )
                        ),
                    )
                    side_deleted = (
                        (1, 1)
                        if edge_count and side == edge_side
                        else (1,)
                    )
                    side_tree = add(
                        side_full, (0,) + side_deleted
                    )
                    root_deleted = multiply(
                        root_deleted, side_tree
                    )

                whole = add(root_deleted, (0,) + forest)
                value = strong(whole, root_deleted)
                count += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (edge_side, isolate_counts)

        rows.append((edge_count, count, minimum, witness))

    assert rows == [
        (0, 253, 293646220, (None, (7, 7, 7))),
        (1, 630, 306392192, (0, (5, 7, 7))),
    ]
    return rows


def branch_extra(edge_count):
    """One-center contributions to i4(H), minimized over 3 sides."""

    forest_order = 21
    components = forest_order - edge_count
    return min(
        sum(
            (
                comb(forest_order - count - 2, 3)
                if forest_order - count - 2 >= 3
                else 0
            )
            for count in component_counts
        )
        for component_counts in compositions(components, 3)
    )


def dense_certificate():
    """Certify every 2<=e(F)<=20 by exact Bernstein cells."""

    m = 21
    W = sp.symbols("W", nonnegative=True)
    parameter = sp.symbols("parameter", nonnegative=True)
    alpha = sp.Rational(282, 115)
    path_h = sp.Integer(comb(21, 4))
    rows = []

    for edge_count in range(2, 21):
        extra = branch_extra(edge_count)
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
                - (b_lower + extra).subs(W, 0)
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

        intervals = list(zip(points, points[1:]))
        if not intervals:
            intervals = [(w_low, w_high)]

        for low, high in intervals:
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

            # With k=i5(H)>=alpha*h, b<=b_upper, and
            # h>=h_lower, this is a lower bound for S6.  Its
            # h-derivative is certified positive on the same cell.
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

            # The coefficient of b in the exact lower expression is
            # 2a-22h<0, so using b_upper is valid.
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
    assert len(margin_rows) == 44
    assert len(derivative_rows) == 44
    assert min(row[4] for row in margin_rows) == sp.Rational(
        823451544, 115
    )
    assert min(
        row[4] for row in derivative_rows
    ) == sp.Rational(843702, 23)
    return (
        len(margin_rows),
        min(row[4] for row in margin_rows),
        min(row[4] for row in derivative_rows),
    )


def main():
    ratios = coefficient_ratios()
    sparse = sparse_cases()
    dense = dense_certificate()
    print(
        "rank-6 strong inequality at every order-25 "
        "degree-three root: CERTIFIED"
    )
    print("forest coefficient ratios:", ratios)
    print("sparse cases:", sparse)
    print("dense cells:", dense)


if __name__ == "__main__":
    main()
