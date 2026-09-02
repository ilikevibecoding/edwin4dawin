#!/usr/bin/env python3
"""Staged B2/root-domain Bernstein probe for the m=1,j>=4 proof."""

from __future__ import annotations

import argparse
import itertools

import sympy as sp

from derive_terminal_q3_low_newton_m1_j4plus_q2_agent import C, build


def tensor_bernstein_2d(expression, u, v):
    poly = sp.Poly(sp.expand(expression), u, v)
    du, dv = poly.degree(u), poly.degree(v)
    output = {}
    for i, q in itertools.product(range(du + 1), range(dv + 1)):
        value = sp.Integer(0)
        for a, b in itertools.product(range(i + 1), range(q + 1)):
            value += (
                poly.coeff_monomial(u**a * v**b)
                * sp.binomial(i, a) / sp.binomial(du, a)
                * sp.binomial(q, b) / sp.binomial(dv, b)
            )
        output[(i, q)] = sp.factor(value)
    return (du, dv), output


def nonnegative_power(expression, variables):
    return all(
        value >= 0 for value in sp.Poly(sp.expand(expression), *variables).coeffs()
    )


def quadrant_shift_certificate(expression, k, q, maximum=6):
    if nonnegative_power(expression, (k, q)):
        return ("direct", 0, 0)
    for shift_q in range(1, maximum + 1):
        if (
            nonnegative_power(expression.subs(q, q + shift_q), (k, q))
            and all(
                nonnegative_power(expression.subs(q, value), (k,))
                for value in range(shift_q)
            )
        ):
            return ("q_shift", 0, shift_q)
    for shift_k in range(1, maximum + 1):
        if (
            nonnegative_power(expression.subs(k, k + shift_k), (k, q))
            and all(
                nonnegative_power(expression.subs(k, value), (q,))
                for value in range(shift_k)
            )
        ):
            return ("k_shift", shift_k, 0)
    for shift_k in range(1, maximum + 1):
        for shift_q in range(1, maximum + 1):
            if not nonnegative_power(
                expression.subs({k: k + shift_k, q: q + shift_q}, simultaneous=True),
                (k, q),
            ):
                continue
            if not all(
                nonnegative_power(expression.subs(k, value), (q,))
                for value in range(shift_k)
            ):
                continue
            if not all(
                nonnegative_power(expression.subs(q, value), (k,))
                for value in range(shift_q)
            ):
                continue
            return ("two_shift", shift_k, shift_q)
    return None


def cone_failures(expression, j, r):
    k, q = sp.symbols("k q", nonnegative=True)
    failures = []
    # The exceptional j=4 boundary is certified separately with the exact
    # binomial avoidance cap.  This main cone is therefore j>=5, r>=11.
    main_expression = sp.expand(expression.subs({j: 5 + k, r: 11 + q}))
    main = sp.Poly(main_expression, k, q)
    bad = [value for value in main.coeffs() if value < 0]
    if bad:
        shifted = quadrant_shift_certificate(main_expression, k, q)
        if shifted is None:
            failures.append(("r>=11", len(bad), bad[:4]))
    for rv in range(1, 11):
        strip = sp.Poly(
            sp.expand(expression.subs({j: 15 - rv + q, r: rv})), q
        )
        bad = [value for value in strip.coeffs() if value < 0]
        if bad:
            failures.append((f"r={rv}", len(bad), bad[:4]))
    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", choices=("low_d", "high_d"), required=True)
    args = parser.parse_args()

    lower, symbols = build()
    j, r, d, R, B2, y = symbols
    N = j + r
    S = N - d
    blo = C(d - 1, 2)
    bhi = sp.expand(blo + C(R, 2) + C(S - R, 2))
    width = sp.expand(bhi - blo)
    lower_numerator, lower_denominator = sp.together(lower).as_numer_denom()
    assert B2 not in lower_denominator.free_symbols
    derivative = sp.diff(lower_numerator, B2)
    bcoefficients = {
        "b0": lower_numerator.subs(B2, blo),
        "b1": (
            lower_numerator.subs(B2, blo)
            + width * derivative.subs(B2, blo) / 2
        ),
        "b2": lower_numerator.subs(B2, bhi),
    }

    u, v = sp.symbols("u v", nonnegative=True)
    half = (N - 2) * u / 2
    if args.region == "low_d":
        dexpr = 1 + half
        Sexpr = N - dexpr
        yends = {"y0": 0, "y1": 1}
    else:
        Sexpr = 1 + half
        dexpr = N - Sexpr
        yends = {"y0": 0, "yratio": Sexpr / dexpr}
    Rexpr = 1 + (Sexpr - 1) * v

    total = failed = 0
    for bname, bexpression in bcoefficients.items():
        for yname, yvalue in yends.items():
            if yname == "yratio":
                # The B2-Bernstein numerator is affine in y.  Clear the
                # positive denominator d before substituting y=S/d.
                yzero = bexpression.subs(y, 0)
                yslope = sp.diff(bexpression, y)
                expression = (
                    dexpr * yzero.subs({d: dexpr, R: Rexpr}, simultaneous=True)
                    + Sexpr * yslope.subs({d: dexpr, R: Rexpr}, simultaneous=True)
                )
            else:
                expression = bexpression.subs(
                    {d: dexpr, R: Rexpr, y: yvalue}, simultaneous=True
                )
            numerator, denominator = sp.together(expression).as_numer_denom()
            print(args.region, bname, yname, "den", sp.factor(denominator), flush=True)
            degrees, coefficients = tensor_bernstein_2d(numerator, u, v)
            case_failed = 0
            for index, coefficient in coefficients.items():
                failures = cone_failures(coefficient, j, r)
                total += 1
                if failures:
                    failed += 1
                    case_failed += 1
                    if case_failed <= 5:
                        print("FAIL", bname, yname, index, failures, flush=True)
            print(
                "CASE", bname, yname, "degrees", degrees,
                "coefficients", len(coefficients), "failed", case_failed,
                flush=True,
            )
    print("TOTAL", total, "FAILED", failed)


if __name__ == "__main__":
    main()
