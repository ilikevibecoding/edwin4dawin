#!/usr/bin/env python3
"""Exact active-floor Delta0 boxes for one fixed (n,m,leaf frontier) row."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import choose_polynomial, normalized_low


def certify(n: int, m: int, beta: int, boundary_one: int, region: str):
    expression, (x, y, z, q, s, d) = normalized_low(0)
    R = sp.symbols("R", nonnegative=True)
    nn, mm = sp.Integer(n), sp.Integer(m)
    c4j = choose_polynomial(mm, 4)
    c5j = choose_polynomial(mm, 5)
    rho = sp.factor((mm - 7) * (mm - 8) / (5 * (mm - 3)))
    bad_slope = sp.factor((mm - 4) / 3)
    switch = sp.factor((c5j - bad_slope * c4j) / (rho - bad_slope))
    if region == "ratio":
        a_raw = sp.factor(switch * R)
        b_raw = sp.factor(rho * a_raw)
    elif region == "badset":
        a_raw = sp.factor(switch + (c4j - switch) * R)
        b_raw = sp.factor(c5j - bad_slope * (c4j - a_raw))
    else:
        raise AssertionError(region)
    containment_raw = sp.factor(a_raw + b_raw)
    slope = sp.factor(sp.diff(containment_raw, R))
    assert slope > 0

    kappa = sp.factor((nn**3 - 8 * nn**2 - 19 * nn + 302) / 6)
    curvature_floor = sp.factor(
        choose_polynomial(nn - 4, 5) + kappa * beta / (5 * (nn - 3))
    )
    boundary_floor = sp.Integer(boundary_one)
    fixed_floor = max(curvature_floor, boundary_floor)
    threshold = sp.factor((fixed_floor - containment_raw.subs(R, 0)) / slope)
    endpoints = [sp.Integer(0), sp.Integer(1)]
    if 0 < threshold < 1:
        endpoints.insert(1, threshold)

    results = []
    for piece, (left, right) in enumerate(zip(endpoints, endpoints[1:])):
        A, W, Z = sp.symbols("A W Z", nonnegative=True)
        r_value = sp.factor(left + (right - left) * A)
        a_value = sp.factor(a_raw.subs(R, r_value))
        b_value = sp.factor(b_raw.subs(R, r_value))
        containment = sp.factor(a_value + b_value)
        midpoint = sp.factor((left + right) / 2)
        active_name = "fixed" if containment_raw.subs(R, midpoint) <= fixed_floor else "containment"
        active_floor = fixed_floor if active_name == "fixed" else containment
        # Endpoint equality is harmless; on the open interior the selected
        # floor is the literal maximum of the two valid coefficient floors.
        assert active_floor.subs(A, sp.Rational(1, 2)) > 0
        inverse_c5 = sp.factor(W / active_floor)
        z_low = sp.factor(6 / (nn - 7 + boundary_floor * inverse_c5))
        t_n = sp.factor((nn - 7) * (nn - 8) / (nn - 3))
        z_high = sp.factor(6 / (t_n - 3 + 2 / t_n))
        z_value = sp.factor(z_low + (z_high - z_low) * Z)
        q_value = sp.factor((2 + z_value) / 14)
        s_value = sp.factor(1 - a_value * inverse_c5)
        d_value = sp.factor(1 - b_value * z_value * inverse_c5)
        value = sp.cancel(
            expression.subs(
                {x: 1, y: 1, z: z_value, q: q_value, s: s_value, d: d_value},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(value)
        box = (A, W, Z)
        box_midpoint = {variable: sp.Rational(1, 2) for variable in box}
        if denominator.subs(box_midpoint) < 0:
            numerator, denominator = -numerator, -denominator
        assert denominator.subs(box_midpoint) > 0
        numerator = sp.Poly(sp.expand(numerator), *box, domain=sp.QQ)
        denominator = sp.Poly(sp.expand(denominator), *box, domain=sp.QQ)
        print(
            "piece",
            piece,
            "interval",
            left,
            right,
            "active",
            active_name,
            "terms",
            len(numerator.terms()),
            "degrees",
            numerator.degree_list(),
            flush=True,
        )
        denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
            denominator.as_expr(), box
        )
        denominator_minimum, denominator_index = minimum_with_index(
            denominator_coefficients
        )
        print(
            "denominator",
            denominator_degrees,
            denominator_coefficients.size,
            denominator_minimum,
            denominator_index,
            flush=True,
        )
        assert denominator_minimum >= 0
        degrees, coefficients = tensor_bernstein_fast(numerator.as_expr(), box)
        minimum, index = minimum_with_index(coefficients)
        print("numerator", degrees, coefficients.size, minimum, index, flush=True)
        assert minimum >= 0
        results.append((piece, active_name, degrees, coefficients.size, minimum, index))
    print(
        "PASS_DELTA0_LEAF_FRONTIER_FIXED_M",
        n,
        m,
        beta,
        boundary_one,
        region,
        "pieces",
        len(results),
    )
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--b2", type=int, required=True)
    parser.add_argument("--boundary-one", type=int, required=True)
    parser.add_argument("--region", choices=("ratio", "badset"), required=True)
    args = parser.parse_args()
    if not 18 <= args.m <= args.n - 2:
        raise ValueError("m must lie in 18..n-2")
    certify(args.n, args.m, args.b2, args.boundary_one, args.region)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
