#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every leaf of order 23.

The complete integral excess-degree partition is retained.  The new
ingredient is a degree-capacity upper bound for the weighted edge sum
of the positive-excess core.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp

from explore_rank6_root_ratio_moment_certificate import (
    normalized_relaxation,
)


ORDER = 23
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


def rooted_capacity_product_upper(weights):
    """Upper-bound the product-weighted edges using degree capacities.

    Root the positive-excess core at a maximum-weight vertex.  The
    root has at most w+1 child slots and every other vertex has at
    most w child slots.  Ignoring ancestry and incidence restrictions,
    rearrangement pairs the sorted child weights with the largest
    sorted parent slots.
    """

    if len(weights) <= 1:
        return 0
    root = max(range(len(weights)), key=lambda index: weights[index])
    children = sorted(
        (
            weight
            for index, weight in enumerate(weights)
            if index != root
        ),
        reverse=True,
    )
    slots = []
    for index, weight in enumerate(weights):
        multiplicity = weight + 1 if index == root else weight
        slots.extend([weight] * multiplicity)
    slots.sort(reverse=True)
    assert len(slots) >= len(children)
    return sum(
        child * parent
        for child, parent in zip(children, slots)
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


def integral_scaled_polynomial(expression, variables):
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


def certify_bound_directions(polynomial, variables, values):
    """Check the three one-sided substitutions at their worst corner."""

    substitution = dict(zip(variables, values))
    edge = variables[2]
    loss = variables[3]
    surviving = variables[4]

    # The edge derivative is convex-increasing in edge.  It is also
    # maximized by the loss upper bound and surviving lower bound.
    assert sp.diff(polynomial, edge, 2) == 792
    assert evaluate_polynomial(
        sp.diff(polynomial, edge),
        variables,
        values,
    ) < 0
    assert evaluate_polynomial(
        sp.diff(polynomial, loss),
        variables,
        values,
    ) < 0
    assert evaluate_polynomial(
        sp.diff(polynomial, surviving),
        variables,
        values,
    ) > 0

    # Keep this exact substitution live so a variable-order change
    # cannot silently invalidate the derivative checks.
    assert all(variable in substitution for variable in variables)


def support_one_certificate(polynomial, variables):
    minimum = None
    witness = None
    count = 0
    far_total = TOTAL_EXCESS - 1

    for far_weights in integer_partitions(far_total):
        weights = (1,) + far_weights
        s2 = sum(weight**2 for weight in weights)
        s3 = sum(weight**3 for weight in weights)
        edge = rooted_capacity_product_upper(weights)
        far_second = sum(weight**2 for weight in far_weights)
        loss = Fraction(far_second, 2) + far_total
        stars = sum(
            comb(weight + 1, 4)
            for weight in far_weights
        )
        surviving = max(ORDER - 5, stars)
        values = (s2, s3, edge, loss, surviving)
        certify_bound_directions(polynomial, variables, values)
        value = evaluate_polynomial(
            polynomial, variables, values
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

    assert count == 627
    assert minimum == 42104715
    assert witness == (
        (1,) * 20,
        21,
        21,
        20,
        Fraction(30),
        18,
    )
    return count, minimum, witness


def support_branch_certificate(polynomial, variables):
    minimum = None
    witness = None
    count = 0

    for support in range(2, TOTAL_EXCESS + 1):
        far_total = TOTAL_EXCESS - support
        for far_weights in integer_partitions(far_total):
            weights = (support,) + far_weights
            s2 = sum(weight**2 for weight in weights)
            s3 = sum(weight**3 for weight in weights)
            edge = rooted_capacity_product_upper(weights)
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
            values = (
                s2,
                s3,
                edge,
                loss,
                surviving,
                support,
            )
            certify_bound_directions(polynomial, variables, values)
            value = evaluate_polynomial(
                polynomial, variables, values
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

    assert count == 2087
    assert minimum == 1327662
    assert witness == (
        8,
        (2, 2, 2, 2, 1, 1, 1, 1, 1),
        85,
        549,
        104,
        Fraction(315, 2),
        70,
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
        "rank-6 strong inequality at every order-23 "
        "leaf root: CERTIFIED"
    )
    print("support excess one:", support_one)
    print("support excess at least two:", support_branch)


if __name__ == "__main__":
    main()
