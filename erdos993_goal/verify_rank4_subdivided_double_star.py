#!/usr/bin/env python3
"""Symbolic rank-4 leaf-curvature proof for subdivided double stars.

Let T(a,b) have two hubs separated by one degree-2 vertex, with a leaves
on the first hub and b leaves on the second.  This script proves

    C4(T(a,b+1)) - C4(T(a,b)) >= 0

for every pair of nonnegative integers a,b.  Thus adding a leaf at either
hub never decreases rank-4 factorial curvature.
"""

from __future__ import annotations

import sympy as sp


def main() -> int:
    a, b, A, B = sp.symbols(
        "a b A B", integer=True, nonnegative=True
    )

    def choose(z, k):
        return sp.prod(z - j for j in range(k)) / sp.factorial(k)

    # I(T(a,b);x) =
    # x(1+x)^(a+b) + ((1+x)^a+x)((1+x)^b+x).
    def coefficient(k):
        return sp.expand(
            choose(a + b, k - 1)
            + choose(a + b, k)
            + choose(a, k - 1)
            + choose(b, k - 1)
            + (1 if k == 2 else 0)
        )

    i3, i4, i5 = (coefficient(k) for k in range(3, 6))
    curvature = sp.expand(576 * i4**2 - 720 * i3 * i5)
    delta = sp.factor(curvature.xreplace({b: b + 1}) - curvature)

    expected_delta = (
        9 * a**6
        + 42 * a**5 * b
        + 33 * a**5
        + 75 * a**4 * b**2
        + 33 * a**4 * b
        - 63 * a**4
        + 100 * a**3 * b**3
        + 174 * a**3 * b**2
        - 100 * a**3 * b
        - 33 * a**3
        + 105 * a**2 * b**4
        + 126 * a**2 * b**3
        - 252 * a**2 * b**2
        - 159 * a**2 * b
        + 54 * a**2
        + 54 * a * b**5
        + 195 * a * b**4
        + 32 * a * b**3
        - 9 * a * b**2
        + 160 * a * b
        + 7 * b**6
        + 63 * b**5
        + 55 * b**4
        - 135 * b**3
        + 10 * b**2
    )
    assert sp.expand(delta - expected_delta) == 0

    # Case b >= 2: put b=B+2.  Every coefficient is positive.
    shifted_b = sp.Poly(sp.expand(delta.subs(b, B + 2)), a, B)
    assert min(shifted_b.coeffs()) > 0

    # Case b=0: the factorization is nonnegative for integer a>=0.
    case_b0 = sp.factor(delta.subs(b, 0))
    expected_b0 = (
        3 * a**2 * (a - 1) * (a + 1) * (3 * a**2 + 11 * a - 18)
    )
    assert sp.expand(case_b0 - expected_b0) == 0
    assert expected_b0.subs(a, 0) == 0
    assert expected_b0.subs(a, 1) == 0
    # For a>=2 all displayed factors are positive.
    assert (3 * a**2 + 11 * a - 18).subs(a, A + 2).as_poly(A)
    assert min(
        sp.Poly(
            sp.expand((3 * a**2 + 11 * a - 18).subs(a, A + 2)),
            A,
        ).coeffs()
    ) > 0

    # Case b=1: a=0 is equality; after a=A+1 all coefficients are
    # positive.
    case_b1 = sp.factor(delta.subs(b, 1))
    quotient_b1 = sp.factor(case_b1 / (3 * a))
    assert case_b1.subs(a, 0) == 0
    shifted_a = sp.Poly(
        sp.expand(quotient_b1.subs(a, A + 1)), A
    )
    assert min(shifted_a.coeffs()) > 0

    # Exact match with the exhaustive order-14 and order-15 extrema.
    assert delta.subs({a: 7, b: 4}) == 12_824_784
    assert delta.subs({a: 7, b: 5}) == 21_519_216
    assert delta.subs({a: 8, b: 5}) == 34_216_992
    assert delta.subs({a: 9, b: 5}) == 52_999_920
    assert delta.subs({a: 9, b: 6}) == 79_463_520
    assert delta.subs({a: 10, b: 6}) == 116_074_080

    print("subdivided-double-star rank-4 certificate: PASS")
    print(f"b>=2 shifted coefficient count: {len(shifted_b.terms())}")
    print(f"b>=2 smallest shifted coefficient: {min(shifted_b.coeffs())}")
    print(f"b=0 factorization: {case_b0}")
    print(f"b=1 shifted quotient: {shifted_a.as_expr()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
