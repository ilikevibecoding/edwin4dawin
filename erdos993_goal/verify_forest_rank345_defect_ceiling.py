#!/usr/bin/env python3
"""Prove the sharp rank-(3,4,5) defect ceiling for every forest.

For every forest F of order at least 16,

    3575 i_3(F) i_5(F) - 2016 i_4(F)^2 >= 0.

The large-order argument combines a sharp path lower bound for i3/i2
with the forest two-extension inequality.  Orders 16--18 are checked
over every distinct forest independence polynomial.
"""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank4_three_halves_forest_certificate import (
    forest_polynomials,
)


FINITE_COUNTS = {
    16: 37_524,
    17: 90_965,
    18: 224_562,
}

FINITE_MINIMA = {
    16: 0,
    17: 73_432_359,
    18: 251_742_400,
}


def defect(polynomial):
    return (
        3575 * polynomial[3] * polynomial[5]
        - 2016 * polynomial[4] ** 2
    )


def symbolic_certificate():
    n, m, wedges = sp.symbols(
        "n m wedges", integer=True, nonnegative=True
    )
    i2 = n * (n - 1) * sp.Rational(1, 2) - m
    i3 = (
        n * (n - 1) * (n - 2) * sp.Rational(1, 6)
        - m * (n - 2)
        + wedges
    )
    path_ratio_gap = sp.factor(
        3 * (n - 1) * i3 - (n - 3) * (n - 4) * i2
    )

    # Write t=(n-1)-m.  A forest has
    #
    #   wedges = sum_v C(d(v),2) >= 2m-n.
    #
    # Substituting this lower bound leaves exactly 2nt(n-4).
    t = sp.symbols("t", integer=True, nonnegative=True)
    lower_gap = sp.factor(
        path_ratio_gap.subs(
            {
                m: n - 1 - t,
                wedges: 2 * (n - 1 - t) - n,
            }
        )
    )
    assert lower_gap == 2 * n * t * (n - 4)

    # The wedge bound remains valid when 2m-n<0 because wedges>=0;
    # in that range evaluate the gap at wedges=0 and m<=n/2.
    sparse_boundary = sp.factor(
        path_ratio_gap.subs({m: n * sp.Rational(1, 2), wedges: 0})
    )
    assert sparse_boundary == n * (n - 4) * (n - 2)

    # Thus every n-vertex forest, n>=4, satisfies the sharp ratio
    # i3/i2 >= (n-3)(n-4)/(3(n-1)), with equality for P_n.
    forest_ratio = (
        (n - 3) * (n - 4) / (3 * (n - 1))
    )

    i2s, i3s, i4s, i5s = sp.symbols(
        "i2s i3s i4s i5s", positive=True
    )
    i5_lower = (
        sp.Rational(4, 5) * i4s**2 / i3s
        - sp.Rational(3, 5) * i4s
    )
    reduced_defect = sp.factor(
        (
            3575 * i3s * i5s - 2016 * i4s**2
        ).subs(i5s, i5_lower)
    )
    assert sp.expand(
        reduced_defect - i4s * (844 * i4s - 2145 * i3s)
    ) == 0

    i4_i3_lower = sp.factor(
        sp.Rational(3, 4) * (forest_ratio - 1)
    )
    assert sp.simplify(
        i4_i3_lower
        - (n**2 - 10 * n + 15) / (4 * (n - 1))
    ) == 0
    threshold = 211 * n**2 - 4255 * n + 5310
    assert threshold.subs(n, 19) == 636
    assert sp.diff(threshold, n).subs(n, 19) > 0

    return path_ratio_gap, forest_ratio, i4_i3_lower


def finite_certificate():
    forests = forest_polynomials(18)
    rows = []
    for order in range(16, 19):
        states = forests[order]
        assert len(states) == FINITE_COUNTS[order]
        minimum = min(map(defect, states))
        assert minimum == FINITE_MINIMA[order]
        path_prefix = (
            1,
            order,
            comb(order - 1, 2),
            comb(order - 2, 3),
            comb(order - 3, 4),
            comb(order - 4, 5),
        )
        assert any(poly[:6] == path_prefix for poly in states)
        assert defect(path_prefix) == minimum
        minimizers = sum(defect(poly) == minimum for poly in states)
        rows.append((order, len(states), minimum, minimizers))
    return rows


def main():
    _, forest_ratio, i4_i3_lower = symbolic_certificate()
    rows = finite_certificate()
    print("forest rank-(3,4,5) defect ceiling: CERTIFIED")
    print("sharp forest i3/i2 path bound:", forest_ratio)
    print("large-order i4/i3 lower bound:", i4_i3_lower)
    for order, count, minimum, minimizers in rows:
        print(
            f"n={order}: distinct_polynomials={count:,} "
            f"minimum={minimum} minimizers={minimizers}"
        )


if __name__ == "__main__":
    main()
