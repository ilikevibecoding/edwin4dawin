#!/usr/bin/env python3
"""Exact fixed-order Delta0 certificate on one leaf-support frontier row."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import choose_polynomial, normalized_low


def mapped(n: int, beta: int, boundary_one: int, region: str, power: int):
    expression, (x, y, z, q, s, d) = normalized_low(0)
    M, A, W, Z = sp.symbols("M A W Z", nonnegative=True)
    nn = sp.Integer(n)
    m = 18 + (nn - 20) * M

    c4j = choose_polynomial(m, 4)
    c5j = choose_polynomial(m, 5)
    rho = (m - 7) * (m - 8) / (5 * (m - 3))
    bad_slope = (m - 4) / 3
    switch = sp.factor((c5j - bad_slope * c4j) / (rho - bad_slope))
    if region == "ratio":
        a_value = sp.factor(switch * A)
        b_value = sp.factor(rho * a_value)
    elif region == "badset":
        a_value = sp.factor(switch + (c4j - switch) * A)
        b_value = sp.factor(c5j - bad_slope * (c4j - a_value))
    else:
        raise AssertionError(region)

    # Quantitative rank-(4,5) path surplus for a tree:
    # 5(n-3)c5-(n-7)(n-8)c4 >= kappa(n) B2.  Together with
    # c4>=C(n-3,4), this gives the displayed coefficient floor.
    kappa = (nn**3 - 8 * nn**2 - 19 * nn + 302) / 6
    curvature_floor = choose_polynomial(nn - 4, 5) + kappa * beta / (5 * (nn - 3))
    containment_floor = sp.factor(a_value + b_value)
    boundary_floor = sp.Integer(boundary_one)
    floors = (curvature_floor, containment_floor, boundary_floor)
    inverse_c5 = sp.factor(
        W * sum(floor ** (power - 1) for floor in floors)
        / sum(floor**power for floor in floors)
    )

    # If L5 is the number of independent five-sets having exactly one
    # external neighbour, then
    #   (n-6)c5-6c6 = sum_S (|N(S)|-1) >= c5-L5.
    # The leaf-support row supplies L5<=boundary_one.
    z_low = sp.factor(6 / (nn - 7 + boundary_floor * inverse_c5))
    t_n = sp.Rational((n - 7) * (n - 8), n - 3)
    z_high = sp.factor(6 / (t_n - 3 + 2 / t_n))
    z_value = sp.factor(z_low + (z_high - z_low) * Z)
    q_value = sp.factor((2 + z_value) / 14)
    s_value = sp.factor(1 - a_value * inverse_c5)
    d_value = sp.factor(1 - b_value * z_value * inverse_c5)

    box = (M, A, W, Z)
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    value = sp.cancel(
        expression.subs(
            {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(value)
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.subs(midpoint) > 0
    return sp.expand(numerator), sp.expand(denominator), box


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--b2", type=int, required=True)
    parser.add_argument("--boundary-one", type=int, required=True)
    parser.add_argument("--region", choices=("ratio", "badset"), required=True)
    parser.add_argument("--power", type=int, choices=(8, 16, 32), default=8)
    args = parser.parse_args()
    numerator, denominator, box = mapped(
        args.n, args.b2, args.boundary_one, args.region, args.power
    )
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    print("terms", len(npoly.terms()), "degrees", npoly.degree_list(), flush=True)
    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(denominator, box)
    denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
    print(
        "denominator",
        denominator_degrees,
        denominator_coefficients.size,
        denominator_minimum,
        denominator_index,
        flush=True,
    )
    assert denominator_minimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print(
        "PASS_DELTA0_LEAF_FRONTIER",
        args.n,
        args.b2,
        args.boundary_one,
        args.region,
        args.power,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
