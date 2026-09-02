#!/usr/bin/env python3
"""Exact repair of the sole fake Delta^3 half-retention corner.

The failed rectangular corner has D5,D6 at their lower endpoints and
(s,d)=(1,1/2).  For J=A-N[q], extension counting gives

    5 i5(J) <= (m-4) i4(J),  m=|J|<=n-2,

and hence, with z=c5/c6,

    d >= 1 - (n-6) z (1-s)/5.

This script certifies Delta^3 on the lower edge of that weaker capacity
domain.  Separate concavity in s and d then reduces the rest of the domain
to this edge and the three already-passing rectangular corners 0000, 0001,
and 0011.
"""

from __future__ import annotations

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from verify_rank7_terminal_broom_middle_differences import CORE_ORDER, D4_CEILING
from verify_rank7_terminal_broom_reduction import c, exact_decomposition, h, newton_coefficients


def mapped_capacity_edge():
    n, w, x = sp.symbols("n w x", positive=True)
    T, W, A, U, S = sp.symbols("T W A U S", nonnegative=True)

    order = sp.Rational(CORE_ORDER, 1) / T
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)

    d4_low = (2 + x) / 10
    d4_value = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    c5 = sp.factor((1 - d4_value) / x**2)
    x5 = sp.factor(c4 / c5)
    d5_value = sp.factor((2 + x5) / 12)
    c6 = sp.factor((1 - d5_value) * c5**2 / c4)
    z = sp.factor(c5 / c6)
    d6_value = sp.factor((2 + z) / 14)
    c7 = sp.factor((1 - d6_value) * c6**2 / c5)

    K = sp.factor((n - 6) * z / 5)
    s0 = sp.factor(1 - 1 / (2 * K))
    s_value = sp.factor(s0 + (1 - s0) * S)
    root_d = sp.factor(1 - K * (1 - s_value))
    assert sp.factor(root_d - (sp.Rational(1, 2) + S / 2)) == 0

    raw = newton_coefficients(exact_decomposition())[3]
    edge = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:8], h[5], h[6]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, s_value * c5, root_d * c6),
                )
            ),
            simultaneous=True,
        )
    )
    edge_numerator, edge_denominator = sp.fraction(edge)
    source_variables = (n, w, x, U, S)
    box = (T, W, A, U, S)
    maps = []
    for value in (order, w_value, x_value, U, S):
        numerator, denominator = sp.fraction(sp.cancel(value))
        maps.append((sp.expand(numerator), sp.expand(denominator)))

    def clear_polynomial(polynomial):
        source = sp.Poly(sp.expand(polynomial), *source_variables, domain=sp.QQ)
        maxima = source.degree_list()
        target_maps = [
            (sp.Poly(num, *box, domain=sp.QQ), sp.Poly(den, *box, domain=sp.QQ))
            for num, den in maps
        ]
        powers = [
            [num**power * den ** (maximum - power) for power in range(maximum + 1)]
            for maximum, (num, den) in zip(maxima, target_maps)
        ]
        result = sp.Poly(0, *box, domain=sp.QQ)
        for monomial, coefficient in source.terms():
            term = sp.Poly(coefficient, *box, domain=sp.QQ)
            for axis, power in enumerate(monomial):
                term *= powers[axis][power]
            result += term
        return result.as_expr(), maxima

    numerator, numerator_degrees = clear_polynomial(edge_numerator)
    denominator, denominator_degrees = clear_polynomial(edge_denominator)
    print("capacity 5*i5(J)<=(m-4)*i4(J), m<=n-2", flush=True)
    print("K_lower_minus_1", sp.factor(6 * (n - 6) / (5 * (n - 5)) - 1), flush=True)
    print("cleared_source_degrees", numerator_degrees, denominator_degrees, flush=True)
    return numerator, denominator, box


def main() -> int:
    numerator, denominator, box = mapped_capacity_edge()
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    print("numerator_terms", len(npoly.terms()), "degrees", npoly.degree_list(), flush=True)
    ddegrees, dcoefficients = tensor_bernstein_fast(dpoly.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(npoly.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print("RANK7_TERMINAL_BROOM_DELTA3_CAPACITY_EDGE_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
