#!/usr/bin/env python3
"""Probe exact repairs for the remaining forest m=1 targets j=4,5."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def check(name, expression, variables, S):
    rational = sp.cancel(expression)
    numerator, denominator = sp.together(rational).as_numer_denom()
    degrees, coefficients = tensor_bernstein(sp.expand(numerator), variables)
    bad = []
    total = 0
    for index, coefficient in enumerate(coefficients):
        powers = sp.Poly(coefficient, S).all_coeffs()
        total += len(powers)
        if not powers or any(value < 0 for value in powers):
            bad.append((index, coefficient))
    print(name, "degrees", degrees, "bern", len(coefficients),
          "powers", total, "den", sp.factor(denominator), "bad", len(bad),
          flush=True)
    if bad:
        print("first_bad", [(i, str(c)) for i, c in bad[:3]], flush=True)


def main():
    numerator, _denominator, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    q = sp.Poly(numerator, W)
    qa = sp.expand(q.coeff_monomial(W**2))
    qb = sp.expand(q.coeff_monomial(W))
    qc = sp.expand(q.coeff_monomial(1))
    linear = sp.expand(qb * W + qc)
    derivative = sp.expand(2 * qa * W + qb)
    discriminant_margin = sp.expand(4 * qa * qc - qb**2)

    B = N - 2 * h - 1
    rmax = N - 2 * h - d
    coarse_low = sp.factor((d - 1) * C(d, 2) / B + (1 - (d - 1) / B) * B)
    root_wedge = sp.factor(C(d, 2) + (R**2 / d + R) / 2)
    averaged_low = sp.factor((B + root_wedge) / 2)
    upper = C(N - 2 * h, 2)

    S, u, v = sp.symbols("S u v", nonnegative=True)
    for jvalue in (4, 5):
        substitution = {
            j: jvalue,
            r: 13 - jvalue + S,
            h: 1 + (10 + S) * u / 2,
            d: 1 + (10 + S) * (1 - u) * v,
        }
        shadow_cap_R0 = sp.factor(
            (N - d - j + 1) / (N - d - j + 1 + d * j)
        )
        # R=0: exact F=H union dK1 cap.  The y=0 faces already passed;
        # test the new adverse upper endpoint for both W boundaries.
        for wname, wvalue in (("coarse_low", coarse_low), ("high", upper)):
            expression = linear.subs({R: 0, y: shadow_cap_R0, W: wvalue})
            check(
                f"j{jvalue}_R0_shadowcap_linear_{wname}",
                expression.subs(substitution, simultaneous=True),
                (u, v), S,
            )

        # R=rmax, y=1: retain the full quadratic.  Probe endpoint values,
        # the derivative at two rigorous lower bounds, and the discriminant.
        for lname, lower in (("coarse", coarse_low), ("average", averaged_low)):
            lower_face = lower.subs(R, rmax)
            for label, expression in (
                (f"full_{lname}_low", numerator.subs({R: rmax, y: 1, W: lower_face})),
                (f"derivative_{lname}_low", derivative.subs({R: rmax, y: 1, W: lower_face})),
            ):
                check(
                    f"j{jvalue}_Rmax_y1_{label}",
                    expression.subs(substitution, simultaneous=True),
                    (u, v), S,
                )
        check(
            f"j{jvalue}_Rmax_y1_full_high",
            numerator.subs({R: rmax, y: 1, W: upper}).subs(
                substitution, simultaneous=True
            ),
            (u, v), S,
        )
        check(
            f"j{jvalue}_Rmax_y1_discriminant_margin",
            discriminant_margin.subs({R: rmax, y: 1}).subs(
                substitution, simultaneous=True
            ),
            (u, v), S,
        )


if __name__ == "__main__":
    main()
