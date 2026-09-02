#!/usr/bin/env python3
"""Certify the strong rank-6 inequality at every leaf from order 26.

The one-branch-vertex case is the already certified spider theorem
(paths are covered by the diameter-endpoint theorem).  A non-spider
rooted at a leaf has one of two forms:

* its support has degree two and there are at least two farther branch
  vertices;
* its support is a branch vertex and there is at least one farther
  branch vertex.

The two exact grouped-moment relaxations are certified below with
Bernstein coefficients.  No floating-point checks are used.
"""

from __future__ import annotations

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from explore_rank6_root_ratio_moment_certificate import (
    leaf_endpoint_polynomial,
    leaf_multibranch_endpoint_polynomial,
)


THRESHOLD = 26


def support_degree_two_certificate():
    polynomial, denominator, variables = leaf_endpoint_polynomial(
        THRESHOLD,
        support_excess=1,
        deleted_bound="star",
        edge_bound="bipartite",
    )
    assert denominator == 1
    v, far_second_ratio = variables
    unit = v / THRESHOLD
    far_mass = 1 - 3 * unit

    # At least two farther branch vertices imply at least two
    # positive integral excess-degree groups.  With fixed far mass,
    # its second moment is maximized by putting one unit in one group
    # and all remaining mass in the other.
    second_ratio_upper = sp.factor(
        ((far_mass - unit) ** 2 + unit**2) / far_mass**2
    )
    w = sp.symbols("w", nonnegative=True)
    rational = sp.cancel(
        polynomial.subs(
            far_second_ratio,
            second_ratio_upper * w,
        )
    )
    numerator, positive_denominator = sp.fraction(rational)
    assert sp.factor(positive_denominator) == (
        1954621324431360 * (3 * v - 26) ** 2
    )
    assert 3 * THRESHOLD - 26 != 0

    degrees, coefficients = tensor_bernstein_fast(
        sp.expand(numerator), (v, w)
    )
    minimum, index = minimum_with_index(coefficients)
    assert degrees == (11, 4)
    assert coefficients.size == 60
    assert minimum == sp.Rational(8079248870575, 3)
    assert all(value > 0 for value in coefficients.flat)
    return degrees, coefficients.size, minimum, index


def support_branch_certificate():
    polynomial, denominator, variables = (
        leaf_multibranch_endpoint_polynomial(
            THRESHOLD,
            "support2-far1",
            deleted_bound="component",
        )
    )
    assert denominator == 1
    degrees, coefficients = tensor_bernstein_fast(
        polynomial, variables
    )
    assert degrees == (9, 6, 2)
    assert coefficients.size == 210

    # The full box has one negative Bernstein coefficient but the
    # polynomial itself is positive.  Bisect first in v, then bisect
    # the upper v-half in the support/far mass split.
    lower_v, upper_v = split_bernstein_midpoint(coefficients, 0)
    upper_v_lower_mass, upper_v_upper_mass = (
        split_bernstein_midpoint(upper_v, 1)
    )
    patches = (
        (
            "v-low",
            lower_v,
            sp.Rational(4665618583705, 25019152952721408),
        ),
        (
            "v-high/mass-low",
            upper_v_lower_mass,
            sp.Rational(14277, 21208998746),
        ),
        (
            "v-high/mass-high",
            upper_v_upper_mass,
            sp.Rational(14680451, 21718014715904),
        ),
    )
    rows = []
    for name, patch, expected_minimum in patches:
        minimum, index = minimum_with_index(patch)
        assert minimum == expected_minimum
        assert minimum > 0
        rows.append((name, minimum, index))
    return degrees, coefficients.size, rows


def main():
    degree_two = support_degree_two_certificate()
    support_branch = support_branch_certificate()
    print("rank-6 strong inequality at every leaf, n>=26: CERTIFIED")
    print(
        "degree-two support:",
        f"degrees={degree_two[0]}",
        f"coefficients={degree_two[1]}",
        f"minimum={degree_two[2]}",
        f"index={degree_two[3]}",
    )
    print(
        "branch support:",
        f"degrees={support_branch[0]}",
        f"coefficients={support_branch[1]}",
    )
    for row in support_branch[2]:
        print(" patch", row)


if __name__ == "__main__":
    main()
