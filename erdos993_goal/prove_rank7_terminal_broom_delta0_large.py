#!/usr/bin/env python3
"""Exact Bernstein certificate for Delta^0..Delta^2 on rooted cores n>=39.

This uses only the path coefficient lower bound for c5, ordinary extension
counting, the proved V7 lower extension mean for c6/c5, Q6/two-extension
bounds for D6, the rooted cross C7, and (when |A-N[q]|>=18) the proved
forest rank-(4,5) ratio theorem.
"""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank7_terminal_broom_reduction import c, exact_decomposition, h, newton_coefficients


def choose_polynomial(v, k: int):
    return sp.prod(v - j for j in range(k)) / sp.factorial(k)


def normalized_low(rank: int):
    x, y, z, q, s, d = sp.symbols("x y z q s d", positive=True)
    raw = newton_coefficients(exact_decomposition())[rank]
    value = sp.cancel(
        raw.subs(
            {
                c[3]: x * y * z,
                c[4]: y * z,
                c[5]: z,
                c[6]: 1,
                c[7]: (1 - q) / z,
                h[5]: s * z,
                h[6]: d,
            },
            simultaneous=True,
        )
    )
    assert sp.fraction(value)[1] == 1
    lower_cross = sp.factor(sp.diff(value.subs(d, s - q / 2), q, 2))
    expected = {
        0: -196 * s**2 + s * z - 48 * z - 48,
        1: -4 * (49 * s + 12 * z) * (y + 1),
        2: -4 * y * (49 * s + 12 * z) * (x + 1),
    }[rank]
    assert sp.factor(lower_cross - expected) == 0
    # Each expected expression is strictly negative for x,y,z,s>0 and
    # s<=1.  Thus the C7 lower branch d=s-q/2 is concave in q; the upper
    # d branch is q-independent and inherits the raw D6 concavity.
    return sp.expand(value), (x, y, z, q, s, d)


def mapped(rank: int, case: str, q_endpoint: int, d_endpoint: int):
    expression, (x, y, z, q, s, d) = normalized_low(rank)
    T, M, X, Y, U, V, Z, S = sp.symbols(
        "T M X Y U V Z S", nonnegative=True
    )
    n = sp.Rational(39, 1) / T
    t_n = (n - 7) * (n - 8) / (n - 3)
    if rank == 0:
        mu6_lower = (t_n - 3 + 2 / t_n) / 6
        z_low = 6 / (n - 5)
        z_high = 1 / mu6_lower
        z_value = sp.factor(z_low + (z_high - z_low) * Z)
        x_value = sp.Integer(1)
        y_value = sp.Integer(1)
        coefficient_box = (Z,)
    elif rank == 1:
        y_low = 5 / (n - 4)
        y_high = 5 / t_n
        y_value = sp.factor(y_low + (y_high - y_low) * Y)
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        x_value = sp.Integer(1)
        coefficient_box = (Y, V)
    else:
        x_low = 4 / (n - 3)
        x_high = 4 * (n - 2) / ((n - 5) * (n - 6))
        x_value = sp.factor(x_low + (x_high - x_low) * X)
        d4_low = (2 + x_value) / 10
        d4_value = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
        y_value = sp.factor(x_value / (1 - d4_value))
        d5_low = (2 + y_value) / 12
        d5_high = sp.Rational(1, 6) + y_value / 2
        d5_value = sp.factor(d5_low + (d5_high - d5_low) * V)
        z_value = sp.factor(y_value / (1 - d5_value))
        coefficient_box = (X, U, V)
    q_value = (
        sp.Rational(1, 7) + z_value / 2
        if q_endpoint
        else (2 + z_value) / 14
    )
    # Coefficientwise path minimality: c5(A)>=i5(P_n)=C(n-4,5).
    c5_lower = choose_polynomial(n - 4, 5)
    if case == "small":
        m_value = sp.Integer(17)
        box = (T, *coefficient_box, S)
    else:
        m_value = 18 + (n - 20) * M
        box = (T, M, *coefficient_box, S)
    root_mass_upper = choose_polynomial(m_value, 4) / c5_lower
    s_low = 1 - root_mass_upper
    s_value = sp.factor(s_low + (1 - s_low) * S)
    if d_endpoint == 0:
        # C7: d>=s-D6/2.  Concavity in h6 reduces to this lower endpoint.
        d_value = s_value - q_value / 2
    elif case == "small":
        # With no positive forest-ratio input, the other endpoint is d=1.
        d_value = sp.Integer(1)
    else:
        # Forest V5 on J=A-N[q]: 5b/a >= (m-7)(m-8)/(m-3).
        L4 = (m_value - 7) * (m_value - 8) / (m_value - 3)
        d_value = 1 - z_value * L4 * (1 - s_value) / 5
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    source_variables = (x, y, z, q, s, d)
    source = sp.Poly(expression, *source_variables, domain=sp.QQ)
    maxima = source.degree_list()
    maps = []
    for value in (x_value, y_value, z_value, q_value, s_value, d_value):
        numerator, denominator = sp.fraction(sp.cancel(value))
        if denominator.subs(midpoint) < 0:
            numerator, denominator = -numerator, -denominator
        assert denominator.subs(midpoint) > 0
        maps.append(
            (
                sp.Poly(sp.expand(numerator), *box, domain=sp.QQ),
                sp.Poly(sp.expand(denominator), *box, domain=sp.QQ),
            )
        )
    powers = [
        [num**power * den**(maximum - power) for power in range(maximum + 1)]
        for maximum, (num, den) in zip(maxima, maps)
    ]
    cleared = sp.Poly(0, *box, domain=sp.QQ)
    for monomial, coefficient in source.terms():
        term = sp.Poly(coefficient, *box, domain=sp.QQ)
        for axis, power in enumerate(monomial):
            term *= powers[axis][power]
        cleared += term
    denominator = sp.Poly(1, *box, domain=sp.QQ)
    for maximum, (_, den) in zip(maxima, maps):
        denominator *= den**maximum
    return cleared.as_expr(), denominator.as_expr(), box


def certify(rank: int, case: str, q_endpoint: int, d_endpoint: int) -> None:
    numerator, denominator, box = mapped(rank, case, q_endpoint, d_endpoint)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    print("capacity_c5_lower C(n-4,5)", flush=True)
    print(
        "branch",
        rank,
        case,
        q_endpoint,
        d_endpoint,
        "numerator_terms",
        len(npoly.terms()),
        "degrees",
        npoly.degree_list(),
        flush=True,
    )
    ddegrees, dcoefficients = tensor_bernstein_fast(dpoly.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(npoly.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print(f"PASS_DELTA{rank}_BRANCH", case, q_endpoint, d_endpoint, flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(0, 1, 2), default=0)
    parser.add_argument("--case", choices=("small", "large"), required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d", type=int, choices=(0, 1), required=True)
    args = parser.parse_args()
    certify(args.rank, args.case, args.q, args.d)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
