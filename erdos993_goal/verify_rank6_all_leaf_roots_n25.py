#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every leaf of order 25.

The proof keeps the complete integral excess-degree partition instead
of relaxing its second and third moments independently.  There are
only 1,002 partitions when the leaf support has excess one, and 3,506
support/partition pairs when its excess is at least two.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp

from explore_rank6_root_ratio_moment_certificate import (
    normalized_relaxation,
)


ORDER = 25


def integer_partitions(total, maximum=None, prefix=()):
    if total == 0:
        yield prefix
        return
    if maximum is None:
        maximum = total
    for first in range(min(total, maximum), 0, -1):
        yield from integer_partitions(
            total - first,
            first,
            prefix + (first,),
        )


def bipartite_product_upper(weights):
    """Max A*(sum-A) over all subset sums of integral weights."""

    reachable = 1
    for weight in weights:
        reachable |= reachable << weight
    total = sum(weights)
    return max(
        split * (total - split)
        for split in range(total + 1)
        if (reachable >> split) & 1
    )


def evaluate_polynomial(polynomial, variables, values):
    result = Fraction(0)
    for monomial, coefficient in sp.Poly(
        polynomial, *variables
    ).terms():
        term = Fraction(int(coefficient))
        for power, value in zip(monomial, values):
            term *= Fraction(value) ** power
        result += term
    return result


def scaled_margin_polynomials():
    moments, variables = normalized_relaxation()
    (
        u,
        second,
        third,
        root,
        edge_correlation,
        neighbor_first,
        neighbor_second,
        root_edge_correlation,
        connected_four,
        connected_four_loss,
    ) = variables
    s2, s3, edge, loss, surviving, support = sp.symbols(
        "s2 s3 edge loss surviving support"
    )
    n = sp.Integer(ORDER)

    support_one = sp.factor(
        moments.subs(
            {
                u: sp.Rational(1, ORDER),
                second: s2 / n**2,
                third: s3 / n**3,
                root: 0,
                edge_correlation: edge / n**2,
                neighbor_first: sp.Rational(1, ORDER),
                neighbor_second: sp.Rational(
                    1, ORDER**2
                ),
                root_edge_correlation: 0,
                connected_four: (
                    loss + surviving
                )
                / n**4,
                connected_four_loss: loss / n**4,
            }
        )
        * n**9
    )
    expected_one_numerator = (
        792 * loss * edge
        - 7884 * loss * s2
        + 132 * loss * s3
        - 4482624 * loss
        - 72 * surviving * edge
        + 1188 * surviving * s2
        - 12 * surviving * s3
        + 1651200 * surviving
        + 540 * edge**2
        - 12384 * edge * s2
        + 168 * edge * s3
        - 23030760 * edge
        + 24921 * s2**2
        - 1866 * s2 * s3
        + 78746388 * s2
        + 13 * s3**2
        - 3563260 * s3
        + 3774034672
    )
    assert sp.factor(
        support_one - expected_one_numerator / 36
    ) == 0

    support_branch = sp.factor(
        moments.subs(
            {
                u: sp.Rational(1, ORDER),
                second: s2 / n**2,
                third: s3 / n**3,
                root: 0,
                edge_correlation: edge / n**2,
                neighbor_first: support / n,
                neighbor_second: support**2 / n**2,
                root_edge_correlation: 0,
                connected_four: (
                    loss + surviving
                )
                / n**4,
                connected_four_loss: loss / n**4,
            }
        )
        * n**9
    )
    expected_branch_numerator = (
        792 * loss * edge
        - 7884 * loss * s2
        + 132 * loss * s3
        - 432 * loss * support**2
        + 17712 * loss * support
        - 4499904 * loss
        - 72 * surviving * edge
        + 1188 * surviving * s2
        - 12 * surviving * s3
        - 432 * surviving * support**2
        + 17712 * surviving * support
        + 1633920 * surviving
        + 540 * edge**2
        - 12384 * edge * s2
        + 168 * edge * s3
        - 432 * edge * support**2
        - 163728 * edge * support
        - 22866600 * edge
        + 24921 * s2**2
        - 1866 * s2 * s3
        + 50112 * s2 * support**2
        - 149472 * s2 * support
        + 78845748 * s2
        + 13 * s3**2
        - 144 * s3 * support**2
        - 24336 * s3 * support
        - 3538780 * s3
        + 53280144 * support**2
        - 896382864 * support
        + 4617137392
    )
    assert sp.factor(
        support_branch - expected_branch_numerator / 36
    ) == 0
    return (
        expected_one_numerator,
        expected_branch_numerator,
        (s2, s3, edge, loss, surviving),
        (s2, s3, edge, loss, surviving, support),
    )


