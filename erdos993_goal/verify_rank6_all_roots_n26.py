#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every root from order 26.

The only new work beyond the order-27 theorem is at order 26:

* degree one is the all-leaf theorem;
* degree at least four follows from the degree-sensitive ratio bound;
* degree three is handled by a forest ratio lemma plus 3,939 sparse
  rooted-component states;
* degree two is handled by a direct coefficient cone plus 6,362 sparse
  rooted-component states.
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
from verify_rank6_all_roots_n27 import (
    add,
    coefficient,
    degree_sensitive_bounds,
    multiply,
    rooted_branch_types,
    strong,
)


def univariate_bernstein_coefficients(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    power = [
        polynomial.coeff_monomial(variable**index)
        for index in range(degree + 1)
    ]
    return [
        sum(
            power[index]
            * sp.Rational(comb(position, index), comb(degree, index))
            for index in range(position + 1)
        )
        for position in range(degree + 1)
    ]


def degree_three_forest_ratio():
    # F has order 22.  For e(F)>=3, prove
    #
    #   i4(F)/i3(F) <= 9007/1961,
    #
    # the exact ratio required by the n=26 strong-margin cone.
    e, W, R = sp.symbols(
        "e W R", integer=True, nonnegative=True
    )
    a = sp.binomial(22, 3) - 20 * e + W
    b = (
        sp.binomial(22, 4)
        - e * sp.binomial(20, 2)
        + 18 * W
        + sp.binomial(e, 2)
        - R
    )
    margin = sp.expand(9007 * a - 1961 * b)
    line_lower = (2 * W**2 / e - W) / 3
    relaxed = sp.factor(margin.subs(R, line_lower))
    derivative = sp.factor(sp.diff(relaxed, W))
    assert sp.simplify(
        derivative
        - 2 * (3922 * W - 40417 * e) / (3 * e)
    ) == 0
    endpoint = sp.factor(
        relaxed.subs(W, e * (e - 1) / 2)
    )
    values = [
        endpoint.subs(e, edge_count)
        for edge_count in range(3, 22)
    ]
    assert min(values) == 20620
    assert all(value > 0 for value in values)

    x = sp.Rational(342, 115)
    y = sp.Rational(9007, 1961)
    normalized = sp.factor(
        2 * x + 1 - 24 * (y - x) / (1 + y)
    )
    assert normalized == 0
    return min(values), normalized


def compositions(total, parts, prefix=()):
    if parts == 1:
        yield prefix + (total,)
        return
    for first in range(total + 1):
        yield from compositions(
            total - first,
            parts - 1,
            prefix + (first,),
        )


def sparse_root_enumeration(
    forest_order,
    root_degree,
    maximum_edges,
    expected_counts,
    expected_minima,
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

        for side_choices in itertools.product(
            range(root_degree), repeat=len(indices)
        ):
            side_full = [(1,) for _ in range(root_degree)]
            side_deleted = [(1,) for _ in range(root_degree)]
            for index, side in zip(indices, side_choices):
                side_full[side] = multiply(
                    side_full[side], types[index][0]
                )
                side_deleted[side] = multiply(
                    side_deleted[side], types[index][1]
                )

            for isolate_counts in compositions(
                isolates, root_degree
            ):
                root_deleted = (1,)
                for side, isolate_count in enumerate(isolate_counts):
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

    assert per_edge == {
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
    assert counts == expected_counts
    assert minima == expected_minima
    assert all(value > 0 for value in minima.values())
    return counts, minima


def dense_degree_two_certificate():
    """Direct strong-margin cone for n=26, deg(p)=2, e(F)>=6."""

    # Put F=T-N[p], so |F|=23.  Let e,W,R be its edge, wedge,
    # and connected-three-edge counts.
    m = 23
    e_symbol, W = sp.symbols(
        "e W", integer=True, nonnegative=True
    )
    alpha = sp.Rational(53, 20)
    h_path = comb(22, 4)
    parameter = sp.symbols("parameter", nonnegative=True)
    rows = []

    for edge_count in range(6, 23):
        components = m - edge_count
        extra = min(
            (
                comb(21 - split, 3)
                if 21 - split >= 3
                else 0
            )
            + (
                comb(edge_count + split - 2, 3)
                if edge_count + split - 2 >= 3
                else 0
            )
            for split in range(components + 1)
        )

        a = comb(m, 3) - edge_count * (m - 2) + W
        base_b = (
            comb(m, 4)
            - edge_count * comb(m - 2, 2)
            + W * (m - 4)
            + comb(edge_count, 2)
        )
        b_lower = base_b - comb(edge_count, 3)
        h_switch = sp.Rational(
            h_path
            - extra
            - (
                comb(m, 4)
                - edge_count * comb(m - 2, 2)
                + comb(edge_count, 2)
                - comb(edge_count, 3)
            ),
            m - 4,
        )
        w_low = sp.Rational(max(0, 2 * edge_count - m))
        w_high = sp.Rational(comb(edge_count, 2))
        points = {w_low, w_high}
        line_switch = sp.Rational(edge_count, 2)
        if w_low < line_switch < w_high:
            points.add(line_switch)
        if w_low < h_switch < w_high:
            points.add(h_switch)
        points = sorted(points)

        for low, high in zip(points, points[1:]):
            midpoint = (low + high) / 2
            line_lower = (
                sp.S.Zero
                if midpoint <= line_switch
                else (
                    2 * W**2 / edge_count - W
                )
                / 3
            )
            b_upper = base_b - line_lower
            h_lower = (
                sp.Integer(h_path)
                if (b_lower + extra).subs(W, midpoint) <= h_path
                else b_lower + extra
            )

            # With z>=alpha*h, b<=b_upper, and h>=h_lower, the
            # following is a valid lower bound once its h derivative
            # is nonnegative.  Both polynomials are certified on the
            # exact W-cell.
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
                        len(coefficients),
                    )
                )

    margin_rows = [row for row in rows if row[3] == "margin"]
    derivative_rows = [
        row for row in rows if row[3] == "h-derivative"
    ]
    assert len(margin_rows) == 38
    assert len(derivative_rows) == 38
    assert min(row[4] for row in margin_rows) == sp.Rational(
        58050783, 10
    )
    assert min(row[4] for row in derivative_rows) == sp.Rational(
        250223, 5
    )
    return len(rows), min(row[4] for row in margin_rows)


def verify_dense_inputs():
    # Every 25-vertex forest H satisfies H4/H3>=65/16 and then
    # H5/H4>=53/20 by two successive two-extension inequalities.
    ratio_32 = sp.Rational(22 * 21, 3 * 24)
    ratio_43 = sp.factor(
        sp.Rational(3, 4) * (ratio_32 - 1)
    )
    ratio_54 = sp.factor(
        sp.Rational(4, 5) * ratio_43
        - sp.Rational(3, 5)
    )
    assert ratio_43 == sp.Rational(65, 16)
    assert ratio_54 == sp.Rational(53, 20)
    return ratio_32, ratio_43, ratio_54


def main():
    support_degree_two_certificate()
    support_branch_certificate()
    degree_sensitive_bounds()
    dense_inputs = verify_dense_inputs()
    degree_three = degree_three_forest_ratio()

    sparse_degree_three = sparse_root_enumeration(
        forest_order=22,
        root_degree=3,
        maximum_edges=2,
        expected_counts={0: 276, 1: 693, 2: 2970},
        expected_minima={
            0: 464752309,
            1: 441691344,
            2: 423183104,
        },
    )
    sparse_degree_two = sparse_root_enumeration(
        forest_order=23,
        root_degree=2,
        maximum_edges=5,
        expected_counts={
            0: 24,
            1: 44,
            2: 164,
            3: 456,
            4: 1374,
            5: 3700,
        },
        expected_minima={
            0: 577031455,
            1: 538717475,
            2: 503244720,
            3: 469719896,
            4: 438585712,
            5: 410263621,
        },
    )
    dense_degree_two = dense_degree_two_certificate()

    print("rank-6 strong inequality at every root, n>=26: CERTIFIED")
    print("dense coefficient ratios:", dense_inputs)
    print("degree-three forest ratio:", degree_three)
    print("degree-three sparse:", sparse_degree_three)
    print("degree-two sparse:", sparse_degree_two)
    print("degree-two dense:", dense_degree_two)


if __name__ == "__main__":
    main()
