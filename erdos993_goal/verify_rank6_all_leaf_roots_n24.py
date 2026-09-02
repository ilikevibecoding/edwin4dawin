#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every leaf of order 24.

The certificate retains the complete integral excess-degree partition.
It also uses the sharp maximum of the weighted edge sum over all trees:
for positive weights of total W and maximum M, the sum of w_u*w_v over
tree edges is at most M*(W-M).
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp

from explore_rank6_root_ratio_moment_certificate import (
    normalized_relaxation,
)


ORDER = 24
TOTAL_EXCESS = ORDER - 2


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


def weighted_tree_edge_upper(weights):
    """Sharp universal upper bound for a product-weighted tree."""

    if len(weights) <= 1:
        return 0
    total = sum(weights)
    maximum = max(weights)
    return maximum * (total - maximum)


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


def integral_scaled_polynomial(expression, variables):
    """Return 36*expression and certify that all coefficients are integral."""

    expanded = sp.Poly(sp.expand(36 * expression), *variables)
    assert all(coefficient.q == 1 for coefficient in expanded.coeffs())
    return expanded.as_expr()


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

    common = {
        u: sp.Rational(1, ORDER),
        second: s2 / n**2,
        third: s3 / n**3,
        root: 0,
        edge_correlation: edge / n**2,
        root_edge_correlation: 0,
        connected_four: (loss + surviving) / n**4,
        connected_four_loss: loss / n**4,
    }
    support_one = sp.factor(
        moments.subs(
            common
            | {
                neighbor_first: sp.Rational(1, ORDER),
                neighbor_second: sp.Rational(1, ORDER**2),
            }
        )
        * n**9
    )
    support_branch = sp.factor(
        moments.subs(
            common
            | {
                neighbor_first: support / n,
                neighbor_second: support**2 / n**2,
            }
        )
        * n**9
    )

    support_one_integer = integral_scaled_polynomial(
        support_one, (s2, s3, edge, loss, surviving)
    )
    support_branch_integer = integral_scaled_polynomial(
        support_branch,
        (s2, s3, edge, loss, surviving, support),
    )
    assert len(
        sp.Poly(
            support_one_integer,
            s2,
            s3,
            edge,
            loss,
            surviving,
        ).terms()
    ) == 18
    assert len(
        sp.Poly(
            support_branch_integer,
            s2,
            s3,
            edge,
            loss,
            surviving,
            support,
        ).terms()
    ) == 30
    return (
        support_one_integer,
        support_branch_integer,
        (s2, s3, edge, loss, surviving),
        (s2, s3, edge, loss, surviving, support),
    )


def support_one_certificate(polynomial, variables):
    """The leaf support has excess one."""

    minimum = None
    witness = None
    count = 0
    far_total = TOTAL_EXCESS - 1
    for far_weights in integer_partitions(far_total):
        weights = (1,) + far_weights
        s2 = sum(weight**2 for weight in weights)
        s3 = sum(weight**3 for weight in weights)
        edge = weighted_tree_edge_upper(weights)
        far_second = sum(weight**2 for weight in far_weights)
        loss = Fraction(far_second, 2) + far_total
        stars = sum(
            comb(weight + 1, 4)
            for weight in far_weights
        )
        surviving = max(ORDER - 5, stars)

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

    assert count == 792
    assert minimum == 65472928
    assert witness == (
        (4,) + (1,) * 17,
        34,
        82,
        72,
        Fraction(75, 2),
        19,
    )
    return count, minimum, witness


def support_branch_certificate(polynomial, variables):
    """The leaf support has excess at least two."""

    minimum = None
    witness = None
    count = 0
    for support in range(2, TOTAL_EXCESS + 1):
        far_total = TOTAL_EXCESS - support
        for far_weights in integer_partitions(far_total):
            weights = (support,) + far_weights
            s2 = sum(weight**2 for weight in weights)
            s3 = sum(weight**3 for weight in weights)
            edge = weighted_tree_edge_upper(weights)
            far_second = sum(
                weight**2 for weight in far_weights
            )
            loss = (
                Fraction(comb(support, 3))
                + Fraction(far_second, 2)
                + (support - 1) * far_total
            )
            stars = comb(support, 4) + sum(
                comb(weight + 1, 4)
                for weight in far_weights
            )
            surviving = max(ORDER - 5, stars)

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

    assert count == 2714
    assert minimum == 8404050
    assert witness == (
        7,
        (1,) * 15,
        64,
        358,
        105,
        Fraction(265, 2),
        35,
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
        "rank-6 strong inequality at every order-24 "
        "leaf root: CERTIFIED"
    )
    print("support excess one:", support_one)
    print("support excess at least two:", support_branch)


if __name__ == "__main__":
    main()
