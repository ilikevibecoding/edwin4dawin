#!/usr/bin/env python3
"""Exact isolate-monotonicity certificate for the rank-6 terminal margin.

For a tree core C of order at least 16 and a related root-deleted
forest H, let D_s=(1+x)^s I(C;x).  If

    x_s=i_3(D_s), y_s=i_4(D_s), z_s=i_5(D_s),
    u=i_3(H), v=i_4(H),

define

    S_s = x_s^2 + (y_s+u)^2 + 2*x_s*(2*y_s+u)
          + (26*x_s+2*(y_s+u))*(z_s+v)
          - 22*y_s*(y_s+u).

This script certifies S_s>=S_0 for every integer s>=0 under the exact
coefficient and rooted inequalities available for tree cores.
"""

from __future__ import annotations

from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from explore_rank6_terminal_isolate_monotonicity import (
    raw_forward_differences,
)


CORE_ORDER = 20
D_CEILING = sp.Rational(1559, 3575)


def nonnegative_coefficients(expression, variables):
    return all(
        coefficient >= 0
        for _, coefficient in sp.Poly(
            sp.expand(expression), *variables
        ).terms()
    )


def root_endpoints():
    switch = (1 + D_CEILING) / 2
    return (
        ("half_low", sp.Rational(1, 2), sp.Rational(1, 2)),
        ("half_switch", switch, sp.Rational(1, 2)),
        ("cross_upper", sp.S.One, 1 - D_CEILING / 2),
    )


def coefficient_sectors(box_variables):
    _, W, _ = box_variables
    return (
        ("full", W, "extension"),
    )


def tree_coefficient_map(
    box_variables, rooted_endpoint, coefficient_sector
):
    """Map the exact tree coefficient cone to a rational unit box."""

    T, W, A = box_variables
    root_name, r_value, q_value = rooted_endpoint
    sector_name, w_parameter, upper_bound = coefficient_sector
    order = sp.Rational(CORE_ORDER, 1) / T

    # For a tree, c2=C(n-1,2).  The path and star bounds on c3 give
    # 3/(n-3) <= w=c2/c3 <= 3(n-1)/((n-3)(n-4)).
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / (
        (order - 3) * (order - 4)
    )
    w = sp.factor(w_low + (w_high - w_low) * w_parameter)

    # Rank-3 reserve gives the lower endpoint for X=c3/c4.  Two valid
    # upper bounds are used on overlapping halves of the w interval:
    # the two-extension inequality near the star face, and the
    # coefficientwise path minimum near the path face.
    x_low = 8 * w / (6 - w)
    if upper_bound == "extension":
        x_high = 4 * w / (3 * (1 - w))
    elif upper_bound == "path":
        c2_exact = (order - 1) * (order - 2) / 2
        path_c4 = (
            (order - 3)
            * (order - 4)
            * (order - 5)
            * (order - 6)
            / 24
        )
        x_high = c2_exact / (w * path_c4)
    else:
        raise ValueError(upper_bound)
    X = sp.factor(x_low + (x_high - x_low) * A)

    # Normalize c3=1.  The three lower coefficients are then exact
    # functions of n and w.
    c1 = sp.factor(
        2 * order * w / ((order - 1) * (order - 2))
    )
    c0 = sp.factor(
        2 * w / ((order - 1) * (order - 2))
    )

    return f"{root_name}/{sector_name}", (
        c0,
        c1,
        w,
        sp.S.One,
        1 / X,
        (1 - D_CEILING) / X**2,
        r_value,
        q_value / X,
    )


def certify_patch(coefficients, maximum_depth=24):
    queue = deque([(coefficients, 0)])
    leaves = 0
    maximum_seen = 0
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            maximum_seen = max(maximum_seen, depth)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved Bernstein patch: minimum={minimum}, "
                f"index={index}, depth={depth}"
            )
        # Cycle through X,w,y,c0 endpoint variables.
        axis = depth % patch.ndim
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return leaves, maximum_seen


