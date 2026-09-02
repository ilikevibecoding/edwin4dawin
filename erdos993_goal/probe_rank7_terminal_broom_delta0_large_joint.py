#!/usr/bin/env python3
"""Joint large-J Delta0 cutoff certificate using both exact b lower bounds."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from prove_rank7_terminal_broom_delta0_large import choose_polynomial, normalized_low


def mapped(
    cutoff: int,
    q_endpoint: int,
    region: str,
    envelope_power: int = 4,
    connected_z: bool = False,
):
    expression, (x, y, z, q, s, d) = normalized_low(0)
    T, M, Z, A, W = sp.symbols("T M Z A W", nonnegative=True)
    n = sp.Rational(cutoff, 1) / T
    m = 18 + (n - 20) * M
    t_n = (n - 7) * (n - 8) / (n - 3)
    # Since A is a connected tree, every nonempty proper independent set has
    # at least one external neighbour.  Hence a five-set has at most n-6
    # one-vertex extensions, giving z=c5/c6 >= 6/(n-6).  The older generic
    # forest box 6/(n-5) remains available for diagnostic replays.
    z_low = 6 / (n - (6 if connected_z else 5))
    z_high = 1 / ((t_n - 3 + 2 / t_n) / 6)
    z_value = sp.factor(z_low + (z_high - z_low) * Z)
    q_value = (
        sp.Rational(1, 7) + z_value / 2
        if q_endpoint
        else (2 + z_value) / 14
    )
    c4j = choose_polynomial(m, 4)
    c5j = choose_polynomial(m, 5)
    rho = (m - 7) * (m - 8) / (5 * (m - 3))
    bad_slope = (m - 4) / 3
    # rho*a = c5j-bad_slope*(c4j-a) at the unique switch.
    a0 = sp.factor((c5j - bad_slope * c4j) / (rho - bad_slope))
    if region == "ratio":
        a_value = sp.factor(a0 * A)
        b_value = sp.factor(rho * a_value)
    elif region == "badset":
        a_value = sp.factor(a0 + (c4j - a0) * A)
        b_value = sp.factor(c5j - bad_slope * (c4j - a_value))
    else:
        raise AssertionError(region)
    # Coefficientwise path minimality gives c5(A)>=P=C(n-4,5), while the
    # literal containment J subset H=A-q gives c5(A)>=C=a+b.  For positive
    # P,C,
    #
    #     max(P,C) >= (P^r+C^r)/(P^(r-1)+C^(r-1)).
    #
    # This rational lower envelope is exact at P=C and becomes asymptotically
    # exact when either valid floor dominates.  It applies on both active
    # b-bound regions.
    path_floor = choose_polynomial(n - 4, 5)
    containment_floor = a_value + b_value
    r = envelope_power
    inverse_c5 = W * (
        path_floor ** (r - 1) + containment_floor ** (r - 1)
    ) / (
        path_floor**r + containment_floor**r
    )
    s_value = sp.factor(1 - a_value * inverse_c5)
    d_value = sp.factor(1 - b_value * z_value * inverse_c5)

    box = (T, M, Z, A, W)
    midpoint = {variable: sp.Rational(1, 2) for variable in box}
    source = sp.Poly(expression, x, y, z, q, s, d, domain=sp.QQ)
    maxima = source.degree_list()
    values = (sp.Integer(1), sp.Integer(1), z_value, q_value, s_value, d_value)
    maps = []
    for value in values:
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
    return cleared.as_expr(), denominator.as_expr(), box, sp.factor(a0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    parser.add_argument("--q", type=int, choices=(0, 1), required=True)
    parser.add_argument("--region", choices=("ratio", "badset"), required=True)
    parser.add_argument("--power", type=int, choices=(4, 8), default=4)
    parser.add_argument("--connected-z", action="store_true")
    args = parser.parse_args()
    numerator, denominator, box, switch = mapped(
        args.cutoff,
        args.q,
        args.region,
        envelope_power=args.power,
        connected_z=args.connected_z,
    )
    print("switch_a", switch, flush=True)
    dpoly = sp.Poly(denominator, *box, domain=sp.QQ)
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    ddegrees, dcoefficients = tensor_bernstein_fast(dpoly.as_expr(), box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(npoly.as_expr(), box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print(
        "PASS_DELTA0_LARGE_JOINT",
        args.cutoff,
        args.q,
        args.region,
        "power",
        args.power,
        "connected_z",
        args.connected_z,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
