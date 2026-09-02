#!/usr/bin/env python3
"""Verify i_4(F) >= i_3(F) for every forest of order at least 12.

Orders 12--17 are checked by exact enumeration of distinct forest
independence polynomials.  Orders at least 18 are covered by an exact
two-variable Bernstein certificate from inclusion-exclusion bounds.
"""

from __future__ import annotations

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank4_three_halves_forest_certificate import (
    forest_polynomials,
)


FINITE_COUNTS = {
    12: 1348,
    13: 2974,
    14: 6777,
    15: 15739,
    16: 37524,
    17: 90965,
}

FINITE_MINIMA = {
    12: 6,
    13: 45,
    14: 110,
    15: 209,
    16: 351,
    17: 546,
}


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def large_order_certificate():
    n, edges, wedges, triples = sp.symbols(
        "n edges wedges triples", real=True
    )
    i3 = choose(n, 3) - edges * (n - 2) + wedges
    i4 = (
        choose(n, 4)
        - edges * choose(n - 2, 2)
        + wedges * (n - 4)
        + choose(edges, 2)
        - triples
    )
    difference = sp.expand(i4 - i3)
    assert sp.diff(difference, wedges) == n - 5
    assert sp.diff(difference, triples) == -1

    # Cauchy gives wedges >= 2*edges^2/n-edges.  Also every
    # connected three-edge set is one of the C(edges,3) edge triples.
    lower = sp.factor(
        difference.subs(
            {
                wedges: 2 * edges**2 / n - edges,
                triples: choose(edges, 3),
            }
        )
    )

    v, s = sp.symbols("v s", nonnegative=True)
    normalized = sp.cancel(
        lower.subs(
            {
                n: 18 / v,
                edges: (18 / v - 1) * s,
            }
        )
        * v**4
    )
    assert sp.denom(normalized) == 1
    degrees, coefficients = tensor_bernstein_fast(
        sp.expand(normalized), (v, s)
    )
    minimum, index = minimum_with_index(coefficients)
    assert degrees == (5, 3)
    assert minimum == sp.Rational(1156, 9)
    assert all(value >= 0 for value in coefficients.flat)
    return degrees, minimum, index, coefficients.size


def finite_certificate():
    forests = forest_polynomials(17)
    total = 0
    rows = []
    for order in range(12, 18):
        assert len(forests[order]) == FINITE_COUNTS[order]
        values = [
            polynomial[4] - polynomial[3]
            for polynomial in forests[order]
        ]
        minimum = min(values)
        assert minimum == FINITE_MINIMA[order]
        assert minimum >= 0
        total += len(values)
        rows.append((order, len(values), minimum))
    return total, rows


def main() -> int:
    degrees, minimum, index, size = large_order_certificate()
    total, rows = finite_certificate()
    print("forest rank-3-to-4 monotonicity certificate: PASS")
    print(
        "large-order Bernstein:",
        f"degrees={degrees}",
        f"coefficients={size}",
        f"minimum={minimum}",
        f"index={index}",
    )
    for order, count, finite_minimum in rows:
        print(
            f"n={order} distinct_polynomials={count:,} "
            f"min(i4-i3)={finite_minimum}"
        )
    print(f"finite polynomials checked: {total:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