def positive_fraction(expression, box_variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    midpoint = {
        variable: sp.Rational(1, 2)
        for variable in box_variables
    }
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    degrees, coefficients = tensor_bernstein_fast(
        sp.expand(denominator), box_variables
    )
    minimum, index = minimum_with_index(coefficients)
    if minimum < 0:
        raise AssertionError(
            "coefficient-map denominator lacks a positive Bernstein "
            f"certificate: degrees={degrees}, minimum={minimum}, "
            f"index={index}, denominator={sp.factor(denominator)}"
        )
    assert denominator.subs(midpoint) > 0
    return numerator, denominator


def cleared_polynomial(
    raw,
    coefficient_variables,
    box_variables,
    rooted_endpoint,
    coefficient_sector,
):
    root_name, mapped_coefficients = tree_coefficient_map(
        box_variables, rooted_endpoint, coefficient_sector
    )
    fractions = [
        positive_fraction(expression, box_variables)
        for expression in mapped_coefficients
    ]
    terms = sp.Poly(raw, *coefficient_variables).terms()
    maximum_powers = [
        max(monomial[index] for monomial, _ in terms)
        for index in range(len(coefficient_variables))
    ]

    # Multiply by a (possibly over-cleared) common positive denominator
    # term by term.  This avoids expensive multivariate rational
    # simplification while preserving the sign on the open unit box.
    numerator = sp.S.Zero
    for monomial, coefficient in terms:
        term = coefficient
        for index, power in enumerate(monomial):
            mapped_numerator, mapped_denominator = fractions[index]
            term *= mapped_numerator**power
            term *= mapped_denominator ** (
                maximum_powers[index] - power
            )
        numerator += term
    return root_name, sp.expand(numerator)


def main() -> int:
    differences, coefficient_variables = raw_forward_differences()
    c0, c1, c2, c3, c4, c5, u, v = coefficient_variables

    # Increasing c5 (equivalently decreasing D) and increasing the
    # rooted v coefficient can only increase every forward difference.
    for difference in differences:
        assert nonnegative_coefficients(
            sp.diff(difference, c5), coefficient_variables
        )
        assert nonnegative_coefficients(
            sp.diff(difference, v), coefficient_variables
        )

    # Differences 6 through 10 are already coefficientwise nonnegative.
    for difference in differences[5:]:
        assert nonnegative_coefficients(
            difference, coefficient_variables
        )

    box_variables = sp.symbols("T W A", nonnegative=True)

    total_leaf_coefficients = 0
    for order, raw in enumerate(differences[:5], start=1):
        order_total = 0
        for rooted_endpoint in root_endpoints():
            for coefficient_sector in coefficient_sectors(
                box_variables
            ):
                print(
                    f"Delta^{order} {rooted_endpoint[0]}/"
                    f"{coefficient_sector[0]}: "
                    "building exact numerator",
                    flush=True,
                )
                label, polynomial = cleared_polynomial(
                    raw,
                    coefficient_variables,
                    box_variables,
                    rooted_endpoint,
                    coefficient_sector,
                )
                degrees, coefficients = tensor_bernstein_fast(
                    polynomial, box_variables
                )
                initial_minimum, initial_index = minimum_with_index(
                    coefficients
                )
                leaves, maximum_depth = certify_patch(coefficients)
                count = leaves * coefficients.size
                order_total += count
                print(
                    f"Delta^{order} {label}: degrees={degrees} "
                    f"initial_minimum={initial_minimum} "
                    f"initial_index={initial_index} "
                    f"leaves={leaves} max_depth={maximum_depth} "
                    f"leaf_coefficients={count:,}",
                    flush=True,
                )
        total_leaf_coefficients += order_total
        print(
            f"Delta^{order}: PASS "
            f"leaf_coefficients={order_total:,}",
            flush=True,
        )

    print(
        "rank-6 terminal isolate monotonicity: PASS "
        f"leaf_coefficients={total_leaf_coefficients:,}; "
        "Delta^6..Delta^10 coefficientwise"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