def support_one_certificate(polynomial, variables):
    """The support has excess one; the remaining excess sums to 22."""

    minimum = None
    witness = None
    count = 0
    for far_weights in integer_partitions(22):
        weights = (1,) + far_weights
        s2 = sum(weight**2 for weight in weights)
        s3 = sum(weight**3 for weight in weights)
        edge = bipartite_product_upper(weights)

        far_second = sum(
            weight**2 for weight in far_weights
        )
        # Exact local connected-four loss upper for support excess 1.
        loss = Fraction(far_second, 2) + 22
        stars = sum(
            comb(weight + 1, 4)
            for weight in far_weights
        )
        # T-p has order 24, hence at least 20 connected four-edge
        # subtrees; all displayed stars survive as well.
        surviving = max(20, stars)

        value = evaluate_polynomial(
            polynomial,
            variables,
            (s2, s3, edge, loss, surviving),
        ) / 36
        count += 1
        if minimum is None or value < minimum:
            minimum = value
            witness = (
                far_weights,
                s2,
                s3,
                edge,
                loss,
                surviving,
            )

    assert count == 1002
    assert minimum == 64742359
    assert witness == (
        (1,) * 22,
        23,
        23,
        132,
        Fraction(33),
        20,
    )
    return count, minimum, witness


def support_branch_certificate(polynomial, variables):
    """The support excess is 2,...,23."""

    minimum = None
    witness = None
    count = 0
    for support in range(2, 24):
        far_total = 23 - support
        for far_weights in integer_partitions(far_total):
            weights = (support,) + far_weights
            s2 = sum(weight**2 for weight in weights)
            s3 = sum(weight**3 for weight in weights)
            edge = bipartite_product_upper(weights)
            far_second = sum(
                weight**2 for weight in far_weights
            )

            # Exact local expansion used by the branch-support leaf
            # cone, now evaluated on the integral moment partition.
            loss = (
                Fraction(comb(support, 3))
                + Fraction(far_second, 2)
                + (support - 1) * far_total
            )
            stars = comb(support, 4) + sum(
                comb(weight + 1, 4)
                for weight in far_weights
            )
            surviving = max(20, stars)

            value = evaluate_polynomial(
                polynomial,
                variables,
                (
                    s2,
                    s3,
                    edge,
                    loss,
                    surviving,
                    support,
                ),
            ) / 36
            count += 1
            if minimum is None or value < minimum:
                minimum = value
                witness = (
                    support,
                    far_weights,
                    s2,
                    s3,
                    edge,
                    loss,
                    surviving,
                )

    assert count == 3506
    assert minimum == 22712391
    assert witness == (
        5,
        (1,) * 18,
        43,
        143,
        132,
        Fraction(91),
        20,
    )
    return count, minimum, witness


def main():
    (
        support_one_polynomial,
        support_branch_polynomial,
        support_one_variables,
        support_branch_variables,
    ) = scaled_margin_polynomials()
    support_one = support_one_certificate(
        support_one_polynomial, support_one_variables
    )
    support_branch = support_branch_certificate(
        support_branch_polynomial,
        support_branch_variables,
    )
    print(
        "rank-6 strong inequality at every order-25 "
        "leaf root: CERTIFIED"
    )
    print("support excess one:", support_one)
    print("support excess at least two:", support_branch)


if __name__ == "__main__":
    main()
